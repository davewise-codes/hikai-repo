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
  type PersonaProfile,
} from "./baseline-wizard";

interface CreateProductFormProps {
  organizationId: Id<"organizations">;
}

export function CreateProductForm({ organizationId }: CreateProductFormProps) {
  const { t } = useTranslation("products");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<EntityFieldsValues>({
    name: "",
    slug: "",
  });
  const [baselineValues, setBaselineValues] = useState<BaselineWizardValues>({
    valueProposition: "",
    problemSolved: "",
    targetMarket: "",
    productType: "",
    businessModel: "",
    stage: "",
    industries: [],
    audiences: [],
    productVision: "",
    strategicPillars: [],
    metricsOfInterest: [],
    personas: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBaselineErrors, setShowBaselineErrors] = useState(false);

  const canCreateResult = useCanCreateProduct(organizationId);
  const createProduct = useCreateProduct();

  const stepLabels = useMemo(
    () => [
      t("wizard.steps.details"),
      t("baseline.tabs.basics"),
      t("baseline.tabs.market"),
      t("baseline.tabs.strategy"),
      t("baseline.tabs.personas"),
    ],
    [t]
  );

  const isProductInfoValid =
    formData.name.trim().length > 0 && formData.slug.trim().length > 0;

  const isBasicsValid =
    baselineValues.valueProposition.trim().length > 0 &&
    baselineValues.problemSolved.trim().length > 0 &&
    baselineValues.productType.trim().length > 0 &&
    baselineValues.businessModel.trim().length > 0 &&
    baselineValues.stage.trim().length > 0 &&
    baselineValues.targetMarket.trim().length > 0;

  const isMarketValid =
    baselineValues.industries.length > 0 && baselineValues.audiences.length > 0;

  const isPersonaValid = (persona: PersonaProfile) =>
    (persona.role?.trim() ?? "").length > 0 &&
    (persona.preferredTone?.trim() ?? "").length > 0 &&
    (persona.goals ?? []).length > 0 &&
    (persona.painPoints ?? []).length > 0;

  const isPersonasValid = baselineValues.personas.every(isPersonaValid);

  const getFirstInvalidStep = () => {
    if (!isProductInfoValid) return 1;
    if (!isBasicsValid) return 2;
    if (!isMarketValid) return 3;
    if (!isPersonasValid) return 5;
    return null;
  };

  const normalizeString = (value?: string) => {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const normalizeArray = (values?: string[]) =>
    (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);

  const sanitizePersonas = (personas: PersonaProfile[]) =>
    personas.map((persona) => ({
      role: persona.role?.trim() ?? "",
      goals: normalizeArray(persona.goals),
      painPoints: normalizeArray(persona.painPoints),
      preferredTone: persona.preferredTone?.trim() ?? "",
    }));

  const buildBaselinePayload = (values: BaselineWizardValues) => ({
    valueProposition: normalizeString(values.valueProposition),
    problemSolved: normalizeString(values.problemSolved),
    targetMarket: normalizeString(values.targetMarket),
    productType: normalizeString(values.productType),
    businessModel: normalizeString(values.businessModel),
    stage: normalizeString(values.stage),
    industries: values.industries.length > 0 ? values.industries : undefined,
    audiences: values.audiences.length > 0 ? values.audiences : undefined,
    productVision: normalizeString(values.productVision),
    strategicPillars:
      values.strategicPillars.length > 0 ? values.strategicPillars : undefined,
    metricsOfInterest:
      values.metricsOfInterest.length > 0 ? values.metricsOfInterest : undefined,
    personas:
      values.personas.length > 0 ? sanitizePersonas(values.personas) : undefined,
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
        baseline: buildBaselinePayload(baselineValues),
      });
      setFormData({ name: "", slug: "" });
      setBaselineValues({
        valueProposition: "",
        problemSolved: "",
        targetMarket: "",
        productType: "",
        businessModel: "",
        stage: "",
        industries: [],
        audiences: [],
        productVision: "",
        strategicPillars: [],
        metricsOfInterest: [],
        personas: [],
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
    setBaselineValues({
      valueProposition: "",
      problemSolved: "",
      targetMarket: "",
      productType: "",
      businessModel: "",
      stage: "",
      industries: [],
      audiences: [],
      productVision: "",
      strategicPillars: [],
      metricsOfInterest: [],
      personas: [],
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
      (step === 3 && isMarketValid) ||
      step === 4 ||
      (step === 5 && isPersonasValid);

    if (!isCurrentStepValid) {
      setShowBaselineErrors(true);
      return;
    }

    setShowBaselineErrors(false);
    setStep((prev) => Math.min(prev + 1, 5));
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
                ? t("wizard.stepDescriptions.market")
                : step === 4
                ? t("wizard.stepDescriptions.strategy")
                : t("wizard.stepDescriptions.personas")}
            </p>

            {step === 1 ? (
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
            ) : (
              <BaselineWizard
                values={baselineValues}
                onValuesChange={setBaselineValues}
                isLoading={isLoading}
                step={
                  step === 2
                    ? "basics"
                    : step === 3
                    ? "market"
                    : step === 4
                    ? "strategy"
                    : "personas"
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
              {step > 1 && step < 5 ? (
                <Button type="button" onClick={handleNext} disabled={isLoading}>
                  {t("wizard.actions.next")}
                </Button>
              ) : null}
              {step === 5 ? (
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
