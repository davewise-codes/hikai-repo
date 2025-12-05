import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Plus,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { useCreateProduct, useCanCreateProduct } from "../hooks";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

interface CreateProductFormProps {
  organizationId: Id<"organizations">;
}

export function CreateProductForm({ organizationId }: CreateProductFormProps) {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
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
      setError(t("products.errors.requiredFields"));
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
      setError(err instanceof Error ? err.message : t("products.errors.unknown"));
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
      .substring(0, 50);
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug:
        prev.slug === generateSlug(prev.name) || !prev.slug
          ? generateSlug(value)
          : prev.slug,
    }));
  };

  // Loading state
  if (canCreateResult === undefined) {
    return null;
  }

  // Can't create more products
  if (!canCreateResult.canCreate) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>{canCreateResult.reason}</p>
            <p className="text-sm mt-2">
              {t("products.limitInfo", {
                current: canCreateResult.currentCount,
                max: canCreateResult.maxAllowed,
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isOpen) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <Button
            onClick={() => setIsOpen(true)}
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("products.create")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("products.createTitle")}</CardTitle>
        <CardDescription>{t("products.createDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product-name">{t("products.form.name")} *</Label>
            <Input
              id="product-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t("products.form.namePlaceholder")}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="product-slug">{t("products.form.slug")} *</Label>
            <Input
              id="product-slug"
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              placeholder={t("products.form.slugPlaceholder")}
              required
              disabled={isLoading}
              pattern="^[a-z0-9-]+$"
              title={t("products.form.slugHint")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("products.form.slugHint")}
            </p>
          </div>

          <div>
            <Label htmlFor="product-description">
              {t("products.form.description")}
            </Label>
            <Textarea
              id="product-description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder={t("products.form.descriptionPlaceholder")}
              rows={3}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={
                isLoading || !formData.name.trim() || !formData.slug.trim()
              }
            >
              {isLoading ? t("products.creating") : t("products.createButton")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setFormData({ name: "", slug: "", description: "" });
                setError(null);
              }}
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
