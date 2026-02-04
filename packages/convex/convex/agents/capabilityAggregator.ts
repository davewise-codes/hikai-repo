import { v } from "convex/values";
import { action } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getAgentAIConfig, getAgentTelemetryConfig } from "../ai";
import { createLLMAdapter } from "../ai/config";
import {
	executeAgentLoop,
	type AgentLoopResult,
	type AgentMessage,
} from "./core/agent_loop";
import { createToolPromptModel } from "./core/tool_prompt_model";
import { createValidateJsonTool } from "./core/tools";
import {
	CAPABILITY_AGGREGATOR_PROMPT_VERSION,
	capabilityAggregatorPrompt,
} from "../ai/prompts/capabilityAggregator";

const AGENT_NAME = "Capability Aggregator Agent";
const USE_CASE = "capability_aggregator";

type CapabilityOutput = {
	slug: string;
	name: string;
	description?: string;
	domain?: string;
	visibility: "public" | "internal";
	featureSlugs: string[];
};

type CapabilityAggregationResult = {
	capabilities: CapabilityOutput[];
};

export const generateCapabilitiesFromFeatures = action({
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
	}> => {
		const { organizationId, userId, product } = await ctx.runQuery(
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
				await appendErrorStep(ctx, productId, runId, "Missing context snapshot");
				await finishRunError(ctx, productId, runId, "Missing context snapshot");
				return { runId, status: "failed", errorMessage: "Missing context snapshot" };
			}

			const snapshot = await ctx.runQuery(
				internal.agents.productContextData.getContextSnapshotById,
				{ snapshotId },
			);
			const domains = Array.isArray((snapshot?.contextDetail as any)?.domains)
				? ((snapshot?.contextDetail as any).domains as Array<Record<string, unknown>>)
				: [];
			const baseline = snapshot?.baseline ?? product.baseline ?? null;
			const languagePreference = product.languagePreference ?? "en";

			const features = await ctx.runQuery(
				internal.products.features.listProductFeaturesInternal,
				{ productId },
			);

			if (!features || features.length === 0) {
				await appendErrorStep(ctx, productId, runId, "Missing product features");
				await finishRunError(ctx, productId, runId, "Missing product features");
				return {
					runId,
					status: "failed",
					errorMessage: "Missing product features",
				};
			}

			await ctx.runMutation(
				internal.agents.productContextData.updateContextSnapshot,
				{
					snapshotId,
					agentRuns: { capabilityAggregator: runId },
					status: snapshot?.status === "failed" ? "failed" : "in_progress",
					completedPhases: snapshot?.completedPhases ?? [],
					errors: [],
				},
			);

			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step: "Loading features",
				status: "info",
				metadata: { count: features.length },
			});

			const aiConfig = getAgentAIConfig(AGENT_NAME);
			const telemetryConfig = getAgentTelemetryConfig(AGENT_NAME);
			const adapter = createLLMAdapter(aiConfig);
			const basePrompt = capabilityAggregatorPrompt({
				domains: domains.map((domain) => ({
					name: String((domain as any).name ?? "Unknown"),
					purpose:
						typeof (domain as any).purpose === "string"
							? (domain as any).purpose
							: undefined,
				})),
				features: features.map((feature) => ({
					slug: feature.slug,
					name: feature.name,
					description: feature.description,
					domain: feature.domain ?? undefined,
					visibility: feature.visibility,
					layer: feature.layer ?? undefined,
					entryPoints: feature.entryPoints ?? undefined,
				})),
				baseline,
				languagePreference,
			});
			const model = createToolPromptModel(adapter, {
				protocol: "Eres un agente autónomo. Responde SOLO con JSON válido.",
			});
			const messages: AgentMessage[] = [{ role: "user", content: basePrompt }];
			const tools = [createValidateJsonTool()];

			const result: AgentLoopResult = await executeAgentLoop(
				model,
				{
					maxTurns: 8,
					maxTokens: 8000,
					maxTotalTokens: 200_000,
					timeoutMs: 150_000,
					tools,
					requireValidateJson: true,
					validateJsonReminder:
						"<reminder>Call validate_json with your final JSON before submitting the final output.</reminder>",
					autoFinalizeOnValidateJson: true,
					emptyResponseReminder:
						"<reminder>Your last response was empty. Provide JSON output now.</reminder>",
					sampling: { temperature: 0 },
				},
				basePrompt,
				messages,
			);
			await recordBudget(ctx, productId, runId, result);

			const parsed =
				result.output && typeof result.output === "object"
					? { data: result.output as unknown }
					: null;

			if (result.status !== "completed" || !parsed?.data) {
				await appendErrorStep(
					ctx,
					productId,
					runId,
					"Invalid JSON response from Capability Aggregator",
					{ preview: result.rawText?.slice(0, 2000) ?? "" },
				);
				await finishRunError(
					ctx,
					productId,
					runId,
					"Invalid JSON response from Capability Aggregator",
				);
				return {
					runId,
					status: "failed",
					errorMessage: "Invalid JSON response from Capability Aggregator",
				};
			}

			if (!parsed?.data || typeof parsed.data !== "object") {
				await appendErrorStep(
					ctx,
					productId,
					runId,
					"Invalid JSON response from Capability Aggregator",
					{ preview: result.rawText?.slice(0, 2000) ?? "" },
				);
				await finishRunError(
					ctx,
					productId,
					runId,
					"Invalid JSON response from Capability Aggregator",
				);
				return {
					runId,
					status: "failed",
					errorMessage: "Invalid JSON response from Capability Aggregator",
				};
			}

			const capabilities = validateCapabilities(
				parsed.data,
				features.map((f) => f.slug),
			);
			if (!capabilities) {
				await appendErrorStep(
					ctx,
					productId,
					runId,
					"Capability output failed validation",
				);
				await finishRunError(
					ctx,
					productId,
					runId,
					"Capability output failed validation",
				);
				return {
					runId,
					status: "failed",
					errorMessage: "Capability output failed validation",
				};
			}

			await ctx.runMutation(
				internal.products.capabilities.upsertProductCapabilities,
				{
					productId,
					capabilities,
				},
			);

			if (telemetryConfig.persistInferenceLogs) {
				await ctx.runMutation(internal.ai.telemetry.recordInferenceLog, {
					organizationId,
					productId,
					userId,
					useCase: USE_CASE,
					agentName: AGENT_NAME,
					promptVersion: CAPABILITY_AGGREGATOR_PROMPT_VERSION,
					prompt: basePrompt,
					response: result.rawText ?? result.text,
					provider: aiConfig.provider,
					model: aiConfig.model,
					tokensIn: result.metrics.tokensIn,
					tokensOut: result.metrics.tokensOut,
					totalTokens: result.metrics.totalTokens,
					latencyMs: result.metrics.latencyMs,
					metadata: { source: "capability-aggregator" },
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
				prompt: basePrompt,
				response: result.rawText ?? result.text,
				metadata: { source: "capability-aggregator" },
			});

			await ctx.runMutation(
				internal.agents.productContextData.updateContextSnapshot,
				{
					snapshotId,
					capabilities: { capabilities },
					status: snapshot?.status === "failed" ? "failed" : "completed",
					completedPhases: Array.from(
						new Set([...(snapshot?.completedPhases ?? []), "capabilities"]),
					),
					errors: [],
				},
			);

			await ctx.runMutation(internal.agents.agentRuns.finishRun, {
				productId,
				runId,
				status: "success",
			});

			return { runId, status: "completed" };
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			await appendErrorStep(ctx, productId, runId, message);
			await finishRunError(ctx, productId, runId, message);
			if (snapshotId) {
				await ctx.runMutation(
					internal.agents.productContextData.updateContextSnapshot,
					{
						snapshotId,
						status: "partial",
						errors: [
							{
								phase: "capabilities",
								error: message,
								timestamp: Date.now(),
							},
						],
					},
				);
			}
			return { runId, status: "failed", errorMessage: message };
		}
	},
});

