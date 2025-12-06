import { Button, HamburgerIcon } from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { OrgSwitcher } from "@/domains/organizations/components";
import { ProductSwitcher } from "@/domains/products";
import { UserMenu } from "./user-menu";

/**
 * AppHeader - Header horizontal fijo en la parte superior.
 *
 * Contiene:
 * - Botón hamburguesa para abrir sidebar
 * - OrgSwitcher (avatar de organización)
 * - ProductSwitcher (selector de producto)
 * - UserMenu (avatar de usuario)
 */
export function AppHeader() {
  const { t } = useTranslation("common");
  const toggleSidebar = useStore((state) => state.toggleSidebar);

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-sticky bg-background border-b border-border">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {/* Hamburger menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
            aria-label={t("nav.openMenu")}
          >
            <HamburgerIcon className="h-5 w-5" />
          </Button>

          {/* Organization switcher */}
          <OrgSwitcher />

          {/* Separator */}
          <span className="text-muted-foreground/50">/</span>

          {/* Product switcher */}
          <ProductSwitcher />
        </div>

        {/* Right section */}
        <div className="flex items-center">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
