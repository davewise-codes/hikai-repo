import { v } from "convex/values";
import { action } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getAgentAIConfig } from "../ai";
import { createLLMAdapter } from "../ai/config";
import {
	executeAgentLoop,
	type AgentLoopResult,
	type AgentMessage,
} from "./core/agent_loop";
import { createToolPromptModel } from "./core/tool_prompt_model";
import {
	createListDirsTool,
	createListFilesTool,
	createReadFileTool,
	createGrepFileTool,
} from "./core/tools";
import { persistCompactionStep, persistToolSteps } from "./core/agent_run_steps";
import { validateFeatureScoutOutput, type FeatureScoutOutput } from "./featureScoutValidator";
import {
	parseFeatureDomainScoutOutput,
	validateFeatureDomainScoutOutput,
	type FeatureDomainScoutOutput,
} from "./featureDomainScoutValidator.ts";
import { featureDomainScoutPrompt } from "../ai/prompts/featureDomainScout.ts";

const AGENT_NAME = "Feature Scout Agent";
const DOMAIN_AGENT_NAME = "Feature Domain Scout";
const USE_CASE = "feature_scout";
const DOMAIN_USE_CASE = "feature_scout_domain";
const MAX_DURATION_MS = 8 * 60 * 1000;

const CONCURRENCY_LIMIT = 3;

export type RepoDomainInput = {
	name: string;
	purpose?: string;
	capabilities?: string[];
	pathPatterns?: string[];
	schemaEntities?: string[];
};

type FeatureScoutResult = {
	status: "completed" | "failed";
	features: FeatureScoutOutput | null;
	errorMessage?: string;
	metrics?: AgentLoopResult["metrics"];
};

type DomainScoutResult = {
	status: "completed" | "failed";
	domain: string;
	output: FeatureDomainScoutOutput | null;
	errorMessage?: string;
	metrics?: AgentLoopResult["metrics"];
};

