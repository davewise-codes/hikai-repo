import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
	LLMPort,
	LLMGenerateParams,
	LLMGenerateResult,
} from "../ports/llmPort";

export function createOpenAIAdapter(modelId: string = "gpt-4o-mini"): LLMPort {
	return {
		async generateText(
			params: LLMGenerateParams
		): Promise<LLMGenerateResult> {
			const startTime = Date.now();

			const result = await generateText({
				model: openai(modelId),
				system: params.systemPrompt,
				prompt: params.prompt,
				maxOutputTokens: params.maxTokens,
				temperature: params.temperature,
			});

			const latencyMs = Date.now() - startTime;
			const tokensIn = result.usage?.inputTokens ?? 0;
			const tokensOut = result.usage?.outputTokens ?? 0;
			const totalTokens =
				result.usage?.totalTokens ?? tokensIn + tokensOut;

			return {
				text: result.text,
				tokensIn,
				tokensOut,
				totalTokens,
				model: modelId,
				provider: "openai",
				latencyMs,
			};
		},

		getProviderInfo() {
			return { name: "openai", model: modelId };
		},
	};
}
