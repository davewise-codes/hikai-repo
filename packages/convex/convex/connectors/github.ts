import {
	action,
	query,
	httpAction,
	internalMutation,
	internalQuery,
	internalAction,
	type ActionCtx,
} from "../_generated/server";
import { v } from "convex/values";
import { assertProductAccess } from "../lib/access";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { SignJWT, importPKCS8 } from "jose";
import { canTriggerManualSync, type Plan } from "../lib/planLimits";

// Generates the GitHub OAuth authorization URL for a connection
export const getInstallUrl = query({
	args: {
		productId: v.id("products"),
		connectionId: v.id("connections"),
	},
	handler: async (ctx, { productId, connectionId }) => {
		await assertProductAccess(ctx, productId);

		const appSlug = process.env.GITHUB_APP_SLUG;
		if (!appSlug) {
			throw new Error("Missing GITHUB_APP_SLUG env var");
		}

		const params = new URLSearchParams({ state: connectionId });
		return `https://github.com/apps/${appSlug}/installations/new?${params}`;
	},
});

// Internal: fetch connection by id (no auth) to validate state
export const getConnectionForOAuth = internalQuery({
	args: { connectionId: v.id("connections") },
	handler: async (ctx, { connectionId }) => {
		return ctx.db.get(connectionId);
	},
});

// Internal: persist GitHub App installation token and activate connection
export const setGithubAppCredentials = internalMutation({
	args: {
		connectionId: v.id("connections"),
		installationId: v.string(),
		accessToken: v.string(),
		expiresAt: v.number(),
	},
	handler: async (ctx, { connectionId, installationId, accessToken, expiresAt }) => {
		const connection = await ctx.db.get(connectionId);
		if (!connection) return "not_found";

		await ctx.db.patch(connectionId, {
			credentials: { accessToken, expiresAt },
			config: {
				...connection.config,
				installationId,
			},
			status: "active",
			updatedAt: Date.now(),
		});

		return "ok";
	},
});

// Internal: mark OAuth failure
export const setGithubConnectionError = internalMutation({
	args: { connectionId: v.id("connections"), error: v.string() },
	handler: async (ctx, { connectionId, error }) => {
		const connection = await ctx.db.get(connectionId);
		if (!connection) return "not_found";

		await ctx.db.patch(connectionId, {
			status: "error",
			lastError: error,
			updatedAt: Date.now(),
		});

		return "ok";
	},
});

