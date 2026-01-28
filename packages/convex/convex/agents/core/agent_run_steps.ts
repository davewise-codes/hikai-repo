import type { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { CompactionStep, StepResult } from "./agent_loop";

export async function persistToolSteps(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
	step: StepResult,
) {
	const toolCalls = step.toolCalls ?? [];
	for (const result of step.results) {
		const call =
			toolCalls.find((toolCall) => toolCall.id === result.toolCallId) ??
			toolCalls.find((toolCall) => toolCall.name === result.name) ??
			{ name: result.name, input: result.input };

		const outputPayload =
			result.output !== undefined ? JSON.stringify(result.output) : null;
		const outputSize = outputPayload ? byteLength(outputPayload) : 0;
		let outputRef: { fileId: Id<"_storage">; sizeBytes: number } | null = null;
		let output = result.output;

		if (outputPayload) {
			const fileId = await ctx.storage.store(
				new Blob([outputPayload], { type: "application/json" }),
			);
			outputRef = { fileId, sizeBytes: outputSize };
			if (outputSize >= 5 * 1024) {
				output = { _truncated: true, sizeBytes: outputSize };
			}
		}

		await ctx.runMutation(internal.agents.agentRuns.appendStep, {
			productId,
			runId,
			step: `Tool: ${result.name}`,
			status: result.error ? "error" : "info",
			metadata: {
				toolCalls: [call],
				result: {
					name: result.name,
					input: result.input,
					output,
					error: result.error,
					outputRef,
					truncation: result.truncation,
				},
			},
		});

		const truncation = result.truncation;
		if (truncation?.applied && truncation.originalSizeBytes > 0) {
			const ratio = truncation.finalSizeBytes / truncation.originalSizeBytes;
			if (ratio <= 0.5) {
				await ctx.runMutation(internal.agents.agentRuns.appendStep, {
					productId,
					runId,
					step: `Tool output truncated (${result.name})`,
					status: "warn",
					metadata: {
						truncation,
					},
				});
			}
		}
	}
}

export async function persistCompactionStep(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
	step: CompactionStep,
) {
	await ctx.runMutation(internal.agents.agentRuns.appendStep, {
		productId,
		runId,
		step: "Compaction",
		status: "info",
		metadata: {
			reason: step.reason,
			messagesBefore: step.messagesBefore,
			messagesAfter: step.messagesAfter,
			removedMessages: step.removedMessages,
			pinnedMessages: step.pinnedMessages,
			summaryPreview: step.summary.slice(0, 2000),
		},
	});
}

function byteLength(value: string): number {
	return new TextEncoder().encode(value).length;
}
