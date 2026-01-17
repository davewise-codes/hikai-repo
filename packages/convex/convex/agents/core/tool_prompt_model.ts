import type { LLMPort } from "../../ai/ports/llmPort";
import type { AgentMessage, AgentModel, AgentModelResponse } from "./agent_loop";
import type { ToolDefinition, ToolCall } from "./tool_registry";
import { extractJsonPayload } from "./json_utils";

type ToolPromptModelOptions = {
	protocol?: string;
};

const DEFAULT_PROTOCOL = [
	"You are an autonomous agent.",
	"You must respond with a single JSON object and no extra text.",
	"Use this schema for tool calls:",
	'{"type":"tool_use","toolCalls":[{"id":"call-1","name":"tool_name","input":{}}]}',
	"Use this schema for final output:",
	'{"type":"final","output":{}}',
	"Only call tools listed in the tool catalog.",
].join("\n");

export function createToolPromptModel(
	adapter: LLMPort,
	options?: ToolPromptModelOptions,
): AgentModel {
	return {
		generate: async ({ messages, tools, maxTokens, temperature, topP }) => {
			const prompt = buildPrompt(messages, tools, options?.protocol);
			const response = await adapter.generateText({
				prompt,
				maxTokens,
				temperature,
				topP,
			});

			return parseResponse(response.text, response);
		},
	};
}

function buildPrompt(
	messages: AgentMessage[],
	tools: ToolDefinition[],
	protocol?: string,
): string {
	const toolCatalog = tools.map((tool) => ({
		name: tool.name,
		description: tool.description ?? "",
	}));

	const conversation = messages
		.map((message) => `${message.role.toUpperCase()}: ${message.content}`)
		.join("\n\n");

	return [
		protocol ?? DEFAULT_PROTOCOL,
		"Tool catalog:",
		JSON.stringify(toolCatalog, null, 2),
		"Conversation:",
		conversation,
	].join("\n\n");
}

function parseResponse(
	text: string,
	meta: {
		tokensIn: number;
		tokensOut: number;
		totalTokens: number;
	},
): AgentModelResponse {
	const extracted = extractJsonPayload(text);
	if (extracted && extracted.data && typeof extracted.data === "object") {
		const data = extracted.data as Record<string, unknown>;
		if (data.type === "tool_use" && Array.isArray(data.toolCalls)) {
			return {
				text,
				stopReason: "tool_use",
				toolCalls: normalizeToolCalls(data.toolCalls),
				tokensIn: meta.tokensIn,
				tokensOut: meta.tokensOut,
				totalTokens: meta.totalTokens,
			};
		}

		if (data.type === "final" && "output" in data) {
			return {
				text: JSON.stringify(data.output, null, 2),
				stopReason: "end",
				tokensIn: meta.tokensIn,
				tokensOut: meta.tokensOut,
				totalTokens: meta.totalTokens,
			};
		}

		if (Array.isArray(data.toolCalls)) {
			return {
				text,
				stopReason: "tool_use",
				toolCalls: normalizeToolCalls(data.toolCalls),
				tokensIn: meta.tokensIn,
				tokensOut: meta.tokensOut,
				totalTokens: meta.totalTokens,
			};
		}
	}

	return {
		text,
		stopReason: "end",
		tokensIn: meta.tokensIn,
		tokensOut: meta.tokensOut,
		totalTokens: meta.totalTokens,
	};
}

function normalizeToolCalls(toolCalls: unknown[]): ToolCall[] {
	return toolCalls
		.map((call, index) => {
			if (!call || typeof call !== "object") return null;
			const toolCall = call as { name?: string; input?: unknown; id?: string };
			if (!toolCall.name) return null;
			return {
				name: toolCall.name,
				input: toolCall.input ?? {},
				id: toolCall.id ?? `call-${index + 1}`,
			};
		})
		.filter((call): call is ToolCall => Boolean(call));
}
