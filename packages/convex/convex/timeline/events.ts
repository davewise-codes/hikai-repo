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
	bucketId: string;
	bucketStartAt: number;
	bucketEndAt: number;
	cadence: string;
	capabilitySlug?: string;
	domain?: string;
	surface:
		| "product_front"
		| "platform"
		| "infra"
		| "marketing"
		| "doc"
		| "management"
		| "admin"
		| "analytics";
	type: "feature" | "fix" | "improvement" | "work" | "other";
	title: string;
	summary?: string;
	occurredAt: number;
	relevance?: number;
	visibility?: "public" | "internal";
	rawEventIds: Id<"rawEvents">[];
	rawEventCount: number;
	bucketImpact?: number;
	contextSnapshotId?: Id<"productContextSnapshots">;
	inferenceLogId?: Id<"aiInferenceLogs">;
	createdAt: number;
	updatedAt: number;
};

type InterpretResult = {
	attempted: number;
	processed: number;
	errors: number;
	productId: Id<"products">;
	agentRunId?: Id<"agentRuns"> | null;
};

type SyncGithubResult = Awaited<ReturnType<typeof syncGithubConnectionHandler>>;

export const listTimelineByProduct = query({
	args: {
		productId: v.id("products"),
		limit: v.optional(v.number()),
		refreshKey: v.optional(v.number()),
	},
	handler: async (ctx, { productId, limit }) => {
		await assertProductAccess(ctx, productId);

		const resolvedLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

		const interpreted = await ctx.db
			.query("interpretedEvents")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.order("desc")
			.take(resolvedLimit);

		return { items: interpreted as TimelineItem[] };
	},
});

export const listBucketSummariesByProduct = query({
	args: {
		productId: v.id("products"),
		limit: v.optional(v.number()),
		refreshKey: v.optional(v.number()),
	},
	handler: async (ctx, { productId, limit }) => {
		await assertProductAccess(ctx, productId);

		const resolvedLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

		const summaries = await ctx.db
			.query("bucketSummaries")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.order("desc")
			.take(resolvedLimit);

		return { items: summaries };
	},
});

export const listBucketEventsByBucket = query({
	args: {
		productId: v.id("products"),
		bucketId: v.string(),
	},
	handler: async (ctx, { productId, bucketId }) => {
		await assertProductAccess(ctx, productId);
		return ctx.db
			.query("interpretedEvents")
			.withIndex("by_product_bucket", (q) =>
				q.eq("productId", productId).eq("bucketId", bucketId),
			)
			.collect();
	},
});

export const getTimelineEventDetails = query({
	args: {
		productId: v.id("products"),
		eventId: v.id("interpretedEvents"),
	},
	handler: async (ctx, { productId, eventId }) => {
		await assertProductAccess(ctx, productId);

		const event = await ctx.db.get(eventId);
		if (!event || event.productId !== productId) {
			return null;
		}

		const rawEvents = [];
		for (const rawEventId of event.rawEventIds) {
			const raw = await ctx.db.get(rawEventId);
			if (!raw) continue;
			rawEvents.push({
				rawEventId: raw._id,
				occurredAt: raw.occurredAt,
				sourceType: raw.sourceType,
				summary: buildSummary(raw.payload, raw.sourceType),
			});
		}

		return { event, rawEvents };
	},
});

export const triggerManualSync = action({
	args: {
		productId: v.id("products"),
		connectionId: v.id("connections"),
	},
	handler: async (
		ctx,
		{ productId, connectionId }
	): Promise<SyncGithubResult & { interpreted: number; agentRunId?: Id<"agentRuns"> | null }> => {
		await ctx.runQuery(internal.connectors.github.assertProductAccessForGithub, {
			productId,
		});

		const result = await syncGithubConnectionHandler(ctx, { productId, connectionId });
		const interpretResult: InterpretResult = await ctx.runAction(
			api.timeline.interpret.interpretPendingEvents,
			{ productId }
		);

		return {
			...result,
			interpreted: interpretResult.processed,
			agentRunId: interpretResult.agentRunId ?? null,
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

		const result = await ctx.runAction(
			api.timeline.interpret.interpretPendingEvents,
			{
				productId,
				rawEventIds,
			}
		);

		return result;
	},
});

export const regenerateTimeline = action({
	args: {
		productId: v.id("products"),
	},
	handler: async (
		ctx,
		{ productId }
	): Promise<{
		attempted: number;
		processed: number;
		agentRunId?: Id<"agentRuns"> | null;
	}> => {
		await ctx.runQuery(internal.connectors.github.assertProductAccessForGithub, {
			productId,
		});

		let agentRunId: Id<"agentRuns"> | null = null;
		try {
			const created = await ctx.runMutation(api.agents.agentRuns.createAgentRun, {
				productId,
				useCase: "timeline_interpretation",
				agentName: "Timeline Context Interpreter Agent",
			});
			agentRunId = created.runId;
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId: created.runId,
				step: "Clearing existing interpretations",
				status: "info",
			});
		} catch {
			agentRunId = null;
		}

		const rawEvents: Array<{ _id: Id<"rawEvents"> }> = await ctx.runQuery(
			internal.timeline.interpret.getAllRawEventsForProduct,
			{ productId }
		);
		await ctx.runMutation(
			internal.timeline.interpret.deleteInterpretedEventsByProduct,
			{ productId }
		);

		const result: InterpretResult = await ctx.runAction(
			api.timeline.interpret.interpretPendingEvents,
			{
				productId,
				rawEventIds: rawEvents.map((event: { _id: Id<"rawEvents"> }) => event._id),
				agentRunId: agentRunId ?? undefined,
			}
		);

		return {
			attempted: result.attempted,
			processed: result.processed,
			agentRunId: result.agentRunId ?? agentRunId ?? null,
		};
	},
});

