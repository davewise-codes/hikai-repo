import { generateText, jsonSchema } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
	LLMPort,
	LLMGenerateParams,
	LLMGenerateResult,
	LLMGenerateWithToolsParams,
	LLMGenerateWithToolsResult,
	LLMToolCall,
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
				model: anthropic(modelId),
				system: params.systemPrompt,
				messages: params.messages as unknown,
				tools,
				maxOutputTokens: params.maxTokens ?? 1024,
				temperature: params.temperature,
			});

			const latencyMs = Date.now() - startTime;
			const tokensIn = result.usage?.inputTokens ?? 0;
			const tokensOut = result.usage?.outputTokens ?? 0;
			const totalTokens =
				result.usage?.totalTokens ?? tokensIn + tokensOut;
			const toolCalls: LLMToolCall[] = (result.toolCalls ?? []).map(
				(call, index) => ({
					toolCallId: call.toolCallId ?? call.id ?? `toolcall_${index}`,
					toolName: call.toolName ?? call.name ?? "",
					args: (call.args ?? call.arguments ?? {}) as Record<string, unknown>,
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
				provider: "anthropic",
				latencyMs,
			};
		},

		getProviderInfo() {
			return { name: "anthropic", model: modelId };
		},
	};
}
