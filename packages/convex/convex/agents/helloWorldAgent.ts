import { Agent, type AgentComponent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "../_generated/api";

const agentComponent = (components as { agent: AgentComponent }).agent;

export const helloWorldAgent = new Agent(agentComponent, {
	name: "Hello World Agent",
	languageModel: openai.chat("gpt-4o-mini"),
	instructions: "You are a helpful assistant. Respond concisely and friendly.",
});
