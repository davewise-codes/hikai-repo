import { ReactNode } from "react";
import { cn } from "@hikai/ui";

interface SettingsLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Layout centrado estilo Linear para páginas de settings.
 * Aplica max-w-2xl y espaciado consistente.
 */
export function SettingsLayout({ children, className }: SettingsLayoutProps) {
  return (
    <div className={cn("mx-auto max-w-2xl px-4 py-8 space-y-8", className)}>
      {children}
    </div>
  );
}
