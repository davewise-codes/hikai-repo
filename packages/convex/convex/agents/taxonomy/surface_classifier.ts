import type { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { getAgentAIConfig, getAgentTelemetryConfig } from "../../ai";
import { createLLMAdapter, type AIProvider } from "../../ai/config";
import {
	executeAgentLoop,
	type AgentMessage,
	type AgentModel,
} from "../core/agent_loop";
import { injectSkill, loadSkillFromRegistry } from "../core/skill_loader";
import { SKILL_CONTENTS } from "../skills";

const AGENT_NAME = "Source Context Classifier Agent";
const USE_CASE = "source_context_classification";
const PROMPT_VERSION = "v1.0";

const SKILL_NAME = "surface-classification";
const MAX_ATTEMPTS = 3;

type SurfaceMappingItem = {
	pathPrefix: string;
	surface:
		| "product_front"
		| "platform"
		| "infra"
		| "marketing"
		| "doc"
		| "management"
		| "admin"
		| "analytics";
};

export type SurfaceClassification = {
	sourceCategory: "monorepo" | "repo";
	surfaceMapping: SurfaceMappingItem[];
	notes: string;
	outputVersion?: string;
};

export type SurfaceClassificationInput = {
	product: {
		name?: string;
		productType?: string;
		valueProposition?: string;
		targetMarket?: string;
		audiences?: string[];
		stage?: string;
	};
	repo: {
		sourceType: string;
		sourceId: string;
		samples: string[];
		pathOverview: unknown;
		structureSummary: unknown;
	};
};

type ClassifierParams = {
	ctx: ActionCtx;
	organizationId: Id<"organizations">;
	productId: Id<"products">;
	userId: Id<"users">;
	runId?: Id<"agentRuns">;
	input: SurfaceClassificationInput;
	sampling?: { temperature?: number; topP?: number };
	maxTokens?: number;
};

export async function classifySurface(
	params: ClassifierParams,
): Promise<SurfaceClassification | null> {
	const { ctx, organizationId, productId, userId, runId, input, sampling, maxTokens } =
		params;
	const aiConfig = getAgentAIConfig(AGENT_NAME);
	const model = createModelAdapter(aiConfig);
	const prompt = buildSurfacePrompt(input);
	const skill = loadSkillFromRegistry(SKILL_NAME, SKILL_CONTENTS);
	let feedback: string | null = null;
	let lastError: string | null = null;

	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
		if (runId) {
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step: `Surface classification attempt ${attempt + 1}`,
				status: "info",
				metadata: { hasFeedback: Boolean(feedback) },
			});
		}

		const messages: AgentMessage[] = [
			injectSkill(skill),
			{ role: "user", content: prompt },
		];
		if (feedback) {
			messages.push({ role: "user", content: feedback });
		}

		const result = await executeAgentLoop(
			model,
			{
				maxTurns: 1,
				timeoutMs: 30000,
				maxTokens: maxTokens ?? 2000,
				sampling,
				tools: [],
			},
			prompt,
			messages,
		);

		if (result.status !== "completed") {
			lastError = result.errorMessage ?? result.status;
			feedback = buildFeedback([lastError]);
			await recordValidationFailure(ctx, productId, runId, feedback);
			continue;
		}

		let parsed: unknown;
		try {
			parsed = parseJsonSafely(result.text);
		} catch (error) {
			lastError =
				error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON";
			feedback = buildFeedback([lastError]);
			await recordValidationFailure(ctx, productId, runId, feedback);
			continue;
		}

		const validation = validateSurfaceClassification(parsed);
		if (!validation.valid || !validation.value) {
			lastError = validation.errors.join("; ");
			feedback = buildFeedback(validation.errors);
			await recordValidationFailure(ctx, productId, runId, feedback);
			continue;
		}

		const validated = validation.value;

		const telemetryConfig = getAgentTelemetryConfig(AGENT_NAME);
		if (telemetryConfig.persistInferenceLogs) {
			await ctx.runMutation(internal.ai.telemetry.recordInferenceLog, {
				organizationId,
				productId,
				userId,
				useCase: USE_CASE,
				agentName: AGENT_NAME,
				promptVersion: PROMPT_VERSION,
				prompt,
				response: result.text,
				provider: aiConfig.provider,
				model: aiConfig.model,
				tokensIn: result.metrics.tokensIn,
				tokensOut: result.metrics.tokensOut,
				totalTokens: result.metrics.totalTokens,
				latencyMs: result.metrics.latencyMs,
				metadata: { source: "surface-classifier" },
			});
		}

		await ctx.runMutation(internal.ai.telemetry.recordUsage, {
			organizationId,
			productId,
			userId,
			useCase: USE_CASE,
			agentName: AGENT_NAME,
			threadId: undefined,
			result: {
				text: "",
				tokensIn: result.metrics.tokensIn,
				tokensOut: result.metrics.tokensOut,
				totalTokens: result.metrics.totalTokens,
				model: aiConfig.model,
				provider: aiConfig.provider,
				latencyMs: result.metrics.latencyMs,
			},
			prompt,
			response: result.text,
			metadata: { source: "surface-classifier" },
		});

		return validated;
	}

	await ctx.runMutation(internal.ai.telemetry.recordError, {
		organizationId,
		productId,
		userId,
		useCase: USE_CASE,
		agentName: AGENT_NAME,
		threadId: undefined,
		provider: aiConfig.provider,
		model: aiConfig.model,
		errorMessage: lastError ?? "Invalid surface classification output",
		prompt,
		metadata: { source: "surface-classifier" },
	});
	return null;
}

