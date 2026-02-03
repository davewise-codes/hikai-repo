import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { runRepoContextAgent } from "./repoContextAgent";

const AGENT_NAME = "Context Agent";
const USE_CASE = "context_agent";

type Phase = "context" | "structure" | "glossary" | "domains" | "features";

type SnapshotError = {
	phase: Phase;
	error: string;
	timestamp: number;
};

type GenerationMetrics = {
	totalLatencyMs: number;
	totalTokens: number;
	tokensIn: number;
	tokensOut: number;
	totalTurns: number;
};

export const generateContextSnapshot = action({
	args: {
		productId: v.id("products"),
		triggerReason: v.optional(
			v.union(
				v.literal("initial_setup"),
				v.literal("source_change"),
				v.literal("manual_refresh"),
			),
		),
		forceRefresh: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ productId, triggerReason, forceRefresh },
	): Promise<{
		snapshotId: Id<"productContextSnapshots">;
		status: "completed" | "partial" | "failed" | "skipped";
		completedPhases: Phase[];
		errors: SnapshotError[];
		runId: Id<"agentRuns"> | null;
		reusedSnapshot: boolean;
	}> => {
		const { product } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);

		const currentSnapshot = product.currentProductSnapshot
			? await ctx.runQuery(internal.agents.productContextData.getContextSnapshotById, {
					snapshotId: product.currentProductSnapshot,
				})
			: null;

		if (!forceRefresh && currentSnapshot?.status === "completed") {
			return {
				snapshotId: currentSnapshot._id,
				status: "skipped",
				completedPhases: currentSnapshot.completedPhases ?? [],
				errors: currentSnapshot.errors ?? [],
				runId: null,
				reusedSnapshot: true,
			};
		}

		const { runId } = await ctx.runMutation(api.agents.agentRuns.createAgentRun, {
			productId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
		});

		const createdAt = Date.now();
		const normalizedTrigger =
			triggerReason ?? (currentSnapshot ? "manual_refresh" : "initial_setup");

		const { snapshotId } = await ctx.runMutation(
			internal.agents.productContextData.createContextSnapshot,
			{
				productId,
				createdAt,
				generatedBy: "contextAgent",
				triggerReason: normalizedTrigger,
				status: "in_progress",
				completedPhases: [],
				errors: [],
				agentRuns: { contextAgent: runId },
			},
		);

		const recordStep = async (
			step: string,
			status: "info" | "success" | "warn" | "error",
			metadata?: Record<string, unknown>,
		) =>
			ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step,
				status,
				metadata,
			});

		const errors: SnapshotError[] = [];
		const completedPhases: Phase[] = [];
		const startedAt = Date.now();
		const metrics: GenerationMetrics = {
			totalLatencyMs: 0,
			totalTokens: 0,
			tokensIn: 0,
			tokensOut: 0,
			totalTurns: 0,
		};

		await recordStep("Repo context: start", "info");
		const sourceContexts = await ctx.runQuery(
			internal.agents.sourceContextData.listSourceContexts,
			{ productId },
		);
		const allowedSurfaceMapping = sourceContexts.flatMap((source) => {
			if (!Array.isArray(source.surfaceMapping)) return [];
			return source.surfaceMapping
				.filter(
					(entry) =>
						entry.surface === "product_front" || entry.surface === "platform",
				)
				.map((entry) => ({
					sourceId: source.sourceId,
					pathPrefix: entry.pathPrefix,
					surface: entry.surface,
				}));
		});
		const contextResult = await runRepoContextAgent({
			ctx,
			productId,
			runId,
			baseline: {
				problemSolved: product.baseline?.problemSolved ?? "",
				valueProposition: product.baseline?.valueProposition ?? "",
				targetMarket: product.baseline?.targetMarket ?? "",
				productCategory: product.baseline?.productCategory ?? "",
				industry: product.baseline?.industry ?? "",
				icps: product.baseline?.icps ?? [],
			},
			surfaceMapping: allowedSurfaceMapping,
		});
		if (contextResult.metrics) {
			metrics.totalLatencyMs += contextResult.metrics.latencyMs ?? 0;
			metrics.totalTokens += contextResult.metrics.totalTokens ?? 0;
			metrics.tokensIn += contextResult.metrics.tokensIn ?? 0;
			metrics.tokensOut += contextResult.metrics.tokensOut ?? 0;
			metrics.totalTurns += contextResult.metrics.turns ?? 0;
		}

		const agentRuns = { contextAgent: runId };
		await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
			snapshotId,
			agentRuns,
		});

		if (!contextResult.contextDetail) {
			errors.push({
				phase: "context",
				error:
					contextResult.errorMessage ??
					"Repo context agent did not return output",
				timestamp: Date.now(),
			});
		}
		if (contextResult.contextDetail) {
			completedPhases.push("domains");
		}

		const status: "completed" | "failed" | "partial" =
			contextResult.contextDetail
				? errors.length
					? "partial"
					: "completed"
				: "failed";

		await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
			snapshotId,
			contextDetail: contextResult.contextDetail ?? undefined,
			status,
			completedPhases,
			errors,
			agentRuns,
			generationMetrics: {
				...metrics,
				totalLatencyMs: Date.now() - startedAt,
			},
		});

		if (status !== "failed") {
			await ctx.runMutation(
				internal.agents.productContextData.setCurrentProductSnapshot,
				{
					productId,
					snapshotId,
					updatedAt: Date.now(),
				},
			);
		}

		const failureSummary =
			status === "failed" && errors.length > 0
				? errors
						.slice(0, 3)
						.map((error) => `${error.phase}: ${error.error}`)
						.join(" | ")
				: status === "failed"
					? "Context agent failed"
					: undefined;

		await ctx.runMutation(internal.agents.agentRuns.finishRun, {
			productId,
			runId,
			status: status === "failed" ? "error" : "success",
			errorMessage: failureSummary,
		});

		return {
			snapshotId,
			status,
			completedPhases,
			errors,
			runId,
			reusedSnapshot: false,
		};
	},
});

