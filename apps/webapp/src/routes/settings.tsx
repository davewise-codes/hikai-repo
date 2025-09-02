import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/domains/core/components/settings-page';
import { AppShell } from '@/domains/core/components/app-shell';

export const Route = createFileRoute('/settings')({
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});