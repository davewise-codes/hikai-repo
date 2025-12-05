import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  HomeIcon,
  Building,
  Folder,
  Clock,
} from "@hikai/ui";
import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";

interface NavItem {
  icon: React.ReactNode;
  labelKey: string;
  to: string;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { icon: <HomeIcon className="h-5 w-5" />, labelKey: "nav.home", to: "/" },
  { icon: <Building className="h-5 w-5" />, labelKey: "nav.organizations", to: "/organizations" },
  { icon: <Folder className="h-5 w-5" />, labelKey: "nav.products", to: "/products" },
  { icon: <Clock className="h-5 w-5" />, labelKey: "nav.timeline", to: "#", disabled: true },
];

/**
 * Sidebar - Navegación lateral en overlay.
 *
 * Se abre desde el botón hamburguesa del header.
 * Usa Sheet de @hikai/ui con side="left".
 */
export function Sidebar() {
  const { t } = useTranslation("common");
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);
  const location = useLocation();

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-left">Hikai</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const label = t(item.labelKey);

            if (item.disabled) {
              return (
                <div
                  key={item.labelKey}
                  className="flex items-center gap-3 px-4 py-3 text-muted-foreground opacity-50 cursor-not-allowed"
                >
                  {item.icon}
                  <span>{label}</span>
                  <span className="ml-auto text-xs">({t("nav.comingSoon")})</span>
                </div>
              );
            }

            return (
              <Link
                key={item.labelKey}
                to={item.to}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors ${
                  isActive ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                {item.icon}
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
