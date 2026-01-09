import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

export const getProductWithContext = internalQuery({
	args: {
		productId: v.id("products"),
	},
	handler: async (ctx, { productId }) => {
		const product = await ctx.db.get(productId);
		if (!product) {
			throw new Error("Producto no encontrado");
		}
		return product;
	},
});

export const getContextSnapshotById = internalQuery({
	args: {
		snapshotId: v.id("productContextSnapshots"),
	},
	handler: async (ctx, { snapshotId }) => {
		return ctx.db.get(snapshotId);
	},
});

export const listRawEventSummaries = internalQuery({
	args: {
		productId: v.id("products"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { productId, limit }) => {
		const events = await ctx.db
			.query("rawEvents")
			.withIndex("by_product_time", (q) => q.eq("productId", productId))
			.order("desc")
			.take(limit ?? 50);

		return events.map((event) => ({
			source: event.provider,
			rawEventId: `${event._id}`,
			type: event.sourceType,
			summary: buildSummary(event.payload, event.sourceType),
			occurredAt: event.occurredAt,
		}));
	},
});

export const getRawEventSummariesByIds = internalQuery({
	args: {
		productId: v.id("products"),
		rawEventIds: v.array(v.id("rawEvents")),
	},
	handler: async (ctx, { productId, rawEventIds }) => {
		const events = [];
		for (const rawEventId of rawEventIds) {
			const event = await ctx.db.get(rawEventId);
			if (!event || event.productId !== productId) continue;
			events.push(event);
		}

		return events.map((event) => ({
			source: event.provider,
			rawEventId: `${event._id}`,
			type: event.sourceType,
			summary: buildSummary(event.payload, event.sourceType),
			occurredAt: event.occurredAt,
		}));
	},
});

export const getRepositoryMetadata = internalQuery({
	args: { productId: v.id("products") },
	handler: async (ctx, { productId }) => {
		const connections = await ctx.db
			.query("connections")
			.withIndex("by_product", (q) => q.eq("productId", productId))
			.collect();

		const metadata = await Promise.all(
			connections.map(async (connection) => {
				const connectorType = await ctx.db.get(connection.connectorTypeId);
				if (connectorType?.provider !== "github") return null;
				if (connection.status !== "active") return null;
				const installationId =
					typeof connection.config?.installationId === "string"
						? (connection.config.installationId as string)
						: null;
				if (!installationId) return null;

				return {
					connectionId: connection._id,
					installationId,
				};
			}),
		);

		return metadata.filter(
			(item): item is { connectionId: Id<"connections">; installationId: string } =>
				Boolean(item),
		);
	},
});

export const saveProductContext = internalMutation({
	args: {
		productId: v.id("products"),
		context: v.any(),
		baseline: v.any(),
		releaseCadence: v.optional(v.string()),
		languagePreference: v.string(),
		timestamp: v.number(),
	},
	handler: async (
		ctx,
		{ productId, context, baseline, releaseCadence, languagePreference, timestamp },
	) => {
		const product = await ctx.db.get(productId);
		if (!product) {
			throw new Error("Producto no encontrado");
		}

		const snapshotId = await ctx.db.insert("productContextSnapshots", {
			productId,
			version: Number(context?.version ?? 0),
			createdAt: Number(context?.createdAt ?? timestamp),
			createdBy: context?.createdBy,
			baseline,
			context,
			releaseCadence,
			languagePreference,
		});

		await ctx.db.patch(productId, {
			currentContextSnapshotId: snapshotId,
			languagePreference,
			updatedAt: timestamp,
		});

		return { snapshotId };
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