function createModelAdapter(aiConfig: {
	provider: AIProvider;
	model: string;
}): AgentModel {
	const adapter = createLLMAdapter(aiConfig);
	return {
		generate: async ({ messages, maxTokens, temperature, topP }) => {
			const prompt = messages
				.map((message) => `${message.role.toUpperCase()}: ${message.content}`)
				.join("\n\n");
			const response = await adapter.generateText({
				prompt,
				maxTokens,
				temperature,
				topP,
			});
			return {
				text: response.text,
				stopReason: "end",
				tokensIn: response.tokensIn,
				tokensOut: response.tokensOut,
				totalTokens: response.totalTokens,
			};
		},
	};
}

function buildSurfacePrompt(input: SurfaceClassificationInput): string {
	return `
You are the Source Context Classifier Agent. Analyze a repository structure to classify directories into surfaces.

## INPUT
${JSON.stringify(input)}

## OUTPUT FORMAT (JSON only, no markdown, no code fences)
{
  "sourceCategory": "monorepo" | "repo",
  "surfaceMapping": [
    { "pathPrefix": "<directory_path>", "surface": "<surface_type>" }
  ],
  "notes": "Brief description of the repo structure"
}

## SURFACES (8 types)
- product_front: UI that end users interact with (React, Vue, Angular, mobile apps)
- platform: Backend services, APIs, database layer, business logic
- infra: CI/CD, deployment, scripts, tooling, dev configs
- marketing: Public website, landing pages, blog
- doc: Documentation (technical and user-facing)
- management: Product specs, roadmaps, RFCs, planning docs
- admin: Admin panels, backoffice, internal tools
- analytics: Analytics dashboards, metrics systems, telemetry

## CRITICAL RULES

### Rule 1: pathPrefix MUST be a DIRECTORY
- NEVER use file paths (anything with an extension like .ts, .md, .json, .mjs)
- Root-level config files (README.md, package.json, eslint.config.mjs) are IGNORED

### Rule 2: NO DUPLICATE pathPrefix
- Each pathPrefix can appear ONLY ONCE in surfaceMapping
- If a directory contains multiple surfaces, use SUBDIRECTORIES

### Rule 3: Use MOST SPECIFIC directories
- If a directory has subdirectories with different surfaces, classify the subdirectories
- Example: apps/webapp with src/ and doc/ → use apps/webapp/src and apps/webapp/doc

### Rule 4: Paths must NOT overlap
- A file should match at most ONE pathPrefix
- More specific paths take precedence

### Rule 5: Consumption vs Definition (FRONTEND DEFAULTS TO product_front)
- Code that DEFINES backend logic → platform
- Code that CONSUMES backend services from a frontend app → product_front
- Heuristic: apps/*/src in frontend apps defaults to product_front
- A folder named lib/utils/api inside a frontend app is NOT platform by itself

## COMMON MISTAKES TO AVOID

WRONG (files as pathPrefix):
{ "pathPrefix": "eslint.config.mjs", "surface": "infra" }
{ "pathPrefix": "README.md", "surface": "doc" }

WRONG (duplicate pathPrefix):
{ "pathPrefix": "apps/webapp", "surface": "doc" }
{ "pathPrefix": "apps/webapp", "surface": "product_front" }

WRONG (frontend consuming backend labeled platform):
{ "pathPrefix": "apps/webapp/src/lib", "surface": "platform" }
{ "pathPrefix": "apps/myapp/src/api", "surface": "platform" }

CORRECT:
{ "pathPrefix": "apps/webapp/src", "surface": "product_front" }
{ "pathPrefix": "apps/webapp/doc", "surface": "doc" }
{ "pathPrefix": "packages/convex", "surface": "platform" }

## DETECTION HEURISTICS

### Monorepo Detection
- Has apps/ + packages/ (or libs/, modules/, shared/) → "monorepo"
- Has multiple package.json in subdirectories → "monorepo"
- Has pnpm-workspace.yaml, turbo.json, nx.json, lerna.json → "monorepo"
- Single app or library → "repo"

### Surface Detection by Directory Name

PRODUCT_FRONT patterns:
  src/, app/, pages/, components/, views/, layouts/,
  hooks/, composables/, styles/, public/, assets/,
  features/, domains/ (when containing UI code)

PLATFORM patterns:
  api/, server/, backend/, functions/, convex/, supabase/,
  controllers/, models/, services/, routes/, database/, db/,
  cmd/, internal/ (Go), migrations/, seeds/

INFRA patterns:
  .github/, .gitlab/, .circleci/, scripts/, docker/,
  terraform/, k8s/, kubernetes/, ci/, build/, deploy/

MARKETING patterns:
  website/, landing/, marketing/, www/, blog/

DOC patterns:
  docs/, doc/, documentation/

ADMIN patterns:
  admin/, backoffice/, internal-tools/, dashboard/ (when admin context)

ANALYTICS patterns:
  analytics/, metrics/, telemetry/, reporting/

### Package/Lib Classification (inside packages/, libs/, shared/)
Classify by package NAME:
- UI names (ui, components, design-system, frontend) → product_front
- Backend names (api, server, backend, database, core, convex) → platform
- Config names (*-config, eslint-*, prettier-*, typescript-config, tooling) → infra

### Framework-Specific Patterns
- convex/ directory → platform (Convex backend-as-a-service)
- supabase/functions/ → platform (Supabase edge functions)
- functions/ with Firebase context → platform
- server/ in fullstack frameworks (Nuxt, Remix) → platform
- prisma/ → platform (database ORM)

Return ONLY valid JSON. No markdown fences. No explanations.

## SELF-CHECK
- Validate your output against the rules before returning.
- If you receive validation errors, fix ALL issues and return corrected JSON only.

## VALIDATION FEEDBACK
If you receive a message saying your output failed validation, treat it as authoritative.
Fix every issue listed and return ONLY the corrected JSON.
`.trim();
}

