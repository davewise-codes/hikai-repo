import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CreditCard } from "@hikai/ui";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useOrganizationBySlug } from "@/domains/organizations";

export const Route = createFileRoute("/settings/org/$slug/plan")({
  component: OrgPlanPage,
});

/**
 * Placeholder para la página de plan de organización.
 * Contenido completo se implementará en F3.
 */
function OrgPlanPage() {
  const { t } = useTranslation("common");
  const { slug } = Route.useParams();
  const organization = useOrganizationBySlug(slug);

  return (
    <SettingsLayout>
      <SettingsHeader
        title={t("settingsNav.plan")}
        subtitle={organization?.name}
      />

      {/* Placeholder content */}
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <CreditCard className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-fontSize-sm">{t("settingsPages.comingSoonContent")}</p>
      </div>
    </SettingsLayout>
  );
}
