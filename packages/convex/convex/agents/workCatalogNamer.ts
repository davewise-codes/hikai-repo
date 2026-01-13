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

const AGENT_NAME = "Work Catalog Naming Agent";
const USE_CASE = "work_catalog_naming";
const PROMPT_VERSION = "v1.0";

type WorkCatalogItem = {
	name: string;
	displayName?: string;
	notes?: string;
	signals: string[];
};

type WorkCatalog = {
	feature_surface: WorkCatalogItem[];
	capabilities: WorkCatalogItem[];
	work: WorkCatalogItem[];
};

export type WorkCatalogSource = {
	sourceType: string;
	sourceId: string;
	sourceLabel: string;
	catalog: WorkCatalog;
};

export type WorkCatalogResult = {
	sources: WorkCatalogSource[];
};

type WorkCatalogNamingInput = {
	product: {
		name: string;
		valueProposition?: string;
	};
	glossary: {
		terms: Array<{
			term: string;
			source: string;
			surface?: string;
			evidence: string[];
		}>;
	};
	sources: WorkCatalogSource[];
};

type WorkCatalogNamingParams = {
	ctx: ActionCtx;
	organizationId: Id<"organizations">;
	productId: Id<"products">;
	userId: Id<"users">;
	input: WorkCatalogNamingInput;
	maxTokens?: number;
};

export async function nameWorkCatalogItems(
	params: WorkCatalogNamingParams,
): Promise<WorkCatalogResult | null> {
	const { ctx, organizationId, productId, userId, input, maxTokens } = params;
	const aiConfig = getAgentAIConfig(AGENT_NAME);
	const model = createModelAdapter(aiConfig);
	const prompt = buildWorkCatalogNamingPrompt(input);
	const messages: AgentMessage[] = [{ role: "user", content: prompt }];

	const result = await executeAgentLoop(
		model,
		{
			maxTurns: 1,
			timeoutMs: 30000,
			maxTokens: maxTokens ?? 1200,
			sampling: { temperature: 0 },
			tools: [],
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
			metadata: { source: "work-catalog-namer" },
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
				source: "work-catalog-namer",
				responseSnippet: result.text.slice(0, 500),
			},
		});
		return null;
	}

	const normalized = normalizeWorkCatalogNames(input.sources, parsed);
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
			errorMessage: "Invalid work catalog naming output",
			prompt,
			metadata: {
				source: "work-catalog-namer",
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
			metadata: { source: "work-catalog-namer" },
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
		metadata: { source: "work-catalog-namer" },
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

function buildWorkCatalogNamingPrompt(input: WorkCatalogNamingInput): string {
	return `
You are a product copy assistant. Rename catalog items to match the product's language.

Rules:
- Output ONLY valid JSON.
- Keep the same structure and item count.
- Do NOT remove, add, or move items.
- Keep "name" unchanged. Add optional "displayName" and "notes".
- "displayName" should be short (2-4 words), title case, product-facing.
- Prefer terminology from glossary terms. Only use evidence from glossary, signals and product info.

Input JSON:
${JSON.stringify(input)}

Output JSON:
{ "sources": [] }
`.trim();
}

function normalizeWorkCatalogNames(
	sources: WorkCatalogSource[],
	value: unknown,
): WorkCatalogResult | null {
	if (!value || typeof value !== "object") return null;
	const data = value as { sources?: WorkCatalogSource[] };
	if (!Array.isArray(data.sources)) return null;

	const responseBySource = new Map(
		data.sources
			.filter((source) => source && typeof source === "object")
			.map((source) => [
				`${source.sourceType}:${source.sourceId}`,
				source,
			]),
	);

	const normalizedSources = sources.map((source) => {
		const key = `${source.sourceType}:${source.sourceId}`;
		const response = responseBySource.get(key);
		const catalog = mergeCatalogNames(source.catalog, response?.catalog);
		return { ...source, catalog };
	});

	return { sources: normalizedSources };
}

function mergeCatalogNames(
	base: WorkCatalog,
	response?: WorkCatalog,
): WorkCatalog {
	const mergeCategory = (
		items: WorkCatalogItem[],
		responseItems?: WorkCatalogItem[],
	) => {
		const responseByName = new Map(
			(responseItems ?? [])
				.filter((item) => item && typeof item.name === "string")
				.map((item) => [item.name, item]),
		);

		return items.map((item) => {
			const updated = responseByName.get(item.name);
			const displayName =
				typeof updated?.displayName === "string" &&
				updated.displayName.trim().length > 0
					? updated.displayName.trim()
					: undefined;
			const notes =
				typeof updated?.notes === "string" && updated.notes.trim().length > 0
					? updated.notes.trim()
					: item.notes;

			return {
				...item,
				displayName,
				notes,
			};
		});
	};

	return {
		feature_surface: mergeCategory(base.feature_surface, response?.feature_surface),
		capabilities: mergeCategory(base.capabilities, response?.capabilities),
		work: mergeCategory(base.work, response?.work),
	};
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
