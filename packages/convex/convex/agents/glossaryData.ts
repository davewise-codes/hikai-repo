import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const insertGlossaryRun = internalMutation({
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
			}),
		),
		glossary: v.object({
			terms: v.array(
				v.object({
					term: v.string(),
					evidence: v.array(v.string()),
					source: v.string(),
					surface: v.optional(
						v.union(
							v.literal("management"),
							v.literal("design"),
							v.literal("product_front"),
							v.literal("platform"),
							v.literal("marketing"),
							v.literal("admin"),
							v.literal("docs"),
						),
					),
				}),
			),
		}),
	},
	handler: async (
		ctx,
		{ productId, createdBy, createdAt, sources, agentRunId, rawOutput, steps, glossary },
	) => {
		const id = await ctx.db.insert("glossaryRuns", {
			productId,
			createdBy,
			createdAt,
			sources,
			agentRunId,
			rawOutput,
			steps,
			glossary,
		});
		return { id };
	},
});
