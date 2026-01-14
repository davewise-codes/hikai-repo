import { query } from "../_generated/server";
import { v } from "convex/values";
import { assertProductAccess } from "../lib/access";

export const getLatestContextInputRun = query({
	args: {
		productId: v.id("products"),
	},
	handler: async (ctx, { productId }) => {
		await assertProductAccess(ctx, productId);
		const runs = await ctx.db
			.query("contextInputRuns")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.order("desc")
			.take(1);
		return runs[0] ? shapeContextInputRun(runs[0]) : null;
	},
});

export const listContextInputRuns = query({
	args: {
		productId: v.id("products"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { productId, limit }) => {
		await assertProductAccess(ctx, productId);
		const runs = await ctx.db
			.query("contextInputRuns")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.order("desc")
			.take(limit ?? 20);
		return runs.map(shapeContextInputRun);
	},
});

export const getContextInputRunRaw = query({
	args: {
		productId: v.id("products"),
		runId: v.id("contextInputRuns"),
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
			if (run.outputs) {
				return { url: null, raw: JSON.stringify(run.outputs, null, 2) };
			}
			return { url: null, raw: null };
		}
		const url = await ctx.storage.getUrl(run.rawOutputFileId);
		return { url, raw: null };
	},
});

function shapeContextInputRun(run: {
	_id: string;
	productId: string;
	createdAt: number;
	rawOutputFileId?: string;
	steps?: unknown;
	summary?: {
		uiSitemapCount: number;
		userFlowsCount: number;
		businessEntityCount: number;
		businessRelationshipCount: number;
		repoCount: number;
	};
	rawOutput?: string;
	outputs?: {
		uiSitemap?: { items?: unknown[] };
		userFlows?: { flows?: unknown[] };
		businessDataModel?: { entities?: unknown[]; relationships?: unknown[] };
		repoFolderTopology?: { repos?: unknown[] };
	};
}) {
	const summary =
		run.summary ??
		(run.outputs
			? {
					uiSitemapCount: run.outputs.uiSitemap?.items?.length ?? 0,
					userFlowsCount: run.outputs.userFlows?.flows?.length ?? 0,
					businessEntityCount:
						run.outputs.businessDataModel?.entities?.length ?? 0,
					businessRelationshipCount:
						run.outputs.businessDataModel?.relationships?.length ?? 0,
					repoCount: run.outputs.repoFolderTopology?.repos?.length ?? 0,
				}
			: undefined);

	return {
		_id: run._id,
		productId: run.productId,
		createdAt: run.createdAt,
		rawOutputFileId: run.rawOutputFileId,
		steps: run.steps,
		summary,
		hasRaw:
			Boolean(run.rawOutputFileId) ||
			Boolean(run.rawOutput) ||
			Boolean(run.outputs),
	};
}
