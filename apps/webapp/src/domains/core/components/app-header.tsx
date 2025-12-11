import { OrgSwitcher } from "@/domains/organizations/components";
import { ProductSwitcher } from "@/domains/products";
import { UserMenu } from "./user-menu";

/**
 * AppHeader - Header horizontal fijo en la parte superior.
 *
 * Contiene:
 * - OrgSwitcher (avatar de organización)
 * - ProductSwitcher (selector de producto)
 * - UserMenu (avatar de usuario)
 */
export function AppHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-sticky bg-background border-b border-border">
      <div className="h-full px-2 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-3">
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
