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
	createListFilesTool,
	createListDirsTool,
	createReadFileTool,
	createTodoManagerTool,
	createValidateJsonTool,
} from "./core/tools";
import { createToolPromptModel } from "./core/tool_prompt_model";
import { SKILL_CONTENTS } from "./skills";
import { getActiveGithubConnection } from "./core/tools/github_helpers";
import { validateDomainMap } from "./core/validators";

const AGENT_NAME = "Domain Map Agent";
const USE_CASE = "domain_map";
const PROMPT_VERSION = "v1.0";
const SKILL_NAME = "domain-map-agent";
const MAX_TURNS = 16;
const MAX_TOKENS_PER_TURN = 20000;
const MAX_TOTAL_TOKENS = 1_200_000;
const TIMEOUT_MS = 8 * 60 * 1000;

export const generateDomainMap = action({
	args: {
		productId: v.id("products"),
		snapshotId: v.optional(v.id("productContextSnapshots")),
		parentRunId: v.optional(v.id("agentRuns")),
		inputs: v.optional(
			v.object({
				baseline: v.optional(v.any()),
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
		domainMap: Record<string, unknown> | null;
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

		const aiConfig = getAgentAIConfig(AGENT_NAME);
		const telemetryConfig = getAgentTelemetryConfig(AGENT_NAME);
		const model = createToolPromptModel(createLLMAdapter(aiConfig), {
			protocol: buildToolProtocol(productId),
		});
		const skill = loadSkillFromRegistry(SKILL_NAME, SKILL_CONTENTS);
		const prompt = buildDomainMapPrompt(productId, {
			baseline: inputs?.baseline ?? product.baseline ?? {},
			repoStructure: inputs?.repoStructure ?? null,
			glossary: inputs?.glossary ?? null,
		});
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
			createValidateJsonTool(),
		];

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
					agentRuns: { domainMapper: runId },
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
				await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
					snapshotId,
					status: "failed",
					completedPhases: [],
					errors: [
						{
							phase: "domains",
							error: "No active GitHub connection for this product",
							timestamp: Date.now(),
						},
					],
				});
			}
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
				requireValidateJson: true,
				validateJsonReminder:
					"<reminder>Call validate_json with your final JSON (and ensure it returns valid:true) before submitting the final output.</reminder>",
				autoFinalizeOnValidateJson: true,
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
				validation: {
					validate: (output) => {
						if (!output || typeof output !== "object") {
							return { valid: false, errors: ["Invalid JSON output"], warnings: [] };
						}
						const result = validateDomainMap(output);
						return {
							valid: true,
							errors: [],
							warnings: [...result.errors, ...result.warnings],
						};
					},
					onValidation: async (result) => {
						await ctx.runMutation(internal.agents.agentRuns.appendStep, {
							productId,
							runId,
							step: "Validation: domain_map",
							status: result.warnings.length > 0 ? "warn" : "info",
							metadata: {
								validation: result,
							},
						});
					},
				},
			},
			prompt,
			messages,
		);

		const domainMap =
			result.status === "completed" && result.output
				? normalizeDomainMapOutput(result.output as Record<string, unknown>)
				: null;

		if (domainMap) {
			await ctx.runMutation(internal.agents.domainMapData.saveDomainMap, {
				productId,
				domainMap,
				snapshotId,
			});
			const serialized = JSON.stringify(domainMap, null, 2);
			const fileId = await ctx.storage.store(
				new Blob([serialized], { type: "application/json" }),
			);
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step: "Domain map saved",
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

		if (!requestedSnapshotId) {
			await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
				snapshotId,
				status: domainMap ? "partial" : "failed",
				completedPhases: domainMap ? ["domains"] : [],
				errors: domainMap
					? []
					: [
							{
								phase: "domains",
								error: result.errorMessage ?? "Domain map failed",
								timestamp: Date.now(),
							},
						],
			});
			await ctx.runMutation(internal.agents.productContextData.setCurrentProductSnapshot, {
				productId,
				snapshotId,
				updatedAt: Date.now(),
			});
		}

		return {
			runId,
			status: result.status,
			errorMessage: result.errorMessage,
			domainMap,
			metrics: result.metrics,
		};
	},
});