export const migrateLegacyContextSnapshot = action({
	args: {
		productId: v.id("products"),
	},
	handler: async (ctx, { productId }) => {
		const { product } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);
		const legacyProduct = product as {
			domainMap?: Record<string, unknown> | null;
			structureScout?: Record<string, unknown> | null;
		};
		const legacyDomainMap = legacyProduct.domainMap ?? null;
		const legacyStructure = legacyProduct.structureScout ?? null;
		if (!legacyDomainMap && !legacyStructure) {
			return { migrated: false, reason: "No legacy fields found" };
		}

		const completedPhases: Phase[] = [];
		const errors: SnapshotError[] = [];
		if (legacyStructure) {
			completedPhases.push("structure");
		} else {
			errors.push({
				phase: "structure",
				error: "Missing legacy structureScout",
				timestamp: Date.now(),
			});
		}
		if (legacyDomainMap) {
			completedPhases.push("domains");
		} else {
			errors.push({
				phase: "domains",
				error: "Missing legacy domainMap",
				timestamp: Date.now(),
			});
		}

		const status: "completed" | "partial" | "failed" =
			errors.length === 0
				? "completed"
				: completedPhases.length > 0
					? "partial"
					: "failed";

		const { snapshotId } = await ctx.runMutation(
			internal.agents.productContextData.createContextSnapshot,
			{
				productId,
				createdAt: Date.now(),
				generatedBy: "manual",
				triggerReason: "initial_setup",
				status,
				completedPhases,
				errors,
				repoStructure: legacyStructure ?? undefined,
				domainMap: legacyDomainMap ?? undefined,
			},
		);

		if (status !== "failed") {
			await ctx.runMutation(
				internal.agents.productContextData.setCurrentProductSnapshot,
				{
					productId,
					snapshotId,
					updatedAt: Date.now(),
				},
			);
		}

		return { migrated: true, snapshotId, status };
	},
});
