import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/$orgSlug/$productSlug/timeline")({
	component: TimelinePage,
});

function TimelinePage() {
	return (
		<div className="p-6">
			<h1 className="text-2xl font-semibold">Timeline</h1>
			<p className="text-fontSize-sm text-muted-foreground mt-2">
				Coming in Phase 2
			</p>
		</div>
	);
}
