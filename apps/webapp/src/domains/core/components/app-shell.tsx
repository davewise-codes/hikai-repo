import { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { Sidebar } from "./sidebar";

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
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Sidebar />
      <main className="pt-14">
        {children}
      </main>
    </div>
  );
}