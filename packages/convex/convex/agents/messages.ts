import { v } from "convex/values";
import { query } from "../_generated/server";
import { components } from "../_generated/api";
import type { AgentComponent } from "@convex-dev/agent";

const agentComponent = (components as { agent: AgentComponent }).agent;

export const listThreadMessages = query({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, { threadId }) => {
		return await ctx.runQuery(agentComponent.messages.listMessagesByThreadId, {
			threadId,
			order: "asc",
			excludeToolMessages: true,
			paginationOpts: {
				cursor: null,
				numItems: 100,
			},
		});
	},
});
