import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const insertContextInputRun = internalMutation({
	args: {
		productId: v.id("products"),
		createdBy: v.id("users"),
		agentRunId: v.optional(v.id("agentRuns")),
		createdAt: v.number(),
		rawOutputFileId: v.optional(v.id("_storage")),
		steps: v.optional(
			v.array(
				v.object({
					step: v.string(),
					status: v.union(
						v.literal("info"),
						v.literal("success"),
						v.literal("warn"),
						v.literal("error"),
					),
					timestamp: v.number(),
					metadata: v.optional(v.any()),
				}),
			),
		),
		summary: v.optional(
			v.object({
				uiSitemapCount: v.number(),
				userFlowsCount: v.number(),
				businessEntityCount: v.number(),
				businessRelationshipCount: v.number(),
				repoCount: v.number(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const {
			productId,
			createdBy,
			agentRunId,
			createdAt,
			rawOutputFileId,
			steps,
			summary,
		} = args;
		return ctx.db.insert("contextInputRuns", {
			productId,
			createdBy,
			agentRunId,
			createdAt,
			rawOutputFileId,
			steps,
			summary,
		});
	},
});

export const listContextInputRuns = internalQuery({
	args: {
		productId: v.id("products"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { productId, limit }) =>
		ctx.db
			.query("contextInputRuns")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.order("desc")
			.take(limit ?? 20),
});

export const getLatestContextInputRun = internalQuery({
	args: {
		productId: v.id("products"),
	},
	handler: async (ctx, { productId }) => {
		const runs = await ctx.db
			.query("contextInputRuns")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.order("desc")
			.take(1);
		return runs[0] ?? null;
	},
});
