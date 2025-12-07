import { ReactNode } from "react";
import { cn } from "@hikai/ui";

// ============================================================================
// SettingsSection
// ============================================================================

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Contenedor de grupo de settings estilo Linear.
 * Agrupa SettingsRow dentro de un contenedor con borde.
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {title && (
        <h2 className="text-sm font-medium text-muted-foreground px-1">
          {title}
        </h2>
      )}
      {description && (
        <p className="text-sm text-muted-foreground px-1 pb-1">{description}</p>
      )}
      <div className="divide-y divide-border rounded-lg border bg-card">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// SettingsRow
// ============================================================================

interface SettingsRowProps {
  label: string;
  description?: string;
  control: ReactNode;
  className?: string;
}

/**
 * Fila individual de setting (label izquierda, control derecha).
 * Estilo Linear compacto.
 */
export function SettingsRow({
  label,
  description,
  control,
  className,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 gap-4",
        className
      )}
    >
      <div className="space-y-0.5 min-w-0">
        <div className="text-fontSize-sm font-medium">{label}</div>
        {description && (
          <div className="text-fontSize-xs text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      <div className="flex items-center flex-shrink-0">{control}</div>
    </div>
  );
}

// ============================================================================
// SettingsRowContent
// ============================================================================

interface SettingsRowContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * Fila para contenido complejo que no sigue el patrón label-control.
 * Útil para textareas, formularios inline, etc.
 */
export function SettingsRowContent({
  children,
  className,
}: SettingsRowContentProps) {
  return <div className={cn("px-4 py-3", className)}>{children}</div>;
}