// HTTP handler for GitHub App installation callback
export const githubAppCallback = httpAction(async (ctx, request) => {
	const url = new URL(request.url);
	const state = url.searchParams.get("state"); // connectionId
	const installationId = url.searchParams.get("installation_id");

	if (!state || !installationId) {
		return new Response("Missing state or installation_id", { status: 400 });
	}

	const connectionId = state as Id<"connections">;
	const connection = await ctx.runQuery(
		internal.connectors.github.getConnectionForOAuth,
		{ connectionId }
	);
	if (!connection) {
		return new Response("Invalid state", { status: 400 });
	}

	const appId = process.env.GITHUB_APP_ID;
	const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
	if (!appId || !privateKey) {
		return new Response("Missing GitHub App env vars", { status: 500 });
	}

	try {
		const nowSeconds = Math.floor(Date.now() / 1000);
		const key = await importPKCS8(privateKey, "RS256");
		const appJwt = await new SignJWT({})
			.setProtectedHeader({ alg: "RS256" })
			.setIssuedAt(nowSeconds - 60)
			.setExpirationTime(nowSeconds + 10 * 60)
			.setIssuer(appId)
			.sign(key);

		const tokenResponse = await fetch(
			`https://api.github.com/app/installations/${installationId}/access_tokens`,
			{
				method: "POST",
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${appJwt}`,
					"User-Agent": "hikai-connectors",
				},
			}
		);

		const tokenJson = (await tokenResponse.json()) as {
			token?: string;
			expires_at?: string;
			error?: string;
			message?: string;
		};

		if (!tokenResponse.ok || !tokenJson.token || !tokenJson.expires_at) {
			await ctx.runMutation(internal.connectors.github.setGithubConnectionError, {
				connectionId,
				error: tokenJson.message ?? tokenJson.error ?? "Installation token failed",
			});

			return new Response("Installation token failed", { status: 500 });
		}

		const expiresAt = Date.parse(tokenJson.expires_at);
		await ctx.runMutation(internal.connectors.github.setGithubAppCredentials, {
			connectionId,
			installationId,
			accessToken: tokenJson.token,
			expiresAt,
		});
	} catch (error) {
		await ctx.runMutation(internal.connectors.github.setGithubConnectionError, {
			connectionId,
			error: error instanceof Error ? error.message : "Installation token failed",
		});

		return new Response("Installation token failed", { status: 500 });
	}

	const webappUrl = process.env.SITE_URL;
	if (!webappUrl) {
		return new Response("Missing SITE_URL env var", { status: 500 });
	}

	return Response.redirect(`${webappUrl}/oauth/success?provider=github`);
});

// ============================================================================
// Manual sync: GitHub → rawEvents
// ============================================================================

const BATCH_INSERT_SIZE = 50;
const LOOKBACK_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 días para refrescar duplicados y evitar gaps

type GithubRepo = {
	owner: string;
	name: string;
	fullName: string;
};

type NormalizedGithubEvent = {
	externalId: string;
	sourceType: "commit" | "pull_request" | "release";
	title: string;
	body?: string;
	filePaths?: string[];
	author?: {
		login?: string;
		name?: string;
	};
	url: string;
	occurredAt: number;
	repo: GithubRepo;
	action?: string;
};

export const assertProductAccessForGithub = internalQuery({
	args: { productId: v.id("products") },
	handler: async (ctx, { productId }) => {
		const { organization, membership } = await assertProductAccess(ctx, productId);
		return { organization, membership };
	},
});

export const getInstallationTokenForConnection = internalAction({
	args: {
		productId: v.id("products"),
		connectionId: v.id("connections"),
	},
	handler: async (ctx, { productId, connectionId }) => {
		await ctx.runQuery(internal.connectors.github.assertProductAccessForGithub, {
			productId,
		});

		const connection = await ctx.runQuery(
			internal.connectors.connections.getConnectionWithType,
			{ connectionId },
		);

		if (!connection || connection.productId !== productId) {
			throw new Error("Connection not found");
		}

		if (connection.connectorType?.provider !== "github") {
			throw new Error("Connection provider mismatch");
		}

		if (connection.status !== "active") {
			throw new Error("Connection is not active");
		}

		const installationId =
			typeof connection.config?.installationId === "string"
				? (connection.config.installationId as string)
				: null;

		if (!installationId) {
			throw new Error("Missing installationId in connection config");
		}

		const token = await ensureValidInstallationToken(
			ctx,
			connectionId,
			installationId,
			connection.credentials,
		);

		return { token };
	},
});

export const fetchRepoStructureSummary = internalAction({
	args: {
		productId: v.id("products"),
		connectionId: v.id("connections"),
		repoFullName: v.string(),
	},
	handler: async (ctx, { productId, connectionId, repoFullName }) => {
		const { token } = await ctx.runAction(
			internal.connectors.github.getInstallationTokenForConnection,
			{ productId, connectionId },
		);

		const repoResponse = await fetch(
			`https://api.github.com/repos/${repoFullName}`,
			{ headers: githubHeaders(token) },
		);
		if (!repoResponse.ok) {
			throw new Error(`Failed to fetch repo metadata for ${repoFullName}`);
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
			throw new Error(`Failed to fetch default branch for ${repoFullName}`);
		}
		const branchJson = (await branchResponse.json()) as {
			commit?: { commit?: { tree?: { sha?: string } } };
		};
		const treeSha = branchJson.commit?.commit?.tree?.sha;
		if (!treeSha) {
			throw new Error(`Missing tree SHA for ${repoFullName}`);
		}

		const treeResponse = await fetch(
			`https://api.github.com/repos/${repoFullName}/git/trees/${treeSha}?recursive=1`,
			{ headers: githubHeaders(token) },
		);
		if (!treeResponse.ok) {
			throw new Error(`Failed to fetch repo tree for ${repoFullName}`);
		}
		const treeJson = (await treeResponse.json()) as {
			tree?: Array<{ path?: string; type?: string }>;
		};
		const entries = treeJson.tree ?? [];

		const summary = buildRepoStructureSummary(entries);
		const fileSamples = await fetchRepoFileSamples(
			token,
			repoFullName,
			entries,
			summary,
		);

		return {
			...summary,
			fileSamples,
		};
	},
});

export const getRecentExternalIds = internalQuery({
	args: {
		connectionId: v.id("connections"),
		since: v.optional(v.number()),
	},
	handler: async (ctx, { connectionId, since }) => {
		const lowerBound = since ?? 0;
		const events = await ctx.db
			.query("rawEvents")
			.withIndex("by_connection_time", (q) =>
				q.eq("connectionId", connectionId).gte("ingestedAt", lowerBound)
			)
			.collect();

		return events
			.map((event) => {
				const payload = event.payload as { externalId?: string; filePaths?: string[] };
				if (!payload?.externalId) return null;
				return {
					externalId: payload.externalId,
					rawEventId: event._id,
					hasFilePaths: Array.isArray(payload.filePaths) && payload.filePaths.length > 0,
				};
			})
			.filter(
				(value): value is { externalId: string; rawEventId: Id<"rawEvents">; hasFilePaths: boolean } =>
					Boolean(value),
			);
	},
});

export const updateRawEventFilePaths = internalMutation({
	args: {
		rawEventId: v.id("rawEvents"),
		filePaths: v.array(v.string()),
	},
	handler: async (ctx, { rawEventId, filePaths }) => {
		const event = await ctx.db.get(rawEventId);
		if (!event) return;
		await ctx.db.patch(rawEventId, {
			payload: {
				...(event.payload as Record<string, unknown>),
				filePaths,
			},
			updatedAt: Date.now(),
		});
	},
});

export const insertRawEvents = internalMutation({
	args: {
		productId: v.id("products"),
		connectionId: v.id("connections"),
		events: v.array(
			v.object({
				externalId: v.string(),
				sourceType: v.union(
					v.literal("commit"),
					v.literal("pull_request"),
					v.literal("release")
				),
				title: v.string(),
				body: v.optional(v.string()),
				filePaths: v.optional(v.array(v.string())),
				author: v.optional(
					v.object({
						login: v.optional(v.string()),
						name: v.optional(v.string()),
					})
				),
				url: v.string(),
				occurredAt: v.number(),
				repo: v.object({
					owner: v.string(),
					name: v.string(),
					fullName: v.string(),
				}),
				action: v.optional(v.string()),
			})
		),
	},
	handler: async (ctx, { productId, connectionId, events }) => {
		await assertProductAccess(ctx, productId);

		const now = Date.now();
		for (const event of events) {
			await ctx.db.insert("rawEvents", {
				productId,
				connectionId,
				provider: "github",
				sourceType: event.sourceType,
				payload: event,
				occurredAt: event.occurredAt,
				ingestedAt: now,
				status: "pending",
				createdAt: now,
				updatedAt: now,
			});
		}

		return events.length;
	},
});

type SyncGithubArgs = {
	productId: Id<"products">;
	connectionId: Id<"connections">;
};

type SyncGithubResult = {
	ingested: number;
	skipped: number;
	connectionId: Id<"connections">;
	productId: Id<"products">;
};

export async function syncGithubConnectionHandler(
	ctx: ActionCtx,
	{ productId, connectionId }: SyncGithubArgs
): Promise<SyncGithubResult> {
	const { organization } = await ctx.runQuery(
		internal.connectors.github.assertProductAccessForGithub,
		{ productId }
	);

	const connection = await ctx.runQuery(
		internal.connectors.connections.getConnectionWithType,
		{ connectionId }
	);

	if (!connection || connection.productId !== productId) {
		throw new Error("Connection not found");
	}

	if (connection.connectorType?.provider !== "github") {
		throw new Error("Connection provider mismatch");
	}

	if (connection.status !== "active") {
		throw new Error("Connection is not active");
	}

	const lastProductSyncAt = await ctx.runQuery(
		internal.connectors.connections.getLastSyncAtForProduct,
		{ productId }
	);

	const plan = organization.plan as Plan;
	const { allowed, nextAllowedAt } = canTriggerManualSync(plan, lastProductSyncAt);
	if (!allowed) {
		if (nextAllowedAt) {
			throw new Error(
				`Manual sync available after ${new Date(nextAllowedAt).toISOString()}`
			);
		}

		throw new Error("Manual sync limit reached for this plan");
	}

	const installationId =
		typeof connection.config?.installationId === "string"
			? (connection.config.installationId as string)
			: null;

	if (!installationId) {
		throw new Error("Missing installationId in connection config");
	}

	const since = lastProductSyncAt
		? Math.max(0, lastProductSyncAt - LOOKBACK_WINDOW_MS)
		: 0;

	try {
		const token = await ensureValidInstallationToken(
			ctx,
			connectionId,
			installationId,
			connection.credentials
		);

		const repositories = await fetchInstallationRepositories(token);
		const recentExternalMeta = await ctx.runQuery(
			internal.connectors.github.getRecentExternalIds,
			{
				connectionId,
				since,
			},
		);
		const recentByExternalId = new Map(
			recentExternalMeta.map((item) => [item.externalId, item]),
		);
		const recentExternalIds = new Set(recentByExternalId.keys());

		let ingested = 0;
		let skipped = 0;
		let buffer: NormalizedGithubEvent[] = [];

		for (const repo of repositories) {
			const repoEvents = await fetchRepoEvents(token, repo, since);
			for (const event of repoEvents) {
				const existing = recentByExternalId.get(event.externalId);
				if (existing) {
					if (!existing.hasFilePaths && event.filePaths?.length) {
						await ctx.runMutation(
							internal.connectors.github.updateRawEventFilePaths,
							{
								rawEventId: existing.rawEventId,
								filePaths: event.filePaths,
							},
						);
					}
					skipped += 1;
					continue;
				}

				if (recentExternalIds.has(event.externalId)) {
					skipped += 1;
					continue;
				}
				recentExternalIds.add(event.externalId);
				buffer.push(event);

				if (buffer.length >= BATCH_INSERT_SIZE) {
					await ctx.runMutation(internal.connectors.github.insertRawEvents, {
						productId,
						connectionId,
						events: buffer,
					});
					ingested += buffer.length;
					buffer = [];
				}
			}
		}

		if (buffer.length) {
			await ctx.runMutation(internal.connectors.github.insertRawEvents, {
				productId,
				connectionId,
				events: buffer,
			});
			ingested += buffer.length;
		}

		await ctx.runMutation(internal.connectors.connections.updateSyncState, {
			connectionId,
			lastSyncAt: Date.now(),
		});

		return { ingested, skipped, connectionId, productId };
	} catch (error) {
		await ctx.runMutation(internal.connectors.connections.updateSyncState, {
			connectionId,
			lastError: error instanceof Error ? error.message : "Sync failed",
		});

		throw error;
	}
}

export const syncGithubConnection = action({
	args: {
		productId: v.id("products"),
		connectionId: v.id("connections"),
	},
	handler: syncGithubConnectionHandler,
});

async function ensureValidInstallationToken(
	ctx: ActionCtx,
	connectionId: Id<"connections">,
	installationId: string,
	credentials:
		| {
				accessToken?: string;
				expiresAt?: number;
		  }
		| undefined
) {
	const now = Date.now();
	const marginMs = 5 * 60 * 1000; // renovar 5 minutos antes del vencimiento
	const hasValidToken =
		credentials?.accessToken &&
		typeof credentials.expiresAt === "number" &&
		credentials.expiresAt - marginMs > now;

	if (hasValidToken) {
		return credentials.accessToken as string;
	}

	const refreshed = await refreshInstallationToken(installationId);

	await ctx.runMutation(internal.connectors.connections.updateSyncState, {
		connectionId,
		credentials: {
			accessToken: refreshed.token,
			expiresAt: refreshed.expiresAt,
		},
	});

	return refreshed.token;
}

async function refreshInstallationToken(installationId: string) {
	const appId = process.env.GITHUB_APP_ID;
	const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

	if (!appId || !privateKey) {
		throw new Error("Missing GitHub App env vars");
	}

	const nowSeconds = Math.floor(Date.now() / 1000);
	const key = await importPKCS8(privateKey, "RS256");
	const appJwt = await new SignJWT({})
		.setProtectedHeader({ alg: "RS256" })
		.setIssuedAt(nowSeconds - 60)
		.setExpirationTime(nowSeconds + 10 * 60)
		.setIssuer(appId)
		.sign(key);

	const tokenResponse = await fetch(
		`https://api.github.com/app/installations/${installationId}/access_tokens`,
		{
			method: "POST",
			headers: githubHeaders(appJwt, true),
		}
	);

	const tokenJson = (await tokenResponse.json()) as {
		token?: string;
		expires_at?: string;
		error?: string;
		message?: string;
	};

	if (!tokenResponse.ok || !tokenJson.token || !tokenJson.expires_at) {
		throw new Error(tokenJson.message ?? tokenJson.error ?? "Installation token failed");
	}

	return {
		token: tokenJson.token,
		expiresAt: Date.parse(tokenJson.expires_at),
	};
}

async function fetchInstallationRepositories(token: string): Promise<GithubRepo[]> {
	const response = await fetch(
		"https://api.github.com/installation/repositories?per_page=100",
		{
			headers: githubHeaders(token),
		}
	);

	if (!response.ok) {
		throw new Error("Failed to list installation repositories");
	}

	const json = (await response.json()) as {
		repositories: Array<{
			name: string;
			full_name: string;
			owner: { login: string };
		}>;
	};

	return json.repositories.map((repo) => ({
		name: repo.name,
		fullName: repo.full_name,
		owner: repo.owner.login,
	}));
}

type RepoStructureSummary = {
	topLevel: Record<string, number>;
	appPaths: string[];
	packagePaths: string[];
	hasConvex: boolean;
	hasWebapp: boolean;
	hasWebsite: boolean;
	monorepoSignal: boolean;
	fileCount: number;
	fileSamples?: Array<{ path: string; excerpt: string }>;
};

function buildRepoStructureSummary(
	entries: Array<{ path?: string; type?: string }>,
): RepoStructureSummary {
	const topLevelCounts: Record<string, number> = {};
	const appPaths = new Set<string>();
	const packagePaths = new Set<string>();
	let hasConvex = false;
	let hasWebapp = false;
	let hasWebsite = false;
	let fileCount = 0;

	for (const entry of entries) {
		if (!entry.path || entry.type !== "blob") continue;
		fileCount += 1;
		const parts = entry.path.split("/").filter(Boolean);
		const top = parts[0];
		if (!top) continue;
		topLevelCounts[top] = (topLevelCounts[top] ?? 0) + 1;

		if (parts[0] === "apps" && parts[1]) {
			appPaths.add(`${parts[0]}/${parts[1]}`);
			if (parts[1] === "webapp") hasWebapp = true;
			if (parts[1] === "website") hasWebsite = true;
		}
		if (parts[0] === "packages" && parts[1]) {
			packagePaths.add(`${parts[0]}/${parts[1]}`);
			if (parts[1] === "convex") hasConvex = true;
		}
		if (parts[0] === "convex") {
			hasConvex = true;
		}
	}

	const monorepoSignal =
		(appPaths.size > 0 && packagePaths.size > 0) ||
		appPaths.size + packagePaths.size >= 2;

	return {
		topLevel: topLevelCounts,
		appPaths: Array.from(appPaths).sort(),
		packagePaths: Array.from(packagePaths).sort(),
		hasConvex,
		hasWebapp,
		hasWebsite,
		monorepoSignal,
		fileCount,
	};
}

async function fetchRepoFileSamples(
	token: string,
	repoFullName: string,
	entries: Array<{ path?: string; type?: string }>,
	summary: RepoStructureSummary,
): Promise<Array<{ path: string; excerpt: string }>> {
	const entrySet = new Set(
		entries
			.filter((entry) => entry.type === "blob" && entry.path)
			.map((entry) => entry.path as string),
	);
	const candidatePaths = new Set<string>([
		"README.md",
		"package.json",
		"pnpm-workspace.yaml",
		"turbo.json",
	]);

	for (const appPath of summary.appPaths) {
		candidatePaths.add(`${appPath}/package.json`);
	}
	for (const pkgPath of summary.packagePaths) {
		candidatePaths.add(`${pkgPath}/package.json`);
	}
	if (summary.hasConvex) {
		candidatePaths.add("packages/convex/package.json");
		candidatePaths.add("packages/convex/convex.config.ts");
	}

	const availablePaths = Array.from(candidatePaths).filter((path) =>
		entrySet.has(path),
	);
	const limitedPaths = availablePaths.slice(0, 10);
	const results: Array<{ path: string; excerpt: string }> = [];

	for (const path of limitedPaths) {
		const content = await fetchRepoFileContent(token, repoFullName, path);
		if (!content) continue;
		results.push({
			path,
			excerpt: content,
		});
	}

	return results;
}

async function fetchRepoFileContent(
	token: string,
	repoFullName: string,
	path: string,
): Promise<string | null> {
	const response = await fetch(
		`https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(
			path,
		)}`,
		{ headers: githubHeaders(token) },
	);
	if (!response.ok) {
		return null;
	}
	const json = (await response.json()) as {
		content?: string;
		encoding?: string;
	};
	if (!json.content || json.encoding !== "base64") {
		return null;
	}
	const decoded = decodeBase64(json.content);
	const normalized = decoded.replace(/\r\n/g, "\n").trim();
	return normalized.length > 1200 ? `${normalized.slice(0, 1200)}...` : normalized;
}

function decodeBase64(value: string): string {
	if (typeof atob === "function") {
		return atob(value);
	}

	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	let output = "";
	let buffer = 0;
	let bits = 0;

	for (let i = 0; i < value.length; i += 1) {
		const char = value.charAt(i);
		if (char === "=") break;
		const index = chars.indexOf(char);
		if (index < 0) continue;
		buffer = (buffer << 6) | index;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			output += String.fromCharCode((buffer >> bits) & 0xff);
		}
	}

	return output;
}