function parseJsonSafely(text: string): any {
	const trimmed = text.trim();
	const withoutFences = trimmed.startsWith("```")
		? trimmed.replace(/^```[a-zA-Z]*\s*/, "").replace(/```$/, "").trim()
		: trimmed;
	return JSON.parse(withoutFences);
}

function validateSurfaceClassification(
	value: unknown,
): { valid: boolean; errors: string[]; value?: SurfaceClassification } {
	if (!value || typeof value !== "object") {
		return { valid: false, errors: ["Output must be a JSON object."] };
	}
	const data = value as {
		sourceCategory?: string;
		surfaceMapping?: SurfaceMappingItem[];
		notes?: string;
		outputVersion?: string;
	};
	if (data.sourceCategory !== "monorepo" && data.sourceCategory !== "repo") {
		return { valid: false, errors: ["sourceCategory must be 'monorepo' or 'repo'."] };
	}
	if (typeof data.notes !== "string") {
		return { valid: false, errors: ["notes must be a string."] };
	}

	const surfaceMapping = Array.isArray(data.surfaceMapping)
		? data.surfaceMapping.filter((entry) => isValidSurfaceMapping(entry))
		: [];
	if (surfaceMapping.length === 0) {
		return { valid: false, errors: ["surfaceMapping must be a non-empty array."] };
	}

	const prefixes = surfaceMapping.map((entry) => entry.pathPrefix);
	if (new Set(prefixes).size !== prefixes.length) {
		return { valid: false, errors: ["surfaceMapping has duplicate pathPrefix values."] };
	}
	const overlaps = findOverlappingPrefixes(prefixes);
	if (overlaps.length > 0) {
		return {
			valid: false,
			errors: [
				"surfaceMapping paths must NOT overlap.",
				...overlaps.map(
					(pair) => `Overlapping pathPrefix: "${pair[0]}" contains "${pair[1]}".`,
				),
			],
		};
	}
	for (const mapping of surfaceMapping) {
		if (/\.\w+$/.test(mapping.pathPrefix)) {
			return { valid: false, errors: ["pathPrefix must be a directory, not a file."] };
		}
	}

	return {
		valid: true,
		errors: [],
		value: {
			sourceCategory: data.sourceCategory,
			surfaceMapping,
			notes: data.notes,
			outputVersion: data.outputVersion,
		},
	};
}

