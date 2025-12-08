import { ReactNode } from "react";

interface SettingsNavSectionProps {
  title: string;
  children: ReactNode;
}

/**
 * Sección del nav de settings con título estilo Linear.
 */
export function SettingsNavSection({
  title,
  children,
}: SettingsNavSectionProps) {
  return (
    <div className="space-y-1">
      <h3 className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
