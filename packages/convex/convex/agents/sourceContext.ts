import { query } from "../_generated/server";
import { v } from "convex/values";
import { assertProductAccess } from "../lib/access";

export const listSourceContexts = query({
	args: {
		productId: v.id("products"),
	},
	handler: async (ctx, { productId }) => {
		await assertProductAccess(ctx, productId);
		return ctx.db
			.query("sourceContext")
			.withIndex("by_product", (q) => q.eq("productId", productId))
			.collect();
	},
});
