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

const AGENT_NAME = "Glossary Curator Agent";
const USE_CASE = "glossary_curation";
const PROMPT_VERSION = "v1.0";
const SKILL_NAME = "glossary-curation";

export type GlossaryTerm = {
	term: string;
	evidence: string[];
	source: string;
	surface?: string;
};

export type GlossaryCandidate = {
	id: string;
	term: string;
	score: number;
	evidenceIds: string[];
	evidenceTexts: string[];
	sources: string[];
	surfaces: string[];
};

export type GlossaryResult = {
	terms: GlossaryTerm[];
};

type GlossaryInput = {
	product: {
		name: string;
		valueProposition?: string;
	};
	candidates: GlossaryCandidate[];
};

type GlossaryParams = {
	ctx: ActionCtx;
	organizationId: Id<"organizations">;
	productId: Id<"products">;
	userId: Id<"users">;
	input: GlossaryInput;
	maxTokens?: number;
};

export async function curateGlossary(
	params: GlossaryParams,
): Promise<GlossaryResult | null> {
	const { ctx, organizationId, productId, userId, input, maxTokens } = params;
	const aiConfig = getAgentAIConfig(AGENT_NAME);
	const model = createModelAdapter(aiConfig);
	const skill = loadSkillFromRegistry(SKILL_NAME, SKILL_CONTENTS);
	const prompt = buildGlossaryPrompt(input);
	const messages: AgentMessage[] = [
		injectSkill(skill),
		{ role: "user", content: prompt },
	];

	const result = await executeAgentLoop(
		model,
		{
			maxTurns: 1,
			timeoutMs: 30000,
			maxTokens: maxTokens ?? 1200,
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
			metadata: { source: "glossary-curator" },
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
				source: "glossary-curator",
				responseSnippet: result.text.slice(0, 500),
			},
		});
		return null;
	}

	const normalized = normalizeGlossarySelection(input.signals, parsed);
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
			errorMessage: "Invalid glossary curation output",
			prompt,
			metadata: {
				source: "glossary-curator",
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
			metadata: { source: "glossary-curator" },
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
		metadata: { source: "glossary-curator" },
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

function buildGlossaryPrompt(input: GlossaryInput): string {
	return `
You are curating a tenant-facing glossary for a product. Select 20 terms that best represent the product's value proposition and language.

Rules:
- Output ONLY valid JSON.
- Choose terms from the candidate list; do NOT invent terms.
- Each term must reference at least one evidence id from the candidate.
- Avoid generic UI words (e.g., "title", "subtitle", "welcome").
- Keep terms concise (2-4 words).
- Balance sources: include at least 4 terms from marketing/docs if available, at most 8 from baseline.

Input JSON:
${JSON.stringify(input)}

Output JSON:
{ "terms": [ { "term": "", "evidenceIds": [] } ] }
`.trim();
}

function normalizeGlossarySelection(
	candidates: GlossaryCandidate[],
	value: unknown,
): GlossaryResult | null {
	if (!value || typeof value !== "object") return null;
	const data = value as { terms?: Array<{ term?: string; evidenceIds?: string[] }> };
	if (!Array.isArray(data.terms)) return null;

	const candidateByTerm = new Map(
		candidates.map((candidate) => [candidate.term.toLowerCase(), candidate]),
	);
	const results: GlossaryTerm[] = [];

	for (const item of data.terms) {
		if (!item || typeof item.term !== "string") continue;
		const ids = Array.isArray(item.evidenceIds) ? item.evidenceIds : [];
		const candidate = candidateByTerm.get(item.term.toLowerCase());
		if (!candidate) continue;
		const evidenceIds = ids.length > 0 ? ids : candidate.evidenceIds;
		const evidenceTexts = candidate.evidenceTexts.length
			? candidate.evidenceTexts
			: evidenceIds;
		if (evidenceTexts.length === 0) continue;
		results.push({
			term: item.term.trim(),
			evidence: evidenceTexts.slice(0, 3),
			source: candidate.sources[0] ?? "signals",
			surface: candidate.surfaces[0],
		});
	}

	if (results.length === 0) return null;
	return { terms: results.slice(0, 20) };
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
