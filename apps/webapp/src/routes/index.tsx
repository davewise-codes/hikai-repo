import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/components/home-page';
import { AppShell } from '@/domains/core/components/app-shell';

export const Route = createFileRoute('/')({
  component: () => (
    <AppShell>
      <HomePage />
    </AppShell>
  ),
});