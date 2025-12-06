import { ReactNode } from "react";
import { Toaster } from "@hikai/ui";
import { AppHeader } from "./app-header";
import { Sidebar } from "./sidebar";
import { useTheme } from "../hooks/use-theme";

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell - Layout principal de la aplicación.
 *
 * Estructura:
 * - Header fijo en top (h-14)
 * - Sidebar overlay (se abre desde hamburguesa)
 * - Main content con padding-top para compensar header
 * - Toaster para notificaciones
 */
export function AppShell({ children }: AppShellProps) {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Sidebar />
      <main className="pt-14">
        {children}
      </main>
      <Toaster theme={theme} richColors />
    </div>
  );
}