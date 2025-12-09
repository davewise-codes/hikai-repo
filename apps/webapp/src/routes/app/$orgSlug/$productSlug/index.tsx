import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/$orgSlug/$productSlug/")({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/app/$orgSlug/$productSlug/timeline",
			params,
		});
	},
});
