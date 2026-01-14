import { query } from "../_generated/server";
import { v } from "convex/values";
import { assertProductAccess } from "../lib/access";

export const getLatestSurfaceSignalRun = query({
	args: {
		productId: v.id("products"),
	},
	handler: async (ctx, { productId }) => {
		await assertProductAccess(ctx, productId);
		const runs = await ctx.db
			.query("surfaceSignalRuns")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.order("desc")
			.take(1);
		return runs[0] ?? null;
	},
});

export const listSurfaceSignalRuns = query({
	args: {
		productId: v.id("products"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { productId, limit }) => {
		await assertProductAccess(ctx, productId);
		const runs = await ctx.db
			.query("surfaceSignalRuns")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.order("desc")
			.take(limit ?? 20);
		return runs.map((run) => ({
			_id: run._id,
			productId: run.productId,
			createdAt: run.createdAt,
			rawOutputFileId: run.rawOutputFileId,
			steps: run.steps,
			sourcesCount: run.sources?.length ?? 0,
			hasRaw: Boolean(run.rawOutputFileId) || Boolean(run.rawOutput),
		}));
	},
});

export const getSurfaceSignalRunRaw = query({
	args: {
		productId: v.id("products"),
		runId: v.id("surfaceSignalRuns"),
	},
	handler: async (ctx, { productId, runId }) => {
		await assertProductAccess(ctx, productId);
		const run = await ctx.db.get(runId);
		if (!run || run.productId !== productId) {
			return { url: null, raw: null };
		}
		if (!run.rawOutputFileId) {
			if (run.rawOutput) {
				return { url: null, raw: run.rawOutput };
			}
			return { url: null, raw: null };
		}
		const url = await ctx.storage.getUrl(run.rawOutputFileId);
		return { url, raw: null };
	},
});
