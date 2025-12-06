import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/domains/core/components/app-shell";
import { ProfilePage } from "@/domains/core/components/profile-page";

export const Route = createFileRoute("/profile")({
  component: ProfileRoute,
});

function ProfileRoute() {
  return (
    <AppShell>
      <ProfilePage />
    </AppShell>
  );
}
