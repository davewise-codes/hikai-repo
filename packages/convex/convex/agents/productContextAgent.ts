import { Agent, type AgentComponent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { components, internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAIConfig } from "../ai";
import { productContextPrompt } from "../ai/prompts";

const agentComponent = (components as { agent: AgentComponent }).agent;
const aiConfig = getAIConfig();

type AgentCtx = {
	organizationId: Id<"organizations">;
	productId: Id<"products">;
	userId: Id<"users">;
	aiPrompt?: string;
	aiStartMs?: number;
};

const languageModel =
	aiConfig.provider === "anthropic"
		? anthropic(aiConfig.model)
		: openai.chat(aiConfig.model);

export const productContextAgent = new Agent<AgentCtx>(agentComponent, {
	name: "Product Context Agent",
	languageModel,
	instructions: productContextPrompt,
	usageHandler: async (ctx, { usage, provider, model, threadId, agentName }) => {
		const customCtx = ctx as ActionCtx & Partial<AgentCtx>;
		if (!customCtx.organizationId || !customCtx.userId) {
			return;
		}

		const tokensIn = usage.inputTokens ?? usage.cachedInputTokens ?? 0;
		const tokensOut = usage.outputTokens ?? 0;
		const totalTokens = usage.totalTokens ?? tokensIn + tokensOut;
		const latencyMs =
			customCtx.aiStartMs !== undefined ? Date.now() - customCtx.aiStartMs : 0;

		await ctx.runMutation(internal.ai.telemetry.recordUsage, {
			organizationId: customCtx.organizationId,
			productId: customCtx.productId,
			userId: customCtx.userId,
			useCase: "product_context_enrichment",
			agentName: agentName ?? "Product Context Agent",
			threadId: threadId ?? undefined,
			result: {
				text: "",
				tokensIn,
				tokensOut,
				totalTokens,
				model,
				provider,
				latencyMs,
			},
			prompt: customCtx.aiPrompt,
			response: undefined,
			metadata: { source: "product-context", trackedBy: "usageHandler" },
		});
	},
});