function buildDomainMapPrompt(
	productId: Id<"products">,
	inputs: {
		baseline: Record<string, unknown>;
		repoStructure: Record<string, unknown> | null;
		glossary: Record<string, unknown> | null;
	},
): string {
	const inputPayload = JSON.stringify(inputs, null, 2);
	return [
		"Analyze this codebase and identify the main product domains.",
		"",
		"INPUTS (use these first):",
		inputPayload,
		"",
		"Use glossary terms for consistent naming when applicable.",
		"If repoStructure.explorationPlan exists, prioritize those paths.",
		"",
		"A domain = a distinct area of functionality in the code.",
		"Look at: folder names, feature modules, page routes, main components.",
		"",
		"EXPLORATION STRATEGY (suggested, not mandatory):",
		"- Start broad with list_dirs (depth 2).",
		"- Identify product code areas (src/, domains/, routes/, components/, packages/).",
		"- Drill down with list_dirs(path, depth 2).",
		"- Use list_files to see files in a folder (non-recursive).",
		"- Read a few key files to validate each domain.",
		"",
		"IMPORTANT:",
		"- Start broad (list_dirs) then narrow down (list_files, read_file).",
		"- Do NOT read everything; be selective.",
		"- Do NOT delegate to other agents.",
		"- Incorporate repoStructure and glossary to refine domain naming and responsibilities.",
		"- Use ACTUAL folder/file names from the code as domain names.",
		"- Every domain must have real file path evidence.",
		"- Prefer code files over README-only evidence.",
		"- Each domain should include at least 2 evidence paths, with at least 1 non-README file.",
		"- Each domain must include at least one code file you actually read (.ts/.tsx).",
		"- Before writing output, derive domain candidates from src/domains (or similar) so none are missed.",
		"- When your plan is completed, your NEXT response must be: JSON candidate -> validate_json -> final JSON output.",
		"- If you feel stuck, regenerate the JSON candidate and validate it (do NOT return an empty response).",
		"",
		"OUTPUT:",
		"1) Discover domains (from structure + routes).",
		"2) Justify domains with evidence (files you read).",
		"Return the final JSON only after evidence is gathered.",
		"Use ONLY evidence from product_front and platform code (UI + backend services).",
		"Ignore marketing, admin, observability, CI/CD, tests, and config-only files.",
		"Always call todo_manager first to create your plan, and update it as you progress.",
		"Use list_dirs to explore structure, list_files to inspect folders, and read_file to gather evidence.",
		"Output MUST be valid JSON that matches this schema:",
		'{"domains":[{"name":"<string>","responsibility":"<string>","weight":0.0,"evidence":["path/one","path/two"]}],"summary":{"totalDomains":0,"warnings":[]}}',
		"Rules for JSON:",
		"- responsibility is a short sentence describing what the domain owns",
		"- weight is a number between 0 and 1",
		"- weights must sum to 1.0",
		"- summary.totalDomains equals domains.length",
		"Before final output, call validate_json with your JSON object (not a string).",
		"If parsing fails, fix the JSON and validate again.",
		"After JSON is valid, ensure it matches the schema above.",
		"You may include validate_json in the same tool_use response as todo_manager when finalizing.",
		"Tool input rules:",
		'- todo_manager input: { "items": [{ "content": "string", "activeForm": "string", "status": "pending|in_progress|completed|blocked", "evidence"?: "string|[string]", "checkpoint"?: "string" }] }',
		'- list_dirs input: { "path"?: "apps/webapp/src", "depth"?: 2, "limit"?: 50 }',
		'- list_files input: { "path"?: "apps/webapp/src", "pattern"?: "*.tsx", "limit"?: 50 }',
		'- read_file input: { "path": "path/to/file.tsx" }',
		'- validate_json input: { "json": { ... } }',
		"Do NOT use tasks or description fields in todo_manager.",
		"At most one todo_manager item may be in_progress (0 or 1).",
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
		"3. Call validate_json with your final JSON object (you may include todo_manager in the same tool_use response)",
		"4. THEN: Return your final output (JSON only, no tool calls)",
		"Never combine tool calls and final output in the same response.",
		"Only call tools listed in the tool catalog.",
		"Tool inputs must include the productId when required.",
		`Use productId: ${productId}.`,
	].join("\n");
}

function normalizeDomainMapOutput(
	output: Record<string, unknown>,
): Record<string, unknown> {
	if (!output || typeof output !== "object") return output;
	const rawDomains = Array.isArray((output as { domains?: unknown }).domains)
		? ((output as { domains: Array<Record<string, unknown>> }).domains ?? [])
		: [];
	if (!rawDomains.length) return output;

	const normalized = rawDomains
		.map((domain) => {
			const name =
				typeof domain.name === "string" ? domain.name.trim() : "";
			const responsibility =
				typeof domain.responsibility === "string"
					? domain.responsibility.trim()
					: "";
			const weight =
				typeof domain.weight === "number" && !Number.isNaN(domain.weight)
					? domain.weight
					: 0;
			const evidence = Array.isArray(domain.evidence)
				? domain.evidence.filter((item): item is string => typeof item === "string")
				: [];
			return {
				name,
				responsibility,
				weight,
				evidence,
			};
		})
		.filter((domain) => domain.name);

	if (!normalized.length) return output;

	const totalWeight = normalized.reduce((sum, domain) => sum + domain.weight, 0);
	let warnings = Array.isArray((output as { summary?: { warnings?: unknown } }).summary?.warnings)
		? (((output as { summary?: { warnings?: unknown } }).summary?.warnings ??
				[]) as string[])
		: [];

	let adjustedDomains = normalized;
	if (totalWeight > 0) {
		adjustedDomains = normalized.map((domain) => ({
			...domain,
			weight: Number((domain.weight / totalWeight).toFixed(4)),
		}));
		if (Math.abs(totalWeight - 1) > 0.01) {
			warnings = [
				...warnings,
				`Weights normalized to sum to 1 (was ${totalWeight.toFixed(2)}).`,
			];
		}
	} else {
		const evenWeight = Number((1 / normalized.length).toFixed(4));
		adjustedDomains = normalized.map((domain) => ({
			...domain,
			weight: evenWeight,
		}));
		warnings = [
			...warnings,
			"Weights were missing or zero; evenly distributed.",
		];
	}

	return {
		domains: adjustedDomains,
		summary: {
			totalDomains: adjustedDomains.length,
			warnings,
		},
	};
}
