import type { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
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
	createGrepFileTool,
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
	baseline?: ProductBaseline;
}): Promise<RepoContextResult> {
	const { ctx, productId, runId, baseline } = params;
	const aiConfig = getAgentAIConfig(AGENT_NAME);
	const model = createToolPromptModel(createLLMAdapter(aiConfig), {
		protocol: buildToolProtocol(productId),
	});
	const tools = [
	createListDirsTool(ctx, productId),
	createListFilesTool(ctx, productId),
	createReadFileTool(ctx, productId),
	createGrepFileTool(ctx, productId),
	createSearchCodeTool(ctx, productId),
];

	const prompt = buildRepoContextPrompt(baseline);
	const startedAt = Date.now();
	let lastResult: AgentLoopResult | null = null;
	let feedback: string | null = null;
	let attempt = 0;

	const MAX_ATTEMPTS = 3;
	while (Date.now() - startedAt < MAX_DURATION_MS && attempt < MAX_ATTEMPTS) {
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
				maxTurns: 25,
				maxTokens: 4000,
				maxTotalTokens: 400_000,
				timeoutMs: 300_000,
				timeWarning: {
					thresholdRatio: 0.8,
					message:
						"IMPORTANTE: queda poco tiempo. Produce el JSON ahora con lo que tengas y NO hagas mas tool calls.",
				},
				compaction: { enabled: false },
				tools,
				sampling: { temperature: 0 },
				shouldAbort: async () => {
					const run = await ctx.runQuery(api.agents.agentRuns.getRunById, {
						productId,
						runId,
					});
					return run?.status === "error" && run.errorMessage === "Cancelled by user";
				},
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
		await recordBudget(ctx, productId, runId, result);
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

type ProductBaseline = {
	problemSolved?: string;
	valueProposition?: string;
	targetMarket?: string;
	productCategory?: string;
	industry?: string;
	icps?: Array<{
		segment?: string;
		pains?: string[];
		goals?: string[];
		name?: string;
	}>;
};

function buildRepoContextPrompt(baseline?: ProductBaseline): string {
	return [
		"Eres un analista de producto. Tu objetivo es entender QUE HACE este producto y para quien, no como esta construido.",
		"",
		"## REGLAS (breve)",
		"- El README puede ser incompleto o engañoso: valida siempre en src/ o codigo fuente.",
		"- No busques features de desarrollo (setup, deploy, CI).",
		"- Solo evidencia real: no inventes paths ni features.",
		"",
		"## DEFINICION DE CAPABILITY",
		"- Una capability es una accion del usuario final (verbo).",
		"- Expresala como keyword corta: create-org, invite-members, connect-github, view-timeline.",
		"- NO son capabilities: layout/routing, setup tecnico, despliegue, CI/CD, state management, providers.",
		"",
		"## ARCHIVOS A IGNORAR (no cuentan como evidencia)",
		"- Skill files (*.skill.md), tests, configs, bootstrap (main.tsx/App.tsx/index.tsx), layouts, providers.",
		"",
		"## METODO (ejecuta EN ORDEN y NO saltes pasos)",
		"1) METADATOS OBLIGATORIOS:",
		'- read_file "package.json"',
		'- read_file "tsconfig.json" (si existe)',
		'- list_dirs "." depth=5',
		"2) MONOREPO (si hay apps/ o packages/):",
		"- read_file <workspace>/package.json de cada app/paquete principal",
		"3) BACKEND (si existe):",
		"- Usa list_files en la raiz del backend para encontrar archivos de schema/model/entities",
		'- Si no aparecen, usa search_code("defineSchema|defineTable|schema", filePattern: "<backend>/**") UNA SOLA VEZ',
		"- read_file del schema encontrado",
		"- Si ya conoces el path, usa grep_file para extraer nombres de entidades/tabla",
		"- Agrupa entidades por prefijo (ej. organization*, product*) para inferir dominios backend",
		"4) FRONTEND (si existe):",
		"- Usa list_files para localizar rutas/paginas (routes, pages, app) dentro de src/",
		'- Si no aparecen, usa search_code("createFileRoute|routes", filePattern: "<front>/src/**") UNA SOLA VEZ',
		"- read_file de 2 archivos de rutas clave",
		"5) DOMINIOS (si hay src/domains o src/features):",
		"- Detecta carpetas de dominio por señales semanticas (domains, features, modules, services, bounded-contexts, etc.)",
		"- Explora dominios detectados hasta un limite razonable (p.ej. 6)",
		"- Prioriza dominios que aparezcan en schema/backend o en rutas",
		"- read_file de 1 archivo de logica por dominio",
		"- Para cada dominio, genera pathPatterns con globs a sus carpetas frontend/backend detectadas",
		"- Para cada dominio, asigna schemaEntities usando los nombres de tablas (por prefijo o coincidencia)",
		"- Deduplica schemaEntities y evita mezclar entidades de otros dominios evidentes (p.ej. rawEvents -> timeline, connections -> connectors)",
		"",
		"## LIMITES DE HERRAMIENTAS (para evitar timeouts)",
		"- No repitas el mismo search_code (mismo query + filePattern).",
		"- Maximo 3 llamadas a search_code en total.",
		"- Maximo 12 tool calls en total; si llegas, produce output con lo que tengas.",
		"- Maximo 6 read_file (schema + 2 rutas + 2 logicas de dominio + 1 extra).",
		"- Si ya tienes schema backend y 2 rutas front, pasa a DOMINIOS y luego OUTPUT.",
		"",
		"## STOP (obligatorio)",
		"No produzcas output hasta cumplir:",
		"- package.json + tsconfig.json leidos (si existen),",
		"- schema backend leido (si existe backend),",
		"- 2 archivos de rutas front,",
		"- 1 archivo de logica por dominio (hasta el limite indicado).",
		"Si no puedes cumplir, documenta en limitations y cierra.",
		"Si llevas 10+ tool calls sin leer un archivo clave, produce output parcial con limitations.",
		"",
		"## AUTO-CHECK antes de responder",
		"- meta.filesRead debe coincidir EXACTAMENTE con read_file reales.",
		"- No derives capabilities desde marketing/docs.",
		"- Si recibes aviso de tiempo, produce el JSON inmediatamente con lo que tengas.",
		"",
		"OUTPUT REQUERIDO (JSON):",
		"{",
		'  "domains": [',
		'    {',
		'      "name": "Nombre del dominio funcional",',
		'      "purpose": "Resumen de lo que cubre este dominio",',
		'      "capabilities": ["create-org", "invite-members"],',
		'      "pathPatterns": ["apps/webapp/src/domains/organizations/**", "packages/convex/convex/organizations/**"],',
		'      "schemaEntities": ["organizations", "organizationMembers"]',
		"    }",
		"  ],",
		'  "structure": { "type": "monorepo", "frontend": "apps/webapp", "backend": "packages/convex" },',
		'  "meta": { "filesRead": ["..."], "limitations": ["..."] }',
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
		"- Usa SOLO list_dirs, list_files, read_file, grep_file, search_code",
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

async function recordBudget(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
	result: AgentLoopResult,
) {
	const budgetStepStatus =
		result.status === "completed"
			? "success"
			: result.status === "budget_exceeded"
				? "error"
				: "warn";

	await ctx.runMutation(internal.agents.agentRuns.appendStep, {
		productId,
		runId,
		step: "Budget",
		status: budgetStepStatus,
		metadata: {
			turns: result.metrics.turns,
			maxTurns: result.metrics.maxTurns,
			tokensIn: result.metrics.tokensIn,
			tokensOut: result.metrics.tokensOut,
			totalTokens: result.metrics.totalTokens,
			maxTotalTokens: result.metrics.maxTotalTokens,
			status: result.status,
		},
	});
}
