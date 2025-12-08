import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Card, CardContent, Button, ArrowLeft } from "@hikai/ui";
import { SettingsLayout } from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug } from "@/domains/products";

export const Route = createFileRoute("/settings/product/$slug")({
  component: ProductSettingsLayout,
});

/**
 * Layout para las páginas de settings de producto.
 * Valida acceso y provee contexto a las rutas hijas.
 */
function ProductSettingsLayout() {
  const { t } = useTranslation("products");
  const { slug } = Route.useParams();
  const { currentOrg, isLoading: isOrgLoading } = useCurrentOrg();
  const product = useGetProductBySlug(currentOrg?._id, slug);

  // Loading
  if (isOrgLoading || product === undefined) {
    return (
      <SettingsLayout>
        <div className="text-center py-8 text-muted-foreground">
          {t("common.loading")}
        </div>
      </SettingsLayout>
    );
  }

  // Not found or no access
  if (!product) {
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
              {t("backToList")}
            </Button>
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  // Not admin - redirect to settings
  const isAdmin = product.userRole === "admin";
  if (!isAdmin) {
    throw redirect({ to: "/settings/products" });
  }

  return <Outlet />;
}
