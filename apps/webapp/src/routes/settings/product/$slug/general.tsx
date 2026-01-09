import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Button,
	Input,
	Alert,
	AlertDescription,
	CheckCircle,
	Separator,
	Select,
	SelectTrigger,
	SelectContent,
	SelectItem,
	SelectValue,
} from "@hikai/ui";
import {
	SettingsLayout,
	SettingsHeader,
	SettingsSection,
	SettingsRow,
} from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import {
	useGetProductBySlug,
	useUpdateProduct,
	useCurrentProduct,
	DeleteProductDialog,
	BaselineEditor,
} from "@/domains/products";

export const Route = createFileRoute("/settings/product/$slug/general")({
  component: ProductGeneralPage,
});

/**
 * Página de configuración general de producto.
 * Permite editar nombre y ajustes generales, más acceder a danger zone.
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
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [languagePreference, setLanguagePreference] = useState("en");
	const [releaseCadence, setReleaseCadence] = useState("");

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Initialize form when product loads
	useEffect(() => {
		if (product) {
			setName(product.name);
			setLanguagePreference(product.languagePreference ?? "en");
			setReleaseCadence(product.releaseCadence ?? "");
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
		languagePreference !== (product.languagePreference ?? "en") ||
		releaseCadence !== (product.releaseCadence ?? "");

	const handleSave = async () => {
		setIsSaving(true);
		setSaveError(null);
		setSaveSuccess(false);

		try {
			await updateProduct({
				productId: product._id,
				name: name.trim(),
				languagePreference,
				releaseCadence: releaseCadence || undefined,
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

	const releaseCadenceOptions = [
		{ value: "every_2_days", label: t("settings.releaseCadenceOptions.every2Days") },
		{ value: "twice_weekly", label: t("settings.releaseCadenceOptions.twiceWeekly") },
		{ value: "weekly", label: t("settings.releaseCadenceOptions.weekly") },
		{ value: "biweekly", label: t("settings.releaseCadenceOptions.biweekly") },
		{ value: "monthly", label: t("settings.releaseCadenceOptions.monthly") },
		{ value: "irregular", label: t("settings.releaseCadenceOptions.irregular") },
	];

	const languageOptions = [
		{ value: "en", label: t("settings.languageOptions.english") },
		{ value: "es", label: t("settings.languageOptions.spanish") },
	];

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
		<SettingsRow
			label={t("settings.languagePreference")}
			description={t("settings.languagePreferenceHelp")}
			control={
				<Select
					value={languagePreference}
					onValueChange={setLanguagePreference}
					disabled={isSaving}
				>
					<SelectTrigger className="w-64">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{languageOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			}
		/>
		<SettingsRow
			label={t("settings.releaseCadence")}
			description={t("settings.releaseCadenceHelp")}
			control={
				<Select
					value={releaseCadence || undefined}
					onValueChange={setReleaseCadence}
					disabled={isSaving}
				>
					<SelectTrigger className="w-64">
						<SelectValue placeholder={t("common.unknown")} />
					</SelectTrigger>
					<SelectContent>
						{releaseCadenceOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			}
		/>
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

	<Separator className="my-6" />

	<div className="space-y-3">
		<div className="space-y-1">
			<h2 className="text-fontSize-sm font-medium text-muted-foreground">
				{t("baseline.title")}
			</h2>
			<p className="text-fontSize-sm text-muted-foreground">
				{t("baseline.description")}
			</p>
		</div>
		<BaselineEditor product={product} />
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
