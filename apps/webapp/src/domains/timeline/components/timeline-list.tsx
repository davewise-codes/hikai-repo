import { ReactNode, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, cn } from "@hikai/ui";
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
	feature?: string;
	rawEventIds: Id<"rawEvents">[];
	rawEventCount: number;
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
			<div className="space-y-10">
				{[0, 1, 2].map((index) => (
						<div
							key={index}
							className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
						>
							<div className={cn("md:col-start-1", index % 2 === 0 ? "" : "md:col-start-3")}>
								<Card className="border-dashed">
									<CardContent className="space-y-3 p-4">
										<div className="h-3 w-20 rounded-md bg-muted animate-pulse" />
										<div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
										<div className="h-3 w-1/2 rounded-md bg-muted animate-pulse" />
										<div className="flex gap-2">
											<div className="h-5 w-16 rounded-md bg-muted animate-pulse" />
											<div className="h-5 w-12 rounded-md bg-muted animate-pulse" />
										</div>
									</CardContent>
								</Card>
							</div>
						<div className="hidden items-center justify-center md:flex">
							<div className="h-full w-px bg-border" />
						</div>
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
		<div className="relative py-10 space-y-12">
			<div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border" />
			{events.map((event, index) => {
				const isLeft = index % 2 === 0;
				const isSelected = selectedId === event._id;
				const formattedDate = formatShortDate(event.occurredAt, i18n.language);

				return (
					<div
						key={event._id}
						className="grid w-full grid-cols-1 items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
					>
						{isLeft ? (
							<>
								<div
									ref={(node) => {
										itemRefs.current[event._id] = node;
									}}
									className="order-2 h-full md:order-1 md:col-start-1 md:pr-8"
								>
									<Card
										onClick={() => onSelect(event._id)}
										className={cn(
											"cursor-pointer border transition-shadow duration-150 hover:shadow-sm h-full",
											isSelected ? "border-primary shadow-sm" : "bg-muted/30"
										)}
									>
										<CardContent className="space-y-2 p-3">
											<p className="text-fontSize-sm font-semibold leading-snug">
												{event.title}
											</p>
											{event.summary ? (
												<p className="text-fontSize-xs text-muted-foreground line-clamp-2">
													{event.summary}
												</p>
											) : null}
										</CardContent>
									</Card>
								</div>
								<div className="order-1 md:order-2 flex items-center justify-center">
									<div className="relative flex items-center justify-center">
										<div className="hidden md:block absolute right-full mr-2 h-px w-8 bg-border" />
										<div className="h-3 w-3 rounded-full border border-muted-foreground/70 bg-background" />
									</div>
								</div>
								<div className="order-3 hidden md:flex md:col-start-3 items-center justify-start">
									<span className="text-fontSize-xs text-muted-foreground">
										{formattedDate}
									</span>
								</div>
							</>
						) : (
							<>
								<div className="order-2 md:order-1 hidden md:flex md:col-start-1 items-center justify-end">
									<span className="text-fontSize-xs text-muted-foreground">
										{formattedDate}
									</span>
								</div>
								<div className="order-1 md:order-2 flex items-center justify-center">
									<div className="relative flex items-center justify-center">
										<div className="h-3 w-3 rounded-full border border-muted-foreground/70 bg-background" />
										<div className="hidden md:block absolute left-full ml-2 h-px w-8 bg-border" />
									</div>
								</div>
								<div
									ref={(node) => {
										itemRefs.current[event._id] = node;
									}}
									className="order-3 h-full md:order-3 md:col-start-3 md:pl-8"
								>
									<Card
										onClick={() => onSelect(event._id)}
										className={cn(
											"cursor-pointer border transition-shadow duration-150 hover:shadow-sm h-full",
											isSelected ? "border-primary shadow-sm" : "bg-muted/30"
										)}
									>
										<CardContent className="space-y-2 p-3">
											<p className="text-fontSize-sm font-semibold leading-snug">
												{event.title}
											</p>
											{event.summary ? (
												<p className="text-fontSize-xs text-muted-foreground line-clamp-2">
													{event.summary}
												</p>
											) : null}
										</CardContent>
									</Card>
								</div>
							</>
						)}
					</div>
				);
			})}
		</div>
	);
}

export function useTimelineKinds(events: TimelineListEvent[]) {
	return useMemo(() => Array.from(new Set(events.map((event) => event.kind))), [events]);
}
