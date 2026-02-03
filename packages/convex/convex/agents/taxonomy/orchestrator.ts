import type { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { mapDomains, type DomainMappingResult } from "./domain_mapper";
import { extractFeatures, type FeatureExtractionResult } from "./feature_extractor";

type OrchestratorParams = {
	ctx: ActionCtx;
	productId: Id<"products">;
	organizationId: Id<"organizations">;
	userId: Id<"users">;
	options?: {
		sampling?: { temperature?: number; topP?: number };
		maxTokens?: {
			domainMapper?: number;
			featureExtractor?: number;
		};
		debug?: boolean;
	};
};

type SurfaceSummary = {
	surfaces: Array<{
		sourceId: string;
		sourceCategory: string;
		notes?: string;
	}>;
	summary: Array<{
		surface: string;
		samplePaths: string[];
	}>;
};

export async function buildProductTaxonomy(
	params: OrchestratorParams,
): Promise<{
	surfaceSummary: SurfaceSummary;
	domainMap: DomainMappingResult | null;
	featureMap: FeatureExtractionResult | null;
}> {
	const { ctx, productId, organizationId, userId } = params;
	const { product } = await ctx.runQuery(
		internal.lib.access.assertProductAccessInternal,
		{ productId },
	);
	const sourceContexts = await ctx.runQuery(
		internal.agents.sourceContextData.listSourceContexts,
		{ productId },
	);

	const currentSnapshot = product.currentProductSnapshot
		? await ctx.runQuery(internal.agents.productContextData.getContextSnapshotById, {
				snapshotId: product.currentProductSnapshot,
			})
		: null;
	const baseline = currentSnapshot?.baseline ?? product.baseline ?? {};
	const productContext = currentSnapshot?.context ?? {};
	const previousFeatureMap =
		(currentSnapshot as { featureMap?: Record<string, unknown> })?.featureMap ??
		null;

	const surfaceSummary = summarizeSurfaces(sourceContexts);

	const domainMap = await mapDomains({
		ctx,
		organizationId,
		productId,
		userId,
		input: {
			baseline,
			surfaceSummary,
		},
		sampling: params.options?.sampling,
		maxTokens: params.options?.maxTokens?.domainMapper,
	});

	const featureMap = await extractFeatures({
		ctx,
		organizationId,
		productId,
		userId,
		input: {
			languagePreference: product.languagePreference ?? "en",
			baseline,
			productContext,
			previousFeatureMap,
			sources: sourceContexts.map((source) => ({
				sourceId: source.sourceId,
				sourceCategory: source.sourceCategory ?? "repo",
				surfaceMapping: source.surfaceMapping ?? [],
				structureSummary: null,
			})),
		},
		sampling: params.options?.sampling,
		maxTokens: params.options?.maxTokens?.featureExtractor,
		debugPrompt: params.options?.debug,
	});

	return { surfaceSummary, domainMap, featureMap };
}

function summarizeSurfaces(
	sourceContexts: Array<{
		sourceId: string;
		sourceCategory?: string;
		notes?: string;
		surfaceMapping?: Array<{
			surface?: string;
			pathPrefix?: string;
		}>;
	}>,
): SurfaceSummary {
	const sorted = [...sourceContexts].sort((a, b) =>
		a.sourceId.localeCompare(b.sourceId),
	);

	const surfaces = sorted.map((item) => ({
		sourceId: item.sourceId,
		sourceCategory: item.sourceCategory ?? "repo",
		notes: item.notes,
	}));

	const summaryMap = new Map<string, { surface: string; samplePaths: string[] }>();

	for (const item of sorted) {
		const buckets = Array.isArray(item.surfaceMapping)
			? item.surfaceMapping
			: [];
		for (const bucket of buckets) {
			const surface = bucket.surface ?? "unknown";
			const entry = summaryMap.get(surface) ?? {
				surface,
				samplePaths: [],
			};
			if (bucket.pathPrefix) {
				entry.samplePaths.push(bucket.pathPrefix);
			}
			summaryMap.set(surface, entry);
		}
	}

	const summary = Array.from(summaryMap.values()).map((entry) => {
		const samplePaths = entry.samplePaths
			.filter((value) => typeof value === "string" && value.length > 0)
			.sort()
			.slice(0, 5);
		return { ...entry, samplePaths };
	});

	return {
		surfaces,
		summary: summary.sort((a, b) => a.surface.localeCompare(b.surface)),
	};
}
