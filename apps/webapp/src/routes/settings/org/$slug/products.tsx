import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Folder } from "@hikai/ui";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useOrganizationBySlug } from "@/domains/organizations";

export const Route = createFileRoute("/settings/org/$slug/products")({
  component: OrgProductsPage,
});

/**
 * Placeholder para la página de productos de organización.
 * Contenido completo se implementará en F3.
 */
function OrgProductsPage() {
  const { t } = useTranslation("common");
  const { slug } = Route.useParams();
  const organization = useOrganizationBySlug(slug);

  return (
    <SettingsLayout>
      <SettingsHeader
        title={t("settingsNav.products")}
        subtitle={organization?.name}
      />

      {/* Placeholder content */}
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Folder className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-fontSize-sm">{t("settingsPages.comingSoonContent")}</p>
      </div>
    </SettingsLayout>
  );
}
