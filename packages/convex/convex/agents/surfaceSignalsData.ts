import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const insertSurfaceSignalRun = internalMutation({
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
				surfaces: v.array(
					v.object({
						surface: v.union(
							v.literal("management"),
							v.literal("design"),
							v.literal("product_front"),
							v.literal("platform"),
							v.literal("marketing"),
							v.literal("admin"),
							v.literal("docs"),
						),
						bucketId: v.string(),
						evidence: v.optional(v.array(v.string())),
					}),
				),
			}),
		),
	},
	handler: async (
		ctx,
		{ productId, createdBy, createdAt, sources, agentRunId, rawOutput, steps },
	) => {
		const id = await ctx.db.insert("surfaceSignalRuns", {
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
