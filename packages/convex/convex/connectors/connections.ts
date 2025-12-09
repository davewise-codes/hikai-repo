import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { assertProductAccess } from "../lib/access";

// ============================================================================
// QUERIES
// ============================================================================

export const listByProduct = query({
	args: { productId: v.id("products") },
	handler: async (ctx, { productId }) => {
		await assertProductAccess(ctx, productId);

		const connections = await ctx.db
			.query("connections")
			.withIndex("by_product", (q) => q.eq("productId", productId))
			.collect();

		const enriched = await Promise.all(
			connections.map(async (connection) => {
				const connectorType = await ctx.db.get(connection.connectorTypeId);
				return {
					...connection,
					connectorType,
					// Nunca exponer credenciales al frontend
					credentials: undefined,
				};
			})
		);

		return enriched;
	},
});

export const getById = query({
	args: { connectionId: v.id("connections") },
	handler: async (ctx, { connectionId }) => {
		const connection = await ctx.db.get(connectionId);
		if (!connection) return null;

		await assertProductAccess(ctx, connection.productId);

		const connectorType = await ctx.db.get(connection.connectorTypeId);
		return {
			...connection,
			connectorType,
			credentials: undefined,
		};
	},
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = mutation({
	args: {
		productId: v.id("products"),
		connectorTypeId: v.id("connectorTypes"),
		name: v.string(),
		config: v.any(),
	},
	handler: async (ctx, args) => {
		const { membership } = await assertProductAccess(ctx, args.productId);

		// Solo admins pueden crear conexiones
		if (membership.role !== "admin") {
			throw new Error("Only admins can add connections");
		}

		const now = Date.now();
		const connectionId = await ctx.db.insert("connections", {
			...args,
			status: "pending",
			createdAt: now,
			updatedAt: now,
		});

		return connectionId;
	},
});

export const updateStatus = mutation({
	args: {
		connectionId: v.id("connections"),
		status: v.union(
			v.literal("pending"),
			v.literal("active"),
			v.literal("error"),
			v.literal("disconnected")
		),
		lastError: v.optional(v.string()),
	},
	handler: async (ctx, { connectionId, status, lastError }) => {
		const connection = await ctx.db.get(connectionId);
		if (!connection) throw new Error("Connection not found");

		const { membership } = await assertProductAccess(ctx, connection.productId);
		if (membership.role !== "admin") {
			throw new Error("Only admins can update connections");
		}

		await ctx.db.patch(connectionId, {
			status,
			lastError,
			updatedAt: Date.now(),
		});
	},
});

export const remove = mutation({
	args: { connectionId: v.id("connections") },
	handler: async (ctx, { connectionId }) => {
		const connection = await ctx.db.get(connectionId);
		if (!connection) throw new Error("Connection not found");

		const { membership } = await assertProductAccess(ctx, connection.productId);
		if (membership.role !== "admin") {
			throw new Error("Only admins can remove connections");
		}

		await ctx.db.delete(connectionId);
	},
});

// Internal: Update credentials after OAuth
export const updateCredentials = mutation({
	args: {
		connectionId: v.id("connections"),
		credentials: v.object({
			accessToken: v.optional(v.string()),
			refreshToken: v.optional(v.string()),
			expiresAt: v.optional(v.number()),
		}),
	},
	handler: async (ctx, { connectionId, credentials }) => {
		const connection = await ctx.db.get(connectionId);
		if (!connection) throw new Error("Connection not found");

		await assertProductAccess(ctx, connection.productId);

		await ctx.db.patch(connectionId, {
			credentials,
			status: "active",
			updatedAt: Date.now(),
		});
	},
});

// Seed inicial de tipos de conector
export const seedConnectorTypes = mutation({
	args: {},
	handler: async (ctx) => {
		const existing = await ctx.db.query("connectorTypes").first();
		if (existing) return "Already seeded";

		const now = Date.now();

		await ctx.db.insert("connectorTypes", {
			type: "source",
			provider: "github",
			name: "GitHub",
			description: "Connect GitHub repositories to track commits, PRs, and releases",
			isEnabled: true,
			createdAt: now,
		});

		return "Seeded connector types";
	},
});
