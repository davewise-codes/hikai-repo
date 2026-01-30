import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import type { ToolDefinition } from "../tool_registry";
import {
	fetchRepoFileContent,
	getActiveGithubConnection,
	type GithubConnection,
} from "./github_helpers";

type GrepFileInput = {
	path?: string;
	pattern?: string;
	repoFullName?: string;
	limit?: number;
};

type GrepFileOutput =
	| {
			path: string;
			matches: string[];
			truncated: boolean;
	  }
	| { error: string };

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 200;

const GREP_FILE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["path", "pattern"],
	properties: {
		productId: { type: "string" },
		path: { type: "string" },
		pattern: { type: "string" },
		limit: { type: "number" },
		repoFullName: { type: "string" },
	},
} as const;

export function createGrepFileTool(
	ctx: ActionCtx,
	productId: Id<"products">,
): ToolDefinition {
	return {
		name: "grep_file",
		description:
			"Search for a pattern inside a specific file. Use when you already know the file path.",
		inputSchema: GREP_FILE_SCHEMA,
		outputLimitBytes: 30_000,
		execute: async (input): Promise<GrepFileOutput> => {
			const parsed = parseInput(input);
			if (!parsed.path) {
				return { error: "path is required" };
			}
			if (!parsed.pattern) {
				return { error: "pattern is required" };
			}

			const connection = await getActiveGithubConnection(ctx, productId);
			if (!connection) {
				return { error: "No active GitHub connection found for this product" };
			}
			const repoFullName = resolveRepo(parsed.repoFullName, connection);

			let content: string;
			try {
				content = await fetchRepoFileContent(
					connection.token,
					repoFullName,
					parsed.path,
				);
			} catch (error) {
				return {
					error: `Failed to read file: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				};
			}

			const limit = Math.min(parsed.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
			const lowerPattern = parsed.pattern.toLowerCase();
			const matches: string[] = [];
			const lines = content.split(/\r?\n/);
			for (let index = 0; index < lines.length; index += 1) {
				if (matches.length >= limit) break;
				const line = lines[index] ?? "";
				if (line.toLowerCase().includes(lowerPattern)) {
					matches.push(`${index + 1}: ${line}`);
				}
			}

			return {
				path: parsed.path,
				matches,
				truncated: matches.length >= limit,
			};
		},
	};
}

function parseInput(input: unknown): GrepFileInput {
	if (!input || typeof input !== "object") return {};
	const raw = input as GrepFileInput;
	const path =
		typeof raw.path === "string"
			? raw.path.replace(/^\.\/+/g, "")
			: raw.path;
	return {
		...raw,
		path,
	};
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
