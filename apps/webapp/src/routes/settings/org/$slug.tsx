import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Card, CardContent, Button, ArrowLeft } from "@hikai/ui";
import { SettingsLayout } from "@/domains/shared";
import { useOrganizationBySlug } from "@/domains/organizations";

export const Route = createFileRoute("/settings/org/$slug")({
  component: OrgSettingsLayout,
});

/**
 * Layout para las páginas de settings de organización.
 * Valida acceso y provee contexto a las rutas hijas.
 */
function OrgSettingsLayout() {
  const { t } = useTranslation("organizations");
  const { slug } = Route.useParams();
  const organization = useOrganizationBySlug(slug);

  // Loading
  if (organization === undefined) {
    return (
      <SettingsLayout>
        <div className="text-center py-8 text-muted-foreground">
          {t("common.loading")}
        </div>
      </SettingsLayout>
    );
  }

  // Not found or no access
  if (!organization) {
    return (
      <SettingsLayout>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">{t("notFound")}</p>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("backToHome")}
            </Button>
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  // Not admin - redirect to settings
  const isAdminOrOwner =
    organization.userRole === "owner" || organization.userRole === "admin";
  if (!isAdminOrOwner) {
    throw redirect({ to: "/settings/organizations" });
  }

  return <Outlet />;
}
