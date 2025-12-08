import { Link } from "@tanstack/react-router";
import { cn, Badge, type LucideIcon } from "@hikai/ui";

interface SettingsNavItemProps {
  label: string;
  href: string;
  icon?: LucideIcon;
  isActive?: boolean;
  badge?: string;
  disabled?: boolean;
}

/**
 * Item de navegación para el nav de settings.
 * Estilo Linear con hover y active states.
 */
export function SettingsNavItem({
  label,
  href,
  icon: Icon,
  isActive,
  badge,
  disabled,
}: SettingsNavItemProps) {
  if (disabled) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground/60 cursor-not-allowed">
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
        <span className="flex-1 truncate">{label}</span>
        {badge && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {badge}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {badge}
        </Badge>
      )}
    </Link>
  );
}
