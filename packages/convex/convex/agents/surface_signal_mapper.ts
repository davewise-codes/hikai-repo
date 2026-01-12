import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { getAgentAIConfig, getAgentTelemetryConfig } from "../ai";
import { createLLMAdapter } from "../ai/config";
import {
	executeAgentLoop,
	type AgentMessage,
	type AgentModel,
} from "./core/agent_loop";
import { injectSkill, loadSkillFromRegistry } from "./core/skill_loader";
import { getToolsForAgent } from "./core/tool_registry";
import { SKILL_CONTENTS } from "./skills";

const AGENT_NAME = "Surface Signal Mapper Agent";
const USE_CASE = "surface_signal_mapping";
const PROMPT_VERSION = "v1.0";
const SKILL_NAME = "surface-signal-mapping";

const SURFACE_ORDER = [
	"management",
	"design",
	"product_front",
	"platform",
	"marketing",
	"admin",
	"docs",
] as const;

type Surface = (typeof SURFACE_ORDER)[number];

type SurfaceSignal = {
	surface: Surface;
	bucketId: string;
	evidence?: string[];
};

export type SurfaceSignalSource = {
	sourceType: string;
	sourceId: string;
	sourceLabel: string;
	surfaces: SurfaceSignal[];
};

export type SurfaceSignalResult = {
	sources: SurfaceSignalSource[];
};

type SurfaceSignalInput = {
	sources: Array<{
		sourceType: string;
		sourceId: string;
		sourceLabel: string;
		structureSummary?: unknown;
		pathOverview?: unknown;
		samples?: string[];
	}>;
};

type SurfaceSignalParams = {
	ctx: ActionCtx;
	organizationId: Id<"organizations">;
	productId: Id<"products">;
	userId: Id<"users">;
	input: SurfaceSignalInput;
	maxTokens?: number;
};

export async function mapSurfaceSignals(
	params: SurfaceSignalParams,
): Promise<SurfaceSignalResult | null> {
	const { ctx, organizationId, productId, userId, input, maxTokens } = params;
	const aiConfig = getAgentAIConfig(AGENT_NAME);
	const model = createModelAdapter(aiConfig);
	const skill = loadSkillFromRegistry(SKILL_NAME, SKILL_CONTENTS);
	const prompt = buildSurfaceSignalPrompt(input);
	const messages: AgentMessage[] = [
		injectSkill(skill),
		{ role: "user", content: prompt },
	];

	const result = await executeAgentLoop(
		model,
		{
			maxTurns: 1,
			timeoutMs: 30000,
			maxTokens: maxTokens ?? 2000,
			sampling: { temperature: 0 },
			tools: getToolsForAgent("analysis"),
		},
		prompt,
		messages,
	);

	if (result.status !== "completed") {
		await ctx.runMutation(internal.ai.telemetry.recordError, {
			organizationId,
			productId,
			userId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
			threadId: undefined,
			provider: aiConfig.provider,
			model: aiConfig.model,
			errorMessage: result.errorMessage ?? result.status,
			prompt,
			metadata: { source: "surface-signal-mapper" },
		});
		return null;
	}

	let parsed: unknown;
	try {
		parsed = parseJsonSafely(result.text);
	} catch (error) {
		await ctx.runMutation(internal.ai.telemetry.recordError, {
			organizationId,
			productId,
			userId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
			threadId: undefined,
			provider: aiConfig.provider,
			model: aiConfig.model,
			errorMessage:
				error instanceof Error
					? `Invalid JSON: ${error.message}`
					: "Invalid JSON response",
			prompt,
			metadata: {
				source: "surface-signal-mapper",
				responseSnippet: result.text.slice(0, 500),
			},
		});
		return null;
	}

	const normalized = normalizeSurfaceSignalResult(parsed);
	if (!normalized) {
		await ctx.runMutation(internal.ai.telemetry.recordError, {
			organizationId,
			productId,
			userId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
			threadId: undefined,
			provider: aiConfig.provider,
			model: aiConfig.model,
			errorMessage: "Invalid surface signal output",
			prompt,
			metadata: {
				source: "surface-signal-mapper",
				responseSnippet: result.text.slice(0, 500),
			},
		});
		return null;
	}

	const telemetryConfig = getAgentTelemetryConfig(AGENT_NAME);
	if (telemetryConfig.persistInferenceLogs) {
		await ctx.runMutation(internal.ai.telemetry.recordInferenceLog, {
			organizationId,
			productId,
			userId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
			promptVersion: PROMPT_VERSION,
			prompt,
			response: result.text,
			provider: aiConfig.provider,
			model: aiConfig.model,
			tokensIn: result.metrics.tokensIn,
			tokensOut: result.metrics.tokensOut,
			totalTokens: result.metrics.totalTokens,
			latencyMs: result.metrics.latencyMs,
			metadata: { source: "surface-signal-mapper" },
		});
	}

	await ctx.runMutation(internal.ai.telemetry.recordUsage, {
		organizationId,
		productId,
		userId,
		useCase: USE_CASE,
		agentName: AGENT_NAME,
		threadId: undefined,
		result: {
			text: "",
			tokensIn: result.metrics.tokensIn,
			tokensOut: result.metrics.tokensOut,
			totalTokens: result.metrics.totalTokens,
			model: aiConfig.model,
			provider: aiConfig.provider,
			latencyMs: result.metrics.latencyMs,
		},
		prompt,
		response: result.text,
		metadata: { source: "surface-signal-mapper" },
	});

	return normalized;
}

