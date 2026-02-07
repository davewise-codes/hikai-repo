import { useCallback, useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Button,
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	Separator,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	toast,
	cn,
	Copy,
	ThumbsDown,
	ThumbsUp,
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@hikai/ui";
import {
	ArrowDown,
	ArrowUp,
	Clock,
	Refresh,
	RotateCcw,
	ArrowUpToLine,
	Sparkles,
	ShieldCheck,
	TrendingUp,
	Cog,
	DatabaseZap,
} from "@hikai/ui";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { api } from "@hikai/convex";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug } from "@/domains/products/hooks";
import { useConnections } from "@/domains/connectors/hooks";
import {
	useTimeline,
	useTriggerSync,
	useFullSync,
} from "@/domains/timeline/hooks";
import {
	TimelineList,
	TimelineListEvent,
	CapabilitiesBrowser,
	EventsDialog,
} from "@/domains/timeline";
import {
	useCapabilitiesBrowserData,
	type BrowserFilterState,
} from "@/domains/timeline/hooks/use-capabilities-browser-data";
import { formatRelativeDate, formatShortDate } from "@/domains/shared/utils";

export const Route = createFileRoute("/app/$orgSlug/$productSlug/timeline")({
	component: TimelinePage,
});

function TimelinePage() {
	const { t, i18n } = useTranslation("timeline");
	const { productSlug } = Route.useParams();
	const { currentOrg } = useCurrentOrg();
	const product = useGetProductBySlug(currentOrg?._id, productSlug);
	const productId = product?._id;
	const [refreshKey, setRefreshKey] = useState(0);
	const { timeline, buckets, isLoading } = useTimeline({ productId, refreshKey });
	const contextSnapshot = useQuery(
		api.products.products.getCurrentProductContextSnapshot,
		productId ? { productId } : "skip",
	);
	const capabilities = useQuery(
		api.products.capabilities.listProductCapabilities,
		productId ? { productId } : "skip",
	);
	const isTimelineLoading = isLoading || product === undefined;
	const { connections, isLoading: isConnectionsLoading } =
		useConnections(productId);
	const triggerSync = useTriggerSync();
	const fullSync = useFullSync();
	const [isSyncing, setIsSyncing] = useState(false);
	const [isFullSyncing, setIsFullSyncing] = useState(false);
	const [isRegenerating, setIsRegenerating] = useState(false);
	const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
	const [isEventsOpen, setIsEventsOpen] = useState(false);
	const [browserFilters, setBrowserFilters] = useState<BrowserFilterState>({
		categories: [],
		visibility: [],
	});
	const capabilityBySlug = useMemo(() => {
		const map = new Map<string, string>();
		(capabilities ?? []).forEach((capability) => {
			if (capability.slug) {
				map.set(capability.slug, capability.name);
			}
		});
		return map;
	}, [capabilities]);
	const activeConnection = useMemo(
		() => connections?.find((connection) => connection.status === "active"),
		[connections],
	);

	const bucketGroups = useMemo(() => {
		if (!buckets?.length) return [];
		const eventsByBucket = new Map<string, TimelineListEvent[]>();
		(timeline ?? []).forEach((event) => {
			const list = eventsByBucket.get(event.bucketId) ?? [];
			list.push(event);
			eventsByBucket.set(event.bucketId, list);
		});
		return buckets
			.map((bucket) => ({
				summary: bucket,
				events: (eventsByBucket.get(bucket.bucketId) ?? []).sort(
					(a, b) => b.occurredAt - a.occurredAt,
				),
			}))
			.filter((group) => group.events.length > 0);
	}, [buckets, timeline]);
	const productDomains = useMemo(() => {
		const rawDomains = Array.isArray((contextSnapshot as any)?.contextDetail?.domains)
			? (((contextSnapshot as any).contextDetail as { domains?: unknown }).domains as Array<
					Record<string, unknown>
				>)
			: [];
		const nonBusinessDomains = new Set([
			"Marketing",
			"Documentation",
			"Infrastructure",
			"Management",
			"Admin",
			"Analytics",
		]);
		const names = rawDomains
			.map((domain) =>
				typeof domain?.name === "string" ? domain.name.trim() : "",
			)
			.filter(
				(name) => name.length > 0 && !nonBusinessDomains.has(name),
			);
		const seen = new Set<string>();
		const ordered: string[] = [];
		names.forEach((name) => {
			if (seen.has(name)) return;
			seen.add(name);
			ordered.push(name);
		});
		return ordered;
	}, [contextSnapshot]);
	const domainList = useMemo(() => {
		const seen = new Set(productDomains);
		const ordered = [...productDomains];
		bucketGroups.forEach((group) => {
			(group.summary.domains ?? []).forEach((domain) => {
				if (!domain || seen.has(domain)) return;
				seen.add(domain);
				ordered.push(domain);
			});
			group.events.forEach((event) => {
				if (!event.domain || seen.has(event.domain)) return;
				seen.add(event.domain);
				ordered.push(event.domain);
			});
		});
		return ordered;
	}, [bucketGroups, productDomains]);
	const domainColorMap = useMemo(() => {
		return createDomainColorMap(domainList);
	}, [domainList]);
	const selectedBucketGroup = useMemo(() => {
		if (!selectedBucketId) return null;
		return (
			bucketGroups.find(
				(group) => group.summary.bucketId === selectedBucketId,
			) ?? null
		);
	}, [bucketGroups, selectedBucketId]);
	const browserData = useCapabilitiesBrowserData({
		events: timeline ?? [],
		buckets: bucketGroups,
		selectedBucketId,
		capabilities: capabilities ?? [],
		filters: browserFilters,
		productDomains,
	});

	useEffect(() => {
		if (!bucketGroups.length) {
			setSelectedBucketId(null);
			return;
		}
		if (
			selectedBucketId &&
			bucketGroups.some(
				(group) => group.summary.bucketId === selectedBucketId,
			)
		)
			return;
		setSelectedBucketId(bucketGroups[0].summary.bucketId);
	}, [bucketGroups, selectedBucketId]);


	const currentBucketIndex = useMemo(() => {
		if (!selectedBucketId) return -1;
		return bucketGroups.findIndex(
			(group) => group.summary.bucketId === selectedBucketId,
		);
	}, [bucketGroups, selectedBucketId]);

	const selectPrev = useCallback(() => {
		if (!bucketGroups.length || currentBucketIndex < 0) return;
		if (currentBucketIndex >= bucketGroups.length - 1) return;
		setSelectedBucketId(
			bucketGroups[currentBucketIndex + 1].summary.bucketId,
		);
	}, [bucketGroups, currentBucketIndex]);

	const selectNext = useCallback(() => {
		if (!bucketGroups.length || currentBucketIndex <= 0) return;
		setSelectedBucketId(
			bucketGroups[currentBucketIndex - 1].summary.bucketId,
		);
	}, [bucketGroups, currentBucketIndex]);

	const handleKeyboardNav = useCallback(
		(event: KeyboardEvent) => {
			if (event.target instanceof HTMLElement) {
				const tag = event.target.tagName.toLowerCase();
				if (["input", "textarea", "select"].includes(tag)) return;
			}
			if (event.key === "ArrowDown") {
				event.preventDefault();
				selectNext();
			} else if (event.key === "ArrowUp") {
				event.preventDefault();
				selectPrev();
			}
		},
		[selectNext, selectPrev],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyboardNav);
		return () => window.removeEventListener("keydown", handleKeyboardNav);
	}, [handleKeyboardNav]);

	const handleSync = useCallback(async () => {
		if (!productId) return;
		if (!activeConnection) {
			toast.error(t("sync.noConnection"));
			return;
		}
		setIsSyncing(true);
		try {
			const result = await triggerSync({
				productId,
				connectionId: activeConnection._id as Id<"connections">,
			});
			setRefreshKey((prev) => prev + 1);
			toast.success(
				t("sync.success", {
					ingested: result.ingested,
					skipped: result.skipped,
				}),
			);
		} catch (errorSync) {
			toast.error(
				errorSync instanceof Error ? errorSync.message : t("sync.error"),
			);
		} finally {
			setIsSyncing(false);
		}
	}, [activeConnection, productId, t, triggerSync]);

	const handleFullSync = useCallback(async () => {
		if (!productId) return;
		if (!activeConnection) {
			toast.error(t("sync.noConnection"));
			return;
		}
		setIsFullSyncing(true);
		try {
			const result = await fullSync({
				productId,
				connectionId: activeConnection._id as Id<"connections">,
			});
			setRefreshKey((prev) => prev + 1);
			toast.success(
				t("fullSync.success", {
					deleted: result.deletedRawEvents,
					ingested: result.ingested,
					interpreted: result.interpreted,
				}),
			);
		} catch (errorSync) {
			toast.error(
				errorSync instanceof Error ? errorSync.message : t("fullSync.error"),
			);
		} finally {
			setIsFullSyncing(false);
		}
	}, [activeConnection, fullSync, productId, t]);

	const regenerateTimeline = useAction(api.timeline.events.regenerateTimeline);
	const handleRegenerate = useCallback(async () => {
		if (!productId) return;
		setIsRegenerating(true);
		try {
			const result = await regenerateTimeline({ productId });
			setRefreshKey((prev) => prev + 1);
			if (result.queued) {
				toast.success(
					t("regenerate.queued", {
						batches: result.totalBatches ?? 0,
					}),
				);
			} else {
				toast.success(
					t("regenerate.success", {
						interpreted: result.processed,
					}),
				);
			}
		} catch (errorSync) {
			toast.error(
				errorSync instanceof Error
					? errorSync.message
					: t("regenerate.error"),
			);
		} finally {
			setIsRegenerating(false);
		}
	}, [productId, regenerateTimeline, t]);

	const latestRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		productId
			? { productId, useCase: "timeline_interpretation" }
			: "skip",
	);
	const historyRuns = useQuery(
		api.agents.agentRuns.getRunsForUseCase,
		productId
			? { productId, useCase: "timeline_interpretation", limit: 12 }
			: "skip",
	);
	const latestStep =
		latestRun?.steps?.length
			? latestRun.steps[latestRun.steps.length - 1]
			: null;
	const runStatus = latestRun?.status ?? null;
	const completedAt = latestRun?.finishedAt ?? latestRun?.startedAt ?? null;
	const completedLabel = completedAt
		? new Date(completedAt).toLocaleString()
		: "";
	const isRegenerationRun =
		latestRun?.steps?.some((step) =>
			step.step.toLowerCase().includes("clearing existing interpretations") ||
			step.step.toLowerCase().includes("clearing existing narratives"),
		) ?? false;
	const progressLabel =
		runStatus === "success"
			? t(
					isRegenerationRun
						? "progress.completedRegenerate"
						: "progress.completedSync",
					{ time: completedLabel },
				)
			: runStatus === "error"
				? t("progress.failed", { time: completedLabel })
				: latestStep?.step ?? t("progress.running");
	const showConnectCta = !isConnectionsLoading && !activeConnection;

	const handleToday = useCallback(() => {
		if (bucketGroups.length)
			setSelectedBucketId(bucketGroups[0].summary.bucketId);
	}, [bucketGroups]);
	const handleOpenEvents = useCallback(() => {
		setIsEventsOpen(true);
	}, []);
	const handleCopyTimeline = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(
				JSON.stringify(
					{
						buckets: bucketGroups.map((group) => group.summary),
						events: timeline ?? [],
					},
					null,
					2,
				),
			);
			toast.success(t("navigator.copyTimeline"));
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : t("errors.unknown"),
			);
		}
	}, [bucketGroups, timeline, t]);

	return (
		<div className="flex h-[calc(100vh-64px)] flex-col gap-6 overflow-hidden p-6">
			<div className="grid flex-1 grid-rows-[auto_1fr] gap-8 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<div className="col-start-1 row-start-1 flex flex-col gap-3 px-2 md:px-6">
					<div className="flex items-start justify-between gap-4">
						<h1 className="text-2xl font-semibold">{t("title")}</h1>
						<div className="flex h-8 flex-wrap items-center gap-2">
							<Button
								variant="outline"
								size="ultra"
								onClick={selectPrev}
								disabled={
									!bucketGroups.length ||
									!selectedBucketId ||
									currentBucketIndex >= bucketGroups.length - 1
								}
								aria-label={t("controls.prev")}
							>
							<ArrowDown className="h-4 w-4" />
								<span className="text-fontSize-sm">{t("controls.prev")}</span>
							</Button>
							<Button
								variant="outline"
								size="ultra"
								onClick={selectNext}
								disabled={
									!bucketGroups.length ||
									!selectedBucketId ||
									currentBucketIndex <= 0
								}
								aria-label={t("controls.next")}
							>
							<ArrowUp className="h-4 w-4" />
								<span className="text-fontSize-sm">{t("controls.next")}</span>
							</Button>
							<Button variant="outline" size="ultra" onClick={handleToday}>
								<ArrowUpToLine className="h-4 w-4" />
								<span className="text-fontSize-sm">{t("navigator.today")}</span>
							</Button>
							<Button
								variant="outline"
								size="ultra"
								onClick={handleCopyTimeline}
								disabled={!timeline?.length}
							>
								<Copy className="h-4 w-4" />
								<span className="text-fontSize-sm">
									{t("navigator.copyTimeline")}
								</span>
							</Button>
						</div>
					</div>
				</div>
				<div className="col-start-2 row-start-1 flex items-start justify-end">
					<TooltipProvider>
						<div className="flex w-full items-center justify-between gap-4">
							{latestRun ? (
								<div
									className={cn(
										"flex items-center gap-2 text-fontSize-xs",
										runStatus === "error"
											? "text-destructive"
											: runStatus === "success"
												? "text-success"
												: "text-muted-foreground",
									)}
								>
									<span
										className={cn(
											"h-2 w-2 rounded-full",
											runStatus === "error"
												? "bg-destructive"
												: runStatus === "success"
													? "bg-success"
													: "bg-primary animate-pulse",
										)}
									/>
									<span>{progressLabel}</span>
								</div>
							) : (
								<span />
							)}
							<div className="flex h-8 flex-wrap items-center gap-2">
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="ultra"
											onClick={handleSync}
											disabled={
												!productId ||
												isSyncing ||
												isTimelineLoading ||
												isConnectionsLoading ||
												!activeConnection
											}
											aria-label={t("sync.label")}
										>
											<Refresh className="h-4 w-4" />
											<span className="text-fontSize-sm">{t("sync.label")}</span>
										</Button>
									</TooltipTrigger>
									<TooltipContent side="bottom" sideOffset={8}>
										{t("sync.tooltip")}
									</TooltipContent>
								</Tooltip>
								<AlertDialog>
									<Tooltip>
										<TooltipTrigger asChild>
											<AlertDialogTrigger asChild>
												<Button
													variant="outline"
													size="ultra"
													disabled={!productId || isRegenerating}
												>
													<RotateCcw className="h-4 w-4" />
													<span className="text-fontSize-sm">
														{t("regenerate.label")}
													</span>
												</Button>
											</AlertDialogTrigger>
										</TooltipTrigger>
										<TooltipContent side="bottom" sideOffset={8}>
											{t("regenerate.tooltip")}
										</TooltipContent>
									</Tooltip>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												{t("regenerate.confirmTitle")}
											</AlertDialogTitle>
											<AlertDialogDescription>
												{t("regenerate.confirmDescription")}
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel disabled={isRegenerating}>
												{t("regenerate.cancel")}
											</AlertDialogCancel>
											<AlertDialogAction
												onClick={handleRegenerate}
												disabled={isRegenerating}
											>
												{t("regenerate.confirm")}
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
								<AlertDialog>
									<Tooltip>
										<TooltipTrigger asChild>
											<AlertDialogTrigger asChild>
												<Button
													variant="outline"
													size="ultra"
													disabled={
														!productId ||
														isFullSyncing ||
														isConnectionsLoading ||
														!activeConnection
													}
												>
													<DatabaseZap className="h-4 w-4" />
													<span className="text-fontSize-sm">
														{t("fullSync.label")}
													</span>
												</Button>
											</AlertDialogTrigger>
										</TooltipTrigger>
										<TooltipContent side="bottom" sideOffset={8}>
											{t("fullSync.tooltip")}
										</TooltipContent>
									</Tooltip>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												{t("fullSync.confirmTitle")}
											</AlertDialogTitle>
											<AlertDialogDescription>
												{t("fullSync.confirmDescription")}
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel disabled={isFullSyncing}>
												{t("fullSync.cancel")}
											</AlertDialogCancel>
											<AlertDialogAction
												onClick={handleFullSync}
												disabled={isFullSyncing}
												className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
											>
												{t("fullSync.confirm")}
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
								<Sheet>
								<SheetTrigger asChild>
										<Button variant="outline" size="ultra" className="mr-0.5">
											<Clock className="h-4 w-4" />
											<span className="text-fontSize-sm">
												{t("progress.history")}
											</span>
										</Button>
									</SheetTrigger>
									<SheetContent side="right">
										<SheetHeader>
											<SheetTitle>{t("progress.title")}</SheetTitle>
										</SheetHeader>
										<div className="mt-4 space-y-3">
											{historyRuns?.length ? (
												<Accordion type="single" collapsible>
											{historyRuns.map((run) => {
												const isRegenerate =
													run.steps?.some((step) =>
														step.step
															.toLowerCase()
															.includes("clearing existing interpretations") ||
														step.step
															.toLowerCase()
															.includes("clearing existing narratives"),
													) ?? false;
												return (
													<AccordionItem
														key={run._id}
														value={`${run._id}`}
													>
														<AccordionTrigger className="hover:no-underline">
															<span className="flex items-center gap-2 text-fontSize-sm">
																{new Date(run.startedAt).toLocaleString()}
																<span className="text-fontSize-xs text-muted-foreground uppercase tracking-wide">
																	{isRegenerate
																		? t("progress.regenerate")
																		: t("progress.sync")}
																</span>
																<span
																	className={cn(
																		"h-2 w-2 rounded-full",
																		run.status === "error"
																			? "bg-destructive"
																			: run.status === "success"
																				? "bg-success"
																				: "bg-muted-foreground",
																	)}
																/>
															</span>
														</AccordionTrigger>
														<AccordionContent>
															<div className="space-y-2 text-fontSize-sm">
																{run.steps.map((step, index) => (
																	<div
																		key={`${step.timestamp}-${index}`}
																		className="flex items-start gap-3"
																	>
																		<span className="text-muted-foreground">
																			{new Date(step.timestamp).toLocaleTimeString()}
																		</span>
																		<span>{step.step}</span>
																	</div>
																))}
															</div>
														</AccordionContent>
													</AccordionItem>
												);
											})}
												</Accordion>
											) : (
												<p className="text-fontSize-sm text-muted-foreground">
													{t("progress.empty")}
												</p>
											)}
										</div>
									</SheetContent>
								</Sheet>
							</div>
						</div>
					</TooltipProvider>
				</div>

				<div className="relative col-start-1 row-span-2 h-full overflow-hidden rounded-lg bg-background">
					<div
						className="relative h-full overflow-y-auto px-2 md:px-6 py-4 pr-6"
						style={{
							maskImage:
								"linear-gradient(to bottom, transparent 0px, black 72px, black calc(100% - 72px), transparent 100%)",
							WebkitMaskImage:
								"linear-gradient(to bottom, transparent 0px, black 72px, black calc(100% - 72px), transparent 100%)",
						}}
					>
						<div className="px-0">
							<TimelineList
								buckets={isFullSyncing ? [] : bucketGroups}
								productDomains={productDomains}
								domainColorMap={domainColorMap}
								isLoading={isTimelineLoading || isFullSyncing}
								selectedBucketId={selectedBucketId}
								onSelectBucket={(id) => setSelectedBucketId(id)}
								onOpenEvents={handleOpenEvents}
								eventsActionLabel={t("events.view")}
								emptyAction={
									showConnectCta ? (
										<Button asChild size="sm" variant="secondary">
											<Link
												to="/settings/product/$slug/sources"
												params={{ slug: productSlug }}
											>
												{t("empty.connectSource")}
											</Link>
										</Button>
									) : null
								}
							/>
						</div>
					</div>
				</div>

				<div className="col-start-2 row-start-2 flex h-full min-h-0 flex-col rounded-lg border border-border bg-card">
					<CapabilitiesBrowser
						groups={browserData.groups}
						domainColorMap={domainColorMap}
						filters={browserFilters}
						onFiltersChange={setBrowserFilters}
						productName={product?.name ?? t("title")}
					/>
				</div>
			</div>
			<EventsDialog
				open={isEventsOpen}
				onOpenChange={setIsEventsOpen}
				bucket={selectedBucketGroup}
				isLoading={isFullSyncing}
				capabilityBySlug={capabilityBySlug}
				domainColorMap={domainColorMap}
			/>
		</div>
	);
}

