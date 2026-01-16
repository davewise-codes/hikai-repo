import type { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { getAgentAIConfig, getAgentTelemetryConfig } from "../../ai";
import { createLLMAdapter, type AIProvider } from "../../ai/config";
import {
	executeAgentLoop,
	type AgentMessage,
	type AgentModel,
} from "../core/agent_loop";
import { injectSkill, loadSkillFromRegistry } from "../core/skill_loader";
import { createPlan, renderPlan } from "../core/plan_manager";
import { featureMapPrompt, FEATURE_MAP_PROMPT_VERSION } from "../../ai/prompts";
import { SKILL_CONTENTS } from "../skills";

const AGENT_NAME = "Feature Map Agent";
const USE_CASE = "feature_map_generation";
const PROMPT_VERSION = FEATURE_MAP_PROMPT_VERSION;

const SKILL_NAME = "feature-extraction";

type FeatureExtractorParams = {
	ctx: ActionCtx;
	organizationId: Id<"organizations">;
	productId: Id<"products">;
	userId: Id<"users">;
	input: Record<string, unknown>;
	sampling?: { temperature?: number; topP?: number };
	maxTokens?: number;
	debugPrompt?: boolean;
};

export type FeatureExtractionResult = {
	features: Array<Record<string, unknown>>;
	domains?: Array<Record<string, unknown>>;
	domainMap?: Record<string, unknown>;
	decisionSummary?: Record<string, unknown>;
	generatedAt?: number;
	sourcesUsed?: string[];
	rawResponse?: string;
	invalidOutput?: boolean;
};

export async function extractFeatures(
	params: FeatureExtractorParams,
): Promise<FeatureExtractionResult | null> {
	const {
		ctx,
		organizationId,
		productId,
		userId,
		input,
		sampling,
		maxTokens,
		debugPrompt,
	} = params;
	const aiConfig = getAgentAIConfig(AGENT_NAME);
	const model = createModelAdapter(aiConfig);
	const skill = loadSkillFromRegistry(SKILL_NAME, SKILL_CONTENTS);
	const plan = createPlan([
		{
			content: "Review product baseline and context",
			activeForm: "Reviewing context",
		},
		{
			content: "Summarize source evidence",
			activeForm: "Summarizing sources",
		},
		{
			content: "Extract domains and features",
			activeForm: "Extracting features",
		},
		{
			content: "Validate feature map consistency",
			activeForm: "Validating output",
		},
	]);
	const prompt = buildFeaturePrompt(input, renderPlan(plan));
	const messages: AgentMessage[] = [
		injectSkill(skill),
		{ role: "user", content: prompt },
	];

	const result = await executeAgentLoop(
		model,
		{
			maxTurns: 1,
			timeoutMs: 60000,
			maxTokens: maxTokens ?? 4500,
			sampling,
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
			metadata: { source: "feature-extractor" },
		});
		return null;
	}

	if (!result.text || result.text.trim().length === 0) {
		await ctx.runMutation(internal.ai.telemetry.recordError, {
			organizationId,
			productId,
			userId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
			threadId: undefined,
			provider: aiConfig.provider,
			model: aiConfig.model,
			errorMessage: "Empty response from Feature Map Agent",
			prompt,
			metadata: { source: "feature-extractor" },
		});
		if (debugPrompt) {
			return { features: [], rawResponse: "", invalidOutput: true };
		}
		return null;
	}

	let parsed: unknown;
	try {
		parsed = parseJsonSafely(result.text);
	} catch (error) {
		const repaired = await tryRepairJson(
			ctx,
			createLLMAdapter(aiConfig),
			{
				organizationId,
				productId,
				userId,
				useCase: USE_CASE,
				agentName: AGENT_NAME,
			},
			result.text,
		);
		if (repaired) {
			try {
				parsed = parseJsonSafely(repaired);
			} catch {
				parsed = null;
			}
		}

		if (!parsed) {
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
					source: "feature-extractor",
					responseSnippet: result.text.slice(0, 500),
					repairAttempted: true,
				},
			});
			if (debugPrompt) {
				return { features: [], rawResponse: result.text, invalidOutput: true };
			}
			return null;
		}
	}

	if (!parsed || !Array.isArray((parsed as FeatureExtractionResult).features)) {
		await ctx.runMutation(internal.ai.telemetry.recordError, {
			organizationId,
			productId,
			userId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
			threadId: undefined,
			provider: aiConfig.provider,
			model: aiConfig.model,
			errorMessage: "Invalid feature map output",
			prompt,
			metadata: { source: "feature-extractor" },
		});
		if (debugPrompt) {
			return { features: [], rawResponse: result.text, invalidOutput: true };
		}
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
			prompt: debugPrompt ? prompt : undefined,
			response: debugPrompt ? result.text : undefined,
			provider: aiConfig.provider,
			model: aiConfig.model,
			tokensIn: result.metrics.tokensIn,
			tokensOut: result.metrics.tokensOut,
			totalTokens: result.metrics.totalTokens,
			latencyMs: result.metrics.latencyMs,
			metadata: { source: "feature-extractor" },
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
		prompt: debugPrompt ? prompt : undefined,
		response: debugPrompt ? result.text : undefined,
		metadata: { source: "feature-extractor" },
	});

	const resultPayload = parsed as FeatureExtractionResult;
	if (debugPrompt) {
		resultPayload.rawResponse = result.text;
	}
	return resultPayload;
}

function createModelAdapter(aiConfig: {
	provider: AIProvider;
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

function buildFeaturePrompt(input: Record<string, unknown>, plan: string): string {
	return `
${featureMapPrompt}

Plan:
${plan}

Output constraints:
- Output ONLY valid JSON.
- Keep it short and complete; do not truncate.
- Max domains: 7
- Max features: 12
- Max decisionSummary.domainDecisions: 6
- Max decisionSummary.featureDecisions: 10
- If you cannot fit decisionSummary safely, omit decisionSummary entirely.

Input JSON:
${JSON.stringify(input)}
`.trim();
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

async function tryRepairJson(
	ctx: ActionCtx,
	adapter: ReturnType<typeof createLLMAdapter>,
	telemetry: {
		organizationId: Id<"organizations">;
		productId: Id<"products">;
		userId: Id<"users">;
		useCase: string;
		agentName: string;
	},
	raw: string,
): Promise<string | null> {
	const prompt = `
Fix the JSON below so it is valid and complete.
- Preserve all content.
- Output ONLY valid JSON.

JSON:
${raw}
`.trim();

	try {
		const response = await adapter.generateText({
			prompt,
			maxTokens: 2000,
			temperature: 0,
		});
		await ctx.runMutation(internal.ai.telemetry.recordUsage, {
			organizationId: telemetry.organizationId,
			productId: telemetry.productId,
			userId: telemetry.userId,
			useCase: telemetry.useCase,
			agentName: telemetry.agentName,
			threadId: undefined,
			result: {
				text: "",
				tokensIn: response.tokensIn,
				tokensOut: response.tokensOut,
				totalTokens: response.totalTokens,
				model: response.model,
				provider: response.provider,
				latencyMs: response.latencyMs,
			},
			prompt,
			response: response.text,
			metadata: { source: "feature-extractor-repair" },
		});
		return response.text.trim();
	} catch {
		return null;
	}
}
