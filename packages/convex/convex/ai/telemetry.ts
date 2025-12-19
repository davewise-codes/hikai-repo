import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { LLMGenerateResult, estimateCost } from "./ports/llmPort";
import { getAIConfig } from "./config";

export interface TelemetryParams {
	ctx: MutationCtx;
	organizationId: Id<"organizations">;
	productId?: Id<"products">;
	userId: Id<"users">;
	useCase: string;
	agentName: string;
	threadId?: string;
	result: LLMGenerateResult;
	prompt?: string;
	response?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Registra uso de IA en la tabla aiUsage.
 */
export async function recordAIUsage(
	params: TelemetryParams
): Promise<Id<"aiUsage">> {
	const config = getAIConfig();
	const cost = estimateCost(
		params.result.model,
		params.result.tokensIn,
		params.result.tokensOut
	);

	return await params.ctx.db.insert("aiUsage", {
		organizationId: params.organizationId,
		productId: params.productId,
		userId: params.userId,
		useCase: params.useCase,
		agentName: params.agentName,
		threadId: params.threadId,
		provider: params.result.provider,
		model: params.result.model,
		tokensIn: params.result.tokensIn,
		tokensOut: params.result.tokensOut,
		totalTokens: params.result.totalTokens,
		latencyMs: params.result.latencyMs,
		estimatedCostUsd: cost,
		status: "success",
		promptSnapshot: config.debugLogContent
			? truncate(params.prompt, 5000)
			: undefined,
		responseSnapshot: config.debugLogContent
			? truncate(params.response, 5000)
			: undefined,
		metadata: params.metadata,
		createdAt: Date.now(),
	});
}

/**
 * Registra error de IA.
 */
export async function recordAIError(
	params: Omit<TelemetryParams, "result"> & {
		error: Error;
		provider: string;
		model: string;
	}
): Promise<Id<"aiUsage">> {
	const config = getAIConfig();

	return await params.ctx.db.insert("aiUsage", {
		organizationId: params.organizationId,
		productId: params.productId,
		userId: params.userId,
		useCase: params.useCase,
		agentName: params.agentName,
		threadId: params.threadId,
		provider: params.provider,
		model: params.model,
		tokensIn: 0,
		tokensOut: 0,
		totalTokens: 0,
		latencyMs: 0,
		estimatedCostUsd: 0,
		status: "error",
		errorMessage: params.error.message,
		promptSnapshot: config.debugLogContent
			? truncate(params.prompt, 5000)
			: undefined,
		metadata: params.metadata,
		createdAt: Date.now(),
	});
}

function truncate(text: string | undefined, maxLength: number): string | undefined {
	if (!text) return undefined;
	return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}
