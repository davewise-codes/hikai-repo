import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import type { ToolDefinition } from "../tool_registry";
import {
	fetchRepoFileContent,
	fetchRepoTree,
	getActiveGithubConnection,
	type GithubConnection,
} from "./github_helpers";

type SearchCodeInput = {
	query?: string;
	filePattern?: string;
	limit?: number;
	repoFullName?: string;
};

type SearchMatch = {
	path: string;
	snippet: string;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_FILES_TO_SCAN = 80;

export function createSearchCodeTool(
	ctx: ActionCtx,
	productId: Id<"products">,
): ToolDefinition {
	return {
		name: "search_code",
		description: "Search for patterns in the connected GitHub repository.",
		execute: async (input): Promise<SearchMatch[] | { error: string }> => {
			const parsed = parseInput(input);
			if (!parsed.query) {
				return { error: "query is required" };
			}

			const connection = await getActiveGithubConnection(ctx, productId);
			if (!connection) {
				return { error: "No active GitHub connection found for this product" };
			}

			const repoFullName = resolveRepo(parsed.repoFullName, connection);
			const tree = await fetchRepoTree(connection.token, repoFullName);

			let files = tree.filter((entry) => entry.type === "file");
			if (parsed.filePattern) {
				const regex = globToRegex(parsed.filePattern);
				files = files.filter((entry) => regex.test(entry.path));
			}

			const limit = Math.min(parsed.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
			const matches: SearchMatch[] = [];
			let scanned = 0;

			for (const file of files) {
				if (scanned >= MAX_FILES_TO_SCAN || matches.length >= limit) break;
				scanned += 1;
				let content: string;
				try {
					content = await fetchRepoFileContent(
						connection.token,
						repoFullName,
						file.path,
					);
				} catch {
					continue;
				}
				const snippet = extractSnippet(content, parsed.query);
				if (snippet) {
					matches.push({ path: file.path, snippet });
				}
			}

			return matches;
		},
	};
}

function parseInput(input: unknown): SearchCodeInput {
	if (!input || typeof input !== "object") return {};
	return input as SearchCodeInput;
}

function resolveRepo(
	repoFullName: string | undefined,
	connection: GithubConnection,
): string {
	if (repoFullName) {
		const exists = connection.repos.some((repo) => repo.fullName === repoFullName);
		if (!exists) {
			throw new Error("Requested repo is not available for this connection");
		}
		return repoFullName;
	}
	const defaultRepo = connection.repos[0]?.fullName;
	if (!defaultRepo) {
		throw new Error("No repositories available for this GitHub connection");
	}
	return defaultRepo;
}

function globToRegex(pattern: string): RegExp {
	const escaped = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".");
	return new RegExp(`^${escaped}$`);
}

function extractSnippet(content: string, query: string): string | null {
	const index = content.toLowerCase().indexOf(query.toLowerCase());
	if (index === -1) return null;
	const start = Math.max(0, index - 80);
	const end = Math.min(content.length, index + query.length + 80);
	return content.slice(start, end);
}
