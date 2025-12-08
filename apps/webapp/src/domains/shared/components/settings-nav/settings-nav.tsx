import { ReactNode } from "react";
import { cn } from "@hikai/ui";
import { useNavWidth } from "./use-nav-width";

interface SettingsNavProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
}

/**
 * Componente de navegación lateral para settings con resize.
 * Estilo Linear: fondo sutil, items con hover/active states.
 */
export function SettingsNav({
  children,
  defaultWidth = 256,
  minWidth = 200,
  maxWidth = 320,
  storageKey = "hikai-settings-nav-width",
}: SettingsNavProps) {
  const { width, isResizing, handleMouseDown } = useNavWidth({
    storageKey,
    defaultWidth,
    minWidth,
    maxWidth,
  });

  return (
    <div
      className="relative flex-shrink-0 border-r bg-muted/30"
      style={{ width }}
    >
      {/* Content */}
      <nav className="h-full overflow-y-auto py-4 px-2 space-y-6">
        {children}
      </nav>

      {/* Resize handle */}
      <div
        className={cn(
          "absolute top-0 right-0 w-1 h-full cursor-ew-resize",
          "hover:bg-primary/20 transition-colors",
          isResizing && "bg-primary/30"
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
