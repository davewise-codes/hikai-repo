import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Folder } from "@hikai/ui";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";

export const Route = createFileRoute("/settings/products")({
  component: MyProductsPage,
});

/**
 * Placeholder para la página de "Mis Productos".
 * Contenido completo se implementará en F2.
 */
function MyProductsPage() {
  const { t } = useTranslation("common");

  return (
    <SettingsLayout>
      <SettingsHeader
        title={t("settingsNav.myProducts")}
        subtitle={t("settingsPages.productsSubtitle")}
      />

      {/* Placeholder content */}
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Folder className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-fontSize-sm">{t("settingsPages.comingSoonContent")}</p>
      </div>
    </SettingsLayout>
  );
}
