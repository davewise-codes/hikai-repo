import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { useConnections } from "@/domains/connectors/hooks";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Label,
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	Switch,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	TooltipProvider,
	toast,
	Copy,
	ThumbsDown,
	ThumbsUp,
	Clock,
} from "@hikai/ui";

type ProductContextEntry = {
	version?: number;
	createdAt?: number;
	createdBy?: Id<"users">;
	provider?: string;
	model?: string;
	threadId?: string;
	aiDebug?: boolean;
	promptUsed?: string;
	language?: string;
	languagePreference?: string;
	sourcesUsed?: string[];
	productName?: string;
	description?: string;
	valueProposition?: string;
	targetMarket?: string;
	productCategory?: string;
	productType?: string;
	businessModel?: string;
	stage?: string;
	personas?: Array<{ name: string; description?: string }>;
	platforms?: string[];
	integrationEcosystem?: string[];
	technicalStack?: string[];
	audienceSegments?: Array<{ name: string; description?: string }>;
	toneGuidelines?: Array<{ name: string; description?: string }>;
	featureMap?: {
		features?: Array<{
			id?: string;
			name?: string;
			description?: string;
			domain?: string;
			visibilityHint?: "public" | "internal";
			deprecated?: boolean;
		}>;
		domains?: Array<{
			name: string;
			description?: string;
			kind?: "product" | "technical" | "internal";
			weight?: number;
		}>;
		domainMap?: {
			columns: number;
			rows: number;
			items: Array<{
				domain: string;
				x: number;
				y: number;
				w: number;
				h: number;
				kind?: "product" | "technical" | "internal";
				weight?: number;
			}>;
		};
	};
	productDomains?: Array<{ name: string; description?: string }>;
	competition?: Array<{ name: string; description?: string }>;
	strategicPillars?: Array<{ name: string; description?: string }>;
	releaseCadence?: string;
	maturity?: string;
	risks?: Array<{ name: string; description?: string }>;
	recommendedFocus?: Array<{ name: string; description?: string }>;
	notableEvents?: Array<{
		source: string;
		rawEventId?: string;
		type?: string;
		summary: string;
		occurredAt?: number;
		relatedKeyFeatures?: string[];
	}>;
	confidence?: number;
	qualityScore?: number;
};

type ProductContextCardProps = {
	product: {
		_id: Id<"products">;
		name: string;
		userRole?: "admin" | "member";
		languagePreference?: string;
	};
};

type AgentRunStep = {
	step: string;
	status: "info" | "success" | "warn" | "error";
	timestamp: number;
	metadata?: Record<string, unknown>;
};

type AgentRun = {
	_id: Id<"agentRuns">;
	status: "running" | "success" | "error";
	steps: AgentRunStep[];
	errorMessage?: string;
};

type FeatureMapItem = {
	id?: string;
	name?: string;
	description?: string;
	domain?: string;
	visibilityHint?: "public" | "internal";
	deprecated?: boolean;
};

type FeatureDomain = {
	name: string;
	description?: string;
	kind?: "product" | "technical" | "internal";
	weight?: number;
	hasSignals?: boolean;
};

type SurfaceKey =
	| "product_core"
	| "product_platform"
	| "product_admin"
	| "product_marketing"
	| "product_docs"
	| "product_other";

type DomainMapLayout = {
	columns: number;
	rows: number;
	items: Array<{
		domain: string;
		x: number;
		y: number;
		w: number;
		h: number;
		kind?: "product" | "technical" | "internal";
		weight?: number;
	}>;
};

type SourceContextEntry = {
	sourceId: string;
	classification?: string;
	notes?: string;
	structure?: {
		summary?: {
			appPaths?: string[];
			packagePaths?: string[];
			fileCount?: number;
			surfaceMap?: {
				buckets: Array<{ name: string; count: number; samplePaths?: string[] }>;
			};
		};
		appPaths?: string[];
		packagePaths?: string[];
		fileCount?: number;
		surfaceMap?: {
			buckets: Array<{ name: string; count: number; samplePaths?: string[] }>;
		};
	};
};

