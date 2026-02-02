import { createThread, type AgentComponent } from "@convex-dev/agent";
import { v } from "convex/values";
import { action } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
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
import { classifySurface } from "./taxonomy/surface_classifier";
import { extractFeatures } from "./taxonomy/feature_extractor";
import { buildProductTaxonomy } from "./taxonomy/orchestrator";
import type { SurfaceSignalResult } from "./surface_signal_mapper";
import {
	buildProductContextInputs,
	getBusinessDataModel,
	getRepoFolderTopology,
	getUiSitemap,
	getUserFlows,
} from "./contextTools";
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
const FEATURE_MAP_USE_CASE = "feature_map_generation";
const FEATURE_MAP_AGENT_NAME = "Feature Map Agent";
const SURFACE_SIGNAL_USE_CASE = "surface_signal_mapping";
const SURFACE_SIGNAL_AGENT_NAME = "Surface Signal Mapper Agent";

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
		const currentSnapshot = product.currentProductSnapshot
			? await ctx.runQuery(
					internal.agents.productContextData.getContextSnapshotById,
					{ snapshotId: product.currentProductSnapshot },
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
		await recordStep("Refreshing source context structure", "info");
		await refreshSourceContextsForProduct(ctx, productId);

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
		const baselineSource = fetchedProduct.baseline ?? {};
		const baseline = {
			productName: fetchedProduct.name,
		description: baselineSource.description ?? "",
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
				featureMap: undefined,
				releaseCadence: fetchedProduct.releaseCadence ?? undefined,
				languagePreference,
				timestamp,
			});

			await recordStep("Generating feature map", "info");
			try {
				const featureMapResult = await ctx.runAction(
					api.agents.actions.refreshFeatureMap,
					{
						productId,
						debugUi,
					},
				);
				if (featureMapResult?.decisionSummary) {
					await recordStep(
						"Feature map decisions",
						"info",
						featureMapResult.decisionSummary as Record<string, unknown>,
					);
				}
			} catch {
				await recordStep("Feature map generation failed", "warn");
			}

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

export const refreshFeatureMap = action({
	args: {
		productId: v.id("products"),
		debugUi: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ productId, debugUi },
	): Promise<{
		featureMap: Record<string, unknown> | null;
		updated: boolean;
		decisionSummary?: Record<string, unknown>;
	}> => {
		const aiConfig = getAgentAIConfig(FEATURE_MAP_AGENT_NAME);
		const { organizationId, userId, product } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);

		const currentSnapshot = product.currentProductSnapshot
			? await ctx.runQuery(
					internal.agents.productContextData.getContextSnapshotById,
					{ snapshotId: product.currentProductSnapshot },
				)
			: null;
		if (!currentSnapshot) {
			return { featureMap: null, updated: false };
		}

		const previousFeatureMap =
			(currentSnapshot as { featureMap?: Record<string, unknown> }).featureMap ??
			null;
		const baseline = currentSnapshot.baseline ?? product.baseline ?? {};
		const productContext = currentSnapshot.context ?? {};
		const languagePreference = product.languagePreference ?? "en";

		const sourceContexts = await ctx.runQuery(
			internal.agents.sourceContextData.listSourceContexts,
			{ productId },
		);
		const sources = sourceContexts.map((source) => ({
			sourceId: source.sourceId,
			classification: source.classification,
			structureSummary: source.structure?.summary ?? source.structure ?? null,
		}));

		const promptPayload = JSON.stringify({
			languagePreference,
			baseline,
			productContext,
			previousFeatureMap,
			sources,
		});

		try {
			const parsed = await extractFeatures({
				ctx,
				organizationId,
				productId,
				userId,
				input: JSON.parse(promptPayload),
				debugPrompt: debugUi,
			});

			const parsedResult = parsed as {
				features?: Array<Record<string, unknown>>;
				domains?: Array<Record<string, unknown>>;
				domainMap?: Record<string, unknown>;
				decisionSummary?: Record<string, unknown>;
				generatedAt?: number;
				sourcesUsed?: string[];
			};
			if (!parsedResult || !Array.isArray(parsedResult.features)) {
				console.warn("Feature Map Agent returned invalid JSON; keeping previous map.");
				return {
					featureMap: previousFeatureMap,
					updated: false,
				};
			}

			const now = Date.now();
			let normalized = normalizeFeatureMap(parsedResult, previousFeatureMap, now);
			normalized = applyFeatureMapGuardrails(
				normalized,
				parsedResult.decisionSummary ?? {},
				languagePreference,
			);

			const nextHash = hashString(JSON.stringify(normalized));
			const previousHash = previousFeatureMap
				? hashString(JSON.stringify(previousFeatureMap))
				: null;
			const updated = nextHash !== previousHash;

			if (updated) {
				await ctx.runMutation(
					internal.agents.productContextData.updateFeatureMapForSnapshot,
					{
						snapshotId: currentSnapshot._id,
						featureMap: normalized,
					},
				);
			}

			return {
				featureMap: normalized,
				updated,
				decisionSummary: normalized.decisionSummary as Record<string, unknown>,
			};
		} catch (error) {
			await ctx.runMutation(internal.ai.telemetry.recordError, {
				organizationId,
				productId,
				userId,
				useCase: FEATURE_MAP_USE_CASE,
				agentName: FEATURE_MAP_AGENT_NAME,
				provider: aiConfig.provider,
				model: aiConfig.model,
				errorMessage:
					error instanceof Error
						? error.message
						: "Unknown error invoking Feature Map Agent",
				prompt: debugUi ? promptPayload : undefined,
				metadata: { source: "feature-map" },
			});
			throw error;
		}
	},
});

export const runTaxonomyOrchestrator = action({
	args: {
		productId: v.id("products"),
		debug: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ productId, debug },
	): Promise<{
		surfaceSummary: Record<string, unknown>;
		domainMap: Record<string, unknown> | null;
		featureMap: Record<string, unknown> | null;
		rawFeatureResponse?: string | null;
		featureMapInvalid?: boolean;
	}> => {
		const { organizationId, userId } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);

		const result = await buildProductTaxonomy({
			ctx,
			productId,
			organizationId,
			userId,
			options: debug
				? {
						sampling: { temperature: 0 },
						maxTokens: { domainMapper: 3000, featureExtractor: 6000 },
						debug: true,
					}
				: undefined,
		});

		return {
			surfaceSummary: result.surfaceSummary,
			domainMap: result.domainMap as Record<string, unknown> | null,
			featureMap: result.featureMap as Record<string, unknown> | null,
			rawFeatureResponse: (() => {
				const rawResponse = (result.featureMap as { rawResponse?: unknown } | null)
					?.rawResponse;
				return typeof rawResponse === "string" ? rawResponse : null;
			})(),
			featureMapInvalid:
				(result.featureMap as { invalidOutput?: boolean } | null)?.invalidOutput ??
				false,
		};
	},
});

export const runTaxonomyDeterminismCheck = action({
	args: {
		productId: v.id("products"),
		runs: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ productId, runs },
	): Promise<{
		runs: number;
		featureSimilarity: number;
		domainSimilarity: number;
		errors: string[];
		runDurationsMs: number[];
		tokenUsage: {
			tokensIn: number;
			tokensOut: number;
			totalTokens: number;
			costUsd: number;
		};
	}> => {
		const { organizationId, userId } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);
		const totalRuns = Math.max(1, Math.min(runs ?? 5, 10));
		const outputs: Array<{
			domains: string[];
			features: string[];
		}> = [];
		const errors: string[] = [];
		const runDurationsMs: number[] = [];
		const startWindow = Date.now();

		for (let i = 0; i < totalRuns; i += 1) {
			const start = Date.now();
			const result = await buildProductTaxonomy({
				ctx,
				productId,
				organizationId,
				userId,
				options: {
					sampling: { temperature: 0 },
					maxTokens: { domainMapper: 3000, featureExtractor: 6000 },
				},
			});
			runDurationsMs.push(Date.now() - start);

			if (!result.domainMap) {
				errors.push(`run-${i + 1}: domainMap null`);
			}
			if (!result.featureMap) {
				errors.push(`run-${i + 1}: featureMap null`);
			}

			const domainNames = Array.isArray(result.domainMap?.domains)
				? result.domainMap.domains
						.map((domain) =>
							typeof domain?.name === "string" ? domain.name : null,
						)
						.filter((name): name is string => Boolean(name))
				: [];
			const featureNames = Array.isArray(result.featureMap?.features)
				? result.featureMap.features
						.map((feature) => {
							if (typeof feature?.id === "string") return feature.id;
							if (typeof feature?.slug === "string") return feature.slug;
							if (typeof feature?.name === "string") return feature.name;
							return null;
						})
						.filter((name): name is string => Boolean(name))
				: [];

			outputs.push({
				domains: uniqueSorted(domainNames),
				features: uniqueSorted(featureNames),
			});
		}

		const [baseline] = outputs;
		const domainSimilarity = averageSimilarity(
			outputs.map((output) => output.domains),
			baseline?.domains ?? [],
		);
		const featureSimilarity = averageSimilarity(
			outputs.map((output) => output.features),
			baseline?.features ?? [],
		);

		const usageSummary = await ctx.runQuery(api.lib.aiUsage.getProductUsage, {
			productId,
			startDate: startWindow,
			endDate: Date.now(),
		});
		const tokenUsage = {
			tokensIn: usageSummary.totals.tokensIn,
			tokensOut: usageSummary.totals.tokensOut,
			totalTokens: usageSummary.totals.totalTokens,
			costUsd: usageSummary.totals.estimatedCostUsd,
		};

		return {
			runs: totalRuns,
			featureSimilarity,
			domainSimilarity,
			errors,
			runDurationsMs,
			tokenUsage,
		};
	},
});