export const generateFeatureScoutFromContext = action({
	args: {
		productId: v.id("products"),
		snapshotId: v.optional(v.id("productContextSnapshots")),
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
		{ productId, snapshotId: requestedSnapshotId },
	): Promise<{
		runId: Id<"agentRuns">;
		status: "completed" | "failed";
		errorMessage?: string;
		metrics?: AgentLoopResult["metrics"];
	}> => {
		const { product } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);

		const { runId } = await ctx.runMutation(api.agents.agentRuns.createAgentRun, {
			productId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
		});

		let snapshotId: Id<"productContextSnapshots"> | null =
			requestedSnapshotId ?? product.currentProductSnapshot ?? null;
		try {
			if (!snapshotId) {
				await ctx.runMutation(internal.agents.agentRuns.appendStep, {
					productId,
					runId,
					step: "Feature scout: snapshot lookup",
					status: "error",
					metadata: { error: "Missing context snapshot" },
				});
				await ctx.runMutation(internal.agents.agentRuns.finishRun, {
					productId,
					runId,
					status: "error",
					errorMessage: "Missing context snapshot",
				});
				return {
					runId,
					status: "failed",
					errorMessage: "Missing context snapshot",
				};
			}

			const snapshot = await ctx.runQuery(
				internal.agents.productContextData.getContextSnapshotById,
				{ snapshotId },
			);
			const repoDomains = (snapshot?.contextDetail as { domains?: unknown })
				?.domains as RepoDomainInput[] | undefined;

			if (!repoDomains || repoDomains.length === 0) {
				await ctx.runMutation(internal.agents.agentRuns.appendStep, {
					productId,
					runId,
					step: "Feature scout: domain context",
					status: "error",
					metadata: { error: "Missing repo domains in context snapshot" },
				});
				await ctx.runMutation(internal.agents.agentRuns.finishRun, {
					productId,
					runId,
					status: "error",
					errorMessage: "Missing repo domains in context snapshot",
				});
				return {
					runId,
					status: "failed",
					errorMessage: "Missing repo domains in context snapshot",
				};
			}

			await ctx.runMutation(
				internal.agents.productContextData.updateContextSnapshot,
				{
					snapshotId,
					agentRuns: { featureScout: runId },
					status: snapshot?.status === "failed" ? "failed" : "in_progress",
					completedPhases: snapshot?.completedPhases ?? [],
					errors: [],
				},
			);

			const result = await runFeatureScoutAgent({
				ctx,
				productId,
				runId,
				repoDomains,
			});

			if (result.status !== "completed" || !result.features) {
				await ctx.runMutation(internal.agents.agentRuns.finishRun, {
					productId,
					runId,
					status: "error",
					errorMessage:
						result.errorMessage ??
						"Feature scout failed to produce output",
				});
				await ctx.runMutation(
					internal.agents.productContextData.updateContextSnapshot,
					{
						snapshotId,
						status: "partial",
						errors: [
							{
								phase: "features",
								error:
									result.errorMessage ??
									"Feature scout failed to produce output",
								timestamp: Date.now(),
							},
						],
					},
				);
				return {
					runId,
					status: "failed",
					errorMessage:
						result.errorMessage ??
						"Feature scout failed to produce output",
					metrics: result.metrics,
				};
			}

			const sanitizedFeatures = result.features.features.map((feature) => ({
				slug: feature.slug,
				name: feature.name,
				description: feature.description,
				domain: feature.domain,
				visibility: feature.visibility,
			}));

			await ctx.runMutation(internal.products.features.upsertProductFeatures, {
				productId,
				features: sanitizedFeatures,
			});

			await ctx.runMutation(
				internal.agents.productContextData.updateContextSnapshot,
				{
					snapshotId,
					features: result.features,
					status: snapshot?.status === "failed" ? "failed" : "completed",
					completedPhases: Array.from(
						new Set([...(snapshot?.completedPhases ?? []), "features"]),
					),
					errors: [],
				},
			);

			await ctx.runMutation(internal.agents.agentRuns.finishRun, {
				productId,
				runId,
				status: "success",
			});

			return {
				runId,
				status: "completed",
				metrics: result.metrics,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step: "Feature scout: runtime error",
				status: "error",
				metadata: { error: message },
			});
			await ctx.runMutation(internal.agents.agentRuns.finishRun, {
				productId,
				runId,
				status: "error",
				errorMessage: message,
			});
			if (snapshotId) {
				await ctx.runMutation(
					internal.agents.productContextData.updateContextSnapshot,
					{
						snapshotId,
						status: "partial",
						errors: [
							{
								phase: "features",
								error: message,
								timestamp: Date.now(),
							},
						],
					},
				);
			}
			return {
				runId,
				status: "failed",
				errorMessage: message,
			};
		}
	},
});

export async function runFeatureScoutAgent(params: {
	ctx: ActionCtx;
	productId: Id<"products">;
	runId: Id<"agentRuns">;
	repoDomains: RepoDomainInput[];
}): Promise<FeatureScoutResult> {
	const { ctx, productId, runId, repoDomains } = params;
	await ctx.runMutation(internal.agents.agentRuns.appendStep, {
		productId,
		runId,
		step: `Feature scout: ${repoDomains.length} domain scouts`,
		status: "info",
	});

	const domainResults = await runWithConcurrency(
		repoDomains,
		CONCURRENCY_LIMIT,
		async (domain) =>
			await runFeatureDomainScoutAgent({
				ctx,
				productId,
				parentRunId: runId,
				domain,
			}),
	);

	const allFeatures: FeatureScoutOutput["features"] = [];
	const filesRead = new Set<string>();
	const domainsExplored: string[] = [];
	const limitations: string[] = [];
	const capabilityCoverage: FeatureScoutOutput["meta"]["capabilityCoverage"] =
		{};

	for (const [index, result] of domainResults.entries()) {
		const domainName = repoDomains[index]?.name ?? result.domain;
		if (result.status === "completed" && result.output) {
			domainsExplored.push(domainName);
			result.output.features.forEach((feature) => {
				allFeatures.push({
					...feature,
					domain: domainName,
				});
			});
			result.output.meta.filesExplored.forEach((path) => filesRead.add(path));
			capabilityCoverage[domainName] = result.output.meta.capabilityCoverage;
			limitations.push(...result.output.meta.limitations);
		} else {
			limitations.push(
				`Domain "${domainName}" scout failed${
					result.errorMessage ? `: ${result.errorMessage}` : ""
				}`,
			);
		}
	}

	const merged: FeatureScoutOutput = {
		features: allFeatures,
		meta: {
			filesRead: Array.from(filesRead),
			domainsExplored,
			expectedDomains: repoDomains.length,
			capabilityCoverage,
			limitations,
		},
	};

	const validation = validateFeatureScoutOutput(merged);
	if (!validation.valid) {
		return {
			status: "failed",
			features: null,
			errorMessage: validation.errors.join("; "),
		};
	}

	return {
		status: "completed",
		features: validation.value,
	};
}

