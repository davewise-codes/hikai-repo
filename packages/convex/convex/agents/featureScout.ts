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
import { persistCompactionStep, persistToolSteps } from "./core/agent_run_steps";
import { injectSkill, loadSkillFromRegistry } from "./core/skill_loader";
import {
	createListDirsTool,
	createListFilesTool,
	createReadFileTool,
	createTodoManagerTool,
	createValidateJsonTool,
} from "./core/tools";
import { createToolPromptModel } from "./core/tool_prompt_model";
import { SKILL_CONTENTS } from "./skills";
import { getActiveGithubConnection } from "./core/tools/github_helpers";

const AGENT_NAME = "Feature Scout Agent";
const USE_CASE = "feature_scout";
const PROMPT_VERSION = "v1.0";
const SKILL_NAME = "feature-scout";
const MAX_TURNS = 16;
const MAX_TOKENS_PER_TURN = 20000;
const MAX_TOTAL_TOKENS = 600_000;
const TIMEOUT_MS = 6 * 60 * 1000;

export const generateFeatureScout = action({
	args: {
		productId: v.id("products"),
		snapshotId: v.optional(v.id("productContextSnapshots")),
		parentRunId: v.optional(v.id("agentRuns")),
		inputs: v.optional(
			v.object({
				domainMap: v.optional(v.any()),
				repoStructure: v.optional(v.any()),
				glossary: v.optional(v.any()),
			}),
		),
		triggerReason: v.optional(
			v.union(
				v.literal("initial_setup"),
				v.literal("source_change"),
				v.literal("manual_refresh"),
			),
		),
	},
	handler: async (
		ctx,
		{ productId, snapshotId: requestedSnapshotId, parentRunId, inputs, triggerReason },
	): Promise<{
		runId: Id<"agentRuns">;
		status: AgentLoopStatus;
		errorMessage?: string;
		features: Record<string, unknown> | null;
		metrics: {
			turns: number;
			tokensIn: number;
			tokensOut: number;
			totalTokens: number;
			latencyMs: number;
		};
	}> => {
		const { organizationId, userId, product } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);

		const { runId } = await ctx.runMutation(api.agents.agentRuns.createAgentRun, {
			productId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
			parentRunId,
		});

		const createdAt = Date.now();
		const { snapshotId } = requestedSnapshotId
			? { snapshotId: requestedSnapshotId }
			: await ctx.runMutation(internal.agents.productContextData.createContextSnapshot, {
					productId,
					createdAt,
					generatedBy: "manual",
					triggerReason: triggerReason ?? "manual_refresh",
					status: "in_progress",
					completedPhases: [],
					errors: [],
					agentRuns: { featureScout: runId },
				});

		const snapshot = requestedSnapshotId
			? await ctx.runQuery(internal.agents.productContextData.getContextSnapshotById, {
					snapshotId,
				})
			: product.currentProductSnapshot
				? await ctx.runQuery(
						internal.agents.productContextData.getContextSnapshotById,
						{ snapshotId: product.currentProductSnapshot },
					)
				: null;

		const domainMap = inputs?.domainMap ?? snapshot?.domainMap ?? null;
		if (!domainMap) {
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step: "Domain map",
				status: "error",
				metadata: {
					error: "Missing domain map input",
				},
			});
			await ctx.runMutation(internal.agents.agentRuns.finishRun, {
				productId,
				runId,
				status: "error",
				errorMessage: "Missing domain map input",
			});
			if (!requestedSnapshotId) {
				await ctx.runMutation(
					internal.agents.productContextData.updateContextSnapshot,
					{
						snapshotId,
						status: "failed",
						completedPhases: [],
						errors: [
							{
								phase: "features",
								error: "Missing domain map input",
								timestamp: Date.now(),
							},
						],
					},
				);
			}
			return {
				runId,
				status: "error",
				features: null,
				metrics: {
					turns: 0,
					tokensIn: 0,
					tokensOut: 0,
					totalTokens: 0,
					latencyMs: 0,
				},
			};
		}

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
			if (!requestedSnapshotId) {
				await ctx.runMutation(
					internal.agents.productContextData.updateContextSnapshot,
					{
						snapshotId,
						status: "failed",
						completedPhases: [],
						errors: [
							{
								phase: "features",
								error: "No active GitHub connection for this product",
								timestamp: Date.now(),
							},
						],
					},
				);
			}
			return {
				runId,
				status: "error",
				features: null,
				metrics: {
					turns: 0,
					tokensIn: 0,
					tokensOut: 0,
					totalTokens: 0,
					latencyMs: 0,
				},
			};
		}

		const aiConfig = getAgentAIConfig(AGENT_NAME);
		const telemetryConfig = getAgentTelemetryConfig(AGENT_NAME);
		const model = createToolPromptModel(createLLMAdapter(aiConfig), {
			protocol: buildToolProtocol(productId),
		});
		const skill = loadSkillFromRegistry(SKILL_NAME, SKILL_CONTENTS);
		const prompt = buildFeaturePrompt({
			productId,
			domainMap,
			repoStructure: inputs?.repoStructure ?? snapshot?.repoStructure ?? null,
			glossary: inputs?.glossary ?? snapshot?.glossary ?? null,
		});
		const messages: AgentMessage[] = [
			injectSkill(skill),
			{ role: "user", content: prompt },
		];
		const tools = [
			createTodoManagerTool(ctx, productId, runId),
			createListDirsTool(ctx, productId),
			createListFilesTool(ctx, productId),
			createReadFileTool(ctx, productId),
			createValidateJsonTool(),
		];

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
				onCompaction: async (step) => {
					await persistCompactionStep(ctx, productId, runId, step);
				},
			},
			prompt,
			messages,
		);

		const features =
			result.status === "completed" && result.output
				? normalizeFeatureOutput(result.output as Record<string, unknown>)
				: null;

		if (features) {
			await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
				snapshotId,
				features,
			});
			const serialized = JSON.stringify(features, null, 2);
			const fileId = await ctx.storage.store(
				new Blob([serialized], { type: "application/json" }),
			);
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step: "Features saved",
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
				metadata: { source: "feature-scout" },
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
			metadata: { source: "feature-scout" },
		});

		const finalStatus = result.status === "completed" ? "success" : "error";
		await ctx.runMutation(internal.agents.agentRuns.finishRun, {
			productId,
			runId,
			status: finalStatus,
			errorMessage: result.errorMessage,
		});

		if (!requestedSnapshotId) {
			await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
				snapshotId,
				status: features ? "partial" : "failed",
				completedPhases: features ? ["features"] : [],
				errors: features
					? []
					: [
							{
								phase: "features",
								error: result.errorMessage ?? "Feature scout failed",
								timestamp: Date.now(),
							},
						],
			});
			await ctx.runMutation(
				internal.agents.productContextData.setCurrentProductSnapshot,
				{
					productId,
					snapshotId,
					updatedAt: Date.now(),
				},
			);
		}

		return {
			runId,
			status: result.status,
			errorMessage: result.errorMessage,
			features,
			metrics: result.metrics,
		};
	},
});

