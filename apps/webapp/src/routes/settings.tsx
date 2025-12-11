import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/domains/core/components/app-shell";
import {
  SettingsNav,
  SettingsNavSection,
  SettingsNavItem,
} from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useCurrentProduct } from "@/domains/products/hooks";
import {
  User,
  Settings,
  Shield,
  Building2,
  Folder,
  Link2,
  CreditCard,
  Users,
  Receipt,
  ArrowLeft,
} from "@hikai/ui";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const { currentOrg } = useCurrentOrg();
  const { currentProduct } = useCurrentProduct();

  const isOrgAdmin =
    currentOrg?.role === "owner" || currentOrg?.role === "admin";
  const isProductAdmin = currentProduct?.userRole === "admin";
  const canGoToProduct = Boolean(currentOrg && currentProduct);
  const backLabel = canGoToProduct
    ? t("settingsNav.backToProduct")
    : t("settingsNav.selectProduct");

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-3.5rem)]">
        <SettingsNav>
          {canGoToProduct ? (
            <Link
              to="/app/$orgSlug/$productSlug/timeline"
              params={{ orgSlug: currentOrg!.slug, productSlug: currentProduct!.slug }}
              className="flex items-center gap-2 px-2 h-7 rounded-md text-fontSize-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 truncate">{backLabel}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 px-2 h-7 text-fontSize-sm text-muted-foreground/60 cursor-not-allowed">
              <ArrowLeft className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 truncate">{backLabel}</span>
            </div>
          )}

          {/* User Section */}
          <SettingsNavSection title={t("settingsNav.user")}>
            <SettingsNavItem
              label={t("settingsNav.profile")}
              href="/settings/profile"
              icon={User}
              isActive={location.pathname === "/settings/profile"}
            />
            <SettingsNavItem
              label={t("settingsNav.preferences")}
              href="/settings/preferences"
              icon={Settings}
              isActive={location.pathname === "/settings/preferences"}
            />
            <SettingsNavItem
              label={t("settingsNav.security")}
              href="/settings/security"
              icon={Shield}
              disabled
              badge={t("settingsNav.comingSoon")}
            />
            <SettingsNavItem
              label={t("settingsNav.myOrganizations")}
              href="/settings/organizations"
              icon={Building2}
              isActive={location.pathname === "/settings/organizations"}
            />
            <SettingsNavItem
              label={t("settingsNav.myProducts")}
              href="/settings/products"
              icon={Folder}
              isActive={location.pathname === "/settings/products"}
            />
            <SettingsNavItem
              label={t("settingsNav.connectedAccounts")}
              href="/settings/accounts"
              icon={Link2}
              disabled
              badge={t("settingsNav.comingSoon")}
            />
          </SettingsNavSection>

          {/* Organization Section (if org selected and user is admin) */}
          {currentOrg && isOrgAdmin && (
            <SettingsNavSection title={currentOrg.name}>
              <SettingsNavItem
                label={t("settingsNav.general")}
                href={`/settings/org/${currentOrg.slug}/general`}
                icon={Settings}
                isActive={location.pathname.startsWith(
                  `/settings/org/${currentOrg.slug}/general`
                )}
              />
              <SettingsNavItem
                label={t("settingsNav.plan")}
                href={`/settings/org/${currentOrg.slug}/plan`}
                icon={CreditCard}
                isActive={location.pathname.startsWith(
                  `/settings/org/${currentOrg.slug}/plan`
                )}
              />
              <SettingsNavItem
                label={t("settingsNav.seats")}
                href={`/settings/org/${currentOrg.slug}/seats`}
                icon={Users}
                isActive={location.pathname.startsWith(
                  `/settings/org/${currentOrg.slug}/seats`
                )}
              />
              <SettingsNavItem
                label={t("settingsNav.billing")}
                href={`/settings/org/${currentOrg.slug}/billing`}
                icon={Receipt}
                disabled
                badge={t("settingsNav.comingSoon")}
              />
              <SettingsNavItem
                label={t("settingsNav.products")}
                href={`/settings/org/${currentOrg.slug}/products`}
                icon={Folder}
                isActive={location.pathname.startsWith(
                  `/settings/org/${currentOrg.slug}/products`
                )}
              />
            </SettingsNavSection>
          )}

          {/* Product Section (if product selected and user is admin) */}
          {currentProduct && isProductAdmin && (
            <SettingsNavSection title={currentProduct.name}>
              <SettingsNavItem
                label={t("settingsNav.general")}
                href={`/settings/product/${currentProduct.slug}/general`}
                icon={Settings}
                isActive={location.pathname.startsWith(
                  `/settings/product/${currentProduct.slug}/general`
                )}
              />
            <SettingsNavItem
              label={t("settingsNav.team")}
              href={`/settings/product/${currentProduct.slug}/team`}
              icon={Users}
              isActive={location.pathname.startsWith(
                `/settings/product/${currentProduct.slug}/team`
              )}
            />
            <SettingsNavItem
              label={t("settingsNav.sources")}
              href={`/settings/product/${currentProduct.slug}/sources`}
              icon={Link2}
              isActive={location.pathname.startsWith(
                `/settings/product/${currentProduct.slug}/sources`
              )}
            />
          </SettingsNavSection>
        )}
      </SettingsNav>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </AppShell>
  );
}
