import { Agent, type AgentComponent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

const agentComponent = (components as { agent: AgentComponent }).agent;

type AgentCtx = {
	organizationId: Id<"organizations">;
	productId?: Id<"products">;
	userId: Id<"users">;
	aiPrompt?: string;
	aiStartMs?: number;
};

export const helloWorldAgent = new Agent<AgentCtx>(agentComponent, {
	name: "Hello World Agent",
	languageModel: openai.chat("gpt-4o-mini"),
	instructions: "You are a helpful assistant. Respond concisely and friendly.",
	usageHandler: async (ctx, { usage, provider, model, threadId, agentName }) => {
		const customCtx = ctx as ActionCtx & Partial<AgentCtx>;
		if (!customCtx.organizationId || !customCtx.userId) {
			return;
		}

		const tokensIn = usage.inputTokens ?? usage.cachedInputTokens ?? 0;
		const tokensOut = usage.outputTokens ?? 0;
		const totalTokens = usage.totalTokens ?? tokensIn + tokensOut;

		const latencyMs =
			customCtx.aiStartMs !== undefined
				? Date.now() - customCtx.aiStartMs
				: 0;

		await ctx.runMutation(internal.ai.telemetry.recordUsage, {
			organizationId: customCtx.organizationId,
			productId: customCtx.productId,
			userId: customCtx.userId,
			useCase: "ai_test",
			agentName: agentName ?? "Hello World Agent",
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
			metadata: { source: "ai-test", trackedBy: "usageHandler" },
		});
	},
});
