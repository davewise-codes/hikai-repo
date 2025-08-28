import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/components/home-page';
import { AppShell } from '@/domains/core/components/app-shell';
import { AuthGuard } from '@/domains/auth/components/auth-guard';

export const Route = createFileRoute('/')({
  component: () => (
    <AuthGuard>
      <AppShell>
        <HomePage />
      </AppShell>
    </AuthGuard>
  ),
});