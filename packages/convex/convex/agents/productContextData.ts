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
			summary: summarizePayload(event.payload),
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

function summarizePayload(payload: unknown): string {
	try {
		const rawString =
			typeof payload === "string"
				? payload
				: JSON.stringify(
						payload ?? {},
						(_key, value) => (typeof value === "bigint" ? value.toString() : value),
				  ) ?? "";
		const sanitized = rawString
			.replace(/\\x[0-9A-Fa-f]{0,2}/g, "")
			.replace(/[\u0000-\u001f]+/g, " ");
		return sanitized.length > 500 ? `${sanitized.slice(0, 500)}...` : sanitized;
	} catch {
		return "unserializable payload";
	}
}
