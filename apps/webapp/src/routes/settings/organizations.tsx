import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Building2 } from "@hikai/ui";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";

export const Route = createFileRoute("/settings/organizations")({
  component: MyOrganizationsPage,
});

/**
 * Placeholder para la página de "Mis Organizaciones".
 * Contenido completo se implementará en F2.
 */
function MyOrganizationsPage() {
  const { t } = useTranslation("common");

  return (
    <SettingsLayout>
      <SettingsHeader
        title={t("settingsNav.myOrganizations")}
        subtitle={t("settingsPages.organizationsSubtitle")}
      />

      {/* Placeholder content */}
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Building2 className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-fontSize-sm">{t("settingsPages.comingSoonContent")}</p>
      </div>
    </SettingsLayout>
  );
}