async function runFeatureDomainScoutAgent(params: {
	ctx: ActionCtx;
	productId: Id<"products">;
	parentRunId: Id<"agentRuns">;
	domain: RepoDomainInput;
}): Promise<DomainScoutResult> {
	const { ctx, productId, parentRunId, domain } = params;
	const { runId } = await ctx.runMutation(api.agents.agentRuns.createAgentRun, {
		productId,
		useCase: DOMAIN_USE_CASE,
		agentName: DOMAIN_AGENT_NAME,
		parentRunId,
	});

	await ctx.runMutation(internal.agents.agentRuns.appendStep, {
		productId,
		runId,
		step: `Domain scout: ${domain.name}`,
		status: "info",
	});

	if (!domain.pathPatterns || domain.pathPatterns.length === 0) {
		const output: FeatureDomainScoutOutput = {
			domain: domain.name,
			features: [],
			meta: {
				filesExplored: [],
				capabilityCoverage: {
					total: domain.capabilities?.length ?? 0,
					covered: 0,
					uncovered:
						domain.capabilities?.map((cap) => `${cap} (no paths)`) ?? [],
				},
				limitations: ["No pathPatterns provided for this domain"],
			},
		};
		await ctx.runMutation(internal.agents.agentRuns.finishRun, {
			productId,
			runId,
			status: "success",
		});
		return { status: "completed", domain: domain.name, output };
	}

	const aiConfig = getAgentAIConfig(DOMAIN_AGENT_NAME);
	const model = createToolPromptModel(createLLMAdapter(aiConfig), {
		protocol: buildToolProtocol(productId),
	});
	const tools = [
		createListDirsTool(ctx, productId),
		createListFilesTool(ctx, productId),
		createReadFileTool(ctx, productId),
		createGrepFileTool(ctx, productId),
	];

	const prompt = featureDomainScoutPrompt({ domain });
	const startedAt = Date.now();
	let lastResult: AgentLoopResult | null = null;
	let feedback: string | null = null;
	let attempt = 0;
	const MAX_ATTEMPTS = 2;

	while (Date.now() - startedAt < MAX_DURATION_MS && attempt < MAX_ATTEMPTS) {
		attempt += 1;
		await ctx.runMutation(internal.agents.agentRuns.appendStep, {
			productId,
			runId,
			step: `Domain scout attempt ${attempt}`,
			status: "info",
			metadata: { hasFeedback: Boolean(feedback) },
		});

		const messages: AgentMessage[] = [{ role: "user", content: prompt }];
		if (feedback) {
			messages.push({ role: "user", content: feedback });
		}

		const result = await executeAgentLoop(
			model,
			{
				maxTurns: 12,
				maxTokens: 4000,
				maxTotalTokens: 200_000,
				timeoutMs: 180_000,
				timeWarning: {
					thresholdRatio: 0.75,
					message:
						"IMPORTANTE: queda poco tiempo. Produce el JSON ahora con lo que tengas.",
				},
				compaction: { enabled: false },
				tools,
				sampling: { temperature: 0 },
				shouldAbort: async () => {
					const run = await ctx.runQuery(api.agents.agentRuns.getRunById, {
						productId,
						runId,
					});
					return (
						run?.status === "error" && run.errorMessage === "Cancelled by user"
					);
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

		lastResult = result;
		await recordBudget(ctx, productId, runId, result);
		const rawText = result.rawText ?? result.text ?? "";
		const parsed =
			result.output && typeof result.output === "object"
				? { value: result.output as unknown }
				: parseFeatureDomainScoutOutput(rawText);
		if (!parsed.value) {
			feedback = buildFeedback([
				parsed.error ?? "Output must be valid JSON matching the schema.",
			]);
			await recordValidationFailure(ctx, productId, runId, feedback);
			continue;
		}

		const validation = validateFeatureDomainScoutOutput(parsed.value, domain.name);
		if (!validation.valid || !validation.value) {
			feedback = buildFeedback(validation.errors);
			await recordValidationFailure(ctx, productId, runId, feedback);
			continue;
		}

		await ctx.runMutation(internal.agents.agentRuns.finishRun, {
			productId,
			runId,
			status: "success",
		});

		return {
			status: "completed",
			domain: domain.name,
			output: validation.value,
			metrics: result.metrics,
		};
	}

	await ctx.runMutation(internal.agents.agentRuns.finishRun, {
		productId,
		runId,
		status: "error",
		errorMessage:
			lastResult?.errorMessage ??
			"Feature domain scout exceeded maximum duration",
	});

	return {
		status: "failed",
		domain: domain.name,
		output: null,
		errorMessage:
			lastResult?.errorMessage ??
			"Feature domain scout exceeded maximum duration",
		metrics: lastResult?.metrics,
	};
}

async function runWithConcurrency<T, R>(
	items: T[],
	limit: number,
	worker: (item: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let currentIndex = 0;

	const runners = new Array(Math.min(limit, items.length))
		.fill(null)
		.map(async () => {
			while (true) {
				const index = currentIndex;
				currentIndex += 1;
				if (index >= items.length) break;
				results[index] = await worker(items[index]);
			}
		});

	await Promise.all(runners);
	return results;
}

function buildToolProtocol(productId: Id<"products">): string {
	return [
		"Eres un agente autónomo.",
		"",
		"Reglas:",
		"- Usa SOLO list_dirs, list_files, read_file, grep_file",
		"- No uses otros tools",
		"- Responde SOLO con JSON cuando termines",
		`Use productId: ${productId} when calling tools.`,
	].join("\n");
}

function buildFeedback(errors: string[]): string {
	return [
		"Tu output no pasó validación. Corrige y devuelve SOLO el JSON requerido.",
		"Errores:",
		...errors.map((error) => `- ${error}`),
	].join("\n");
}

async function recordValidationFailure(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
	feedback: string,
) {
	await ctx.runMutation(internal.agents.agentRuns.appendStep, {
		productId,
		runId,
		step: "Feature scout validation failed",
		status: "warn",
		metadata: {
			feedbackPreview: feedback.slice(0, 2000),
		},
	});
}

async function recordBudget(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
	result: AgentLoopResult,
) {
	await ctx.runMutation(internal.agents.agentRuns.appendStep, {
		productId,
		runId,
		step: "Budget",
		status: "info",
		metadata: {
			maxTotalTokens: result.metrics?.maxTotalTokens,
			maxTurns: result.metrics?.maxTurns,
			status: result.metrics?.status,
			tokensIn: result.metrics?.tokensIn,
			tokensOut: result.metrics?.tokensOut,
			totalTokens: result.metrics?.totalTokens,
			turns: result.metrics?.turns,
		},
	});
}
