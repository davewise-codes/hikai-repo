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
			filePaths:
				Array.isArray((event.payload as any)?.filePaths)
					? ((event.payload as any).filePaths as string[])
					: [],
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
			filePaths:
				Array.isArray((event.payload as any)?.filePaths)
					? ((event.payload as any).filePaths as string[])
					: [],
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
		featureMap: v.optional(v.any()),
		releaseCadence: v.optional(v.string()),
		languagePreference: v.string(),
		timestamp: v.number(),
	},
	handler: async (
		ctx,
		{
			productId,
			context,
			baseline,
			featureMap,
			releaseCadence,
			languagePreference,
			timestamp,
		},
	) => {
		const product = await ctx.db.get(productId);
		if (!product) {
			throw new Error("Producto no encontrado");
		}

		const snapshotId = await ctx.db.insert("productContextSnapshots", {
			productId,
			createdAt: Number(context?.createdAt ?? timestamp),
			generatedBy: "manual",
			status: "completed",
			completedPhases: [],
			errors: [],
			version: Number(context?.version ?? 0),
			createdBy: context?.createdBy,
			baseline,
			context,
			featureMap,
			releaseCadence,
			languagePreference,
		});

		await ctx.db.patch(productId, {
			currentProductSnapshot: snapshotId,
			languagePreference,
			updatedAt: timestamp,
		});

		return { snapshotId };
	},
});

export const updateFeatureMapForSnapshot = internalMutation({
	args: {
		snapshotId: v.id("productContextSnapshots"),
		featureMap: v.any(),
	},
	handler: async (ctx, { snapshotId, featureMap }) => {
		await ctx.db.patch(snapshotId, {
			featureMap,
		});
	},
});

export const createContextSnapshot = internalMutation({
	args: {
		productId: v.id("products"),
		createdAt: v.number(),
		generatedBy: v.union(
			v.literal("manual"),
			v.literal("contextAgent"),
			v.literal("scheduled"),
		),
		triggerReason: v.optional(
			v.union(
				v.literal("initial_setup"),
				v.literal("source_change"),
				v.literal("manual_refresh"),
			),
		),
		status: v.union(
			v.literal("in_progress"),
			v.literal("completed"),
			v.literal("failed"),
			v.literal("partial"),
		),
		completedPhases: v.array(
			v.union(
				v.literal("structure"),
				v.literal("glossary"),
				v.literal("domains"),
				v.literal("features"),
			),
		),
		errors: v.array(
			v.object({
				phase: v.string(),
				error: v.string(),
				timestamp: v.number(),
			}),
		),
		agentRuns: v.optional(
			v.object({
				contextAgent: v.optional(v.id("agentRuns")),
				structureScout: v.optional(v.id("agentRuns")),
				glossaryScout: v.optional(v.id("agentRuns")),
				domainMapper: v.optional(v.id("agentRuns")),
				featureScout: v.optional(v.id("agentRuns")),
			}),
		),
		repoStructure: v.optional(v.any()),
		glossary: v.optional(v.any()),
		domainMap: v.optional(v.any()),
		features: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const { productId } = args;
		const product = await ctx.db.get(productId);
		if (!product) {
			throw new Error("Producto no encontrado");
		}
		const snapshotId = await ctx.db.insert("productContextSnapshots", args);
		return { snapshotId };
	},
});

export const updateContextSnapshot = internalMutation({
	args: {
		snapshotId: v.id("productContextSnapshots"),
		repoStructure: v.optional(v.any()),
		glossary: v.optional(v.any()),
		domainMap: v.optional(v.any()),
		features: v.optional(v.any()),
		agentRuns: v.optional(
			v.object({
				contextAgent: v.optional(v.id("agentRuns")),
				structureScout: v.optional(v.id("agentRuns")),
				glossaryScout: v.optional(v.id("agentRuns")),
				domainMapper: v.optional(v.id("agentRuns")),
				featureScout: v.optional(v.id("agentRuns")),
			}),
		),
		status: v.optional(
			v.union(
				v.literal("in_progress"),
				v.literal("completed"),
				v.literal("failed"),
				v.literal("partial"),
			),
		),
		completedPhases: v.optional(
			v.array(
				v.union(
					v.literal("structure"),
					v.literal("glossary"),
					v.literal("domains"),
					v.literal("features"),
				),
			),
		),
		errors: v.optional(
			v.array(
				v.object({
					phase: v.string(),
					error: v.string(),
					timestamp: v.number(),
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		const { snapshotId, ...patch } = args;
		await ctx.db.patch(snapshotId, patch);
	},
});

export const setCurrentProductSnapshot = internalMutation({
	args: {
		productId: v.id("products"),
		snapshotId: v.id("productContextSnapshots"),
		updatedAt: v.number(),
	},
	handler: async (ctx, { productId, snapshotId, updatedAt }) => {
		await ctx.db.patch(productId, {
			currentProductSnapshot: snapshotId,
			updatedAt,
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
