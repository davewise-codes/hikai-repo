import { v } from "convex/values";
import { action } from "../_generated/server";
import { createThread, type AgentComponent } from "@convex-dev/agent";
import { components, internal } from "../_generated/api";
import { helloWorldAgent } from "./helloWorldAgent";
import { Id } from "../_generated/dataModel";
import { productContextAgent } from "./productContextAgent";
import { productContextPrompt } from "../ai/prompts";
import { getAIConfig } from "../ai";

const agentComponent = (components as { agent: AgentComponent }).agent;
const DEFAULT_PROVIDER = "openai";
const DEFAULT_MODEL = "gpt-4o-mini";
const AGENT_NAME = "Hello World Agent";
const USE_CASE = "ai_test";
const SOURCE_METADATA = { source: "ai-test" };
const PRODUCT_CONTEXT_USE_CASE = "product_context_enrichment";
const PRODUCT_CONTEXT_AGENT_NAME = "Product Context Agent";

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

			return {
				text: result.text,
				threadId: tid,
				usage: {
					provider: DEFAULT_PROVIDER,
					model: DEFAULT_MODEL,
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
				provider: DEFAULT_PROVIDER,
				model: DEFAULT_MODEL,
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
	},
	handler: async (
		ctx,
		{ productId, forceRefresh, threadId, debugUi },
	): Promise<{
		threadId: string;
		productContext: Record<string, unknown>;
	}> => {
		const { organizationId, userId, product } = await ctx.runQuery(
			internal.lib.access.assertProductAccessInternal,
			{ productId },
		);
		const aiConfig = getAIConfig();

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

		const currentVersion = fetchedProduct.productContext?.current?.version ?? 0;
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
			existingContext: forceRefresh
				? null
				: fetchedProduct.productContext?.current ?? null,
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

			const version = currentVersion + 1;
			const timestamp = Date.now();
			const newEntry = {
				...parsed,
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

			await ctx.runMutation(
				internal.agents.productContextData.saveProductContext,
				{
					productId,
					entry: newEntry,
					languagePreference,
					timestamp,
				},
			);

			return {
				threadId: tid,
				productContext: newEntry,
			};
		} catch (error) {
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
				provider: DEFAULT_PROVIDER,
				model: DEFAULT_MODEL,
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
				provider: DEFAULT_PROVIDER,
				model: DEFAULT_MODEL,
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
