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
		focusAreas?: string[];
		features?: Array<{
			title: string;
			summary?: string;
			focusArea?: string;
			visibility?: "public" | "internal";
		}>;
		fixes?: Array<{
			title: string;
			summary?: string;
			focusArea?: string;
			visibility?: "public" | "internal";
		}>;
		improvements?: Array<{
			title: string;
			summary?: string;
			focusArea?: string;
			visibility?: "public" | "internal";
		}>;
		ongoingFocusAreas?: string[];
		bucketImpact?: number;
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

			const product = await ctx.runQuery(
				internal.agents.productContextData.getProductWithContext,
				{ productId },
			);
			const snapshot = product.currentProductSnapshot
				? await ctx.runQuery(
						internal.agents.productContextData.getContextSnapshotById,
						{ snapshotId: product.currentProductSnapshot },
					)
				: null;
			const releaseCadence =
				snapshot?.releaseCadence ?? product.releaseCadence ?? "unknown";
			const debugUi = snapshot?.context?.aiDebug === true;
			const normalizedCadence = normalizeCadence(releaseCadence);

			const buckets = bucketizeRawEvents(targetRawEvents, normalizedCadence);
			await recordStep(`Bucketing raw events into ${buckets.length} buckets`, "info");

			await recordStep("Classifying sources", "info");
			await ctx.runAction(api.agents.actions.classifySourceContext, { productId });
			const sourceContexts = await ctx.runQuery(
				internal.agents.sourceContextData.listSourceContexts,
				{ productId },
			);
			if (sourceContexts.length) {
				const summary = sourceContexts
					.slice(0, 5)
					.map((item) => `${item.sourceId} → ${item.classification}`)
					.join(" · ");
				const suffix =
					sourceContexts.length > 5
						? ` +${sourceContexts.length - 5} more`
						: "";
				await recordStep(`Source contexts: ${summary}${suffix}`, "info");
			}

			await recordStep("Refreshing feature map", "info");
			try {
				await ctx.runAction(api.agents.actions.refreshFeatureMap, {
					productId,
					debugUi,
				});
			} catch {
				await recordStep("Feature map refresh failed", "warn");
			}

			const now = Date.now();
			let processed = 0;
			const totalBuckets = buckets.length;
			let previousFocusAreas: string[] = [];
			for (const [index, bucket] of buckets.entries()) {
				const bucketLabel = formatBucketLabel(bucket.bucketStartAt, bucket.bucketEndAt);
				await recordStep(
					`Interpreting bucket ${index + 1}/${totalBuckets} (${bucketLabel})`,
					"info",
				);

				const interpretation: InterpretationOutput = await ctx.runAction(
					api.agents.actions.interpretTimelineEvents,
					{
						productId,
						rawEventIds: bucket.rawEvents.map(
							(event: { _id: Id<"rawEvents"> }) => event._id,
						),
						limit: bucket.rawEvents.length,
						debugUi,
						bucket: {
							bucketId: bucket.bucketId,
							bucketStartAt: bucket.bucketStartAt,
							bucketEndAt: bucket.bucketEndAt,
						},
					},
				);

				if (!interpretation.narratives.length) {
					throw new Error(
						`No narrative returned for bucket ${bucket.bucketId}`,
					);
				}
				if (interpretation.narratives.length > 1) {
					throw new Error(
						`Expected one narrative for bucket ${bucket.bucketId}, got ${interpretation.narratives.length}`,
					);
				}

				const { rawEventIds: _rawEventIds, ...narrativePayload } =
					interpretation.narratives[0];
				const focusAreas = narrativePayload.focusAreas ?? [];
				const ongoingFocusAreas = focusAreas.filter((area) =>
					previousFocusAreas.includes(area),
				);
				const bucketImpact = computeBucketImpact(bucket.rawEvents);
				previousFocusAreas = focusAreas;
				await recordStep(
					`Writing narrative for bucket ${index + 1}/${totalBuckets}`,
					"info",
				);
				await ctx.runMutation(internal.timeline.interpret.insertInterpretedEvent, {
					productId,
					narrative: {
						...narrativePayload,
						bucketId: bucket.bucketId,
						bucketStartAt: bucket.bucketStartAt,
						bucketEndAt: bucket.bucketEndAt,
						cadence: normalizedCadence,
						ongoingFocusAreas: ongoingFocusAreas.length ? ongoingFocusAreas : undefined,
						bucketImpact,
					},
					rawEventIds: bucket.rawEvents.map(
						(event: { _id: Id<"rawEvents"> }) => event._id,
					),
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
			domain: v.optional(v.string()),
			feature: v.optional(v.string()),
			relevance: v.optional(v.number()),
			focusAreas: v.optional(v.array(v.string())),
			features: v.optional(
				v.array(
					v.object({
						title: v.string(),
						summary: v.optional(v.string()),
						focusArea: v.optional(v.string()),
						visibility: v.optional(
							v.union(v.literal("public"), v.literal("internal")),
						),
					}),
				),
			),
			fixes: v.optional(
				v.array(
					v.object({
						title: v.string(),
						summary: v.optional(v.string()),
						focusArea: v.optional(v.string()),
						visibility: v.optional(
							v.union(v.literal("public"), v.literal("internal")),
						),
					}),
				),
			),
			improvements: v.optional(
				v.array(
					v.object({
						title: v.string(),
						summary: v.optional(v.string()),
						focusArea: v.optional(v.string()),
						visibility: v.optional(
							v.union(v.literal("public"), v.literal("internal")),
						),
					}),
				),
			),
			ongoingFocusAreas: v.optional(v.array(v.string())),
			bucketImpact: v.optional(v.number()),
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
		const contextSnapshotId = product?.currentProductSnapshot;

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
			domain: narrative.domain,
			feature: narrative.feature,
			relevance: narrative.relevance,
			focusAreas: narrative.focusAreas,
			features: narrative.features,
			fixes: narrative.fixes,
			improvements: narrative.improvements,
			ongoingFocusAreas: narrative.ongoingFocusAreas,
			bucketImpact: narrative.bucketImpact,
			rawEventIds,
			rawEventCount: rawEventIds.length,
			contextSnapshotId: contextSnapshotId ?? undefined,
			inferenceLogId,
			createdAt: now,
			updatedAt: now,
		});
	},
});

