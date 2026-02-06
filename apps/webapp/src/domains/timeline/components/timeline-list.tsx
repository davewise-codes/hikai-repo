import { ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
	Card,
	CardContent,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	cn,
} from "@hikai/ui";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { formatShortDate } from "@/domains/shared/utils";
import { BucketHero } from "./bucket-hero";
import { BucketCompact } from "./bucket-compact";
import type { DomainColorMap } from "./domain-list";

export type TimelineListEvent = {
	_id: Id<"interpretedEvents">;
	productId: Id<"products">;
	bucketId: string;
	bucketStartAt: number;
	bucketEndAt: number;
	cadence: string;
	capabilitySlug?: string;
	domain?: string;
	surface:
		| "product_front"
		| "platform"
		| "infra"
		| "marketing"
		| "doc"
		| "management"
		| "admin"
		| "analytics";
	type: "feature" | "fix" | "improvement" | "work" | "other";
	title: string;
	summary?: string;
	occurredAt: number;
	relevance?: number;
	visibility?: "public" | "internal";
	rawEventIds: Id<"rawEvents">[];
	rawEventCount: number;
	bucketImpact?: number;
	inferenceLogId?: Id<"aiInferenceLogs">;
};

export type TimelineBucketSummary = {
	_id: Id<"bucketSummaries">;
	productId: Id<"products">;
	bucketId: string;
	bucketStartAt: number;
	bucketEndAt: number;
	cadence: string;
	title: string;
	narrative?: string;
	domains?: string[];
	eventCount: number;
};

interface TimelineListProps {
	buckets: Array<{
		summary: TimelineBucketSummary;
		events: TimelineListEvent[];
	}>;
	productDomains?: string[];
	domainColorMap?: DomainColorMap;
	isLoading?: boolean;
	selectedBucketId?: string | null;
	onSelectBucket: (bucketId: string) => void;
	onToggleDomain?: (domain: string) => void;
	emptyAction?: ReactNode;
}

export function TimelineList({
	buckets,
	productDomains,
	domainColorMap,
	isLoading,
	selectedBucketId,
	onSelectBucket,
	onToggleDomain,
	emptyAction,
}: TimelineListProps) {
	const { i18n, t } = useTranslation("timeline");
	const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

	useEffect(() => {
		if (!selectedBucketId) return;
		const element = itemRefs.current[selectedBucketId];
		if (!element) return;
		element.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [selectedBucketId]);

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

	if (!buckets.length) {
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
			{buckets.map(({ summary, events }) => {
				const formattedDate = `${formatShortDate(
					summary.bucketStartAt,
					i18n.language,
				)} → ${formatShortDate(summary.bucketEndAt, i18n.language)}`;
				const impactedDomainSet = new Set<string>();
				(summary.domains ?? []).forEach((domain) => {
					if (domain) impactedDomainSet.add(domain);
				});
				events.forEach((event) => {
					if (event.domain) impactedDomainSet.add(event.domain);
				});
				const impactedDomains = Array.from(impactedDomainSet);
				const impact = Math.max(1, events.length);
				const impactSize =
					impact >= 4 ? "h-4 w-4" : impact >= 2 ? "h-3 w-3" : "h-2 w-2";
				const impactColor =
					impact >= 4
						? "bg-success"
						: impact >= 3
							? "bg-warning"
							: "bg-primary/70";
				const isActive = selectedBucketId === summary.bucketId;
				const categoryCounts = {
					feature: events.filter((event) => event.type === "feature").length,
					improvement: events.filter((event) => event.type === "improvement")
						.length,
					fix: events.filter((event) => event.type === "fix").length,
					work: events.filter(
						(event) => event.type === "work" || event.type === "other",
					).length,
				};
				const categoryPresence = {
					feature: categoryCounts.feature > 0,
					improvement: categoryCounts.improvement > 0,
					fix: categoryCounts.fix > 0,
					work: categoryCounts.work > 0,
				};

				return (
					<div
						key={summary.bucketId}
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
								itemRefs.current[summary.bucketId] = node;
							}}
						>
							<Card
								onClick={() => onSelectBucket(summary.bucketId)}
								className={cn(
									"cursor-pointer border transition-all duration-300",
									isActive
										? "border-primary shadow-sm"
										: "bg-muted/30",
								)}
							>
								<CardContent className={cn("p-4", isActive && "py-6")}>
									<AnimatePresence mode="wait" initial={false}>
										{isActive ? (
											<motion.div
												key={`${summary.bucketId}-hero`}
												initial={{ opacity: 0, height: 0 }}
												animate={{ opacity: 1, height: "auto" }}
												exit={{ opacity: 0, height: 0 }}
												transition={{ duration: 0.3 }}
												className="overflow-hidden space-y-4"
											>
												<BucketHero
													title={summary.title}
													narrative={summary.narrative}
													categoryCounts={categoryCounts}
													productDomains={productDomains ?? impactedDomains}
													impactedDomains={impactedDomainSet}
													domainColorMap={domainColorMap}
												/>
											</motion.div>
										) : (
											<motion.div
												key={`${summary.bucketId}-compact`}
												initial={{ opacity: 0, height: 0 }}
												animate={{ opacity: 1, height: "auto" }}
												exit={{ opacity: 0, height: 0 }}
												transition={{ duration: 0.25 }}
												className="overflow-hidden space-y-3"
											>
												<BucketCompact
													title={summary.title}
													categories={categoryPresence}
													impactedDomains={impactedDomains}
													domainColorMap={domainColorMap}
												/>
											</motion.div>
										)}
									</AnimatePresence>
								</CardContent>
							</Card>
						</div>
					</div>
				);
			})}
		</div>
	);
}
