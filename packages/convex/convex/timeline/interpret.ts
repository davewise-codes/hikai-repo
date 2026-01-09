import {
	action,
	internalMutation,
	internalQuery,
	type ActionCtx,
	type MutationCtx,
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

const BATCH_SIZE = 200;
type RawEvent = {
	_id: Id<"rawEvents">;
	productId: Id<"products">;
	sourceType: "commit" | "pull_request" | "release";
	occurredAt: number;
	payload: unknown;
};

type InterpretResult = {
	attempted: number;
	processed: number;
	errors: number;
	productId: Id<"products">;
};

type InterpretationOutput = {
	narratives: Array<{
		bucketId: string;
		bucketStartAt: number;
		bucketEndAt: number;
		cadence: string;
		title: string;
		summary?: string;
		narrative?: string;
		kind: string;
		tags?: string[];
		audience?: string;
		feature?: string;
		relevance?: number;
		rawEventIds: string[];
	}>;
	inferenceLogId?: Id<"aiInferenceLogs">;
};

export const getPendingRawEvents = internalQuery({
	args: {
		productId: v.id("products"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { productId, limit }) => {
		return ctx.db
			.query("rawEvents")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.filter((q) => q.eq(q.field("status"), "pending"))
			.take(limit ?? BATCH_SIZE) as Promise<RawEvent[]>;
	},
});

export const getAllRawEventsForProduct = internalQuery({
	args: {
		productId: v.id("products"),
	},
	handler: async (ctx, { productId }) => {
		return ctx.db
			.query("rawEvents")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.collect() as Promise<RawEvent[]>;
	},
});

export const getRawEventsByIds = internalQuery({
	args: {
		productId: v.id("products"),
		rawEventIds: v.array(v.id("rawEvents")),
	},
	handler: async (ctx, { productId, rawEventIds }) => {
		const events: RawEvent[] = [];
		for (const rawEventId of rawEventIds) {
			const rawEvent = await ctx.db.get(rawEventId);
			if (!rawEvent || rawEvent.productId !== productId) continue;
			events.push(rawEvent as RawEvent);
		}
		return events;
	},
});

export const deleteInterpretedEventsByProduct = internalMutation({
	args: {
		productId: v.id("products"),
	},
	handler: async (ctx, { productId }) => {
		const existing = await ctx.db
			.query("interpretedEvents")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.collect();

		for (const event of existing) {
			await ctx.db.delete(event._id);
		}

		return { deleted: existing.length };
	},
});

export const markRawEventsProcessed = internalMutation({
	args: {
		rawEventIds: v.array(v.id("rawEvents")),
	},
	handler: async (ctx, { rawEventIds }) => {
		const now = Date.now();
		for (const rawEventId of rawEventIds) {
			await ctx.db.patch(rawEventId, {
				status: "processed",
				processedAt: now,
				lastError: undefined,
				updatedAt: now,
			});
		}
	},
});

export const interpretPendingEvents = action({
	args: {
		productId: v.id("products"),
		rawEventIds: v.optional(v.array(v.id("rawEvents"))),
		agentRunId: v.optional(v.id("agentRuns")),
	},
	handler: async (
		ctx: ActionCtx,
		{ productId, rawEventIds, agentRunId }
	): Promise<InterpretResult & { agentRunId: Id<"agentRuns"> | null }> => {
		await ctx.runQuery(internal.lib.access.assertProductAccessInternal, {
			productId,
		});

		let runId = agentRunId ?? null;
		if (!runId) {
			try {
				const created = await ctx.runMutation(api.agents.agentRuns.createAgentRun, {
					productId,
					useCase: "timeline_interpretation",
					agentName: "Timeline Context Interpreter Agent",
				});
				runId = created.runId;
			} catch {
				runId = null;
			}
		}

		const recordStep = async (step: string, status: "info" | "success" | "warn" | "error") => {
			if (!runId) return;
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step,
				status,
			});
		};

		const finishRun = async (
			status: "success" | "error",
			errorMessage?: string
		) => {
			if (!runId) return;
			await ctx.runMutation(internal.agents.agentRuns.finishRun, {
				productId,
				runId,
				status,
				errorMessage,
			});
		};

		try {
			await recordStep("Loading raw events", "info");
			const targetRawEvents = rawEventIds?.length
				? await ctx.runQuery(internal.timeline.interpret.getRawEventsByIds, {
						productId,
						rawEventIds,
					})
				: await ctx.runQuery(internal.timeline.interpret.getPendingRawEvents, {
						productId,
					});

			if (!targetRawEvents.length) {
				await recordStep("No raw events to interpret", "warn");
				await finishRun("success");
				return { attempted: 0, processed: 0, errors: 0, productId, agentRunId: runId };
			}

			await recordStep("Interpreting with agent", "info");
			const interpretation: InterpretationOutput = await ctx.runAction(
				api.agents.actions.interpretTimelineEvents,
				{
					productId,
					rawEventIds: targetRawEvents.map(
						(event: { _id: Id<"rawEvents"> }) => event._id,
					),
					limit: targetRawEvents.length,
				},
			);

			await recordStep("Writing narratives", "info");
			const now = Date.now();
			let processed = 0;
			const validRawEventIds = new Set(
				targetRawEvents.map((event) => event._id),
			);

			for (const narrative of interpretation.narratives) {
				const { rawEventIds, ...narrativePayload } = narrative;
				const rawEventIdsForNarrative = Array.from(
					new Set(
						rawEventIds.filter((rawEventId) =>
							validRawEventIds.has(rawEventId as Id<"rawEvents">),
						),
					),
				).map((rawEventId) => rawEventId as Id<"rawEvents">);

				if (!rawEventIdsForNarrative.length) {
					await recordStep(
						`Skipped narrative without valid rawEventIds: ${narrative.title}`,
						"warn",
					);
					continue;
				}

				await ctx.runMutation(internal.timeline.interpret.insertInterpretedEvent, {
					productId,
					narrative: narrativePayload,
					rawEventIds: rawEventIdsForNarrative,
					inferenceLogId: interpretation.inferenceLogId,
					createdAt: now,
				});

				processed += 1;
			}

			await ctx.runMutation(internal.timeline.interpret.markRawEventsProcessed, {
				rawEventIds: targetRawEvents.map(
					(event: { _id: Id<"rawEvents"> }) => event._id,
				),
			});

			await recordStep(
				`Created ${processed} narratives from ${targetRawEvents.length} raw events`,
				"success",
			);
			await finishRun("success");

			return {
				attempted: targetRawEvents.length,
				processed,
				errors: 0,
				productId,
				agentRunId: runId,
			};
		} catch (error) {
			await recordStep(
				`Failed: ${error instanceof Error ? error.message : "unknown error"}`,
				"error",
			);
			await finishRun(
				"error",
				error instanceof Error ? error.message : "Unknown error",
			);
			throw error;
		}
	},
});

