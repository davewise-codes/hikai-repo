import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
	LLMPort,
	LLMGenerateParams,
	LLMGenerateResult,
} from "../ports/llmPort";

export function createAnthropicAdapter(
	modelId: string = "claude-3-haiku-20240307"
): LLMPort {
	return {
		async generateText(
			params: LLMGenerateParams
		): Promise<LLMGenerateResult> {
			const startTime = Date.now();

			const result = await generateText({
				model: anthropic(modelId),
				system: params.systemPrompt,
				prompt: params.prompt,
				maxOutputTokens: params.maxTokens ?? 1024,
				temperature: params.temperature,
				topP: params.topP,
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
				provider: "anthropic",
				latencyMs,
			};
		},

		getProviderInfo() {
			return { name: "anthropic", model: modelId };
		},
	};
}
