import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useQuery } from "convex/react";
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
	Clock,
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	toast,
} from "@hikai/ui";
import { AgentProgress } from "./agent-progress";

type ProductContextCardProps = {
	product: {
		_id: Id<"products">;
		name: string;
		userRole?: "admin" | "member";
	};
};

type AgentRunStep = {
	step: string;
	status: "info" | "success" | "warn" | "error";
	timestamp: number;
	metadata?: Record<string, unknown>;
};

type SurfaceKey =
	| "management"
	| "design"
	| "product_front"
	| "platform"
	| "marketing"
	| "admin"
	| "docs";

type SurfaceSignalRun = {
	_id: Id<"surfaceSignalRuns">;
	createdAt: number;
	rawOutputFileId?: Id<"_storage">;
	steps?: AgentRunStep[];
	sources?: Array<{
		sourceType: string;
		sourceId: string;
		sourceLabel: string;
		surfaces: Array<{
			surface: SurfaceKey;
			bucketId: string;
			evidence?: string[];
		}>;
	}>;
	sourcesCount?: number;
	hasRaw?: boolean;
};

type ContextInputRun = {
	_id: Id<"contextInputRuns">;
	createdAt: number;
	rawOutputFileId?: Id<"_storage">;
	steps?: AgentRunStep[];
	rawOutput?: string;
	summary?: {
		uiSitemapCount?: number;
		userFlowsCount?: number;
		businessEntityCount?: number;
		businessRelationshipCount?: number;
		repoCount?: number;
	};
	hasRaw?: boolean;
};

const SURFACE_KEYS: SurfaceKey[] = [
	"management",
	"design",
	"product_front",
	"platform",
	"marketing",
	"admin",
	"docs",
];

const DOMAIN_MAP_USE_CASE = "domain_map";

