import {
	executeToolCall,
	type ToolCall,
	type ToolDefinition,
	type ToolResult,
} from "./tool_registry";
import { extractJsonPayload } from "./json_utils";
import { renderPlan, type PlanManager } from "./plan_manager";

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

export type AgentLoopValidationResult = {
	valid: boolean;
	errors: string[];
	warnings: string[];
};

export type AgentLoopValidationConfig = {
	validate: (output: unknown) => AgentLoopValidationResult;
	onValidation?: (
		result: AgentLoopValidationResult,
		output: unknown | null,
		rawText?: string,
		hadExtraText?: boolean,
	) => Promise<void>;
	buildFeedback?: (result: AgentLoopValidationResult) => string;
};

export interface AgentLoopConfig {
	maxTurns: number;
	maxTokens?: number;
	maxTotalTokens?: number;
	timeoutMs: number;
	tools?: ToolDefinition[];
	sampling?: AgentLoopSampling;
	onStep?: (step: StepResult) => Promise<void>;
	onModelResponse?: (step: ModelResponseStep) => Promise<void>;
	validation?: AgentLoopValidationConfig;
	planNag?: {
		threshold: number;
		message: string;
	};
}

export type AgentLoopStatus =
	| "completed"
	| "max_turns_exceeded"
	| "budget_exceeded"
	| "timeout"
	| "error";

export type AgentLoopMetrics = {
	turns: number;
	tokensIn: number;
	tokensOut: number;
	totalTokens: number;
	latencyMs: number;
	maxTurns: number;
	maxTotalTokens?: number;
};

export type AgentLoopResult = {
	text: string;
	rawText?: string;
	output?: unknown;
	status: AgentLoopStatus;
	metrics: AgentLoopMetrics;
	errorMessage?: string;
};

export type StepResult = {
	turn: number;
	toolCalls: ToolCall[];
	results: ToolResult[];
};

export type ModelResponseStep = {
	turn: number;
	response: AgentModelResponse;
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
	let lastPlan: PlanManager | null = null;
	let turnsSincePlanUpdate = 0;

	while (turns < config.maxTurns) {
		if (
			config.maxTotalTokens !== undefined &&
			totalTokens >= config.maxTotalTokens
		) {
			return {
				text: "",
				status: "budget_exceeded",
				metrics: buildMetrics(
					startMs,
					turns,
					tokensIn,
					tokensOut,
					totalTokens,
					config,
				),
			};
		}

		if (Date.now() - startMs > config.timeoutMs) {
			return {
				text: "",
				status: "timeout",
				metrics: buildMetrics(
					startMs,
					turns,
					tokensIn,
					tokensOut,
					totalTokens,
					config,
				),
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
				metrics: buildMetrics(
					startMs,
					turns,
					tokensIn,
					tokensOut,
					totalTokens,
					config,
				),
				errorMessage: error instanceof Error ? error.message : "Unknown error",
			};
		}

		tokensIn += response.tokensIn ?? 0;
		tokensOut += response.tokensOut ?? 0;
		totalTokens += response.totalTokens ?? 0;

		if (config.onModelResponse) {
			await config.onModelResponse({ turn: turns, response });
		}

		if (
			config.maxTotalTokens !== undefined &&
			totalTokens > config.maxTotalTokens
		) {
			return {
				text: response.text,
				status: "budget_exceeded",
				metrics: buildMetrics(
					startMs,
					turns + 1,
					tokensIn,
					tokensOut,
					totalTokens,
					config,
				),
			};
		}

		if (response.stopReason !== "tool_use" || !response.toolCalls?.length) {
			const parsed = extractJsonPayload(response.text);
			const normalizedText = parsed?.normalizedText ?? response.text;
			const output = parsed?.data ?? null;
			const validationResult = config.validation
				? validateOutput(config.validation, output)
				: null;

			if (config.validation && validationResult) {
				await config.validation.onValidation?.(
					validationResult,
					output,
					response.text,
					parsed?.hadExtraText ?? false,
				);
				if (!validationResult.valid) {
					messages.push({ role: "assistant", content: normalizedText });
					messages.push({
						role: "user",
						content: buildValidationFeedback(
							validationResult,
							config.validation,
						),
					});
					turns += 1;
					continue;
				}
			}

			return {
				text: normalizedText,
				rawText: response.text,
				output: output ?? undefined,
				status: "completed",
				metrics: buildMetrics(
					startMs,
					turns + 1,
					tokensIn,
					tokensOut,
					totalTokens,
					config,
				),
			};
		}

		const results = await executeToolCalls(response.toolCalls, tools);
		const planUpdated = updatePlanState(results, (plan) => {
			lastPlan = plan;
		});
		if (planUpdated) {
			turnsSincePlanUpdate = 0;
		} else {
			turnsSincePlanUpdate += 1;
		}

		const reminder =
			config.planNag &&
			turnsSincePlanUpdate >= config.planNag.threshold
				? config.planNag.message
				: null;
		messages.push({ role: "assistant", content: response.text });
		messages.push({
			role: "user",
			content: formatToolResults(results, lastPlan, reminder),
		});

		if (config.onStep) {
			await config.onStep({ turn: turns, toolCalls: response.toolCalls, results });
		}

		turns += 1;
	}

	return {
		text: "",
		status: "max_turns_exceeded",
		metrics: buildMetrics(startMs, turns, tokensIn, tokensOut, totalTokens, config),
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

function buildMetrics(
	startMs: number,
	turns: number,
	tokensIn: number,
	tokensOut: number,
	totalTokens: number,
	config: AgentLoopConfig,
): AgentLoopMetrics {
	return {
		turns,
		tokensIn,
		tokensOut,
		totalTokens,
		latencyMs: Date.now() - startMs,
		maxTurns: config.maxTurns,
		maxTotalTokens: config.maxTotalTokens,
	};
}

function updatePlanState(
	results: ToolResult[],
	setPlan: (plan: PlanManager) => void,
): boolean {
	const planResult = results.find((result) => result.name === "todo_manager");
	if (!planResult || planResult.error) {
		return false;
	}
	if (isPlanManager(planResult.output)) {
		setPlan(planResult.output);
		return true;
	}
	return false;
}

function isPlanManager(output: unknown): output is PlanManager {
	if (!output || typeof output !== "object") return false;
	const plan = output as PlanManager;
	return Array.isArray(plan.items) && typeof plan.maxItems === "number";
}

function formatToolResults(
	results: ToolResult[],
	plan: PlanManager | null,
	reminder: string | null,
): string {
	const blocks = [JSON.stringify(results)];
	if (plan) {
		const rendered = renderPlan(plan);
		const completed = plan.items.filter(
			(item) => item.status === "completed",
		).length;
		blocks.push(
			`<current-plan>\n${rendered}\n(${completed}/${plan.items.length} completed)\n</current-plan>`,
		);
	}
	if (reminder) {
		blocks.push(reminder);
	}
	return blocks.join("\n\n");
}

function validateOutput(
	validation: AgentLoopValidationConfig,
	output: unknown | null,
): AgentLoopValidationResult {
	if (output === null || output === undefined) {
		return {
			valid: false,
			errors: ["Invalid JSON output"],
			warnings: [],
		};
	}
	return validation.validate(output);
}

function buildValidationFeedback(
	result: AgentLoopValidationResult,
	validation: AgentLoopValidationConfig,
): string {
	if (validation.buildFeedback) {
		return validation.buildFeedback(result);
	}
	return [
		"Validation failed.",
		"Errors:",
		...result.errors.map((error) => `- ${error}`),
		"Return ONLY valid JSON that fixes the errors.",
	].join("\n");
}
