import { createThread, type AgentComponent } from "@convex-dev/agent";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, components, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { getAgentAIConfig, getAgentTelemetryConfig } from "../ai";
import {
	productContextPrompt,
	PRODUCT_CONTEXT_PROMPT_VERSION,
	TIMELINE_INTERPRETER_PROMPT_VERSION,
} from "../ai/prompts";
import { helloWorldAgent, HELLO_WORLD_PROMPT_VERSION } from "./helloWorldAgent";
import { productContextAgent } from "./productContextAgent";
import { timelineContextInterpreterAgent } from "./timelineContextInterpreterAgent";
import { sourceContextAgent } from "./sourceContextAgent";
import { detectStackFromPackageJson } from "./stackDetector";
import { validateAndEnrichContext } from "./contextValidator";

const agentComponent = (components as { agent: AgentComponent }).agent;
const AGENT_NAME = "Hello World Agent";
const USE_CASE = "ai_test";
const SOURCE_METADATA = { source: "ai-test" };
const PRODUCT_CONTEXT_USE_CASE = "product_context_enrichment";
const PRODUCT_CONTEXT_AGENT_NAME = "Product Context Agent";
const TIMELINE_INTERPRETER_USE_CASE = "timeline_interpretation";
const TIMELINE_INTERPRETER_AGENT_NAME = "Timeline Context Interpreter Agent";
const SOURCE_CONTEXT_USE_CASE = "source_context_classification";
const SOURCE_CONTEXT_AGENT_NAME = "Source Context Classifier Agent";

const strategicPillarsCatalog = [
	{
		id: "product_excellence",
		label: { en: "Product Excellence", es: "Excelencia de producto" },
		description: {
			en: "Build a solid, reliable product with high technical and UX quality.",
			es: "Construir un producto sólido, fiable, bien ejecutado y con alta calidad técnica y de experiencia.",
		},
	},
	{
		id: "user_adoption_retention",
		label: { en: "User Adoption & Retention", es: "Adopción y retención" },
		description: {
			en: "Drive fast adoption and recurring usage.",
			es: "Conseguir que los usuarios adopten el producto rápidamente y lo usen de forma recurrente.",
		},
	},
	{
		id: "growth_acquisition",
		label: { en: "Growth & Acquisition", es: "Crecimiento y adquisición" },
		description: {
			en: "Increase visibility, users, and growth opportunities.",
			es: "Incrementar visibilidad, usuarios y oportunidades de negocio a través de adquisición y distribución.",
		},
	},
	{
		id: "narrative_brand",
		label: {
			en: "Narrative & Brand Positioning",
			es: "Narrativa y posicionamiento de marca",
		},
		description: {
			en: "Communicate clearly what the product is and why it matters.",
			es: "Comunicar de forma clara y diferenciada qué es el producto, por qué importa y cómo se posiciona.",
		},
	},
	{
		id: "operational_efficiency",
		label: {
			en: "Operational & Team Efficiency",
			es: "Eficiencia operativa y de equipo",
		},
		description: {
			en: "Improve operational efficiency and team alignment.",
			es: "Mejorar la eficiencia operativa y la alineación de los equipos reduciendo fricción y trabajo manual.",
		},
	},
	{
		id: "scalability_business_impact",
		label: {
			en: "Scalability & Business Impact",
			es: "Escalabilidad e impacto en negocio",
		},
		description: {
			en: "Enable sustainable growth and business impact.",
			es: "Asegurar que el producto y el negocio puedan crecer de forma sostenible y con impacto económico.",
		},
	},
];

const getStrategicPillarsForPrompt = (
	pillarIds: string[] | undefined,
	language: "en" | "es",
) =>
	(pillarIds ?? [])
		.map((id) => {
			if (id === "Other") {
				return { name: language === "es" ? "Otro" : "Other" };
			}
			const entry = strategicPillarsCatalog.find((pillar) => pillar.id === id);
			if (!entry) return null;
			return {
				name: entry.label[language],
				description: entry.description[language],
			};
		})
		.filter((pillar): pillar is { name: string; description?: string } => Boolean(pillar));

export const chat = action({
	args: {
		prompt: v.string(),
		threadId: v.optional(v.string()),
		organizationId: v.optional(v.id("organizations")),
		productId: v.optional(v.id("products")),
	},
	handler: async (ctx, { prompt, threadId, organizationId, productId }): Promise<{
		text: string;
		threadId: string;
		usage: {
			provider: string;
			model: string;
			tokensIn: number;
			tokensOut: number;
			totalTokens: number;
			latencyMs: number;
			status: "success";
		};
	}> => {
		const aiConfig = getAgentAIConfig(AGENT_NAME);
		const { resolvedOrgId, resolvedProductId, userId } = await resolveAccess(
			ctx,
			organizationId,
			productId,
		);

		const tid = threadId ?? (await createThread(ctx, agentComponent));
		const start = Date.now();

		try {
			const agentCtx = {
				...ctx,
				organizationId: resolvedOrgId,
				productId: resolvedProductId,
				userId,
				aiPrompt: prompt,
				aiStartMs: start,
			};

			const result = await helloWorldAgent.generateText(
				agentCtx,
				{ threadId: tid },
				{ prompt },
			);
			const latencyMs = Date.now() - start;
			const telemetryConfig = getAgentTelemetryConfig(AGENT_NAME);
			if (telemetryConfig.persistInferenceLogs && resolvedProductId) {
				const usage = getUsageTotals(result);
				await ctx.runMutation(internal.ai.telemetry.recordInferenceLog, {
					organizationId: resolvedOrgId,
					productId: resolvedProductId,
					userId,
					useCase: USE_CASE,
					agentName: AGENT_NAME,
					promptVersion: HELLO_WORLD_PROMPT_VERSION,
					prompt,
					response: result.text,
					provider: aiConfig.provider,
					model: aiConfig.model,
					tokensIn: usage.tokensIn,
					tokensOut: usage.tokensOut,
					totalTokens: usage.totalTokens,
					latencyMs,
					metadata: SOURCE_METADATA,
				});
			}

			return {
				text: result.text,
				threadId: tid,
				usage: {
					provider: aiConfig.provider,
					model: aiConfig.model,
					tokensIn: 0,
					tokensOut: 0,
					totalTokens: 0,
					latencyMs,
					status: "success" as const,
				},
			};
		} catch (error) {
			await ctx.runMutation(internal.ai.telemetry.recordError, {
				organizationId: resolvedOrgId,
				productId: resolvedProductId,
				userId,
				useCase: USE_CASE,
				agentName: AGENT_NAME,
				threadId: tid,
				provider: aiConfig.provider,
				model: aiConfig.model,
				errorMessage:
					error instanceof Error ? error.message : "Unknown error invoking agent",
				prompt,
				metadata: SOURCE_METADATA,
			});

			throw error;
		}
	},
});

