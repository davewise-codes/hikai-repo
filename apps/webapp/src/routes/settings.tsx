import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/domains/core/components/app-shell";
import { SettingsPage } from "@/domains/core/components/settings-page";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  return (
    <AppShell>
      <SettingsPage />
    </AppShell>
  );
}
