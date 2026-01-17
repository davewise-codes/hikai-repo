import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getAgentAIConfig, getAgentTelemetryConfig } from "../ai";
import { createLLMAdapter } from "../ai/config";
import {
	executeAgentLoop,
	type AgentLoopStatus,
	type AgentMessage,
	type StepResult,
} from "./core/agent_loop";
import { injectSkill, loadSkillFromRegistry } from "./core/skill_loader";
import {
	createReadBaselineTool,
	createReadContextInputsTool,
	createReadSourcesTool,
	createTodoManagerTool,
	createValidateTool,
} from "./core/tools";
import { validateDomainMap } from "./core/validators";
import { createToolPromptModel } from "./core/tool_prompt_model";
import { SKILL_CONTENTS } from "./skills";

const AGENT_NAME = "Domain Map Agent";
const USE_CASE = "domain_map";
const PROMPT_VERSION = "v1.0";
const SKILL_NAME = "domain-map-agent";
const MAX_TURNS = 10;
const MAX_TOKENS_PER_TURN = 2000;
const MAX_TOTAL_TOKENS = 1_000_000;
const TIMEOUT_MS = 8 * 60 * 1000;

export const generateDomainMap = action({
	args: {
		productId: v.id("products"),
	},
	handler: async (
		ctx,
		{ productId },
	): Promise<{
		runId: Id<"agentRuns">;
		status: AgentLoopStatus;
		domainMap: Record<string, unknown> | null;
		metrics: {
			turns: number;
			tokensIn: number;
			tokensOut: number;
			totalTokens: number;
			latencyMs: number;
		};
	}> => {
		const { organizationId, userId } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);

		const { runId } = await ctx.runMutation(api.agents.agentRuns.createAgentRun, {
			productId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
		});

		const aiConfig = getAgentAIConfig(AGENT_NAME);
		const telemetryConfig = getAgentTelemetryConfig(AGENT_NAME);
		const model = createToolPromptModel(createLLMAdapter(aiConfig), {
			protocol: buildToolProtocol(productId),
		});
		const skill = loadSkillFromRegistry(SKILL_NAME, SKILL_CONTENTS);
		const prompt = buildDomainMapPrompt(productId);
		const messages: AgentMessage[] = [injectSkill(skill), { role: "user", content: prompt }];
		const tools = [
			createTodoManagerTool(ctx, productId, runId),
			createReadSourcesTool(ctx, productId),
			createReadBaselineTool(ctx, productId),
			createReadContextInputsTool(ctx, productId),
			createValidateTool(),
		];

		const result = await executeAgentLoop(
			model,
			{
				maxTurns: MAX_TURNS,
				maxTokens: MAX_TOKENS_PER_TURN,
				maxTotalTokens: MAX_TOTAL_TOKENS,
				timeoutMs: TIMEOUT_MS,
				tools,
				validation: {
					validate: validateDomainMap,
					onValidation: async (validation, _output, rawText, hadExtraText) => {
						const preview =
							typeof rawText === "string"
								? rawText.slice(0, 2000)
								: undefined;
						await ctx.runMutation(internal.agents.agentRuns.appendStep, {
							productId,
							runId,
							step: "Validation: domain_map",
							status: validation.valid ? "success" : "warn",
							metadata: {
								validation,
								rawTextPreview: preview,
								hadExtraText,
							},
						});
					},
				},
				onModelResponse: async ({ response, turn }) => {
					const preview =
						typeof response.text === "string"
							? response.text.slice(0, 2000)
							: "";
					await ctx.runMutation(internal.agents.agentRuns.appendStep, {
						productId,
						runId,
						step: `Model output (turn ${turn + 1})`,
						status: "info",
						metadata: {
							modelOutputPreview: preview,
							stopReason: response.stopReason,
							toolCalls: response.toolCalls?.map((call) => ({
								name: call.name,
								id: call.id,
							})),
						},
					});
				},
				onStep: async (step) => {
					await persistToolSteps(ctx, productId, runId, step);
				},
			},
			prompt,
			messages,
		);

		const domainMap =
			result.status === "completed" && result.output
				? (result.output as Record<string, unknown>)
				: null;

		if (domainMap) {
			await ctx.runMutation(internal.agents.domainMapData.saveDomainMap, {
				productId,
				domainMap,
			});
		}

		if (telemetryConfig.persistInferenceLogs) {
			await ctx.runMutation(internal.ai.telemetry.recordInferenceLog, {
				organizationId,
				productId,
				userId,
				useCase: USE_CASE,
				agentName: AGENT_NAME,
				promptVersion: PROMPT_VERSION,
				prompt,
				response: result.rawText ?? result.text,
				provider: aiConfig.provider,
				model: aiConfig.model,
				tokensIn: result.metrics.tokensIn,
				tokensOut: result.metrics.tokensOut,
				totalTokens: result.metrics.totalTokens,
				latencyMs: result.metrics.latencyMs,
				metadata: {
					source: "domain-map-agent",
					status: result.status,
					turns: result.metrics.turns,
					maxTurns: result.metrics.maxTurns,
					maxTotalTokens: result.metrics.maxTotalTokens,
				},
			});
		}

		const budgetStepStatus =
			result.status === "completed"
				? "success"
				: result.status === "budget_exceeded"
					? "error"
					: "warn";

		await ctx.runMutation(internal.agents.agentRuns.appendStep, {
			productId,
			runId,
			step: "Budget",
			status: budgetStepStatus,
			metadata: {
				turns: result.metrics.turns,
				maxTurns: result.metrics.maxTurns,
				tokensIn: result.metrics.tokensIn,
				tokensOut: result.metrics.tokensOut,
				totalTokens: result.metrics.totalTokens,
				maxTotalTokens: result.metrics.maxTotalTokens,
				status: result.status,
			},
		});

		const finalStatus = result.status === "completed" ? "success" : "error";
		await ctx.runMutation(internal.agents.agentRuns.finishRun, {
			productId,
			runId,
			status: finalStatus,
			errorMessage: result.errorMessage,
		});

		return {
			runId,
			status: result.status,
			domainMap,
			metrics: result.metrics,
		};
	},
});