export const generateProductContext = action({
	args: {
		productId: v.id("products"),
		forceRefresh: v.optional(v.boolean()),
		threadId: v.optional(v.string()),
		debugUi: v.optional(v.boolean()),
		agentRunId: v.optional(v.id("agentRuns")),
	},
	handler: async (
		ctx,
		{ productId, forceRefresh, threadId, debugUi, agentRunId },
	): Promise<{
		threadId: string;
		productContext: Record<string, unknown>;
		debugSteps: string[];
		agentRunId?: Id<"agentRuns">;
	}> => {
		const aiConfig = getAgentAIConfig(PRODUCT_CONTEXT_AGENT_NAME);
		const debugSteps: string[] = [];
		const { organizationId, userId, product } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);
		const currentSnapshot = product.currentContextSnapshotId
			? await ctx.runQuery(
					internal.agents.productContextData.getContextSnapshotById,
					{ snapshotId: product.currentContextSnapshotId },
				)
			: null;
		let runId = agentRunId;
		if (!runId) {
			try {
				const createdRun = await ctx.runMutation(
					api.agents.agentRuns.createAgentRun,
					{
						productId,
						useCase: PRODUCT_CONTEXT_USE_CASE,
						agentName: PRODUCT_CONTEXT_AGENT_NAME,
					},
				);
				runId = createdRun.runId;
			} catch {
				debugSteps.push("debug: failed to create agent run");
			}
		}

		const recordStep = async (
			message: string,
			status: "info" | "success" | "warn" | "error" = "info",
			metadata?: Record<string, unknown>,
		) => {
			debugSteps.push(message);
			if (!runId) return;
			try {
				await ctx.runMutation(internal.agents.agentRuns.appendStep, {
					productId,
					runId,
					step: message,
					status,
					timestamp: Date.now(),
					metadata,
				});
			} catch {
				// Avoid failing the agent if debug logging fails.
			}
		};

		const finishRun = async (
			status: "success" | "error",
			errorMessage?: string,
		) => {
			if (!runId) return;
			try {
				await ctx.runMutation(internal.agents.agentRuns.finishRun, {
					productId,
					runId,
					status,
					errorMessage,
					finishedAt: Date.now(),
				});
			} catch {
				// Avoid failing the agent if debug logging fails.
			}
		};

		await recordStep("Started product context generation");

		const tid = threadId ?? (await createThread(ctx, agentComponent));
		const fetchedProduct =
			product ??
			(await ctx.runQuery(
				internal.agents.productContextData.getProductWithContext,
				{ productId },
			));
		const languagePreference = fetchedProduct.languagePreference ?? "en";
		const language = languagePreference === "es" ? "es" : "en";
		const sourcesUsed = new Set<string>(["baseline"]);
		const detectedStack = new Set<string>();
		let foundPackageJson = false;

		const eventSummaries = await ctx.runQuery(
			internal.agents.productContextData.listRawEventSummaries,
			{
				productId,
				limit: 50,
			},
		);
		eventSummaries.forEach((event: { source: string }) =>
			sourcesUsed.add(event.source),
		);

		const repoMetadata = await ctx.runQuery(
			internal.agents.productContextData.getRepositoryMetadata,
			{ productId },
		);
		await recordStep(`github: found ${repoMetadata.length} active connections`);

		for (const metadata of repoMetadata) {
			const { connectionId } = metadata;
			try {
				await recordStep(`github: resolving token for ${connectionId}`);
				const tokenResult = await ctx.runAction(
					internal.connectors.github.getInstallationTokenForConnection,
					{ productId, connectionId },
				);
				const repositories = await fetchInstallationRepositories(tokenResult.token);
				await recordStep(
					`github: connection ${connectionId} has ${repositories.length} repos`,
				);

				for (const repo of repositories) {
					const defaultBranch =
						repo.defaultBranch ??
						(await fetchRepoDefaultBranch(tokenResult.token, repo));
					if (!defaultBranch) {
						await recordStep(
							`github: ${repo.fullName} missing default branch`,
							"warn",
						);
						continue;
					}

					const tree = await fetchRepoTree(
						tokenResult.token,
						repo,
						defaultBranch,
					);
					if (!tree) {
						await recordStep(
							`github: ${repo.fullName} tree not available`,
							"warn",
						);
						continue;
					}

					const packageJsonEntries = tree.filter(
						(entry) => entry.path.endsWith("package.json") && entry.type === "blob",
					);
					if (!packageJsonEntries.length) {
						await recordStep(`github: ${repo.fullName} has no package.json`);
						continue;
					}

					foundPackageJson = true;
					await recordStep(
						`github: ${repo.fullName} has ${packageJsonEntries.length} package.json`,
					);

					for (const entry of packageJsonEntries) {
						const content = await fetchRepoBlob(
							tokenResult.token,
							repo,
							entry.sha,
						);
						if (!content) {
							await recordStep(
								`github: ${repo.fullName} failed to read ${entry.path}`,
								"warn",
							);
							continue;
						}

						try {
							const parsed = JSON.parse(content) as {
								dependencies?: Record<string, string>;
								devDependencies?: Record<string, string>;
							};
							const stack = detectStackFromPackageJson(parsed);
							stack.forEach((item) => detectedStack.add(item));
						} catch (error) {
							await recordStep(
								`github: ${repo.fullName} invalid package.json at ${entry.path}`,
								"warn",
							);
						}
					}
				}
			} catch (error) {
				await recordStep(
					`github: connection ${connectionId} error ${
						error instanceof Error ? error.message : "unknown error"
					}`,
					"error",
				);
			}
		}

		if (detectedStack.size > 0) {
			await recordStep(
				`github: detected stack ${Array.from(detectedStack).join(", ")}`,
				"success",
			);
		}

		if (foundPackageJson) {
			sourcesUsed.add("package.json");
		}

		const currentVersion = currentSnapshot?.context?.version ?? 0;
		const baselineSource = fetchedProduct.productBaseline ?? {};
		const baseline = {
			productName: fetchedProduct.name,
			description: "",
			productCategory: "",
			valueProposition: baselineSource.valueProposition ?? "",
			problemSolved: baselineSource.problemSolved ?? "",
			targetMarket: baselineSource.targetMarket ?? "",
			productType: baselineSource.productType ?? "",
			businessModel: baselineSource.businessModel ?? "",
			stage: baselineSource.stage ?? "",
			industries: baselineSource.industries ?? [],
			audiences: baselineSource.audiences ?? [],
			productVision: baselineSource.productVision ?? "",
			strategicPillars: getStrategicPillarsForPrompt(
				baselineSource.strategicPillars ?? [],
				language,
			),
			metricsOfInterest: baselineSource.metricsOfInterest ?? [],
			personas: baselineSource.personas ?? [],
			platforms: [],
			releaseCadence: fetchedProduct.releaseCadence ?? "",
			languagePreference,
		};

		const input = {
			languagePreference,
			forceRefresh: forceRefresh ?? false,
			baseline,
			detectedTechnicalStack: Array.from(detectedStack),
			existingContext: forceRefresh ? null : currentSnapshot?.context ?? null,
			sources: {
				github: eventSummaries,
			},
		};

		const promptPayload = JSON.stringify(input);
		const shouldLogPrompt = aiConfig.debugLogContent || debugUi === true;
		const promptUsed = shouldLogPrompt
			? `Instructions:\n${productContextPrompt}\n\nInput:\n${promptPayload}`
			: undefined;
		const start = Date.now();

		try {
			const agentCtx = {
				...ctx,
				organizationId,
				productId,
				userId,
				aiPrompt: promptPayload,
				aiStartMs: start,
			};

			const result = await productContextAgent.generateText(
				agentCtx,
				{ threadId: tid },
				{ prompt: promptPayload },
			);

			const parsed = parseJsonSafely(result.text) as Record<string, any>;
			if (!parsed || typeof parsed !== "object") {
				throw new Error("Invalid JSON response from Product Context Agent");
			}

			if (parsed.personas) {
				parsed.personas = normalizePersonas(parsed.personas);
			}

			const enriched = validateAndEnrichContext(
				parsed,
				detectedStack.size > 0 ? Array.from(detectedStack) : undefined,
			);

			const version = currentVersion + 1;
			const timestamp = Date.now();
			const newEntry = {
				...enriched,
				version,
				createdAt: timestamp,
				createdBy: userId,
				provider: aiConfig.provider,
				model: aiConfig.model,
				threadId: tid,
				aiDebug: aiConfig.debugLogContent || debugUi === true,
				promptUsed,
				language: parsed.language ?? languagePreference,
				languagePreference,
				sourcesUsed: Array.from(sourcesUsed),
			};

			const telemetryConfig = getAgentTelemetryConfig(PRODUCT_CONTEXT_AGENT_NAME);
			if (telemetryConfig.persistInferenceLogs) {
				const usage = getUsageTotals(result);
				await ctx.runMutation(internal.ai.telemetry.recordInferenceLog, {
					organizationId,
					productId,
					userId,
					useCase: PRODUCT_CONTEXT_USE_CASE,
					agentName: PRODUCT_CONTEXT_AGENT_NAME,
					promptVersion: PRODUCT_CONTEXT_PROMPT_VERSION,
					prompt: promptPayload,
					response: result.text,
					provider: aiConfig.provider,
					model: aiConfig.model,
					tokensIn: usage.tokensIn,
					tokensOut: usage.tokensOut,
					totalTokens: usage.totalTokens,
					latencyMs: Date.now() - start,
					contextVersion: version,
					metadata: { source: "product-context" },
				});
			}

			await ctx.runMutation(internal.agents.productContextData.saveProductContext, {
				productId,
				context: newEntry,
				baseline: baselineSource,
				releaseCadence: fetchedProduct.releaseCadence ?? undefined,
				languagePreference,
				timestamp,
			});

			await recordStep("Product context generation completed", "success");
			await finishRun("success");

			return {
				threadId: tid,
				productContext: newEntry,
				debugSteps,
				agentRunId: runId,
			};
		} catch (error) {
			await recordStep(
				`Product context generation failed: ${
					error instanceof Error ? error.message : "unknown error"
				}`,
				"error",
			);
			await finishRun(
				"error",
				error instanceof Error ? error.message : "Unknown error invoking product context agent",
			);
			await ctx.runMutation(internal.ai.telemetry.recordError, {
				organizationId,
				productId,
				userId,
				useCase: PRODUCT_CONTEXT_USE_CASE,
				agentName: PRODUCT_CONTEXT_AGENT_NAME,
				threadId: tid,
				provider: aiConfig.provider,
				model: aiConfig.model,
				errorMessage:
					error instanceof Error ? error.message : "Unknown error invoking product context agent",
				prompt: promptPayload,
				metadata: { source: "product-context" },
			});

			throw error;
		}
	},
});

