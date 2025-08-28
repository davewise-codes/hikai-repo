import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/domains/core/components/settings-page';
import { AppShell } from '@/domains/core/components/app-shell';
import { AuthGuard } from '@/domains/auth/components/auth-guard';

export const Route = createFileRoute('/settings')({
  component: () => (
    <AuthGuard>
      <AppShell>
        <SettingsPage />
      </AppShell>
    </AuthGuard>
  ),
});