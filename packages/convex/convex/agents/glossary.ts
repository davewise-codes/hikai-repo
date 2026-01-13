import { query } from "../_generated/server";
import { v } from "convex/values";
import { assertProductAccess } from "../lib/access";

export const getLatestGlossaryRun = query({
	args: {
		productId: v.id("products"),
	},
	handler: async (ctx, { productId }) => {
		await assertProductAccess(ctx, productId);
		const runs = await ctx.db
			.query("glossaryRuns")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.order("desc")
			.take(1);
		return runs[0] ?? null;
	},
});

export const listGlossaryRuns = query({
	args: {
		productId: v.id("products"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { productId, limit }) => {
		await assertProductAccess(ctx, productId);
		return ctx.db
			.query("glossaryRuns")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.order("desc")
			.take(limit ?? 20);
	},
});