type BucketedRawEvents = {
	bucketId: string;
	bucketStartAt: number;
	bucketEndAt: number;
	rawEvents: RawEvent[];
};

function normalizeCadence(value: string): string {
	switch (value) {
		case "continuous":
			return "every_2_days";
		case "quarterly":
			return "quarterly";
		case "every_2_days":
		case "twice_weekly":
		case "weekly":
		case "biweekly":
		case "monthly":
		case "irregular":
		case "unknown":
			return value;
		default:
			return "unknown";
	}
}

function bucketizeRawEvents(
	rawEvents: RawEvent[],
	cadence: string,
): BucketedRawEvents[] {
	const buckets = new Map<string, BucketedRawEvents>();
	for (const event of rawEvents) {
		const bucket = getBucketForTimestamp(event.occurredAt, cadence);
		const existing = buckets.get(bucket.bucketId);
		if (existing) {
			existing.rawEvents.push(event);
		} else {
			buckets.set(bucket.bucketId, { ...bucket, rawEvents: [event] });
		}
	}

	return Array.from(buckets.values()).sort(
		(a, b) => a.bucketStartAt - b.bucketStartAt,
	);
}

function getBucketForTimestamp(
	timestamp: number,
	cadence: string,
): Omit<BucketedRawEvents, "rawEvents"> {
	const dayMs = 24 * 60 * 60 * 1000;
	const date = new Date(timestamp);
	const startOfDay = Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
	);

	switch (cadence) {
		case "every_2_days": {
			const base = Date.UTC(1970, 0, 1);
			const offset = startOfDay - base;
			const start = base + Math.floor(offset / (2 * dayMs)) * 2 * dayMs;
			const end = start + 2 * dayMs;
			return {
				bucketId: formatDateId(start),
				bucketStartAt: start,
				bucketEndAt: end,
			};
		}
		case "twice_weekly": {
			const { weekStart, isoYear, isoWeek } = getWeekStart(date);
			const dayOfWeek = date.getUTCDay() || 7;
			const isFirstHalf = dayOfWeek <= 4;
			const start = isFirstHalf ? weekStart : weekStart + 4 * dayMs;
			const end = isFirstHalf ? weekStart + 4 * dayMs : weekStart + 7 * dayMs;
			return {
				bucketId: `${isoYear}-W${padWeek(isoWeek)}-${isFirstHalf ? "A" : "B"}`,
				bucketStartAt: start,
				bucketEndAt: end,
			};
		}
		case "weekly": {
			const { weekStart, isoYear, isoWeek } = getWeekStart(date);
			return {
				bucketId: `${isoYear}-W${padWeek(isoWeek)}`,
				bucketStartAt: weekStart,
				bucketEndAt: weekStart + 7 * dayMs,
			};
		}
		case "biweekly": {
			const year = date.getUTCFullYear();
			const month = date.getUTCMonth();
			const day = date.getUTCDate();
			const start =
				day <= 15
					? Date.UTC(year, month, 1)
					: Date.UTC(year, month, 16);
			const end =
				day <= 15
					? Date.UTC(year, month, 16)
					: Date.UTC(year, month + 1, 1);
			return {
				bucketId: `${year}-${padMonth(month + 1)}-${day <= 15 ? "Q1" : "Q2"}`,
				bucketStartAt: start,
				bucketEndAt: end,
			};
		}
		case "monthly": {
			const year = date.getUTCFullYear();
			const month = date.getUTCMonth();
			const start = Date.UTC(year, month, 1);
			const end = Date.UTC(year, month + 1, 1);
			return {
				bucketId: `${year}-${padMonth(month + 1)}`,
				bucketStartAt: start,
				bucketEndAt: end,
			};
		}
		case "quarterly": {
			const year = date.getUTCFullYear();
			const month = date.getUTCMonth();
			const quarter = Math.floor(month / 3) + 1;
			const start = Date.UTC(year, (quarter - 1) * 3, 1);
			const end = Date.UTC(year, quarter * 3, 1);
			return {
				bucketId: `${year}-Q${quarter}`,
				bucketStartAt: start,
				bucketEndAt: end,
			};
		}
		case "irregular":
		case "unknown":
		default: {
			const base = Date.UTC(1970, 0, 1);
			const offset = startOfDay - base;
			const window = 30 * dayMs;
			const start = base + Math.floor(offset / window) * window;
			const end = start + window;
			return {
				bucketId: `rolling-30d-${formatDateId(start)}`,
				bucketStartAt: start,
				bucketEndAt: end,
			};
		}
	}
}

