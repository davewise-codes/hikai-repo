import {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Button,
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
	Popover,
	PopoverContent,
	PopoverTrigger,
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
	Database,
	Filter as FilterIcon,
	Sparkles,
	ShieldCheck,
	TrendingUp,
	X,
} from "@hikai/ui";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { api } from "@hikai/convex";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug } from "@/domains/products/hooks";
import { useConnections } from "@/domains/connectors/hooks";
import {
	useTimeline,
	useTimelineEventDetails,
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
	const { timeline, isLoading } = useTimeline({ productId, refreshKey });
	const isTimelineLoading = isLoading || product === undefined;
	const { connections, isLoading: isConnectionsLoading } =
		useConnections(productId);
	const triggerSync = useTriggerSync();
	const [isSyncing, setIsSyncing] = useState(false);
	const [isRegenerating, setIsRegenerating] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [filters, setFilters] = useState<TimelineFilterState>({
		focusAreas: [],
		categories: [],
		from: "",
		to: "",
	});
	const [datePreset, setDatePreset] = useState<
		"all" | "last7" | "last30" | "lastMonth"
	>("all");
	const currentContext = useQuery(
		api.products.products.getCurrentProductContextSnapshot,
		productId ? { productId } : "skip",
	);

	const focusAreaOptions = useMemo(() => {
		const names = new Set<string>();
		const addNames = (items?: Array<{ name?: string }>) => {
			items?.forEach((item) => {
				if (item?.name) names.add(item.name);
			});
		};
		addNames(currentContext?.productDomains);
		addNames(currentContext?.keyFeatures);
		names.add("Technical");
		return Array.from(names).sort((a, b) => a.localeCompare(b));
	}, [currentContext]);

	const activeConnection = useMemo(
		() => connections?.find((connection) => connection.status === "active"),
		[connections],
	);

	const filteredEvents = useMemo(() => {
		if (!timeline) return [];
		return timeline.filter((event) => {
			const matchFocusAreas =
				filters.focusAreas.length === 0 ||
				(event.focusAreas ?? []).some((area) =>
					filters.focusAreas.includes(area),
				);
			const matchCategories =
				filters.categories.length === 0 ||
				filters.categories.some((category) => {
					if (category === "features") return (event.features?.length ?? 0) > 0;
					if (category === "fixes") return (event.fixes?.length ?? 0) > 0;
					if (category === "improvements")
						return (event.improvements?.length ?? 0) > 0;
					return false;
				});
			const matchFrom =
				!filters.from || event.occurredAt >= new Date(filters.from).getTime();
			const matchTo =
				!filters.to || event.occurredAt <= new Date(filters.to).getTime();
			return matchFocusAreas && matchCategories && matchFrom && matchTo;
		});
	}, [filters, timeline]);

	const sortedEvents = useMemo(
		() => [...filteredEvents].sort((a, b) => a.occurredAt - b.occurredAt),
		[filteredEvents],
	);

	const timeScale = useMemo(() => {
		if (!filteredEvents.length) return null;
		const min = Math.min(...filteredEvents.map((e) => e.occurredAt));
		const max = Math.max(...filteredEvents.map((e) => e.occurredAt));
		return { min, max };
	}, [filteredEvents]);

	const bucketedLayout = useMemo(() => {
		if (!timeScale) return null;
		const recentFirst = [...sortedEvents].sort(
			(a, b) => b.occurredAt - a.occurredAt,
		);
		const spacing = 220;
		const paddingPx = 300;
		const totalHeight = Math.max(
			paddingPx * 2 + recentFirst.length * spacing,
			1600,
		);

		const positionedEvents = recentFirst.map((event, index) => ({
			...event,
			positionPercent: ((paddingPx + index * spacing) / totalHeight) * 100,
		}));

		return {
			positionedEvents,
			totalHeight,
			timeTicks: [],
			densitySegments: [],
		};
	}, [i18n.language, sortedEvents, timeScale]);


	useEffect(() => {
		if (!filteredEvents.length) {
			setSelectedId(null);
			return;
		}
		if (selectedId && filteredEvents.some((event) => event._id === selectedId))
			return;
		setSelectedId(filteredEvents[0]._id);
	}, [filteredEvents, selectedId]);

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

	const selectPrev = useCallback(() => {
		if (!filteredEvents.length || !selectedId) return;
		const currentIndex = filteredEvents.findIndex(
			(item) => item._id === selectedId,
		);
		if (currentIndex <= 0) return;
		setSelectedId(filteredEvents[currentIndex - 1]._id);
	}, [filteredEvents, selectedId]);

	const selectNext = useCallback(() => {
		if (!filteredEvents.length || !selectedId) return;
		const currentIndex = filteredEvents.findIndex(
			(item) => item._id === selectedId,
		);
		if (currentIndex === -1 || currentIndex >= filteredEvents.length - 1)
			return;
		setSelectedId(filteredEvents[currentIndex + 1]._id);
	}, [filteredEvents, selectedId]);

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
	const sourceContexts = useQuery(
		api.agents.sourceContext.listSourceContexts,
		productId ? { productId } : "skip",
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
	const sourceContextLabels = useMemo(
		() => ({
			product_core: t("progress.sourceProductCore"),
			marketing_surface: t("progress.sourceMarketingSurface"),
			infra: t("progress.sourceInfra"),
			docs: t("progress.sourceDocs"),
			experiments: t("progress.sourceExperiments"),
			unknown: t("progress.sourceUnknown"),
		}),
		[t],
	);
	const orderedSourceContexts = useMemo(() => {
		if (!sourceContexts?.length) return [];
		return [...sourceContexts].sort((a, b) =>
			a.sourceId.localeCompare(b.sourceId),
		);
	}, [sourceContexts]);

	const selectedEvent = useMemo(
		() => filteredEvents.find((event) => event._id === selectedId) ?? null,
		[filteredEvents, selectedId],
	);
	const eventDetails = useTimelineEventDetails(
		productId,
		selectedId ? (selectedId as Id<"interpretedEvents">) : undefined,
	);

	const showConnectCta = !isConnectionsLoading && !activeConnection;
	const handleFocusAreaToggle = useCallback((value: string) => {
		setFilters((prev) => ({
			...prev,
			focusAreas: prev.focusAreas.includes(value)
				? prev.focusAreas.filter((item) => item !== value)
				: [...prev.focusAreas, value],
		}));
	}, []);

	const handleCategoryToggle = useCallback((value: "features" | "fixes" | "improvements") => {
		setFilters((prev) => ({
			...prev,
			categories: prev.categories.includes(value)
				? prev.categories.filter((item) => item !== value)
				: [...prev.categories, value],
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
		setFilters({ focusAreas: [], categories: [], from: "", to: "" });
	}, []);

	const hasActiveFilters =
		filters.focusAreas.length > 0 ||
		filters.categories.length > 0 ||
		!!filters.from ||
		!!filters.to;

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
		if (filteredEvents.length) setSelectedId(filteredEvents[0]._id);
	}, [filteredEvents]);

	return (
		<div className="flex h-[calc(100vh-64px)] flex-col gap-4 overflow-hidden p-5">
			<div className="grid flex-1 grid-rows-[auto_1fr] gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_560px]">
				<div className="col-start-1 row-start-1 flex flex-col gap-2 px-2 md:px-6">
					<div className="flex items-start justify-between gap-4">
						<h1 className="text-2xl font-semibold">{t("title")}</h1>
						<div className="flex h-8 flex-wrap items-center gap-2">
							<Button
								variant="outline"
								size="ultra"
								onClick={selectPrev}
								disabled={!filteredEvents.length || !selectedId}
								aria-label={t("controls.prev")}
							>
								<ArrowUp className="h-4 w-4" />
								<span className="text-fontSize-sm">{t("controls.prev")}</span>
							</Button>
							<Button
								variant="outline"
								size="ultra"
								onClick={selectNext}
								disabled={
									!filteredEvents.length ||
									!selectedId ||
									filteredEvents[filteredEvents.length - 1]?._id === selectedId
								}
								aria-label={t("controls.next")}
							>
								<ArrowDown className="h-4 w-4" />
								<span className="text-fontSize-sm">{t("controls.next")}</span>
							</Button>
						<Button variant="outline" size="ultra" onClick={handleToday}>
							<ArrowUpToLine className="h-4 w-4" />
							<span className="text-fontSize-sm">{t("navigator.today")}</span>
						</Button>
					</div>
				</div>
					<div className="flex min-h-[22px] items-center justify-end gap-4">
						<div className="flex flex-wrap items-center justify-end gap-2 text-fontSize-xs text-muted-foreground">
							{hasActiveFilters ? (
								<Button
									variant="ghost"
									size="icon"
									onClick={clearAllFilters}
									aria-label={t("filters.clearAll")}
								>
									<X className="h-3.5 w-3.5" />
								</Button>
							) : null}
							{filters.focusAreas.map((area) => (
								<span
									key={area}
									className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5"
								>
									{area}
									<button
										type="button"
										onClick={() => handleFocusAreaToggle(area)}
										className="text-muted-foreground hover:text-foreground"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							))}
							{filters.categories.map((category) => (
								<span
									key={category}
									className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5"
								>
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
							{dateFilterLabel ? (
								<span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
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
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="ultra">
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
										{t("filters.focusAreas")}
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent className="w-56">
										{focusAreaOptions.length ? (
											focusAreaOptions.map((area) => (
												<DropdownMenuCheckboxItem
													key={area}
													checked={filters.focusAreas.includes(area)}
													onCheckedChange={() => handleFocusAreaToggle(area)}
													onSelect={(event) => event.preventDefault()}
													className="text-fontSize-sm"
												>
													{area}
												</DropdownMenuCheckboxItem>
											))
										) : (
											<DropdownMenuItem disabled className="text-fontSize-sm">
												{t("filters.noFocusAreas")}
											</DropdownMenuItem>
										)}
									</DropdownMenuSubContent>
								</DropdownMenuSub>
								<DropdownMenuSub>
									<DropdownMenuSubTrigger>
										{t("filters.categories")}
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent className="w-56">
										{(["features", "fixes", "improvements"] as const).map(
											(category) => (
												<DropdownMenuCheckboxItem
													key={category}
													checked={filters.categories.includes(category)}
													onCheckedChange={() => handleCategoryToggle(category)}
													onSelect={(event) => event.preventDefault()}
													className="text-fontSize-sm"
												>
													{t(`filters.${category}`)}
												</DropdownMenuCheckboxItem>
											),
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
													onChange={(date) => handleToChange(toDateString(date))}
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
				</div>
				<div className="col-start-2 row-start-1 flex items-start justify-end px-2 md:px-6">
					<TooltipProvider>
						<div className="flex flex-col items-end gap-2">
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
							{latestRun ? (
								<div className="flex w-full items-center justify-between text-fontSize-xs">
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												className="h-7 gap-2 px-2 text-fontSize-xs"
											>
												<Database className="h-3.5 w-3.5" />
												<span>{t("progress.sources")}</span>
											</Button>
										</PopoverTrigger>
										<PopoverContent align="start" className="w-64">
											<div className="space-y-3">
												<div className="text-fontSize-sm font-medium">
													{t("progress.sourcesTitle")}
												</div>
												{orderedSourceContexts.length ? (
													<div className="space-y-2">
														{orderedSourceContexts.map((context) => (
															<div key={context._id} className="space-y-1">
																<div className="flex items-center justify-between gap-3">
																	<span className="truncate text-fontSize-sm">
																		{context.sourceId}
																	</span>
																	<span className="text-fontSize-xs text-muted-foreground">
																		{
																			sourceContextLabels[
																				context.classification
																			]
																		}
																	</span>
																</div>
																{context.notes ? (
																	<p className="text-fontSize-xs text-muted-foreground">
																		{context.notes}
																	</p>
																) : null}
															</div>
														))}
													</div>
												) : (
													<p className="text-fontSize-sm text-muted-foreground">
														{t("progress.sourcesEmpty")}
													</p>
												)}
											</div>
										</PopoverContent>
									</Popover>
									<div
										className={cn(
											"flex items-center gap-2",
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
								</div>
							) : null}
						</div>
					</TooltipProvider>
				</div>

				<div className="relative col-start-1 row-span-2 h-full overflow-hidden rounded-lg bg-background">
					<div
						className="relative h-full overflow-y-auto px-2 py-4"
						style={{
							maskImage:
								"linear-gradient(to bottom, transparent 0px, black 72px, black calc(100% - 72px), transparent 100%)",
							WebkitMaskImage:
								"linear-gradient(to bottom, transparent 0px, black 72px, black calc(100% - 72px), transparent 100%)",
						}}
					>
						<div className="px-2 md:px-6">
							<TimelineList
								events={
									(bucketedLayout?.positionedEvents ??
										sortedEvents) as TimelineListEvent[]
								}
								isLoading={isTimelineLoading}
								selectedId={selectedId}
								onSelect={(id) => setSelectedId(id)}
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

				<DetailPanel
					event={eventDetails?.event ?? selectedEvent}
					rawEvents={eventDetails?.rawEvents ?? []}
					isLoading={isTimelineLoading}
					locale={i18n.language}
					className="col-start-2 row-start-2"
				/>
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
	className?: string;
}

function DetailPanel({
	event,
	rawEvents,
	isLoading,
	locale,
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
	const focusAreas = event?.focusAreas ?? [];
	const displayFocusAreas = focusAreas.map((area) =>
		area === "Other" ? t("detail.internalGroup") : area,
	);
	const shouldShowInternalNote = !displayFocusAreas.length;
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
		items: Array<{
			title: string;
			summary?: string;
			focusArea?: string;
			visibility?: "public" | "internal";
		}>,
		emptyLabel: string,
	) => {
		if (!items.length) {
			return (
				<p className="text-fontSize-sm text-muted-foreground">{emptyLabel}</p>
			);
		}

		const fallbackArea = t("detail.focusAreaOther");
		const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
			const rawArea = item.focusArea?.trim();
			const key = rawArea === "Other" ? t("detail.internalGroup") : rawArea || fallbackArea;
			if (!acc[key]) acc[key] = [];
			acc[key].push(item);
			return acc;
		}, {});

		return (
			<div className="space-y-4">
				{Object.entries(grouped).map(([area, areaItems]) => (
					<div key={area} className="space-y-2">
						<p className="text-fontSize-xs uppercase tracking-wide text-muted-foreground">
							{area}
						</p>
						<div className="space-y-2">
							{areaItems.map((item, index) => (
								<div
									key={`${area}-${index}`}
									className="rounded-md border border-border p-3"
								>
									<div className="flex items-center justify-between gap-2">
										<p className="text-fontSize-sm font-medium">{item.title}</p>
										{item.visibility === "internal" ? (
											<span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
												{t("detail.internal")}
											</span>
										) : null}
									</div>
									{item.summary ? (
										<p className="mt-1 text-fontSize-xs text-muted-foreground">
											{item.summary}
										</p>
									) : null}
								</div>
							))}
						</div>
					</div>
				))}
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
					{event && displayFocusAreas.length ? (
						<p className="mt-2 text-fontSize-xs text-muted-foreground">
							{t("detail.focusAreasLabel")} {displayFocusAreas.join(" · ")}
						</p>
					) : event && shouldShowInternalNote ? (
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
											{event.narrative ? (
												<p className="text-fontSize-sm whitespace-pre-wrap break-words">
													{event.narrative}
												</p>
											) : null}
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
											event.features ?? [],
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
										{renderCategory(event.fixes ?? [], t("detail.empty.fixes"))}
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
											event.improvements ?? [],
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
