import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Sparkles,
	TrendingUp,
	ShieldCheck,
	Cog,
	Badge,
} from "@hikai/ui";
import { formatShortDate } from "@/domains/shared/utils";
import type { DomainColorMap } from "./domain-list";
import type { TimelineListEvent, TimelineBucketSummary } from "./timeline-list";

interface EventsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	bucket?: { summary: TimelineBucketSummary; events: TimelineListEvent[] } | null;
	isLoading?: boolean;
	capabilityBySlug: Map<string, string>;
	domainColorMap: DomainColorMap;
}

const sectionMeta = [
	{ key: "feature", labelKey: "filters.features", icon: Sparkles },
	{ key: "improvement", labelKey: "filters.improvements", icon: TrendingUp },
	{ key: "fix", labelKey: "filters.fixes", icon: ShieldCheck },
	{ key: "work", labelKey: "filters.work", icon: Cog },
] as const;

function BucketEventRow({ event }: { event: TimelineListEvent }) {
	return (
		<div className="space-y-1.5">
			<p className="text-fontSize-sm font-medium">{event.title}</p>
			{event.summary ? (
				<p className="text-fontSize-sm text-muted-foreground">
					{event.summary}
				</p>
			) : null}
		</div>
	);
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
	const bucketTitle = bucket?.summary.title ?? t("events.title");
	const events = bucket?.events ?? [];
	const eventsByVisibility = useMemo(() => {
		const internal = events.filter((event) => event.visibility === "internal");
		const external = events.filter((event) => event.visibility !== "internal");
		return { internal, external };
	}, [events]);
	const defaultTab = eventsByVisibility.external.length
		? "external"
		: "internal";
	const buildGrouped = (list: TimelineListEvent[]) => {
		const grouped = new Map<
			string,
			{ capability: string; events: TimelineListEvent[] }[]
		>();
		const domainIndex = new Map<
			string,
			Map<string, { capability: string; events: TimelineListEvent[] }>
		>();
		list.forEach((event) => {
			const domain = event.domain ?? t("events.unassigned");
			const capability =
				(event.capabilitySlug
					? capabilityBySlug.get(event.capabilitySlug)
					: null) ?? t("events.unclassified");
			const caps =
				domainIndex.get(domain) ??
				new Map<string, { capability: string; events: TimelineListEvent[] }>();
			const capEntry =
				caps.get(capability) ?? { capability, events: [] as TimelineListEvent[] };
			capEntry.events.push(event);
			caps.set(capability, capEntry);
			domainIndex.set(domain, caps);
		});
		Array.from(domainIndex.entries()).forEach(([domain, caps]) => {
			grouped.set(domain, Array.from(caps.values()));
		});
		return grouped;
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[min(80vh,760px)] w-[min(92vw,980px)] max-w-none flex-col p-8">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold leading-tight tracking-tight md:text-2xl">
						{bucketTitle}
					</DialogTitle>
					{bucketLabel ? (
						<p className="text-fontSize-xs text-muted-foreground">
							{bucketLabel}
						</p>
					) : null}
				</DialogHeader>
				<div className="mt-4 flex min-h-0 flex-1 flex-col">
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
					) : events.length ? (
						<Tabs defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col">
							<TabsList className="w-full justify-start border-b border-border bg-background">
								<TabsTrigger
									value="external"
									disabled={!eventsByVisibility.external.length}
								>
									{t("events.tabs.external")}
								</TabsTrigger>
								<TabsTrigger
									value="internal"
									disabled={!eventsByVisibility.internal.length}
								>
									{t("events.tabs.internal")}
								</TabsTrigger>
							</TabsList>
							<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
								{(["external", "internal"] as const).map((visibilityKey) => {
									const visibleEvents =
										visibilityKey === "internal"
											? eventsByVisibility.internal
											: eventsByVisibility.external;
									const sectionsWithEvents = sectionMeta.filter((section) =>
										visibleEvents.some((event) => {
											if (section.key === "feature") return event.type === "feature";
											if (section.key === "fix") return event.type === "fix";
											if (section.key === "improvement")
												return event.type === "improvement";
											return event.type === "work" || event.type === "other";
										}),
									);
									const defaultOpen =
										sectionsWithEvents.length > 0
											? [sectionsWithEvents[0].key]
											: [];
									return (
										<TabsContent
											key={visibilityKey}
											value={visibilityKey}
											className="mt-6 space-y-6"
										>
											<Accordion
												type="multiple"
												defaultValue={defaultOpen}
												className="divide-y divide-border/60"
											>
												{sectionsWithEvents.map((section) => {
													const sectionEvents = visibleEvents.filter((event) => {
														if (section.key === "feature") return event.type === "feature";
														if (section.key === "fix") return event.type === "fix";
														if (section.key === "improvement")
															return event.type === "improvement";
														return event.type === "work" || event.type === "other";
													});
													const grouped = buildGrouped(sectionEvents);
													const Icon = section.icon;
													return (
														<AccordionItem
															key={section.key}
															value={section.key}
															className="border-0"
														>
															<AccordionTrigger className="py-4 text-fontSize-xs font-semibold uppercase tracking-wide text-muted-foreground">
																<div className="flex items-center gap-2">
																	<Icon className="h-3.5 w-3.5" />
																	<span>{t(section.labelKey)}</span>
																</div>
															</AccordionTrigger>
															<AccordionContent className="pb-6">
																<div className="space-y-5 pl-4">
																	{Array.from(grouped.entries()).map(
																		([domain, capabilities]) => {
																			const color = domainColorMap[domain];
																			return (
																				<div key={domain} className="space-y-3">
																					<Badge
																						variant="outline"
																						className="text-fontSize-2xs"
																						style={
																							color
																								? {
																									borderColor: color.border,
																									backgroundColor: color.background,
																									color: color.text,
																								}
																								: undefined
																						}
																					>
																						{domain}
																					</Badge>
																					<div className="space-y-4 pl-4">
																						{capabilities.map((capability) => (
																							<div
																								key={`${domain}-${capability.capability}`}
																								className="space-y-3"
																							>
																								<p className="text-fontSize-xs font-semibold uppercase tracking-wide text-muted-foreground">
																									{capability.capability}
																								</p>
																								<div className="space-y-4 pl-4">
																									{capability.events.map((event) => (
																										<BucketEventRow
																											key={event._id}
																											event={event}
																										/>
																									))}
																								</div>
																							</div>
																						))}
																					</div>
																				</div>
																			);
																		},
																	)}
																</div>
															</AccordionContent>
														</AccordionItem>
													);
												})}
											</Accordion>
										</TabsContent>
									);
								})}
							</div>
						</Tabs>
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
