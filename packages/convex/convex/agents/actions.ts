import { v } from "convex/values";
import { action } from "../_generated/server";
import { createThread, type AgentComponent } from "@convex-dev/agent";
import { components } from "../_generated/api";
import { helloWorldAgent } from "./helloWorldAgent";

const agentComponent = (components as { agent: AgentComponent }).agent;

export const chat = action({
	args: {
		prompt: v.string(),
		threadId: v.optional(v.string()),
	},
	handler: async (ctx, { prompt, threadId }) => {
		const tid = threadId ?? (await createThread(ctx, agentComponent));

		const result = await helloWorldAgent.generateText(ctx, { threadId: tid }, { prompt });

		return {
			text: result.text,
			threadId: tid,
		};
	},
});

export const chatStream = action({
	args: {
		prompt: v.string(),
		threadId: v.optional(v.string()),
	},
	handler: async (ctx, { prompt, threadId }) => {
		const tid = threadId ?? (await createThread(ctx, agentComponent));

		await helloWorldAgent.streamText(
			ctx,
			{ threadId: tid },
			{ prompt },
			{ saveStreamDeltas: true },
		);

		return {
			threadId: tid,
		};
	},
});
