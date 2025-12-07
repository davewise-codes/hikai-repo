import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/domains/core/components/app-shell";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import {
  useGetProductBySlug,
  useUpdateProduct,
  useCurrentProduct,
  ProductMembers,
  DeleteProductDialog,
} from "@/domains/products";
import {
  SettingsLayout,
  SettingsHeader,
  SettingsSection,
  SettingsRow,
  SettingsRowContent,
} from "@/domains/shared";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Badge,
  Input,
  Textarea,
  Card,
  CardContent,
  ArrowLeft,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/products/$slug")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { t } = useTranslation("products");
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { currentOrg, isLoading: isOrgLoading } = useCurrentOrg();

  const product = useGetProductBySlug(currentOrg?._id, slug);
  const updateProduct = useUpdateProduct();
  const { setCurrentProduct } = useCurrentProduct();

  // Form state for settings tab
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Track product access and set as current product when loaded
  useEffect(() => {
    if (product?._id) {
      setCurrentProduct(product._id);
    }
  }, [product?._id, setCurrentProduct]);

  // Initialize form when product loads
  useEffect(() => {
    if (product && name === "" && description === "") {
      setName(product.name);
      setDescription(product.description || "");
    }
  }, [product, name, description]);

  // Loading state
  if (isOrgLoading || product === undefined) {
    return (
      <AppShell>
        <SettingsLayout>
          <div className="text-center py-8 text-muted-foreground">
            {t("common.loading")}
          </div>
        </SettingsLayout>
      </AppShell>
    );
  }

  // Product not found or no access
  if (!product) {
    return (
      <AppShell>
        <SettingsLayout>
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">{t("notFound")}</p>
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/products" })}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToList")}
              </Button>
            </CardContent>
          </Card>
        </SettingsLayout>
      </AppShell>
    );
  }

  const isAdmin = product.userRole === "admin";

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateProduct({
        productId: product._id,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("errors.unknown"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setCurrentProduct(null);
    navigate({ to: "/products" });
  };

  const hasChanges =
    name !== product.name || description !== (product.description || "");

  return (
    <AppShell>
      <SettingsLayout variant="wide">
        <SettingsHeader
          title={product.name}
          subtitle={`/${product.slug}`}
          backButton={{
            onClick: () => navigate({ to: "/products" }),
          }}
          actions={
            <Badge variant={product.userRole as "admin" | "member"}>
              {t(`roles.${product.userRole}`)}
            </Badge>
          }
        />

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
            <TabsTrigger value="members">{t("tabs.members")}</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings">{t("tabs.settings")}</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <SettingsSection title={t("overview.title")}>
              <SettingsRow
                label={t("form.name")}
                control={
                  <span className="text-fontSize-sm">{product.name}</span>
                }
              />
              <SettingsRow
                label={t("form.slug")}
                control={
                  <span className="text-fontSize-sm font-mono">
                    /{product.slug}
                  </span>
                }
              />
              <SettingsRow
                label={t("overview.createdAt")}
                control={
                  <span className="text-fontSize-sm">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </span>
                }
              />
              <SettingsRow
                label={t("overview.members")}
                control={
                  <span className="text-fontSize-sm">{product.memberCount}</span>
                }
              />
              {product.description && (
                <SettingsRowContent>
                  <div className="space-y-1">
                    <label className="text-fontSize-sm font-medium text-muted-foreground">
                      {t("form.description")}
                    </label>
                    <p className="text-fontSize-sm">{product.description}</p>
                  </div>
                </SettingsRowContent>
              )}
            </SettingsSection>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-6">
            <ProductMembers productId={product._id} userRole={product.userRole} />
          </TabsContent>

          {/* Settings Tab (admin only) */}
          {isAdmin && (
            <TabsContent value="settings" className="mt-6 space-y-6">
              <SettingsSection title={t("settings.general.title")}>
                <SettingsRow
                  label={t("settings.name")}
                  control={
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isSaving}
                      className="w-64"
                    />
                  }
                />
                <SettingsRow
                  label={t("settings.slug")}
                  description={t("settings.slugReadonly")}
                  control={
                    <Input
                      value={product.slug}
                      disabled
                      className="w-64 font-mono bg-muted"
                    />
                  }
                />
                <SettingsRowContent>
                  <div className="space-y-2">
                    <label className="text-fontSize-sm font-medium">
                      {t("settings.description")}
                    </label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isSaving}
                      rows={3}
                    />
                  </div>
                </SettingsRowContent>
              </SettingsSection>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-4">
                {saveError && (
                  <p className="text-fontSize-sm text-destructive">{saveError}</p>
                )}
                {saveSuccess && (
                  <p className="text-fontSize-sm text-success">
                    {t("settings.saveSuccess")}
                  </p>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                >
                  {isSaving ? t("settings.saving") : t("settings.save")}
                </Button>
              </div>

              {/* Danger Zone */}
              <SettingsSection title={t("settings.dangerZone.title")}>
                <SettingsRow
                  label={t("delete.title")}
                  description={t("delete.warning")}
                  control={
                    <DeleteProductDialog
                      productId={product._id}
                      productName={product.name}
                      onDeleted={handleDelete}
                    >
                      <Button variant="ghost-destructive" size="sm">
                        {t("delete.title")}
                      </Button>
                    </DeleteProductDialog>
                  }
                />
              </SettingsSection>
            </TabsContent>
          )}
        </Tabs>
      </SettingsLayout>
    </AppShell>
  );
}