export const interpretTimelineEvents = action({
	args: {
		productId: v.id("products"),
		rawEventIds: v.optional(v.array(v.id("rawEvents"))),
		limit: v.optional(v.number()),
		threadId: v.optional(v.string()),
		debugUi: v.optional(v.boolean()),
		bucket: v.optional(
			v.object({
				bucketId: v.string(),
				bucketStartAt: v.number(),
				bucketEndAt: v.number(),
			}),
		),
	},
	handler: async (
		ctx,
		{ productId, rawEventIds, limit, threadId, debugUi, bucket },
	): Promise<{
		threadId: string;
		narratives: Array<{
			bucketId: string;
			bucketStartAt: number;
			bucketEndAt: number;
			cadence: string;
			title: string;
			summary?: string;
			narrative?: string;
			kind: string;
			tags?: string[];
			audience?: string;
			feature?: string;
			relevance?: number;
			rawEventIds: string[];
			focusAreas?: string[];
			features?: Array<{
				title: string;
				summary?: string;
				focusArea?: string;
				visibility?: "public" | "internal";
			}>;
			fixes?: Array<{
				title: string;
				summary?: string;
				focusArea?: string;
				visibility?: "public" | "internal";
			}>;
			improvements?: Array<{
				title: string;
				summary?: string;
				focusArea?: string;
				visibility?: "public" | "internal";
			}>;
			ongoingFocusAreas?: string[];
			bucketImpact?: number;
		}>;
		inferenceLogId?: Id<"aiInferenceLogs">;
		}> => {
		const aiConfig = getAgentAIConfig(TIMELINE_INTERPRETER_AGENT_NAME);
		const { organizationId, userId, product } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);

		const rawSummaries = rawEventIds?.length
			? await ctx.runQuery(
					internal.agents.productContextData.getRawEventSummariesByIds,
					{ productId, rawEventIds },
				)
			: await ctx.runQuery(
					internal.agents.productContextData.listRawEventSummaries,
					{ productId, limit },
				);

		const rawEvents = rawSummaries.map((event) => {
			const filePaths = Array.isArray((event as { filePaths?: string[] }).filePaths)
				? ((event as { filePaths: string[] }).filePaths ?? [])
				: [];
			return {
				rawEventId: event.rawEventId,
				occurredAt: event.occurredAt ?? 0,
				sourceType:
					event.type === "commit" ||
					event.type === "pull_request" ||
					event.type === "release"
						? event.type
						: "other",
				summary: event.summary,
				filePaths,
				surfaceHints: deriveSurfaceHints(filePaths),
			};
		});

		const repoContexts = await ctx.runQuery(
			internal.agents.sourceContextData.listSourceContexts,
			{ productId },
		);
		const repoContextSummary = repoContexts.map((item) => ({
			sourceId: item.sourceId,
			classification: item.classification,
			notes: item.notes,
		}));

		const currentSnapshot = product.currentContextSnapshotId
			? await ctx.runQuery(
					internal.agents.productContextData.getContextSnapshotById,
					{ snapshotId: product.currentContextSnapshotId },
				)
			: null;

		const baseline = currentSnapshot?.baseline ?? product.productBaseline ?? {};
		const context = currentSnapshot?.context ?? {};
		const releaseCadence =
			currentSnapshot?.releaseCadence ?? product.releaseCadence ?? "unknown";
		const languagePreference = product.languagePreference ?? "en";

		const snapshotPayload = {
			baseline,
			productContext: context,
			releaseCadence,
		};

		const input = {
			languagePreference,
			releaseCadence,
			bucket: bucket ?? undefined,
			baseline,
			productContext: context,
			repoContexts: repoContextSummary,
			rawEvents,
		};

		const promptPayload = JSON.stringify(input);
		const tid = threadId ?? (await createThread(ctx, agentComponent));
		const start = Date.now();

		try {
			const agentCtx = {
				...ctx,
				organizationId,
				productId,
				userId,
				aiPrompt: promptPayload,
				aiStartMs: start,
			};

			const result = await timelineContextInterpreterAgent.generateText(
				agentCtx,
				{ threadId: tid },
				{ prompt: promptPayload },
			);

			const parsed = parseJsonSafely(result.text) as {
				narratives?: Array<{
					bucketId: string;
					bucketStartAt: number;
					bucketEndAt: number;
					cadence: string;
					title: string;
					summary?: string;
					narrative?: string;
					kind: string;
					tags?: string[];
					audience?: string;
					feature?: string;
					relevance?: number;
					rawEventIds: string[];
					focusAreas?: string[];
					features?: Array<{
						title: string;
						summary?: string;
						focusArea?: string;
						visibility?: "public" | "internal";
					}>;
					fixes?: Array<{
						title: string;
						summary?: string;
						focusArea?: string;
						visibility?: "public" | "internal";
					}>;
					improvements?: Array<{
						title: string;
						summary?: string;
						focusArea?: string;
						visibility?: "public" | "internal";
					}>;
					ongoingFocusAreas?: string[];
					bucketImpact?: number;
				}>;
			};
			if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.narratives)) {
				throw new Error(
					"Invalid JSON response from Timeline Context Interpreter Agent",
				);
			}
			const focusAreaSets = buildFocusAreaSets(baseline, context);
			focusAreaSets.all.add("Technical");
			const shouldNormalizeFocusAreas = focusAreaSets.all.size > 0;
			const normalizeFocusArea = (value: string | undefined) => {
				const trimmed = value?.trim();
				if (!trimmed) return undefined;
				if (!shouldNormalizeFocusAreas) return trimmed;
				return focusAreaSets.all.has(trimmed) ? trimmed : "Other";
			};
			const shouldForcePublic = (
				focusArea: string | undefined,
				text: string,
			): boolean => {
				const normalizedFocus = focusArea ?? "";
				const isCoreArea =
					focusAreaSets.keyFeatures.has(normalizedFocus) ||
					focusAreaSets.domains.has(normalizedFocus);
				const coreKeywords =
					/(timeline|narrative|context|insight|distribution|stakeholder|reporting|content generation|changelog|release notes)/;
				const technicalKeywords =
					/(performance|reliability|stability|latency|security|scalability|availability|resilience)/;
				if (normalizedFocus === "Technical") {
					return technicalKeywords.test(text);
				}
				return isCoreArea && coreKeywords.test(text);
			};

			parsed.narratives = parsed.narratives.map((narrative) => {
			const normalizedFeatures =
				narrative.features?.map((item) => ({
					title: item.title,
					summary: item.summary,
					focusArea: normalizeFocusArea(item.focusArea) ?? "Other",
					visibility: item.visibility ?? "public",
				})) ?? [];
			const normalizedFixes =
				narrative.fixes?.map((item) => ({
					title: item.title,
					summary: item.summary,
					focusArea: normalizeFocusArea(item.focusArea) ?? "Other",
					visibility: item.visibility ?? "public",
				})) ?? [];
			const normalizedImprovements =
				narrative.improvements?.map((item) => ({
					title: item.title,
					summary: item.summary,
					focusArea: normalizeFocusArea(item.focusArea) ?? "Other",
					visibility: item.visibility ?? "public",
				})) ?? [];

			const splitByVisibility = (
				items: Array<{
					title: string;
					summary?: string;
					focusArea?: string;
					visibility?: "public" | "internal";
				}>,
			) => {
				const internalItems = [];
				const publicItems = [];
				for (const item of items) {
					if (item.visibility === "internal") internalItems.push(item);
					else publicItems.push(item);
				}
				return { internalItems, publicItems };
			};

			const adjustedFeatures = normalizedFeatures.map((item) => {
				if (item.focusArea === "Other") {
					return { ...item, visibility: "internal" as const };
				}
				if (item.visibility === "internal") {
					const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
					if (shouldForcePublic(item.focusArea, text)) {
						return { ...item, visibility: "public" as const };
					}
				}
				return item;
			});
			const adjustedFixes = normalizedFixes.map((item) => {
				if (item.focusArea === "Other") {
					return { ...item, visibility: "internal" as const };
				}
				if (item.visibility === "internal") {
					const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
					if (shouldForcePublic(item.focusArea, text)) {
						return { ...item, visibility: "public" as const };
					}
				}
				return item;
			});
			const adjustedImprovements = normalizedImprovements.map((item) => {
				if (item.focusArea === "Other") {
					return { ...item, visibility: "internal" as const };
				}
				if (item.visibility === "internal") return item;
				const isCoreArea =
					item.focusArea &&
					(focusAreaSets.keyFeatures.has(item.focusArea) ||
						focusAreaSets.domains.has(item.focusArea) ||
						item.focusArea === "Technical");
				const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
				if (!isCoreArea || (item.focusArea === "Technical" && !shouldForcePublic(item.focusArea, text))) {
					return { ...item, visibility: "internal" as const };
				}
				return item;
			});

			const { internalItems: internalFeatures, publicItems: publicFeatures } =
				splitByVisibility(adjustedFeatures);
			const { internalItems: internalFixes, publicItems: publicFixes } =
				splitByVisibility(adjustedFixes);
			const { internalItems: internalImprovements, publicItems: publicImprovements } =
				splitByVisibility(adjustedImprovements);
			const mergedImprovements = [
				...publicImprovements,
				...internalImprovements,
				...internalFeatures,
				...internalFixes,
			];

				const normalizedFocusAreas = new Set<string>();
				for (const item of adjustedFeatures) {
					if (item.focusArea && item.focusArea !== "Other") {
						normalizedFocusAreas.add(item.focusArea);
					}
				}
				for (const item of adjustedFixes) {
					if (item.focusArea && item.focusArea !== "Other") {
						normalizedFocusAreas.add(item.focusArea);
					}
				}
				for (const item of adjustedImprovements) {
					if (item.focusArea && item.focusArea !== "Other") {
						normalizedFocusAreas.add(item.focusArea);
					}
				}

				return {
					...narrative,
					focusAreas: normalizedFocusAreas.size
						? Array.from(normalizedFocusAreas)
						: undefined,
					features: publicFeatures.length ? publicFeatures : undefined,
					fixes: publicFixes.length ? publicFixes : undefined,
					improvements: mergedImprovements.length
						? mergedImprovements
						: undefined,
					ongoingFocusAreas: narrative.ongoingFocusAreas,
					bucketImpact: narrative.bucketImpact,
				};
			});

			const telemetryConfig = getAgentTelemetryConfig(
				TIMELINE_INTERPRETER_AGENT_NAME,
			);
			let inferenceLogId: Id<"aiInferenceLogs"> | undefined;
			if (telemetryConfig.persistInferenceLogs) {
				const usage = getUsageTotals(result);
				const bucketIds = parsed.narratives
					.map((item) =>
						item && typeof item === "object"
							? (item as { bucketId?: string }).bucketId
							: undefined,
					)
					.filter((value): value is string => Boolean(value));

				inferenceLogId = await ctx.runMutation(
					internal.ai.telemetry.recordInferenceLog,
					{
					organizationId,
					productId,
					userId,
					useCase: TIMELINE_INTERPRETER_USE_CASE,
					agentName: TIMELINE_INTERPRETER_AGENT_NAME,
					promptVersion: TIMELINE_INTERPRETER_PROMPT_VERSION,
					prompt: debugUi ? promptPayload : undefined,
					response: debugUi ? result.text : undefined,
					provider: aiConfig.provider,
					model: aiConfig.model,
					tokensIn: usage.tokensIn,
					tokensOut: usage.tokensOut,
					totalTokens: usage.totalTokens,
					latencyMs: Date.now() - start,
					contextVersion:
						typeof (context as { version?: number }).version === "number"
							? (context as { version: number }).version
							: undefined,
					metadata: {
						rawEventIds: rawEvents.map((event) => event.rawEventId),
						bucketIds,
						baselineSnapshotHash: hashString(JSON.stringify(snapshotPayload)),
					},
					},
				);
			}

			return { threadId: tid, narratives: parsed.narratives, inferenceLogId };
		} catch (error) {
			await ctx.runMutation(internal.ai.telemetry.recordError, {
				organizationId,
				productId,
				userId,
				useCase: TIMELINE_INTERPRETER_USE_CASE,
				agentName: TIMELINE_INTERPRETER_AGENT_NAME,
				threadId: tid,
				provider: aiConfig.provider,
				model: aiConfig.model,
				errorMessage:
					error instanceof Error
						? error.message
						: "Unknown error invoking timeline interpreter agent",
				prompt: debugUi ? promptPayload : undefined,
				metadata: { source: "timeline-interpretation" },
			});

			throw error;
		}
	},
});

