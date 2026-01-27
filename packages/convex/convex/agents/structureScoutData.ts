import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { assertProductAccess } from "../lib/access";

export const saveStructureScout = internalMutation({
	args: {
		productId: v.id("products"),
		structureScout: v.any(),
		snapshotId: v.id("productContextSnapshots"),
	},
	handler: async (ctx, { productId, structureScout, snapshotId }) => {
		await assertProductAccess(ctx, productId);
		await ctx.db.patch(snapshotId, {
			repoStructure: structureScout,
		});
	},
});
