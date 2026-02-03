import { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { useCreateProduct, useCanCreateProduct } from "../hooks";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
  EntityFormCard,
  EntityFields,
  type EntityFieldsValues,
} from "@/domains/shared";
import {
  BaselineWizard,
  type BaselineWizardValues,
  type IcpProfile,
} from "./baseline-wizard";

interface CreateProductFormProps {
  organizationId: Id<"organizations">;
}

export function CreateProductForm({ organizationId }: CreateProductFormProps) {
  const { t, i18n } = useTranslation("products");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<EntityFieldsValues>({
    name: "",
    slug: "",
  });
  const [languagePreference, setLanguagePreference] = useState("");
  const [releaseCadence, setReleaseCadence] = useState("");
  const [baselineValues, setBaselineValues] = useState<BaselineWizardValues>({
    targetMarket: "",
    productCategory: "",
    businessModel: "",
    stage: "",
    industry: "",
    valueProposition: "",
    problemSolved: "",
    productVision: "",
    strategicPillars: [],
    metricsOfInterest: [],
    icps: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBaselineErrors, setShowBaselineErrors] = useState(false);

  const canCreateResult = useCanCreateProduct(organizationId);
  const createProduct = useCreateProduct();

  const languageOptions = useMemo(
    () => [
      { value: "en", label: t("settings.languageOptions.english") },
      { value: "es", label: t("settings.languageOptions.spanish") },
    ],
    [t, i18n.language]
  );

  const releaseCadenceOptions = useMemo(
    () => [
      {
        value: "every_2_days",
        label: t("settings.releaseCadenceOptions.every2Days"),
      },
      {
        value: "twice_weekly",
        label: t("settings.releaseCadenceOptions.twiceWeekly"),
      },
      { value: "weekly", label: t("settings.releaseCadenceOptions.weekly") },
      { value: "biweekly", label: t("settings.releaseCadenceOptions.biweekly") },
      { value: "monthly", label: t("settings.releaseCadenceOptions.monthly") },
    ],
    [t, i18n.language]
  );

  const stepLabels = useMemo(
    () => [
      t("wizard.steps.details"),
      t("baseline.tabs.basics"),
      t("baseline.tabs.strategy"),
      t("baseline.tabs.icps"),
    ],
    [t, i18n.language]
  );

  const isProductInfoValid =
    formData.name.trim().length > 0 &&
    formData.slug.trim().length > 0 &&
    languagePreference.trim().length > 0 &&
    releaseCadence.trim().length > 0;

  const isBasicsValid =
    baselineValues.targetMarket.trim().length > 0 &&
    baselineValues.productCategory.trim().length > 0 &&
    baselineValues.businessModel.trim().length > 0 &&
    baselineValues.stage.trim().length > 0 &&
    baselineValues.industry.trim().length > 0;

  const isStrategyValid =
    baselineValues.problemSolved.trim().length > 0 &&
    baselineValues.valueProposition.trim().length > 0 &&
    baselineValues.productVision.trim().length > 0 &&
    baselineValues.strategicPillars.length > 0 &&
    baselineValues.metricsOfInterest.length > 0;

  const isIcpValid = (icp: IcpProfile) =>
    (icp.segment?.trim() ?? "").length > 0 &&
    (icp.pains ?? []).length > 0 &&
    (icp.goals ?? []).length > 0;

  const isIcpsValid =
    baselineValues.icps.length > 0 && baselineValues.icps.every(isIcpValid);

  const getFirstInvalidStep = () => {
    if (!isProductInfoValid) return 1;
    if (!isBasicsValid) return 2;
    if (!isStrategyValid) return 3;
    if (!isIcpsValid) return 4;
    return null;
  };

  const normalizeString = (value?: string) => {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const buildBaselinePayload = (values: BaselineWizardValues) => ({
    targetMarket: normalizeString(values.targetMarket) ?? "",
    productCategory: normalizeString(values.productCategory) ?? "",
    businessModel: normalizeString(values.businessModel) ?? "",
    stage: normalizeString(values.stage) ?? "",
    industry: normalizeString(values.industry) ?? "",
    valueProposition: normalizeString(values.valueProposition) ?? "",
    problemSolved: normalizeString(values.problemSolved) ?? "",
    productVision: normalizeString(values.productVision) ?? "",
    strategicPillars: values.strategicPillars,
    metricsOfInterest: values.metricsOfInterest,
    icps: values.icps,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstInvalidStep = getFirstInvalidStep();
    if (firstInvalidStep) {
      setStep(firstInvalidStep);
      setShowBaselineErrors(firstInvalidStep !== 1);
      setError(firstInvalidStep === 1 ? t("errors.requiredFields") : null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowBaselineErrors(false);

    try {
      await createProduct({
        organizationId,
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase(),
        languagePreference,
        releaseCadence,
        baseline: buildBaselinePayload(baselineValues),
      });
      setFormData({ name: "", slug: "" });
      setLanguagePreference("");
      setReleaseCadence("");
      setBaselineValues({
        targetMarket: "",
        productCategory: "",
        businessModel: "",
        stage: "",
        industry: "",
        valueProposition: "",
        problemSolved: "",
        productVision: "",
        strategicPillars: [],
        metricsOfInterest: [],
        icps: [],
      });
      setIsDialogOpen(false);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setStep(1);
    setFormData({ name: "", slug: "" });
    setLanguagePreference("");
    setReleaseCadence("");
    setBaselineValues({
      targetMarket: "",
      productCategory: "",
      businessModel: "",
      stage: "",
      industry: "",
      valueProposition: "",
      problemSolved: "",
      productVision: "",
      strategicPillars: [],
      metricsOfInterest: [],
      icps: [],
    });
    setError(null);
    setShowBaselineErrors(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel();
      return;
    }
    setIsDialogOpen(true);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!isProductInfoValid) {
        setError(t("errors.requiredFields"));
        return;
      }
      setError(null);
      setStep(2);
      return;
    }

    const isCurrentStepValid =
      (step === 2 && isBasicsValid) ||
      (step === 3 && isStrategyValid) ||
      (step === 4 && isIcpsValid);

    if (!isCurrentStepValid) {
      setShowBaselineErrors(true);
      return;
    }

    setShowBaselineErrors(false);
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setError(null);
    setShowBaselineErrors(false);
    setStep((prev) => Math.max(prev - 1, 1));
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
            <p className="text-fontSize-sm mt-2">
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
    <>
      <EntityFormCard
        isOpen={false}
        onOpenChange={handleDialogOpenChange}
        collapsedButtonLabel={t("create")}
        title={t("createTitle")}
        description={t("createDescription")}
      >
        <div />
      </EntityFormCard>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-3xl max-h-[75vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {stepLabels.map((label, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === step;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-fontSize-xs ${
                      isActive ? "border-primary text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {stepNumber}
                    </Badge>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-fontSize-sm text-muted-foreground">
      {step === 1
                ? t("wizard.stepDescriptions.details")
                : step === 2
                ? t("wizard.stepDescriptions.basics")
                : step === 3
                ? t("wizard.stepDescriptions.strategy")
                : t("wizard.stepDescriptions.icps")}
            </p>

            {step === 1 ? (
              <div className="space-y-[var(--spacing-field-group)]">
                <EntityFields
                  values={formData}
                  onValuesChange={setFormData}
                  labels={{
                    name: t("form.name"),
                    namePlaceholder: t("form.namePlaceholder"),
                    nameHelp: t("wizard.helpers.name"),
                    slug: t("form.slug"),
                    slugPlaceholder: t("form.slugPlaceholder"),
                    slugHint: t("form.slugHint"),
                    slugHelp: t("wizard.helpers.slug"),
                  }}
                  isLoading={isLoading}
                  idPrefix="product"
                  showDescription={false}
                />

                <div>
                  <Label htmlFor="product-language-preference">
                    {t("settings.languagePreference")}
                    <span className="ml-1 text-destructive">*</span>
                  </Label>
                  <p className="text-fontSize-xs text-muted-foreground mt-[var(--spacing-field-description)]">
                    {t("settings.languagePreferenceHelp")}
                  </p>
                  <Select
                    value={languagePreference || undefined}
                    onValueChange={setLanguagePreference}
                    disabled={isLoading}
                  >
                    <SelectTrigger
                      id="product-language-preference"
                      className="mt-[var(--spacing-field-description)]"
                    >
                      <SelectValue placeholder={t("baseline.placeholders.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="product-release-cadence">
                    {t("settings.releaseCadence")}
                    <span className="ml-1 text-destructive">*</span>
                  </Label>
                  <p className="text-fontSize-xs text-muted-foreground mt-[var(--spacing-field-description)]">
                    {t("settings.releaseCadenceHelp")}
                  </p>
                  <Select
                    value={releaseCadence || undefined}
                    onValueChange={setReleaseCadence}
                    disabled={isLoading}
                  >
                    <SelectTrigger
                      id="product-release-cadence"
                      className="mt-[var(--spacing-field-description)]"
                    >
                      <SelectValue placeholder={t("baseline.placeholders.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {releaseCadenceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <BaselineWizard
                values={baselineValues}
                onValuesChange={setBaselineValues}
                isLoading={isLoading}
                productName={formData.name.trim() || t("baseline.productNameGeneric")}
                step={
                  step === 2
                    ? "basics"
                    : step === 3
                    ? "strategy"
                    : "icps"
                }
                showErrors={showBaselineErrors}
              />
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              {step === 1 ? (
                <Button type="button" onClick={handleNext} disabled={isLoading}>
                  {t("wizard.actions.next")}
                </Button>
              ) : null}
              {step > 1 && step < 4 ? (
                <Button type="button" onClick={handleNext} disabled={isLoading}>
                  {t("wizard.actions.next")}
                </Button>
              ) : null}
              {step === 4 ? (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t("creating") : t("createButton")}
                </Button>
              ) : null}
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                >
                  {t("wizard.actions.back")}
                </Button>
              ) : null}
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
        </DialogContent>
      </Dialog>
    </>
  );
}