export const classifySourceContext = action({
	args: {
		productId: v.id("products"),
	},
	handler: async (
		ctx,
		{ productId },
	): Promise<{ classified: number }> => {
		const { organizationId, userId, product } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);

		const rawEvents = await ctx.runQuery(
			internal.timeline.interpret.getAllRawEventsForProduct,
			{ productId },
		);
		const existingContexts = await ctx.runQuery(
			internal.agents.sourceContextData.listSourceContexts,
			{ productId },
		);
		const existingByKey = new Map(
			existingContexts.map((item) => [`${item.sourceType}:${item.sourceId}`, item]),
		);
		const repoSamples = new Map<
			string,
			{
				sourceType: string;
				summaries: Array<string>;
				pathHints: Set<string>;
				connectionId?: Id<"connections">;
			}
		>();
		for (const event of rawEvents) {
			const repoName =
				typeof (event.payload as any)?.repo?.fullName === "string"
					? ((event.payload as any).repo.fullName as string)
					: null;
			if (!repoName) continue;
			const connectionId = (event as { connectionId?: Id<"connections"> })
				.connectionId;
			const entry = repoSamples.get(repoName) ?? {
				sourceType: event.sourceType,
				summaries: [],
				pathHints: new Set<string>(),
				connectionId,
			};
			if (entry.summaries.length < 6) {
				entry.summaries.push(
					buildSourceSummary(event.payload, event.sourceType),
				);
			}
			const hints = extractPathHints(event.payload);
			for (const hint of hints) {
				entry.pathHints.add(hint);
			}
			if (!entry.connectionId && connectionId) {
				entry.connectionId = connectionId;
			}
			repoSamples.set(repoName, entry);
		}

		let classified = 0;
		for (const [sourceId, entry] of repoSamples.entries()) {
			const sourceType = "repo";
			const key = `${sourceType}:${sourceId}`;
			const existing = existingByKey.get(key);
			const now = Date.now();
			const isFresh =
				typeof existing?.updatedAt === "number" && now - existing.updatedAt < 86400000;
			let structureSummary: unknown = null;
			if (isFresh && existing?.structure) {
				structureSummary =
					(existing.structure as { summary?: unknown }).summary ?? existing.structure;
			} else if (entry.connectionId) {
				try {
					structureSummary = await ctx.runAction(
						internal.connectors.github.fetchRepoStructureSummary,
						{
							productId,
							connectionId: entry.connectionId,
							repoFullName: sourceId,
						},
					);
				} catch (error) {
					structureSummary = null;
				}
			}
			const pathOverview = structureSummary
				? buildPathOverviewFromStructure(structureSummary)
				: buildPathOverview(Array.from(entry.pathHints));

			const promptPayload = JSON.stringify({
				product: {
					name: product.name,
					productType: product.productBaseline?.productType ?? "",
					valueProposition: product.productBaseline?.valueProposition ?? "",
					targetMarket: product.productBaseline?.targetMarket ?? "",
					audiences: product.productBaseline?.audiences ?? [],
					stage: product.productBaseline?.stage ?? "",
				},
				repo: {
					sourceType,
					sourceId,
					samples: entry.summaries,
					pathOverview,
					structureSummary,
				},
			});
			const tid = await createThread(ctx, agentComponent);
			const start = Date.now();

			const agentCtx = {
				...ctx,
				organizationId,
				productId,
				userId,
				aiPrompt: promptPayload,
				aiStartMs: start,
			};

			const result = await sourceContextAgent.generateText(
				agentCtx,
				{ threadId: tid },
				{ prompt: promptPayload },
			);

			const parsed = parseJsonSafely(result.text) as {
				classification?:
					| "product_core"
					| "marketing_surface"
					| "infra"
					| "docs"
					| "experiments"
					| "unknown";
				notes?: string;
			};
			if (!parsed?.classification) continue;

			await ctx.runMutation(internal.agents.sourceContextData.upsertSourceContext, {
				productId,
				sourceType,
				sourceId,
				classification: parsed.classification,
				notes: parsed.notes,
				structure: structureSummary
					? { summary: structureSummary, updatedAt: now, source: "github_tree" }
					: existing?.structure,
			});
			classified += 1;
		}

		return { classified };
	},
});

