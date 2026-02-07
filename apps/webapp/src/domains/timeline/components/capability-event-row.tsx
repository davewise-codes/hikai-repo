import { useTranslation } from "react-i18next";
import {
	Cog,
	ShieldCheck,
	Sparkles,
	TrendingUp,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@hikai/ui";
import type { TimelineListEvent } from "./timeline-list";
import { formatShortDate } from "@/domains/shared/utils";

interface CapabilityEventRowProps {
	event: TimelineListEvent;
	className?: string;
}

export function CapabilityEventRow({ event, className }: CapabilityEventRowProps) {
	const { t, i18n } = useTranslation("timeline");
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
	const dateLabel = `${formatShortDate(event.bucketStartAt, i18n.language)} → ${formatShortDate(
		event.bucketEndAt,
		i18n.language,
	)}`;
	const visibilityLabel =
		event.visibility === "internal" ? t("detail.internal") : t("events.public");

	return (
		<div className={className}>
			<div className="flex items-start gap-2">
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
				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-start justify-between gap-3">
						<p className="min-w-0 flex-1 truncate text-fontSize-sm font-medium">
							{event.title}
						</p>
						<div className="flex shrink-0 items-center gap-2 text-fontSize-xs text-muted-foreground">
							<span>{visibilityLabel}</span>
							<span aria-hidden="true">•</span>
							<span>{dateLabel}</span>
						</div>
					</div>
					{event.summary ? (
						<p className="mt-1.5 text-fontSize-sm text-muted-foreground">
							{event.summary}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
