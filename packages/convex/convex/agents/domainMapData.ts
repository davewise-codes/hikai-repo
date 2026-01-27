import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { assertProductAccess } from "../lib/access";

export const saveDomainMap = internalMutation({
	args: {
		productId: v.id("products"),
		domainMap: v.any(),
		snapshotId: v.id("productContextSnapshots"),
	},
	handler: async (ctx, { productId, domainMap, snapshotId }) => {
		await assertProductAccess(ctx, productId);
		await ctx.db.patch(snapshotId, {
			domainMap,
		});
	},
});