function buildSourceSummary(payload: unknown, sourceType: string): string {
	const safe = toSafeString;
	const title = safe((payload as any)?.title ?? "");
	const body = safe((payload as any)?.body ?? "");
	const files = extractPathHints(payload).slice(0, 4).join(", ");

	const bodySnippet = body.length > 200 ? `${body.slice(0, 200)}...` : body;
	const parts = [sourceType ? `[${sourceType}]` : "", title, bodySnippet].filter(
		(p) => p && p.length > 0,
	);
	if (files) parts.push(`files: ${files}`);

	return parts.join(" • ");
}

function extractPathHints(payload: unknown): string[] {
	const hints = new Set<string>();
	const safe = toSafeString;
	const title = safe((payload as any)?.title ?? "");
	const body = safe((payload as any)?.body ?? "");
	const text = `${title} ${body}`;

	const regex = /\b(?:apps|packages|convex|docs|doc|website|webapp|web|ui)\/[\w.-]+(?:\/[\w./-]+)?/g;
	const matches = text.match(regex) ?? [];
	for (const match of matches) {
		hints.add(normalizePathHint(match));
	}

	const commitList = Array.isArray((payload as any)?.commits)
		? ((payload as any).commits as Array<Record<string, unknown>>)
		: [];
	for (const commit of commitList) {
		const arrays = [
			commit.added,
			commit.modified,
			commit.removed,
		] as Array<unknown>;
		for (const value of arrays) {
			if (!Array.isArray(value)) continue;
			for (const file of value) {
				if (typeof file !== "string") continue;
				hints.add(normalizePathHint(file));
			}
		}
	}

	const filePaths = Array.isArray((payload as any)?.filePaths)
		? ((payload as any).filePaths as string[])
		: [];
	for (const filePath of filePaths) {
		hints.add(normalizePathHint(filePath));
	}

	return Array.from(hints);
}

