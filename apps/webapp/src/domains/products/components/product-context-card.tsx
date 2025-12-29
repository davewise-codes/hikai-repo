import { useMemo, useState } from "react";
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
	Separator,
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	Switch,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	TooltipProvider,
	toast,
	ChevronDown,
	Copy,
	ThumbsDown,
	ThumbsUp,
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
	keyFeatures?: Array<{ name: string; description?: string }>;
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
	}>;
	confidence?: number;
	qualityScore?: number;
};

type ProductContextCardProps = {
	product: {
		_id: Id<"products">;
		name: string;
		userRole?: "admin" | "member";
		productContext?: {
			current?: ProductContextEntry;
			history?: ProductContextEntry[];
		};
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
	const [debugOpen, setDebugOpen] = useState(true);
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

	const current = product.productContext?.current;
	const history = product.productContext?.history ?? [];
	const agentName = "Product Context Agent";
	const threadId = current?.threadId;
	const hasContext = !!current;
	const isAdmin = product.userRole === "admin";
	const hasSources =
		(current?.sourcesUsed ?? []).filter((s) => s !== "baseline").length > 0 ||
		(!hasContext && (connections?.length ?? 0) > 0);

	const lastUpdated = current?.createdAt
		? new Date(current.createdAt).toLocaleString()
		: null;

	const sources = current?.sourcesUsed ?? [];
	const qualityScore =
		typeof current?.qualityScore === "number" ? current.qualityScore : null;
	const qualityPercent =
		qualityScore !== null ? Math.round(qualityScore * 100) : null;
	const qualityVariant =
		qualityScore !== null && qualityScore < 0.5
			? "destructive"
			: qualityScore !== null && qualityScore < 0.75
				? "secondary"
				: "default";
	const qualityLabel =
		qualityScore !== null && qualityScore < 0.5
			? t("context.qualityLow")
			: t("context.qualityScore", { score: qualityPercent });

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

	const summaryFields = useMemo(
		() => [
			{ label: t("context.valueProposition"), value: current?.valueProposition },
			{ label: t("context.targetMarket"), value: current?.targetMarket },
			{ label: t("context.productCategory"), value: current?.productCategory },
			{ label: t("context.productType"), value: current?.productType },
			{ label: t("context.businessModel"), value: current?.businessModel },
			{ label: t("context.stage"), value: current?.stage },
			{ label: t("context.releaseCadence"), value: current?.releaseCadence },
			{ label: t("context.maturity"), value: current?.maturity },
		],
		[current, t],
	);

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
				<div className="flex flex-wrap gap-2">
					{sources.length > 0 && (
						<div className="flex items-center gap-1">
							<span className="text-fontSize-xs text-muted-foreground">
								{t("context.sources")}
							</span>
							<div className="flex gap-1">
								{sources.map((src) => (
									<Badge key={src} variant="secondary">
										{src}
									</Badge>
								))}
							</div>
						</div>
					)}
					<div className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Label
										htmlFor="debug-prompt"
										className="text-fontSize-xs text-muted-foreground cursor-help"
									>
										{t("context.debugPrompt")}
									</Label>
								</TooltipTrigger>
								<TooltipContent className="max-w-xs">
									{t("context.debugPromptHelp")}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<Switch
							id="debug-prompt"
							checked={debugUi}
							onCheckedChange={setDebugUi}
							disabled={isGenerating}
						/>
					</div>
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
						<div className="flex flex-wrap items-center gap-2 text-fontSize-sm text-muted-foreground">
							<span>
								{t("context.lastGenerated", { date: lastUpdated ?? "-" })}
							</span>
							<Separator orientation="vertical" className="h-4" />
							<span>
								{t("context.modelInfo", {
									provider: current?.provider ?? "-",
									model: current?.model ?? "-",
								})}
							</span>
							{qualityScore !== null && (
								<>
									<Separator orientation="vertical" className="h-4" />
									<Badge variant={qualityVariant}>{qualityLabel}</Badge>
								</>
							)}
							{hasContext && current?.version !== undefined && (
								<>
									<Separator orientation="vertical" className="h-4" />
									<div className="flex items-center gap-2">
										<span className="text-fontSize-xs text-muted-foreground">
											{t("context.ratingLabel")}
										</span>
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
								</>
							)}
							{current?.language && (
								<>
									<Separator orientation="vertical" className="h-4" />
									<span>
										{t("context.language", { lang: current.language })}
									</span>
								</>
							)}
							{threadId && (
								<>
									<Separator orientation="vertical" className="h-4" />
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="underline decoration-dotted cursor-help">
													{t("context.threadId")}
												</span>
											</TooltipTrigger>
											<TooltipContent className="max-w-xs break-words">
												{threadId}
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</>
							)}
						</div>

						<Tabs defaultValue="summary">
							<TabsList>
								<TabsTrigger value="summary">{t("context.tabs.summary")}</TabsTrigger>
								<TabsTrigger value="history">{t("context.tabs.history")}</TabsTrigger>
							</TabsList>
							<TabsContent value="summary" className="pt-4 space-y-4">
								<SummarySection
									title={t("context.identity")}
									items={summaryFields}
								/>
								<DetailList
									title={t("context.keyFeatures")}
									items={current?.keyFeatures}
								/>
								<DetailList
									title={t("context.recommendedFocus")}
									items={current?.recommendedFocus}
								/>
								<DetailList
									title={t("context.risks")}
									items={current?.risks}
								/>
								<DetailList
									title={t("context.notableEvents")}
									items={current?.notableEvents?.map((event) => ({
										name: event.summary,
										description: [
											event.type,
											event.source,
											event.occurredAt
												? new Date(event.occurredAt).toLocaleDateString()
												: null,
											event.rawEventId ? `rawEventId: ${event.rawEventId}` : null,
										]
											.filter(Boolean)
											.join(" • "),
									}))}
								/>
							</TabsContent>
							<TabsContent value="history" className="pt-4">
								<HistoryList current={current} history={history} />
							</TabsContent>
						</Tabs>
					</>
				) : (
					<div className="text-fontSize-sm text-muted-foreground">
						{t("context.empty")}
					</div>
				)}

				{isAdmin && (
					<div className="rounded-md border border-border">
						<div className="flex items-center justify-between px-3 py-2">
							<Button
								variant="ghost"
								className="flex items-center gap-2 px-2"
								onClick={() => setDebugOpen((prev) => !prev)}
							>
								<ChevronDown
									className={`h-4 w-4 transition-transform ${
										debugOpen ? "rotate-180" : ""
									}`}
								/>
								<span className="text-fontSize-sm">
									{t("context.debugStepsTitle")}
								</span>
								{agentRun?.status && (
									<Badge variant="secondary">{agentRun.status}</Badge>
								)}
							</Button>
							<Button
								variant="outline"
								className="gap-2"
								onClick={async () => {
									const steps = agentRun?.steps ?? [];
									const payload = steps
										.map((step) => {
											const time = new Date(step.timestamp).toLocaleTimeString();
											return `[${time}] ${step.status.toUpperCase()} ${step.step}`;
										})
										.join("\n");
									try {
										if (!navigator.clipboard) {
											throw new Error(t("context.debugStepsCopyError"));
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
						{debugOpen && (
							<div className="border-t border-border px-3 py-2">
								{agentRun?.steps?.length ? (
									<div className="space-y-2 text-fontSize-xs text-muted-foreground">
										{agentRun.steps.map((step, index) => (
											<div key={`${step.timestamp}-${index}`} className="flex gap-2">
												<span className="text-muted-foreground">
													{new Date(step.timestamp).toLocaleTimeString()}
												</span>
												<span className="font-medium text-foreground">
													{step.status.toUpperCase()}
												</span>
												<span>{step.step}</span>
											</div>
										))}
									</div>
								) : (
									<p className="text-fontSize-xs text-muted-foreground">
										{t("context.debugStepsEmpty")}
									</p>
								)}
							</div>
						)}
					</div>
				)}

				{hasContext && (
					<Sheet open={openSheet} onOpenChange={setOpenSheet}>
						<SheetTrigger asChild>
							<Button variant="outline">{t("context.viewRaw")}</Button>
						</SheetTrigger>
						<SheetContent side="right" className="w-[520px] max-w-full">
							<SheetHeader>
								<SheetTitle>{t("context.rawTitle")}</SheetTitle>
							</SheetHeader>
							<div className="mt-4">
								<pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[70vh] whitespace-pre-wrap">
									{JSON.stringify(current, null, 2)}
								</pre>
							</div>
						</SheetContent>
					</Sheet>
				)}
			</CardContent>
		</Card>
	);
}

function SummarySection({
	title,
	items,
}: {
	title: string;
	items: Array<{ label: string; value?: string | null | undefined }>;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<h4 className="text-fontSize-sm font-medium">{title}</h4>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{items.map((item) => (
					<div key={item.label} className="space-y-1">
						<p className="text-fontSize-xs text-muted-foreground">{item.label}</p>
						<p className="text-fontSize-sm">
							{item.value && item.value.trim().length > 0
								? item.value
								: "—"}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}

function DetailList({
	title,
	items,
}: {
	title: string;
	items?: Array<{ name: string; description?: string }>;
}) {
	if (!items || items.length === 0) return null;

	return (
		<div className="space-y-2">
			<h4 className="text-fontSize-sm font-medium">{title}</h4>
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
