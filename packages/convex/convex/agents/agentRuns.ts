import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { assertProductAccess } from "../lib/access";

const stepStatus = v.union(
	v.literal("info"),
	v.literal("success"),
	v.literal("warn"),
	v.literal("error"),
);

export const createAgentRun = mutation({
	args: {
		productId: v.id("products"),
		useCase: v.string(),
		agentName: v.string(),
		parentRunId: v.optional(v.id("agentRuns")),
	},
	handler: async (ctx, { productId, useCase, agentName, parentRunId }) => {
		const { organization, userId } = await assertProductAccess(ctx, productId);
		if (parentRunId) {
			const parent = await ctx.db.get(parentRunId);
			if (!parent || parent.productId !== productId) {
				throw new Error("Parent agent run not found for this product");
			}
		}

		const now = Date.now();
		const runId = await ctx.db.insert("agentRuns", {
			organizationId: organization._id,
			productId,
			userId,
			useCase,
			agentName,
			parentRunId,
			status: "running",
			startedAt: now,
			steps: [],
		});

		return { runId };
	},
});

export const appendStep = internalMutation({
	args: {
		productId: v.id("products"),
		runId: v.id("agentRuns"),
		step: v.string(),
		status: stepStatus,
		timestamp: v.optional(v.number()),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, { productId, runId, step, status, timestamp, metadata }) => {
		await assertProductAccess(ctx, productId);

		const run = await ctx.db.get(runId);
		if (!run || run.productId !== productId) {
			throw new Error("Agent run not found");
		}
		if (run.status !== "running") {
			return;
		}

		const entry = {
			step,
			status,
			timestamp: timestamp ?? Date.now(),
			metadata,
		};

		await ctx.db.patch(runId, {
			steps: [...run.steps, entry],
		});
	},
});

// Internal-only: allow background jobs without user auth to append steps.
export const appendStepSystem = internalMutation({
	args: {
		productId: v.id("products"),
		runId: v.id("agentRuns"),
		step: v.string(),
		status: stepStatus,
		timestamp: v.optional(v.number()),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, { productId, runId, step, status, timestamp, metadata }) => {
		const run = await ctx.db.get(runId);
		if (!run || run.productId !== productId) {
			throw new Error("Agent run not found");
		}
		if (run.status !== "running") {
			return;
		}

		const entry = {
			step,
			status,
			timestamp: timestamp ?? Date.now(),
			metadata,
		};

		await ctx.db.patch(runId, {
			steps: [...run.steps, entry],
		});
	},
});

export const finishRun = internalMutation({
	args: {
		productId: v.id("products"),
		runId: v.id("agentRuns"),
		status: v.union(v.literal("success"), v.literal("error")),
		errorMessage: v.optional(v.string()),
		finishedAt: v.optional(v.number()),
	},
	handler: async (ctx, { productId, runId, status, errorMessage, finishedAt }) => {
		await assertProductAccess(ctx, productId);

		const run = await ctx.db.get(runId);
		if (!run || run.productId !== productId) {
			throw new Error("Agent run not found");
		}

		await ctx.db.patch(runId, {
			status,
			errorMessage,
			finishedAt: finishedAt ?? Date.now(),
		});
	},
});

// Internal-only: allow background jobs without user auth to finish runs.
export const finishRunSystem = internalMutation({
	args: {
		productId: v.id("products"),
		runId: v.id("agentRuns"),
		status: v.union(v.literal("success"), v.literal("error")),
		errorMessage: v.optional(v.string()),
		finishedAt: v.optional(v.number()),
	},
	handler: async (ctx, { productId, runId, status, errorMessage, finishedAt }) => {
		const run = await ctx.db.get(runId);
		if (!run || run.productId !== productId) {
			throw new Error("Agent run not found");
		}

		await ctx.db.patch(runId, {
			status,
			errorMessage,
			finishedAt: finishedAt ?? Date.now(),
		});
	},
});

export const cancelRun = mutation({
	args: {
		productId: v.id("products"),
		runId: v.id("agentRuns"),
		reason: v.optional(v.string()),
	},
	handler: async (ctx, { productId, runId, reason }) => {
		await assertProductAccess(ctx, productId);

		const run = await ctx.db.get(runId);
		if (!run || run.productId !== productId) {
			throw new Error("Agent run not found");
		}
		if (run.status !== "running") {
			return { cancelled: false, status: run.status };
		}

		const now = Date.now();
		const entry = {
			step: "Cancelled",
			status: "warn" as const,
			timestamp: now,
			metadata: { reason: reason ?? "user_requested" },
		};

		await ctx.db.patch(runId, {
			status: "error",
			errorMessage: "Cancelled by user",
			finishedAt: now,
			steps: [...run.steps, entry],
		});

		return { cancelled: true };
	},
});