export const fullSyncTimeline = action({
	args: {
		productId: v.id("products"),
		connectionId: v.id("connections"),
	},
	handler: async (
		ctx,
		{ productId, connectionId }
	): Promise<{
		deletedRawEvents: number;
		deletedInterpretations: number;
		ingested: number;
		skipped: number;
		interpreted: number;
		agentRunId?: Id<"agentRuns"> | null;
	}> => {
		await ctx.runQuery(internal.connectors.github.assertProductAccessForGithub, {
			productId,
		});

		let agentRunId: Id<"agentRuns"> | null = null;
		try {
			const created = await ctx.runMutation(api.agents.agentRuns.createAgentRun, {
				productId,
				useCase: "timeline_interpretation",
				agentName: "Timeline Context Interpreter Agent",
			});
			agentRunId = created.runId;
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId: created.runId,
				step: "Starting full sync: clearing all data",
				status: "info",
			});
		} catch {
			agentRunId = null;
		}

		// Step 1: Delete interpreted events and bucket summaries
		const deleteResult = await ctx.runMutation(
			internal.timeline.interpret.deleteInterpretedEventsByProduct,
			{ productId }
		);

		if (agentRunId) {
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId: agentRunId,
				step: `Cleared ${deleteResult.deleted} interpretations and summaries`,
				status: "info",
			});
		}

		// Step 2: Delete raw events and reset lastSyncAt
		const clearResult = await ctx.runMutation(
			internal.connectors.github.clearRawEventsAndResetSync,
			{ productId, connectionId }
		);

		if (agentRunId) {
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId: agentRunId,
				step: `Cleared ${clearResult.deletedRawEvents} raw events, reset sync state`,
				status: "info",
			});
		}

		// Step 3: Full sync from GitHub (since=0 because lastSyncAt is now undefined)
		if (agentRunId) {
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId: agentRunId,
				step: "Fetching all events from GitHub",
				status: "info",
			});
		}

		const syncResult = await syncGithubConnectionHandler(ctx, { productId, connectionId });

		if (agentRunId) {
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId: agentRunId,
				step: `Ingested ${syncResult.ingested} events (${syncResult.skipped} skipped)`,
				status: "info",
			});
		}

		// Step 4: Get all raw events and interpret them
		const allRawEvents: Array<{ _id: Id<"rawEvents"> }> = await ctx.runQuery(
			internal.timeline.interpret.getAllRawEventsForProduct,
			{ productId }
		);

		if (agentRunId) {
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId: agentRunId,
				step: `Interpreting ${allRawEvents.length} events`,
				status: "info",
			});
		}

		const interpretResult: InterpretResult = await ctx.runAction(
			api.timeline.interpret.interpretPendingEvents,
			{
				productId,
				rawEventIds: allRawEvents.map((event) => event._id),
				agentRunId: agentRunId ?? undefined,
			}
		);

		return {
			deletedRawEvents: clearResult.deletedRawEvents,
			deletedInterpretations: deleteResult.deleted,
			ingested: syncResult.ingested,
			skipped: syncResult.skipped,
			interpreted: interpretResult.processed,
			agentRunId: interpretResult.agentRunId ?? agentRunId ?? null,
		};
	},
});

function buildSummary(payload: unknown, sourceType: string): string {
	const safe = toSafeString;
	const title = safe((payload as any)?.title ?? "");
	const body = safe((payload as any)?.body ?? "");
	const repo = safe((payload as any)?.repo?.fullName ?? "");

	const bodySnippet = body.length > 280 ? `${body.slice(0, 280)}...` : body;
	const parts = [
		sourceType ? `[${sourceType}]` : "",
		repo,
		title,
		bodySnippet,
	].filter((p) => p && p.length > 0);

	if (parts.length === 0) return "No summary available";
	return parts.join(" • ");
}

function toSafeString(value: unknown): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	return str
		.replace(/\\x[0-9A-Fa-f]{2}/g, "")
		.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}