function formatBucketLabel(start: number, end: number): string {
	return `${formatDateId(start)} → ${formatDateId(end - 1)}`;
}

function formatDateId(timestamp: number): string {
	const date = new Date(timestamp);
	return `${date.getUTCFullYear()}-${padMonth(
		date.getUTCMonth() + 1,
	)}-${padMonth(date.getUTCDate())}`;
}

function padMonth(value: number): string {
	return value.toString().padStart(2, "0");
}

function padWeek(value: number): string {
	return value.toString().padStart(2, "0");
}

function getWeekStart(date: Date): { weekStart: number; isoYear: number; isoWeek: number } {
	const utcDate = new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
	const day = utcDate.getUTCDay() || 7;
	const weekStartDate = new Date(utcDate);
	weekStartDate.setUTCDate(utcDate.getUTCDate() - day + 1);

	const thursday = new Date(utcDate);
	thursday.setUTCDate(utcDate.getUTCDate() + 4 - day);
	const isoYear = thursday.getUTCFullYear();
	const yearStart = Date.UTC(isoYear, 0, 1);
	const isoWeek = Math.ceil(((thursday.getTime() - yearStart) / 86400000 + 1) / 7);

	return { weekStart: weekStartDate.getTime(), isoYear, isoWeek };
}

function computeBucketImpact(rawEvents: RawEvent[]): number {
	const count = rawEvents.length;
	let score = 1;

	if (count >= 12) score += 2;
	else if (count >= 6) score += 1;

	const sourceTypes = new Set(rawEvents.map((event) => event.sourceType));
	if (sourceTypes.size > 1) score += 1;

	const summaryText = rawEvents
		.map((event) => buildSummary(event.payload, event.sourceType))
		.join(" ")
		.toLowerCase();
	const impactKeywords =
		/(launch|release|major|breaking|redesign|security|performance|stability|scalability|migration|rollout)/;
	if (impactKeywords.test(summaryText)) score += 1;

	return Math.min(5, Math.max(1, score));
}

function buildSummary(payload: unknown, sourceType: string): string {
	const safe = toSafeString;
	const title = safe((payload as any)?.title ?? "");
	const body = safe((payload as any)?.body ?? "");
	const repo = safe((payload as any)?.repo?.fullName ?? "");

	const bodySnippet = body.length > 140 ? `${body.slice(0, 140)}...` : body;
	const parts = [
		sourceType ? `[${sourceType}]` : "",
		repo,
		title,
		bodySnippet,
	].filter((p) => p && p.length > 0);

	if (parts.length === 0) return "";
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
