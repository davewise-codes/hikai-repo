import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/domains/core/components/app-shell";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import {
  useGetProductBySlug,
  useUpdateProduct,
  useCurrentProduct,
  DeleteProductDialog,
} from "@/domains/products";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  ArrowLeft,
  Input,
  Textarea,
  Settings,
  AlertTriangle,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/products/$slug_/settings")({
  component: ProductSettingsPage,
});

function ProductSettingsPage() {
  const { t } = useTranslation("products");
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { currentOrg, isLoading: isOrgLoading } = useCurrentOrg();

  const product = useGetProductBySlug(currentOrg?._id, slug);
  const updateProduct = useUpdateProduct();
  const { setCurrentProduct } = useCurrentProduct();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize form when product loads
  if (
    product &&
    name === "" &&
    description === "" &&
    product.name !== ""
  ) {
    setName(product.name);
    setDescription(product.description || "");
  }

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
                {t("notFound")}
              </p>
              <Button variant="outline" onClick={() => navigate({ to: "/products" })}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToList")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const isAdmin = product.userRole === "admin";

  // Redirect non-admin users
  if (!isAdmin) {
    navigate({ to: "/products/$slug", params: { slug } });
    return null;
  }

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
    // Clear current product before navigating
    setCurrentProduct(null);
    navigate({ to: "/products" });
  };

  const hasChanges =
    name !== product.name ||
    description !== (product.description || "");

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate({ to: "/products/$slug", params: { slug } })
              }
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <h1 className="text-2xl font-bold">
                  {t("settings.title")}
                </h1>
              </div>
              <p className="text-muted-foreground">{product.name}</p>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.general.title")}</CardTitle>
            <CardDescription>
              {t("settings.general.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("settings.name")}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("settings.slug")}
                </label>
                <Input value={product.slug} disabled className="font-mono bg-muted" />
                <p className="text-xs text-muted-foreground">
                  {t("settings.slugReadonly")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("settings.description")}
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("settings.members")}
                </label>
                <p className="mt-1 text-lg">{product.memberCount}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("settings.createdAt")}
                </label>
                <p className="mt-1 text-lg">
                  {new Date(product.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("settings.yourRole")}
                </label>
                <div className="mt-1">
                  <Badge variant={product.userRole as "admin" | "member"}>
                    {t(`roles.${product.userRole}`)}
                  </Badge>
                </div>
              </div>
            </div>

            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
            {saveSuccess && (
              <p className="text-sm text-success">
                {t("settings.saveSuccess")}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving
                  ? t("settings.saving")
                  : t("settings.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <CardTitle className="text-destructive">
                {t("settings.dangerZone.title")}
              </CardTitle>
            </div>
            <CardDescription>
              {t("settings.dangerZone.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Delete Product */}
            <div className="flex items-center justify-between rounded-lg border border-destructive p-4">
              <div>
                <h4 className="font-medium text-destructive">
                  {t("delete.title")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t("delete.warning")}
                </p>
              </div>
              <DeleteProductDialog
                productId={product._id}
                productName={product.name}
                onDeleted={handleDelete}
              >
                <Button variant="destructive">
                  {t("delete.title")}
                </Button>
              </DeleteProductDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
