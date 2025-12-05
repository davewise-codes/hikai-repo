import { Card, CardContent } from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useListProducts } from "../hooks";
import { ProductCard } from "./product-card";
import { CreateProductForm } from "./create-product-form";

export function ProductList() {
  const { t } = useTranslation("common");
  const { currentOrg, isLoading: isOrgLoading } = useCurrentOrg();

  const products = useListProducts(currentOrg?._id);

  // Loading state
  if (isOrgLoading || products === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t("products.title")}</h1>
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
          <h1 className="text-2xl font-bold">{t("products.title")}</h1>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {t("products.noOrgSelected")}
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
          <h1 className="text-2xl font-bold">{t("products.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("products.subtitle", { org: currentOrg.name })}
          </p>
        </div>
      </div>

      <CreateProductForm organizationId={currentOrg._id} />

      {products.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">{t("products.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
