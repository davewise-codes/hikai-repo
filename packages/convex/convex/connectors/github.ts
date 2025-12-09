import {
	query,
	httpAction,
	internalMutation,
	internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { assertProductAccess } from "../lib/access";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { SignJWT, importPKCS8 } from "jose";

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