function createModelAdapter(aiConfig: {
	provider: string;
	model: string;
}): AgentModel {
	const adapter = createLLMAdapter(aiConfig);
	return {
		generate: async ({ messages, maxTokens, temperature, topP }) => {
			const prompt = messages
				.map((message) => `${message.role.toUpperCase()}: ${message.content}`)
				.join("\n\n");
			const response = await adapter.generateText({
				prompt,
				maxTokens,
				temperature,
				topP,
			});
			return {
				text: response.text,
				stopReason: "end",
				tokensIn: response.tokensIn,
				tokensOut: response.tokensOut,
				totalTokens: response.totalTokens,
			};
		},
	};
}

function buildSurfaceSignalPrompt(input: SurfaceSignalInput): string {
	return `
You are the Surface Signal Mapper Agent. Map each source to one or more product surfaces.

Rules:
- Output ONLY valid JSON.
- Use only these surfaces: management, design, product_front, platform, marketing, admin, docs.
- Each source can map to multiple surfaces.
- Use bucketId to identify the specific area (path prefix, doc area, board name).
- Keep output deterministic: order sources by sourceId, surfaces by the fixed order.

Input JSON:
${JSON.stringify(input)}

Output JSON:
{ "sources": [] }
`.trim();
}

function normalizeSurfaceSignalResult(value: unknown): SurfaceSignalResult | null {
	if (!value || typeof value !== "object") return null;
	const data = value as { sources?: SurfaceSignalSource[] };
	if (!Array.isArray(data.sources)) return null;

	const sources = data.sources
		.filter((source) => source && typeof source === "object")
		.map((source) => {
			const entry = source as SurfaceSignalSource;
			const surfaces = Array.isArray(entry.surfaces)
				? entry.surfaces
						.filter((surface) => isValidSurface(surface))
						.map((surface) => ({
							surface: surface.surface,
							bucketId: surface.bucketId.trim(),
							evidence: Array.isArray(surface.evidence)
								? surface.evidence.map((item) => String(item)).slice(0, 4)
								: undefined,
						}))
						.sort(
							(a, b) =>
								SURFACE_ORDER.indexOf(a.surface) -
									SURFACE_ORDER.indexOf(b.surface) ||
								a.bucketId.localeCompare(b.bucketId),
						)
				: [];

			return {
				sourceType: String(entry.sourceType ?? ""),
				sourceId: String(entry.sourceId ?? ""),
				sourceLabel: String(entry.sourceLabel ?? entry.sourceId ?? ""),
				surfaces,
			};
		})
		.filter((source) => source.sourceId && source.sourceLabel);

	return {
		sources: sources.sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
	};
}

function isValidSurface(value: unknown): value is SurfaceSignal {
	if (!value || typeof value !== "object") return false;
	const item = value as SurfaceSignal;
	return (
		SURFACE_ORDER.includes(item.surface) &&
		typeof item.bucketId === "string" &&
		item.bucketId.trim().length > 0
	);
}

function parseJsonSafely(text: string): any {
	const trimmed = sanitizeJson(text).trim();
	const withoutFences = trimmed.startsWith("```")
		? trimmed.replace(/^```[a-zA-Z]*\s*/, "").replace(/```$/, "").trim()
		: trimmed;
	try {
		return JSON.parse(withoutFences);
	} catch (error) {
		const start = withoutFences.indexOf("{");
		const end = withoutFences.lastIndexOf("}");
		if (start !== -1 && end !== -1 && end > start) {
			const candidate = withoutFences.slice(start, end + 1);
			return JSON.parse(candidate);
		}
		throw error;
	}
}

function sanitizeJson(value: string): string {
	return value
		.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}
