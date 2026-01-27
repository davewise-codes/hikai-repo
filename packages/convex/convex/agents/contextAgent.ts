import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const AGENT_NAME = "Context Agent";
const USE_CASE = "context_agent";

type Phase = "structure" | "glossary" | "domains" | "features";

type SnapshotError = {
	phase: Phase;
	error: string;
	timestamp: number;
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
		const MAX_DURATION_MS = 9 * 60 * 1000;
		const timeRemainingMs = () => MAX_DURATION_MS - (Date.now() - startedAt);
		let agentRuns: {
			contextAgent?: Id<"agentRuns">;
			structureScout?: Id<"agentRuns">;
			glossaryScout?: Id<"agentRuns">;
			domainMapper?: Id<"agentRuns">;
			featureScout?: Id<"agentRuns">;
		} = { contextAgent: runId };

		await recordStep("Phase 1: structure + glossary", "info");
		let structureResult: {
			runId?: Id<"agentRuns">;
			status?: string;
			errorMessage?: string;
			structureScout?: Record<string, unknown> | null;
		} | null = null;
		let glossaryResult: {
			runId?: Id<"agentRuns">;
			status?: string;
			errorMessage?: string;
			glossary?: Record<string, unknown> | null;
		} | null = null;

		const phase1Results = await Promise.allSettled([
			ctx.runAction(api.agents.structureScout.generateStructureScout, {
				productId,
				snapshotId,
				parentRunId: runId,
				triggerReason: normalizedTrigger,
			}),
			ctx.runAction(api.agents.glossaryScout.generateGlossaryScout, {
				productId,
				snapshotId,
				parentRunId: runId,
				triggerReason: normalizedTrigger,
			}),
		]);

		const [structureSettled, glossarySettled] = phase1Results;
		if (structureSettled.status === "fulfilled") {
			structureResult = structureSettled.value;
		} else {
			errors.push({
				phase: "structure",
				error:
					structureSettled.reason instanceof Error
						? structureSettled.reason.message
						: "Structure scout failed",
				timestamp: Date.now(),
			});
		}
		if (glossarySettled.status === "fulfilled") {
			glossaryResult = glossarySettled.value;
		} else {
			errors.push({
				phase: "glossary",
				error:
					glossarySettled.reason instanceof Error
						? glossarySettled.reason.message
						: "Glossary scout failed",
				timestamp: Date.now(),
			});
		}

		agentRuns = {
			...agentRuns,
			structureScout: structureResult?.runId,
			glossaryScout: glossaryResult?.runId,
		};
		await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
			snapshotId,
			agentRuns,
		});

		if (structureResult?.structureScout) {
			completedPhases.push("structure");
		} else {
			errors.push({
				phase: "structure",
				error:
					structureResult?.errorMessage ??
					"Structure scout did not return output",
				timestamp: Date.now(),
			});
		}

		if (glossaryResult?.glossary) {
			completedPhases.push("glossary");
		} else {
			errors.push({
				phase: "glossary",
				error:
					glossaryResult?.errorMessage ??
					"Glossary scout did not return output",
				timestamp: Date.now(),
			});
		}

		const repoStructure = structureResult?.structureScout ?? null;
		const glossary = glossaryResult?.glossary ?? null;
		await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
			snapshotId,
			repoStructure: repoStructure ?? undefined,
			glossary: glossary ?? undefined,
			completedPhases,
			errors,
			status: "in_progress",
		});

		await recordStep("Phase 2: domain map", "info");
		let domainResult: {
			runId?: Id<"agentRuns">;
			status?: string;
			errorMessage?: string;
			domainMap?: Record<string, unknown> | null;
		} | null = null;

		try {
			domainResult = await ctx.runAction(api.agents.domainMap.generateDomainMap, {
				productId,
				snapshotId,
				parentRunId: runId,
				inputs: {
					baseline: product.baseline ?? {},
					repoStructure,
					glossary,
				},
				triggerReason: normalizedTrigger,
			});
		} catch (error) {
			errors.push({
				phase: "domains",
				error: error instanceof Error ? error.message : "Domain map failed",
				timestamp: Date.now(),
			});
		}

		agentRuns = {
			...agentRuns,
			domainMapper: domainResult?.runId,
		};
		await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
			snapshotId,
			agentRuns,
		});

		if (domainResult?.domainMap) {
			completedPhases.push("domains");
		} else {
			errors.push({
				phase: "domains",
				error:
					domainResult?.errorMessage ??
					"Domain map did not return output",
				timestamp: Date.now(),
			});
		}

		const domainMap = domainResult?.domainMap ?? null;
		await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
			snapshotId,
			domainMap: domainMap ?? undefined,
			completedPhases,
			errors,
			status: "in_progress",
		});

		await recordStep("Phase 3: features", "info");
		let featureResult: {
			runId?: Id<"agentRuns">;
			status?: string;
			errorMessage?: string;
			features?: Record<string, unknown> | null;
		} | null = null;
		let featureAttempted = false;

		if (domainMap && timeRemainingMs() > 90_000) {
			featureAttempted = true;
			try {
				featureResult = await ctx.runAction(api.agents.featureScout.generateFeatureScout, {
					productId,
					snapshotId,
					parentRunId: runId,
					inputs: {
						domainMap,
						repoStructure,
						glossary,
					},
					triggerReason: normalizedTrigger,
				});
			} catch (error) {
				errors.push({
					phase: "features",
					error: error instanceof Error ? error.message : "Feature scout failed",
					timestamp: Date.now(),
				});
			}
		} else {
			await recordStep(
				"Phase 3: features",
				"warn",
				domainMap
					? { reason: "skipped_timeout_guard", remainingMs: timeRemainingMs() }
					: { reason: "skipped_missing_domain_map" },
			);
			errors.push({
				phase: "features",
				error: domainMap
					? "Skipped features to avoid context agent timeout"
					: "Skipped features because domain map is missing",
				timestamp: Date.now(),
			});
		}

		agentRuns = {
			...agentRuns,
			featureScout: featureResult?.runId,
		};
		await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
			snapshotId,
			agentRuns,
		});

		if (featureResult?.features) {
			completedPhases.push("features");
		} else if (featureAttempted) {
			errors.push({
				phase: "features",
				error:
					featureResult?.errorMessage ??
					"Feature scout did not return output",
				timestamp: Date.now(),
			});
		}

		const status: "completed" | "partial" | "failed" =
			errors.length === 0
				? "completed"
				: completedPhases.length > 0
					? "partial"
					: "failed";

		await ctx.runMutation(internal.agents.productContextData.updateContextSnapshot, {
			snapshotId,
			status,
			completedPhases,
			errors,
			agentRuns,
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
