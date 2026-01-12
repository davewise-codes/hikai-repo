import type { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { getAgentAIConfig, getAgentTelemetryConfig } from "../../ai";
import { createLLMAdapter } from "../../ai/config";
import {
	executeAgentLoop,
	type AgentMessage,
	type AgentModel,
} from "../core/agent_loop";
import { injectSkill, loadSkillFromRegistry } from "../core/skill_loader";
import { getToolsForAgent } from "../core/tool_registry";
import { SKILL_CONTENTS } from "../skills";

const AGENT_NAME = "Source Context Classifier Agent";
const USE_CASE = "source_context_classification";
const PROMPT_VERSION = "v1.0";

const SKILL_NAME = "surface-classification";

const CLASSIFICATIONS = new Set([
	"product_core",
	"marketing_surface",
	"infra",
	"docs",
	"experiments",
	"unknown",
]);

type SurfaceBucket = {
	surface: SurfaceClassification["classification"];
	pathPrefix: string;
	signalCount?: number;
};

export type SurfaceClassification = {
	classification:
		| "product_core"
		| "marketing_surface"
		| "infra"
		| "docs"
		| "experiments"
		| "unknown";
	notes: string;
	surfaceBuckets?: SurfaceBucket[];
	outputVersion?: string;
};

export type SurfaceClassificationInput = {
	product: {
		name?: string;
		productType?: string;
		valueProposition?: string;
		targetMarket?: string;
		audiences?: string[];
		stage?: string;
	};
	repo: {
		sourceType: string;
		sourceId: string;
		samples: string[];
		pathOverview: unknown;
		structureSummary: unknown;
	};
};

type ClassifierParams = {
	ctx: ActionCtx;
	organizationId: Id<"organizations">;
	productId: Id<"products">;
	userId: Id<"users">;
	input: SurfaceClassificationInput;
	sampling?: { temperature?: number; topP?: number };
	maxTokens?: number;
};

export async function classifySurface(
	params: ClassifierParams,
): Promise<SurfaceClassification | null> {
	const { ctx, organizationId, productId, userId, input, sampling, maxTokens } =
		params;
	const aiConfig = getAgentAIConfig(AGENT_NAME);
	const model = createModelAdapter(aiConfig);
	const prompt = buildSurfacePrompt(input);
	const skill = loadSkillFromRegistry(SKILL_NAME, SKILL_CONTENTS);
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
			sampling,
			tools: getToolsForAgent("read_only"),
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
			metadata: { source: "surface-classifier" },
		});
		return null;
	}

	const parsed = parseJsonSafely(result.text);
	const validated = validateSurfaceClassification(parsed);
	if (!validated) {
		await ctx.runMutation(internal.ai.telemetry.recordError, {
			organizationId,
			productId,
			userId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
			threadId: undefined,
			provider: aiConfig.provider,
			model: aiConfig.model,
			errorMessage: "Invalid surface classification output",
			prompt,
			metadata: { source: "surface-classifier" },
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
			metadata: { source: "surface-classifier" },
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
		metadata: { source: "surface-classifier" },
	});

	return validated;
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

function buildSurfacePrompt(input: SurfaceClassificationInput): string {
	return `
You are the Source Context Classifier Agent. Classify a source repository into a single product surface.

Rules:
- Output ONLY valid JSON, no markdown.
- Do NOT use "mixed". Pick a primary surface.
- If multiple surfaces exist, add surfaceBuckets with pathPrefix evidence.
- Base decisions on repo structure signals (apps/, packages/, docs/) before samples.
- If evidence is weak, return "unknown" and explain briefly.

Input JSON:
${JSON.stringify(input)}

Output JSON:
{
  "classification": "product_core|marketing_surface|infra|docs|experiments|unknown",
  "notes": "short evidence-based reason",
  "surfaceBuckets": [
    { "surface": "product_core", "pathPrefix": "apps/app", "signalCount": 120 }
  ]
}
`.trim();
}

function parseJsonSafely(text: string): any {
	const trimmed = text.trim();
	const withoutFences = trimmed.startsWith("```")
		? trimmed.replace(/^```[a-zA-Z]*\s*/, "").replace(/```$/, "").trim()
		: trimmed;
	return JSON.parse(withoutFences);
}

function validateSurfaceClassification(
	value: unknown,
): SurfaceClassification | null {
	if (!value || typeof value !== "object") return null;
	const data = value as {
		classification?: string;
		notes?: string;
		surfaceBuckets?: SurfaceBucket[];
		outputVersion?: string;
	};
	if (!data.classification || !CLASSIFICATIONS.has(data.classification)) {
		return null;
	}
	if (typeof data.notes !== "string") return null;

	const surfaceBuckets = Array.isArray(data.surfaceBuckets)
		? data.surfaceBuckets.filter((bucket) => isValidSurfaceBucket(bucket))
		: undefined;

	return {
		classification: data.classification as SurfaceClassification["classification"],
		notes: data.notes,
		surfaceBuckets,
		outputVersion: data.outputVersion,
	};
}

function isValidSurfaceBucket(bucket: SurfaceBucket): boolean {
	if (!bucket || typeof bucket !== "object") return false;
	if (!CLASSIFICATIONS.has(bucket.surface)) return false;
	if (!bucket.pathPrefix || typeof bucket.pathPrefix !== "string") return false;
	if (
		bucket.signalCount !== undefined &&
		(!Number.isInteger(bucket.signalCount) || bucket.signalCount < 0)
	) {
		return false;
	}
	return true;
}