function uniqueSorted(items: string[]): string[] {
	return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));
}

function averageSimilarity(
	runs: string[][],
	baseline: string[],
): number {
	if (!baseline.length) return 0;
	const baselineSet = new Set(baseline);
	const scores = runs.map((run) => jaccardSimilarity(baselineSet, run));
	const total = scores.reduce((sum, value) => sum + value, 0);
	return Number((total / scores.length).toFixed(4));
}

function jaccardSimilarity(baseline: Set<string>, sample: string[]): number {
	const sampleSet = new Set(sample);
	const intersection = Array.from(sampleSet).filter((value) =>
		baseline.has(value),
	);
	const union = new Set([...baseline, ...sampleSet]);
	if (union.size === 0) return 1;
	return intersection.length / union.size;
}

function normalizeNewCapabilities(
	items: Array<{
		slug?: string;
		name?: string;
		domain?: string;
		description?: string;
		visibility?: "public" | "internal";
		featureSlugs?: string[];
	}> | undefined,
	allowedDomains: Set<string>,
	existingSlugs: Set<string>,
) {
	if (!Array.isArray(items)) return [];
	return items
		.map((item) => {
			const name = typeof item.name === "string" ? item.name.trim() : "";
			if (!name) return null;
			const slugValue =
				typeof item.slug === "string" && item.slug.trim()
					? slugifyFeatureId(item.slug.trim())
					: slugifyFeatureId(name);
			if (!slugValue || existingSlugs.has(slugValue)) return null;
			const domain =
				typeof item.domain === "string" && item.domain.trim()
					? normalizeDomainValue(item.domain.trim(), allowedDomains)
					: undefined;
			const featureSlugs = Array.isArray(item.featureSlugs)
				? uniqueSorted(
						item.featureSlugs.filter((slug) => typeof slug === "string"),
					)
				: [];
			return {
				slug: slugValue,
				name,
				domain,
				description:
					typeof item.description === "string" && item.description.trim()
						? item.description.trim()
						: undefined,
				visibility: item.visibility === "internal" ? "internal" : "public",
				featureSlugs,
			};
		})
		.filter(
			(item): item is {
				slug: string;
				name: string;
				domain?: string;
				description?: string;
				visibility: "public" | "internal";
				featureSlugs: string[];
			} => item !== null,
		);
}

function normalizeDomainValue(
	value: string | undefined,
	allowedDomains: Set<string>,
): string | undefined {
	const trimmed = value?.trim();
	if (!trimmed) return undefined;
	const key = trimmed.toLowerCase();
	return allowedDomains.has(key) ? trimmed : undefined;
}

function normalizeBucket(
	bucket: {
		bucketId?: string;
		bucketStartAt?: number;
		bucketEndAt?: number;
		cadence?: string;
		title?: string;
		narrative?: string;
		domains?: string[];
	},
	normalizeDomain: (value: string | undefined) => string | undefined,
) {
	const bucketId = typeof bucket.bucketId === "string" ? bucket.bucketId : "";
	const bucketStartAt =
		typeof bucket.bucketStartAt === "number" ? bucket.bucketStartAt : 0;
	const bucketEndAt =
		typeof bucket.bucketEndAt === "number" ? bucket.bucketEndAt : 0;
	const cadence = typeof bucket.cadence === "string" ? bucket.cadence : "unknown";
	const title = typeof bucket.title === "string" ? bucket.title : "Update";
	const narrative =
		typeof bucket.narrative === "string" && bucket.narrative.trim()
			? bucket.narrative.trim()
			: undefined;
	const domains = Array.isArray(bucket.domains)
		? uniqueSorted(
				bucket.domains
					.map((entry) =>
						typeof entry === "string" ? normalizeDomain(entry) : undefined,
					)
					.filter((entry): entry is string => Boolean(entry)),
			)
		: undefined;

	return { bucketId, bucketStartAt, bucketEndAt, cadence, title, narrative, domains };
}

