import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { assertProductAccess } from "../lib/access";

export const saveDomainMap = internalMutation({
	args: {
		productId: v.id("products"),
		domainMap: v.any(),
	},
	handler: async (ctx, { productId, domainMap }) => {
		await assertProductAccess(ctx, productId);
		await ctx.db.patch(productId, {
			domainMap,
			updatedAt: Date.now(),
		});
	},
});
