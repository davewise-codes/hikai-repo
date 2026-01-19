import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { internal } from "../../../_generated/api";

export type GithubRepoInfo = {
	fullName: string;
	defaultBranch?: string;
};

export type GithubConnection = {
	connectionId: Id<"connections">;
	token: string;
	repos: GithubRepoInfo[];
};

const DEFAULT_REPO_LIMIT = 100;

export async function getActiveGithubConnection(
	ctx: ActionCtx,
	productId: Id<"products">,
): Promise<GithubConnection | null> {
	const connections = await ctx.runQuery(
		internal.connectors.connections.listByProductInternal,
		{ productId },
	);

	const githubConnection = connections.find(
		(connection) =>
			connection.status === "active" &&
			connection.connectorType?.provider === "github",
	);

	if (!githubConnection) {
		return null;
	}

	const { token } = await ctx.runAction(
		internal.connectors.github.getInstallationTokenForConnection,
		{ productId, connectionId: githubConnection._id },
	);

	const repos = await listInstallationRepositories(token, DEFAULT_REPO_LIMIT);

	return {
		connectionId: githubConnection._id,
		token,
		repos,
	};
}

export async function fetchRepoTree(
	token: string,
	repoFullName: string,
): Promise<Array<{ path: string; type: "file" | "dir"; size?: number }>> {
	const repoResponse = await fetch(
		`https://api.github.com/repos/${repoFullName}`,
		{ headers: githubHeaders(token) },
	);
	if (!repoResponse.ok) {
		throw new Error(`GitHub API error: ${repoResponse.status}`);
	}
	const repoJson = (await repoResponse.json()) as {
		default_branch?: string;
	};
	const defaultBranch = repoJson.default_branch ?? "main";

	const branchResponse = await fetch(
		`https://api.github.com/repos/${repoFullName}/branches/${encodeURIComponent(
			defaultBranch,
		)}`,
		{ headers: githubHeaders(token) },
	);
	if (!branchResponse.ok) {
		throw new Error(`GitHub API error: ${branchResponse.status}`);
	}
	const branchJson = (await branchResponse.json()) as {
		commit?: { commit?: { tree?: { sha?: string } } };
	};
	const treeSha = branchJson.commit?.commit?.tree?.sha;
	if (!treeSha) {
		throw new Error("Missing tree SHA from default branch");
	}

	const treeResponse = await fetch(
		`https://api.github.com/repos/${repoFullName}/git/trees/${treeSha}?recursive=1`,
		{ headers: githubHeaders(token) },
	);
	if (!treeResponse.ok) {
		throw new Error(`GitHub API error: ${treeResponse.status}`);
	}
	const treeJson = (await treeResponse.json()) as {
		tree?: Array<{ path?: string; type?: string; size?: number }>;
	};
	const entries = treeJson.tree ?? [];
	return entries
		.filter((entry) => entry.path && (entry.type === "blob" || entry.type === "tree"))
		.map((entry) => ({
			path: entry.path as string,
			type: entry.type === "blob" ? "file" : "dir",
			size: entry.size,
		}));
}

export async function fetchRepoFileContent(
	token: string,
	repoFullName: string,
	path: string,
): Promise<string> {
	const response = await fetch(
		`https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(
			path,
		)}`,
		{ headers: githubHeaders(token) },
	);
	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status}`);
	}
	const json = (await response.json()) as {
		content?: string;
		encoding?: string;
	};
	if (!json.content || json.encoding !== "base64") {
		throw new Error("Unexpected file format");
	}
	return decodeBase64(json.content);
}

export async function listInstallationRepositories(
	token: string,
	limit: number,
): Promise<GithubRepoInfo[]> {
	const response = await fetch(
		`https://api.github.com/installation/repositories?per_page=${limit}`,
		{ headers: githubHeaders(token) },
	);
	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status}`);
	}
	const json = (await response.json()) as {
		repositories?: Array<{ full_name?: string; default_branch?: string }>;
	};
	return (json.repositories ?? [])
		.filter((repo) => repo.full_name)
		.map((repo) => ({
			fullName: repo.full_name as string,
			defaultBranch: repo.default_branch,
		}));
}

function decodeBase64(value: string): string {
	if (typeof atob === "function") {
		return atob(value);
	}
	if (typeof Buffer !== "undefined") {
		return Buffer.from(value, "base64").toString("utf-8");
	}
	throw new Error("Base64 decode not supported in this runtime");
}

function githubHeaders(token: string) {
	return {
		Accept: "application/vnd.github+json",
		Authorization: `token ${token}`,
		"User-Agent": "hikai-agent",
	};
}
