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
	createTodoManagerTool,
	createValidateJsonTool,
} from "./core/tools";
import { createToolPromptModel } from "./core/tool_prompt_model";
import { SKILL_CONTENTS } from "./skills";
import { getActiveGithubConnection } from "./core/tools/github_helpers";
import { extractJsonPayload } from "./core/json_utils";

const AGENT_NAME = "Glossary Scout Agent";
const USE_CASE = "glossary_scout";
const PROMPT_VERSION = "v1.0";
const SKILL_NAME = "glossary-scout";
const MAX_TURNS = 16;
const MAX_TOKENS_PER_TURN = 20000;
const MAX_TOTAL_TOKENS = 300_000;
const TIMEOUT_MS = 5 * 60 * 1000;

export const generateGlossaryScout = action({
	args: {
		productId: v.id("products"),
		snapshotId: v.optional(v.id("productContextSnapshots")),
		parentRunId: v.optional(v.id("agentRuns")),
		inputs: v.optional(
			v.object({
				repoStructure: v.optional(v.any()),
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
		{
			productId,
			snapshotId: requestedSnapshotId,
			parentRunId,
			inputs,
			triggerReason,
		},
	): Promise<{
		runId: Id<"agentRuns">;
		status: AgentLoopStatus;
		errorMessage?: string;
		glossary: Record<string, unknown> | null;
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
					agentRuns: { glossaryScout: runId },
				});

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
								phase: "glossary",
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
				glossary: null,
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
		const prompt = buildGlossaryPrompt({
			productId,
			baseline: product.baseline ?? {},
			repos: githubConnection.repos.map((repo) => repo.fullName),
			repoStructure: inputs?.repoStructure ?? null,
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
			},
			prompt,
			messages,
		);

		let glossary =
			result.output && typeof result.output === "object"
				? normalizeGlossaryOutput(result.output as Record<string, unknown>)
				: null;
		if (!glossary && result.rawText) {
			const extracted = extractJsonPayload(result.rawText);
			const candidate = extracted?.data;
			const candidateOutput =
				candidate &&
				typeof candidate === "object" &&
				"output" in candidate
					? (candidate as { output: unknown }).output
					: candidate;
			if (
				candidateOutput &&
				typeof candidateOutput === "object" &&
				Array.isArray((candidateOutput as { terms?: unknown }).terms)
			) {
				glossary = normalizeGlossaryOutput(
					candidateOutput as Record<string, unknown>,
				);
				await ctx.runMutation(internal.agents.agentRuns.appendStep, {
					productId,
					runId,
					step: "Recovered output (no validate_json)",
					status: "warn",
				});
			}
		}

		if (glossary) {
			await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
				snapshotId,
				glossary,
			});
			const serialized = JSON.stringify(glossary, null, 2);
			const fileId = await ctx.storage.store(
				new Blob([serialized], { type: "application/json" }),
			);
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step: "Glossary saved",
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
				metadata: { source: "glossary-scout" },
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
			metadata: { source: "glossary-scout" },
		});

		const finalStatus = glossary ? "success" : "error";
		await ctx.runMutation(internal.agents.agentRuns.finishRun, {
			productId,
			runId,
			status: finalStatus,
			errorMessage: glossary ? undefined : result.errorMessage,
		});

		if (!requestedSnapshotId) {
			await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
				snapshotId,
				status: glossary ? "partial" : "failed",
				completedPhases: glossary ? ["glossary"] : [],
				errors: glossary
					? []
					: [
							{
								phase: "glossary",
								error: result.errorMessage ?? "Glossary scout failed",
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
			glossary,
			metrics: result.metrics,
		};
	},
});

function buildGlossaryPrompt({
	productId,
	baseline,
	repos,
	repoStructure,
}: {
	productId: Id<"products">;
	baseline: Record<string, unknown>;
	repos: string[];
	repoStructure: Record<string, unknown> | null;
}): string {
	const payload = JSON.stringify({ baseline, repos, repoStructure }, null, 2);
	return [
		"Extract a glossary of product terms with evidence from this codebase.",
		"",
		"INPUTS:",
		payload,
		"",
		"Strategy:",
		"- Start from baseline to seed terms.",
		"- Scan docs/README and UI-facing code for terminology.",
		"- Prefer stable names used in routes, components, or user copy.",
		"- Add conflicts only when two terms describe the same concept.",
		"",
		"Output MUST match this schema:",
		'{"terms":[{"term":"string","definition":"string","sources":[{"type":"baseline|code|docs|marketing","path":"string","excerpt":"string"}],"confidence":0.0}],"conflicts":[{"terms":["string"],"resolution":"string","rationale":"string"}],"generatedAt":0}',
		"",
		"Before final output, call validate_json with your JSON object.",
		"Tool input rules:",
		'- list_dirs input: { "path"?: "", "depth"?: 2, "limit"?: 50 }',
		'- list_files input: { "path"?: "", "pattern"?: "*.md", "limit"?: 50 }',
		'- read_file input: { "path": "path/to/file" }',
		'- validate_json input: { "json": { ... } }',
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

function normalizeGlossaryOutput(output: Record<string, unknown>) {
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
