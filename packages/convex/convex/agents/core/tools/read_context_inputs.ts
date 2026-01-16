import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { internal } from "../../../_generated/api";
import type { ToolDefinition, ToolName } from "../tool_registry";

type ReadContextInputsInput = {
	productId?: Id<"products">;
};

type ContextInputsOutput = {
	uiSitemap: unknown | null;
	userFlows: unknown | null;
	businessDataModel: unknown | null;
	repoTopology: unknown | null;
};

export function createReadContextInputsTool(
	ctx: ActionCtx,
	productId: Id<"products">,
): ToolDefinition {
	return {
		name: "read_context_inputs" as ToolName,
		description: "Get latest context inputs for the product",
		execute: async (input) => {
			const parsed = parseReadContextInputsInput(input);
			if (parsed.productId && parsed.productId !== productId) {
				throw new Error("productId mismatch for read_context_inputs tool");
			}
			const run = await ctx.runQuery(
				internal.agents.contextInputsData.getLatestContextInputRun,
				{ productId },
			);
			if (!run?.rawOutputFileId) {
				return emptyContextInputs();
			}
			const raw = await ctx.storage.get(run.rawOutputFileId);
			if (!raw) {
				return emptyContextInputs();
			}
			try {
				const text = await raw.text();
				const parsedOutput = JSON.parse(text) as {
					uiSitemap?: unknown;
					userFlows?: unknown;
					businessDataModel?: unknown;
					repoFolderTopology?: unknown;
					repoTopology?: unknown;
				};
				return {
					uiSitemap: parsedOutput.uiSitemap ?? null,
					userFlows: parsedOutput.userFlows ?? null,
					businessDataModel: parsedOutput.businessDataModel ?? null,
					repoTopology:
						parsedOutput.repoFolderTopology ??
						parsedOutput.repoTopology ??
						null,
				};
			} catch {
				return emptyContextInputs();
			}
		},
	};
}

function parseReadContextInputsInput(input: unknown): ReadContextInputsInput {
	if (!input || typeof input !== "object") return {};
	return input as ReadContextInputsInput;
}

function emptyContextInputs(): ContextInputsOutput {
	return {
		uiSitemap: null,
		userFlows: null,
		businessDataModel: null,
		repoTopology: null,
	};
}