export function ProductContextCard({ product }: ProductContextCardProps) {
	const { t } = useTranslation("products");
	const generateContext = useAction(api.agents.actions.generateProductContext);
	const createAgentRun = useMutation(api.agents.agentRuns.createAgentRun);
	const rateInference = useMutation(api.ai.inferenceLogs.rateInference);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isRating, setIsRating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [openSheet, setOpenSheet] = useState(false);
	const [debugUi, setDebugUi] = useState(false);
	const [agentRunId, setAgentRunId] = useState<Id<"agentRuns"> | null>(null);
	const { connections, isLoading } = useConnections(product._id);
	const agentRun = useQuery(
		api.agents.agentRuns.getRunById,
		agentRunId
			? {
					productId: product._id,
					runId: agentRunId,
				}
			: "skip",
	) as AgentRun | null | undefined;
	const latestRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		{
			productId: product._id,
			useCase: "product_context_enrichment",
		},
	) as AgentRun | null | undefined;
	const activeRun = agentRun ?? latestRun;

	const current = useQuery(api.products.products.getCurrentProductContextSnapshot, {
		productId: product._id,
	});
	const history =
		useQuery(api.products.products.getProductContextSnapshots, {
			productId: product._id,
			limit: 25,
		}) ?? [];
	const sourceContexts =
		useQuery(api.agents.sourceContext.listSourceContexts, {
			productId: product._id,
		}) ?? [];
	const agentName = "Product Context Agent";
	const threadId = current?.threadId;
	const hasContext = !!current;
	const isAdmin = product.userRole === "admin";
	const hasRisks = (current?.risks?.length ?? 0) > 0;
	const hasToneGuidelines = (current?.toneGuidelines?.length ?? 0) > 0;
	const hasRecommendedFocus = (current?.recommendedFocus?.length ?? 0) > 0;
	const hasCollapsible =
		hasRisks || hasToneGuidelines || hasRecommendedFocus;
	const hasSources =
		(current?.sourcesUsed ?? []).filter((s: string) => s !== "baseline").length >
			0 ||
		(!hasContext && (connections?.length ?? 0) > 0);
	const featureMapItems =
		(current?.featureMap?.features as FeatureMapItem[] | undefined)
			?.filter((feature) => !feature?.deprecated)
			.map((feature) => ({
				id: feature.id,
				name: feature.name ?? "Untitled feature",
				description: feature.description,
				domain: feature.domain,
				visibilityHint: feature.visibilityHint,
			})) ?? [];
	const featureMapDomains =
		(current?.featureMap?.domains as FeatureDomain[] | undefined) ?? [];
	const sourceDomains =
		featureMapDomains.length > 0
			? featureMapDomains
			: (current?.productDomains as FeatureDomain[] | undefined) ?? [];
	const domainSurfaceMap = new Map<string, SurfaceKey>([
		["core experience", "product_core"],
		["data ingestion", "product_core"],
		["automation & ai", "product_core"],
		["analytics & reporting", "product_core"],
		["content distribution", "product_core"],
		["collaboration & access", "product_core"],
		["platform foundation", "product_platform"],
		["internal tools", "product_other"],
		["marketing presence", "product_marketing"],
		["documentation & support", "product_docs"],
		[t("context.domainLabels.coreExperience").toLowerCase(), "product_core"],
		[t("context.domainLabels.dataIngestion").toLowerCase(), "product_core"],
		[t("context.domainLabels.automationAi").toLowerCase(), "product_core"],
		[t("context.domainLabels.analyticsReporting").toLowerCase(), "product_core"],
		[t("context.domainLabels.contentDistribution").toLowerCase(), "product_core"],
		[t("context.domainLabels.collaborationAccess").toLowerCase(), "product_core"],
		[t("context.domainLabels.platformFoundation").toLowerCase(), "product_platform"],
		[t("context.domainLabels.internalTools").toLowerCase(), "product_other"],
		[t("context.domainLabels.marketingPresence").toLowerCase(), "product_marketing"],
		[t("context.domainLabels.documentationSupport").toLowerCase(), "product_docs"],
	]);
	const fixedDomains: FeatureDomain[] = [
		{
			name: t("context.domainLabels.coreExperience"),
			description: t("context.domainDescriptions.coreExperience"),
			kind: "product",
		},
		{
			name: t("context.domainLabels.dataIngestion"),
			description: t("context.domainDescriptions.dataIngestion"),
			kind: "product",
		},
		{
			name: t("context.domainLabels.automationAi"),
			description: t("context.domainDescriptions.automationAi"),
			kind: "product",
		},
		{
			name: t("context.domainLabels.analyticsReporting"),
			description: t("context.domainDescriptions.analyticsReporting"),
			kind: "product",
		},
		{
			name: t("context.domainLabels.contentDistribution"),
			description: t("context.domainDescriptions.contentDistribution"),
			kind: "product",
		},
		{
			name: t("context.domainLabels.collaborationAccess"),
			description: t("context.domainDescriptions.collaborationAccess"),
			kind: "product",
		},
		{
			name: t("context.domainLabels.platformFoundation"),
			description: t("context.domainDescriptions.platformFoundation"),
			kind: "technical",
		},
		{
			name: t("context.domainLabels.internalTools"),
			description: t("context.domainDescriptions.internalTools"),
			kind: "internal",
		},
		{
			name: t("context.domainLabels.marketingPresence"),
			description: t("context.domainDescriptions.marketingPresence"),
			kind: "internal",
		},
		{
			name: t("context.domainLabels.documentationSupport"),
			description: t("context.domainDescriptions.documentationSupport"),
			kind: "internal",
		},
	];
	const domainItems = (() => {
		const seen = new Set<string>();
		const normalizedSource = sourceDomains.map((domain) => ({
			...domain,
			name: domain.name.trim(),
		}));
		const items: FeatureDomain[] = fixedDomains.map((domain) => {
			const match = normalizedSource.find(
				(entry) => entry.name.toLowerCase() === domain.name.toLowerCase(),
			);
			seen.add(domain.name.toLowerCase());
			return {
				...domain,
				...match,
				name: domain.name,
				description: match?.description ?? domain.description,
				kind: match?.kind ?? domain.kind,
				hasSignals: Boolean(match),
			};
		});
		normalizedSource.forEach((domain) => {
			const key = domain.name.toLowerCase();
			if (seen.has(key)) return;
			items.push({ ...domain, hasSignals: true });
		});
		return items;
	})();
	const fallbackDomain =
		t("context.otherDomain") ||
		t("forms.options.common.other");
	const featuresByDomain = featureMapItems.reduce(
		(acc, feature) => {
			const domain = feature.domain?.trim() || fallbackDomain;
			if (!acc[domain]) acc[domain] = [];
			acc[domain].push(feature);
			return acc;
		},
		{} as Record<string, FeatureMapItem[]>,
	);
	const domainMap =
		(current?.featureMap?.domainMap as DomainMapLayout | undefined) ??
		undefined;
	const surfaceOrder: SurfaceKey[] = [
		"product_core",
		"product_platform",
		"product_admin",
		"product_marketing",
		"product_docs",
		"product_other",
	];
	const resolveDomainSurface = (domain: FeatureDomain): SurfaceKey => {
		const key = domain.name.toLowerCase();
		const mapped = domainSurfaceMap.get(key);
		if (mapped) return mapped;
		if (domain.kind === "technical") return "product_platform";
		if (domain.kind === "internal") return "product_other";
		return "product_core";
	};
	const domainsBySurface = surfaceOrder
		.map((surface) => ({
			surface,
			domains: domainItems.filter(
				(domain) => resolveDomainSurface(domain) === surface,
			),
		}))
		.filter((group) => group.domains.length > 0);
	const agentStep =
		activeRun?.steps?.length
			? activeRun.steps[activeRun.steps.length - 1]
			: null;
	const showProgress = isGenerating || activeRun?.status === "running";

	const lastUpdated = current?.createdAt
		? new Date(current.createdAt).toLocaleString()
		: null;

	const qualityScore =
		typeof current?.qualityScore === "number" ? current.qualityScore : null;
	const qualityPercent =
		qualityScore !== null ? Math.round(qualityScore * 100) : null;
	const confidencePercent =
		typeof current?.confidence === "number"
			? `${Math.round(current.confidence * 100)}%`
			: null;
	const ratingData = useQuery(
		api.ai.inferenceLogs.getInferenceRating,
		hasContext && current?.version
			? {
					productId: product._id,
					agentName,
					contextVersion: current.version,
				}
			: "skip",
	);
	const currentRating = ratingData?.rating ?? null;

	const handleGenerate = async () => {
		setIsGenerating(true);
		setError(null);
		try {
			let runId: Id<"agentRuns"> | undefined;
			try {
				const run = await createAgentRun({
					productId: product._id,
					useCase: "product_context_enrichment",
					agentName: "Product Context Agent",
				});
				runId = run.runId;
				setAgentRunId(run.runId);
			} catch {
				setAgentRunId(null);
			}

			const result = await generateContext({
				productId: product._id,
				threadId: threadId ?? undefined,
				forceRefresh: !!current,
				debugUi,
				agentRunId: runId,
			});
			if (result?.agentRunId) {
				setAgentRunId(result.agentRunId as Id<"agentRuns">);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.unknown"));
		} finally {
			setIsGenerating(false);
		}
	};

	const handleRating = async (rating: "up" | "down") => {
		if (!current?.version) return;
		setIsRating(true);
		try {
			await rateInference({
				productId: product._id,
				agentName,
				contextVersion: current.version,
				rating,
			});
			toast.success(
				currentRating === rating
					? t("context.ratingRemoved")
					: t("context.ratingSaved"),
			);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t("errors.unknown"));
		} finally {
			setIsRating(false);
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<CardTitle className="text-fontSize-lg">{t("context.title")}</CardTitle>
					<p className="text-fontSize-sm text-muted-foreground">
						{hasContext
							? t("context.subtitleExisting", { date: lastUpdated ?? "-" })
							: t("context.subtitleEmpty")}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Sheet open={openSheet} onOpenChange={setOpenSheet}>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<SheetTrigger asChild>
										<Button variant="outline" size="icon">
											<Clock className="h-4 w-4" />
										</Button>
									</SheetTrigger>
								</TooltipTrigger>
								<TooltipContent side="bottom" sideOffset={8}>
									{t("context.technicalDetails")}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<SheetContent side="right" className="w-[520px] max-w-full">
							<SheetHeader>
								<SheetTitle>{t("context.technicalDetails")}</SheetTitle>
							</SheetHeader>
							<div className="mt-4 space-y-6">
								<div className="space-y-2">
									<div className="text-fontSize-sm font-medium">
										{t("context.executionDetails")}
									</div>
									<div className="space-y-1 text-fontSize-xs text-muted-foreground">
										<div>
											{t("context.lastGenerated", {
												date: lastUpdated ?? "-",
											})}
										</div>
										<div>
											{t("context.modelInfo", {
												provider: current?.provider ?? "-",
												model: current?.model ?? "-",
											})}
										</div>
										{current?.language && (
											<div>
												{t("context.language", { lang: current.language })}
											</div>
										)}
										{confidencePercent && (
											<div>
												{t("context.confidenceValue", {
													value: confidencePercent,
												})}
											</div>
										)}
										{qualityScore !== null && (
											<div>
												{t("context.qualityScore", {
													score: qualityPercent,
												})}
											</div>
										)}
										{threadId && (
											<div className="break-all">
												{t("context.threadId")}: {threadId}
											</div>
										)}
									</div>
								</div>

								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<div className="text-fontSize-sm font-medium">
											{t("context.debugStepsTitle")}
										</div>
										<Button
											variant="outline"
											size="sm"
											className="gap-2"
											onClick={async () => {
												const steps = agentRun?.steps ?? [];
												const payload = steps
													.map((step) => {
														const time = new Date(
															step.timestamp,
														).toLocaleTimeString();
														return `[${time}] ${step.status.toUpperCase()} ${step.step}`;
													})
													.join("\n");
												try {
													if (!navigator.clipboard) {
														throw new Error(
															t("context.debugStepsCopyError"),
														);
													}
													await navigator.clipboard.writeText(payload);
													toast.success(t("context.debugStepsCopied"));
												} catch (copyError) {
													toast.error(
														copyError instanceof Error
															? copyError.message
															: t("context.debugStepsCopyError"),
													);
												}
											}}
											disabled={!agentRun?.steps?.length}
										>
											<Copy className="h-4 w-4" />
											{t("context.debugStepsCopy")}
										</Button>
									</div>
									<div className="space-y-2 text-fontSize-xs text-muted-foreground">
										{activeRun?.steps?.length ? (
											activeRun.steps.map((step, index) => (
												<div
													key={`${step.timestamp}-${index}`}
													className="space-y-1"
												>
													<div className="flex gap-2">
														<span className="text-muted-foreground">
															{new Date(step.timestamp).toLocaleTimeString()}
														</span>
														<span className="font-medium text-foreground">
															{step.status.toUpperCase()}
														</span>
														<span>{step.step}</span>
													</div>
													{step.metadata && (
														<pre className="bg-muted p-2 rounded-md text-[11px] whitespace-pre-wrap overflow-auto max-h-40">
															{JSON.stringify(step.metadata, null, 2)}
														</pre>
													)}
												</div>
											))
										) : (
											<p>{t("context.debugStepsEmpty")}</p>
										)}
									</div>
								</div>

								<div className="space-y-2">
									<div className="text-fontSize-sm font-medium">
										{t("context.historyTitle")}
									</div>
									<HistoryList current={current} history={history} />
								</div>

								<div className="space-y-2">
									<div className="text-fontSize-sm font-medium">
										{t("context.rawTitle")}
									</div>
									<pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[70vh] whitespace-pre-wrap">
										{JSON.stringify(current, null, 2)}
									</pre>
								</div>

								{isAdmin && (
									<div className="space-y-2">
										<div className="text-fontSize-sm font-medium">
											{t("context.debugPrompt")}
										</div>
										<div className="flex items-center gap-2 rounded-md border border-border px-2 py-2">
											<Label
												htmlFor="debug-prompt"
												className="text-fontSize-xs text-muted-foreground"
											>
												{t("context.debugPromptHelp")}
											</Label>
											<Switch
												id="debug-prompt"
												checked={debugUi}
												onCheckedChange={setDebugUi}
												disabled={isGenerating}
											/>
										</div>
									</div>
								)}
							</div>
						</SheetContent>
					</Sheet>
					<Button
						variant={hasContext ? "secondary" : "default"}
						onClick={handleGenerate}
						disabled={isGenerating}
					>
						{isGenerating ? (
							<div className="flex items-center gap-2">
								<span className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full inline-block animate-spin" />
								<span>{t("context.generating")}</span>
							</div>
						) : hasContext ? (
							t("context.regenerate")
						) : (
							t("context.generate")
						)}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && (
					<p className="text-sm text-destructive">{error}</p>
				)}
				{!hasSources && !isLoading && (
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.noSources")}
					</p>
				)}

				{hasContext ? (
					<>
						{showProgress && (
							<div className="flex items-center gap-2 text-fontSize-sm text-muted-foreground">
								<span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
								<span>
									{agentStep?.step
										? t("context.progressStep", { step: agentStep.step })
										: t("context.progressRunning")}
								</span>
							</div>
						)}

						<SurfaceDomainMapList
							title={t("context.productDomains")}
							groups={domainsBySurface}
							emptyLabel={t("context.domainsEmpty")}
						/>
						<SurfaceFeatureGroupList
							title={t("context.productFeatures")}
							domains={domainItems}
							featuresByDomain={featuresByDomain}
							resolveDomainSurface={resolveDomainSurface}
							surfaceOrder={surfaceOrder}
							emptyLabel={t("context.featuresEmpty")}
							otherLabel={fallbackDomain}
						/>
						<SourceStructureList
							title={t("context.sourceStructure")}
							items={sourceContexts as SourceContextEntry[]}
							emptyLabel={t("context.sourceStructureEmpty")}
						/>
						<TagList
							title={t("context.technicalStack")}
							items={current?.technicalStack}
						/>

						{hasContext && current?.version !== undefined && (
							<div className="flex items-center gap-3 text-fontSize-sm text-muted-foreground">
								<span>{t("context.ratingLabel")}</span>
								<div className="flex items-center gap-1">
									<Button
										type="button"
										variant={currentRating === "up" ? "secondary" : "outline"}
										size="icon"
										onClick={() => handleRating("up")}
										disabled={isGenerating || isRating}
										aria-label={t("context.ratingUp")}
									>
										<ThumbsUp className="h-4 w-4" />
									</Button>
									<Button
										type="button"
										variant={currentRating === "down" ? "secondary" : "outline"}
										size="icon"
										onClick={() => handleRating("down")}
										disabled={isGenerating || isRating}
										aria-label={t("context.ratingDown")}
									>
										<ThumbsDown className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}
					</>
				) : (
					<div className="text-fontSize-sm text-muted-foreground">
						{t("context.empty")}
					</div>
				)}

			</CardContent>
		</Card>
	);
}