function buildFeaturePrompt({
	productId,
	domainMap,
	repoStructure,
	glossary,
}: {
	productId: Id<"products">;
	domainMap: Record<string, unknown>;
	repoStructure: Record<string, unknown> | null;
	glossary: Record<string, unknown> | null;
}): string {
	const payload = JSON.stringify({ domainMap, repoStructure, glossary }, null, 2);
	return [
		"Extract product features and link them to domains with evidence.",
		"",
		"INPUTS:",
		payload,
		"",
		"Strategy:",
		"- For each domain, find user-facing routes and components.",
		"- Prefer stable names from UI labels and glossary terms.",
		"- Include evidence for each feature.",
		"",
		"Output MUST match this schema:",
		'{"features":[{"id":"string","name":"string","domain":"string","description":"string","visibility":"public|internal","confidence":0.0,"evidence":[{"type":"route|component|api|docs","path":"string","excerpt":"string"}]}],"generatedAt":0}',
		"",
		"Before final output, call validate_json with your JSON object.",
		"Tool input rules:",
		'- todo_manager input: { "items": [{ "content": "string", "activeForm": "string", "status": "pending|in_progress|completed|blocked", "evidence"?: "string|[string]", "checkpoint"?: "string" }] }',
		'- list_dirs input: { "path"?: "", "depth"?: 2, "limit"?: 50 }',
		'- list_files input: { "path"?: "", "pattern"?: "*.tsx", "limit"?: 50 }',
		'- read_file input: { "path": "path/to/file" }',
		'- validate_json input: { "json": { ... } }',
		"Do NOT use tasks or description fields in todo_manager.",
		"At most one todo_manager item may be in_progress (0 or 1).",
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
		'- todo_manager input must use "items" (no tasks/description fields)',
		"",
		"CRITICAL - Response format:",
		"- Tool calls: ONLY JSON, nothing else in the response",
		'  {"type":"tool_use","toolCalls":[...]}',
		"- Final output: ONLY JSON, no tool calls",
		'  {"type":"final","output":{...}}',
		"",
		"CRITICAL - Finishing sequence:",
		"1. FIRST: Call todo_manager to mark ALL items as completed",
		"2. WAIT for the tool result",
		"3. Call validate_json with your final JSON object",
		"4. THEN: Return your final output (JSON only, no tool calls)",
		"Never combine tool calls and final output in the same response.",
		"Only call tools listed in the tool catalog.",
		"Tool inputs must include the productId when required.",
		`Use productId: ${productId}.`,
	].join("\n");
}

function normalizeFeatureOutput(output: Record<string, unknown>) {
	if (!output || typeof output !== "object") return output;
	const generatedAt =
		typeof (output as { generatedAt?: unknown }).generatedAt === "number"
			? (output as { generatedAt: number }).generatedAt
			: Date.now();
	return {
		...output,
		generatedAt,
	};
}
