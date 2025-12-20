import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Button,
	Input,
	Textarea,
	Alert,
	AlertDescription,
	CheckCircle,
} from "@hikai/ui";
import {
	SettingsLayout,
	SettingsHeader,
	SettingsSection,
	SettingsRow,
	SettingsRowContent,
} from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import {
	useGetProductBySlug,
	useUpdateProduct,
	useCurrentProduct,
	DeleteProductDialog,
} from "@/domains/products";

export const Route = createFileRoute("/settings/product/$slug/general")({
  component: ProductGeneralPage,
});

/**
 * Página de configuración general de producto.
 * Permite editar nombre/descripción y acceder a danger zone.
 */
function ProductGeneralPage() {
  const { t } = useTranslation("products");
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { currentOrg } = useCurrentOrg();

  const product = useGetProductBySlug(currentOrg?._id, slug);
  const updateProduct = useUpdateProduct();
  const { setCurrentProduct } = useCurrentProduct();

  // Form state
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saveSuccess, setSaveSuccess] = useState(false);

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Initialize form when product loads
	useEffect(() => {
		if (product) {
			setName(product.name);
			setDescription(product.description || "");
		}
	}, [product]);

  // Clear success message after timeout
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

	if (!product) {
		return null; // Layout handles loading/not found
	}

	const hasChanges =
		name !== product.name ||
		description !== (product.description || "");

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
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : t("errors.unknown"));
		} finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setCurrentProduct(null);
    navigate({ to: "/settings/products" });
  };

  return (
	<SettingsLayout>
		<SettingsHeader
			title={t("settings.general.title")}
			subtitle={t("settings.general.subtitle", { name: product.name })}
		/>

      {/* General Information */}
      <SettingsSection title={t("settings.info")}>
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
			<Alert variant="destructive" className="flex-1">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 text-fontSize-sm text-success">
            <CheckCircle className="w-4 h-4" />
            {t("settings.saveSuccess")}
          </div>
		)}
		<Button onClick={handleSave} disabled={!hasChanges || isSaving}>
			{isSaving ? t("common.loading") : t("settings.save")}
		</Button>
	</div>

      {/* Danger Zone */}
      <SettingsSection title={t("settings.dangerZone.title")}>
        <SettingsRow
          label={t("delete.title")}
          description={t("delete.warning")}
          control={
            <Button
              variant="ghost-destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              {t("delete.title")}
            </Button>
          }
        />
      </SettingsSection>

      {/* Delete Dialog */}
      <DeleteProductDialog
        productId={product._id}
        productName={product.name}
        onDeleted={handleDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </SettingsLayout>
  );
}
