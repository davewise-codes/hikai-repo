import { internalMutation, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { LLMGenerateResult, estimateCost } from "./ports/llmPort";
import { getAIConfig } from "./config";
import { v } from "convex/values";

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
		errorMessage: string;
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
		errorMessage: params.errorMessage,
		promptSnapshot: config.debugLogContent
			? truncate(params.prompt, 5000)
			: undefined,
		metadata: params.metadata,
		createdAt: Date.now(),
	});
}

export const recordUsage = internalMutation({
	args: {
		organizationId: v.id("organizations"),
		productId: v.optional(v.id("products")),
		userId: v.id("users"),
		useCase: v.string(),
		agentName: v.string(),
		threadId: v.optional(v.string()),
		result: v.object({
			text: v.string(),
			tokensIn: v.number(),
			tokensOut: v.number(),
			totalTokens: v.number(),
			model: v.string(),
			provider: v.string(),
			latencyMs: v.number(),
		}),
		prompt: v.optional(v.string()),
		response: v.optional(v.string()),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		return recordAIUsage({
			ctx,
			organizationId: args.organizationId,
			productId: args.productId,
			userId: args.userId,
			useCase: args.useCase,
			agentName: args.agentName,
			threadId: args.threadId,
			result: args.result,
			prompt: args.prompt,
			response: args.response,
			metadata: args.metadata ?? undefined,
		});
	},
});

export const recordError = internalMutation({
	args: {
		organizationId: v.id("organizations"),
		productId: v.optional(v.id("products")),
		userId: v.id("users"),
		useCase: v.string(),
		agentName: v.string(),
		threadId: v.optional(v.string()),
		provider: v.string(),
		model: v.string(),
		errorMessage: v.string(),
		prompt: v.optional(v.string()),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		return recordAIError({
			ctx,
			organizationId: args.organizationId,
			productId: args.productId,
			userId: args.userId,
			useCase: args.useCase,
			agentName: args.agentName,
			threadId: args.threadId,
			provider: args.provider,
			model: args.model,
			errorMessage: args.errorMessage,
			prompt: args.prompt,
			metadata: args.metadata ?? undefined,
		});
	},
});

function truncate(text: string | undefined, maxLength: number): string | undefined {
	if (!text) return undefined;
	return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}
