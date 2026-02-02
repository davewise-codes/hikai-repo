import { ReactNode, useEffect, useRef } from "react";
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
	Cog,
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
	capabilitySlug?: string;
	domain?: string;
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
	domainColorMap?: Record<
		string,
		{ border: string; background: string; text: string; dot: string }
	>;
	isLoading?: boolean;
	selectedBucketId?: string | null;
	onSelectBucket: (bucketId: string) => void;
	emptyAction?: ReactNode;
}

export function TimelineList({
	buckets,
	domainColorMap,
	isLoading,
	selectedBucketId,
	onSelectBucket,
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
				const domainSet = new Set<string>();
				(summary.domains ?? []).forEach((domain) => domain && domainSet.add(domain));
				events.forEach((event) => {
					if (event.domain) domainSet.add(event.domain);
				});
				const allDomains = Array.from(domainSet);
				const impact = Math.max(1, events.length);
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
									"cursor-pointer border transition-shadow duration-150 hover:shadow-sm",
									selectedBucketId === summary.bucketId
										? "border-primary shadow-sm"
										: "bg-muted/30",
								)}
							>
								<CardContent className="space-y-3 p-4">
									<div className="flex items-center justify-between gap-3">
										<p className="min-w-0 flex-1 truncate text-fontSize-sm font-semibold leading-snug">
											{summary.title}
										</p>
										<div className="flex items-center gap-2 text-muted-foreground">
											{events.some((event) => event.type === "feature") ? (
												<Sparkles className="h-3.5 w-3.5" />
											) : null}
											{events.some((event) => event.type === "fix") ? (
												<ShieldCheck className="h-3.5 w-3.5" />
											) : null}
											{events.some((event) => event.type === "improvement") ? (
												<TrendingUp className="h-3.5 w-3.5" />
											) : null}
											{events.some(
												(event) =>
													event.type === "work" || event.type === "other",
											) ? (
												<Cog className="h-3.5 w-3.5" />
											) : null}
										</div>
									</div>
									{summary.narrative ? (
										<p className="text-fontSize-xs text-muted-foreground line-clamp-2">
											{summary.narrative}
										</p>
									) : null}
									{allDomains.length ? (
										<div className="flex flex-wrap gap-1.5 pt-1">
											{allDomains.map((domain) => (
												<Badge
													key={domain}
													variant="outline"
													className="text-fontSize-2xs"
													style={(() => {
														const color =
															domainColorMap?.[domain] ??
															getDomainBadgeClass(domain);
														return {
															borderColor: color.border,
															backgroundColor: color.background,
															color: color.text,
														};
													})()}
												>
													{domain}
												</Badge>
											))}
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

function getDomainBadgeClass(domain: string) {
	let hash = 0;
	for (let i = 0; i < domain.length; i += 1) {
		hash = (hash * 31 + domain.charCodeAt(i)) % 2147483647;
	}
	const hue = Math.abs(hash) % 360;
	return buildDomainColor(hue);
}

function buildDomainColor(hue: number) {
	return {
		border: `hsla(${hue}, 70%, 55%, 0.5)`,
		background: `hsla(${hue}, 70%, 20%, 0.4)`,
		text: `hsl(${hue}, 75%, 82%)`,
		dot: `hsl(${hue}, 75%, 55%)`,
	};
}
