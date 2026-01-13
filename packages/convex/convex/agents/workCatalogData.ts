import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const insertWorkCatalogRun = internalMutation({
	args: {
		productId: v.id("products"),
		createdBy: v.id("users"),
		agentRunId: v.optional(v.id("agentRuns")),
		createdAt: v.number(),
		rawOutput: v.optional(v.string()),
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
		sources: v.array(
			v.object({
				sourceType: v.string(),
				sourceId: v.string(),
				sourceLabel: v.string(),
				catalog: v.object({
					feature_surface: v.array(
						v.object({
							name: v.string(),
							displayName: v.optional(v.string()),
							signals: v.array(v.string()),
							notes: v.optional(v.string()),
						}),
					),
					capabilities: v.array(
						v.object({
							name: v.string(),
							displayName: v.optional(v.string()),
							signals: v.array(v.string()),
							notes: v.optional(v.string()),
						}),
					),
					work: v.array(
						v.object({
							name: v.string(),
							displayName: v.optional(v.string()),
							signals: v.array(v.string()),
							notes: v.optional(v.string()),
						}),
					),
				}),
			}),
		),
	},
	handler: async (
		ctx,
		{ productId, createdBy, createdAt, sources, agentRunId, rawOutput, steps },
	) => {
		const id = await ctx.db.insert("workCatalogRuns", {
			productId,
			createdBy,
			createdAt,
			sources,
			agentRunId,
			rawOutput,
			steps,
		});
		return { id };
	},
});
