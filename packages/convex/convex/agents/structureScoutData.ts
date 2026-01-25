import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { assertProductAccess } from "../lib/access";

export const saveStructureScout = internalMutation({
	args: {
		productId: v.id("products"),
		structureScout: v.any(),
	},
	handler: async (ctx, { productId, structureScout }) => {
		await assertProductAccess(ctx, productId);
		await ctx.db.patch(productId, {
			structureScout,
			updatedAt: Date.now(),
		});
	},
});
