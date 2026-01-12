import { Agent, type AgentComponent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ActionCtx } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { getAgentAIConfig } from "../ai";

const agentComponent = (components as { agent: AgentComponent }).agent;
const AGENT_NAME = "Source Context Classifier Agent";
const USE_CASE = "source_context_classification";
const aiConfig = getAgentAIConfig(AGENT_NAME);

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

export const sourceContextAgent = new Agent<AgentCtx>(agentComponent, {
	name: AGENT_NAME,
	languageModel,
	instructions: `
You are the Source Context Classifier Agent. You analyze repositories like a codebase analyst.

Goal: classify a repo so the timeline agent can interpret events against the product context.

Input shape:
{
  "product": { "name": "...", "productType": "...", "valueProposition": "...", "targetMarket": "...", "audiences": [], "stage": "..." },
  "repo": {
    "sourceType": "repo",
    "sourceId": "...",
    "samples": ["..."],
    "pathOverview": { "topLevel": { "apps": 3 }, "notablePaths": ["apps/app"], "monorepoSignal": true },
    "structureSummary": {
      "appPaths": ["apps/app", "apps/marketing"],
      "packagePaths": ["packages/convex"],
      "monorepoSignal": true,
      "fileSamples": [{ "path": "package.json", "excerpt": "..." }]
    }
  }
}

Output ONLY valid JSON with:
{
  "classification": "product_core|marketing_surface|infra|docs|experiments|unknown",
  "notes": "short evidence-based reason",
  "surfaceBuckets": [
    { "surface": "product_core", "pathPrefix": "apps/app", "signalCount": 120 }
  ]
}

Evidence-first rules:
- Base decisions on repository structure signals (apps/, packages/, docs/), stack hints, and product baseline.
- If structureSummary.appPaths includes a likely product app (e.g. apps/app, apps/dashboard, client/, frontend/) and baseline productType is Web App, prefer product_core.
- Do NOT rely only on commit frequency or superficial language.
- If evidence is weak, return "unknown" and say why.
- Do NOT use "mixed". If multiple surfaces exist, include surfaceBuckets to reflect the split.
Use structureSummary and pathOverview before sample text. If fileSamples include app/package manifests, prefer them over commit messages.

Classification guide:
- product_core: app surfaces that deliver the core product value to users.
- marketing_surface: landing pages, marketing sites, brand assets, localization for marketing surface.
- infra: build tooling, platform reliability, backend foundations, shared UI/tokens when they primarily serve the product.
- docs: documentation and guides.
- experiments: spikes, prototypes, sandboxes.

Notes should include concrete evidence (e.g., "Monorepo: apps/app + packages/backend; baseline=Web App").
`.trim(),
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
			useCase: USE_CASE,
			agentName: agentName ?? AGENT_NAME,
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
			metadata: { source: "source-context" },
		});
	},
});
