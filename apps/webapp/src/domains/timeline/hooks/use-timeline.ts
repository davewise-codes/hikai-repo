import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

type UseTimelineArgs = {
	productId: Id<"products"> | undefined;
	limit?: number;
};

export function useTimeline({ productId, limit }: UseTimelineArgs) {
	const timeline = useQuery(
		api.timeline.events.listTimelineByProduct,
		productId
			? {
					productId,
					...(limit ? { limit } : {}),
				}
			: "skip"
	);

	return useMemo(
		() => ({
			timeline: timeline?.items ?? [],
			isLoading: timeline === undefined && !!productId,
			error: timeline === null ? new Error("Timeline unavailable") : null,
		}),
		[productId, timeline]
	);
}

export function useTriggerSync() {
	// triggerManualSync es una action; useMutation requiere mutation, así que usamos useAction
	// para poder llamarla desde el frontend.
	// Convex React no expone directamente useAction en este paquete, así que usamos useMutation
	// tipado a Action mediante cast explícito.
	return useMutation(api.timeline.events.triggerManualSync as unknown as any);
}
