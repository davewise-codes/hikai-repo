import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Label,
  Badge,
  Check,
  Building2,
  Rocket,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { useOrganizationsActions } from "../hooks/use-organizations";
import {
  EntityFormCard,
  EntityFields,
  type EntityFieldsValues,
} from "@/domains/shared";

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
  const [formData, setFormData] = useState<EntityFieldsValues>({
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

  const handleCancel = () => {
    setIsOpen(false);
    setFormData({ name: "", slug: "", description: "" });
    setSelectedPlan("pro");
    setError(null);
  };

  return (
    <EntityFormCard
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      collapsedButtonLabel={t("create.button")}
      title={t("create.title")}
      description={t("create.description")}
    >
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
              <p className="text-fontSize-sm text-muted-foreground mb-3">
                {t("plans.proDescription")}
              </p>
              <ul className="text-fontSize-sm space-y-1">
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
                <span className="font-semibold">{t("plans.enterprise")}</span>
              </div>
              <p className="text-fontSize-sm text-muted-foreground mb-3">
                {t("plans.enterpriseDescription")}
              </p>
              <ul className="text-fontSize-sm space-y-1">
                <li>{t("plans.features.productsUnlimited")}</li>
                <li>{t("plans.features.membersUnlimited")}</li>
                <li>{t("plans.features.sso")}</li>
                <li>{t("plans.features.customIntegrations")}</li>
              </ul>
            </button>
          </div>
          <p className="text-fontSize-xs text-muted-foreground">
            {t("create.billingNote")}
          </p>
        </div>

        {/* Organization Details */}
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
          idPrefix="org"
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
            {isLoading ? t("create.creating") : t("create.submit")}
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