interface DetailPanelProps {
	event: TimelineListEvent | null;
	rawEvents: Array<{
		rawEventId: Id<"rawEvents">;
		occurredAt: number;
		sourceType: string;
		summary: string;
	}>;
	isLoading: boolean;
	locale: string;
	capabilityLabelBySlug: Map<string, string>;
	className?: string;
}

type DomainColor = {
	border: string;
	background: string;
	text: string;
	dot: string;
};

function getDomainBadgeClass(domain: string) {
	let hash = 0;
	for (let i = 0; i < domain.length; i += 1) {
		hash = (hash * 31 + domain.charCodeAt(i)) % 2147483647;
	}
	const hue = Math.abs(hash) % 360;
	return buildDomainColor(hue);
}

function createDomainColorMap(domains: string[]) {
	const map: Record<string, DomainColor> = {};
	if (!domains.length) return map;
	domains.forEach((domain, index) => {
		const hue = Math.round((index / domains.length) * 360);
		map[domain] = buildDomainColor(hue);
	});
	return map;
}

function buildDomainColor(hue: number): DomainColor {
	const border = `color-mix(in srgb, hsl(${hue} 70% 55%) 45%, hsl(var(--border)) 55%)`;
	const background = `color-mix(in srgb, hsl(${hue} 70% 55%) 18%, hsl(var(--background)) 82%)`;
	const text = `color-mix(in srgb, hsl(${hue} 70% 35%) 55%, hsl(var(--foreground)) 45%)`;
	return {
		border,
		background,
		text,
		dot: `hsl(${hue} 70% 50%)`,
	};
}

