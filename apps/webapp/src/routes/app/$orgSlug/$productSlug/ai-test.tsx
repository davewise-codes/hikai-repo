import { createFileRoute } from "@tanstack/react-router";
import { AiTestPanel } from "@/domains/core/components/ai-test-panel";

export const Route = createFileRoute("/app/$orgSlug/$productSlug/ai-test")({
	component: AiTestPage,
});

function AiTestPage() {
	return (
		<div className="px-4 py-6">
			<AiTestPanel />
		</div>
	);
}
