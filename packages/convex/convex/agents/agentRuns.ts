import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
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
	},
	handler: async (ctx, { productId, useCase, agentName }) => {
		const { organization, userId } = await assertProductAccess(ctx, productId);

		const now = Date.now();
		const runId = await ctx.db.insert("agentRuns", {
			organizationId: organization._id,
			productId,
			userId,
			useCase,
			agentName,
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