export const getRunById = query({
	args: {
		productId: v.id("products"),
		runId: v.id("agentRuns"),
	},
	handler: async (ctx, { productId, runId }) => {
		await assertProductAccess(ctx, productId);

		const run = await ctx.db.get(runId);
		if (!run || run.productId !== productId) {
			return null;
		}

		return run;
	},
});

export const getLatestRunForUseCase = query({
	args: {
		productId: v.id("products"),
		useCase: v.string(),
	},
	handler: async (ctx, { productId, useCase }) => {
		await assertProductAccess(ctx, productId);

		const runs = await ctx.db
			.query("agentRuns")
			.withIndex("by_product", (q) => q.eq("productId", productId))
			.collect();

		const filtered = runs
			.filter((run) => run.useCase === useCase)
			.sort((a, b) => b.startedAt - a.startedAt);

		return filtered[0] ?? null;
	},
});

export const getRunsForUseCase = query({
	args: {
		productId: v.id("products"),
		useCase: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { productId, useCase, limit }) => {
		await assertProductAccess(ctx, productId);

		const runs = await ctx.db
			.query("agentRuns")
			.withIndex("by_product", (q) => q.eq("productId", productId))
			.collect();

		return runs
			.filter((run) => run.useCase === useCase)
			.sort((a, b) => b.startedAt - a.startedAt)
			.slice(0, limit ?? 10);
	},
});

export const getChildRuns = query({
	args: {
		productId: v.id("products"),
		parentRunId: v.id("agentRuns"),
	},
	handler: async (ctx, { productId, parentRunId }) => {
		await assertProductAccess(ctx, productId);

		const runs = await ctx.db
			.query("agentRuns")
			.withIndex("by_parent", (q) => q.eq("parentRunId", parentRunId))
			.collect();

		return runs.sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));
	},
});

export const exportRunTrace = action({
	args: {
		productId: v.id("products"),
		runId: v.id("agentRuns"),
	},
	handler: async (ctx, { productId, runId }) => {
		await ctx.runQuery(internal.lib.access.assertProductAccessInternal, {
			productId,
		});

		const run = await ctx.runQuery(internal.agents.agentRuns.getRunById, {
			productId,
			runId,
		});
		if (!run) {
			return null;
		}

		const expandedSteps = await Promise.all(
			run.steps.map(async (step, index) => {
				const expanded: Record<string, unknown> = { ...step };
				const outputRef =
					(
						step.metadata as { result?: { outputRef?: { fileId?: string } } }
					)?.result?.outputRef ??
					(
						step.metadata as { outputRef?: { fileId?: string } }
					)?.outputRef;
				if (outputRef?.fileId) {
					try {
						const file = await ctx.storage.get(outputRef.fileId);
						if (file) {
							const content = await file.text();
							try {
								expanded._expandedOutput = JSON.parse(content);
							} catch {
								expanded._expandedOutput = content;
							}
						}
					} catch (error) {
						expanded._expandedOutputError =
							error instanceof Error ? error.message : String(error);
					}
				}

				return {
					index,
					...expanded,
				};
			}),
		);

		const childRuns = await ctx.runQuery(internal.agents.agentRuns.getChildRuns, {
			productId,
			parentRunId: runId,
		});

		return {
			runId: run._id,
			productId: run.productId,
			useCase: run.useCase,
			agentName: run.agentName,
			parentRunId: run.parentRunId ?? null,
			status: run.status,
			startedAt: run.startedAt,
			finishedAt: run.finishedAt,
			errorMessage: run.errorMessage,
			stepsCount: run.steps.length,
			steps: expandedSteps,
			childRuns: childRuns.map((child) => ({
				runId: child._id,
				useCase: child.useCase,
				agentName: child.agentName,
				status: child.status,
				startedAt: child.startedAt,
				finishedAt: child.finishedAt,
				errorMessage: child.errorMessage,
				stepsCount: child.steps.length,
			})),
		};
	},
});

export const cleanupOldRuns = internalMutation({
	args: {},
	handler: async (ctx) => {
		const before = Date.now() - 30 * 24 * 60 * 60 * 1000;
		const oldRuns = await ctx.db
			.query("agentRuns")
			.withIndex("by_finished", (q) => q.lt("finishedAt", before))
			.collect();

		for (const run of oldRuns) {
			await ctx.db.delete(run._id);
		}

		return { deleted: oldRuns.length };
	},
});
