import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

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

export const saveProductContext = internalMutation({
	args: {
		productId: v.id("products"),
		entry: v.any(),
		languagePreference: v.string(),
		timestamp: v.number(),
	},
	handler: async (ctx, { productId, entry, languagePreference, timestamp }) => {
		const product = await ctx.db.get(productId);
		if (!product) {
			throw new Error("Producto no encontrado");
		}

		const history = [
			...(product.productContext?.history ?? []),
			...(product.productContext?.current ? [product.productContext.current] : []),
		];

		await ctx.db.patch(productId, {
			productContext: {
				current: entry,
				history,
			},
			languagePreference,
			updatedAt: timestamp,
		});
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
