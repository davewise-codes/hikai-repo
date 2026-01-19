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
	createListFilesTool,
	createListDirsTool,
	createReadFileTool,
	createTodoManagerTool,
} from "./core/tools";
import { createToolPromptModel } from "./core/tool_prompt_model";
import { SKILL_CONTENTS } from "./skills";
import { getActiveGithubConnection } from "./core/tools/github_helpers";

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
		const initialReminder =
			"<reminder>Call todo_manager FIRST to create your plan.</reminder>";
		const messages: AgentMessage[] = [
			injectSkill(skill),
			{ role: "user", content: `${initialReminder}\n\n${prompt}` },
		];
		const tools = [
			createTodoManagerTool(ctx, productId, runId),
			createListDirsTool(ctx, productId),
			createListFilesTool(ctx, productId),
			createReadFileTool(ctx, productId),
		];

		const githubConnection = await getActiveGithubConnection(ctx, productId);
		if (!githubConnection || githubConnection.repos.length === 0) {
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step: "GitHub connection",
				status: "error",
				metadata: {
					error: "No active GitHub connection or repositories available",
				},
			});
			await ctx.runMutation(internal.agents.agentRuns.finishRun, {
				productId,
				runId,
				status: "error",
				errorMessage: "No active GitHub connection for this product",
			});
			return {
				runId,
				status: "error",
				domainMap: null,
				metrics: {
					turns: 0,
					tokensIn: 0,
					tokensOut: 0,
					totalTokens: 0,
					latencyMs: 0,
				},
			};
		}

		const result = await executeAgentLoop(
			model,
			{
				maxTurns: MAX_TURNS,
				maxTokens: MAX_TOKENS_PER_TURN,
				maxTotalTokens: MAX_TOTAL_TOKENS,
				timeoutMs: TIMEOUT_MS,
				tools,
				emptyResponseReminder:
					"<reminder>Your last response was empty. Continue with tool calls or provide your final output.</reminder>",
				toolUseExtraTextReminder:
					"<reminder>Do not include any extra text with tool calls. Resend ONLY the JSON tool call block. Provide final output in a separate response.</reminder>",
				finalOutputOnlyReminder:
					"<reminder>Your plan is completed. Do NOT call tools. Return your final output only.</reminder>",
				planNag: {
					threshold: 2,
					message:
						"<reminder>Update your plan with todo_manager to reflect progress.</reminder>",
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
							_debug: response._debug
								? {
										rawText: response._debug.rawText?.slice(0, 10000),
										extracted: response._debug.extracted,
										hadExtraction: Boolean(response._debug.extracted),
									}
								: null,
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
		"Analyze this codebase and identify the main product domains.",
		"",
		"A domain = a distinct area of functionality in the code.",
		"Look at: folder names, feature modules, page routes, main components.",
		"",
		"EXPLORATION STRATEGY (follow this order):",
		"1. Use list_dirs to see the project structure (depth 2).",
		"2. Identify interesting directories (src/, domains/, features/, pages/, components/).",
		"3. Use list_dirs with a specific path to go deeper (depth 2).",
		"4. Use list_files on a specific directory to see files (non-recursive).",
		"5. Use read_file on key files (README, index, routes, main entries).",
		"",
		"IMPORTANT:",
		"- Start broad (list_dirs) then narrow down (list_files, read_file).",
		"- Do NOT read everything; be selective.",
		"- Use ACTUAL folder/file names from the code as domain names.",
		"- Every domain must have a real file path as evidence.",
		"",
		"OUTPUT: list each domain with its file path evidence.",
		"Use ONLY evidence from product_front and platform code (UI + backend services).",
		"Ignore marketing, admin, observability, CI/CD, tests, and config-only files.",
		"Always call todo_manager first to create your plan, and update it as you progress.",
		"Use list_dirs to explore structure, list_files to inspect folders, and read_file to gather evidence.",
		"Any output format is acceptable for now.",
		"Tool input rules:",
		'- todo_manager input: { "items": [{ "content": "...", "activeForm": "...", "status": "in_progress" | "pending" | "completed" }] }',
		'- list_dirs input: { "path"?: "apps/webapp/src", "depth"?: 2, "limit"?: 50 }',
		'- list_files input: { "path"?: "apps/webapp/src", "pattern"?: "*.tsx", "limit"?: 50 }',
		'- read_file input: { "path": "path/to/file.tsx" }',
		"Do NOT nest tool calls inside todo_manager. Call each tool directly.",
		"Example tool call block:",
		'{"type":"tool_use","toolCalls":[{"id":"call-1","name":"todo_manager","input":{"items":[{"content":"Explore repo structure","activeForm":"Exploring repo","status":"in_progress"},{"content":"Inspect key files","activeForm":"Inspecting files","status":"pending"},{"content":"Map domains","activeForm":"Mapping domains","status":"pending"}]}},{"id":"call-2","name":"list_dirs","input":{"path":"","depth":2,"limit":50}}]}',
		`Use productId: ${productId} when calling tools.`,
	].join("\n");
}

function buildToolProtocol(productId: Id<"products">): string {
	return [
		"You are an autonomous agent.",
		"",
		"Your loop: plan -> act -> update plan -> repeat.",
		"",
		"Rules:",
		"- Call todo_manager FIRST to create your plan",
		"- After each phase, update plan with todo_manager",
		"- Only one task in_progress at a time",
		"",
		"Tool calls must use JSON only:",
		'{"type":"tool_use","toolCalls":[{"id":"call-1","name":"tool_name","input":{}}]}',
		"Final output can be plain text and does not need JSON.",
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

		if (outputPayload) {
			const fileId = await ctx.storage.store(
				new Blob([outputPayload], { type: "application/json" }),
			);
			outputRef = { fileId, sizeBytes: outputSize };
			if (outputSize >= 5 * 1024) {
				output = { _truncated: true, sizeBytes: outputSize };
			}
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