export const insertInterpretedEvent = internalMutation({
	args: {
		productId: v.id("products"),
		narrative: v.object({
			bucketId: v.string(),
			bucketStartAt: v.number(),
			bucketEndAt: v.number(),
			cadence: v.string(),
			title: v.string(),
			summary: v.optional(v.string()),
			narrative: v.optional(v.string()),
			kind: v.string(),
			tags: v.optional(v.array(v.string())),
			audience: v.optional(v.string()),
			feature: v.optional(v.string()),
			relevance: v.optional(v.number()),
		}),
		rawEventIds: v.array(v.id("rawEvents")),
		inferenceLogId: v.optional(v.id("aiInferenceLogs")),
		createdAt: v.number(),
	},
	handler: async (
		ctx,
		{ productId, narrative, rawEventIds, inferenceLogId, createdAt },
	) => {
		const now = createdAt;
		const product = await ctx.db.get(productId);
		const contextSnapshotId = product?.currentContextSnapshotId;

		await ctx.db.insert("interpretedEvents", {
			productId,
			bucketId: narrative.bucketId,
			bucketStartAt: narrative.bucketStartAt,
			bucketEndAt: narrative.bucketEndAt,
			cadence: narrative.cadence,
			occurredAt: narrative.bucketStartAt,
			title: narrative.title,
			summary: narrative.summary,
			narrative: narrative.narrative,
			kind: narrative.kind,
			tags: narrative.tags,
			audience: narrative.audience,
			feature: narrative.feature,
			relevance: narrative.relevance,
			rawEventIds,
			rawEventCount: rawEventIds.length,
			contextSnapshotId: contextSnapshotId ?? undefined,
			inferenceLogId,
			createdAt: now,
			updatedAt: now,
		});
	},
});