function DetailPanel({
	event,
	rawEvents,
	isLoading,
	locale,
	capabilityLabelBySlug,
	className,
}: DetailPanelProps) {
	const { t } = useTranslation("timeline");
	const rateInference = useMutation(api.ai.inferenceLogs.rateInferenceById);
	const ratingData = useQuery(
		api.ai.inferenceLogs.getInferenceRatingById,
		event?.inferenceLogId
			? { productId: event.productId, inferenceLogId: event.inferenceLogId }
			: "skip",
	);
	const [isRating, setIsRating] = useState(false);
	const currentRating = ratingData?.rating ?? null;
	const shouldShowInternalNote = event?.visibility === "internal";
	const shouldShowFeedback = !!event?.inferenceLogId && currentRating === null;
	const [activeTab, setActiveTab] = useState("overview");

	const handleRating = async (rating: "up" | "down") => {
		if (!event?.inferenceLogId) return;
		setIsRating(true);
		try {
			await rateInference({
				productId: event.productId,
				inferenceLogId: event.inferenceLogId,
				rating,
			});
		} finally {
			setIsRating(false);
		}
	};

	const renderCategory = (
		type: "feature" | "fix" | "improvement",
		emptyLabel: string,
	) => {
		if (!event || event.type !== type) {
			return (
				<p className="text-fontSize-sm text-muted-foreground">{emptyLabel}</p>
			);
		}

		return (
			<div className="rounded-md border border-border p-3">
				<div className="flex items-center justify-between gap-2">
					<p className="text-fontSize-sm font-medium">{event.title}</p>
					{event.visibility === "internal" ? (
						<span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
							{t("detail.internal")}
						</span>
					) : null}
				</div>
				{event.summary ? (
					<p className="mt-1 text-fontSize-xs text-muted-foreground">
						{event.summary}
					</p>
				) : null}
			</div>
		);
	};

	return (
		<div className={cn("flex h-full min-h-0 flex-col", className)}>
			<Card className="flex h-full min-h-0 flex-col">
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between gap-3">
						<CardTitle className="text-lg leading-tight">
							{isLoading
								? t("detail.title")
								: (event?.title ?? t("detail.emptyTitle"))}
						</CardTitle>
						{event ? (
							<Button
								type="button"
								variant={activeTab === "activity" ? "secondary" : "outline"}
								size="icon"
								onClick={() => setActiveTab("activity")}
								aria-label={t("detail.tabs.activity")}
							>
								<Clock className="h-4 w-4" />
							</Button>
						) : null}
					</div>
					{event && shouldShowInternalNote ? (
						<p className="mt-2 text-fontSize-xs text-muted-foreground">
							{t("detail.focusAreasInternal")}
						</p>
					) : null}
				</CardHeader>
				<CardContent className="flex-1 overflow-hidden flex flex-col">
					{isLoading ? (
						<div className="space-y-3">
							<div className="h-6 w-3/4 rounded-md bg-muted animate-pulse" />
							<div className="h-4 w-1/2 rounded-md bg-muted animate-pulse" />
							<div className="h-24 w-full rounded-md bg-muted animate-pulse" />
						</div>
					) : !event ? (
						<div className="flex h-full flex-col items-center justify-center gap-3 text-center">
							<p className="text-fontSize-sm font-medium">
								{t("detail.emptyTitle")}
							</p>
							<p className="text-fontSize-sm text-muted-foreground">
								{t("detail.emptyDescription")}
							</p>
						</div>
					) : (
						<Tabs
							value={activeTab}
							onValueChange={setActiveTab}
							className="flex h-full min-h-0 flex-col flex-1"
						>
							<TabsList className="w-full justify-start">
								<TabsTrigger value="overview">
									{t("detail.tabs.overview")}
								</TabsTrigger>
								<TabsTrigger value="features">
									<span className="flex items-center gap-1.5">
										<Sparkles className="h-3.5 w-3.5" />
										{t("detail.tabs.features")}
									</span>
								</TabsTrigger>
								<TabsTrigger value="fixes">
									<span className="flex items-center gap-1.5">
										<ShieldCheck className="h-3.5 w-3.5" />
										{t("detail.tabs.fixes")}
									</span>
								</TabsTrigger>
								<TabsTrigger value="improvements">
									<span className="flex items-center gap-1.5">
										<TrendingUp className="h-3.5 w-3.5" />
										{t("detail.tabs.improvements")}
									</span>
								</TabsTrigger>
							</TabsList>
							<TabsContent
								value="overview"
								className="mt-4 flex-1 overflow-hidden"
							>
								<div className="h-full overflow-y-auto rounded-lg border">
									<div className="space-y-2 p-4 break-words">
										{shouldShowInternalNote ? (
											<p className="text-fontSize-xs uppercase tracking-wide text-muted-foreground">
												{t("detail.internalSummary")}
											</p>
										) : null}
										<p className="text-fontSize-xs uppercase tracking-wide text-muted-foreground">
											{formatShortDate(event.occurredAt, locale)} ·{" "}
											{formatRelativeDate(event.occurredAt, locale)}
										</p>
										{event.summary ? (
											<p className="text-fontSize-sm text-muted-foreground whitespace-pre-wrap break-words">
												{event.summary}
											</p>
										) : (
											<p className="text-fontSize-sm text-muted-foreground">
												{t("detail.noSummary")}
											</p>
										)}
										<div className="flex flex-wrap items-center gap-2 pt-2">
											{event.domain ? (
												<Badge
													variant="outline"
													className="flex items-center gap-1.5"
													style={(() => {
														const color = getDomainBadgeClass(event.domain ?? "");
														return {
															borderColor: color.border,
															backgroundColor: color.background,
															color: color.text,
														};
													})()}
												>
													<span className="text-[10px] uppercase tracking-wide">
														{t("detail.badges.domain")}
													</span>
													<span className="text-fontSize-xs font-medium">
														{event.domain}
													</span>
												</Badge>
											) : null}
											{event.capabilitySlug ? (
												<Badge variant="secondary" className="flex items-center gap-1.5">
													<span className="text-[10px] uppercase tracking-wide">
														{t("detail.badges.capability")}
													</span>
													<span className="text-fontSize-xs font-medium">
														{capabilityLabelBySlug.get(event.capabilitySlug) ??
															event.capabilitySlug}
													</span>
												</Badge>
											) : null}
											<Badge variant="outline" className="flex items-center gap-1.5">
												<span className="text-[10px] uppercase tracking-wide">
													{t("detail.badges.type")}
												</span>
												<span className="text-fontSize-xs font-medium">
													{event.type}
												</span>
											</Badge>
										</div>
									</div>
								</div>
							</TabsContent>
							<TabsContent
								value="features"
								className="mt-4 flex-1 overflow-hidden"
							>
								<div className="h-full overflow-y-auto rounded-lg border">
									<div className="space-y-4 p-4">
										{renderCategory(
											"feature",
											t("detail.empty.features"),
										)}
									</div>
								</div>
							</TabsContent>
							<TabsContent
								value="fixes"
								className="mt-4 flex-1 overflow-hidden"
							>
								<div className="h-full overflow-y-auto rounded-lg border">
									<div className="space-y-4 p-4">
										{renderCategory(
											"fix",
											t("detail.empty.fixes"),
										)}
									</div>
								</div>
							</TabsContent>
							<TabsContent
								value="improvements"
								className="mt-4 flex-1 overflow-hidden"
							>
								<div className="h-full overflow-y-auto rounded-lg border">
									<div className="space-y-4 p-4">
										{renderCategory(
											"improvement",
											t("detail.empty.improvements"),
										)}
									</div>
								</div>
							</TabsContent>
							<TabsContent
								value="activity"
								className="mt-4 flex-1 overflow-hidden"
							>
								<div className="h-full overflow-y-auto rounded-lg border">
									<div className="space-y-3 p-4">
										<div className="flex items-center gap-2 text-fontSize-sm text-muted-foreground">
											<Clock className="h-4 w-4" />
											<span>{t("detail.activityHint")}</span>
										</div>
										<Separator />
										{rawEvents.length ? (
											<div className="space-y-3">
												{rawEvents.map((rawEvent) => (
													<div
														key={rawEvent.rawEventId}
														className="rounded-md border border-border p-3"
													>
														<p className="text-fontSize-sm font-medium">
															{rawEvent.summary}
														</p>
														<p className="mt-1 text-fontSize-xs text-muted-foreground">
															{rawEvent.sourceType} ·{" "}
															{formatShortDate(
																rawEvent.occurredAt,
																locale,
															)}
														</p>
													</div>
												))}
											</div>
										) : (
											<p className="text-fontSize-sm text-muted-foreground">
												{t("detail.activityEmpty")}
											</p>
										)}
									</div>
								</div>
							</TabsContent>
						</Tabs>
					)}
					{!isLoading && event && shouldShowFeedback ? (
						<div className="mt-4 border-t pt-3">
							<p className="text-fontSize-sm text-muted-foreground">
								{t("detail.feedbackPrompt")}
							</p>
							<div className="mt-2 flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={() => handleRating("up")}
									disabled={isRating}
									aria-label={t("detail.ratingUp")}
								>
									<ThumbsUp className="h-4 w-4" />
								</Button>
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={() => handleRating("down")}
									disabled={isRating}
									aria-label={t("detail.ratingDown")}
								>
									<ThumbsDown className="h-4 w-4" />
								</Button>
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
