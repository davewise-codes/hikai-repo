import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Badge,
  Check,
  Building2,
  Rocket,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { useOrganizationsActions } from "../hooks/use-organizations";
import { generateSlug, shouldAutoUpdateSlug } from "@/domains/shared";

type ProfessionalPlan = "pro" | "enterprise";

const PLAN_FEATURES = {
  pro: {
    products: 10,
    members: 50,
    features: ["advanced_analytics", "team_collaboration", "api_access"],
  },
  enterprise: {
    products: Infinity,
    members: Infinity,
    features: [
      "advanced_analytics",
      "team_collaboration",
      "api_access",
      "custom_integrations",
      "sso",
    ],
  },
};

export function CreateOrganizationForm() {
  const { t } = useTranslation("organizations");
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [selectedPlan, setSelectedPlan] = useState<ProfessionalPlan>("pro");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createOrganizationSafe } = useOrganizationsActions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      setError(t("create.errors.requiredFields"));
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await createOrganizationSafe({
      name: formData.name.trim(),
      slug: formData.slug.trim().toLowerCase(),
      description: formData.description.trim() || undefined,
      plan: selectedPlan,
    });

    if (result.success) {
      setFormData({ name: "", slug: "", description: "" });
      setSelectedPlan("pro");
      setIsOpen(false);
    } else {
      if (result.error === "PROFESSIONAL_ORG_REQUIRES_PLAN") {
        setError(t("create.planRequired"));
      } else {
        setError(result.error || t("create.errors.unknown"));
      }
    }

    setIsLoading(false);
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: shouldAutoUpdateSlug(prev.slug, prev.name)
        ? generateSlug(value)
        : prev.slug,
    }));
  };

  if (!isOpen) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Button onClick={() => setIsOpen(true)} className="w-full">
            + {t("create.button")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("create.title")}</CardTitle>
        <CardDescription>{t("create.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plan Selection */}
          <div className="space-y-3">
            <Label>{t("create.selectPlan")}</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {/* Pro Plan Card */}
              <button
                type="button"
                onClick={() => setSelectedPlan("pro")}
                className={`relative flex flex-col items-start rounded-lg border-2 p-4 text-left transition-colors ${
                  selectedPlan === "pro"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {selectedPlan === "pro" && (
                  <div className="absolute right-3 top-3">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{t("plans.pro")}</span>
                  <Badge variant="secondary">{t("plans.recommended")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("plans.proDescription")}
                </p>
                <ul className="text-sm space-y-1">
                  <li>
                    {t("plans.features.products", {
                      count: PLAN_FEATURES.pro.products,
                    })}
                  </li>
                  <li>
                    {t("plans.features.members", {
                      count: PLAN_FEATURES.pro.members,
                    })}
                  </li>
                  <li>{t("plans.features.analytics")}</li>
                  <li>{t("plans.features.apiAccess")}</li>
                </ul>
              </button>

              {/* Enterprise Plan Card */}
              <button
                type="button"
                onClick={() => setSelectedPlan("enterprise")}
                className={`relative flex flex-col items-start rounded-lg border-2 p-4 text-left transition-colors ${
                  selectedPlan === "enterprise"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {selectedPlan === "enterprise" && (
                  <div className="absolute right-3 top-3">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="font-semibold">
                    {t("plans.enterprise")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("plans.enterpriseDescription")}
                </p>
                <ul className="text-sm space-y-1">
                  <li>{t("plans.features.productsUnlimited")}</li>
                  <li>{t("plans.features.membersUnlimited")}</li>
                  <li>{t("plans.features.sso")}</li>
                  <li>{t("plans.features.customIntegrations")}</li>
                </ul>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("create.billingNote")}
            </p>
          </div>

          {/* Organization Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="org-name">{t("form.name")} *</Label>
              <Input
                id="org-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t("form.namePlaceholder")}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="org-slug">{t("form.slug")} *</Label>
              <Input
                id="org-slug"
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder={t("form.slugPlaceholder")}
                required
                disabled={isLoading}
                pattern="^[a-z0-9-]+$"
                title={t("form.slugHint")}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("form.slugHint")}
              </p>
            </div>

            <div>
              <Label htmlFor="org-description">
                {t("form.description")}
              </Label>
              <Textarea
                id="org-description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder={t("form.descriptionPlaceholder")}
                rows={3}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim() || !formData.slug.trim()}
            >
              {isLoading
                ? t("create.creating")
                : t("create.submit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setFormData({ name: "", slug: "", description: "" });
                setSelectedPlan("pro");
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
