import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { useCreateProduct, useCanCreateProduct } from "../hooks";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
  EntityFormCard,
  EntityFields,
  type EntityFieldsValues,
} from "@/domains/shared";

interface CreateProductFormProps {
  organizationId: Id<"organizations">;
}

export function CreateProductForm({ organizationId }: CreateProductFormProps) {
  const { t } = useTranslation("products");
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<EntityFieldsValues>({
    name: "",
    slug: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreateResult = useCanCreateProduct(organizationId);
  const createProduct = useCreateProduct();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      setError(t("errors.requiredFields"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await createProduct({
        organizationId,
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase(),
        description: formData.description.trim() || undefined,
      });
      setFormData({ name: "", slug: "", description: "" });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setFormData({ name: "", slug: "", description: "" });
    setError(null);
  };

  // Loading state
  if (canCreateResult === undefined) {
    return null;
  }

  // Can't create more products - limit reached
  if (!canCreateResult.canCreate) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>{canCreateResult.reason}</p>
            <p className="text-sm mt-2">
              {t("limitInfo", {
                current: canCreateResult.currentCount,
                max: canCreateResult.maxAllowed,
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <EntityFormCard
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      collapsedButtonLabel={t("create")}
      title={t("createTitle")}
      description={t("createDescription")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <EntityFields
          values={formData}
          onValuesChange={setFormData}
          labels={{
            name: t("form.name"),
            namePlaceholder: t("form.namePlaceholder"),
            slug: t("form.slug"),
            slugPlaceholder: t("form.slugPlaceholder"),
            slugHint: t("form.slugHint"),
            description: t("form.description"),
            descriptionPlaceholder: t("form.descriptionPlaceholder"),
          }}
          isLoading={isLoading}
          idPrefix="product"
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={
              isLoading || !formData.name.trim() || !formData.slug.trim()
            }
          >
            {isLoading ? t("creating") : t("createButton")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </EntityFormCard>
  );
}
