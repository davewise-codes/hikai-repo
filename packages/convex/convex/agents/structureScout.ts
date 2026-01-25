import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getAgentAIConfig, getAgentTelemetryConfig } from "../ai";
import { createLLMAdapter } from "../ai/config";
import {
	executeAgentLoop,
	type AgentLoopStatus,
	type AgentMessage,
} from "./core/agent_loop";
import { persistToolSteps } from "./core/agent_run_steps";
import { injectSkill, loadSkillFromRegistry } from "./core/skill_loader";
import {
	createListDirsTool,
	createListFilesTool,
	createReadFileTool,
	createValidateJsonTool,
} from "./core/tools";
import { createToolPromptModel } from "./core/tool_prompt_model";
import { SKILL_CONTENTS } from "./skills";
import { getActiveGithubConnection } from "./core/tools/github_helpers";

const AGENT_NAME = "Structure Scout Agent";
const USE_CASE = "structure_scout";
const PROMPT_VERSION = "v1.0";
const SKILL_NAME = "structure-scout";
const MAX_TURNS = 10;
const MAX_TOKENS_PER_TURN = 30000;
const MAX_TOTAL_TOKENS = 400_000;
const TIMEOUT_MS = 5 * 60 * 1000;

export const generateStructureScout = action({
	args: {
		productId: v.id("products"),
	},
	handler: async (
		ctx,
		{ productId },
	): Promise<{
		runId: Id<"agentRuns">;
		status: AgentLoopStatus;
		structureScout: Record<string, unknown> | null;
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
		const prompt = buildStructureScoutPrompt(productId);
		const messages: AgentMessage[] = [
			injectSkill(skill),
			{ role: "user", content: prompt },
		];
		const tools = [
			createListDirsTool(ctx, productId),
			createListFilesTool(ctx, productId),
			createReadFileTool(ctx, productId),
			createValidateJsonTool(),
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
				structureScout: null,
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
				validation: {
					validate: (output) => validateStructureScout(output),
					onValidation: async (validation) => {
						await ctx.runMutation(internal.agents.agentRuns.appendStep, {
							productId,
							runId,
							step: "Validation: structure_scout",
							status: validation.valid ? "info" : "warn",
							metadata: {
								validation,
							},
						});
					},
				},
			},
			prompt,
			messages,
		);

		const structureScout =
			result.status === "completed" && result.output
				? (result.output as Record<string, unknown>)
				: null;

		if (structureScout) {
			await ctx.runMutation(internal.agents.structureScoutData.saveStructureScout, {
				productId,
				structureScout,
			});
			const serialized = JSON.stringify(structureScout, null, 2);
			const fileId = await ctx.storage.store(
				new Blob([serialized], { type: "application/json" }),
			);
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step: "Structure scout saved",
				status: "success",
				metadata: {
					preview: serialized.slice(0, 2000),
					outputRef: {
						fileId,
						sizeBytes: serialized.length,
					},
				},
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
				metadata: { source: "structure-scout" },
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
			response: result.rawText ?? result.text,
			metadata: { source: "structure-scout" },
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
			structureScout,
			metrics: result.metrics,
		};
	},
});

function buildStructureScoutPrompt(productId: Id<"products">): string {
	return [
		"Analyze the repository structure and produce a structure scout report.",
		"",
		"Focus on:",
		"- repoShape (monorepo, single-app, microservices, hybrid)",
		"- techStack (language, framework, runtime, buildTool)",
		"- tiles (major product/infra/docs areas)",
		"- entryPoints (routers, handlers, registries)",
		"- configFiles (root + notable)",
		"- explorationPlan (next paths to inspect)",
		"- confidence (0-100) and limitations",
		"",
		"Rules:",
		"- Use list_dirs first (depth 2).",
		"- Max 10 read_file calls total.",
		"- Do NOT infer domains or business meaning.",
		"- Use only real paths from the repo.",
		"- Output valid JSON only, no markdown.",
		"",
		"Output schema:",
		'{"repoShape":"monorepo","techStack":{"language":"typescript","framework":"react","runtime":"node","buildTool":"pnpm"},"tiles":[],"entryPoints":[],"configFiles":{"root":[],"notable":[]},"explorationPlan":[],"confidence":0,"limitations":[]}',
		"",
		"Tool input rules:",
		'- list_dirs input: { "path"?: "apps/webapp/src", "depth"?: 2, "limit"?: 50 }',
		'- list_files input: { "path"?: "apps/webapp/src", "pattern"?: "*.ts", "limit"?: 50 }',
		'- read_file input: { "path": "path/to/file.tsx" }',
		'- validate_json input: { "json": { ... } }',
		`Use productId: ${productId} when calling tools.`,
	].join("\n");
}

function buildToolProtocol(productId: Id<"products">): string {
	return [
		"You are an autonomous agent.",
		"",
		"CRITICAL - Response format:",
		"- Tool calls: ONLY JSON, nothing else in the response",
		'  {"type":"tool_use","toolCalls":[...]}',
		"- Final output: ONLY JSON, no tool calls",
		'  {"type":"final","output":{...}}',
		"",
		"CRITICAL - Finishing sequence:",
		"1. Call validate_json with your final JSON object",
		"2. Then return your final output (JSON only, no tool calls)",
		"Never combine tool calls and final output in the same response.",
		`Use productId: ${productId}.`,
	].join("\n");
}

function validateStructureScout(output: unknown): {
	valid: boolean;
	errors: string[];
	warnings: string[];
} {
	if (!output || typeof output !== "object") {
		return { valid: false, errors: ["Output must be an object"], warnings: [] };
	}
	const record = output as Record<string, unknown>;
	const errors: string[] = [];

	if (typeof record.repoShape !== "string") {
		errors.push("repoShape must be a string");
	}
	if (!record.techStack || typeof record.techStack !== "object") {
		errors.push("techStack must be an object");
	}
	if (!Array.isArray(record.tiles)) {
		errors.push("tiles must be an array");
	}
	if (!Array.isArray(record.entryPoints)) {
		errors.push("entryPoints must be an array");
	}
	if (!record.configFiles || typeof record.configFiles !== "object") {
		errors.push("configFiles must be an object");
	}
	if (!Array.isArray(record.explorationPlan)) {
		errors.push("explorationPlan must be an array");
	}
	if (typeof record.confidence !== "number") {
		errors.push("confidence must be a number");
	}
	if (!Array.isArray(record.limitations)) {
		errors.push("limitations must be an array");
	}

	return { valid: errors.length === 0, errors, warnings: [] };
}