function normalizePathHint(path: string): string {
	const normalized = path.replace(/^\.\/+/, "");
	const parts = normalized.split("/").filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0]}/${parts[1]}`;
	}
	return parts[0] ?? normalized;
}

function buildPathOverview(hints: string[]): {
	topLevel: Record<string, number>;
	notablePaths: string[];
	monorepoSignal: boolean;
} {
	const counts: Record<string, number> = {};
	for (const hint of hints) {
		const [top] = hint.split("/");
		if (!top) continue;
		counts[top] = (counts[top] ?? 0) + 1;
	}
	const notablePaths = Array.from(new Set(hints)).slice(0, 12);
	const monorepoSignal =
		("apps" in counts && "packages" in counts) || notablePaths.length >= 3;

	return {
		topLevel: counts,
		notablePaths,
		monorepoSignal,
	};
}

function buildPathOverviewFromStructure(structureSummary: any): {
	topLevel: Record<string, number>;
	notablePaths: string[];
	monorepoSignal: boolean;
} {
	const topLevel = structureSummary?.topLevel ?? {};
	const appPaths = Array.isArray(structureSummary?.appPaths)
		? structureSummary.appPaths
		: [];
	const packagePaths = Array.isArray(structureSummary?.packagePaths)
		? structureSummary.packagePaths
		: [];
	const notablePaths = [...appPaths, ...packagePaths].slice(0, 12);
	const monorepoSignal = Boolean(structureSummary?.monorepoSignal);

	return {
		topLevel,
		notablePaths,
		monorepoSignal,
	};
}

function deriveSurfaceHints(filePaths: string[]): Array<
	"product_core" | "marketing_surface" | "infra" | "docs" | "experiments" | "unknown"
> {
	if (!filePaths.length) return ["unknown"];

	const hints = new Set<
		"product_core" | "marketing_surface" | "infra" | "docs" | "experiments"
	>();

	for (const path of filePaths) {
		const normalized = path.replace(/^\.\/+/, "");
		if (normalized.startsWith("apps/webapp") || normalized.startsWith("apps/app")) {
			hints.add("product_core");
		} else if (
			normalized.startsWith("apps/website") ||
			normalized.startsWith("apps/marketing") ||
			normalized.startsWith("website/") ||
			normalized.startsWith("marketing/")
		) {
			hints.add("marketing_surface");
		} else if (
			normalized.startsWith("packages/convex") ||
			normalized.startsWith("convex/")
		) {
			hints.add("infra");
		} else if (
			normalized.startsWith("packages/ui") ||
			normalized.startsWith("packages/tailwind-config") ||
			normalized.startsWith("packages/typescript-config")
		) {
			hints.add("infra");
		} else if (normalized.startsWith("docs/") || normalized.startsWith("doc/")) {
			hints.add("docs");
		} else if (
			normalized.startsWith("experiments/") ||
			normalized.startsWith("sandbox/") ||
			normalized.startsWith("playground/")
		) {
			hints.add("experiments");
		}
	}

	if (!hints.size) return ["unknown"];
	return Array.from(hints);
}

function toSafeString(value: unknown): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	return str
		.replace(/\\x[0-9A-Fa-f]{2}/g, "")
		.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export const chatStream = action({
	args: {
		prompt: v.string(),
		threadId: v.optional(v.string()),
		organizationId: v.optional(v.id("organizations")),
		productId: v.optional(v.id("products")),
	},
	handler: async (
		ctx,
		{ prompt, threadId, organizationId, productId },
	): Promise<{
		threadId: string;
		usage: {
			provider: string;
			model: string;
			tokensIn: number;
			tokensOut: number;
			totalTokens: number;
			latencyMs: number;
			status: "success";
		};
	}> => {
		const { resolvedOrgId, resolvedProductId, userId } = await resolveAccess(
			ctx,
			organizationId,
			productId,
		);
		const aiConfig = getAgentAIConfig(AGENT_NAME);
		const tid = threadId ?? (await createThread(ctx, agentComponent));
		const start = Date.now();

		try {
			const agentCtx = {
				...ctx,
				organizationId: resolvedOrgId,
				productId: resolvedProductId,
				userId,
				aiPrompt: prompt,
				aiStartMs: start,
			};

			await helloWorldAgent.streamText(
				agentCtx,
				{ threadId: tid },
				{ prompt },
				{ saveStreamDeltas: true },
			);

		} catch (error) {
			await ctx.runMutation(internal.ai.telemetry.recordError, {
				organizationId: resolvedOrgId,
				productId: resolvedProductId,
				userId,
				useCase: USE_CASE,
				agentName: AGENT_NAME,
				threadId: tid,
				provider: aiConfig.provider,
				model: aiConfig.model,
				errorMessage:
					error instanceof Error ? error.message : "Unknown error invoking agent",
				prompt,
				metadata: SOURCE_METADATA,
			});

			throw error;
		}

		return {
			threadId: tid,
			usage: {
				provider: aiConfig.provider,
				model: aiConfig.model,
				tokensIn: 0,
				tokensOut: 0,
				totalTokens: 0,
				latencyMs: Date.now() - start,
				status: "success" as const,
			},
		};
	},
});

async function resolveAccess(
	ctx: any,
	organizationId?: Id<"organizations">,
	productId?: Id<"products">,
): Promise<{
	resolvedOrgId: Id<"organizations">;
	resolvedProductId?: Id<"products">;
	userId: Id<"users">;
}> {
	if (productId) {
		const access = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);
		return {
			resolvedOrgId: access.organizationId,
			resolvedProductId: productId,
			userId: access.userId,
		};
	}

	if (organizationId) {
		const access = await ctx.runQuery(
			internal.lib.access.assertOrgAccessInternal,
			{ organizationId },
		);
		return {
			resolvedOrgId: access.organizationId,
			resolvedProductId: undefined,
			userId: access.userId,
		};
	}

	throw new Error("organizationId or productId is required to run the agent");
}

function parseJsonSafely(text: string): any {
	const trimmed = text.trim();
	const withoutFences = trimmed.startsWith("```")
		? trimmed.replace(/^```[a-zA-Z]*\s*/, "").replace(/```$/, "").trim()
		: trimmed;
	return JSON.parse(withoutFences);
}

