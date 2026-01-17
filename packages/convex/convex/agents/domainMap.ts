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
	type AgentModel,
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
import { createPlan } from "./core/plan_manager";
import { validateDomainMap } from "./core/validators";
import type { ToolResult } from "./core/tool_registry";
import { SKILL_CONTENTS } from "./skills";

const AGENT_NAME = "Domain Map Agent";
const USE_CASE = "domain_map";
const PROMPT_VERSION = "v1.0";
const SKILL_NAME = "domain-map-agent";

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
		const model = createDomainMapModel(productId, aiConfig);
		const skill = loadSkillFromRegistry(SKILL_NAME, SKILL_CONTENTS);
		const prompt = buildDomainMapPrompt();
		const messages: AgentMessage[] = [injectSkill(skill), { role: "user", content: prompt }];
		const defaultPlan = createPlan([
			{ content: "Gather context", activeForm: "Gathering context" },
			{ content: "Analyze surfaces", activeForm: "Analyzing surfaces" },
			{ content: "Map domains", activeForm: "Mapping domains" },
			{ content: "Validate output", activeForm: "Validating output" },
		]);

		const tools = [
			createTodoManagerTool(ctx, productId, runId),
			createReadSourcesTool(ctx, productId),
			createReadBaselineTool(ctx, productId),
			createReadContextInputsTool(ctx, productId),
			createValidateTool(),
		];

		let planLogged = false;
		const result = await executeAgentLoop(
			model,
			{
				maxTurns: 10,
				timeoutMs: 8 * 60 * 1000,
				tools,
				onStep: async (step) => {
					if (step.turn === 0 && !includesTool(step, "todo_manager")) {
						await ctx.runMutation(internal.agents.agentRuns.appendStep, {
							productId,
							runId,
							step: "plan_update",
							status: "info",
							metadata: { plan: defaultPlan },
						});
						planLogged = true;
					}

					if (includesTool(step, "todo_manager")) {
						planLogged = true;
					}

					await persistToolSteps(ctx, productId, runId, step);
				},
			},
			prompt,
			messages,
		);

		if (!planLogged) {
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step: "plan_update",
				status: "info",
				metadata: { plan: defaultPlan },
			});
		}

		let domainMap: Record<string, unknown> | null = null;
		if (result.status === "completed" && result.text) {
			try {
				domainMap = JSON.parse(result.text) as Record<string, unknown>;
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
						error instanceof Error ? error.message : "Invalid JSON response",
					prompt,
					metadata: { source: "domain-map-agent" },
				});
			}
		}

		let validation = null;
		if (domainMap) {
			validation = validateDomainMap(domainMap);
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step: "Validation: domain_map",
				status: validation.valid ? "success" : "warn",
				metadata: validation,
			});
		}

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
				response: result.text,
				provider: aiConfig.provider,
				model: aiConfig.model,
				tokensIn: result.metrics.tokensIn,
				tokensOut: result.metrics.tokensOut,
				totalTokens: result.metrics.totalTokens,
				latencyMs: result.metrics.latencyMs,
				metadata: {
					source: "domain-map-agent",
					validation,
				},
			});
		}

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

function createDomainMapModel(
	productId: Id<"products">,
	aiConfig: { provider: "openai" | "anthropic"; model: string },
): AgentModel {
	const adapter = createLLMAdapter(aiConfig);

	return {
		generate: async ({ messages, maxTokens, temperature, topP }) => {
			const toolResults = extractToolResults(messages);
			if (!toolResults) {
				return {
					text: "Requesting tool outputs",
					stopReason: "tool_use",
					toolCalls: [
						{
							name: "todo_manager",
							input: {
								action: "create",
								items: [
									{
										content: "Gather context",
										activeForm: "Gathering context",
										status: "in_progress",
									},
									{
										content: "Analyze surfaces",
										activeForm: "Analyzing surfaces",
										status: "pending",
									},
									{
										content: "Map domains",
										activeForm: "Mapping domains",
										status: "pending",
									},
									{
										content: "Validate output",
										activeForm: "Validating output",
										status: "pending",
									},
								],
							},
							id: "todo_manager",
						},
						{
							name: "read_sources",
							input: { productId, limit: 50 },
							id: "read_sources",
						},
						{
							name: "read_baseline",
							input: { productId },
							id: "read_baseline",
						},
						{
							name: "read_context_inputs",
							input: { productId },
							id: "read_context_inputs",
						},
					],
					tokensIn: 0,
					tokensOut: 0,
					totalTokens: 0,
				};
			}

			const prompt = buildDomainMapPrompt(toolResults);
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

function extractToolResults(messages: AgentMessage[]): ToolResult[] | null {
	const last = messages[messages.length - 1]?.content ?? "";
	try {
		const parsed = JSON.parse(last);
		if (!Array.isArray(parsed)) return null;
		const hasToolShape = parsed.every(
			(entry) => entry && typeof entry.name === "string",
		);
		return hasToolShape ? (parsed as ToolResult[]) : null;
	} catch {
		return null;
	}
}

function buildDomainMapPrompt(toolResults?: ToolResult[]): string {
	const sources = toolResults?.find((result) => result.name === "read_sources")
		?.output;
	const baseline = toolResults?.find((result) => result.name === "read_baseline")
		?.output;
	const contextInputs = toolResults?.find(
		(result) => result.name === "read_context_inputs",
	)?.output;

	return `You are the Domain Map Agent.\n\nUse only evidence from product_front and platform sources.\n\nReturn ONLY valid JSON matching the schema.\n\nBaseline:\n${JSON.stringify(baseline ?? {}, null, 2)}\n\nSources:\n${JSON.stringify(sources ?? [], null, 2)}\n\nContext inputs:\n${JSON.stringify(contextInputs ?? {}, null, 2)}\n`;
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
