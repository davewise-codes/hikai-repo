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
import type { DomainColorMap } from "./domain-list";

interface TimelineEventRowProps {
	event: TimelineListEvent;
	capabilityBySlug: Map<string, string>;
	domainColorMap: DomainColorMap;
	className?: string;
}

export function TimelineEventRow({
	event,
	capabilityBySlug,
	domainColorMap,
	className,
}: TimelineEventRowProps) {
	const { t } = useTranslation("timeline");
	const capabilityLabel =
		(event.capabilitySlug ? capabilityBySlug.get(event.capabilitySlug) : null) ??
		t("events.unclassified");
	const domainKey = event.domain ?? "";
	const domainLabel = event.domain ?? t("events.unassigned");
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
	const color = domainColorMap[domainKey];

	return (
		<div className={className}>
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-1">
					<div className="grid w-full grid-cols-[16px_16px_minmax(0,1fr)] items-start gap-x-2 gap-y-2">
						<p className="col-span-3 text-fontSize-xs text-muted-foreground">
							{capabilityLabel}
						</p>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span
										className="mt-1 h-2.5 w-2.5 rounded-full border border-border/60"
										style={{
											borderColor: color?.border,
											backgroundColor: color?.dot,
										}}
									/>
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
						{event.summary ? (
							<p className="col-span-3 mt-1.5 text-fontSize-sm text-muted-foreground">
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
}
