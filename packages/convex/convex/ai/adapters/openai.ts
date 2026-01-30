import { generateText, jsonSchema, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import {
	LLMPort,
	LLMGenerateParams,
	LLMGenerateResult,
	LLMGenerateWithToolsParams,
	LLMGenerateWithToolsResult,
	LLMToolCall,
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
				provider: "openai",
				latencyMs,
			};
		},

		async generateWithTools(
			params: LLMGenerateWithToolsParams
		): Promise<LLMGenerateWithToolsResult> {
			const startTime = Date.now();
			const tools = Object.fromEntries(
				params.tools.map((tool) => [
					tool.name,
					{
						description: tool.description,
						inputSchema: jsonSchema(tool.parameters),
					},
				])
			);

			const result = await generateText({
				model: openai(modelId),
				system: params.systemPrompt,
				messages: params.messages as unknown as ModelMessage[],
				tools,
				maxOutputTokens: params.maxTokens,
				temperature: params.temperature,
			});

			const latencyMs = Date.now() - startTime;
			const tokensIn = result.usage?.inputTokens ?? 0;
			const tokensOut = result.usage?.outputTokens ?? 0;
			const totalTokens =
				result.usage?.totalTokens ?? tokensIn + tokensOut;
			const toolCalls: LLMToolCall[] = (result.toolCalls ?? []).map(
				(call, index) => ({
					toolCallId: call.toolCallId ?? `toolcall_${index}`,
					toolName: call.toolName ?? "",
					args: (call.input ?? {}) as Record<string, unknown>,
				})
			);
			const stopReason =
				result.finishReason === "tool-calls"
					? "tool_use"
					: result.finishReason === "length"
						? "max_tokens"
						: "end_turn";

			return {
				text: result.text,
				toolCalls,
				stopReason,
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