function isValidSurfaceMapping(entry: SurfaceMappingItem): boolean {
	if (!entry || typeof entry !== "object") return false;
	if (!entry.pathPrefix || typeof entry.pathPrefix !== "string") return false;
	if (
		entry.surface !== "product_front" &&
		entry.surface !== "platform" &&
		entry.surface !== "infra" &&
		entry.surface !== "marketing" &&
		entry.surface !== "doc" &&
		entry.surface !== "management" &&
		entry.surface !== "admin" &&
		entry.surface !== "analytics"
	) {
		return false;
	}
	return true;
}

function buildFeedback(errors: string[]): string {
	const unique = Array.from(new Set(errors)).slice(0, 8);
	return [
		"Your previous output failed validation.",
		"Fix the following issues and return only the corrected JSON:",
		...unique.map((error) => `- ${error}`),
		"",
		"Remember:",
		"- pathPrefix must be a DIRECTORY (no file extensions).",
		"- Do not repeat the same pathPrefix.",
		"- surfaceMapping must be non-empty.",
	].join("\n");
}

function findOverlappingPrefixes(prefixes: string[]): Array<[string, string]> {
	const normalized = prefixes
		.map((prefix) => prefix.trim().replace(/\/+$/, ""))
		.filter(Boolean)
		.sort((a, b) => a.localeCompare(b));
	const overlaps: Array<[string, string]> = [];
	for (let i = 0; i < normalized.length; i += 1) {
		const current = normalized[i];
		const currentWithSlash = `${current}/`;
		for (let j = i + 1; j < normalized.length; j += 1) {
			const candidate = normalized[j];
			if (candidate.startsWith(currentWithSlash)) {
				overlaps.push([current, candidate]);
			}
		}
	}
	return overlaps;
}

async function recordValidationFailure(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns"> | undefined,
	feedback: string,
) {
	if (!runId) return;
	await ctx.runMutation(internal.agents.agentRuns.appendStep, {
		productId,
		runId,
		step: "Surface classifier validation failed",
		status: "warn",
		metadata: {
			feedbackPreview: feedback.slice(0, 2000),
		},
	});
}
