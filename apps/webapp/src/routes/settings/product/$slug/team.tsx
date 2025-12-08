import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug, ProductMembers } from "@/domains/products";

export const Route = createFileRoute("/settings/product/$slug/team")({
  component: ProductTeamPage,
});

/**
 * Página de gestión de equipo del producto.
 * Muestra la tabla de miembros con layout wide.
 */
function ProductTeamPage() {
  const { t } = useTranslation("products");
  const { slug } = Route.useParams();
  const { currentOrg } = useCurrentOrg();

  const product = useGetProductBySlug(currentOrg?._id, slug);

  if (!product) {
    return null; // Layout handles loading/not found
  }

  return (
    <SettingsLayout variant="wide">
      <SettingsHeader
        title={t("members.title")}
        subtitle={product.name}
      />

      <ProductMembers productId={product._id} userRole={product.userRole} />
    </SettingsLayout>
  );
}