function hashString(value: string): string {
	let hash = 5381;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash * 33) ^ value.charCodeAt(i);
	}
	return (hash >>> 0).toString(16);
}

function getUsageTotals(result: {
	usage?: {
		inputTokens?: number;
		cachedInputTokens?: number;
		outputTokens?: number;
		totalTokens?: number;
	};
	totalUsage?: {
		inputTokens?: number;
		cachedInputTokens?: number;
		outputTokens?: number;
		totalTokens?: number;
	};
}): { tokensIn: number; tokensOut: number; totalTokens: number } {
	const usage = result.totalUsage ?? result.usage;
	const tokensIn = usage?.inputTokens ?? usage?.cachedInputTokens ?? 0;
	const tokensOut = usage?.outputTokens ?? 0;
	const totalTokens = usage?.totalTokens ?? tokensIn + tokensOut;
	return { tokensIn, tokensOut, totalTokens };
}

function buildFocusAreaSets(
	baseline: Record<string, unknown>,
	context: Record<string, unknown>,
): { all: Set<string>; keyFeatures: Set<string>; domains: Set<string> } {
	const all = new Set<string>();
	const keyFeatures = new Set<string>();
	const domains = new Set<string>();
	const addString = (set: Set<string>, value: unknown) => {
		if (typeof value !== "string") return;
		const trimmed = value.trim();
		if (trimmed) set.add(trimmed);
	};
	const addArrayStrings = (set: Set<string>, value: unknown) => {
		if (!Array.isArray(value)) return;
		value.forEach((item) => addString(set, item));
	};
	const addArrayObjects = (set: Set<string>, value: unknown) => {
		if (!Array.isArray(value)) return;
		value.forEach((item) => {
			if (!item || typeof item !== "object") return;
			const name = (item as { name?: unknown }).name;
			addString(set, name);
		});
	};

	addArrayObjects(keyFeatures, (context as { keyFeatures?: unknown }).keyFeatures);
	addArrayObjects(domains, (context as { productDomains?: unknown }).productDomains);
	addArrayObjects(all, (context as { keyFeatures?: unknown }).keyFeatures);
	addArrayObjects(all, (context as { productDomains?: unknown }).productDomains);
	return { all, keyFeatures, domains };
}