function normalizeEvents(
	items: Array<{
		capabilitySlug?: string | null;
		domain?: string;
		type?: string;
		title?: string;
		summary?: string;
		visibility?: "public" | "internal";
		relevance?: number;
		rawEventIds?: string[];
	}>,
	normalizeDomain: (value: string | undefined) => string | undefined,
	existingCapabilities: Set<string>,
	newCapabilitySlugs: Set<string>,
) {
	return items
		.map((item) => {
			const title =
				typeof item.title === "string" ? item.title.trim() : "";
			if (!title) return null;
			const type =
				item.type === "feature" ||
				item.type === "fix" ||
				item.type === "improvement" ||
				item.type === "work" ||
				item.type === "other"
					? item.type === "other"
						? "work"
						: item.type
					: "work";
			const capabilitySlugRaw =
				typeof item.capabilitySlug === "string"
					? slugifyFeatureId(item.capabilitySlug)
					: null;
			const capabilitySlug =
				capabilitySlugRaw &&
				(existingCapabilities.has(capabilitySlugRaw) ||
					newCapabilitySlugs.has(capabilitySlugRaw))
					? capabilitySlugRaw
					: null;
			const domain =
				typeof item.domain === "string"
					? normalizeDomain(item.domain)
					: undefined;
			const rawEventIds = Array.isArray(item.rawEventIds)
				? item.rawEventIds.filter((id) => typeof id === "string")
				: [];
			if (rawEventIds.length === 0) return null;
			return {
				capabilitySlug,
				domain,
				type,
				title,
				summary:
					typeof item.summary === "string" && item.summary.trim()
						? item.summary.trim()
						: undefined,
				visibility: item.visibility === "internal" ? "internal" : "public",
				relevance: typeof item.relevance === "number" ? item.relevance : undefined,
				rawEventIds,
			};
		})
		.filter(
			(item): item is {
				capabilitySlug?: string | null;
				domain?: string;
				type: "feature" | "fix" | "improvement" | "work";
				title: string;
				summary?: string;
				visibility?: "public" | "internal";
				relevance?: number;
				rawEventIds: string[];
			} => item !== null,
		);
}

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
		bucket: {
			bucketId: string;
			bucketStartAt: number;
			bucketEndAt: number;
			cadence: string;
			title: string;
			narrative?: string;
			domains?: string[];
		};
		events: Array<{
			capabilitySlug?: string | null;
			domain?: string;
			type: "feature" | "fix" | "improvement" | "work";
			title: string;
			summary?: string;
			visibility?: "public" | "internal";
			relevance?: number;
			rawEventIds: string[];
		}>;
		newCapabilities?: Array<{
			slug: string;
			name: string;
			domain?: string;
			description?: string;
			visibility?: "public" | "internal";
			featureSlugs?: string[];
		}>;
		newDomains?: Array<{ name: string; purpose?: string }>;
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

		const currentSnapshot = product.currentProductSnapshot
			? await ctx.runQuery(
					internal.agents.productContextData.getContextSnapshotById,
					{ snapshotId: product.currentProductSnapshot },
				)
			: null;

		const baseline = currentSnapshot?.baseline ?? product.baseline ?? {};
		const context = currentSnapshot?.context ?? {};
		const capabilities = await ctx.runQuery(
			internal.products.capabilities.listProductCapabilitiesInternal,
			{ productId },
		);
		const repoDomains = extractRepoDomains(
			(currentSnapshot as { contextDetail?: unknown })?.contextDetail,
		);
		const releaseCadence =
			currentSnapshot?.releaseCadence ?? product.releaseCadence ?? "unknown";
		const languagePreference = product.languagePreference ?? "en";

		const rawEventsWithDomain = rawEvents.map((event) => {
			const domainHint = deriveDomainHint(
				event.filePaths ?? [],
				event.summary,
				repoDomains,
			);
			return {
				...event,
				domainHint,
			};
		});

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
			capabilities: capabilities.map((capability) => ({
				slug: capability.slug,
				name: capability.name,
				domain: capability.domain,
				visibility: capability.visibility,
				featureSlugs: capability.featureSlugs,
			})),
			repoDomains,
			repoContexts: repoContextSummary,
			rawEvents: rawEventsWithDomain,
		};
		const lastEventAt =
			typeof bucket?.bucketStartAt === "number" ? bucket.bucketStartAt : Date.now();

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
				bucket?: {
					bucketId?: string;
					bucketStartAt?: number;
					bucketEndAt?: number;
					cadence?: string;
					title?: string;
					narrative?: string;
					domains?: string[];
				};
				events?: Array<{
					capabilitySlug?: string | null;
					domain?: string;
					type?: string;
					title?: string;
					summary?: string;
					visibility?: "public" | "internal";
					relevance?: number;
					rawEventIds?: string[];
				}>;
				newCapabilities?: Array<{
					slug?: string;
					name?: string;
					domain?: string;
					description?: string;
					visibility?: "public" | "internal";
					featureSlugs?: string[];
				}>;
				newDomains?: Array<{ name?: string; purpose?: string }>;
			};
			if (
				!parsed ||
				typeof parsed !== "object" ||
				!parsed.bucket ||
				!Array.isArray(parsed.events)
			) {
				throw new Error(
					"Invalid JSON response from Timeline Context Interpreter Agent",
				);
			}
			const allowedDomains = new Set(
				repoDomains.map((domain) => domain.name.toLowerCase()),
			);
			const existingCapabilities = new Set(
				capabilities.map((capability) => capability.slug),
			);
			const normalizedNewCapabilities = normalizeNewCapabilities(
				parsed.newCapabilities,
				allowedDomains,
				existingCapabilities,
			);
			const newCapabilitySlugs = new Set(
				normalizedNewCapabilities.map((capability) => capability.slug),
			);
			const normalizeDomain = (value: string | undefined) => {
				const trimmed = value?.trim();
				if (!trimmed) return undefined;
				const key = trimmed.toLowerCase();
				return allowedDomains.has(key) ? trimmed : undefined;
			};
			const normalizedBucket = normalizeBucket(
				parsed.bucket,
				normalizeDomain,
			);
			const normalizedEvents = normalizeEvents(
				parsed.events,
				normalizeDomain,
				existingCapabilities,
				newCapabilitySlugs,
			);

			if (normalizedNewCapabilities.length) {
				await ctx.runMutation(internal.products.capabilities.upsertProductCapabilities, {
					productId,
					capabilities: normalizedNewCapabilities.map((capability) => ({
						...capability,
						featureSlugs: capability.featureSlugs ?? [],
					})),
				});
			}

			const telemetryConfig = getAgentTelemetryConfig(
				TIMELINE_INTERPRETER_AGENT_NAME,
			);
			let inferenceLogId: Id<"aiInferenceLogs"> | undefined;
			if (telemetryConfig.persistInferenceLogs) {
				const usage = getUsageTotals(result);
				const bucketIds = normalizedBucket?.bucketId
					? [normalizedBucket.bucketId]
					: [];

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

			return {
				threadId: tid,
				bucket: normalizedBucket,
				events: normalizedEvents,
				newCapabilities: normalizedNewCapabilities,
				newDomains: parsed.newDomains ?? [],
				inferenceLogId,
			};
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

			const promptInput = {
				product: {
					name: product.name,
					productType: product.baseline?.productType ?? "",
					valueProposition: product.baseline?.valueProposition ?? "",
					targetMarket: product.baseline?.targetMarket ?? "",
					audiences: product.baseline?.audiences ?? [],
					stage: product.baseline?.stage ?? "",
				},
				repo: {
					sourceType,
					sourceId,
					samples: entry.summaries,
					pathOverview,
					structureSummary,
				},
			};
			const promptPayload = JSON.stringify(promptInput);
			const parsed = await classifySurface({
				ctx,
				organizationId,
				productId,
				userId,
				input: promptInput,
			});
			if (!parsed?.classification) continue;

			const derivedClassification = deriveClassificationFromStructure(
				structureSummary,
			);
			const resolvedClassification = derivedClassification ?? parsed.classification;

			await ctx.runMutation(internal.agents.sourceContextData.upsertSourceContext, {
				productId,
				sourceType,
				sourceId,
				classification: resolvedClassification,
				notes: parsed.notes,
				surfaceBuckets: parsed.surfaceBuckets,
				structure: structureSummary
					? { summary: structureSummary, updatedAt: now, source: "github_tree" }
					: existing?.structure,
			});
			classified += 1;
		}

		return { classified };
	},
});