function buildDomainMapPrompt(productId: Id<"products">): string {
	return [
		"You are the Domain Map Agent.",
		"Goal: produce a product domain map using evidence from tools.",
		"Use ONLY evidence from sources classified as product_front or platform.",
		"Ignore marketing, admin, and observability sources.",
		"Always call todo_manager first to create your plan.",
		"Use read_sources, read_baseline, and read_context_inputs to gather context.",
		"You MUST call validate_output before final output.",
		"Do NOT return a final output until you have called tools.",
		"Final output must be ONLY the JSON schema (no extra text).",
		"Tool input rules:",
		'- todo_manager input: { "action": "create", "items": [{ "content": "...", "activeForm": "...", "status": "in_progress" | "pending" | "completed" }] }',
		'- read_sources input: { "productId": "' + productId + '", "limit": 50 }',
		'- read_baseline input: { "productId": "' + productId + '" }',
		'- read_context_inputs input: { "productId": "' + productId + '" }',
		'- validate_output input: { "outputType": "domain_map", "data": <your json> }',
		"Do NOT nest tool calls inside todo_manager. Call each tool directly.",
		"Example tool call block:",
		'{"type":"tool_use","toolCalls":[{"id":"call-1","name":"todo_manager","input":{"action":"create","items":[{"content":"Gather context","activeForm":"Gathering context","status":"in_progress"}]}},{"id":"call-2","name":"read_sources","input":{"productId":"' +
			productId +
			'","limit":50}},{"id":"call-3","name":"read_baseline","input":{"productId":"' +
			productId +
			'"}},{"id":"call-4","name":"read_context_inputs","input":{"productId":"' +
			productId +
			'"}}]}',
		`Use productId: ${productId} when calling tools.`,
		"Plan update rule:",
		'- After finishing a phase, call todo_manager with action "update" to mark the current item as completed and the next item as in_progress (only 1 in_progress).',
	].join("\n");
}

function buildToolProtocol(productId: Id<"products">): string {
	return [
		"You are an autonomous agent.",
		"You must respond with a single JSON object and no extra text.",
		"Use this schema for tool calls:",
		'{"type":"tool_use","toolCalls":[{"id":"call-1","name":"tool_name","input":{}}]}',
		"Use this schema for final output:",
		'{"type":"final","output":{}}',
		"Only call tools listed in the tool catalog.",
		"Tool inputs must include the productId when required.",
		`Use productId: ${productId}.`,
	].join("\n");
}

function includesTool(step: StepResult, toolName: string): boolean {
	return step.toolCalls.some((call) => call.name === toolName);
}

async function persistToolSteps(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
	step: StepResult,
) {
	const toolCalls = step.toolCalls ?? [];
	for (const result of step.results) {
		const call =
			toolCalls.find((toolCall) => toolCall.id === result.toolCallId) ??
			toolCalls.find((toolCall) => toolCall.name === result.name) ??
			{ name: result.name, input: result.input };

		const outputPayload =
			result.output !== undefined ? JSON.stringify(result.output) : null;
		const outputSize = outputPayload ? byteLength(outputPayload) : 0;
		let outputRef: { fileId: Id<"_storage">; sizeBytes: number } | null = null;
		let output = result.output;

		if (outputPayload && outputSize >= 10 * 1024) {
			const fileId = await ctx.storage.store(
				new Blob([outputPayload], { type: "application/json" }),
			);
			outputRef = { fileId, sizeBytes: outputSize };
			output = undefined;
		}

		await ctx.runMutation(internal.agents.agentRuns.appendStep, {
			productId,
			runId,
			step: `Tool: ${result.name}`,
			status: result.error ? "error" : "info",
			metadata: {
				toolCalls: [call],
				result: {
					name: result.name,
					input: result.input,
					output,
					error: result.error,
					outputRef,
				},
			},
		});
	}
}

function byteLength(value: string): number {
	return new TextEncoder().encode(value).length;
}
