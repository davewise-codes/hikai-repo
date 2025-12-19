import { v } from "convex/values";
import { action } from "../_generated/server";
import { createThread, type AgentComponent } from "@convex-dev/agent";
import { components, internal } from "../_generated/api";
import { helloWorldAgent } from "./helloWorldAgent";
import { Id } from "../_generated/dataModel";

const agentComponent = (components as { agent: AgentComponent }).agent;
const DEFAULT_PROVIDER = "openai";
const DEFAULT_MODEL = "gpt-4o-mini";
const AGENT_NAME = "Hello World Agent";
const USE_CASE = "ai_test";
const SOURCE_METADATA = { source: "ai-test" };

export const chat = action({
	args: {
		prompt: v.string(),
		threadId: v.optional(v.string()),
		organizationId: v.optional(v.id("organizations")),
		productId: v.optional(v.id("products")),
	},
	handler: async (ctx, { prompt, threadId, organizationId, productId }) => {
		const { resolvedOrgId, resolvedProductId, userId } = await resolveAccess(
			ctx,
			organizationId,
			productId,
		);

		const start = Date.now();
		const tid = threadId ?? (await createThread(ctx, agentComponent));

		try {
			const result = await helloWorldAgent.generateText(ctx, { threadId: tid }, { prompt });
			const latencyMs = Date.now() - start;
			const tokensIn =
				(result as any)?.tokensIn ?? (result as any)?.usage?.inputTokens ?? 0;
			const tokensOut =
				(result as any)?.tokensOut ?? (result as any)?.usage?.outputTokens ?? 0;
			const totalTokens =
				(result as any)?.totalTokens ??
				(result as any)?.usage?.totalTokens ??
				tokensIn + tokensOut;

			await ctx.runMutation(internal.ai.telemetry.recordUsage, {
				organizationId: resolvedOrgId,
				productId: resolvedProductId,
				userId,
				useCase: USE_CASE,
				agentName: AGENT_NAME,
				threadId: tid,
				result: {
					text: result.text,
					tokensIn,
					tokensOut,
					totalTokens,
					model: DEFAULT_MODEL,
					provider: DEFAULT_PROVIDER,
					latencyMs,
				},
				prompt,
				response: result.text,
				metadata: SOURCE_METADATA,
			});

			return {
				text: result.text,
				threadId: tid,
			};
		} catch (error) {
			await ctx.runMutation(internal.ai.telemetry.recordError, {
				organizationId: resolvedOrgId,
				productId: resolvedProductId,
				userId,
				useCase: USE_CASE,
				agentName: AGENT_NAME,
				threadId: tid,
				provider: DEFAULT_PROVIDER,
				model: DEFAULT_MODEL,
				errorMessage:
					error instanceof Error ? error.message : "Unknown error invoking agent",
				prompt,
				metadata: SOURCE_METADATA,
			});

			throw error;
		}
	},
});

export const chatStream = action({
	args: {
		prompt: v.string(),
		threadId: v.optional(v.string()),
		organizationId: v.optional(v.id("organizations")),
		productId: v.optional(v.id("products")),
	},
	handler: async (ctx, { prompt, threadId, organizationId, productId }) => {
		const { resolvedOrgId, resolvedProductId, userId } = await resolveAccess(
			ctx,
			organizationId,
			productId,
		);
		const tid = threadId ?? (await createThread(ctx, agentComponent));
		const start = Date.now();

		try {
			await helloWorldAgent.streamText(
				ctx,
				{ threadId: tid },
				{ prompt },
				{ saveStreamDeltas: true },
			);

			const latencyMs = Date.now() - start;

			await ctx.runMutation(internal.ai.telemetry.recordUsage, {
				organizationId: resolvedOrgId,
				productId: resolvedProductId,
				userId,
				useCase: USE_CASE,
				agentName: AGENT_NAME,
				threadId: tid,
				result: {
					text: "",
					tokensIn: 0,
					tokensOut: 0,
					totalTokens: 0,
					model: DEFAULT_MODEL,
					provider: DEFAULT_PROVIDER,
					latencyMs,
				},
				prompt,
				response: undefined,
				metadata: SOURCE_METADATA,
			});
		} catch (error) {
			await ctx.runMutation(internal.ai.telemetry.recordError, {
				organizationId: resolvedOrgId,
				productId: resolvedProductId,
				userId,
				useCase: USE_CASE,
				agentName: AGENT_NAME,
				threadId: tid,
				provider: DEFAULT_PROVIDER,
				model: DEFAULT_MODEL,
				errorMessage:
					error instanceof Error ? error.message : "Unknown error invoking agent",
				prompt,
				metadata: SOURCE_METADATA,
			});

			throw error;
		}

		return {
			threadId: tid,
		};
	},
});

async function resolveAccess(
	ctx: any,
	organizationId?: Id<"organizations">,
	productId?: Id<"products">,
) {
	if (productId) {
		const access = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);
		return {
			resolvedOrgId: access.organizationId,
			resolvedProductId: productId,
			userId: access.userId,
		};
	}

	if (organizationId) {
		const access = await ctx.runQuery(
			internal.lib.access.assertOrgAccessInternal,
			{ organizationId },
		);
		return {
			resolvedOrgId: access.organizationId,
			resolvedProductId: undefined,
			userId: access.userId,
		};
	}

	throw new Error("organizationId or productId is required to run the agent");
}
