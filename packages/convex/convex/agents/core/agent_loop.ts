import {
	executeToolCall,
	type ToolCall,
	type ToolDefinition,
	type ToolResult,
} from "./tool_registry";

export type AgentMessage = {
	role: "user" | "assistant";
	content: string;
};

export type AgentModelResponse = {
	text: string;
	stopReason: "tool_use" | "end";
	toolCalls?: ToolCall[];
	tokensIn?: number;
	tokensOut?: number;
	totalTokens?: number;
};

export type AgentModel = {
	generate: (params: {
		messages: AgentMessage[];
		tools: ToolDefinition[];
		maxTokens?: number;
		temperature?: number;
		topP?: number;
	}) => Promise<AgentModelResponse>;
};

export type AgentLoopSampling = {
	temperature?: number;
	topP?: number;
};

export interface AgentLoopConfig {
	maxTurns: number;
	maxTokens?: number;
	timeoutMs: number;
	tools?: ToolDefinition[];
	sampling?: AgentLoopSampling;
	onStep?: (step: StepResult) => Promise<void>;
}

export type AgentLoopStatus =
	| "completed"
	| "max_turns_exceeded"
	| "timeout"
	| "error";

export type AgentLoopMetrics = {
	turns: number;
	tokensIn: number;
	tokensOut: number;
	totalTokens: number;
	latencyMs: number;
};

export type AgentLoopResult = {
	text: string;
	status: AgentLoopStatus;
	metrics: AgentLoopMetrics;
	errorMessage?: string;
};

export type StepResult = {
	turn: number;
	toolCalls: ToolCall[];
	results: ToolResult[];
};

const DEFAULT_SAMPLING: AgentLoopSampling = {};

export async function executeAgentLoop(
	model: AgentModel,
	config: AgentLoopConfig,
	initialPrompt: string,
	initialMessages?: AgentMessage[],
): Promise<AgentLoopResult> {
	const startMs = Date.now();
	const messages: AgentMessage[] =
		initialMessages && initialMessages.length > 0
			? [...initialMessages]
			: [{ role: "user", content: initialPrompt }];
	const tools = config.tools ?? [];
	const sampling = { ...DEFAULT_SAMPLING, ...config.sampling };
	let tokensIn = 0;
	let tokensOut = 0;
	let totalTokens = 0;
	let turns = 0;

	while (turns < config.maxTurns) {
		if (Date.now() - startMs > config.timeoutMs) {
			return {
				text: "",
				status: "timeout",
				metrics: buildMetrics(startMs, turns, tokensIn, tokensOut, totalTokens),
			};
		}

		let response: AgentModelResponse;
		try {
			response = await model.generate({
				messages,
				tools,
				maxTokens: config.maxTokens,
				temperature: sampling.temperature,
				topP: sampling.topP,
			});
		} catch (error) {
			return {
				text: "",
				status: "error",
				metrics: buildMetrics(startMs, turns, tokensIn, tokensOut, totalTokens),
				errorMessage: error instanceof Error ? error.message : "Unknown error",
			};
		}

		tokensIn += response.tokensIn ?? 0;
		tokensOut += response.tokensOut ?? 0;
		totalTokens += response.totalTokens ?? 0;

		if (response.stopReason !== "tool_use" || !response.toolCalls?.length) {
			return {
				text: response.text,
				status: "completed",
				metrics: buildMetrics(startMs, turns + 1, tokensIn, tokensOut, totalTokens),
			};
		}

		const results = await executeToolCalls(response.toolCalls, tools);
		messages.push({ role: "assistant", content: response.text });
		messages.push({ role: "user", content: formatToolResults(results) });

		if (config.onStep) {
			await config.onStep({ turn: turns, toolCalls: response.toolCalls, results });
		}

		turns += 1;
	}

	return {
		text: "",
		status: "max_turns_exceeded",
		metrics: buildMetrics(startMs, turns, tokensIn, tokensOut, totalTokens),
	};
}

async function executeToolCalls(
	toolCalls: ToolCall[],
	tools: ToolDefinition[],
): Promise<ToolResult[]> {
	const results: ToolResult[] = [];
	for (const call of toolCalls) {
		results.push(await executeToolCall(tools, call));
	}

	return results;
}

function formatToolResults(results: ToolResult[]): string {
	return JSON.stringify(results);
}

function buildMetrics(
	startMs: number,
	turns: number,
	tokensIn: number,
	tokensOut: number,
	totalTokens: number,
): AgentLoopMetrics {
	return {
		turns,
		tokensIn,
		tokensOut,
		totalTokens,
		latencyMs: Date.now() - startMs,
	};
}
