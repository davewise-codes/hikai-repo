import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Check,
  Sparkles,
} from "@hikai/ui";
import {
  SettingsLayout,
  SettingsHeader,
  SettingsSection,
  SettingsRow,
} from "@/domains/shared";
import { useOrganizationBySlug } from "@/domains/organizations";
import { useListProducts } from "@/domains/products";
import {
  PLAN_LIMITS,
  PLAN_FEATURES,
  type Plan,
} from "@hikai/convex";

export const Route = createFileRoute("/settings/org/$slug/plan")({
  component: OrgPlanPage,
});

/**
 * Página de plan de organización.
 * Muestra plan actual, uso vs límites, y features.
 */
function OrgPlanPage() {
  const { t } = useTranslation("organizations");
  const { slug } = Route.useParams();

  const organization = useOrganizationBySlug(slug);
  const products = useListProducts(organization?._id);

  if (!organization) {
    return null; // Layout handles loading/not found
  }

  const plan = organization.plan as Plan;
  const limits = PLAN_LIMITS[plan];
  const features = PLAN_FEATURES[plan];

  const productCount = products?.length ?? 0;
  const memberCount = organization.memberCount;

  const productPercentage =
    limits.maxProductsPerOrg === Infinity
      ? 0
      : (productCount / limits.maxProductsPerOrg) * 100;
  const memberPercentage =
    limits.maxMembersPerOrg === Infinity
      ? 0
      : (memberCount / limits.maxMembersPerOrg) * 100;

  const formatLimit = (value: number) => {
    return value === Infinity ? t("orgSettings.plan.unlimited") : value.toString();
  };

  // Feature labels for display
  const featureLabels: Record<string, string> = {
    basic_analytics: t("plans.features.analytics"),
    advanced_analytics: t("plans.features.analytics"),
    team_collaboration: t("orgSettings.plan.features.teamCollaboration"),
    api_access: t("plans.features.apiAccess"),
    custom_integrations: t("plans.features.customIntegrations"),
    sso: t("plans.features.sso"),
  };

  return (
    <SettingsLayout>
      <SettingsHeader
        title={t("orgSettings.plan.title")}
        subtitle={t("orgSettings.plan.subtitle", { name: organization.name })}
      />

      {/* Current Plan */}
      <SettingsSection title={t("orgSettings.plan.currentPlan")}>
        <SettingsRow
          label={t("detail.plan")}
          control={
            <Badge variant="outline" className="text-fontSize-sm capitalize">
              {t(`plans.${plan}`)}
            </Badge>
          }
        />
      </SettingsSection>

      {/* Usage & Limits */}
      <SettingsSection title={t("orgSettings.plan.usage")}>
        <Card>
          <CardContent className="pt-4 space-y-4">
            {/* Products usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-fontSize-sm">
                <span>{t("orgSettings.plan.products")}</span>
                <span className="text-muted-foreground">
                  {productCount} {t("orgSettings.plan.of")} {formatLimit(limits.maxProductsPerOrg)}
                </span>
              </div>
              {limits.maxProductsPerOrg !== Infinity && (
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(productPercentage, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Members usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-fontSize-sm">
                <span>{t("orgSettings.plan.members")}</span>
                <span className="text-muted-foreground">
                  {memberCount} {t("orgSettings.plan.of")} {formatLimit(limits.maxMembersPerOrg)}
                </span>
              </div>
              {limits.maxMembersPerOrg !== Infinity && (
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(memberPercentage, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </SettingsSection>

      {/* Features */}
      <SettingsSection title={t("orgSettings.plan.features.title")}>
        <Card>
          <CardContent className="pt-4">
            <ul className="space-y-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-fontSize-sm">
                  <Check className="w-4 h-4 text-success" />
                  <span>{featureLabels[feature] || feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </SettingsSection>

      {/* Upgrade CTA */}
      {plan !== "enterprise" && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-fontSize-base">
              <Sparkles className="w-4 h-4" />
              {t("orgSettings.plan.upgradeTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-fontSize-sm text-muted-foreground mb-4">
              {plan === "free"
                ? t("plans.proDescription")
                : t("plans.enterpriseDescription")}
            </p>
            <Button disabled>
              {t("orgSettings.plan.upgrade")}
            </Button>
            <p className="text-fontSize-xs text-muted-foreground mt-2">
              {t("orgSettings.plan.billingNote")}
            </p>
          </CardContent>
        </Card>
      )}
    </SettingsLayout>
  );
}
