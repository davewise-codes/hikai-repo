import { ReactNode, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
	Badge,
	Card,
	CardContent,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	cn,
	Sparkles,
	ShieldCheck,
	TrendingUp,
} from "@hikai/ui";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { formatShortDate } from "@/domains/shared/utils";

export type TimelineListEvent = {
	_id: Id<"interpretedEvents">;
	productId: Id<"products">;
	bucketId: string;
	bucketStartAt: number;
	bucketEndAt: number;
	cadence: string;
	kind: string;
	title: string;
	summary?: string;
	narrative?: string;
	occurredAt: number;
	relevance?: number;
	tags?: string[];
	audience?: string;
	domain?: string;
	feature?: string;
	rawEventIds: Id<"rawEvents">[];
	rawEventCount: number;
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
	inferenceLogId?: Id<"aiInferenceLogs">;
};

interface TimelineListProps {
	events: TimelineListEvent[];
	isLoading?: boolean;
	selectedId?: string | null;
	onSelect: (id: string) => void;
	emptyAction?: ReactNode;
}

export function TimelineList({
	events,
	isLoading,
	selectedId,
	onSelect,
	emptyAction,
}: TimelineListProps) {
	const { i18n, t } = useTranslation("timeline");
	const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

	useEffect(() => {
		if (!selectedId) return;
		const element = itemRefs.current[selectedId];
		if (!element) return;
		element.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [selectedId]);

	if (isLoading) {
		return (
			<div className="space-y-8">
				{[0, 1, 2].map((index) => (
					<div
						key={index}
						className="grid grid-cols-[96px_24px_minmax(0,1fr)] items-start gap-4"
					>
						<div className="pt-1 text-right text-fontSize-xs text-muted-foreground">
							<div className="h-3 w-16 rounded-md bg-muted animate-pulse ml-auto" />
						</div>
						<div className="relative flex h-full justify-center">
							<div className="absolute top-4 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-muted-foreground/60 bg-background" />
						</div>
						<Card className="border-dashed">
							<CardContent className="space-y-3 p-4">
								<div className="h-3 w-24 rounded-md bg-muted animate-pulse" />
								<div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
								<div className="h-3 w-1/2 rounded-md bg-muted animate-pulse" />
								<div className="flex gap-2">
									<div className="h-4 w-16 rounded-md bg-muted animate-pulse" />
									<div className="h-4 w-12 rounded-md bg-muted animate-pulse" />
								</div>
							</CardContent>
						</Card>
					</div>
				))}
			</div>
		);
	}

	if (!events.length) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="flex flex-col items-center justify-center gap-2 rounded-lg border p-6 text-center">
					<p className="text-fontSize-sm font-medium">{t("empty.title")}</p>
					<p className="text-fontSize-sm text-muted-foreground max-w-md">
						{t("empty.description")}
					</p>
					{emptyAction}
				</div>
			</div>
		);
	}

	return (
		<div className="relative py-8 space-y-8">
			<div className="pointer-events-none absolute left-[124px] top-0 h-full w-px bg-border" />
			{events.map((event) => {
				const isSelected = selectedId === event._id;
				const formattedDate = formatShortDate(event.occurredAt, i18n.language);
				const hasFeatures = (event.features?.length ?? 0) > 0;
				const hasFixes = (event.fixes?.length ?? 0) > 0;
				const hasImprovements = (event.improvements?.length ?? 0) > 0;
				const domainLabel = event.domain?.trim();
				const impact = event.bucketImpact ?? 1;
				const impactSize =
					impact >= 4 ? "h-4 w-4" : impact >= 2 ? "h-3 w-3" : "h-2 w-2";
				const impactColor =
					impact >= 4
						? "bg-success"
						: impact >= 3
							? "bg-warning"
							: "bg-primary/70";

				return (
					<div
						key={event._id}
						className="grid grid-cols-[96px_24px_minmax(0,1fr)] items-start gap-4"
					>
						<div className="pt-1 text-right text-fontSize-xs text-muted-foreground">
							{formattedDate}
						</div>
						<div className="relative flex h-full justify-center">
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div
											className={cn(
												"absolute top-4 left-1/2 -translate-x-1/2 rounded-full border border-muted-foreground/60",
												impactSize,
												impactColor,
											)}
										/>
									</TooltipTrigger>
									<TooltipContent side="right">
										{t("list.impact", { value: impact })}
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<div
							ref={(node) => {
								itemRefs.current[event._id] = node;
							}}
						>
							<Card
								onClick={() => onSelect(event._id)}
								className={cn(
									"cursor-pointer border transition-shadow duration-150 hover:shadow-sm",
									isSelected ? "border-primary shadow-sm" : "bg-muted/30",
								)}
							>
								<CardContent className="space-y-2 p-3">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-fontSize-sm font-semibold leading-snug">
												{event.title}
											</p>
											{event.bucketImpact ? (
												<span className="sr-only">
													{t("list.impact", { value: event.bucketImpact })}
												</span>
											) : null}
										</div>
										{hasFeatures || hasFixes || hasImprovements ? (
											<div className="flex items-center gap-1.5 text-muted-foreground">
												{hasFeatures ? (
													<Sparkles className="h-3.5 w-3.5" />
												) : null}
												{hasFixes ? (
													<ShieldCheck className="h-3.5 w-3.5" />
												) : null}
												{hasImprovements ? (
													<TrendingUp className="h-3.5 w-3.5" />
												) : null}
											</div>
										) : null}
									</div>
									{event.summary ? (
										<p className="text-fontSize-xs text-muted-foreground line-clamp-2">
											{event.summary}
										</p>
									) : null}
									{domainLabel ? (
										<div className="pt-1">
											<Badge variant="outline" className="text-fontSize-2xs">
												{domainLabel}
											</Badge>
										</div>
									) : null}
								</CardContent>
							</Card>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export function useTimelineKinds(events: TimelineListEvent[]) {
	return useMemo(() => Array.from(new Set(events.map((event) => event.kind))), [events]);
}
