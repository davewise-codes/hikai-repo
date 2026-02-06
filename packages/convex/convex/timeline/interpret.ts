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
const BUCKETS_PER_BATCH = 3;
const MAX_EVENTS_PER_CHUNK = 50;
type RawEvent = {
	_id: Id<"rawEvents">;
	productId: Id<"products">;
	sourceType: "commit" | "pull_request" | "release";
	occurredAt: number;
	payload: unknown;
};

type ChunkedBucket = {
	bucketId: string;
	bucketStartAt: number;
	bucketEndAt: number;
	chunkIndex: number;
	totalChunks: number;
	rawEvents: RawEvent[];
};

type InterpretResult = {
	attempted: number;
	processed: number;
	errors: number;
	productId: Id<"products">;
	queued?: boolean;
	remainingBatches?: number;
	totalBatches?: number;
};

type InterpretationOutput = {
	bucket: {
		bucketId: string;
		bucketStartAt: number;
		bucketEndAt: number;
		cadence: string;
		title: string;
		narrative?: string;
		domains?: string[];
	};
	events: Array<{
		capabilitySlug?: string | null;
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
		visibility?: "public" | "internal";
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

		const summaries = await ctx.db
			.query("bucketSummaries")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.collect();
		for (const summary of summaries) {
			await ctx.db.delete(summary._id);
		}

		return { deleted: existing.length + summaries.length };
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
		bucketCursor: v.optional(v.number()),
	},
	handler: async (
		ctx: ActionCtx,
		{ productId, rawEventIds, agentRunId, bucketCursor }
	): Promise<InterpretResult & { agentRunId: Id<"agentRuns"> | null }> => {
		await ctx.runQuery(internal.lib.access.assertProductAccessSystem, {
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
			await ctx.runMutation(internal.agents.agentRuns.appendStepSystem, {
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
			await ctx.runMutation(internal.agents.agentRuns.finishRunSystem, {
				productId,
				runId,
				status,
				errorMessage,
			});
		};

		try {
			await recordStep("Loading raw events", "info");
			const cursor = Math.max(0, bucketCursor ?? 0);
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
				return {
					attempted: 0,
					processed: 0,
					errors: 0,
					productId,
					agentRunId: runId,
				};
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
			const snapshotId = snapshot?._id;
			let contextDetail: Record<string, unknown> | null =
				(snapshot?.contextDetail as Record<string, unknown> | null) ?? null;

			const buckets = bucketizeRawEvents(targetRawEvents, normalizedCadence);
			const totalBuckets = buckets.length;
			const totalBatches = Math.max(
				1,
				Math.ceil(totalBuckets / BUCKETS_PER_BATCH),
			);
			const batchIndex = Math.floor(cursor / BUCKETS_PER_BATCH) + 1;
			const batchBuckets = buckets.slice(
				cursor,
				cursor + BUCKETS_PER_BATCH,
			);

			if (!batchBuckets.length) {
				await recordStep("No buckets left to process", "warn");
				await finishRun("success");
				return {
					attempted: targetRawEvents.length,
					processed: 0,
					errors: 0,
					productId,
					agentRunId: runId,
				};
			}

			if (cursor === 0) {
				await recordStep(
					`Bucketing raw events into ${totalBuckets} buckets`,
					"info",
				);
			} else {
				await recordStep(
					`Resuming bucket processing (batch ${batchIndex}/${totalBatches})`,
					"info",
				);
			}

			if (cursor === 0) {
				const sourceContexts = await ctx.runQuery(
					internal.agents.sourceContextData.listSourceContexts,
					{ productId },
				);
				if (!sourceContexts.length) {
					await recordStep("Classifying sources (first run)", "info");
					await ctx.runAction(api.agents.actions.classifySourceContext, {
						productId,
					});
				} else {
					await recordStep(
						`Using ${sourceContexts.length} existing source contexts`,
						"info",
					);
				}
			}

			const now = Date.now();
			let processed = 0;
			let errors = 0;
			await recordStep(
				`Processing batch ${batchIndex}/${totalBatches} (${batchBuckets.length} buckets)`,
				"info",
			);
			const discoveredDomains: Array<{ name?: string; purpose?: string }> = [];

			for (const [bucketIndex, bucket] of batchBuckets.entries()) {
				const bucketLabel = formatBucketLabel(bucket.bucketStartAt, bucket.bucketEndAt);
				const chunks = chunkBucket(bucket, MAX_EVENTS_PER_CHUNK);
				await recordStep(
					`Processing bucket ${cursor + bucketIndex + 1}/${totalBuckets} (${bucketLabel}) - ${chunks.length} chunk(s)`,
					"info",
				);

				const allChunkEvents: InterpretationOutput["events"] = [];
				let lastInterpretation: InterpretationOutput | null = null;
				let previousEventsSummary: string | null = null;

				for (const [chunkIndex, chunk] of chunks.entries()) {
					const isLastChunk = chunkIndex === chunks.length - 1;
					await recordStep(
						`Interpreting chunk ${chunkIndex + 1}/${chunks.length} of bucket ${bucketIndex + 1}`,
						"info",
					);

					try {
						const interpretation: InterpretationOutput = await ctx.runAction(
							api.agents.actions.interpretTimelineEvents,
							{
								productId,
								rawEventIds: chunk.rawEvents.map(
									(event: { _id: Id<"rawEvents"> }) => event._id,
								),
								limit: chunk.rawEvents.length,
								debugUi,
								system: true,
								bucket: {
									bucketId: chunk.bucketId,
									bucketStartAt: chunk.bucketStartAt,
									bucketEndAt: chunk.bucketEndAt,
								},
								chunkContext: {
									chunkIndex: chunk.chunkIndex,
									totalChunks: chunk.totalChunks,
									isLastChunk,
									previousEventsSummary: previousEventsSummary ?? undefined,
								},
							},
							);

							allChunkEvents.push(...interpretation.events);
							lastInterpretation = interpretation;
							if (interpretation.newDomains?.length) {
								discoveredDomains.push(...interpretation.newDomains);
							}

							if (!isLastChunk) {
								previousEventsSummary = summarizeEventsForNextChunk(allChunkEvents);
							}
						} catch (error) {
						await recordStep(
							`Chunk ${chunkIndex + 1}/${chunks.length} failed: ${
								error instanceof Error ? error.message : "unknown"
							}`,
							"warn",
						);
						errors += 1;
					}
				}

				if (lastInterpretation && allChunkEvents.length > 0) {
					const bucketImpact = computeBucketImpact(bucket.rawEvents);
					await recordStep(
						`Writing interpretation for bucket ${cursor + bucketIndex + 1}/${totalBuckets}`,
						"info",
					);
					await ctx.runMutation(internal.timeline.interpret.insertBucketSummary, {
						productId,
						bucket: {
							bucketId: lastInterpretation.bucket.bucketId,
							bucketStartAt: lastInterpretation.bucket.bucketStartAt,
							bucketEndAt: lastInterpretation.bucket.bucketEndAt,
							cadence: lastInterpretation.bucket.cadence,
							title: lastInterpretation.bucket.title,
							narrative: lastInterpretation.bucket.narrative,
							domains: lastInterpretation.bucket.domains,
							eventCount: allChunkEvents.length,
						},
						createdAt: now,
					});

					for (const event of allChunkEvents) {
						const normalizedType =
							event.type === "other"
								? "work"
								: ["feature", "fix", "improvement", "work"].includes(event.type)
									? event.type
									: "work";
						await ctx.runMutation(internal.timeline.interpret.insertInterpretedEvent, {
							productId,
							event: {
								bucketId: lastInterpretation.bucket.bucketId,
								bucketStartAt: lastInterpretation.bucket.bucketStartAt,
								bucketEndAt: lastInterpretation.bucket.bucketEndAt,
								cadence: lastInterpretation.bucket.cadence,
								capabilitySlug: event.capabilitySlug ?? undefined,
								domain: event.domain,
								type: normalizedType,
								title: event.title,
								summary: event.summary,
								visibility: event.visibility ?? "public",
								relevance: event.relevance,
								bucketImpact,
								surface: event.surface,
							},
							rawEventIds: event.rawEventIds.map(
								(rawEventId) => rawEventId as Id<"rawEvents">,
							),
							inferenceLogId: lastInterpretation.inferenceLogId,
							createdAt: now,
						});
					}

					processed += allChunkEvents.length;
				}
			}

			if (snapshotId && discoveredDomains.length) {
				const normalizedDomains = discoveredDomains
					.map((domain) => ({
						name:
							typeof domain.name === "string" ? domain.name.trim() : "",
						purpose:
							typeof domain.purpose === "string" ? domain.purpose.trim() : undefined,
					}))
					.filter((domain) => domain.name.length > 0);

				if (normalizedDomains.length) {
					const existingDomains = Array.isArray(
						(contextDetail as { domains?: unknown })?.domains,
					)
						? (((contextDetail as { domains?: unknown })?.domains ??
								[]) as Array<Record<string, unknown>>)
						: [];
					const seen = new Set(
						existingDomains
							.map((domain) =>
								typeof domain?.name === "string"
									? domain.name.trim().toLowerCase()
									: "",
							)
							.filter((name) => name.length > 0),
					);
					const nextDomains = [...existingDomains];
					normalizedDomains.forEach((domain) => {
						const key = domain.name.toLowerCase();
						if (seen.has(key)) return;
						seen.add(key);
						nextDomains.push({
							name: domain.name,
							purpose: domain.purpose,
							pathPatterns: [],
							schemaEntities: [],
							capabilities: [],
						});
					});

					if (nextDomains.length > existingDomains.length) {
						const nextContextDetail = {
							...(contextDetail ?? {}),
							domains: nextDomains,
						};
						await ctx.runMutation(
							internal.agents.productContextData.updateContextSnapshot,
							{
								snapshotId,
								contextDetail: nextContextDetail,
							},
						);
						contextDetail = nextContextDetail;
						await recordStep(
							`Discovered ${nextDomains.length - existingDomains.length} new domains`,
							"info",
						);
					}
				}
			}

			const batchRawEventIds = batchBuckets.flatMap((bucket) =>
				bucket.rawEvents.map((event) => event._id),
			);
			if (batchRawEventIds.length) {
				await ctx.runMutation(internal.timeline.interpret.markRawEventsProcessed, {
					rawEventIds: batchRawEventIds,
				});
			}

			const nextCursor = cursor + BUCKETS_PER_BATCH;
			if (nextCursor < totalBuckets) {
				await recordStep(
					`Queued batch ${batchIndex + 1}/${totalBatches}`,
					"info",
				);
				await ctx.scheduler.runAfter(
					0,
					api.timeline.interpret.interpretPendingEvents,
					{
						productId,
						rawEventIds: targetRawEvents.map(
							(event: { _id: Id<"rawEvents"> }) => event._id,
						),
						agentRunId: runId ?? undefined,
						bucketCursor: nextCursor,
					},
				);

				return {
					attempted: targetRawEvents.length,
					processed,
					errors,
					productId,
					agentRunId: runId,
					queued: true,
					remainingBatches: totalBatches - (batchIndex + 1),
					totalBatches,
				};
			}

			await recordStep(
				`Created ${processed} interpreted events in final batch`,
				"success",
			);
			await finishRun("success");

			return {
				attempted: targetRawEvents.length,
				processed,
				errors,
				productId,
				agentRunId: runId,
				queued: false,
				remainingBatches: 0,
				totalBatches,
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

export const insertBucketSummary = internalMutation({
	args: {
		productId: v.id("products"),
		bucket: v.object({
			bucketId: v.string(),
			bucketStartAt: v.number(),
			bucketEndAt: v.number(),
			cadence: v.string(),
			title: v.string(),
			narrative: v.optional(v.string()),
			domains: v.optional(v.array(v.string())),
			eventCount: v.number(),
		}),
		createdAt: v.number(),
	},
	handler: async (ctx, { productId, bucket, createdAt }) => {
		const now = createdAt;
		await ctx.db.insert("bucketSummaries", {
			productId,
			bucketId: bucket.bucketId,
			bucketStartAt: bucket.bucketStartAt,
			bucketEndAt: bucket.bucketEndAt,
			cadence: bucket.cadence,
			title: bucket.title,
			narrative: bucket.narrative,
			domains: bucket.domains,
			eventCount: bucket.eventCount,
			createdAt: now,
			updatedAt: now,
		});
	},
});

export const insertInterpretedEvent = internalMutation({
	args: {
		productId: v.id("products"),
		event: v.object({
			bucketId: v.string(),
			bucketStartAt: v.number(),
			bucketEndAt: v.number(),
			cadence: v.string(),
			capabilitySlug: v.optional(v.string()),
			domain: v.optional(v.string()),
			surface: v.union(
				v.literal("product_front"),
				v.literal("platform"),
				v.literal("infra"),
				v.literal("marketing"),
				v.literal("doc"),
				v.literal("management"),
				v.literal("admin"),
				v.literal("analytics"),
			),
			type: v.union(
				v.literal("feature"),
				v.literal("fix"),
				v.literal("improvement"),
				v.literal("work"),
				v.literal("other"),
			),
			title: v.string(),
			summary: v.optional(v.string()),
			visibility: v.union(v.literal("public"), v.literal("internal")),
			relevance: v.optional(v.number()),
			bucketImpact: v.optional(v.number()),
		}),
		rawEventIds: v.array(v.id("rawEvents")),
		inferenceLogId: v.optional(v.id("aiInferenceLogs")),
		createdAt: v.number(),
	},
	handler: async (
		ctx,
		{ productId, event, rawEventIds, inferenceLogId, createdAt },
	) => {
		const now = createdAt;
		const product = await ctx.db.get(productId);
		const contextSnapshotId = product?.currentProductSnapshot;

		await ctx.db.insert("interpretedEvents", {
			productId,
			bucketId: event.bucketId,
			bucketStartAt: event.bucketStartAt,
			bucketEndAt: event.bucketEndAt,
			cadence: event.cadence,
			occurredAt: event.bucketStartAt,
			capabilitySlug: event.capabilitySlug,
			domain: event.domain,
			surface: event.surface,
			type: event.type,
			title: event.title,
			summary: event.summary,
			visibility: event.visibility,
			relevance: event.relevance,
			bucketImpact: event.bucketImpact,
			rawEventIds,
			rawEventCount: rawEventIds.length,
			contextSnapshotId: contextSnapshotId ?? undefined,
			inferenceLogId,
			createdAt: now,
			updatedAt: now,
		});
	},
});

function chunkBucket(
	bucket: { bucketId: string; bucketStartAt: number; bucketEndAt: number; rawEvents: RawEvent[] },
	maxEventsPerChunk: number,
): ChunkedBucket[] {
	const chunks: ChunkedBucket[] = [];
	const totalChunks = Math.ceil(bucket.rawEvents.length / maxEventsPerChunk);
	for (let i = 0; i < totalChunks; i += 1) {
		const start = i * maxEventsPerChunk;
		const end = Math.min(start + maxEventsPerChunk, bucket.rawEvents.length);
		chunks.push({
			bucketId: bucket.bucketId,
			bucketStartAt: bucket.bucketStartAt,
			bucketEndAt: bucket.bucketEndAt,
			chunkIndex: i,
			totalChunks,
			rawEvents: bucket.rawEvents.slice(start, end),
		});
	}
	return chunks;
}

function summarizeEventsForNextChunk(
	events: InterpretationOutput["events"],
): string {
	if (events.length === 0) return "";
	const byType = new Map<string, number>();
	const domains = new Set<string>();
	for (const event of events) {
		byType.set(event.type, (byType.get(event.type) ?? 0) + 1);
		if (event.domain) domains.add(event.domain);
	}
	const typeSummary = Array.from(byType.entries())
		.map(([type, count]) => `${count} ${type}`)
		.join(", ");
	const domainList = Array.from(domains).slice(0, 5).join(", ");
	return `Previous chunks: ${events.length} events (${typeSummary}). Domains touched: ${domainList}`;
}

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
