import { Card, CardContent, CardHeader, CardTitle, Badge } from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useListProducts, useRecentProducts } from "../hooks";
import { ProductCard } from "./product-card";
import { CreateProductForm } from "./create-product-form";

export function ProductList() {
  const { t } = useTranslation("products");
  const navigate = useNavigate();
  const { currentOrg, isLoading: isOrgLoading, setCurrentOrg } = useCurrentOrg();

  const products = useListProducts(currentOrg?._id);
  const recentProducts = useRecentProducts();

  // IDs de productos recientes para filtrar duplicados
  const recentProductIds = new Set(recentProducts?.map((p) => p._id) ?? []);
  // Productos de la org actual que no están en recientes
  const nonRecentProducts = products?.filter((p) => !recentProductIds.has(p._id)) ?? [];

  // Handler para click en producto reciente de otra org
  const handleRecentProductClick = (product: NonNullable<typeof recentProducts>[number]) => {
    // Si el producto es de otra org, cambiar la org activa primero
    if (product.organization._id !== currentOrg?._id) {
      setCurrentOrg(product.organization._id);
    }
    // Navegar al producto
    navigate({ to: "/settings/product/$slug/general", params: { slug: product.slug } });
  };

  // Loading state
  if (isOrgLoading || products === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  // No org selected
  if (!currentOrg) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {t("noOrgSelected")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-fontSize-sm">
            {t("subtitle", { org: currentOrg.name })}
          </p>
        </div>
      </div>

      <CreateProductForm organizationId={currentOrg._id} />

      {/* Recent products section (cross-org) */}
      {recentProducts && recentProducts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-fontSize-sm font-medium text-muted-foreground">
            {t("list.recent")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentProducts.map((product) => {
              const isOtherOrg = product.organization._id !== currentOrg._id;
              return (
                <Card
                  key={product._id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleRecentProductClick(product)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="truncate">{product.name}</span>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {t(`roles.${product.role}`)}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">
                      /{product.slug}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {product.description && (
                      <p className="text-fontSize-sm text-muted-foreground line-clamp-2 mb-2">
                        {product.description}
                      </p>
                    )}
                    {isOtherOrg && (
                      <p className="text-xs text-muted-foreground">
                        {t("list.inOrg", { org: product.organization.name })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Products in current organization (excluding recent) */}
      <div className="space-y-3">
        <h2 className="text-fontSize-sm font-medium text-muted-foreground">
          {t("list.allInOrg", { org: currentOrg.name })}
        </h2>
        {nonRecentProducts.length === 0 && (!recentProducts || recentProducts.length === 0) ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">{t("empty")}</p>
            </CardContent>
          </Card>
        ) : nonRecentProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-4">
              <p className="text-muted-foreground text-fontSize-sm">
                {t("empty")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {nonRecentProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
