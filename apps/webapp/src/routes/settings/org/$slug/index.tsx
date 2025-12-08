import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/org/$slug/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/settings/org/$slug/general",
      params: { slug: params.slug },
    });
  },
});