function normalizePersonas(value: unknown): Array<{ name: string; description?: string }> {
	if (!Array.isArray(value)) return [];

	return value
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const persona = item as Record<string, unknown>;
			const name =
				typeof persona.name === "string"
					? persona.name
					: typeof persona.role === "string"
						? persona.role
						: "";
			if (!name) return null;

			const description =
				typeof persona.description === "string"
					? persona.description
					: buildPersonaDescription(persona);

			return description ? { name, description } : { name };
		})
		.filter(
			(item): item is { name: string; description?: string } => item !== null,
		);
}

function buildPersonaDescription(persona: Record<string, unknown>): string | undefined {
	const parts: string[] = [];

	if (Array.isArray(persona.goals) && persona.goals.length > 0) {
		parts.push(`Goals: ${persona.goals.filter(Boolean).join("; ")}`);
	}

	if (Array.isArray(persona.painPoints) && persona.painPoints.length > 0) {
		parts.push(`Pain points: ${persona.painPoints.filter(Boolean).join("; ")}`);
	}

	if (typeof persona.preferredTone === "string" && persona.preferredTone.length > 0) {
		parts.push(`Preferred tone: ${persona.preferredTone}`);
	}

	if (!parts.length) return undefined;
	return parts.join(" ");
}

type GithubRepo = {
	id: number;
	name: string;
	fullName: string;
	owner: string;
	defaultBranch?: string;
};

type GithubTreeEntry = {
	path: string;
	type: "blob" | "tree";
	sha: string;
};

async function fetchInstallationRepositories(token: string): Promise<GithubRepo[]> {
	const repositories: GithubRepo[] = [];
	let page = 1;

	while (true) {
		const response = await fetch(
			`https://api.github.com/installation/repositories?per_page=100&page=${page}`,
			{
				headers: githubHeaders(token),
			},
		);

		if (!response.ok) {
			throw new Error("Failed to list installation repositories");
		}

		const json = (await response.json()) as {
			repositories: Array<{
				id: number;
				name: string;
				full_name: string;
				owner: { login: string };
				default_branch?: string;
			}>;
		};

		const batch = json.repositories.map((repo) => ({
			id: repo.id,
			name: repo.name,
			fullName: repo.full_name,
			owner: repo.owner.login,
			defaultBranch: repo.default_branch,
		}));
		repositories.push(...batch);

		if (batch.length < 100) {
			break;
		}
		page += 1;
	}

	return repositories;
}

async function fetchRepoDefaultBranch(
	token: string,
	repo: GithubRepo,
): Promise<string | undefined> {
	const response = await fetch(
		`https://api.github.com/repos/${repo.fullName}`,
		{
			headers: githubHeaders(token),
		},
	);

	if (!response.ok) {
		return undefined;
	}

	const json = (await response.json()) as { default_branch?: string };
	return json.default_branch;
}

async function fetchRepoTree(
	token: string,
	repo: GithubRepo,
	branch: string,
): Promise<GithubTreeEntry[] | null> {
	const response = await fetch(
		`https://api.github.com/repos/${repo.fullName}/git/trees/${encodeURIComponent(
			branch,
		)}?recursive=1`,
		{
			headers: githubHeaders(token),
		},
	);

	if (!response.ok) {
		return null;
	}

	const json = (await response.json()) as {
		tree?: GithubTreeEntry[];
		truncated?: boolean;
	};

	return json.tree ?? null;
}

async function fetchRepoBlob(
	token: string,
	repo: GithubRepo,
	sha: string,
): Promise<string | null> {
	const response = await fetch(
		`https://api.github.com/repos/${repo.fullName}/git/blobs/${sha}`,
		{
			headers: githubHeaders(token),
		},
	);

	if (!response.ok) {
		return null;
	}

	const json = (await response.json()) as {
		content?: string;
		encoding?: string;
	};

	if (!json.content) return null;
	if (json.encoding !== "base64") return null;
	return decodeBase64(json.content);
}

function githubHeaders(token: string) {
	return {
		Accept: "application/vnd.github+json",
		Authorization: `token ${token}`,
		"User-Agent": "hikai-connectors",
	};
}

function decodeBase64(value: string): string | null {
	if (typeof globalThis.atob === "function") {
		const binary = globalThis.atob(value);
		const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
		return new TextDecoder("utf-8").decode(bytes);
	}

	return null;
}
