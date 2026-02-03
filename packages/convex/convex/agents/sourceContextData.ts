import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

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
		sourceLabel: v.optional(v.string()),
		sourceCategory: v.optional(
			v.union(v.literal("monorepo"), v.literal("repo")),
		),
		surfaceMapping: v.array(
			v.object({
				pathPrefix: v.string(),
				surface: v.union(
					v.literal("product_front"),
					v.literal("platform"),
					v.literal("infra"),
					v.literal("marketing"),
					v.literal("doc"),
					v.literal("management"),
					v.literal("admin"),
					v.literal("analytics"),
				),
			}),
		),
		notes: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{
			productId,
			sourceType,
			sourceId,
			sourceLabel,
			sourceCategory,
			surfaceMapping,
			notes,
		},
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
				sourceLabel,
				sourceCategory,
				surfaceMapping,
				notes,
				updatedAt: now,
			});
			return { id: existing._id };
		}

		const id = await ctx.db.insert("sourceContext", {
			productId,
			sourceType,
			sourceId,
			sourceLabel,
			sourceCategory,
			surfaceMapping,
			notes,
			createdAt: now,
			updatedAt: now,
		});
		return { id };
	},
});
