import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@hikai/ui";
import { formatShortDate } from "@/domains/shared/utils";
import type { DomainColorMap } from "./domain-list";
import type { TimelineListEvent, TimelineBucketSummary } from "./timeline-list";
import { TimelineEventRow } from "./event-row";

interface EventsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	bucket?: { summary: TimelineBucketSummary; events: TimelineListEvent[] } | null;
	isLoading?: boolean;
	capabilityBySlug: Map<string, string>;
	domainColorMap: DomainColorMap;
}

export function EventsDialog({
	open,
	onOpenChange,
	bucket,
	isLoading,
	capabilityBySlug,
	domainColorMap,
}: EventsDialogProps) {
	const { t, i18n } = useTranslation("timeline");

	const bucketLabel = useMemo(() => {
		if (!bucket) return null;
		return `${formatShortDate(
			bucket.summary.bucketStartAt,
			i18n.language,
		)} → ${formatShortDate(bucket.summary.bucketEndAt, i18n.language)}`;
	}, [bucket, i18n.language]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[min(80vh,760px)] w-[min(92vw,980px)] max-w-none flex-col">
				<DialogHeader>
					<DialogTitle>{t("events.title")}</DialogTitle>
					{bucketLabel ? (
						<p className="text-fontSize-xs text-muted-foreground">
							{bucketLabel}
						</p>
					) : null}
				</DialogHeader>
				<div className="mt-4 flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="flex h-full flex-col items-center justify-center gap-2 text-center">
							<div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
							<p className="text-fontSize-sm font-medium">
								{t("fullSync.clearing")}
							</p>
							<p className="text-fontSize-sm text-muted-foreground">
								{t("fullSync.clearingDescription")}
							</p>
						</div>
					) : bucket?.events.length ? (
						<div className="divide-y divide-border/60">
							{bucket.events.map((event) => (
								<div key={event._id} className="py-3">
									<TimelineEventRow
										event={event}
										capabilityBySlug={capabilityBySlug}
										domainColorMap={domainColorMap}
									/>
								</div>
							))}
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
			</DialogContent>
		</Dialog>
	);
}