export const regenerateSurfaceSignals = action({
	args: {
		productId: v.id("products"),
		agentRunId: v.optional(v.id("agentRuns")),
	},
	handler: async (
		ctx,
		{ productId, agentRunId },
	): Promise<{
		runId?: Id<"agentRuns">;
		sources: number;
	}> => {
		const { organizationId, userId } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);
		const product = await ctx.runQuery(
			internal.agents.productContextData.getProductWithContext,
			{ productId },
		);

		let runId = agentRunId;
		const runSteps: Array<{
			step: string;
			status: "info" | "success" | "warn" | "error";
			timestamp: number;
			metadata?: Record<string, unknown>;
		}> = [];
		if (!runId) {
			try {
				const created = await ctx.runMutation(api.agents.agentRuns.createAgentRun, {
					productId,
					useCase: SURFACE_SIGNAL_USE_CASE,
					agentName: SURFACE_SIGNAL_AGENT_NAME,
				});
				runId = created.runId;
			} catch {
				runId = undefined;
			}
		}

		const recordStep = async (
			step: string,
			status: "info" | "success" | "warn" | "error",
			metadata?: Record<string, unknown>,
		) => {
			const entry = { step, status, timestamp: Date.now(), metadata };
			runSteps.push(entry);
			if (!runId) return;
			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step,
				status,
				timestamp: entry.timestamp,
				metadata,
			});
		};

		await recordStep("Collecting sources", "info");

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
				sourceLabel: string;
				summaries: Array<string>;
				pathHints: Set<string>;
				connectionId?: Id<"connections">;
			}
		>();

		const repoMetadata = await ctx.runQuery(
			internal.agents.productContextData.getRepositoryMetadata,
			{ productId },
		);
		await recordStep(
			`github: found ${repoMetadata.length} active connections`,
			"info",
		);

		for (const metadata of repoMetadata) {
			const { connectionId } = metadata;
			try {
				await recordStep(`github: resolving token for ${connectionId}`, "info");
				const tokenResult = await ctx.runAction(
					internal.connectors.github.getInstallationTokenForConnection,
					{ productId, connectionId },
				);
				const repositories = await fetchInstallationRepositories(
					tokenResult.token,
				);
				await recordStep(
					`github: connection ${connectionId} has ${repositories.length} repos`,
					"info",
				);

				for (const repo of repositories) {
					if (repoSamples.has(repo.fullName)) continue;
					repoSamples.set(repo.fullName, {
						sourceType: "github",
						sourceLabel: repo.fullName,
						summaries: [],
						pathHints: new Set<string>(),
						connectionId,
					});
				}
			} catch (error) {
				await recordStep(
					`github: connection ${connectionId} error ${
						error instanceof Error ? error.message : "unknown error"
					}`,
					"warn",
				);
			}
		}

		const sourceInputs: Array<{
			sourceType: string;
			sourceId: string;
			sourceLabel: string;
			structureSummary: unknown;
			pathOverview: unknown;
			samples: string[];
		}> = [];

		for (const [sourceId, entry] of repoSamples.entries()) {
			await recordStep(`Fetching structure for ${sourceId}`, "info");
			let structureSummary: unknown = null;
			if (entry.connectionId) {
				try {
					structureSummary = await ctx.runAction(
						internal.connectors.github.fetchRepoStructureSummary,
						{
							productId,
							connectionId: entry.connectionId,
							repoFullName: sourceId,
						},
					);
				} catch {
					structureSummary = null;
				}
			}
			const pathOverview = structureSummary
				? buildPathOverviewFromStructure(structureSummary)
				: buildPathOverview(Array.from(entry.pathHints));

			sourceInputs.push({
				sourceType: entry.sourceType,
				sourceId,
				sourceLabel: entry.sourceLabel,
				structureSummary,
				pathOverview,
				samples: entry.summaries,
			});
		}

		sourceInputs.sort((a, b) => a.sourceId.localeCompare(b.sourceId));

		if (sourceInputs.length === 0) {
			await recordStep("No sources available", "warn");
			const generatedAt = new Date().toISOString();
			const emptySources: Array<{
				sourceType: string;
				sourceId: string;
				sourceLabel: string;
				structureSummary: unknown;
				surfaceSignals: [];
			}> = [];
			const outputs = buildProductContextInputs(
				productId,
				emptySources,
				generatedAt,
			);
			const { uiSitemap, userFlows, businessDataModel, repoFolderTopology } =
				outputs;
			const emptySurfaceRawFileId = await storeRawOutput(ctx, { sources: [] });
			const contextInputsRawFileId = await storeRawOutput(ctx, {
				uiSitemap,
				userFlows,
				businessDataModel,
				repoFolderTopology,
			});
			await ctx.runMutation(
				internal.agents.surfaceSignalsData.insertSurfaceSignalRun,
				{
					productId,
					createdBy: userId,
					createdAt: Date.now(),
					agentRunId: runId,
					rawOutputFileId: emptySurfaceRawFileId,
					steps: runSteps,
					sources: [],
				},
			);
			await ctx.runMutation(internal.agents.contextInputsData.insertContextInputRun, {
				productId,
				createdBy: userId,
				createdAt: Date.now(),
				agentRunId: runId,
				rawOutputFileId: contextInputsRawFileId,
				steps: runSteps,
				summary: summarizeContextInputs({
					uiSitemap,
					userFlows,
					businessDataModel,
					repoFolderTopology,
				}),
			});
			await recordStep("Surface mapping completed", "success");
			if (runId) {
				await ctx.runMutation(internal.agents.agentRuns.finishRun, {
					productId,
					runId,
					status: "success",
				});
			}
			return { runId, sources: 0 };
		}

		await recordStep("Mapping surfaces (repo structure)", "info");
		const mapping = buildDeterministicSurfaceSignals(sourceInputs);

		if (!mapping) {
			await recordStep("Surface mapping failed", "error");
			if (runId) {
				await ctx.runMutation(internal.agents.agentRuns.finishRun, {
					productId,
					runId,
					status: "error",
					errorMessage: "Surface mapping failed",
				});
			}
			return { runId, sources: 0 };
		}

		await recordStep("Persisting surface signals", "info");
		for (const source of mapping.sources) {
			const key = `${source.sourceType}:${source.sourceId}`;
			const existing = existingByKey.get(key);
			await ctx.runMutation(internal.agents.sourceContextData.upsertSourceContext, {
				productId,
				sourceType: source.sourceType,
				sourceId: source.sourceId,
				sourceLabel: source.sourceLabel,
				classification: existing?.classification ?? "unknown",
				surfaceSignals: source.surfaces,
				notes: existing?.notes,
				structure: existing?.structure,
			});
		}

		await recordStep("Building UI sitemap", "info");
		const toolSources = sourceInputs.map((source) => ({
			...source,
			surfaceSignals:
				mapping.sources.find(
					(item) =>
						item.sourceType === source.sourceType && item.sourceId === source.sourceId,
				)?.surfaces ?? [],
		}));
		const uiSitemap = getUiSitemap(productId, toolSources);

		await recordStep("Building user flows", "info");
		const userFlows = getUserFlows(productId, uiSitemap, toolSources);

		await recordStep("Building business data model", "info");
		const businessDataModel = getBusinessDataModel(productId, toolSources);

		await recordStep("Building repo topology", "info");
		const repoFolderTopology = getRepoFolderTopology(productId, toolSources);

		const contextInputsRawFileId = await storeRawOutput(ctx, {
			uiSitemap,
			userFlows,
			businessDataModel,
			repoFolderTopology,
		});
		const surfaceSignalsRawFileId = await storeRawOutput(ctx, {
			surfaces: mapping,
		});

		await ctx.runMutation(internal.agents.contextInputsData.insertContextInputRun, {
			productId,
			createdBy: userId,
			createdAt: Date.now(),
			agentRunId: runId,
			rawOutputFileId: contextInputsRawFileId,
			steps: runSteps,
			summary: summarizeContextInputs({
				uiSitemap,
				userFlows,
				businessDataModel,
				repoFolderTopology,
			}),
		});

		await ctx.runMutation(internal.agents.surfaceSignalsData.insertSurfaceSignalRun, {
			productId,
			createdBy: userId,
			createdAt: Date.now(),
			agentRunId: runId,
			rawOutputFileId: surfaceSignalsRawFileId,
			steps: runSteps,
			sources: mapping.sources,
		});

		await recordStep("Context inputs completed", "success");
		if (runId) {
			await ctx.runMutation(internal.agents.agentRuns.finishRun, {
				productId,
				runId,
				status: "success",
			});
		}

		return { runId, sources: mapping.sources.length };
	},
});

type SurfaceSignalSurface =
	| "management"
	| "design"
	| "product_front"
	| "platform"
	| "marketing"
	| "admin"
	| "docs";

const SURFACE_SIGNAL_ORDER: SurfaceSignalSurface[] = [
	"management",
	"design",
	"product_front",
	"platform",
	"marketing",
	"admin",
	"docs",
];

function buildDeterministicSurfaceSignals(
	sources: Array<{
		sourceType: string;
		sourceId: string;
		sourceLabel: string;
		structureSummary: unknown;
		pathOverview: unknown;
		samples: string[];
	}>,
	): SurfaceSignalResult {
	return {
		sources: sources.map((source) => {
			const buckets = buildSurfaceBucketsFromStructure(source.structureSummary);
			const surfaces =
				buckets.length > 0
					? buckets
					: [
							{
								surface: "product_front" as const,
								bucketId: "repo",
							},
						];
			return {
				sourceType: source.sourceType,
				sourceId: source.sourceId,
				sourceLabel: source.sourceLabel,
				surfaces,
			};
		}),
	};
}

function summarizeContextInputs(inputs: {
	uiSitemap: { items?: unknown[] };
	userFlows: { flows?: unknown[] };
	businessDataModel: { entities?: unknown[]; relationships?: unknown[] };
	repoFolderTopology: { repos?: unknown[] };
}) {
	return {
		uiSitemapCount: inputs.uiSitemap.items?.length ?? 0,
		userFlowsCount: inputs.userFlows.flows?.length ?? 0,
		businessEntityCount: inputs.businessDataModel.entities?.length ?? 0,
		businessRelationshipCount: inputs.businessDataModel.relationships?.length ?? 0,
		repoCount: inputs.repoFolderTopology.repos?.length ?? 0,
	};
}

async function storeRawOutput(ctx: ActionCtx, payload: unknown): Promise<Id<"_storage">> {
	const raw = JSON.stringify(payload, null, 2);
	const blob = new Blob([raw], { type: "application/json" });
	return ctx.storage.store(blob);
}

