import { ReactNode } from "react";
import { Button, ArrowLeft } from "@hikai/ui";

interface SettingsHeaderProps {
  title: string;
  subtitle?: string;
  backButton?: {
    onClick: () => void;
    label?: string;
  };
  actions?: ReactNode;
}

/**
 * Header estilo Linear para páginas de settings.
 * Incluye botón de volver, título, subtítulo opcional y acciones.
 */
export function SettingsHeader({
  title,
  subtitle,
  backButton,
  actions,
}: SettingsHeaderProps) {
  return (
    <div className="space-y-1">
      {backButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={backButton.onClick}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backButton.label}
        </Button>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
    </div>
  );
}
