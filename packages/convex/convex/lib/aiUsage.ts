import { v } from "convex/values";
import { query } from "../_generated/server";
import { assertOrgAccess } from "./access";

/**
 * Obtiene uso de IA por organización en un rango de fechas.
 */
export const getOrgUsage = query({
	args: {
		organizationId: v.id("organizations"),
		startDate: v.optional(v.number()),
		endDate: v.optional(v.number()),
	},
	handler: async (ctx, { organizationId, startDate, endDate }) => {
		await assertOrgAccess(ctx, organizationId);

		const start =
			startDate ?? Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 días
		const finish = endDate ?? Date.now();

		const usage = await ctx.db
			.query("aiUsage")
			.withIndex("by_org_month", (q) =>
				q
					.eq("organizationId", organizationId)
					.gte("createdAt", start)
					.lte("createdAt", finish)
			)
			.collect();

		return aggregateUsage(usage);
	},
});

/**
 * Obtiene uso de IA por producto en un rango de fechas.
 */
export const getProductUsage = query({
	args: {
		productId: v.id("products"),
		startDate: v.optional(v.number()),
		endDate: v.optional(v.number()),
	},
	handler: async (ctx, { productId, startDate, endDate }) => {
		const product = await ctx.db.get(productId);
		if (!product) {
			throw new Error("Product not found");
		}
		await assertOrgAccess(ctx, product.organizationId);

		const start =
			startDate ?? Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 días
		const finish = endDate ?? Date.now();

		const usage = await ctx.db
			.query("aiUsage")
			.withIndex("by_product_month", (q) =>
				q
					.eq("productId", productId)
					.gte("createdAt", start)
					.lte("createdAt", finish)
			)
			.collect();

		return aggregateUsage(usage);
	},
});

/**
 * Obtiene uso de IA por caso de uso.
 */
export const getUsageByUseCase = query({
	args: {
		organizationId: v.id("organizations"),
		productId: v.optional(v.id("products")),
		useCase: v.string(),
		startDate: v.optional(v.number()),
		endDate: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ organizationId, productId, useCase, startDate, endDate }
	) => {
		await assertOrgAccess(ctx, organizationId);

		const start =
			startDate ?? Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 días
		const finish = endDate ?? Date.now();

		const usage =
			productId !== undefined
				? await ctx.db
						.query("aiUsage")
						.withIndex("by_org_product_usecase", (q) =>
							q
								.eq("organizationId", organizationId)
								.eq("productId", productId)
								.eq("useCase", useCase)
						)
						.filter((q) =>
							q.and(
								q.gte(q.field("createdAt"), start),
								q.lte(q.field("createdAt"), finish)
							)
						)
						.collect()
				: await ctx.db
						.query("aiUsage")
						.withIndex("by_usecase", (q) => q.eq("useCase", useCase))
						.filter((q) =>
							q.and(
								q.eq(q.field("organizationId"), organizationId),
								q.gte(q.field("createdAt"), start),
								q.lte(q.field("createdAt"), finish)
							)
						)
						.collect();

		return aggregateUsage(usage);
	},
});

type UsageRecord = {
	useCase: string;
	tokensIn: number;
	tokensOut: number;
	totalTokens: number;
	estimatedCostUsd: number;
	latencyMs: number;
	status: "success" | "error";
};

function aggregateUsage(usage: Array<UsageRecord>) {
	const byUseCase: Record<
		string,
		{
			calls: number;
			tokensIn: number;
			tokensOut: number;
			totalTokens: number;
			estimatedCostUsd: number;
			avgLatencyMs: number;
			errors: number;
		}
	> = {};

	for (const entry of usage) {
		if (!byUseCase[entry.useCase]) {
			byUseCase[entry.useCase] = {
				calls: 0,
				tokensIn: 0,
				tokensOut: 0,
				totalTokens: 0,
				estimatedCostUsd: 0,
				avgLatencyMs: 0,
				errors: 0,
			};
		}

		const accumulator = byUseCase[entry.useCase];
		accumulator.calls++;
		accumulator.tokensIn += entry.tokensIn;
		accumulator.tokensOut += entry.tokensOut;
		accumulator.totalTokens += entry.totalTokens;
		accumulator.estimatedCostUsd += entry.estimatedCostUsd;
		accumulator.avgLatencyMs =
			(accumulator.avgLatencyMs * (accumulator.calls - 1) +
				entry.latencyMs) /
			accumulator.calls;
		if (entry.status === "error") {
			accumulator.errors++;
		}
	}

	const totals = {
		calls: usage.length,
		tokensIn: usage.reduce((sum, item) => sum + item.tokensIn, 0),
		tokensOut: usage.reduce((sum, item) => sum + item.tokensOut, 0),
		totalTokens: usage.reduce((sum, item) => sum + item.totalTokens, 0),
		estimatedCostUsd: usage.reduce(
			(sum, item) => sum + item.estimatedCostUsd,
			0
		),
		errors: usage.filter((item) => item.status === "error").length,
	};

	return { totals, byUseCase };
}
