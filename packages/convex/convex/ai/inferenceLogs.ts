import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { assertProductAccess } from "../lib/access";
import { getAgentTelemetryConfig } from "./config";

export const getInferenceRating = query({
	args: {
		productId: v.id("products"),
		agentName: v.string(),
		contextVersion: v.number(),
	},
	handler: async (ctx, { productId, agentName, contextVersion }) => {
		await assertProductAccess(ctx, productId);

		const log = await ctx.db
			.query("aiInferenceLogs")
			.withIndex("by_product_agent_context", (q) =>
				q
					.eq("productId", productId)
					.eq("agentName", agentName)
					.eq("contextVersion", contextVersion),
			)
			.first();

		if (!log) return null;

		return {
			rating: log.rating,
			ratingAt: log.ratingAt,
			ratingByUserId: log.ratingByUserId,
		};
	},
});

export const getInferenceRatingById = query({
	args: {
		productId: v.id("products"),
		inferenceLogId: v.id("aiInferenceLogs"),
	},
	handler: async (ctx, { productId, inferenceLogId }) => {
		await assertProductAccess(ctx, productId);

		const log = await ctx.db.get(inferenceLogId);
		if (!log || log.productId !== productId) return null;

		return {
			rating: log.rating,
			ratingAt: log.ratingAt,
			ratingByUserId: log.ratingByUserId,
		};
	},
});

export const rateInference = mutation({
	args: {
		productId: v.id("products"),
		agentName: v.string(),
		contextVersion: v.number(),
		rating: v.union(v.literal("up"), v.literal("down")),
	},
	handler: async (ctx, { productId, agentName, contextVersion, rating }) => {
		const { userId } = await assertProductAccess(ctx, productId);
		const telemetryConfig = getAgentTelemetryConfig(agentName);
		if (!telemetryConfig.enableRating) {
			throw new Error("Rating is disabled for this agent.");
		}

		const log = await ctx.db
			.query("aiInferenceLogs")
			.withIndex("by_product_agent_context", (q) =>
				q
					.eq("productId", productId)
					.eq("agentName", agentName)
					.eq("contextVersion", contextVersion),
			)
			.first();

		if (!log) {
			throw new Error("Inference log not found.");
		}

		const nextRating = log.rating === rating ? undefined : rating;
		const patch: {
			rating?: "up" | "down";
			ratingAt?: number;
			ratingByUserId?: Id<"users">;
			ratingMetadata?: Record<string, unknown>;
		} = nextRating
			? {
					rating: nextRating,
					ratingAt: Date.now(),
					ratingByUserId: userId,
					ratingMetadata: { source: "product-context-card" },
				}
			: {
					rating: undefined,
					ratingAt: undefined,
					ratingByUserId: undefined,
					ratingMetadata: undefined,
				};

		await ctx.db.patch(log._id, patch);

		return { rating: nextRating ?? null };
	},
});

export const rateInferenceById = mutation({
	args: {
		productId: v.id("products"),
		inferenceLogId: v.id("aiInferenceLogs"),
		rating: v.union(v.literal("up"), v.literal("down")),
	},
	handler: async (ctx, { productId, inferenceLogId, rating }) => {
		const { userId } = await assertProductAccess(ctx, productId);

		const log = await ctx.db.get(inferenceLogId);
		if (!log || log.productId !== productId) {
			throw new Error("Inference log not found.");
		}

		const telemetryConfig = getAgentTelemetryConfig(log.agentName);
		if (!telemetryConfig.enableRating) {
			throw new Error("Rating is disabled for this agent.");
		}

		const nextRating = log.rating === rating ? undefined : rating;
		const patch: {
			rating?: "up" | "down";
			ratingAt?: number;
			ratingByUserId?: Id<"users">;
			ratingMetadata?: Record<string, unknown>;
		} = nextRating
			? {
					rating: nextRating,
					ratingAt: Date.now(),
					ratingByUserId: userId,
					ratingMetadata: { source: "timeline-detail" },
				}
			: {
					rating: undefined,
					ratingAt: undefined,
					ratingByUserId: undefined,
					ratingMetadata: undefined,
				};

		await ctx.db.patch(log._id, patch);

		return { rating: nextRating ?? null };
	},
});
