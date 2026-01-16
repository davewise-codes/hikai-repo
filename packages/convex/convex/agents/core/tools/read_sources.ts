import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { internal } from "../../../_generated/api";
import type { ToolDefinition, ToolName } from "../tool_registry";

type ReadSourcesInput = {
	productId?: Id<"products">;
	limit?: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;

export function createReadSourcesTool(
	ctx: ActionCtx,
	productId: Id<"products">,
): ToolDefinition {
	return {
		name: "read_sources" as ToolName,
		description: "Get classified sources for the product",
		execute: async (input) => {
			const parsed = parseReadSourcesInput(input);
			if (parsed.productId && parsed.productId !== productId) {
				throw new Error("productId mismatch for read_sources tool");
			}
			const limit = clampLimit(parsed.limit);
			const sources = await ctx.runQuery(
				internal.agents.sourceContextData.listSourceContexts,
				{ productId },
			);
			return sources.slice(0, limit);
		},
	};
}

function parseReadSourcesInput(input: unknown): ReadSourcesInput {
	if (!input || typeof input !== "object") return {};
	const raw = input as Partial<ReadSourcesInput>;
	return {
		productId: raw.productId,
		limit: raw.limit,
	};
}

function clampLimit(limit?: number): number {
	if (typeof limit !== "number" || Number.isNaN(limit)) return DEFAULT_LIMIT;
	if (limit < 1) return 1;
	return Math.min(limit, MAX_LIMIT);
}
