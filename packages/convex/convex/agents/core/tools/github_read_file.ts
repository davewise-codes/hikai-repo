import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import type { ToolDefinition } from "../tool_registry";
import {
	fetchRepoFileContent,
	getActiveGithubConnection,
	type GithubConnection,
} from "./github_helpers";

type ReadFileInput = {
	path?: string;
	repoFullName?: string;
};

type ReadFileOutput =
	| {
			path: string;
			content: string;
			size: number;
	  }
	| { error: string };

const MAX_FILE_SIZE = 100 * 1024;

const READ_FILE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["path"],
	properties: {
		productId: { type: "string" },
		path: { type: "string" },
		repoFullName: { type: "string" },
	},
} as const;

export function createReadFileTool(
	ctx: ActionCtx,
	productId: Id<"products">,
): ToolDefinition {
	return {
		name: "read_file",
		description: "Read a file from the connected GitHub repository.",
		inputSchema: READ_FILE_SCHEMA,
		outputLimitBytes: 60_000,
		execute: async (input): Promise<ReadFileOutput> => {
			const parsed = parseInput(input);
			if (!parsed.path) {
				return { error: "path is required" };
			}

			const connection = await getActiveGithubConnection(ctx, productId);
			if (!connection) {
				return { error: "No active GitHub connection found for this product" };
			}
			const repoFullName = resolveRepo(parsed.repoFullName, connection);

			try {
				const content = await fetchRepoFileContent(
					connection.token,
					repoFullName,
					parsed.path,
				);
				const truncated =
					content.length > MAX_FILE_SIZE
						? `${content.slice(0, MAX_FILE_SIZE)}\n... [truncated]`
						: content;
				return {
					path: parsed.path,
					content: truncated,
					size: content.length,
				};
			} catch (error) {
				return {
					error: `Failed to read file: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				};
			}
		},
	};
}

function parseInput(input: unknown): ReadFileInput {
	if (!input || typeof input !== "object") return {};
	const raw = input as ReadFileInput;
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
