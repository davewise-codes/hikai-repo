import { action, query } from "../_generated/server";
import { v } from "convex/values";
import { assertProductAccess } from "../lib/access";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { syncGithubConnectionHandler } from "../connectors/github";

const DEFAULT_LIMIT = 5000;
const MAX_LIMIT = 5000;

type TimelineItem = {
	_id: Id<"interpretedEvents">;
	productId: Id<"products">;
	rawEventId: Id<"rawEvents">;
	kind: string;
	title: string;
	summary?: string;
	occurredAt: number;
	relevance?: number;
	tags?: string[];
	createdAt: number;
	updatedAt: number;
	rawStatus: "pending" | "processed" | "error" | null;
	rawSourceType: "commit" | "pull_request" | "release" | null;
};

type InterpretResult = {
	attempted: number;
	processed: number;
	errors: number;
	productId: Id<"products">;
};

export const listTimelineByProduct = query({
	args: {
		productId: v.id("products"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { productId, limit }) => {
		await assertProductAccess(ctx, productId);

		const resolvedLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

		const interpreted = await ctx.db
			.query("interpretedEvents")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.order("desc")
			.take(resolvedLimit);

		const items: TimelineItem[] = [];

		for (const event of interpreted) {
			const raw = await ctx.db.get(event.rawEventId);

			items.push({
				...event,
				rawStatus: raw?.status ?? null,
				rawSourceType: raw?.sourceType ?? null,
			});
		}

		return { items };
	},
});

export const triggerManualSync = action({
	args: {
		productId: v.id("products"),
		connectionId: v.id("connections"),
	},
	handler: async (ctx, { productId, connectionId }) => {
		await ctx.runQuery(internal.connectors.github.assertProductAccessForGithub, {
			productId,
		});

		const result = await syncGithubConnectionHandler(ctx, { productId, connectionId });
		const interpretResult = await ctx.runMutation(
			api.timeline.interpret.interpretPendingEvents,
			{ productId }
		);

		return {
			...result,
			interpreted: interpretResult.processed,
		};
	},
});

export const reprocessRawEvents = action({
	args: {
		productId: v.id("products"),
		rawEventIds: v.array(v.id("rawEvents")),
	},
	handler: async (
		ctx,
		{ productId, rawEventIds }
	): Promise<InterpretResult> => {
		await ctx.runQuery(internal.connectors.github.assertProductAccessForGithub, {
			productId,
		});

		const result = await ctx.runMutation(
			api.timeline.interpret.interpretPendingEvents,
			{
				productId,
				rawEventIds,
			}
		);

		return result;
	},
});
