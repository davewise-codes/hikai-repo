import {
	executeToolCall,
	type ToolCall,
	type ToolDefinition,
	type ToolResult,
} from "./tool_registry";
import { extractJsonPayload } from "./json_utils";
import { renderPlan, type PlanManager } from "./plan_manager";
import {
	compactMessages,
	resolveCompactionConfig,
	type CompactionConfig,
} from "./compaction";

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
	onCompaction?: (step: CompactionStep) => Promise<void>;
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
	compaction?: Partial<CompactionConfig>;
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

export type CompactionStep = {
	turn: number;
	reason: "message_threshold" | "token_threshold";
	messagesBefore: number;
	messagesAfter: number;
	removedMessages: number;
	pinnedMessages: number;
	summary: string;
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
	const compaction = resolveCompactionConfig(config.compaction);
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
	let compactionDone = false;

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

		const hasMixedText =
			Boolean(response.toolCalls?.length) && response.text.trim().length > 0;
		if (hasMixedText) {
			response._debug = {
				rawText: response.text,
				extracted: {
					toolCalls: response.toolCalls ?? [],
					discardedText: response.text,
				},
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
			const legacyToolCalls = extractLegacyToolCalls(response.text);
			if (legacyToolCalls?.length) {
				response = {
					...response,
					stopReason: "tool_use",
					toolCalls: legacyToolCalls,
					_debug: {
						rawText: response.text,
						extracted: { data: { type: "tool_use", toolCalls: legacyToolCalls } },
					},
				};
			}
		}

		if (response.stopReason !== "tool_use" || !response.toolCalls?.length) {
			if (!response.text.trim() && config.emptyResponseReminder) {
				messages.push({ role: "assistant", content: response.text });
				messages.push({
					role: "user",
					content: config.emptyResponseReminder,
				});
				turns += 1;
				continue;
			}
			const inlineOutput = parseInlineOutput(response.text);
			const normalizedText = inlineOutput.normalizedText;
			const output = inlineOutput.output;
			let validationResult = config.validation
				? validateOutput(config.validation, output)
				: null;
			const planWasIncomplete = Boolean(lastPlan && !isPlanCompleted(lastPlan));
			if (validationResult && planWasIncomplete) {
				validationResult = {
					...validationResult,
					warnings: [
						...(validationResult.warnings ?? []),
						"Plan was not completed. Remaining items marked as skipped.",
					],
				};
			}

			if (config.validation && validationResult) {
				await config.validation.onValidation?.(
					validationResult,
					output,
					response.text,
					inlineOutput.hadExtraText,
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
			if (planWasIncomplete && lastPlan) {
				lastPlan = markPlanSkipped(lastPlan);
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
		const assistantText = hasMixedText ? "" : response.text;
		messages.push({ role: "assistant", content: assistantText });
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

		const hitMessageThreshold = messages.length > compaction.messageThreshold;
		const hitTokenThreshold =
			config.maxTotalTokens !== undefined &&
			totalTokens > config.maxTotalTokens * 0.75;
		const shouldCompact =
			compaction.enabled &&
			!compactionDone &&
			(hitMessageThreshold || hitTokenThreshold);

		if (shouldCompact) {
			const reason = hitMessageThreshold
				? "message_threshold"
				: "token_threshold";
			const result = await compactMessages(messages, model, compaction);
			compactionDone = true;
			if (result) {
				messages.splice(0, messages.length, ...result.messages);
				await config.onCompaction?.({
					turn: turns,
					reason,
					messagesBefore: result.messagesBefore,
					messagesAfter: result.messagesAfter,
					removedMessages: result.removedMessages,
					pinnedMessages: result.pinnedMessages,
					summary: result.summary,
				});
			}
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
	const blocks: string[] = [];
	const todoError = results.find(
		(result) =>
			result.name === "todo_manager" &&
			typeof result.error === "string" &&
			result.error.includes("$.items is required"),
	);
	if (todoError) {
		blocks.push(
			[
				"<reminder>",
				"Your todo_manager call failed because items is required.",
				"Call todo_manager again NOW with items. Do not send empty input.",
				"Example:",
				`{"items":[{"content":"Example task","activeForm":"Drafting example task","status":"in_progress"}]}`,
				"At most one item can be in_progress.",
				"</reminder>",
			].join("\n"),
		);
	}
	blocks.push(JSON.stringify(results));
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

function parseInlineOutput(text: string): {
	output: unknown | null;
	normalizedText: string;
	hadExtraText: boolean;
} {
	const trimmed = text.trim();
	if (!trimmed) {
		return { output: null, normalizedText: text, hadExtraText: false };
	}
	try {
		const parsed = JSON.parse(trimmed) as unknown;
		return {
			output: parsed,
			normalizedText: JSON.stringify(parsed, null, 2),
			hadExtraText: false,
		};
	} catch {
		const extracted = extractJsonPayload(text);
		if (extracted?.data !== undefined) {
			const data = extracted.data;
			const output =
				data &&
				typeof data === "object" &&
				"output" in (data as Record<string, unknown>)
					? (data as { output?: unknown }).output
					: data;
			return {
				output: output ?? null,
				normalizedText: extracted.normalizedText ?? text,
				hadExtraText: Boolean(extracted.hadExtraText),
			};
		}
	}
	return { output: null, normalizedText: text, hadExtraText: false };
}

function extractLegacyToolCalls(text: string): ToolCall[] | null {
	const extracted = extractJsonPayload(text);
	const data =
		extracted?.data && typeof extracted.data === "object"
			? (extracted.data as Record<string, unknown>)
			: null;
	if (!data || data.type !== "tool_use" || !Array.isArray(data.toolCalls)) {
		return null;
	}
	const toolCalls = data.toolCalls
		.map((call, index) => {
			if (!call || typeof call !== "object") return null;
			const toolCall = call as {
				name?: string;
				tool?: string;
				input?: unknown;
				args?: unknown;
				id?: string;
			};
			const name = toolCall.name ?? toolCall.tool;
			if (!name) return null;
			return {
				name,
				input: toolCall.input ?? toolCall.args ?? {},
				id: toolCall.id ?? `call-${index + 1}`,
			};
		})
		.filter((call): call is ToolCall => Boolean(call));
	return toolCalls.length > 0 ? toolCalls : null;
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

function markPlanSkipped(plan: PlanManager): PlanManager {
	const items = plan.items.map((item) => {
		if (item.status === "completed") return item;
		return {
			...item,
			status: "blocked",
			checkpoint: {
				...(typeof item.checkpoint === "object" && item.checkpoint
					? item.checkpoint
					: {}),
				skipped: true,
			},
		};
	});
	return {
		...plan,
		items,
		currentItem: null,
	};
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
