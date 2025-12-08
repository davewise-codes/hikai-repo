import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Users } from "@hikai/ui";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug } from "@/domains/products";

export const Route = createFileRoute("/settings/product/$slug/team")({
  component: ProductTeamPage,
});

/**
 * Placeholder para la página de team de producto.
 * Contenido completo se implementará en F4.
 */
function ProductTeamPage() {
  const { t } = useTranslation("common");
  const { slug } = Route.useParams();
  const { currentOrg } = useCurrentOrg();
  const product = useGetProductBySlug(currentOrg?._id, slug);

  return (
    <SettingsLayout variant="wide">
      <SettingsHeader
        title={t("settingsNav.team")}
        subtitle={product?.name}
      />

      {/* Placeholder content */}
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Users className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-fontSize-sm">{t("settingsPages.comingSoonContent")}</p>
      </div>
    </SettingsLayout>
  );
}
