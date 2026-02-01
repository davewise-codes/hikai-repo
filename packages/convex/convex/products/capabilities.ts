import { v } from "convex/values";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "../_generated/server";
import { assertProductAccess } from "../lib/access";

type CapabilityInput = {
	slug: string;
	name: string;
	description?: string;
	domain?: string;
	visibility: "public" | "internal";
	featureSlugs: string[];
};

export const listProductCapabilities = query({
	args: { productId: v.id("products") },
	handler: async (ctx, { productId }) => {
		await assertProductAccess(ctx, productId);
		return ctx.db
			.query("productCapabilities")
			.withIndex("by_product", (q) => q.eq("productId", productId))
			.order("desc")
			.collect();
	},
});

export const listProductCapabilitiesInternal = internalQuery({
	args: { productId: v.id("products") },
	handler: async (ctx, { productId }) => {
		return ctx.db
			.query("productCapabilities")
			.withIndex("by_product", (q) => q.eq("productId", productId))
			.collect();
	},
});

export const upsertProductCapabilities = internalMutation({
	args: {
		productId: v.id("products"),
		capabilities: v.array(
			v.object({
				slug: v.string(),
				name: v.string(),
				description: v.optional(v.string()),
				domain: v.optional(v.string()),
				visibility: v.union(v.literal("public"), v.literal("internal")),
				featureSlugs: v.array(v.string()),
			}),
		),
	},
	handler: async (ctx, { productId, capabilities }) => {
		const now = Date.now();
		for (const capability of capabilities) {
			const existing = await ctx.db
				.query("productCapabilities")
				.withIndex("by_product_slug", (q) =>
					q.eq("productId", productId).eq("slug", capability.slug),
				)
				.first();

			if (existing) {
				await ctx.db.patch(existing._id, {
					name: capability.name,
					description: capability.description ?? existing.description,
					domain: capability.domain ?? existing.domain,
					visibility: capability.visibility ?? existing.visibility,
					featureSlugs: capability.featureSlugs,
					updatedAt: now,
				});
				continue;
			}

			await ctx.db.insert("productCapabilities", {
				productId,
				slug: capability.slug,
				name: capability.name,
				description: capability.description,
				domain: capability.domain,
				visibility: capability.visibility,
				featureSlugs: capability.featureSlugs,
				createdAt: now,
				updatedAt: now,
			});
		}

		return { upserted: capabilities.length };
	},
});

export const updateProductCapability = mutation({
	args: {
		productId: v.id("products"),
		slug: v.string(),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		domain: v.optional(v.string()),
		visibility: v.optional(v.union(v.literal("public"), v.literal("internal"))),
		featureSlugs: v.optional(v.array(v.string())),
	},
	handler: async (ctx, { productId, slug, ...updates }) => {
		await assertProductAccess(ctx, productId);
		const capability = await ctx.db
			.query("productCapabilities")
			.withIndex("by_product_slug", (q) =>
				q.eq("productId", productId).eq("slug", slug),
			)
			.first();
		if (!capability) return null;

		await ctx.db.patch(capability._id, {
			...updates,
			updatedAt: Date.now(),
		});

		return capability._id;
	},
});