function buildSurfaceBucketsFromStructure(
	structureSummary: unknown,
): Array<{ surface: SurfaceSignalSurface; bucketId: string; evidence?: string[] }> {
	if (!structureSummary || typeof structureSummary !== "object") return [];
	const summary = structureSummary as {
		appPaths?: string[];
		packagePaths?: string[];
		docPaths?: string[];
		routePaths?: string[];
		componentPaths?: string[];
		surfaceMap?: { buckets?: Array<{ samplePaths?: string[] }> };
	};

	const candidates = new Set<string>();
	const addPaths = (paths?: string[]) => {
		if (!Array.isArray(paths)) return;
		for (const path of paths) {
			if (typeof path === "string" && path.trim().length > 0) {
				candidates.add(path);
			}
		}
	};

	addPaths(summary.appPaths);
	addPaths(summary.packagePaths);
	addPaths(summary.docPaths);
	addPaths(summary.routePaths);
	addPaths(summary.componentPaths);
	if (summary.surfaceMap?.buckets) {
		for (const bucket of summary.surfaceMap.buckets) {
			addPaths(bucket.samplePaths);
		}
	}

	const buckets = new Map<
		SurfaceSignalSurface,
		Map<string, Set<string>>
	>();

	for (const path of candidates) {
		if (isIgnoredSurfacePath(path)) continue;
		const surface = classifySignalSurfaceFromPath(path);
		const bucketId = deriveBucketIdFromPath(path);
		if (!surface || !bucketId) continue;
		if (!buckets.has(surface)) {
			buckets.set(surface, new Map());
		}
		const surfaceBuckets = buckets.get(surface)!;
		if (!surfaceBuckets.has(bucketId)) {
			surfaceBuckets.set(bucketId, new Set());
		}
		const evidence = surfaceBuckets.get(bucketId)!;
		if (evidence.size < 3) {
			evidence.add(path);
		}
	}

	const results: Array<{
		surface: SurfaceSignalSurface;
		bucketId: string;
		evidence?: string[];
	}> = [];

	for (const surface of SURFACE_SIGNAL_ORDER) {
		const surfaceBuckets = buckets.get(surface);
		if (!surfaceBuckets) continue;
		const sortedBuckets = Array.from(surfaceBuckets.entries())
			.sort(
				(a, b) =>
					b[1].size - a[1].size || a[0].localeCompare(b[0]),
			)
			.slice(0, 8);
		for (const [bucketId, evidence] of sortedBuckets) {
			results.push({
				surface,
				bucketId,
				evidence: Array.from(evidence),
			});
		}
	}

	return results;
}

function classifySignalSurfaceFromPath(path: string): SurfaceSignalSurface | null {
	const normalized = path.replace(/^\.\/+/, "").toLowerCase();
	const segments = normalized.split("/").filter(Boolean);
	const hasToken = (tokens: string[]) =>
		segments.some((segment) => tokens.includes(segment));

	const designTokens = ["design", "ux", "ui", "wireframes", "figma"];
	const managementTokens = [
		"roadmap",
		"strategy",
		"requirements",
		"prd",
		"spec",
		"planning",
	];
	const marketingTokens = ["marketing", "website", "landing", "blog", "brand"];
	const adminTokens = ["admin", "backoffice", "back-office", "console"];
	const platformTokens = [
		"platform",
		"backend",
		"server",
		"api",
		"core",
		"services",
		"infra",
		"convex",
	];
	const docTokens = ["docs", "doc", "guides", "readme"];

	if (hasToken(designTokens)) return "design";
	if (hasToken(managementTokens)) return "management";
	if (hasToken(marketingTokens)) return "marketing";
	if (hasToken(adminTokens)) return "admin";
	if (hasToken(platformTokens) || normalized.startsWith("packages/")) {
		return "platform";
	}
	if (hasToken(docTokens) || normalized.endsWith(".md")) return "docs";
	if (normalized.startsWith("apps/")) return "product_front";

	return "product_front";
}

function isIgnoredSurfacePath(path: string): boolean {
	const normalized = path.replace(/^\.\/+/, "");
	if (!normalized) return true;
	const parts = normalized.split("/").filter(Boolean);
	const rootName = parts[0] ?? "";
	const rootFilesToIgnore = new Set([
		".gitignore",
		".gitattributes",
		".editorconfig",
		".prettierrc",
		".prettierrc.json",
		".prettierrc.js",
		".prettierrc.cjs",
		".prettierrc.yaml",
		".prettierrc.yml",
		".eslintrc",
		".eslintrc.json",
		".eslintrc.js",
		".eslintrc.cjs",
		".eslintignore",
		".stylelintrc",
		".stylelintrc.json",
		".stylelintrc.js",
		"eslint.config.js",
		"eslint.config.mjs",
		"prettier.config.js",
		"prettier.config.cjs",
		"tsconfig.json",
		"turbo.json",
		"pnpm-lock.yaml",
		"pnpm-workspace.yaml",
		"package.json",
	]);

	if (parts.length === 1 && (rootName.startsWith(".") || rootFilesToIgnore.has(rootName))) {
		return true;
	}

	if (rootName.startsWith(".") && parts.length <= 2) {
		return true;
	}

	return false;
}

function deriveBucketIdFromPath(path: string): string | null {
	const normalized = path.replace(/^\.\/+/, "");
	const parts = normalized.split("/").filter(Boolean);
	if (parts.length === 0) return null;

	if ((parts[0] === "apps" || parts[0] === "packages") && parts[1]) {
		if (parts[2] && (parts[2] === "doc" || parts[2] === "docs")) {
			return `${parts[0]}/${parts[1]}/${parts[2]}`;
		}
		return `${parts[0]}/${parts[1]}`;
	}

	if (parts[0] === "docs" || parts[0] === "doc") {
		return parts[0];
	}

	if (parts.length >= 2 && !parts[0].startsWith(".")) {
		return `${parts[0]}/${parts[1]}`;
	}

	if (parts[0].startsWith(".")) return null;

	return parts[0];
}

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

function classifySurfaceFromPath(path: string): string | null {
	const normalized = path.replace(/^\.\/+/, "").toLowerCase();
	const segments = normalized.split("/");
	const hasToken = (tokens: string[]) =>
		segments.some((segment) => tokens.includes(segment));

	const docTokens = ["docs", "doc", "guides"];
	const marketingTokens = ["marketing", "website", "landing", "blog", "brand"];
	const adminTokens = ["admin", "backoffice", "back-office", "console"];
	const platformTokens = [
		"platform",
		"backend",
		"server",
		"api",
		"core",
		"services",
		"infra",
	];

	if (normalized.endsWith(".md") || hasToken(docTokens)) return "product_docs";
	if (hasToken(marketingTokens)) return "product_marketing";
	if (hasToken(adminTokens)) return "product_admin";
	if (hasToken(platformTokens)) return "product_platform";
	if (normalized.startsWith("apps/")) return "product_core";
	if (normalized.startsWith("packages/")) return "product_platform";

	return "product_other";
}

function deriveClassificationFromStructure(
	structureSummary: unknown,
):
	| "product_core"
	| "marketing_surface"
	| "infra"
	| "docs"
	| "experiments"
	| "unknown"
	| null {
	const summary = structureSummary as {
		surfaceMap?: { buckets?: Array<{ name?: string; count?: number }> };
	};
	const buckets = summary?.surfaceMap?.buckets ?? [];
	if (!Array.isArray(buckets) || buckets.length === 0) return null;

	const names = buckets
		.map((bucket) => (bucket.name ?? "").trim())
		.filter(Boolean);
	const has = (name: string) => names.includes(name);

	if (has("product_core")) return "product_core";
	if (has("product_platform")) return "infra";
	if (has("product_admin")) return "infra";
	if (has("product_marketing")) return "marketing_surface";
	if (has("product_docs")) return "docs";
	if (has("product_other")) return "unknown";

	return null;
}

const SOURCE_CLASSIFICATIONS = new Set([
	"product_core",
	"marketing_surface",
	"infra",
	"docs",
	"experiments",
	"unknown",
]);

function normalizeSourceClassification(
	value: unknown,
):
	| "product_core"
	| "marketing_surface"
	| "infra"
	| "docs"
	| "experiments"
	| "unknown"
	| null {
	if (typeof value !== "string") return null;
	if (value === "mixed") return "unknown";
	return SOURCE_CLASSIFICATIONS.has(value)
		? (value as
				| "product_core"
				| "marketing_surface"
				| "infra"
				| "docs"
				| "experiments"
				| "unknown")
		: null;
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
	const marketingTokens = [
		"marketing",
		"website",
		"landing",
		"growth",
		"brand",
		"promo",
	];
	const productTokens = [
		"app",
		"webapp",
		"dashboard",
		"client",
		"frontend",
		"portal",
	];
	const infraTokens = [
		"backend",
		"server",
		"api",
		"infra",
		"convex",
		"functions",
		"services",
		"packages",
	];
	const docTokens = ["docs", "doc", "guides"];
	const experimentTokens = ["experiments", "sandbox", "playground", "prototype"];

	for (const path of filePaths) {
		const normalized = path.replace(/^\.\/+/, "");
		const segments = normalized.toLowerCase().split("/");
		const hasToken = (tokens: string[]) =>
			segments.some((segment) => tokens.includes(segment));

		if (hasToken(experimentTokens)) {
			hints.add("experiments");
			continue;
		}
		if (hasToken(docTokens) || normalized.endsWith(".md")) {
			hints.add("docs");
			continue;
		}
		if (hasToken(marketingTokens)) {
			hints.add("marketing_surface");
			continue;
		}
		if (hasToken(infraTokens)) {
			hints.add("infra");
			continue;
		}
		if (normalized.includes("/apps/") || hasToken(productTokens)) {
			hints.add("product_core");
		}
	}

	if (!hints.size) return ["unknown"];
	return Array.from(hints);
}

