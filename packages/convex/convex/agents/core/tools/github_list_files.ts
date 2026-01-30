import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import type { ToolDefinition } from "../tool_registry";
import {
	fetchRepoTree,
	getActiveGithubConnection,
	type GithubConnection,
} from "./github_helpers";

type ListFilesInput = {
	path?: string;
	pattern?: string;
	limit?: number;
	repoFullName?: string;
};

type FileEntry = {
	path: string;
	name: string;
	size?: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const LIST_FILES_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		productId: { type: "string" },
		path: { type: "string" },
		pattern: { type: "string" },
		limit: { type: "number" },
		repoFullName: { type: "string" },
	},
} as const;

export function createListFilesTool(
	ctx: ActionCtx,
	productId: Id<"products">,
): ToolDefinition {
	return {
		name: "list_files",
		description:
			"List files in a specific directory. Use pattern '**' for recursive listing.",
		inputSchema: LIST_FILES_SCHEMA,
		outputLimitBytes: 16_000,
		execute: async (input) => {
			const parsed = parseInput(input);
			const connection = await getActiveGithubConnection(ctx, productId);
			if (!connection || connection.repos.length === 0) {
				return { error: "No active GitHub connection found" };
			}

			const repoFullName = resolveRepo(parsed.repoFullName, connection);
			const tree = await fetchRepoTree(connection.token, repoFullName);

			const basePath = parsed.path ?? "";
			const normalizedBase = basePath.replace(/\/+$/g, "");
			const isRecursive =
				typeof parsed.pattern === "string" && parsed.pattern.includes("**");
			let files = tree
				.filter((entry) => entry.type === "file")
				.filter((entry) => {
					if (isRecursive) {
						if (!normalizedBase) return true;
						return entry.path.startsWith(`${normalizedBase}/`);
					}
					const dirPath = entry.path.includes("/")
						? entry.path.slice(0, entry.path.lastIndexOf("/"))
						: "";
					return dirPath === normalizedBase;
				})
				.map((entry) => ({
					path: entry.path,
					name: entry.path.split("/").pop() ?? entry.path,
					size: entry.size,
				}));

			if (parsed.pattern) {
				const regex = globToRegex(parsed.pattern);
				files = files.filter((file) => {
					if (isRecursive && normalizedBase) {
						const relativePath = file.path.slice(normalizedBase.length + 1);
						return regex.test(relativePath);
					}
					if (isRecursive) {
						return regex.test(file.path);
					}
					return regex.test(file.name);
				});
			}

			files.sort((a, b) => a.name.localeCompare(b.name));

			const limit = Math.min(parsed.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
			return {
				files: files.slice(0, limit),
				truncated: files.length > limit,
			};
		},
	};
}

function parseInput(input: unknown): ListFilesInput {
	if (!input || typeof input !== "object") return {};
	const raw = input as Partial<ListFilesInput>;
	return {
		path:
			typeof raw.path === "string"
				? sanitizePath(raw.path)
				: undefined,
		pattern: raw.pattern,
		limit: raw.limit,
		repoFullName: raw.repoFullName,
	};
}

function sanitizePath(value: string): string {
	const cleaned = value.replace(/^\.\/+/g, "").replace(/^\/+|\/+$/g, "");
	return cleaned === "." ? "" : cleaned;
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
	const expanded = expandBracePatterns(pattern);
	const sources = expanded.map((item) => globToRegexSource(item));
	return new RegExp(`^(?:${sources.join("|")})$`, "i");
}

function globToRegexSource(pattern: string): string {
	return pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".");
}

function expandBracePatterns(pattern: string): string[] {
	const start = pattern.indexOf("{");
	if (start === -1) return [pattern];
	let depth = 0;
	let end = -1;
	for (let i = start; i < pattern.length; i += 1) {
		const char = pattern[i];
		if (char === "{") depth += 1;
		if (char === "}") {
			depth -= 1;
			if (depth === 0) {
				end = i;
				break;
			}
		}
	}
	if (end === -1) return [pattern];

	const before = pattern.slice(0, start);
	const after = pattern.slice(end + 1);
	const body = pattern.slice(start + 1, end);
	const parts = splitBraceAlternatives(body);
	const expanded = parts.flatMap((part) =>
		expandBracePatterns(`${before}${part}${after}`),
	);
	return expanded.length > 0 ? expanded : [pattern];
}

function splitBraceAlternatives(body: string): string[] {
	const parts: string[] = [];
	let current = "";
	let depth = 0;
	for (let i = 0; i < body.length; i += 1) {
		const char = body[i];
		if (char === "{") depth += 1;
		if (char === "}") depth = Math.max(0, depth - 1);
		if (char === "," && depth === 0) {
			parts.push(current);
			current = "";
			continue;
		}
		current += char;
	}
	parts.push(current);
	return parts.filter((part) => part.length > 0);
}
