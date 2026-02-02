import { useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

type UseTimelineArgs = {
	productId: Id<"products"> | undefined;
	limit?: number;
	refreshKey?: number;
};

export function useTimeline({ productId, limit, refreshKey }: UseTimelineArgs) {
	const timeline = useQuery(
		api.timeline.events.listTimelineByProduct,
		productId
			? {
					productId,
					...(limit ? { limit } : {}),
					...(refreshKey !== undefined ? { refreshKey } : {}),
				}
			: "skip"
	);
	const bucketSummaries = useQuery(
		api.timeline.events.listBucketSummariesByProduct,
		productId
			? {
					productId,
					...(limit ? { limit } : {}),
					...(refreshKey !== undefined ? { refreshKey } : {}),
				}
			: "skip"
	);

	return useMemo(
		() => ({
			timeline: timeline?.items ?? [],
			buckets: bucketSummaries?.items ?? [],
			isLoading: timeline === undefined && !!productId,
			error: timeline === null ? new Error("Timeline unavailable") : null,
		}),
		[productId, timeline, bucketSummaries]
	);
}

export function useTriggerSync() {
	// triggerManualSync es una action, así que usamos useAction desde el frontend.
	return useAction(api.timeline.events.triggerManualSync);
}

export function useTimelineEventDetails(
	productId: Id<"products"> | undefined,
	eventId: Id<"interpretedEvents"> | undefined
) {
	return useQuery(
		api.timeline.events.getTimelineEventDetails,
		productId && eventId ? { productId, eventId } : "skip"
	);
}