type RepoDomainHint = {
	name: string;
	pathPatterns: string[];
	schemaEntities: string[];
	capabilities: string[];
};

function extractRepoDomains(contextDetail: unknown): RepoDomainHint[] {
	const detail = contextDetail as { domains?: Array<Record<string, unknown>> };
	if (!detail || !Array.isArray(detail.domains)) return [];
	return detail.domains
		.map((domain) => ({
			name: typeof domain.name === "string" ? domain.name : "",
			pathPatterns: Array.isArray(domain.pathPatterns)
				? (domain.pathPatterns as string[])
				: [],
			schemaEntities: Array.isArray(domain.schemaEntities)
				? (domain.schemaEntities as string[])
				: [],
			capabilities: Array.isArray(domain.capabilities)
				? (domain.capabilities as string[])
				: [],
		}))
		.filter((domain) => domain.name.length > 0);
}

function deriveDomainHint(
	filePaths: string[],
	summary: string,
	domains: RepoDomainHint[],
): { name: string; matchedBy: "path" | "entity" | "none" } | undefined {
	if (!domains.length) return undefined;

	const pathMatches: Array<{ domain: RepoDomainHint; score: number }> = [];
	for (const domain of domains) {
		let score = 0;
		for (const path of filePaths) {
			for (const pattern of domain.pathPatterns) {
				if (matchesGlob(path, pattern)) {
					score += 1;
				}
			}
		}
		if (score > 0) pathMatches.push({ domain, score });
	}

	if (pathMatches.length > 0) {
		pathMatches.sort((a, b) => b.score - a.score);
		return { name: pathMatches[0].domain.name, matchedBy: "path" };
	}

	const normalizedSummary = summary.toLowerCase();
	const entityMatches: Array<{ domain: RepoDomainHint; score: number }> = [];
	for (const domain of domains) {
		let score = 0;
		for (const entity of domain.schemaEntities) {
			const normalizedEntity = entity.toLowerCase();
			if (normalizedEntity && normalizedSummary.includes(normalizedEntity)) {
				score += 1;
			}
		}
		if (score > 0) entityMatches.push({ domain, score });
	}
	if (entityMatches.length > 0) {
		entityMatches.sort((a, b) => b.score - a.score);
		return { name: entityMatches[0].domain.name, matchedBy: "entity" };
	}

	return { name: domains[0]?.name ?? "Unknown", matchedBy: "none" };
}

function matchesGlob(path: string, pattern: string): boolean {
	const normalizedPath = path.replace(/^\.\/+/, "");
	const normalizedPattern = pattern.replace(/^\.\/+/, "");
	const regex = globToRegex(normalizedPattern);
	return regex.test(normalizedPath);
}

