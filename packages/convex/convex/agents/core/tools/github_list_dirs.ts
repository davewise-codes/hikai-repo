import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import type { ToolDefinition } from "../tool_registry";
import { fetchRepoTree, getActiveGithubConnection } from "./github_helpers";

type ListDirsInput = {
	path?: string;
	depth?: number;
	limit?: number;
};

type DirEntry = {
	path: string;
	depth: number;
};

const DEFAULT_DEPTH = 2;
const MAX_DEPTH = 3;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export function createListDirsTool(
	ctx: ActionCtx,
	productId: Id<"products">,
): ToolDefinition {
	return {
		name: "list_dirs",
		description:
			"List directories in the repository (depth-limited). Use first to understand project structure.",
		execute: async (
			input: unknown,
		): Promise<{ dirs: DirEntry[]; truncated?: boolean } | { error: string }> => {
			const parsed = parseInput(input);
			const basePath = parsed.path ?? "";
			const depth = Math.min(parsed.depth ?? DEFAULT_DEPTH, MAX_DEPTH);
			const limit = Math.min(parsed.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

			const connection = await getActiveGithubConnection(ctx, productId);
			if (!connection || connection.repos.length === 0) {
				return { error: "No active GitHub connection found" };
			}

			try {
				const tree = await fetchRepoTree(
					connection.token,
					connection.repos[0].fullName,
				);

				const basePrefix = basePath ? `${basePath}/` : "";
				const dirs = tree
					.filter((item) => item.type === "dir")
					.filter((item) => {
						if (basePrefix && !item.path.startsWith(basePrefix)) {
							return false;
						}
						const relative = basePrefix
							? item.path.slice(basePrefix.length)
							: item.path;
						const dirDepth = relative.split("/").filter(Boolean).length;
						return dirDepth <= depth;
					})
					.map((item) => {
						const relative = basePrefix
							? item.path.slice(basePrefix.length)
							: item.path;
						const dirDepth = relative.split("/").filter(Boolean).length;
						return {
							path: item.path,
							depth: dirDepth,
						};
					})
					.sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path));

				return {
					dirs: dirs.slice(0, limit),
					truncated: dirs.length > limit,
				};
			} catch (error) {
				return {
					error: `Failed to list directories: ${
						error instanceof Error ? error.message : String(error)
					}`,
				};
			}
		},
	};
}

function parseInput(input: unknown): ListDirsInput {
	if (!input || typeof input !== "object") return {};
	const raw = input as Partial<ListDirsInput>;
	return {
		path: typeof raw.path === "string" ? sanitizePath(raw.path) : undefined,
		depth: typeof raw.depth === "number" ? raw.depth : undefined,
		limit: typeof raw.limit === "number" ? raw.limit : undefined,
	};
}

function sanitizePath(value: string): string {
	return value.replace(/^\/+|\/+$/g, "");
}