export function ProductContextCard({ product }: ProductContextCardProps) {
	const { t } = useTranslation("products");
	const generateDomainMap = useAction(api.agents.domainMap.generateDomainMap);
	const [agentRunId, setAgentRunId] = useState<Id<"agentRuns"> | null>(null);
	const [isDomainMapRunning, setIsDomainMapRunning] = useState(false);
	const [domainMapError, setDomainMapError] = useState<string | null>(null);
	const [triggerStartedAt, setTriggerStartedAt] = useState<number | null>(null);
	const { connections, isLoading } = useConnections(product._id);

	const agentRun = useQuery(
		api.agents.agentRuns.getRunById,
		agentRunId
			? {
					productId: product._id,
					runId: agentRunId,
				}
			: "skip",
	);
	const latestRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		{
			productId: product._id,
			useCase: DOMAIN_MAP_USE_CASE,
		},
	);
	const activeRun = agentRunId
		? agentRun
		: latestRun && triggerStartedAt
			? latestRun.startedAt >= triggerStartedAt
				? latestRun
				: null
			: latestRun;

	const latestSurfaceRun = useQuery(
		api.agents.surfaceSignals.getLatestSurfaceSignalRun,
		{ productId: product._id },
	) as SurfaceSignalRun | null | undefined;
	const latestContextInputsRun = useQuery(
		api.agents.contextInputs.getLatestContextInputRun,
		{ productId: product._id },
	) as ContextInputRun | null | undefined;
	const contextInputsHistory =
		(useQuery(api.agents.contextInputs.listContextInputRuns, {
			productId: product._id,
			limit: 20,
		}) as ContextInputRun[] | undefined) ?? [];
	const surfaceRunHistory =
		(useQuery(api.agents.surfaceSignals.listSurfaceSignalRuns, {
			productId: product._id,
			limit: 20,
		}) as SurfaceSignalRun[] | undefined) ?? [];

	const surfaceRows = useMemo(() => {
		const map = new Map<SurfaceKey, Array<{ sourceLabel: string; bucketId: string }>>();
		SURFACE_KEYS.forEach((surface) => map.set(surface, []));

		if (latestSurfaceRun?.sources) {
			for (const source of latestSurfaceRun.sources) {
				for (const surface of source.surfaces ?? []) {
					const entry = map.get(surface.surface) ?? [];
					entry.push({
						sourceLabel: source.sourceLabel,
						bucketId: surface.bucketId,
					});
					map.set(surface.surface, entry);
				}
			}
		}

		return SURFACE_KEYS.map((surface) => {
			const items = (map.get(surface) ?? []).sort((a, b) =>
				a.sourceLabel.localeCompare(b.sourceLabel),
			);
			return { surface, items };
		});
	}, [latestSurfaceRun]);

	const contextSummaryRows = useMemo(() => {
		const uiCount = latestContextInputsRun?.summary?.uiSitemapCount ?? 0;
		const flowCount = latestContextInputsRun?.summary?.userFlowsCount ?? 0;
		const entityCount = latestContextInputsRun?.summary?.businessEntityCount ?? 0;
		const relationCount =
			latestContextInputsRun?.summary?.businessRelationshipCount ?? 0;
		const repoCount = latestContextInputsRun?.summary?.repoCount ?? 0;

		return [
			{
				label: t("context.inputs.uiSitemap"),
				value: t("context.inputs.uiSitemapSummary", { count: uiCount }),
			},
			{
				label: t("context.inputs.userFlows"),
				value: t("context.inputs.userFlowsSummary", { count: flowCount }),
			},
			{
				label: t("context.inputs.businessModel"),
				value: t("context.inputs.businessModelSummary", {
					entities: entityCount,
					relationships: relationCount,
				}),
			},
			{
				label: t("context.inputs.repoTopology"),
				value: t("context.inputs.repoTopologySummary", { count: repoCount }),
			},
		];
	}, [latestContextInputsRun, t]);

	const showAgentProgress = Boolean(activeRun);
	const isRunActive = activeRun?.status === "running";
	const hasSources = (connections?.length ?? 0) > 0;

	const handleGenerateDomainMap = async () => {
		setIsDomainMapRunning(true);
		setDomainMapError(null);
		setAgentRunId(null);
		setTriggerStartedAt(Date.now());
		try {
			const result = await generateDomainMap({ productId: product._id });
			if (result?.runId) {
				setAgentRunId(result.runId as Id<"agentRuns">);
			} else {
				setAgentRunId(null);
			}
			toast.success(t("context.domainMapGenerateSuccess"));
		} catch (err) {
			const message = err instanceof Error ? err.message : t("errors.unknown");
			setDomainMapError(message);
			toast.error(t("context.domainMapGenerateError"));
		} finally {
			setIsDomainMapRunning(false);
		}
	};

	useEffect(() => {
		return () => {
			setAgentRunId(null);
		};
	}, []);

	return (
		<Card>
			<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<CardTitle className="text-fontSize-lg">
						{t("context.title")}
					</CardTitle>
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.surfaceSignalsSubtitle")}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Sheet>
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
									{t("context.surfaceSignalsHistoryTitle")}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<SheetContent side="right" className="w-[520px] max-w-full">
							<SheetHeader>
								<SheetTitle>
									{t("context.surfaceSignalsHistoryTitle")}
								</SheetTitle>
							</SheetHeader>
							<div className="mt-4 space-y-4">
								{surfaceRunHistory.length === 0 ? (
									<p className="text-fontSize-sm text-muted-foreground">
										{t("context.surfaceSignalsHistoryEmpty")}
									</p>
								) : (
									surfaceRunHistory.map((run) => (
										<div
											key={run._id}
											className="rounded-md border border-border p-3"
										>
											<div className="text-fontSize-sm font-medium">
												{new Date(run.createdAt).toLocaleString()}
											</div>
											<div className="text-fontSize-xs text-muted-foreground">
												{t("context.surfaceSignalsHistorySources", {
													count: run.sourcesCount ?? run.sources?.length ?? 0,
												})}
											</div>
											{run.steps?.length ? (
												<div className="mt-3 space-y-2">
													<div className="text-fontSize-xs font-medium text-muted-foreground">
														{t("context.surfaceSignalsHistorySteps")}
													</div>
													<div className="space-y-1">
														{run.steps.map((step, index) => (
															<div
																key={`${run._id}-${index}`}
																className="flex items-center gap-2 text-fontSize-xs"
															>
																<span className="text-muted-foreground">
																	{new Date(step.timestamp).toLocaleTimeString()}
																</span>
																<span className="text-muted-foreground">
																	·
																</span>
																<span>{step.step}</span>
															</div>
														))}
													</div>
												</div>
											) : null}
												<SurfaceRunRawJson
													productId={product._id}
													runId={run._id}
													hasRaw={Boolean(run.hasRaw)}
												/>
										</div>
									))
								)}
							</div>
							<div className="mt-6 border-t border-border pt-4">
								<div className="text-fontSize-sm font-medium">
									{t("context.inputsHistoryTitle")}
								</div>
								<div className="mt-3 space-y-4">
									{contextInputsHistory.length === 0 ? (
										<p className="text-fontSize-sm text-muted-foreground">
											{t("context.inputsHistoryEmpty")}
										</p>
									) : (
										contextInputsHistory.map((run) => (
											<div
												key={run._id}
												className="rounded-md border border-border p-3"
											>
												<div className="text-fontSize-sm font-medium">
													{new Date(run.createdAt).toLocaleString()}
												</div>
												{run.steps?.length ? (
													<div className="mt-3 space-y-2">
														<div className="text-fontSize-xs font-medium text-muted-foreground">
															{t("context.surfaceSignalsHistorySteps")}
														</div>
														<div className="space-y-1">
															{run.steps.map((step, index) => (
																<div
																	key={`${run._id}-${index}`}
																	className="flex items-center gap-2 text-fontSize-xs"
																>
																	<span className="text-muted-foreground">
																		{new Date(step.timestamp).toLocaleTimeString()}
																	</span>
																	<span className="text-muted-foreground">
																		·
																	</span>
																	<span>{step.step}</span>
																</div>
															))}
														</div>
													</div>
												) : null}
												<ContextRunRawJson
													productId={product._id}
													runId={run._id}
													hasRaw={Boolean(run.hasRaw)}
												/>
											</div>
										))
									)}
								</div>
							</div>
						</SheetContent>
					</Sheet>
					<Button
						variant="outline"
						onClick={handleGenerateDomainMap}
						disabled={isDomainMapRunning}
					>
						{isDomainMapRunning ? (
							<div className="flex items-center gap-2">
								<span className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full inline-block animate-spin" />
								<span>{t("context.domainMapGenerateRunning")}</span>
							</div>
						) : (
							t("context.domainMapGenerate")
						)}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{domainMapError && (
					<p className="text-fontSize-sm text-destructive">
						{domainMapError}
					</p>
				)}
				{!hasSources && !isLoading && (
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.noSources")}
					</p>
				)}
				{showAgentProgress && activeRun ? (
					<AgentProgress productId={product._id} runId={activeRun._id} />
				) : null}
				<SurfaceSignalsTable rows={surfaceRows} />
				<ContextInputsSummary rows={contextSummaryRows} />
			</CardContent>
		</Card>
	);
}

