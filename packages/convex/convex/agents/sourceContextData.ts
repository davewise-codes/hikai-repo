import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

export const getSourceContext = internalQuery({
	args: {
		productId: v.id("products"),
		sourceType: v.string(),
		sourceId: v.string(),
	},
	handler: async (ctx, { productId, sourceType, sourceId }) => {
		return ctx.db
			.query("sourceContext")
			.withIndex("by_product_source", (q) =>
				q.eq("productId", productId).eq("sourceType", sourceType).eq("sourceId", sourceId),
			)
			.first();
	},
});

export const listSourceContexts = internalQuery({
	args: {
		productId: v.id("products"),
	},
	handler: async (ctx, { productId }) => {
		return ctx.db
			.query("sourceContext")
			.withIndex("by_product", (q) => q.eq("productId", productId))
			.collect();
	},
});

export const upsertSourceContext = internalMutation({
	args: {
		productId: v.id("products"),
		sourceType: v.string(),
		sourceId: v.string(),
		classification: v.union(
			v.literal("product_core"),
			v.literal("marketing_surface"),
			v.literal("infra"),
			v.literal("docs"),
			v.literal("experiments"),
			v.literal("mixed"),
			v.literal("unknown"),
		),
		notes: v.optional(v.string()),
		structure: v.optional(v.any()),
	},
	handler: async (
		ctx,
		{ productId, sourceType, sourceId, classification, notes, structure },
	) => {
		const existing = await ctx.db
			.query("sourceContext")
			.withIndex("by_product_source", (q) =>
				q.eq("productId", productId).eq("sourceType", sourceType).eq("sourceId", sourceId),
			)
			.first();
		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				classification,
				notes,
				structure,
				updatedAt: now,
			});
			return { id: existing._id };
		}

		const id = await ctx.db.insert("sourceContext", {
			productId,
			sourceType,
			sourceId,
			classification,
			notes,
			structure,
			createdAt: now,
			updatedAt: now,
		});
		return { id };
	},
});
