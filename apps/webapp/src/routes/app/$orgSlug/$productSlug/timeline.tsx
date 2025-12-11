import {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Separator,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	toast,
	cn,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@hikai/ui";
import {
	ArrowDown,
	ArrowUp,
	Clock,
	Refresh,
	Filter as FilterIcon,
} from "@hikai/ui";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug } from "@/domains/products/hooks";
import { useConnections } from "@/domains/connectors/hooks";
import { useTimeline, useTriggerSync } from "@/domains/timeline/hooks";
import {
	TimelineFilterState,
	TimelineList,
	TimelineListEvent,
	useTimelineKinds,
} from "@/domains/timeline";
import { formatRelativeDate, formatShortDate } from "@/domains/shared/utils";

type DensitySegment = {
	heightPercent: number;
	intensity: number;
};

type TimeTick = { label: string; positionPercent: number };

export const Route = createFileRoute("/app/$orgSlug/$productSlug/timeline")({
	component: TimelinePage,
});

function TimelinePage() {
	const { t, i18n } = useTranslation("timeline");
	const { orgSlug, productSlug } = Route.useParams();
	const { currentOrg } = useCurrentOrg();
	const product = useGetProductBySlug(currentOrg?._id, productSlug);
	const productId = product?._id;
	const { timeline, isLoading, error } = useTimeline({ productId });
	const isTimelineLoading = isLoading || product === undefined;
	const { connections, isLoading: isConnectionsLoading } =
		useConnections(productId);
	const triggerSync = useTriggerSync();
	const [isSyncing, setIsSyncing] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [filters, setFilters] = useState<TimelineFilterState>({
		kind: "all",
		from: "",
		to: "",
	});
	const [datePreset, setDatePreset] = useState<
		"all" | "last7" | "last30" | "lastMonth"
	>("all");

	const activeConnection = useMemo(
		() => connections?.find((connection) => connection.status === "active"),
		[connections],
	);

	const filteredEvents = useMemo(() => {
		if (!timeline) return [];
		return timeline.filter((event) => {
			const matchKind = filters.kind === "all" || event.kind === filters.kind;
			const matchFrom =
				!filters.from || event.occurredAt >= new Date(filters.from).getTime();
			const matchTo =
				!filters.to || event.occurredAt <= new Date(filters.to).getTime();
			return matchKind && matchFrom && matchTo;
		});
	}, [filters.from, filters.kind, filters.to, timeline]);

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

	const kinds = useTimelineKinds(timeline ?? []);

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

	const selectedEvent = useMemo(
		() => filteredEvents.find((event) => event._id === selectedId) ?? null,
		[filteredEvents, selectedId],
	);

	const timelineSubtitle = useMemo(() => {
		if (product === undefined) return t("subtitleLoading");
		if (!product) return t("subtitleMissing");
		if (error) return t("subtitleError");
		return t("subtitleReady");
	}, [error, product, t]);

	const showConnectCta = !isConnectionsLoading && !activeConnection;
	const handleKindChange = useCallback(
		(value: string) => setFilters((prev) => ({ ...prev, kind: value })),
		[],
	);
	const handleToday = useCallback(() => {
		setFilters((prev) => ({ ...prev, from: "", to: "" }));
		if (filteredEvents.length) setSelectedId(filteredEvents[0]._id);
	}, [filteredEvents]);

	return (
		<div className="flex h-[calc(100vh-64px)] flex-col gap-4 overflow-hidden p-5">
			<div className="grid flex-1 grid-rows-[auto_1fr] gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_480px]">
				<div className="col-start-1 row-start-1 flex flex-col justify-center">
					<h1 className="text-2xl font-semibold">{t("title")}</h1>
				</div>
				<div className="col-start-2 row-start-1 flex items-start justify-end">
					<div className="flex h-8 flex-wrap items-center gap-2 rounded-md border bg-background px-3 shadow-sm">
						<Button
							variant="ghost"
							size="icon"
							onClick={selectPrev}
							disabled={!filteredEvents.length || !selectedId}
							aria-label={t("controls.prev")}
						>
							<ArrowUp className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={selectNext}
							disabled={
								!filteredEvents.length ||
								!selectedId ||
								filteredEvents[filteredEvents.length - 1]?._id === selectedId
							}
							aria-label={t("controls.next")}
						>
							<ArrowDown className="h-4 w-4" />
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
									<FilterIcon className="h-4 w-4" />
									<span className="text-fontSize-sm">
										{t("controls.filter")}
									</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48">
								<DropdownMenuLabel className="text-fontSize-xs text-muted-foreground">
									{t("controls.type")}
								</DropdownMenuLabel>
								{kinds.map((kind) => (
									<DropdownMenuItem
										key={kind}
										onSelect={() => handleKindChange(kind)}
										className={cn(
											"text-fontSize-sm capitalize",
											filters.kind === kind ? "font-semibold" : "",
										)}
									>
										{kind === "all" ? t("controls.allKinds") : kind}
									</DropdownMenuItem>
								))}
								<DropdownMenuSeparator />
								<DropdownMenuLabel className="text-fontSize-xs text-muted-foreground">
									{t("controls.date")}
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
							</DropdownMenuContent>
						</DropdownMenu>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleSync}
							disabled={
								!productId ||
								isSyncing ||
								isTimelineLoading ||
								isConnectionsLoading ||
								!activeConnection
							}
							aria-label={t("sync.label")}
							className="h-7 w-7"
						>
							<Refresh className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="h-7 px-2"
							onClick={handleToday}
						>
							{t("navigator.today")}
						</Button>
					</div>
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
					event={selectedEvent}
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
	isLoading: boolean;
	locale: string;
	className?: string;
}

function DetailPanel({
	event,
	isLoading,
	locale,
	className,
}: DetailPanelProps) {
	const { t } = useTranslation("timeline");

	return (
		<div className={cn("flex h-full min-h-0 flex-col", className)}>
			<Card className="flex h-full min-h-0 flex-col">
				<CardHeader className="pb-3">
					<CardTitle className="text-lg leading-tight">
						{isLoading
							? t("detail.title")
							: (event?.title ?? t("detail.emptyTitle"))}
					</CardTitle>
					{event ? (
						<div className="mt-2 flex flex-wrap gap-2">
							<Badge variant="outline" className="text-fontSize-xs">
								{event.kind}
							</Badge>
							{event.tags?.slice(0, 4).map((tag) => (
								<Badge
									key={tag}
									variant="secondary"
									className="text-fontSize-xs"
								>
									{tag}
								</Badge>
							))}
						</div>
					) : null}
				</CardHeader>
				<CardContent className="flex-1 overflow-hidden">
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
							defaultValue="overview"
							className="flex h-full min-h-0 flex-col"
						>
							<TabsList className="w-full justify-start">
								<TabsTrigger value="overview">
									{t("detail.tabs.overview")}
								</TabsTrigger>
								<TabsTrigger value="activity">
									{t("detail.tabs.activity")}
								</TabsTrigger>
							</TabsList>
							<TabsContent
								value="overview"
								className="mt-4 flex-1 overflow-hidden"
							>
								<div className="h-full overflow-y-auto rounded-lg border">
									<div className="space-y-2 p-4 break-words">
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
										<p className="text-fontSize-sm text-muted-foreground">
											{t("detail.activityPlaceholder")}
										</p>
									</div>
								</div>
							</TabsContent>
						</Tabs>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
