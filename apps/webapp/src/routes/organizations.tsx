import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/domains/core/components/app-shell";
import { OrganizationList } from "@/domains/organizations";

export const Route = createFileRoute("/organizations")({
  component: () => (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <OrganizationList />
      </div>
    </AppShell>
  ),
});