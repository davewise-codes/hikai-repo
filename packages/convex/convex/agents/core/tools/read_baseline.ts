import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { internal } from "../../../_generated/api";
import type { ToolDefinition, ToolName } from "../tool_registry";

type ReadBaselineInput = {
	productId?: Id<"products">;
};

export function createReadBaselineTool(
	ctx: ActionCtx,
	productId: Id<"products">,
): ToolDefinition {
	return {
		name: "read_baseline" as ToolName,
		description: "Get product baseline information",
		execute: async (input) => {
			const parsed = parseReadBaselineInput(input);
			if (parsed.productId && parsed.productId !== productId) {
				throw new Error("productId mismatch for read_baseline tool");
			}
			const product = await ctx.runQuery(
				internal.agents.productContextData.getProductWithContext,
				{ productId },
			);
			return product.productBaseline ?? {};
		},
	};
}

function parseReadBaselineInput(input: unknown): ReadBaselineInput {
	if (!input || typeof input !== "object") return {};
	return input as ReadBaselineInput;
}
