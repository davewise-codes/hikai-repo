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
	_debug?: {
		rawText: string;
		extracted: unknown;
	};
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
	emptyResponseReminder?: string;
	toolUseExtraTextReminder?: string;
	finalOutputOnlyReminder?: string;
	requireValidateJson?: boolean;
	validateJsonReminder?: string;
	autoFinalizeOnValidateJson?: boolean;
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
	let hasValidatedJson = false;
	let lastValidatedJson: Record<string, unknown> | null = null;
	let lastDraftOutput: unknown | null = null;
	let lastDraftRawText: string | null = null;

	while (turns < config.maxTurns) {
		if (
			config.maxTotalTokens !== undefined &&
			totalTokens >= config.maxTotalTokens
		) {
			return {
				text: lastDraftRawText ?? "",
				rawText: lastDraftRawText ?? undefined,
				output: lastDraftOutput ?? undefined,
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
				text: lastDraftRawText ?? "",
				rawText: lastDraftRawText ?? undefined,
				output: lastDraftOutput ?? undefined,
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
				rawText: lastDraftRawText ?? undefined,
				output: lastDraftOutput ?? undefined,
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

		const draftCandidate =
			typeof response._debug?.extracted === "object" &&
			response._debug?.extracted !== null &&
			"data" in response._debug.extracted
				? (response._debug.extracted as { data?: unknown }).data
				: null;
		if (
			draftCandidate &&
			typeof draftCandidate === "object" &&
			"type" in draftCandidate &&
			(draftCandidate as { type?: string }).type === "final" &&
			"output" in draftCandidate
		) {
			lastDraftOutput = (draftCandidate as { output?: unknown }).output ?? null;
			if (lastDraftOutput) {
				try {
					lastDraftRawText = JSON.stringify(lastDraftOutput, null, 2);
				} catch {
					lastDraftRawText = response.text;
				}
			}
		}
		if (!lastDraftOutput && response._debug?.rawText) {
			const embeddedFinal = extractFinalFromRawText(response._debug.rawText);
			if (embeddedFinal && embeddedFinal.output) {
				lastDraftOutput = embeddedFinal.output;
				try {
					lastDraftRawText = JSON.stringify(embeddedFinal.output, null, 2);
				} catch {
					lastDraftRawText = response.text;
				}
			}
		}

		if (
			config.maxTotalTokens !== undefined &&
			totalTokens > config.maxTotalTokens
		) {
			return {
				text: lastDraftRawText ?? response.text,
				rawText: lastDraftRawText ?? response.text,
				output: lastDraftOutput ?? undefined,
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
			const looksLikeToolUse = response.text.includes("\"type\":\"tool_use\"");
			if (!parsed && looksLikeToolUse && config.toolUseExtraTextReminder) {
				messages.push({ role: "assistant", content: response.text });
				messages.push({ role: "user", content: config.toolUseExtraTextReminder });
				turns += 1;
				continue;
			}
			if (config.requireValidateJson && !hasValidatedJson) {
				messages.push({ role: "assistant", content: response.text });
				messages.push({
					role: "user",
					content:
						config.validateJsonReminder ??
						"<reminder>Call validate_json with your final JSON before submitting the final output.</reminder>",
				});
				turns += 1;
				continue;
			}
			if (!response.text.trim() && config.emptyResponseReminder) {
				messages.push({ role: "assistant", content: response.text });
				messages.push({
					role: "user",
					content: config.emptyResponseReminder,
				});
				turns += 1;
				continue;
			}
			const normalizedText = parsed?.normalizedText ?? response.text;
			const output = parsed?.data ?? null;
			let validationResult = config.validation
				? validateOutput(config.validation, output)
				: null;
			if (validationResult && lastPlan && !isPlanCompleted(lastPlan)) {
				validationResult = {
					...validationResult,
					valid: false,
					errors: [
						"Plan is not completed. Update with todo_manager before final output.",
						...validationResult.errors,
					],
				};
			}

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
							lastPlan,
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

	const hadExtraText =
		typeof response._debug?.extracted === "object" &&
		response._debug?.extracted !== null &&
		"hadExtraText" in response._debug.extracted &&
		Boolean(
			(response._debug.extracted as { hadExtraText?: boolean }).hadExtraText,
		);

	const hasOnlyValidateJsonCalls =
		response.toolCalls?.length &&
		response.toolCalls.every((call) => call.name === "validate_json");
	const hasOnlyTodoManagerCalls =
		response.toolCalls?.length &&
		response.toolCalls.every((call) => call.name === "todo_manager");
	if (
		lastPlan &&
		isPlanCompleted(lastPlan) &&
		hasOnlyTodoManagerCalls &&
		!hasOnlyValidateJsonCalls
	) {
		messages.push({ role: "assistant", content: response.text });
		const reminders = [
			"Plan already completed. Do NOT call todo_manager again.",
			config.requireValidateJson
				? config.validateJsonReminder ??
					"<reminder>Call validate_json with your final JSON before submitting the final output.</reminder>"
				: "Return your final JSON output now.",
		];
		if (config.finalOutputOnlyReminder) {
			reminders.push(config.finalOutputOnlyReminder);
		}
		messages.push({ role: "user", content: reminders.join("\n") });
		turns += 1;
		continue;
	}
	if (
		lastPlan &&
		isPlanCompleted(lastPlan) &&
		config.finalOutputOnlyReminder &&
		!hasOnlyValidateJsonCalls
	) {
		messages.push({ role: "assistant", content: response.text });
		messages.push({ role: "user", content: config.finalOutputOnlyReminder });
		turns += 1;
		continue;
	}

	if (hadExtraText && config.toolUseExtraTextReminder) {
		messages.push({ role: "assistant", content: response.text });
		messages.push({ role: "user", content: config.toolUseExtraTextReminder });
		turns += 1;
		continue;
	}

		const results = await executeToolCalls(response.toolCalls, tools);
		const nonValidateTools = response.toolCalls.filter(
			(call) => call.name !== "validate_json",
		);
		const validatedThisTurn = results.some((result) => {
			if (result.name !== "validate_json") return false;
			if (!result.output || typeof result.output !== "object") return false;
			const output = result.output as {
				valid?: boolean;
				parsed?: Record<string, unknown>;
			};
			if (!output.valid) return false;
			if (output.parsed && typeof output.parsed === "object") {
				lastValidatedJson = output.parsed;
			}
			return true;
		});
		hasValidatedJson = hasValidatedJson || validatedThisTurn;
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

		if (
			config.autoFinalizeOnValidateJson &&
			validatedThisTurn &&
			lastValidatedJson &&
			(!lastPlan || isPlanCompleted(lastPlan))
		) {
			const serialized = JSON.stringify(lastValidatedJson, null, 2);
			return {
				text: serialized,
				rawText: serialized,
				output: lastValidatedJson,
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

		turns += 1;
	}

	return {
		text: lastDraftRawText ?? "",
		rawText: lastDraftRawText ?? undefined,
		output: lastDraftOutput ?? undefined,
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

function isPlanCompleted(plan: PlanManager): boolean {
	return plan.items.every((item) => item.status === "completed");
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
	plan: PlanManager | null,
): string {
	if (validation.buildFeedback) {
		return validation.buildFeedback(result);
	}
	const lines = [
		"Validation failed.",
		"Errors:",
		...result.errors.map((error) => `- ${error}`),
	];
	if (plan) {
		const pending = plan.items.filter((item) => item.status !== "completed");
		if (pending.length > 0) {
			lines.push("Plan is not completed yet.");
			lines.push(
				"Update your plan with todo_manager: mark completed items and set the next item to in_progress.",
			);
			lines.push("Do NOT return final output until all plan items are completed.");
		}
	} else {
		lines.push("Reminder: call todo_manager to create/update your plan.");
		lines.push("Call required tools before attempting final output.");
	}
	lines.push("Return ONLY valid JSON that fixes the errors.");
	return lines.join("\n");
}

function extractFinalFromRawText(text: string): { output: unknown } | null {
	const marker = "\"type\":\"final\"";
	const index = text.lastIndexOf(marker);
	if (index === -1) return null;
	const slice = text.slice(index);
	const extracted = extractJsonPayload(slice);
	if (
		extracted &&
		extracted.data &&
		typeof extracted.data === "object" &&
		"type" in (extracted.data as Record<string, unknown>)
	) {
		const data = extracted.data as { type?: string; output?: unknown };
		if (data.type === "final") {
			return { output: data.output };
		}
	}
	return null;
}
