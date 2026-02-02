import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Button,
	Badge,
	Check,
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
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	Copy,
	DatePicker,
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
	Filter as FilterIcon,
	Sparkles,
	ShieldCheck,
	TrendingUp,
	Cog,
	X,
} from "@hikai/ui";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { api } from "@hikai/convex";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug } from "@/domains/products/hooks";
import { useConnections } from "@/domains/connectors/hooks";
import {
	useTimeline,
	useTriggerSync,
} from "@/domains/timeline/hooks";
import { TimelineFilterState, TimelineList, TimelineListEvent } from "@/domains/timeline";
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
	const capabilities = useQuery(
		api.products.capabilities.listProductCapabilities,
		productId ? { productId } : "skip",
	);
	const isTimelineLoading = isLoading || product === undefined;
	const { connections, isLoading: isConnectionsLoading } =
		useConnections(productId);
	const triggerSync = useTriggerSync();
	const [isSyncing, setIsSyncing] = useState(false);
	const [isRegenerating, setIsRegenerating] = useState(false);
	const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
	const [filters, setFilters] = useState<TimelineFilterState>({
		domains: [],
		capabilities: [],
		categories: [],
		visibility: [],
		from: "",
		to: "",
	});
	const eventsScrollRef = useRef<HTMLDivElement | null>(null);
	const bucketRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const [datePreset, setDatePreset] = useState<
		"all" | "last7" | "last30" | "lastMonth"
	>("all");
	const capabilitiesByDomain = useMemo(() => {
		const map = new Map<string, Array<{ value: string; label: string }>>();
		(capabilities ?? []).forEach((capability) => {
			const domain = capability.domain ?? "Unassigned";
			const list = map.get(domain) ?? [];
			list.push({ value: capability.slug, label: capability.name });
			map.set(domain, list);
		});
		Array.from(map.values()).forEach((list) =>
			list.sort((a, b) => a.label.localeCompare(b.label)),
		);
		return map;
	}, [capabilities]);
	const capabilityBySlug = useMemo(() => {
		const map = new Map<string, string>();
		(capabilities ?? []).forEach((capability) => {
			if (capability.slug) {
				map.set(capability.slug, capability.name);
			}
		});
		return map;
	}, [capabilities]);

	useEffect(() => {
		if (!filters.capabilities.length || !capabilities?.length) return;
		if (!filters.domains.length) return;
		const allowed = new Set(
			capabilities
				.filter((capability) => filters.domains.includes(capability.domain ?? ""))
				.map((capability) => capability.slug),
		);
		const nextCapabilities = filters.capabilities.filter((slug) => allowed.has(slug));
		if (nextCapabilities.length === filters.capabilities.length) return;
		setFilters((prev) => ({ ...prev, capabilities: nextCapabilities }));
	}, [capabilities, filters.capabilities, filters.domains]);

	const activeConnection = useMemo(
		() => connections?.find((connection) => connection.status === "active"),
		[connections],
	);

	const filteredEvents = useMemo(() => {
		if (!timeline) return [];
		return timeline.filter((event) => {
			const matchDomains =
				filters.domains.length === 0 ||
				(event.domain ? filters.domains.includes(event.domain) : false);
			const matchCapabilities =
				filters.capabilities.length === 0 ||
				(event.capabilitySlug
					? filters.capabilities.includes(event.capabilitySlug)
					: false);
			const matchCategories =
				filters.categories.length === 0 ||
				filters.categories.some((category) => {
					if (category === "features") return event.type === "feature";
					if (category === "fixes") return event.type === "fix";
					if (category === "improvements") return event.type === "improvement";
					if (category === "work")
						return event.type === "work" || event.type === "other";
					return false;
				});
			const matchVisibility =
				filters.visibility.length === 0 ||
				filters.visibility.includes(event.visibility ?? "public");
			const matchFrom =
				!filters.from || event.occurredAt >= new Date(filters.from).getTime();
			const matchTo =
				!filters.to || event.occurredAt <= new Date(filters.to).getTime();
			return (
				matchDomains &&
				matchCapabilities &&
				matchCategories &&
				matchVisibility &&
				matchFrom &&
				matchTo
			);
		});
	}, [filters, timeline]);

	const bucketGroups = useMemo(() => {
		if (!buckets?.length) return [];
		const eventsByBucket = new Map<string, TimelineListEvent[]>();
		filteredEvents.forEach((event) => {
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
	}, [buckets, filteredEvents]);
	const domainColorMap = useMemo(() => {
		const domains = new Set<string>();
		bucketGroups.forEach((group) => {
			(group.summary.domains ?? []).forEach((domain) => {
				if (domain) domains.add(domain);
			});
			group.events.forEach((event) => {
				if (event.domain) domains.add(event.domain);
			});
		});
		return createDomainColorMap(Array.from(domains));
	}, [bucketGroups]);

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

	useEffect(() => {
		if (!selectedBucketId) return;
		const node = bucketRefs.current[selectedBucketId];
		const container = eventsScrollRef.current;
		if (!node || !container) return;
		const offset = 16;
		const containerTop = container.getBoundingClientRect().top;
		const nodeTop = node.getBoundingClientRect().top;
		const delta = nodeTop - containerTop;
		container.scrollTo({
			top: container.scrollTop + delta - offset,
			behavior: "smooth",
		});
	}, [selectedBucketId]);

	const applyDatePreset = useCallback(
		(preset: "all" | "last7" | "last30" | "lastMonth") => {
			const now = new Date();
			if (preset === "all") {
				setDatePreset("all");
				setFilters((prev) => ({ ...prev, from: "", to: "" }));
				return;
			}
			if (preset === "last7") {
				const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				setDatePreset("last7");
				setFilters((prev) => ({ ...prev, from: from.toISOString(), to: "" }));
				return;
			}
			if (preset === "last30") {
				const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				setDatePreset("last30");
				setFilters((prev) => ({ ...prev, from: from.toISOString(), to: "" }));
				return;
			}
			if (preset === "lastMonth") {
				const firstDayPrevMonth = new Date(
					now.getFullYear(),
					now.getMonth() - 1,
					1,
				);
				const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
				setDatePreset("lastMonth");
				setFilters((prev) => ({
					...prev,
					from: firstDayPrevMonth.toISOString(),
					to: lastDayPrevMonth.toISOString(),
				}));
			}
		},
		[],
	);

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

	const regenerateTimeline = useAction(api.timeline.events.regenerateTimeline);
	const handleRegenerate = useCallback(async () => {
		if (!productId) return;
		setIsRegenerating(true);
		try {
			const result = await regenerateTimeline({ productId });
			setRefreshKey((prev) => prev + 1);
			toast.success(
				t("regenerate.success", {
					interpreted: result.processed,
				}),
			);
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
const handleCategoryToggle = useCallback((value: "features" | "fixes" | "improvements" | "work") => {
		setFilters((prev) => ({
			...prev,
			categories: prev.categories.includes(value)
				? prev.categories.filter((item) => item !== value)
				: [...prev.categories, value],
		}));
	}, []);
	const handleVisibilityToggle = useCallback(
		(value: "public" | "internal") => {
			setFilters((prev) => ({
				...prev,
				visibility: prev.visibility.includes(value)
					? prev.visibility.filter((item) => item !== value)
					: [...prev.visibility, value],
			}));
		},
		[],
	);
	const handleDomainToggle = useCallback((value: string) => {
		setFilters((prev) => ({
			...prev,
			domains: prev.domains.includes(value)
				? prev.domains.filter((item) => item !== value)
				: [...prev.domains, value],
		}));
	}, []);
	const handleCapabilityToggle = useCallback((value: string) => {
		setFilters((prev) => ({
			...prev,
			capabilities: prev.capabilities.includes(value)
				? prev.capabilities.filter((item) => item !== value)
				: [...prev.capabilities, value],
		}));
	}, []);

	const handleFromChange = useCallback((value: string) => {
		setDatePreset("all");
		setFilters((prev) => ({ ...prev, from: value }));
	}, []);

	const handleToChange = useCallback((value: string) => {
		setDatePreset("all");
		setFilters((prev) => ({ ...prev, to: value }));
	}, []);

	const toDateString = useCallback((date: Date | undefined) => {
		if (!date) return "";
		const year = date.getFullYear();
		const month = `${date.getMonth() + 1}`.padStart(2, "0");
		const day = `${date.getDate()}`.padStart(2, "0");
		return `${year}-${month}-${day}`;
	}, []);

	const parseDateString = useCallback((value: string) => {
		if (!value) return undefined;
		const [year, month, day] = value.split("-").map(Number);
		if (!year || !month || !day) return undefined;
		return new Date(year, month - 1, day);
	}, []);

	const clearDates = useCallback(() => {
		setDatePreset("all");
		setFilters((prev) => ({ ...prev, from: "", to: "" }));
	}, []);

	const clearAllFilters = useCallback(() => {
		setDatePreset("all");
		setFilters({
			domains: [],
			capabilities: [],
			categories: [],
			visibility: [],
			from: "",
			to: "",
		});
	}, []);

	const hasActiveFilters =
		filters.domains.length > 0 ||
		filters.capabilities.length > 0 ||
		filters.categories.length > 0 ||
		filters.visibility.length > 0 ||
		!!filters.from ||
		!!filters.to;
	const activeFilterCount =
		filters.domains.length +
		filters.capabilities.length +
		filters.categories.length +
		filters.visibility.length +
		(filters.from || filters.to ? 1 : 0);

	const dateFilterLabel = useMemo(() => {
		if (!filters.from && !filters.to) return null;
		const fromLabel = filters.from
			? formatShortDate(new Date(filters.from).getTime(), i18n.language)
			: t("filters.anyTime");
		const toLabel = filters.to
			? formatShortDate(new Date(filters.to).getTime(), i18n.language)
			: t("filters.anyTime");
		return `${fromLabel} → ${toLabel}`;
	}, [filters.from, filters.to, i18n.language, t]);
	const handleToday = useCallback(() => {
		setFilters((prev) => ({ ...prev, from: "", to: "" }));
		if (bucketGroups.length)
			setSelectedBucketId(bucketGroups[0].summary.bucketId);
	}, [bucketGroups]);
	const handleCopyTimeline = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(
				JSON.stringify(
					{
						buckets: bucketGroups.map((group) => group.summary),
						events: filteredEvents,
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
	}, [bucketGroups, filteredEvents, t]);

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
								disabled={!filteredEvents.length}
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
								buckets={bucketGroups}
								domainColorMap={domainColorMap}
								isLoading={isTimelineLoading}
								selectedBucketId={selectedBucketId}
								onSelectBucket={(id) => setSelectedBucketId(id)}
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
					<div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
						<div className="flex flex-wrap items-center gap-2">
							<div className="flex items-center gap-2">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="sm">
											<FilterIcon
												className="h-4 w-4"
												{...(hasActiveFilters
													? { fill: "currentColor", stroke: "none" }
													: {})}
											/>
											<span className="text-fontSize-sm">
												{t("controls.filter")}
											</span>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-56">
										<DropdownMenuSub>
											<DropdownMenuSubTrigger>
												{t("filters.categories")}
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent className="w-56">
												{(["features", "fixes", "improvements", "work"] as const).map(
													(category) => (
														<DropdownMenuCheckboxItem
															key={category}
															checked={filters.categories.includes(category)}
															onCheckedChange={() => handleCategoryToggle(category)}
															onSelect={(event) => event.preventDefault()}
															className="text-fontSize-sm"
														>
															<span className="mr-2 inline-flex items-center">
																{category === "features" ? (
																	<Sparkles className="h-3 w-3" />
																) : category === "fixes" ? (
																	<ShieldCheck className="h-3 w-3" />
																) : category === "improvements" ? (
																	<TrendingUp className="h-3 w-3" />
																) : (
																	<Cog className="h-3 w-3" />
																)}
															</span>
															{t(`filters.${category}`)}
														</DropdownMenuCheckboxItem>
													),
												)}
											</DropdownMenuSubContent>
										</DropdownMenuSub>
										<DropdownMenuSub>
											<DropdownMenuSubTrigger>
												{t("filters.visibility")}
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent className="w-48">
												{(["public", "internal"] as const).map((value) => (
													<DropdownMenuCheckboxItem
														key={value}
														checked={filters.visibility.includes(value)}
														onCheckedChange={() => handleVisibilityToggle(value)}
														onSelect={(event) => event.preventDefault()}
														className="text-fontSize-sm"
													>
														{t(`filters.${value}`)}
													</DropdownMenuCheckboxItem>
												))}
											</DropdownMenuSubContent>
										</DropdownMenuSub>
										<DropdownMenuSub>
											<DropdownMenuSubTrigger>
												{t("filters.capabilities")}
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent className="w-80">
												{capabilitiesByDomain.size ? (
													Array.from(capabilitiesByDomain.entries()).map(
														([domain, capabilityList]) => (
															<DropdownMenuSub key={domain}>
																<DropdownMenuSubTrigger
																	onSelect={(event) => {
																		event.preventDefault();
																		handleDomainToggle(domain);
																	}}
																	onClick={(event) => {
																		event.preventDefault();
																		handleDomainToggle(domain);
																	}}
																	className="text-fontSize-xs font-semibold"
																>
																	<div className="flex w-full items-center justify-between gap-2">
																		<div className="flex items-center gap-2">
																			<span
																				className="h-2.5 w-2.5 rounded-full"
																				style={{
																					backgroundColor:
																						(domainColorMap[domain] ??
																							getDomainBadgeClass(domain)).dot,
																				}}
																			/>
																			{filters.domains.includes(domain) ? (
																				<Check className="h-3 w-3" />
																			) : null}
																			<span className="max-w-[200px] truncate whitespace-nowrap">
																				{domain}
																			</span>
																		</div>
																		<span className="text-[10px] text-muted-foreground">
																			{capabilityList.length}
																		</span>
																	</div>
																</DropdownMenuSubTrigger>
																<DropdownMenuSubContent className="w-72">
																	{capabilityList.map((capability) => (
																		<DropdownMenuCheckboxItem
																			key={capability.value}
																			checked={filters.capabilities.includes(
																				capability.value,
																			)}
																			onCheckedChange={() =>
																				handleCapabilityToggle(capability.value)
																			}
																			onSelect={(event) =>
																				event.preventDefault()
																			}
																			className="text-fontSize-sm"
																		>
																			{capability.label}
																		</DropdownMenuCheckboxItem>
																	))}
																</DropdownMenuSubContent>
															</DropdownMenuSub>
														),
													)
												) : (
													<DropdownMenuItem disabled className="text-fontSize-sm">
														{t("filters.noCapabilities")}
													</DropdownMenuItem>
												)}
											</DropdownMenuSubContent>
										</DropdownMenuSub>
										<DropdownMenuSub>
											<DropdownMenuSubTrigger>
												{t("filters.date")}
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent className="w-60">
												<DropdownMenuLabel className="text-fontSize-xs text-muted-foreground">
													{t("filters.date")}
												</DropdownMenuLabel>
												<DropdownMenuItem
													onSelect={() => applyDatePreset("last7")}
													className={cn(
														datePreset === "last7" ? "font-semibold" : "",
														"text-fontSize-sm",
													)}
												>
													{t("controls.last7")}
												</DropdownMenuItem>
												<DropdownMenuItem
													onSelect={() => applyDatePreset("last30")}
													className={cn(
														datePreset === "last30" ? "font-semibold" : "",
														"text-fontSize-sm",
													)}
												>
													{t("controls.last30")}
												</DropdownMenuItem>
												<DropdownMenuItem
													onSelect={() => applyDatePreset("lastMonth")}
													className={cn(
														datePreset === "lastMonth" ? "font-semibold" : "",
														"text-fontSize-sm",
													)}
												>
													{t("controls.lastMonth")}
												</DropdownMenuItem>
												<DropdownMenuItem
													onSelect={() => applyDatePreset("all")}
													className={cn(
														datePreset === "all" ? "font-semibold" : "",
														"text-fontSize-sm",
													)}
												>
													{t("controls.allDates")}
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<div className="px-2 pb-2 pt-2">
													<div className="grid gap-2">
														<DatePicker
															value={parseDateString(filters.from)}
															onChange={(date) =>
																handleFromChange(toDateString(date))
															}
															placeholder={t("filters.from")}
														/>
														<DatePicker
															value={parseDateString(filters.to)}
															onChange={(date) =>
																handleToChange(toDateString(date))
															}
															placeholder={t("filters.to")}
														/>
														<Button
															variant="ghost"
															size="sm"
															onClick={clearDates}
															disabled={!filters.from && !filters.to}
														>
															{t("filters.clearDates")}
														</Button>
													</div>
												</div>
											</DropdownMenuSubContent>
										</DropdownMenuSub>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
							{hasActiveFilters ? (
								<div className="flex flex-wrap items-center gap-2">
									{filters.categories.map((category) => (
										<span
											key={category}
											className="flex items-center gap-1 rounded-full border border-border px-1.5 py-0 text-[11px] leading-5 text-muted-foreground"
										>
											{category === "features" ? (
												<Sparkles className="h-3 w-3" />
											) : category === "fixes" ? (
												<ShieldCheck className="h-3 w-3" />
											) : category === "improvements" ? (
												<TrendingUp className="h-3 w-3" />
											) : (
												<Cog className="h-3 w-3" />
											)}
											{t(`filters.${category}`)}
											<button
												type="button"
												onClick={() => handleCategoryToggle(category)}
												className="text-muted-foreground hover:text-foreground"
											>
												<X className="h-3 w-3" />
											</button>
										</span>
									))}
									{filters.visibility.map((value) => (
										<span
											key={value}
											className="flex items-center gap-1 rounded-full border border-border px-1.5 py-0 text-[11px] leading-5 text-muted-foreground"
										>
											{t(`filters.${value}`)}
											<button
												type="button"
												onClick={() => handleVisibilityToggle(value)}
												className="text-muted-foreground hover:text-foreground"
											>
												<X className="h-3 w-3" />
											</button>
										</span>
									))}
									{filters.domains.map((domain) => {
										const color =
											domainColorMap[domain] ?? getDomainBadgeClass(domain);
										return (
											<span
												key={domain}
												className="flex items-center gap-1 rounded-full border border-border px-1.5 py-0 text-[11px] leading-5"
												style={{
													borderColor: color.border,
													backgroundColor: color.background,
													color: color.text,
												}}
											>
												<span
													className="h-2 w-2 rounded-full"
													style={{ backgroundColor: color.dot }}
												/>
												{domain}
												<button
													type="button"
													onClick={() => handleDomainToggle(domain)}
													className="text-muted-foreground hover:text-foreground"
												>
													<X className="h-3 w-3" />
												</button>
											</span>
										);
									})}
									{filters.capabilities.map((capability) => (
										<span
											key={capability}
											className="flex items-center gap-1 rounded-full border border-border px-1.5 py-0 text-[11px] leading-5 text-muted-foreground"
										>
											{capabilityBySlug.get(capability) ?? capability}
											<button
												type="button"
												onClick={() => handleCapabilityToggle(capability)}
												className="text-muted-foreground hover:text-foreground"
											>
												<X className="h-3 w-3" />
											</button>
										</span>
									))}
									{dateFilterLabel ? (
										<span className="flex items-center gap-1 rounded-full border border-border px-1.5 py-0 text-[11px] leading-5 text-muted-foreground">
											{t("filters.date")} {dateFilterLabel}
											<button
												type="button"
												onClick={clearDates}
												className="text-muted-foreground hover:text-foreground"
											>
												<X className="h-3 w-3" />
											</button>
										</span>
									) : null}
									{hasActiveFilters && activeFilterCount > 1 ? (
										<Button
											variant="ghost"
											size="icon"
											onClick={clearAllFilters}
											aria-label={t("filters.clearAll")}
										>
											<X className="h-3 w-3" />
										</Button>
									) : null}
								</div>
							) : null}
						</div>
						<div className="flex items-center text-fontSize-xs text-muted-foreground whitespace-nowrap">
							{t("events.count", { count: filteredEvents.length })}
						</div>
					</div>
					<div
						ref={eventsScrollRef}
						className="flex-1 overflow-y-auto px-5 py-5"
					>
						{bucketGroups.length ? (
							<div className="space-y-6">
								{bucketGroups.map((group, index) => {
									const dateLabel = `${formatShortDate(
										group.summary.bucketStartAt,
										i18n.language,
									)} → ${formatShortDate(
										group.summary.bucketEndAt,
										i18n.language,
									)}`;
									const isSelected =
										selectedBucketId === group.summary.bucketId;
									const isLast = index === bucketGroups.length - 1;

									return (
										<div key={group.summary.bucketId} className="space-y-3">
											<div
												ref={(node) => {
													bucketRefs.current[group.summary.bucketId] = node;
												}}
												className={cn(
													"relative space-y-3 pt-2",
													index === 0 ? "" : "pt-4",
													isSelected ? "rounded-lg px-3 pb-3 pt-4" : "",
												)}
											>
												{isSelected ? (
													<div className="pointer-events-none absolute inset-0 rounded-lg border border-primary/40 bg-primary/5" />
												) : null}
												<div className="space-y-3">
													<div
														className={cn(
															"relative z-10 flex items-start justify-between gap-3 rounded-md px-2 py-2",
														)}
													>
														<div className="flex-1 min-w-0">
															<p className="truncate text-fontSize-xs font-semibold uppercase tracking-wide">
																{group.summary.title}
															</p>
															<p className="text-fontSize-xs text-muted-foreground">
																{dateLabel}
															</p>
														</div>
														<div className="whitespace-nowrap text-fontSize-xs text-muted-foreground">
															{t("events.count", {
																count: group.events.length,
															})}
														</div>
													</div>
												</div>
												<div className="relative z-10 space-y-3">
												{group.events.map((event) => {
													const capabilityLabel =
														(event.capabilitySlug
															? capabilityBySlug.get(event.capabilitySlug)
															: null) ?? t("events.unclassified");
													const domainLabel =
														event.domain ?? t("events.unassigned");
													const typeIcon =
														event.type === "feature" ? (
															<Sparkles className="h-3.5 w-3.5" />
														) : event.type === "fix" ? (
															<ShieldCheck className="h-3.5 w-3.5" />
														) : event.type === "improvement" ? (
															<TrendingUp className="h-3.5 w-3.5" />
														) : (
															<Cog className="h-3.5 w-3.5" />
														);
													return (
														<div
															key={event._id}
															className="rounded-md border border-border/60 bg-card px-3 py-2"
														>
															<div className="flex items-start justify-between gap-3">
																<div className="flex flex-1">
																	<div className="grid w-full grid-cols-[16px_16px_minmax(0,1fr)] items-start gap-x-2 gap-y-2">
																		<TooltipProvider>
																			<Tooltip>
																				<TooltipTrigger asChild>
																					{(() => {
																						const color =
																							domainColorMap[domainLabel] ??
																							getDomainBadgeClass(domainLabel);
																						return (
																							<span
																								className="mt-1 h-2.5 w-2.5 rounded-full border border-border/60"
																								style={{
																									borderColor: color.border,
																									backgroundColor: color.dot,
																								}}
																							/>
																						);
																					})()}
																				</TooltipTrigger>
																				<TooltipContent side="right">
																					{domainLabel}
																				</TooltipContent>
																			</Tooltip>
																		</TooltipProvider>
																		<TooltipProvider>
																			<Tooltip>
																				<TooltipTrigger asChild>
																					<span className="mt-0.5 inline-flex items-center">
																						{typeIcon}
																					</span>
																				</TooltipTrigger>
																				<TooltipContent side="right">
																					{event.type === "feature"
																						? t("filters.features")
																						: event.type === "fix"
																							? t("filters.fixes")
																							: event.type === "improvement"
																								? t("filters.improvements")
																								: t("filters.work")}
																				</TooltipContent>
																			</Tooltip>
																		</TooltipProvider>
																		<p className="line-clamp-1 text-fontSize-sm font-medium">
																			{event.title}
																		</p>
																		<p className="col-span-3 text-fontSize-xs text-muted-foreground mt-1">
																			{capabilityLabel}
																		</p>
																		{event.summary ? (
																			<p className="col-span-3 text-fontSize-sm text-muted-foreground">
																				{event.summary}
																			</p>
																		) : null}
																	</div>
																</div>
																<span className="text-fontSize-xs text-muted-foreground">
																	{event.visibility === "internal"
																		? t("detail.internal")
																		: t("events.public")}
																</span>
															</div>
														</div>
													);
												})}
												</div>
											</div>
											{isLast ? null : (
												<div className="border-t border-border/60" />
											)}
										</div>
									);
								})}
							</div>
						) : (
							<div className="flex h-full flex-col items-center justify-center gap-2 text-center">
								<p className="text-fontSize-sm font-medium">
									{t("events.emptyTitle")}
								</p>
								<p className="text-fontSize-sm text-muted-foreground">
									{t("events.emptyDescription")}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
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
