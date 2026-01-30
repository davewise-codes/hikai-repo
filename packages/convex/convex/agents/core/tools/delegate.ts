import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { api, internal } from "../../../_generated/api";
import { getAgentAIConfig, getAgentTelemetryConfig } from "../../../ai";
import { createLLMAdapter } from "../../../ai/config";
import {
	executeAgentLoop,
	type AgentLoopResult,
	type AgentMessage,
} from "../agent_loop";
import { persistCompactionStep, persistToolSteps } from "../agent_run_steps";
import { getAgentEntrypoint } from "../agent_entrypoints";
import { createToolPromptModel } from "../tool_prompt_model";
import { injectSkill } from "../skill_loader";
import type { ToolDefinition } from "../tool_registry";
import { createListDirsTool } from "./github_list_dirs";
import { createListFilesTool } from "./github_list_files";
import { createReadFileTool } from "./github_read_file";
import { createGrepFileTool } from "./github_grep_file";
import { createSearchCodeTool } from "./github_search_code";
import { createValidateJsonTool } from "./validate_json";

type DelegateInput = {
	agentType: string;
	task: string;
	context?: unknown;
};

const DELEGATE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["agentType", "task"],
	properties: {
		productId: { type: "string" },
		agentType: { type: "string" },
		task: { type: "string" },
		context: {},
	},
} as const;

export function createDelegateTool(
	ctx: ActionCtx,
	productId: Id<"products">,
	parentRunId: Id<"agentRuns">,
): ToolDefinition {
	return {
		name: "delegate",
		description:
			"Delegate a focused subtask to a specialized sub-agent (structure_scout, glossary_scout, domain_mapper, feature_scout).",
		inputSchema: DELEGATE_SCHEMA,
		execute: async (input) => {
			const parsed = parseInput(input);
			const entrypoint = getAgentEntrypoint(parsed.agentType);
			const useCase = `subagent:${entrypoint.name}`;
			const { organizationId, userId } = await ctx.runQuery(
				internal.lib.access.assertProductAccessInternal,
				{ productId },
			);

			const { runId } = await ctx.runMutation(
				api.agents.agentRuns.createAgentRun,
				{
					productId,
					useCase,
					agentName: entrypoint.name,
					parentRunId,
				},
			);

			const aiConfig = getAgentAIConfig(entrypoint.name);
			const telemetryConfig = getAgentTelemetryConfig(entrypoint.name);
			const model = createToolPromptModel(createLLMAdapter(aiConfig), {
				protocol: buildDelegateProtocol(productId),
			});
			const prompt = buildDelegatePrompt(entrypoint.name, parsed.task, parsed.context);
			const messages: AgentMessage[] = [
				injectSkill(entrypoint.skill),
				{ role: "user", content: prompt },
			];
			const tools = [
				createListDirsTool(ctx, productId),
				createListFilesTool(ctx, productId),
				createReadFileTool(ctx, productId),
				createGrepFileTool(ctx, productId),
				createSearchCodeTool(ctx, productId),
				createValidateJsonTool(),
			];

			const result = await executeAgentLoop(
				model,
				{
					maxTurns: entrypoint.defaultConfig.maxTurns,
					maxTokens: entrypoint.defaultConfig.maxTokens,
					maxTotalTokens: entrypoint.defaultConfig.maxTotalTokens,
					timeoutMs: entrypoint.defaultConfig.timeoutMs,
					sampling: entrypoint.defaultConfig.sampling,
					compaction: entrypoint.defaultConfig.compaction,
					tools,
					requireValidateJson: true,
					validateJsonReminder:
						"<reminder>Call validate_json with your final JSON before submitting the final output.</reminder>",
					autoFinalizeOnValidateJson: true,
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
					onCompaction: async (step) => {
						await persistCompactionStep(ctx, productId, runId, step);
					},
				},
				prompt,
				messages,
			);

			const outputRef = await persistSubagentOutput(ctx, productId, runId, result);

			if (telemetryConfig.persistInferenceLogs) {
				await ctx.runMutation(internal.ai.telemetry.recordInferenceLog, {
					organizationId,
					productId,
					userId,
					useCase,
					agentName: entrypoint.name,
					promptVersion: "v1.0",
					prompt,
					response: result.rawText ?? result.text,
					provider: aiConfig.provider,
					model: aiConfig.model,
					tokensIn: result.metrics.tokensIn,
					tokensOut: result.metrics.tokensOut,
					totalTokens: result.metrics.totalTokens,
					latencyMs: result.metrics.latencyMs,
					metadata: { source: "delegate-tool" },
				});
			}

			await ctx.runMutation(internal.ai.telemetry.recordUsage, {
				organizationId,
				productId,
				userId,
				useCase,
				agentName: entrypoint.name,
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
				response: result.rawText ?? result.text,
				metadata: { source: "delegate-tool" },
			});

			const status =
				result.status === "completed" ? "success" : "error";
			await ctx.runMutation(internal.agents.agentRuns.finishRun, {
				productId,
				runId,
				status,
				errorMessage: result.errorMessage,
			});

			return {
				subRunId: runId,
				agentType: entrypoint.name,
				status: result.status,
				output: result.output ?? null,
				metrics: result.metrics,
				outputRef,
			};
		},
	};
}

function parseInput(input: unknown): DelegateInput {
	if (!input || typeof input !== "object") {
		throw new Error("Delegate input must be an object.");
	}
	const parsed = input as Partial<DelegateInput>;
	if (!parsed.agentType || !parsed.task) {
		throw new Error("Delegate input requires agentType and task.");
	}
	return {
		agentType: parsed.agentType,
		task: parsed.task,
		context: parsed.context,
	};
}

function buildDelegatePrompt(
	agentType: string,
	task: string,
	context?: unknown,
): string {
	const contextBlock =
		context !== undefined
			? `Context:\n${JSON.stringify(context, null, 2)}`
			: "Context: (none)";
	return [
		`You are executing subtask: ${agentType}`,
		`Task: ${task}`,
		contextBlock,
		"",
		"Rules:",
		"- Use the tool catalog to inspect the repo when needed.",
		"- Output MUST be valid JSON only.",
		"- Call validate_json before final output.",
	].join("\n");
}

function buildDelegateProtocol(productId: Id<"products">): string {
	return [
		"You are a focused sub-agent.",
		"",
		"CRITICAL - Response format:",
		"- Tool calls: ONLY JSON, nothing else in the response",
		'  {"type":"tool_use","toolCalls":[...]}',
		"- Final output: ONLY JSON, no tool calls",
		'  {"type":"final","output":{...}}',
		"",
		"Tool inputs must include the productId when required.",
		`Use productId: ${productId}.`,
	].join("\n");
}

async function persistSubagentOutput(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
	result: AgentLoopResult,
): Promise<{ fileId: Id<"_storage">; sizeBytes: number } | null> {
	if (!result.output) return null;
	const payload = JSON.stringify(result.output);
	const sizeBytes = new TextEncoder().encode(payload).length;
	const fileId = await ctx.storage.store(
		new Blob([payload], { type: "application/json" }),
	);
	await ctx.runMutation(internal.agents.agentRuns.appendStep, {
		productId,
		runId,
		step: "Final output",
		status: result.status === "completed" ? "success" : "warn",
		metadata: {
			outputRef: {
				fileId,
				sizeBytes,
			},
			preview: payload.slice(0, 2000),
		},
	});
	return { fileId, sizeBytes };
}
