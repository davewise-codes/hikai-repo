import type {
	LLMPort,
	LLMToolCall,
	LLMToolDefinition,
} from "../../ai/ports/llmPort";
import type { AgentMessage, AgentModel, AgentModelResponse } from "./agent_loop";
import type { ToolDefinition } from "./tool_registry";

type ToolPromptModelOptions = {
	protocol?: string;
};

export function createToolPromptModel(
	adapter: LLMPort,
	options?: ToolPromptModelOptions,
): AgentModel {
	return {
		generate: async ({ messages, tools, maxTokens, temperature, topP }) => {
			if (!adapter.generateWithTools) {
				throw new Error("LLM adapter does not support native tools");
			}
			const response = await adapter.generateWithTools({
				messages,
				systemPrompt: options?.protocol,
				tools: buildToolDefinitions(tools),
				maxTokens,
				temperature,
			});
			return normalizeNativeResponse(response);
		},
	};
}

function buildToolDefinitions(tools: ToolDefinition[]): LLMToolDefinition[] {
	return tools.map((tool) => ({
		name: tool.name,
		description: tool.description ?? "",
		parameters:
			tool.inputSchema ??
			({ type: "object", additionalProperties: true } as const),
	}));
}

function normalizeNativeResponse(response: {
	text: string;
	toolCalls: LLMToolCall[];
	stopReason: "tool_use" | "end_turn" | "max_tokens";
	tokensIn: number;
	tokensOut: number;
	totalTokens: number;
}): AgentModelResponse {
	const toolCalls = response.toolCalls?.length
		? response.toolCalls.map((call) => ({
				id: call.toolCallId,
				name: call.toolName,
				input: call.args,
			}))
		: undefined;
	const stopReason = response.stopReason === "tool_use" ? "tool_use" : "end";

	return {
		text: response.text,
		stopReason,
		toolCalls,
		tokensIn: response.tokensIn,
		tokensOut: response.tokensOut,
		totalTokens: response.totalTokens,
		_debug: {
			rawText: response.text,
			extracted: toolCalls ?? null,
		},
	};
}
