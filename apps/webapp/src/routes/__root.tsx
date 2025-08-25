import { createRootRoute, Outlet } from '@tanstack/react-router';
import { FontProvider } from '@/providers/font-provider';
import { ThemeProvider } from '@/providers/theme-provider';

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider
      defaultTheme="system"
      storageKey="webapp-theme"
      enableSystem
    >
      <FontProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Outlet />
        </div>
      </FontProvider>
    </ThemeProvider>
  ),
});