function globToRegex(pattern: string): RegExp {
	const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	const withWildcards = escaped
		.replace(/\*\*/g, ".*")
		.replace(/\*/g, "[^/]*")
		.replace(/\?/g, ".");
	return new RegExp(`^${withWildcards}$`, "i");
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

async function refreshSourceContextsForProduct(
	ctx: ActionCtx,
	productId: Id<"products">,
): Promise<{ refreshed: number }> {
	const sourceContexts = await ctx.runQuery(
		internal.agents.sourceContextData.listSourceContexts,
		{ productId },
	);
	if (!sourceContexts.length) return { refreshed: 0 };

	const repoMeta = await ctx.runQuery(
		internal.agents.productContextData.getRepositoryMetadata,
		{ productId },
	);
	const connectionId = repoMeta[0]?.connectionId;
	if (!connectionId) return { refreshed: 0 };

	let refreshed = 0;
	const now = Date.now();

	for (const source of sourceContexts) {
		if (source.sourceType !== "repo") continue;
		const structureSummary =
			(source.structure as { summary?: unknown })?.summary ??
			source.structure ??
			null;
		const surfaceBuckets = Array.isArray(
			(structureSummary as { surfaceMap?: { buckets?: unknown } })?.surfaceMap
				?.buckets,
		)
			? (structureSummary as { surfaceMap: { buckets: unknown[] } }).surfaceMap
					.buckets
			: [];
		const updatedAt =
			typeof (source.structure as { updatedAt?: number })?.updatedAt === "number"
				? (source.structure as { updatedAt: number }).updatedAt
				: null;
		const isFresh = updatedAt ? now - updatedAt < 12 * 60 * 60 * 1000 : false;

		if (isFresh && surfaceBuckets.length > 0) {
			continue;
		}

		try {
			const summary = await ctx.runAction(
				internal.connectors.github.fetchRepoStructureSummary,
				{
					productId,
					connectionId,
					repoFullName: source.sourceId,
				},
			);
			const derivedClassification = deriveClassificationFromStructure(summary);
			const normalizedClassification = normalizeSourceClassification(
				source.classification,
			);
			await ctx.runMutation(internal.agents.sourceContextData.upsertSourceContext, {
				productId,
				sourceType: source.sourceType,
				sourceId: source.sourceId,
				classification:
					derivedClassification ?? normalizedClassification ?? "unknown",
				notes: source.notes,
				structure: { summary, updatedAt: now, source: "github_tree" },
			});
			refreshed += 1;
		} catch {
			continue;
		}
	}

	return { refreshed };
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
	context: Record<string, unknown>,
	featureMap: Record<string, unknown> | null,
): { all: Set<string>; domains: Set<string> } {
	const all = new Set<string>();
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

	addArrayObjects(domains, (context as { productDomains?: unknown }).productDomains);
	addArrayObjects(all, (context as { productDomains?: unknown }).productDomains);
	if (featureMap) {
		const features = (featureMap as { features?: unknown }).features;
		if (Array.isArray(features)) {
			features.forEach((feature) => {
				if (!feature || typeof feature !== "object") return;
				const domain = (feature as { domain?: unknown }).domain;
				addString(domains, domain);
				addString(all, domain);
			});
		}
	}
	return { all, domains };
}

const DOMAIN_TAXONOMY = [
	{
		name: "Core Experience",
		kind: "product",
		aliases: [
			"core",
			"core experience",
			"product core",
			"product experience",
			"narrative layer",
			"experiencia central",
			"experiencia principal",
			"núcleo del producto",
		],
	},
	{
		name: "Data Ingestion",
		kind: "product",
		aliases: [
			"data ingestion",
			"ingestion",
			"connectors",
			"integrations",
			"sources",
			"ingesta de datos",
			"conectores",
			"integraciones",
			"fuentes",
		],
	},
	{
		name: "Automation & AI",
		kind: "product",
		aliases: [
			"automation",
			"ai",
			"orchestration",
			"telemetry & ai orchestration",
			"llm",
			"insight extraction",
			"automatización",
			"automatización e ia",
			"orquestación",
			"extracción de insights",
		],
	},
	{
		name: "Analytics & Reporting",
		kind: "product",
		aliases: [
			"analytics",
			"reporting",
			"insights",
			"metrics",
			"analítica",
			"informes",
			"métricas",
		],
	},
	{
		name: "Content Distribution",
		kind: "product",
		aliases: [
			"content distribution",
			"distribution",
			"content automation",
			"publishing",
			"templates",
			"distribución de contenido",
			"automatización de contenido",
			"publicación",
			"plantillas",
		],
	},
	{
		name: "Collaboration & Access",
		kind: "product",
		aliases: [
			"collaboration",
			"access",
			"auth",
			"onboarding",
			"permissions",
			"roles",
			"teams",
			"orgs",
			"colaboración",
			"acceso",
			"autenticación",
			"permisos",
			"roles",
			"equipos",
			"organizaciones",
		],
	},
	{
		name: "Platform Foundation",
		kind: "technical",
		aliases: [
			"platform",
			"platform foundation",
			"infrastructure",
			"security",
			"billing",
			"reliability",
			"performance",
			"plataforma",
			"fundación de plataforma",
			"infraestructura",
			"seguridad",
			"facturación",
			"fiabilidad",
			"rendimiento",
		],
	},
	{
		name: "Internal Tools",
		kind: "internal",
		aliases: [
			"internal",
			"internal tools",
			"ops",
			"admin tools",
			"dev tools",
			"ai test panel",
			"herramientas internas",
			"operaciones",
			"herramientas de admin",
			"herramientas de desarrollo",
		],
	},
	{
		name: "Marketing Presence",
		kind: "internal",
		aliases: [
			"marketing",
			"website",
			"landing",
			"brand",
			"marketing pages",
			"presencia de marketing",
			"sitio web",
			"landing page",
			"marca",
		],
	},
	{
		name: "Documentation & Support",
		kind: "internal",
		aliases: [
			"docs",
			"documentation",
			"support",
			"guides",
			"help",
			"documentación",
			"soporte",
			"guías",
			"ayuda",
		],
	},
] as const;

function normalizeDomainKey(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function canonicalizeDomainName(
	value: string,
	kind?: string,
): { name: string; kind: string } | undefined {
	if (!value) return undefined;
	const key = normalizeDomainKey(value);
	if (!key) return undefined;

	const direct = DOMAIN_TAXONOMY.find(
		(domain) => normalizeDomainKey(domain.name) === key,
	);
	if (direct) return { name: direct.name, kind: direct.kind };

	const byAlias = DOMAIN_TAXONOMY.find((domain) =>
		domain.aliases.some((alias) => normalizeDomainKey(alias) === key),
	);
	if (byAlias) return { name: byAlias.name, kind: byAlias.kind };

	if (key.includes("doc")) return { name: "Documentation & Support", kind: "internal" };
	if (key.includes("marketing") || key.includes("website"))
		return { name: "Marketing Presence", kind: "internal" };
	if (key.includes("internal") || key.includes("admin"))
		return { name: "Internal Tools", kind: "internal" };
	if (key.includes("platform") || key.includes("infra") || key.includes("security") || key.includes("billing"))
		return { name: "Platform Foundation", kind: "technical" };

	if (kind === "technical") return { name: "Platform Foundation", kind };
	if (kind === "internal") return { name: "Internal Tools", kind };
	if (kind === "product") return { name: "Core Experience", kind };
	return { name: "Core Experience", kind: "product" };
}

function normalizeFeatureMap(
	parsed: {
		features?: Array<Record<string, unknown>>;
		domains?: Array<Record<string, unknown>>;
		domainMap?: Record<string, unknown>;
		decisionSummary?: Record<string, unknown>;
		sourcesUsed?: string[];
	},
	previous: Record<string, unknown> | null,
	generatedAt: number,
): Record<string, unknown> {
	const previousFeatures = Array.isArray(
		(previous as { features?: unknown })?.features,
	)
		? ((previous as { features: Array<Record<string, unknown>> }).features ?? [])
		: [];
	const previousById = new Map(
		previousFeatures
			.map((feature) => {
				const id = typeof feature.id === "string" ? feature.id : "";
				return id ? [id, feature] : null;
			})
			.filter((entry): entry is [string, Record<string, unknown>] => Boolean(entry)),
	);
	const previousByName = new Map(
		previousFeatures
			.map((feature) => {
				const name = typeof feature.name === "string" ? feature.name.trim() : "";
				return name ? [name.toLowerCase(), feature] : null;
			})
			.filter((entry): entry is [string, Record<string, unknown>] => Boolean(entry)),
	);

	const normalizedFeatures = parsed.features?.map((feature) => {
		const name =
			typeof feature.name === "string" ? feature.name.trim() : "Untitled feature";
		const existingByName = previousByName.get(name.toLowerCase());
		const id =
			typeof feature.id === "string" && feature.id.trim()
				? feature.id.trim()
				: typeof existingByName?.id === "string"
					? (existingByName.id as string)
					: slugifyFeatureId(name);
		const slug =
			typeof feature.slug === "string" && feature.slug.trim()
				? feature.slug.trim()
				: typeof existingByName?.slug === "string"
					? (existingByName.slug as string)
					: slugifyFeatureId(name);
		const deprecated = Boolean(feature.deprecated);

		const visibilityHint =
			typeof feature.visibilityHint === "string" ? feature.visibilityHint : undefined;
		const domainName =
			typeof feature.domain === "string" ? feature.domain.trim() : "";
		const canonicalDomain =
			domainName &&
			(canonicalizeDomainName(domainName, visibilityHint)?.name ?? domainName);
		const fallbackDomain =
			!canonicalDomain && visibilityHint === "internal"
				? "Internal Tools"
				: undefined;

		return {
			...feature,
			id,
			slug,
			name,
			deprecated,
			domain: canonicalDomain || fallbackDomain || feature.domain,
			lastSeenAt: generatedAt,
		};
	}) ?? [];

	const normalizedDomains = Array.isArray(parsed.domains)
		? parsed.domains
				.map((domain) => {
					if (!domain || typeof domain !== "object") return null;
					const rawName =
						typeof domain.name === "string" ? domain.name.trim() : "";
					if (!rawName) return null;
					const canonical = canonicalizeDomainName(
						rawName,
						typeof domain.kind === "string" ? domain.kind : undefined,
					);
					const name = canonical?.name ?? rawName;
					return {
						name,
						description:
							typeof domain.description === "string"
								? domain.description
								: undefined,
						kind: canonical?.kind ??
							(typeof domain.kind === "string" ? domain.kind : undefined),
						weight:
							typeof domain.weight === "number" ? domain.weight : undefined,
					};
				})
				.filter(Boolean) as Array<{
					name: string;
					description?: string;
					kind?: string;
					weight?: number;
				}>
		: undefined;

	const previousDomains = Array.isArray(
		(previous as { domains?: unknown })?.domains,
	)
		? ((previous as { domains: Array<Record<string, unknown>> }).domains ?? [])
		: [];

	const normalizedDomainMap = normalizeDomainMap(
		parsed.domainMap,
		normalizedDomains ?? previousDomains,
	);

	const nextIds = new Set(
		normalizedFeatures
			.map((feature) => (typeof feature.id === "string" ? feature.id : ""))
			.filter(Boolean),
	);
	const carryOver = previousFeatures
		.filter((feature) => {
			const id = typeof feature.id === "string" ? feature.id : "";
			return id && !nextIds.has(id);
		})
		.map((feature) => ({
			...feature,
			deprecated: true,
		}));

	return {
		features: [...normalizedFeatures, ...carryOver],
		domains: normalizedDomains ?? previousDomains,
		domainMap: normalizedDomainMap ?? (previous as { domainMap?: unknown })?.domainMap,
		decisionSummary:
			parsed.decisionSummary ??
			(previous as { decisionSummary?: unknown })?.decisionSummary,
		generatedAt,
		sourcesUsed: parsed.sourcesUsed ?? [],
		version:
			typeof (previous as { version?: unknown })?.version === "number"
				? ((previous as { version: number }).version ?? 0) + 1
				: 1,
	};
}

function normalizeDomainMap(
	domainMap: unknown,
	domains: Array<Record<string, unknown>>,
): Record<string, unknown> | undefined {
	if (!domainMap || typeof domainMap !== "object") return undefined;
	const map = domainMap as {
		columns?: unknown;
		rows?: unknown;
		items?: unknown;
	};
	const columns =
		typeof map.columns === "number" && map.columns > 0 ? map.columns : 0;
	const rows = typeof map.rows === "number" && map.rows > 0 ? map.rows : 0;
	if (!columns || !rows || !Array.isArray(map.items)) return undefined;

	const domainNames = new Set(
		domains
			.map((domain) =>
				typeof domain.name === "string" ? domain.name.trim() : "",
			)
			.filter(Boolean),
	);

	const items = map.items
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const entry = item as Record<string, unknown>;
			const rawDomain =
				typeof entry.domain === "string" ? entry.domain.trim() : "";
			const domain =
				rawDomain && canonicalizeDomainName(rawDomain)?.name
					? canonicalizeDomainName(rawDomain)?.name ?? rawDomain
					: rawDomain;
			if (!domain || !domainNames.has(domain)) return null;
			const x = typeof entry.x === "number" ? entry.x : null;
			const y = typeof entry.y === "number" ? entry.y : null;
			const w = typeof entry.w === "number" ? entry.w : null;
			const h = typeof entry.h === "number" ? entry.h : null;
			if (
				x === null ||
				y === null ||
				w === null ||
				h === null ||
				w <= 0 ||
				h <= 0
			) {
				return null;
			}

			return {
				domain,
				x,
				y,
				w,
				h,
				kind:
					typeof entry.kind === "string" ? entry.kind : undefined,
				weight:
					typeof entry.weight === "number" ? entry.weight : undefined,
			};
		})
		.filter(Boolean) as Array<{
			domain: string;
			x: number;
			y: number;
			w: number;
			h: number;
			kind?: string;
			weight?: number;
		}>;

	if (!items.length) return undefined;

	return {
		columns,
		rows,
		items,
	};
}