function SurfaceSignalsTable({
	rows,
}: {
	rows: Array<{
		surface: SurfaceKey;
		items: Array<{ sourceLabel: string; bucketId: string }>;
	}>;
}) {
	const { t } = useTranslation("products");
	return (
		<div className="rounded-md border border-border">
			<div className="grid grid-cols-[220px_1fr] border-b border-border text-fontSize-xs text-muted-foreground">
				<div className="px-4 py-2">{t("context.surfaceSignalsHeader")}</div>
				<div className="px-4 py-2">{t("context.surfaceSignalsSources")}</div>
			</div>
			<div className="divide-y divide-border">
				{rows.map((row) => (
					<div key={row.surface} className="grid grid-cols-[220px_1fr]">
						<div className="px-4 py-3 text-fontSize-sm font-medium">
							{t(`context.surfaceSignals.${row.surface}`)}
						</div>
						<div className="px-4 py-3">
							{row.items.length === 0 ? (
								<span className="text-fontSize-sm text-muted-foreground">
									{t("context.surfaceSignalsEmpty")}
								</span>
							) : (
								<div className="flex flex-wrap gap-2">
									{row.items.map((item, index) => (
										<Badge
											key={`${item.sourceLabel}-${item.bucketId}-${index}`}
											variant="outline"
										>
											{item.sourceLabel} · {item.bucketId}
										</Badge>
									))}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function SurfaceRunRawJson({
	productId,
	runId,
	hasRaw,
}: {
	productId: Id<"products">;
	runId: Id<"surfaceSignalRuns">;
	hasRaw: boolean;
}) {
	const { t } = useTranslation("products");
	const [isOpen, setIsOpen] = useState(false);
	const [rawText, setRawText] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const rawUrl = useQuery(
		api.agents.surfaceSignals.getSurfaceSignalRunRaw,
		isOpen ? { productId, runId } : "skip",
	);

	useEffect(() => {
		if (!isOpen || rawText || (!rawUrl?.url && !rawUrl?.raw)) {
			return;
		}
		let isActive = true;
		setIsLoading(true);
		if (rawUrl.url) {
			fetch(rawUrl.url)
				.then((response) => response.text())
				.then((text) => {
					if (isActive) {
						setRawText(text);
					}
				})
				.finally(() => {
					if (isActive) {
						setIsLoading(false);
					}
				});
		} else if (rawUrl.raw) {
			if (isActive) {
				setRawText(rawUrl.raw);
				setIsLoading(false);
			}
		}
		return () => {
			isActive = false;
		};
	}, [isOpen, rawText, rawUrl?.raw, rawUrl?.url]);

	useEffect(() => {
		if (!rawText) {
			setDownloadUrl(null);
			return;
		}
		const blob = new Blob([rawText], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		setDownloadUrl(url);
		return () => {
			URL.revokeObjectURL(url);
		};
	}, [rawText]);

	if (!hasRaw) {
		return null;
	}

	return (
		<details
			className="mt-3 rounded-md border border-border px-3 py-2"
			onToggle={(event) => setIsOpen(event.currentTarget.open)}
		>
			<summary className="cursor-pointer text-fontSize-xs font-medium text-muted-foreground">
				{t("context.surfaceSignalsHistoryRaw")}
			</summary>
			<div className="mt-2 flex items-center gap-2 text-fontSize-xs text-muted-foreground">
				{rawUrl?.url ? (
					<a
						href={rawUrl.url}
						download={`surface-signals-${runId}.json`}
						className="text-primary underline"
					>
						{t("context.inputsHistoryDownload")}
					</a>
				) : downloadUrl ? (
					<a
						href={downloadUrl}
						download={`surface-signals-${runId}.json`}
						className="text-primary underline"
					>
						{t("context.inputsHistoryDownload")}
					</a>
				) : null}
				{isLoading ? <span>{t("context.inputsHistoryLoading")}</span> : null}
			</div>
			{rawText ? (
				<pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-fontSize-xs text-muted-foreground">
					{rawText}
				</pre>
			) : null}
		</details>
	);
}

function ContextRunRawJson({
	productId,
	runId,
	hasRaw,
}: {
	productId: Id<"products">;
	runId: Id<"contextInputRuns">;
	hasRaw: boolean;
}) {
	const { t } = useTranslation("products");
	const [isOpen, setIsOpen] = useState(false);
	const [rawText, setRawText] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const rawUrl = useQuery(
		api.agents.contextInputs.getContextInputRunRaw,
		isOpen ? { productId, runId } : "skip",
	);

	useEffect(() => {
		if (!isOpen || rawText || (!rawUrl?.url && !rawUrl?.raw)) {
			return;
		}
		let isActive = true;
		setIsLoading(true);
		if (rawUrl.url) {
			fetch(rawUrl.url)
				.then((response) => response.text())
				.then((text) => {
					if (isActive) {
						setRawText(text);
					}
				})
				.finally(() => {
					if (isActive) {
						setIsLoading(false);
					}
				});
		} else if (rawUrl.raw) {
			if (isActive) {
				setRawText(rawUrl.raw);
				setIsLoading(false);
			}
		}
		return () => {
			isActive = false;
		};
	}, [isOpen, rawText, rawUrl?.raw, rawUrl?.url]);

	useEffect(() => {
		if (!rawText) {
			setDownloadUrl(null);
			return;
		}
		const blob = new Blob([rawText], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		setDownloadUrl(url);
		return () => {
			URL.revokeObjectURL(url);
		};
	}, [rawText]);

	if (!hasRaw) {
		return null;
	}

	return (
		<details
			className="mt-3 rounded-md border border-border px-3 py-2"
			onToggle={(event) => setIsOpen(event.currentTarget.open)}
		>
			<summary className="cursor-pointer text-fontSize-xs font-medium text-muted-foreground">
				{t("context.inputsHistoryRaw")}
			</summary>
			<div className="mt-2 flex items-center gap-2 text-fontSize-xs text-muted-foreground">
				{rawUrl?.url ? (
					<a
						href={rawUrl.url}
						download={`context-inputs-${runId}.json`}
						className="text-primary underline"
					>
						{t("context.inputsHistoryDownload")}
					</a>
				) : downloadUrl ? (
					<a
						href={downloadUrl}
						download={`context-inputs-${runId}.json`}
						className="text-primary underline"
					>
						{t("context.inputsHistoryDownload")}
					</a>
				) : null}
				{isLoading ? <span>{t("context.inputsHistoryLoading")}</span> : null}
			</div>
			{rawText ? (
				<pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-fontSize-xs text-muted-foreground">
					{rawText}
				</pre>
			) : null}
		</details>
	);
}

function ContextInputsSummary({
	rows,
}: {
	rows: Array<{ label: string; value: string }>;
}) {
	const { t } = useTranslation("products");
	return (
		<div className="rounded-md border border-border">
			<div className="border-b border-border px-4 py-3">
				<div className="text-fontSize-sm font-medium">
					{t("context.inputsTitle")}
				</div>
				<div className="text-fontSize-xs text-muted-foreground">
					{t("context.inputsSubtitle")}
				</div>
			</div>
			<div className="divide-y divide-border">
				{rows.map((row, index) => (
					<div key={`${row.label}-${index}`} className="grid grid-cols-[220px_1fr]">
						<div className="px-4 py-3 text-fontSize-sm font-medium">
							{row.label}
						</div>
						<div className="px-4 py-3 text-fontSize-sm text-muted-foreground">
							{row.value}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
