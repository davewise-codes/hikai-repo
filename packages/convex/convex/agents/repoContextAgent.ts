import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getAgentAIConfig } from "../ai";
import { createLLMAdapter } from "../ai/config";
import {
	executeAgentLoop,
	type AgentLoopResult,
	type AgentMessage,
} from "./core/agent_loop";
import { createToolPromptModel } from "./core/tool_prompt_model";
import {
	createListDirsTool,
	createListFilesTool,
	createReadFileTool,
	createSearchCodeTool,
} from "./core/tools";
import { persistCompactionStep, persistToolSteps } from "./core/agent_run_steps";
import {
	parseContextDetailFromText,
	validateContextDetail,
	type ContextDetail,
} from "./contextValidator";

const AGENT_NAME = "Repo Context Agent";
const MAX_DURATION_MS = 10 * 60 * 1000;

type RepoContextResult = {
	status: "completed" | "failed";
	contextDetail: ContextDetail | null;
	errorMessage?: string;
	metrics?: AgentLoopResult["metrics"];
};

export async function runRepoContextAgent(params: {
	ctx: ActionCtx;
	productId: Id<"products">;
	runId: Id<"agentRuns">;
}): Promise<RepoContextResult> {
	const { ctx, productId, runId } = params;
	const aiConfig = getAgentAIConfig(AGENT_NAME);
	const model = createToolPromptModel(createLLMAdapter(aiConfig), {
		protocol: buildToolProtocol(productId),
	});
	const tools = [
		createListDirsTool(ctx, productId),
		createListFilesTool(ctx, productId),
		createReadFileTool(ctx, productId),
		createSearchCodeTool(ctx, productId),
	];

	const prompt = buildRepoContextPrompt();
	const startedAt = Date.now();
	let lastResult: AgentLoopResult | null = null;
	let feedback: string | null = null;
	let attempt = 0;

	while (Date.now() - startedAt < MAX_DURATION_MS) {
		attempt += 1;
		await ctx.runMutation(internal.agents.agentRuns.appendStep, {
			productId,
			runId,
			step: `Repo context attempt ${attempt}`,
			status: "info",
			metadata: { hasFeedback: Boolean(feedback) },
		});

		const messages: AgentMessage[] = [
			{ role: "user", content: prompt },
		];
		if (feedback) {
			messages.push({ role: "user", content: feedback });
		}

		const result = await executeAgentLoop(
			model,
			{
				maxTurns: 16,
				maxTokens: 4000,
				maxTotalTokens: 400_000,
				timeoutMs: 120_000,
				tools,
				sampling: { temperature: 0 },
				onModelResponse: async ({ response, turn }) => {
					const preview =
						typeof response.text === "string"
							? response.text.slice(0, 2000)
							: "";
					await ctx.runMutation(internal.agents.agentRuns.appendStep, {
						productId,
						runId,
						step: `Model output (turn ${turn + 1})`,
						status: "info",
						metadata: {
							modelOutputPreview: preview,
							stopReason: response.stopReason,
							toolCalls: response.toolCalls?.map((call) => ({
								name: call.name,
								id: call.id,
							})),
							_debug: response._debug
								? {
										rawText: response._debug.rawText?.slice(0, 10000),
										extracted: response._debug.extracted,
										hadExtraction: Boolean(response._debug.extracted),
									}
								: null,
						},
					});
				},
				onStep: async (step) => {
					await persistToolSteps(ctx, productId, runId, step);
				},
				onCompaction: async (step) => {
					await persistCompactionStep(ctx, productId, runId, step);
				},
			},
			prompt,
			messages,
		);

		lastResult = result;
		const rawText = result.rawText ?? result.text ?? "";
		const parsed =
			result.output && typeof result.output === "object"
				? { value: result.output as unknown }
				: parseContextDetailFromText(rawText);
		if (!parsed.value) {
			feedback = buildFeedback([
				parsed.error ?? "Output must be valid JSON matching the schema.",
			]);
			await recordValidationFailure(
				ctx,
				productId,
				runId,
				feedback,
			);
			continue;
		}

		const validation = validateContextDetail(parsed.value);
		if (!validation.valid || !validation.value) {
			feedback = buildFeedback(validation.errors);
			await recordValidationFailure(
				ctx,
				productId,
				runId,
				feedback,
			);
			continue;
		}

		return {
			status: "completed",
			contextDetail: validation.value,
			metrics: result.metrics,
		};
	}

	return {
		status: "failed",
		contextDetail: null,
		errorMessage:
			lastResult?.errorMessage ??
			"Context agent exceeded maximum duration without valid output",
		metrics: lastResult?.metrics,
	};
}

function buildRepoContextPrompt(): string {
	return [
		"Eres un analista de repositorios. Tu trabajo es entender el repo y producir un JSON con el contexto del producto.",
		"",
		"TOOLS DISPONIBLES:",
		"- list_dirs(path?, depth?, limit?)",
		"- list_files(path?, pattern?, limit?)",
		"- read_file(path)",
		"- search_code(query, path?, limit?)",
		"",
		"PROCESO:",
		"1. Explora la estructura del repo",
		"2. Lee archivos clave (README, package.json, entrypoints, código principal)",
		"3. Identifica tecnologías, dominios, features y lenguaje",
		"4. Cuando tengas suficiente información, responde SOLO con el JSON",
		"",
		"OUTPUT REQUERIDO (JSON):",
		"{",
		'  "technical": {',
		'    "stack": ["typescript", "react", "..."],',
		'    "patterns": ["monorepo", "serverless"],',
		'    "rootDirs": ["apps", "packages"],',
		'    "entryPoints": ["apps/webapp/src/main.tsx"],',
		'    "integrations": ["github-api", "stripe"]',
		"  },",
		'  "domains": [',
		'    { "name": "authentication", "description": "...", "purpose": "...", "keyFiles": ["src/auth/login.ts"] }',
		"  ],",
		'  "features": [',
		'    { "name": "OAuth login", "description": "...", "domain": "authentication", "userFacing": true }',
		"  ],",
		'  "language": {',
		'    "glossary": [{ "term": "org", "definition": "Organization / tenant" }],',
		'    "conventions": ["camelCase", "kebab-case files"]',
		"  },",
		'  "meta": {}',
		"}",
		"",
		"NO uses todo_manager ni validate_json. Responde SOLO con el JSON.",
	].join("\n");
}

function buildToolProtocol(productId: Id<"products">): string {
	return [
		"Eres un agente autónomo.",
		"",
		"Reglas:",
		"- Usa SOLO list_dirs, list_files, read_file, search_code",
		"- No uses otros tools",
		"- Responde SOLO con JSON cuando termines",
		`Use productId: ${productId} when calling tools.`,
	].join("\n");
}

function buildFeedback(errors: string[]): string {
	const lines = [
		"Tu output no pasó validación. Corrige y devuelve SOLO el JSON requerido.",
		"Errores:",
		...errors.map((error) => `- ${error}`),
	];
	return lines.join("\n");
}

async function recordValidationFailure(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
	feedback: string,
) {
	await ctx.runMutation(internal.agents.agentRuns.appendStep, {
		productId,
		runId,
		step: "Repo context validation failed",
		status: "warn",
		metadata: {
			feedbackPreview: feedback.slice(0, 2000),
		},
	});
}