async function fetchRepoEvents(
	token: string,
	repo: GithubRepo,
	since: number
): Promise<NormalizedGithubEvent[]> {
	const [commits, pullRequests, releases] = await Promise.all([
		fetchRepoCommits(token, repo, since),
		fetchRepoPullRequests(token, repo, since),
		fetchRepoReleases(token, repo, since),
	]);

	return [...commits, ...pullRequests, ...releases];
}

async function fetchRepoCommits(
	token: string,
	repo: GithubRepo,
	since: number
): Promise<NormalizedGithubEvent[]> {
	const sinceIso = new Date(since).toISOString();
	const response = await fetch(
		`https://api.github.com/repos/${repo.fullName}/commits?since=${encodeURIComponent(
			sinceIso
		)}&per_page=50`,
		{
			headers: githubHeaders(token),
		}
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch commits for ${repo.fullName}`);
	}

	const commits = (await response.json()) as Array<{
		sha: string;
		html_url?: string;
		commit: {
			message?: string;
			author?: { date?: string; name?: string };
			committer?: { date?: string };
		};
		author?: { login?: string };
	}>;

	const maxFileLookups = 20;
	const events: NormalizedGithubEvent[] = [];

	for (const [index, commit] of commits.entries()) {
		const occurredAt = Date.parse(
			commit.commit.author?.date ??
				commit.commit.committer?.date ??
				new Date().toISOString()
		);

		const message = commit.commit.message ?? "";
		const [title, ...rest] = message.split("\n");
		const body = rest.join("\n") || message;
		const filePaths =
			index < maxFileLookups
				? await fetchCommitFiles(token, repo, commit.sha)
				: undefined;

		events.push({
			externalId: `commit:${repo.fullName}:${commit.sha}`,
			sourceType: "commit",
			title: title || "Commit",
			body: body || undefined,
			filePaths,
			author: {
				login: commit.author?.login ?? undefined,
				name: commit.commit.author?.name ?? undefined,
			},
			url: commit.html_url ?? "",
			occurredAt: Number.isNaN(occurredAt) ? Date.now() : occurredAt,
			repo,
		} satisfies NormalizedGithubEvent);
	}

	return events;
}

async function fetchRepoPullRequests(
	token: string,
	repo: GithubRepo,
	since: number
): Promise<NormalizedGithubEvent[]> {
	const response = await fetch(
		`https://api.github.com/repos/${repo.fullName}/pulls?state=all&sort=updated&direction=desc&per_page=50`,
		{
			headers: githubHeaders(token),
		}
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch pull requests for ${repo.fullName}`);
	}

	const pullRequests = (await response.json()) as Array<{
		id: number;
		number: number;
		html_url?: string;
		title?: string;
		body?: string | null;
		user?: { login?: string | null };
		merged_at?: string | null;
		closed_at?: string | null;
		created_at?: string;
		updated_at?: string;
		state?: string;
	}>;
	const maxFileLookups = 20;

	return Promise.all(
		pullRequests
		.filter((pr) => {
			const reference =
				pr.merged_at ?? pr.closed_at ?? pr.created_at ?? pr.updated_at ?? null;
			if (!reference) return true;
			return Date.parse(reference) >= since;
		})
		.map(async (pr, index) => {
			const occurredAtRaw =
				pr.merged_at ?? pr.closed_at ?? pr.created_at ?? pr.updated_at ?? "";
			const occurredAt = Date.parse(occurredAtRaw);
			const action =
				pr.merged_at !== null && pr.merged_at !== undefined
					? "merged"
					: pr.state === "closed"
						? "closed"
						: "opened";
			const filePaths =
				index < maxFileLookups
					? await fetchPullRequestFiles(token, repo, pr.number)
					: undefined;

			return {
				externalId: `pull_request:${repo.fullName}:${pr.id}`,
				sourceType: "pull_request",
				title: pr.title ?? "Pull request",
				body: pr.body ?? undefined,
				filePaths,
				author: {
					login: pr.user?.login ?? undefined,
				},
				url: pr.html_url ?? "",
				occurredAt: Number.isNaN(occurredAt) ? Date.now() : occurredAt,
				repo,
				action,
			} satisfies NormalizedGithubEvent;
		}),
	);
}

async function fetchRepoReleases(
	token: string,
	repo: GithubRepo,
	since: number
): Promise<NormalizedGithubEvent[]> {
	const response = await fetch(
		`https://api.github.com/repos/${repo.fullName}/releases?per_page=50`,
		{
			headers: githubHeaders(token),
		}
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch releases for ${repo.fullName}`);
	}

	const releases = (await response.json()) as Array<{
		id?: number;
		tag_name?: string;
		name?: string | null;
		body?: string | null;
		html_url?: string;
		published_at?: string | null;
		created_at?: string | null;
		draft?: boolean;
	}>;

	return releases
		.filter((release) => !release.draft)
		.filter((release) => {
			const reference = release.published_at ?? release.created_at ?? null;
			if (!reference) return true;
			return Date.parse(reference) >= since;
		})
		.map((release) => {
			const occurredAtRaw = release.published_at ?? release.created_at ?? "";
			const occurredAt = Date.parse(occurredAtRaw);
			const externalIdBase = release.id ?? release.tag_name ?? "unknown";

			return {
				externalId: `release:${repo.fullName}:${externalIdBase}`,
				sourceType: "release",
				title: release.name ?? release.tag_name ?? "Release",
				body: release.body ?? undefined,
				url: release.html_url ?? "",
				occurredAt: Number.isNaN(occurredAt) ? Date.now() : occurredAt,
				repo,
				action: "published",
			} satisfies NormalizedGithubEvent;
		});
}

async function fetchCommitFiles(
	token: string,
	repo: GithubRepo,
	sha: string,
): Promise<string[] | undefined> {
	try {
		const response = await fetch(
			`https://api.github.com/repos/${repo.fullName}/commits/${sha}`,
			{ headers: githubHeaders(token) },
		);
		if (!response.ok) return undefined;
		const json = (await response.json()) as {
			files?: Array<{ filename?: string }>;
		};
		const files =
			json.files?.map((file) => file.filename).filter(Boolean) ?? [];
		return files.slice(0, 20) as string[];
	} catch (error) {
		return undefined;
	}
}

async function fetchPullRequestFiles(
	token: string,
	repo: GithubRepo,
	number: number,
): Promise<string[] | undefined> {
	try {
		const response = await fetch(
			`https://api.github.com/repos/${repo.fullName}/pulls/${number}/files?per_page=100`,
			{ headers: githubHeaders(token) },
		);
		if (!response.ok) return undefined;
		const json = (await response.json()) as Array<{ filename?: string }>;
		const files = json.map((file) => file.filename).filter(Boolean);
		return files.slice(0, 20) as string[];
	} catch (error) {
		return undefined;
	}
}

function githubHeaders(token: string, isAppJwt = false) {
	return {
		Accept: "application/vnd.github+json",
		Authorization: `${isAppJwt ? "Bearer" : "token"} ${token}`,
		"User-Agent": "hikai-connectors",
	};
}
