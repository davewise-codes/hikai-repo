import { v } from "convex/values";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "../_generated/server";
import { assertProductAccess } from "../lib/access";

type FeatureInput = {
	slug: string;
	name: string;
	domain?: string;
	description?: string;
	visibility: "public" | "internal";
	status?: "active" | "deprecated";
	lastEventAt?: number;
};

export const listProductFeatures = query({
	args: { productId: v.id("products") },
	handler: async (ctx, { productId }) => {
		await assertProductAccess(ctx, productId);
		return ctx.db
			.query("productFeatures")
			.withIndex("by_product", (q) => q.eq("productId", productId))
			.order("desc")
			.collect();
	},
});

export const listProductFeaturesInternal = internalQuery({
	args: { productId: v.id("products") },
	handler: async (ctx, { productId }) => {
		return ctx.db
			.query("productFeatures")
			.withIndex("by_product", (q) => q.eq("productId", productId))
			.collect();
	},
});

export const upsertProductFeatures = internalMutation({
	args: {
		productId: v.id("products"),
		features: v.array(
			v.object({
				slug: v.string(),
				name: v.string(),
				domain: v.optional(v.string()),
				description: v.optional(v.string()),
				visibility: v.union(v.literal("public"), v.literal("internal")),
				status: v.optional(v.union(v.literal("active"), v.literal("deprecated"))),
				lastEventAt: v.optional(v.number()),
			}),
		),
	},
	handler: async (ctx, { productId, features }) => {
		const now = Date.now();
		for (const feature of features) {
			const existing = await ctx.db
				.query("productFeatures")
				.withIndex("by_product_slug", (q) =>
					q.eq("productId", productId).eq("slug", feature.slug),
				)
				.first();

			const nextLastEventAt =
				typeof feature.lastEventAt === "number"
					? feature.lastEventAt
					: undefined;

			if (existing) {
				const lastEventAt =
					typeof nextLastEventAt === "number" &&
					(!existing.lastEventAt || nextLastEventAt > existing.lastEventAt)
						? nextLastEventAt
						: existing.lastEventAt;

				await ctx.db.patch(existing._id, {
					name: feature.name,
					domain: feature.domain ?? existing.domain,
					description: feature.description ?? existing.description,
					visibility: feature.visibility ?? existing.visibility,
					status: feature.status ?? existing.status,
					lastEventAt,
					updatedAt: now,
				});
				continue;
			}

			await ctx.db.insert("productFeatures", {
				productId,
				slug: feature.slug,
				name: feature.name,
				domain: feature.domain,
				description: feature.description,
				visibility: feature.visibility,
				status: feature.status ?? "active",
				createdAt: now,
				lastEventAt: nextLastEventAt ?? now,
				updatedAt: now,
			});
		}

		return { upserted: features.length };
	},
});

export const updateProductFeature = mutation({
	args: {
		productId: v.id("products"),
		slug: v.string(),
		name: v.optional(v.string()),
		domain: v.optional(v.string()),
		description: v.optional(v.string()),
		visibility: v.optional(v.union(v.literal("public"), v.literal("internal"))),
		status: v.optional(v.union(v.literal("active"), v.literal("deprecated"))),
	},
	handler: async (ctx, { productId, slug, ...updates }) => {
		await assertProductAccess(ctx, productId);
		const feature = await ctx.db
			.query("productFeatures")
			.withIndex("by_product_slug", (q) =>
				q.eq("productId", productId).eq("slug", slug),
			)
			.first();
		if (!feature) return null;

		await ctx.db.patch(feature._id, {
			...updates,
			updatedAt: Date.now(),
		});

		return feature._id;
	},
});

export const touchProductFeatures = internalMutation({
	args: {
		productId: v.id("products"),
		slugs: v.array(v.string()),
		lastEventAt: v.number(),
	},
	handler: async (ctx, { productId, slugs, lastEventAt }) => {
		const now = Date.now();
		const uniqueSlugs = Array.from(new Set(slugs));
		for (const slug of uniqueSlugs) {
			const feature = await ctx.db
				.query("productFeatures")
				.withIndex("by_product_slug", (q) =>
					q.eq("productId", productId).eq("slug", slug),
				)
				.first();
			if (!feature) continue;
			const nextLastEventAt =
				!feature.lastEventAt || lastEventAt > feature.lastEventAt
					? lastEventAt
					: feature.lastEventAt;
			await ctx.db.patch(feature._id, {
				lastEventAt: nextLastEventAt,
				updatedAt: now,
			});
		}

		return { touched: uniqueSlugs.length };
	},
});