function applyFeatureMapGuardrails(
	featureMap: Record<string, unknown>,
	decisionSummary: Record<string, unknown>,
	languagePreference: string,
): Record<string, unknown> {
	const features = Array.isArray(
		(featureMap as { features?: unknown }).features,
	)
		? ((featureMap as { features: Array<Record<string, unknown>> }).features ?? [])
		: [];
	const domains = Array.isArray(
		(featureMap as { domains?: unknown }).domains,
	)
		? ((featureMap as { domains: Array<Record<string, unknown>> }).domains ?? [])
		: [];
	const domainMap = (featureMap as { domainMap?: unknown }).domainMap as
		| Record<string, unknown>
		| undefined;

	const decisionDomains = Array.isArray(
		(decisionSummary as { domainDecisions?: unknown }).domainDecisions,
	)
		? ((decisionSummary as { domainDecisions: Array<Record<string, unknown>> })
				.domainDecisions ?? [])
		: [];
	const decisionFeatures = Array.isArray(
		(decisionSummary as { featureDecisions?: unknown }).featureDecisions,
	)
		? ((decisionSummary as { featureDecisions: Array<Record<string, unknown>> })
				.featureDecisions ?? [])
		: [];

	const allowedSurface = (surface: unknown) =>
		surface === "product_core" || surface === "product_platform";

	const internalDomain =
		domains.find((domain) => domain.kind === "internal")?.name ?? "Internal Tools";
	const technicalDomain =
		domains.find((domain) => domain.kind === "technical")?.name ??
		"Platform Foundation";

	const productDomainNames = new Set<string>(
		DOMAIN_TAXONOMY.filter((domain) => domain.kind === "product").map(
			(domain) => domain.name,
		),
	);

	const domainByName = new Map(
		domains
			.map((domain) => {
				const name = typeof domain.name === "string" ? domain.name : "";
				return name ? [name, domain] : null;
			})
			.filter(Boolean) as Array<[string, Record<string, unknown>]>,
	);

	const decisionsByDomain = new Map(
		decisionDomains
			.map((decision) => {
				const raw = typeof decision.domain === "string" ? decision.domain : "";
				const canonical = raw ? canonicalizeDomainName(raw)?.name ?? raw : "";
				return canonical ? [canonical, decision] : null;
			})
			.filter(Boolean) as Array<[string, Record<string, unknown>]>,
	);

	const allowedDomains = new Set<string>();
	domains.forEach((domain) => {
		const name = typeof domain.name === "string" ? domain.name : "";
		if (!name) return;
		if (!productDomainNames.has(name)) {
			allowedDomains.add(name);
			return;
		}
		const decision = decisionsByDomain.get(name);
		const surfaces = Array.isArray(decision?.surfaces)
			? (decision?.surfaces as unknown[])
			: [];
		const alignment =
			typeof decision?.alignment === "string"
				? (decision.alignment as string)
				: "medium";
		const evidence = Array.isArray(decision?.evidence)
			? (decision?.evidence as Array<Record<string, unknown>>)
			: [];
		const hasCoreUiEvidence = evidence.some((item) => {
			const type = item.type;
			const path = typeof item.path === "string" ? item.path : "";
			const surface = classifySurfaceFromPath(path);
			return (
				(type === "route" || type === "component") &&
				(surface === "product_core" || surface === "product_platform")
			);
		});
		if (alignment !== "high") return;
		if (surfaces.some(allowedSurface) && hasCoreUiEvidence) {
			allowedDomains.add(name);
		}
	});

	const filteredDomains = domains.filter((domain) => {
		const name = typeof domain.name === "string" ? domain.name : "";
		return name ? allowedDomains.has(name) : false;
	});

	const decisionsByFeature = new Map(
		decisionFeatures
			.map((decision) => {
				const name = typeof decision.feature === "string" ? decision.feature : "";
				return name ? [name, decision] : null;
			})
			.filter(Boolean) as Array<[string, Record<string, unknown>]>,
	);

	const adjustedFeatures = features.map((feature) => {
		const name = typeof feature.name === "string" ? feature.name : "";
		const decision = decisionsByFeature.get(name);
		const surfaces = Array.isArray(decision?.surfaces)
			? (decision?.surfaces as unknown[])
			: [];
		const alignment =
			typeof decision?.alignment === "string"
				? (decision.alignment as string)
				: "medium";
		const evidence = Array.isArray(decision?.evidence)
			? (decision?.evidence as Array<Record<string, unknown>>)
			: [];
		const hasCoreUiEvidence = evidence.some((item) => {
			const type = item.type;
			const path = typeof item.path === "string" ? item.path : "";
			const surface = classifySurfaceFromPath(path);
			return (
				(type === "route" || type === "component") &&
				(surface === "product_core" || surface === "product_platform")
			);
		});
		const allowedSurfaceHit = surfaces.some(allowedSurface);
		const targetDomain =
			typeof feature.domain === "string"
				? canonicalizeDomainName(feature.domain)?.name ?? feature.domain
				: undefined;
		const isCoreUi = evidence.some((item) => {
			const type = item.type;
			const path = typeof item.path === "string" ? item.path : "";
			const surface = classifySurfaceFromPath(path);
			return type === "route" || type === "component"
				? surface === "product_core"
				: false;
		});
		const hasMarketingEvidence = evidence.some((item) => {
			const path = typeof item.path === "string" ? item.path : "";
			const surface = classifySurfaceFromPath(path);
			const value = typeof item.value === "string" ? item.value.toLowerCase() : "";
			return surface === "product_marketing" || value.includes("marketing") || value.includes("i18n");
		});
		const hasDocsEvidence = evidence.some((item) => {
			const path = typeof item.path === "string" ? item.path : "";
			const surface = classifySurfaceFromPath(path);
			const value = typeof item.value === "string" ? item.value.toLowerCase() : "";
			return surface === "product_docs" || value.includes("docs") || value.includes("documentation");
		});
		const inAllowedDomain =
			targetDomain && allowedDomains.has(targetDomain);

		if (
			(!allowedSurfaceHit && !hasCoreUiEvidence) ||
			alignment !== "high" ||
			!inAllowedDomain
		) {
			return {
				...feature,
				visibilityHint: "internal",
				domain: internalDomain || technicalDomain,
			};
		}

		if (isCoreUi && targetDomain === internalDomain) {
			return {
				...feature,
				visibilityHint: "public",
				domain: "Core Experience",
			};
		}

		if (!isCoreUi && hasMarketingEvidence) {
			return {
				...feature,
				visibilityHint: "internal",
				domain: "Marketing Presence",
			};
		}

		if (!isCoreUi && hasDocsEvidence) {
			return {
				...feature,
				visibilityHint: "internal",
				domain: "Documentation & Support",
			};
		}

		if (!isCoreUi && targetDomain === "Automation & AI") {
			return {
				...feature,
				visibilityHint: "internal",
				domain: "Platform Foundation",
			};
		}

		return {
			...feature,
			domain: targetDomain ?? feature.domain,
		};
	});

	const adjustedDomainMap =
		domainMap && typeof domainMap === "object"
			? {
					...domainMap,
					items: Array.isArray((domainMap as { items?: unknown }).items)
						? (domainMap as { items: Array<Record<string, unknown>> }).items.filter(
								(item) =>
									item &&
									typeof item.domain === "string" &&
									allowedDomains.has(item.domain),
							)
						: [],
				}
			: domainMap;

	return {
		...featureMap,
		features: adjustedFeatures,
		domains: filteredDomains,
		domainMap: adjustedDomainMap,
	};
}

function slugifyFeatureId(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)+/g, "")
		.slice(0, 48);
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
