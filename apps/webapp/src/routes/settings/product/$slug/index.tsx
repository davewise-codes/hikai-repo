import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/product/$slug/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/settings/product/$slug/general",
      params: { slug: params.slug },
    });
  },
});
