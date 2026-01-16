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
import { SKILL_CONTENTS } from "../skills";

const AGENT_NAME = "Domain Mapper Agent";
const USE_CASE = "domain_mapping";
const PROMPT_VERSION = "v1.0";

const SKILL_NAME = "domain-taxonomy";

type DomainMapperParams = {
	ctx: ActionCtx;
	organizationId: Id<"organizations">;
	productId: Id<"products">;
	userId: Id<"users">;
	input: Record<string, unknown>;
	sampling?: { temperature?: number; topP?: number };
	maxTokens?: number;
	debugPrompt?: boolean;
};

export type DomainMappingResult = {
	domains: Array<Record<string, unknown>>;
	decisions?: Array<Record<string, unknown>>;
};

export async function mapDomains(
	params: DomainMapperParams,
): Promise<DomainMappingResult | null> {
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
	const prompt = buildDomainPrompt(input);
	const messages: AgentMessage[] = [
		injectSkill(skill),
		{ role: "user", content: prompt },
	];

	const result = await executeAgentLoop(
		model,
		{
			maxTurns: 1,
			timeoutMs: 30000,
			maxTokens: maxTokens ?? 2500,
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
			metadata: { source: "domain-mapper" },
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
			errorMessage: "Empty response from Domain Mapper Agent",
			prompt,
			metadata: { source: "domain-mapper" },
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
				source: "domain-mapper",
				responseSnippet: result.text.slice(0, 500),
			},
		});
		return null;
	}

	const parsedObject = parsed as { domains?: unknown } | null;
	if (!parsedObject || !Array.isArray(parsedObject.domains)) {
		await ctx.runMutation(internal.ai.telemetry.recordError, {
			organizationId,
			productId,
			userId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
			threadId: undefined,
			provider: aiConfig.provider,
			model: aiConfig.model,
			errorMessage: "Invalid domain mapping output",
			prompt,
			metadata: { source: "domain-mapper" },
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
			prompt: debugPrompt ? prompt : undefined,
			response: debugPrompt ? result.text : undefined,
			provider: aiConfig.provider,
			model: aiConfig.model,
			tokensIn: result.metrics.tokensIn,
			tokensOut: result.metrics.tokensOut,
			totalTokens: result.metrics.totalTokens,
			latencyMs: result.metrics.latencyMs,
			metadata: { source: "domain-mapper" },
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
		metadata: { source: "domain-mapper" },
	});

	return parsedObject as DomainMappingResult;
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

function buildDomainPrompt(input: Record<string, unknown>): string {
	return `
You are the Domain Mapper Agent. Map product surfaces to domains based on evidence.

Rules:
- Output ONLY valid JSON, no markdown.
- Use the taxonomy from the injected skill.
- Prefer baseline vocabulary when available.
- Keep domain count small for MVP (2-3 product + Platform Foundation + Internal Tools).

Input JSON:
${JSON.stringify(input)}

Output JSON:
{
  "domains": [],
  "decisions": []
}
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
