import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Folder } from "@hikai/ui";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useUserProducts, useRecentProducts } from "@/domains/products/hooks/use-products";
import { ProductCard } from "@/domains/products/components";

export const Route = createFileRoute("/settings/products")({
  component: MyProductsPage,
});

/**
 * Página de "Mis Productos" en settings.
 * Muestra todos los productos del usuario ordenados por acceso reciente.
 */
function MyProductsPage() {
  const { t } = useTranslation("products");

  const userProducts = useUserProducts();
  const recentProducts = useRecentProducts();

  // Loading state
  if (userProducts === undefined) {
    return (
      <SettingsLayout variant="wide">
        <SettingsHeader
          title={t("myProducts.title")}
          subtitle={t("myProducts.subtitle")}
        />
        <div className="flex items-center justify-center py-16">
          <div className="text-fontSize-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        </div>
      </SettingsLayout>
    );
  }

  // Filter out nulls and sort products: recent first, then by name
  const validProducts = userProducts.filter(
    (p): p is NonNullable<typeof p> => p !== null
  );
  const sortedProducts = [...validProducts].sort((a, b) => {
    // Check if product is in recent list and get its position
    const aRecentIndex = recentProducts?.findIndex((r) => r._id === a._id) ?? -1;
    const bRecentIndex = recentProducts?.findIndex((r) => r._id === b._id) ?? -1;

    // Both in recent - sort by recent order
    if (aRecentIndex !== -1 && bRecentIndex !== -1) {
      return aRecentIndex - bRecentIndex;
    }
    // Only a is recent
    if (aRecentIndex !== -1) return -1;
    // Only b is recent
    if (bRecentIndex !== -1) return 1;

    // Otherwise sort by name
    return a.name.localeCompare(b.name);
  });

  return (
    <SettingsLayout variant="wide">
      <SettingsHeader
        title={t("myProducts.title")}
        subtitle={t("myProducts.subtitle")}
      />

      {/* Products Grid */}
      {sortedProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Folder className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-fontSize-sm">{t("myProducts.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {sortedProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </SettingsLayout>
  );
}