function DetailList({
	title,
	items,
	condensed = false,
}: {
	title: string;
	items?: Array<{ name: string; description?: string }>;
	condensed?: boolean;
}) {
	if (!items || items.length === 0) return null;

	return (
		<div className="space-y-2">
			{!condensed && (
				<h4 className="text-fontSize-sm font-medium">{title}</h4>
			)}
			<div className="space-y-2">
				{items.map((item) => (
					<div key={item.name} className="rounded-md border border-border p-2">
						<div className="text-fontSize-sm font-medium">{item.name}</div>
						{item.description && (
							<p className="text-fontSize-xs text-muted-foreground mt-1">
								{item.description}
							</p>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

function SurfaceDomainMapList({
	title,
	groups,
	emptyLabel,
}: {
	title: string;
	groups: Array<{ surface: SurfaceKey; domains: FeatureDomain[] }>;
	emptyLabel?: string;
}) {
	const { t } = useTranslation("products");
	const hasDomains = groups.some((group) => group.domains.length > 0);
	if (!hasDomains) {
		return emptyLabel ? (
			<div className="space-y-2">
				<h4 className="text-fontSize-sm font-medium">{title}</h4>
				<p className="text-fontSize-sm text-muted-foreground">{emptyLabel}</p>
			</div>
		) : null;
	}

	return (
		<div className="space-y-4">
			<h4 className="text-fontSize-sm font-medium">{title}</h4>
			<div className="space-y-4">
				{groups.map((group) => (
					<div key={group.surface} className="space-y-2">
						<div className="text-fontSize-xs uppercase tracking-wide text-muted-foreground">
							{t(`context.surfaceLabels.${group.surface}`)}
						</div>
						<DomainList domains={group.domains} />
					</div>
				))}
			</div>
		</div>
	);
}

function DomainList({
	domains,
}: {
	domains: FeatureDomain[];
}) {
	const { t } = useTranslation("products");
	const domainLookup = new Map(domains.map((domain) => [domain.name, domain]));

	return (
		<div className="grid gap-2 sm:grid-cols-2">
			{domains.map((domain, index) => {
				const kind = domain.kind;
				const className =
					kind === "technical"
						? "bg-muted/50"
						: kind === "internal"
							? "bg-muted/60"
								: "bg-muted/30";
				const isMissingSignals = domain.hasSignals === false;
				return (
					<div
						key={`${domain.name}-${index}`}
						className={`rounded-md border border-border p-3 flex flex-col justify-between min-h-0 ${className} ${isMissingSignals ? "border-dashed opacity-70" : ""}`}
					>
						<div className="space-y-1">
							<div className="text-fontSize-sm font-semibold line-clamp-2">
								{domain.name}
							</div>
							{domain.description && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<p className="text-fontSize-xs text-muted-foreground line-clamp-2">
												{domain.description}
											</p>
										</TooltipTrigger>
										<TooltipContent className="max-w-xs">
											{domain.description}
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
							{domain.hasSignals === false && (
								<p className="text-fontSize-xs text-muted-foreground">
									{t("context.domainNoSignals")}
								</p>
							)}
						</div>
						{kind && (
							<div className="text-fontSize-xs text-muted-foreground uppercase tracking-wide truncate">
								{t(`context.domainKind.${kind}`)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

function SurfaceFeatureGroupList({
	title,
	domains,
	featuresByDomain,
	resolveDomainSurface,
	surfaceOrder,
	emptyLabel,
	otherLabel,
}: {
	title: string;
	domains?: FeatureDomain[];
	featuresByDomain: Record<string, FeatureMapItem[]>;
	resolveDomainSurface: (domain: FeatureDomain) => SurfaceKey;
	surfaceOrder: SurfaceKey[];
	emptyLabel?: string;
	otherLabel: string;
}) {
	const { t } = useTranslation("products");
	const orderedDomains =
		domains?.map((domain) => domain.name) ?? Object.keys(featuresByDomain);
	const remainingDomains = Object.keys(featuresByDomain).filter(
		(domain) => !orderedDomains.includes(domain),
	);
	const allDomains = [...orderedDomains, ...remainingDomains];
	const hasFeatures = Object.values(featuresByDomain).some(
		(features) => features.length > 0,
	);

	if (!hasFeatures) {
		return emptyLabel ? (
			<div className="space-y-2">
				<h4 className="text-fontSize-sm font-medium">{title}</h4>
				<p className="text-fontSize-sm text-muted-foreground">{emptyLabel}</p>
			</div>
		) : null;
	}

	const domainLookup = new Map(
		(domains ?? []).map((domain) => [domain.name, domain]),
	);
	const domainsBySurface = surfaceOrder
		.map((surface) => ({
			surface,
			domains: allDomains.filter((domainName) => {
				const domain = domainLookup.get(domainName) ?? {
					name: domainName,
				};
				return resolveDomainSurface(domain) === surface;
			}),
		}))
		.filter((group) => group.domains.length > 0);

	return (
		<div className="space-y-4">
			<h4 className="text-fontSize-sm font-medium">{title}</h4>
			{domainsBySurface.map((group) => {
				const visibleDomains = group.domains.filter((domainName) => {
					const features = featuresByDomain[domainName] ?? [];
					return features.length > 0 || domainName === otherLabel;
				});
				if (!visibleDomains.length) return null;
				return (
					<div key={group.surface} className="space-y-2">
						<div className="text-fontSize-xs uppercase tracking-wide text-muted-foreground">
							{t(`context.surfaceLabels.${group.surface}`)}
						</div>
						{visibleDomains.map((domainName) => {
							const features = featuresByDomain[domainName] ?? [];
							if (!features.length && domainName !== otherLabel) return null;
							return (
								<div key={domainName} className="space-y-2">
									<div className="text-fontSize-sm font-semibold">
										{domainName}
									</div>
									<div className="grid gap-2 md:grid-cols-2">
										{features.map((feature) => (
											<div
												key={feature.id ?? feature.name}
												className="rounded-md border border-border p-3"
											>
												<div className="flex items-center justify-between gap-2">
													<div className="text-fontSize-sm font-medium">
														{feature.name}
													</div>
													{feature.visibilityHint && (
														<Badge variant="secondary">
															{feature.visibilityHint}
														</Badge>
													)}
												</div>
												{feature.description && (
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<p className="text-fontSize-xs text-muted-foreground mt-1 line-clamp-2">
																	{feature.description}
																</p>
															</TooltipTrigger>
															<TooltipContent className="max-w-xs">
																{feature.description}
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												)}
											</div>
										))}
									</div>
								</div>
							);
						})}
					</div>
				);
			})}
		</div>
	);
}

function TagList({
	title,
	items,
}: {
	title: string;
	items?: string[];
}) {
	if (!items || items.length === 0) return null;

	return (
		<div className="space-y-2">
			<h4 className="text-fontSize-sm font-medium">{title}</h4>
			<div className="flex flex-wrap gap-2">
				{items.map((item) => (
					<Badge key={item} variant="secondary">
						{item}
					</Badge>
				))}
			</div>
		</div>
	);
}

function SourceStructureList({
	title,
	items,
	emptyLabel,
}: {
	title: string;
	items?: SourceContextEntry[];
	emptyLabel?: string;
}) {
	const { t } = useTranslation("products");
	if (!items || items.length === 0) {
		return emptyLabel ? (
			<div className="space-y-2">
				<h4 className="text-fontSize-sm font-medium">{title}</h4>
				<p className="text-fontSize-sm text-muted-foreground">{emptyLabel}</p>
			</div>
		) : null;
	}

	return (
		<div className="space-y-2">
			<h4 className="text-fontSize-sm font-medium">{title}</h4>
			<div className="space-y-3">
				{items.map((item) => {
					const summary = item.structure?.summary ?? item.structure ?? {};
					const surfaceBuckets = Array.isArray(summary.surfaceMap?.buckets)
						? summary.surfaceMap.buckets
						: [];
					const displayClassification =
						deriveSourceClassification(surfaceBuckets, item.classification) ??
						item.classification ??
						"unknown";
					const classificationLabel = t(
						`context.sourceClassification.${displayClassification}`,
						displayClassification.replace(/_/g, " "),
					);
					const appPaths = Array.isArray(summary.appPaths)
						? summary.appPaths
						: [];
					const packagePaths = Array.isArray(summary.packagePaths)
						? summary.packagePaths
						: [];

					return (
						<div key={item.sourceId} className="rounded-md border border-border p-3">
							<div className="flex items-center justify-between">
								<div className="text-fontSize-sm font-medium">{item.sourceId}</div>
								{item.classification && (
									<Badge variant="secondary">
										{classificationLabel}
									</Badge>
								)}
							</div>
							{item.notes && (
								<p className="text-fontSize-xs text-muted-foreground mt-1">
									{item.notes}
								</p>
							)}
							{appPaths.length > 0 && (
								<div className="mt-2 space-y-1">
									<div className="text-fontSize-xs text-muted-foreground">
										{t("context.sourceApps")}
									</div>
									<div className="flex flex-wrap gap-2">
										{appPaths.map((path) => (
											<Badge key={path} variant="outline">
												{path}
											</Badge>
										))}
									</div>
								</div>
							)}
							{surfaceBuckets.length > 0 ? (
								<div className="mt-2 space-y-1">
									<div className="text-fontSize-xs text-muted-foreground">
										{t("context.sourceSurfaces")}
									</div>
									<div className="flex flex-wrap gap-2">
										{surfaceBuckets.map(
											(bucket: { name: string; count: number }) => (
												<Badge key={bucket.name} variant="outline">
													{t(
														`context.surfaceLabels.${bucket.name}`,
														bucket.name.replace(/_/g, " "),
													)}{" "}
													· {bucket.count}
												</Badge>
											),
										)}
									</div>
								</div>
							) : null}
							{packagePaths.length > 0 && (
								<div className="mt-2 space-y-1">
									<div className="text-fontSize-xs text-muted-foreground">
										{t("context.sourcePackages")}
									</div>
									<div className="flex flex-wrap gap-2">
										{packagePaths.map((path) => (
											<Badge key={path} variant="outline">
												{path}
											</Badge>
										))}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function deriveSourceClassification(
	buckets: Array<{ name: string; count: number }>,
	current?: string,
): string | null {
	if (!buckets.length) return current ?? null;
	const names = buckets.map((bucket) => bucket.name);
	const has = (name: string) => names.includes(name);

	if (has("product_core")) {
		const extra = names.filter(
			(name) => name !== "product_core" && name !== "product_platform",
		);
		return extra.length ? "mixed" : "product_core";
	}
	if (has("product_marketing")) return "marketing_surface";
	if (has("product_docs")) return "docs";
	if (has("product_platform")) return "infra";
	if (has("product_admin")) return "mixed";
	if (has("product_other")) return "unknown";

	return current ?? null;
}

function HistoryList({
	current,
	history,
}: {
	current?: ProductContextEntry;
	history: ProductContextEntry[];
}) {
	const { t } = useTranslation("products");
	const entries: ProductContextEntry[] = [
		...(current ? [{ ...current }] : []),
		...history.slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
	];

	if (entries.length === 0) {
		return <p className="text-fontSize-sm text-muted-foreground">{t("context.historyEmpty")}</p>;
	}

	return (
		<div className="space-y-3">
			{entries.map((entry) => (
				<div key={`${entry.version}-${entry.createdAt}`} className="border border-border rounded-md p-3">
					<div className="flex flex-wrap items-center gap-2 text-fontSize-sm">
						<Badge variant="secondary">
							{t("context.version", { version: entry.version ?? "?" })}
						</Badge>
						<span className="text-muted-foreground">
							{entry.createdAt
								? new Date(entry.createdAt).toLocaleString()
								: t("common.unknown")}
						</span>
						{entry.model && (
							<span className="text-muted-foreground">
								{t("context.modelInfo", {
									provider: entry.provider ?? "-",
									model: entry.model,
								})}
							</span>
						)}
					</div>
					{entry.description && (
						<p className="text-fontSize-sm mt-1">{entry.description}</p>
					)}
				</div>
			))}
		</div>
	);
}