function validateCapabilities(
	value: unknown,
	knownFeatures: string[],
): CapabilityOutput[] | null {
	if (!value || typeof value !== "object") return null;
	const raw = value as CapabilityAggregationResult;
	if (!Array.isArray(raw.capabilities)) return null;

	const featureSet = new Set(knownFeatures);
	const seenSlugs = new Set<string>();
	const cleaned: CapabilityOutput[] = [];

	for (const capability of raw.capabilities) {
		if (!capability || typeof capability !== "object") continue;
		const candidate = capability as CapabilityOutput;
		if (!candidate.slug || !candidate.name) continue;
		if (!/^[a-z0-9-]+$/.test(candidate.slug)) continue;
		if (seenSlugs.has(candidate.slug)) continue;
		if (!Array.isArray(candidate.featureSlugs) || candidate.featureSlugs.length === 0)
			continue;

		const uniqueFeatures = Array.from(
			new Set(
				candidate.featureSlugs.filter((slug) => featureSet.has(slug)),
			),
		);
		if (uniqueFeatures.length === 0) continue;

		const visibility =
			candidate.visibility === "internal" ? "internal" : "public";

		cleaned.push({
			slug: candidate.slug,
			name: candidate.name,
			description: candidate.description,
			domain: candidate.domain,
			visibility,
			featureSlugs: uniqueFeatures,
		});
		seenSlugs.add(candidate.slug);
	}

	return cleaned.length > 0 ? cleaned : null;
}

async function appendErrorStep(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
	error: string,
	metadata?: Record<string, unknown>,
) {
	await ctx.runMutation(internal.agents.agentRuns.appendStep, {
		productId,
		runId,
		step: "Capability aggregation error",
		status: "error",
		metadata: { error, ...metadata },
	});
}

async function finishRunError(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
	errorMessage: string,
) {
	await ctx.runMutation(internal.agents.agentRuns.finishRun, {
		productId,
		runId,
		status: "error",
		errorMessage,
	});
}

async function recordBudget(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
	result: AgentLoopResult,
) {
	const budgetStatus = result.status === "error" ? "error" : "info";
	await ctx.runMutation(internal.agents.agentRuns.appendStep, {
		productId,
		runId,
		step: "Budget",
		status: budgetStatus,
		metadata: {
			maxTotalTokens: result.metrics?.maxTotalTokens,
			maxTurns: result.metrics?.maxTurns,
			loopStatus: result.status,
			errorMessage: result.errorMessage,
			tokensIn: result.metrics?.tokensIn,
			tokensOut: result.metrics?.tokensOut,
			totalTokens: result.metrics?.totalTokens,
			turns: result.metrics?.turns,
		},
	});
}
