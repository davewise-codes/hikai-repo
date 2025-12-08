import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Folder } from "@hikai/ui";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useOrganizationBySlug } from "@/domains/organizations";
import {
  useListProducts,
  useCanCreateProduct,
  ProductCard,
  CreateProductForm,
} from "@/domains/products";

export const Route = createFileRoute("/settings/org/$slug/products")({
  component: OrgProductsPage,
});

/**
 * Página de productos de organización.
 * Lista todos los productos y permite crear nuevos.
 */
function OrgProductsPage() {
  const { t } = useTranslation("products");
  const { slug } = Route.useParams();

  const organization = useOrganizationBySlug(slug);
  const products = useListProducts(organization?._id);
  const canCreateResult = useCanCreateProduct(organization?._id);

  if (!organization) {
    return null; // Layout handles loading/not found
  }

  // Loading state for products
  if (products === undefined) {
    return (
      <SettingsLayout variant="wide">
        <SettingsHeader
          title={t("orgSettings.products.title")}
          subtitle={t("orgSettings.products.subtitle", { name: organization.name })}
        />
        <div className="flex items-center justify-center py-16">
          <div className="text-fontSize-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        </div>
      </SettingsLayout>
    );
  }

  const productCount = products.length;
  const maxProducts = canCreateResult?.maxAllowed ?? 0;
  const isUnlimited = maxProducts === Infinity;

  return (
    <SettingsLayout variant="wide">
      <SettingsHeader
        title={t("orgSettings.products.title")}
        subtitle={t("orgSettings.products.subtitle", { name: organization.name })}
      />

      {/* Create Product Form */}
      <CreateProductForm organizationId={organization._id} />

      {/* Product count info */}
      {!isUnlimited && canCreateResult && (
        <p className="text-fontSize-sm text-muted-foreground">
          {t("orgSettings.products.count", {
            current: productCount,
            max: maxProducts,
          })}
        </p>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Folder className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-fontSize-sm">{t("orgSettings.products.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              showDeleteAction
            />
          ))}
        </div>
      )}
    </SettingsLayout>
  );
}
