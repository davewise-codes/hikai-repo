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
const MAX_FILES_TO_SCAN = 120;

const SEARCH_CODE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["query"],
	properties: {
		productId: { type: "string" },
		query: { type: "string" },
		filePattern: { type: "string" },
		limit: { type: "number" },
		repoFullName: { type: "string" },
	},
} as const;

export function createSearchCodeTool(
	ctx: ActionCtx,
	productId: Id<"products">,
): ToolDefinition {
	return {
		name: "search_code",
		description: "Search for patterns in the connected GitHub repository.",
		inputSchema: SEARCH_CODE_SCHEMA,
		outputLimitBytes: 30_000,
		execute: async (input): Promise<SearchMatch[] | { error: string }> => {
			const parsed = parseInput(input);
			if (!parsed.query) {
				return { error: "query is required" };
			}

			const connection = await getActiveGithubConnection(ctx, productId);
			if (!connection) {
				return { error: "No active GitHub connection found for this product" };
			}

			const limit = Math.min(parsed.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
			const repoFullName = resolveRepo(parsed.repoFullName, connection);

			const matchesFromSearch = await searchUsingGithubApi(
				connection.token,
				repoFullName,
				parsed.query,
				parsed.filePattern,
				limit,
			);
			if (matchesFromSearch) {
				return matchesFromSearch;
			}

			const tree = await fetchRepoTree(connection.token, repoFullName);
			let files = tree.filter((entry) => entry.type === "file");
			if (parsed.filePattern) {
				const regex = globToRegex(parsed.filePattern);
				files = files.filter((entry) => regex.test(entry.path));
			}

			return scanFilesForMatches(
				files,
				connection.token,
				repoFullName,
				parsed.query,
				limit,
			);
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
		if (char === "{" ) depth += 1;
		if (char === "}" ) depth = Math.max(0, depth - 1);
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

function extractSnippet(content: string, query: string): string | null {
	const patterns = query
		.split("|")
		.map((pattern) => pattern.trim())
		.filter((pattern) => pattern.length > 0);
	const lowerContent = content.toLowerCase();
	for (const pattern of patterns.length > 0 ? patterns : [query]) {
		const lowerPattern = pattern.toLowerCase();
		const index = lowerContent.indexOf(lowerPattern);
		if (index === -1) continue;
		const start = Math.max(0, index - 80);
		const end = Math.min(content.length, index + lowerPattern.length + 80);
		return content.slice(start, end);
	}
	return null;
}

async function searchUsingGithubApi(
	token: string,
	repoFullName: string,
	query: string,
	filePattern: string | undefined,
	limit: number,
): Promise<SearchMatch[] | null> {
	const searchQuery = buildSearchQuery(query, repoFullName, filePattern);
	if (!searchQuery) return null;

	const response = await fetch(
		`https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}&per_page=${limit}`,
		{ headers: githubHeaders(token) },
	);
	if (!response.ok) {
		return null;
	}
	const json = (await response.json()) as {
		items?: Array<{ path?: string }>;
	};
	const items = json.items ?? [];
	if (items.length === 0) return [];

	const matches: SearchMatch[] = [];
	for (const item of items) {
		if (!item.path) continue;
		let content: string;
		try {
			content = await fetchRepoFileContent(token, repoFullName, item.path);
		} catch {
			continue;
		}
		const snippet = extractSnippet(content, query);
		if (snippet) {
			matches.push({ path: item.path, snippet });
		}
		if (matches.length >= limit) break;
	}
	return matches;
}

function buildSearchQuery(
	query: string,
	repoFullName: string,
	filePattern: string | undefined,
): string {
	const terms = query
		.split("|")
		.map((term) => term.trim())
		.filter((term) => term.length > 0);
	const termQuery =
		terms.length > 1
			? terms.map((term) => `"${term}"`).join(" OR ")
			: query.trim();
	if (!termQuery) {
		return "";
	}
	const pathQualifier = filePattern
		? derivePathQualifier(filePattern)
		: "";
	return `${termQuery} repo:${repoFullName}${pathQualifier}`;
}

function derivePathQualifier(filePattern: string): string {
	const wildcardIndex = filePattern.search(/[*?{]/);
	const prefix =
		wildcardIndex === -1 ? filePattern : filePattern.slice(0, wildcardIndex);
	const normalized = prefix.replace(/\/+$/g, "");
	if (!normalized) return "";
	return ` path:${normalized}`;
}

async function scanFilesForMatches(
	files: Array<{ path: string }>,
	token: string,
	repoFullName: string,
	query: string,
	limit: number,
): Promise<SearchMatch[]> {
	const matches: SearchMatch[] = [];
	let scanned = 0;
	for (const file of files) {
		if (scanned >= MAX_FILES_TO_SCAN || matches.length >= limit) break;
		scanned += 1;
		let content: string;
		try {
			content = await fetchRepoFileContent(token, repoFullName, file.path);
		} catch {
			continue;
		}
		const snippet = extractSnippet(content, query);
		if (snippet) {
			matches.push({ path: file.path, snippet });
		}
	}
	return matches;
}

function githubHeaders(token: string) {
	return {
		Accept: "application/vnd.github+json",
		Authorization: `token ${token}`,
		"User-Agent": "hikai-agent",
	};
}
