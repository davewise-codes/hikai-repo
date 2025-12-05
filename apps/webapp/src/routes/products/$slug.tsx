import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/domains/core/components/app-shell";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import {
  useGetProductBySlug,
  useUpdateLastProductAccess,
  ProductMembers,
  DeleteProductDialog,
} from "@/domains/products";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Badge,
  ArrowLeft,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/products/$slug")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { t } = useTranslation("common");
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { currentOrg, isLoading: isOrgLoading } = useCurrentOrg();

  const product = useGetProductBySlug(currentOrg?._id, slug);
  const updateLastAccess = useUpdateLastProductAccess();

  // Track product access when product is loaded
  useEffect(() => {
    if (product?._id) {
      updateLastAccess({ productId: product._id }).catch((error) => {
        console.error("Error tracking product access:", error);
      });
    }
  }, [product?._id, updateLastAccess]);

  // Loading state
  if (isOrgLoading || product === undefined) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8 text-muted-foreground">
            {t("common.loading")}
          </div>
        </div>
      </AppShell>
    );
  }

  // Product not found or no access
  if (!product) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {t("products.notFound")}
              </p>
              <Button variant="outline" onClick={() => navigate({ to: "/products" })}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("products.backToList")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const isAdmin = product.userRole === "admin";

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/products" })}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{product.name}</h1>
                <Badge variant="secondary">
                  {t(`products.roles.${product.userRole}`)}
                </Badge>
              </div>
              <p className="text-muted-foreground">/{product.slug}</p>
            </div>
          </div>

          {isAdmin && (
            <DeleteProductDialog
              productId={product._id}
              productName={product.name}
              onDeleted={() => navigate({ to: "/products" })}
            />
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t("products.tabs.overview")}</TabsTrigger>
            <TabsTrigger value="members">{t("products.tabs.members")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("products.overview.title")}</CardTitle>
                <CardDescription>
                  {t("products.overview.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("products.form.name")}
                    </label>
                    <p className="text-lg">{product.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("products.form.slug")}
                    </label>
                    <p className="text-lg font-mono">/{product.slug}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("products.overview.createdAt")}
                    </label>
                    <p className="text-lg">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("products.overview.members")}
                    </label>
                    <p className="text-lg">{product.memberCount}</p>
                  </div>
                </div>

                {product.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("products.form.description")}
                    </label>
                    <p className="mt-1">{product.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <ProductMembers productId={product._id} userRole={product.userRole} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
