import { mutation, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { assertProductAccess } from "../lib/access";
import { Id } from "../_generated/dataModel";

const BATCH_SIZE = 200;
const BUGFIX_KEYWORDS = /(fix|bug|hotfix|patch)/i;

type RawEvent = {
	_id: Id<"rawEvents">;
	productId: Id<"products">;
	sourceType: "commit" | "pull_request" | "release";
	payload: {
		title?: string;
		body?: string;
		message?: string;
		occurredAt?: number;
		action?: string;
	};
	title?: string;
	occurredAt: number;
};

type Interpretation = {
	kind: string;
	title: string;
	summary?: string;
	relevance: number;
	occurredAt: number;
};

export const interpretPendingEvents = mutation({
	args: {
		productId: v.id("products"),
		rawEventIds: v.optional(v.array(v.id("rawEvents"))),
	},
	handler: async (ctx, { productId, rawEventIds }) => {
		await assertProductAccess(ctx, productId);

		const targetRawEvents = rawEventIds?.length
			? await loadRawEventsByIds(ctx, productId, rawEventIds)
			: await loadPendingRawEvents(ctx, productId);

		let processed = 0;
		let errors = 0;

		for (const rawEvent of targetRawEvents) {
			try {
				await deleteExistingInterpretations(ctx, rawEvent._id);

				const interpretation = interpretRawEvent(rawEvent);
				const now = Date.now();

				await ctx.db.insert("interpretedEvents", {
					productId,
					rawEventId: rawEvent._id,
					kind: interpretation.kind,
					title: interpretation.title,
					summary: interpretation.summary,
					occurredAt: interpretation.occurredAt,
					relevance: interpretation.relevance,
					createdAt: now,
					updatedAt: now,
				});

				await ctx.db.patch(rawEvent._id, {
					status: "processed",
					processedAt: now,
					lastError: undefined,
					updatedAt: now,
				});

				processed += 1;
			} catch (error) {
				errors += 1;
				await ctx.db.patch(rawEvent._id, {
					status: "error",
					lastError: error instanceof Error ? error.message : "Interpretation failed",
					updatedAt: Date.now(),
				});
			}
		}

		return {
			attempted: targetRawEvents.length,
			processed,
			errors,
			productId,
		};
	},
});

async function loadRawEventsByIds(
	ctx: MutationCtx,
	productId: Id<"products">,
	rawEventIds: Id<"rawEvents">[]
) {
	const events: RawEvent[] = [];

	for (const rawEventId of rawEventIds) {
		const rawEvent = await ctx.db.get(rawEventId);
		if (!rawEvent || rawEvent.productId !== productId) continue;

		events.push(rawEvent as RawEvent);
	}

	return events;
}

async function loadPendingRawEvents(
	ctx: MutationCtx,
	productId: Id<"products">
) {
	return ctx.db
		.query("rawEvents")
		.withIndex("by_product_time", (q) => q.eq("productId", productId))
		.filter((q) => q.eq(q.field("status"), "pending"))
		.take(BATCH_SIZE) as Promise<RawEvent[]>;
}

async function deleteExistingInterpretations(
	ctx: MutationCtx,
	rawEventId: Id<"rawEvents">
) {
	const existing = await ctx.db
		.query("interpretedEvents")
		.withIndex("by_raw_event", (q) => q.eq("rawEventId", rawEventId))
		.collect();

	for (const event of existing) {
		await ctx.db.delete(event._id);
	}
}

function interpretRawEvent(rawEvent: RawEvent): Interpretation {
	const payload = rawEvent.payload ?? {};
	const title = payload.title ?? rawEvent.title ?? formatFallbackTitle(rawEvent);
	const body = payload.body ?? payload.message;
	const summary = body ? body.trim() : undefined;

	const kind = classifyKind(rawEvent.sourceType, title, body, payload.action);
	const relevance = rawEvent.sourceType === "release" ? 5 : 3;
	const occurredAt =
		typeof payload.occurredAt === "number" ? payload.occurredAt : rawEvent.occurredAt;

	return {
		kind,
		title: title || "Event",
		summary,
		relevance,
		occurredAt,
	};
}

function classifyKind(
	sourceType: RawEvent["sourceType"],
	title?: string,
	body?: string,
	action?: string
) {
	if (sourceType === "release") return "release";
	if (sourceType === "commit") return "chore";

	const haystack = `${title ?? ""} ${body ?? ""}`.toLowerCase();
	const isBugfix = BUGFIX_KEYWORDS.test(haystack);

	if (sourceType === "pull_request") {
		return isBugfix ? "bugfix" : "feature";
	}

	if (action === "merged" && isBugfix) return "bugfix";
	return "feature";
}

function formatFallbackTitle(rawEvent: RawEvent) {
	switch (rawEvent.sourceType) {
		case "commit":
			return "Commit";
		case "pull_request":
			return "Pull request";
		case "release":
			return "Release";
		default:
			return "Event";
	}
}
