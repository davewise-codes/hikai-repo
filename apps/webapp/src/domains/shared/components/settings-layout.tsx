import { ReactNode } from "react";
import { cn } from "@hikai/ui";

interface SettingsLayoutProps {
  children: ReactNode;
  className?: string;
  /**
   * Width variant:
   * - "narrow" (default): max-w-2xl - for settings forms
   * - "wide": max-w-5xl - for pages with tables/data
   */
  variant?: "narrow" | "wide";
}

/**
 * Layout centrado estilo Linear para páginas de settings.
 * Aplica max-width y espaciado consistente.
 */
export function SettingsLayout({
  children,
  className,
  variant = "narrow",
}: SettingsLayoutProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4 py-8 space-y-8",
        variant === "narrow" ? "max-w-2xl" : "max-w-5xl",
        className
      )}
    >
      {children}
    </div>
  );
}
