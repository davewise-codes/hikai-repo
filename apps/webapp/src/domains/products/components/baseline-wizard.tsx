import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Badge,
	Button,
	Label,
	MultiSelectDropdown,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Textarea,
} from "@hikai/ui";

export type PersonaProfile = {
	role: string;
	goals: string[];
	painPoints: string[];
	preferredTone: string;
};

export type BaselineWizardValues = {
	valueProposition: string;
	problemSolved: string;
	targetMarket: string;
	productType: string;
	businessModel: string;
	stage: string;
	industries: string[];
	audiences: string[];
	productVision: string;
	strategicPillars: string[];
	metricsOfInterest: string[];
	personas: PersonaProfile[];
};

type BaselineWizardStep = "basics" | "market" | "strategy" | "personas";

type BaselineWizardProps = {
  values: BaselineWizardValues;
  onValuesChange: (values: BaselineWizardValues) => void;
  isLoading: boolean;
  step: BaselineWizardStep;
  showErrors: boolean;
};

type Option = {
	value: string;
	label: string;
	description?: string;
};

const isPersonaValid = (persona: PersonaProfile) =>
	(persona.role?.trim() ?? "").length > 0 &&
	(persona.preferredTone?.trim() ?? "").length > 0 &&
	(persona.goals ?? []).length > 0 &&
	(persona.painPoints ?? []).length > 0;

export function BaselineWizard({
	values,
	onValuesChange,
	isLoading,
	step,
	showErrors,
}: BaselineWizardProps) {
	const { t } = useTranslation("products");
	const [expandedPersonas, setExpandedPersonas] = useState<number[]>([]);
	const placeholderClassName = "placeholder:italic placeholder:text-muted-foreground/70";

	const targetMarketOptions = useMemo<Option[]>(
		() => [
			{ value: "B2B", label: t("baseline.options.targetMarket.b2b") },
			{ value: "B2C", label: t("baseline.options.targetMarket.b2c") },
			{ value: "B2B2C", label: t("baseline.options.targetMarket.b2b2c") },
			{ value: "Internal", label: t("baseline.options.targetMarket.internal") },
			{ value: "Mixed", label: t("baseline.options.targetMarket.mixed") },
		],
		[t],
	);

	const productTypeOptions = useMemo<Option[]>(
		() => [
			{ value: "Web App", label: t("baseline.options.productType.webApp") },
			{
				value: "Mobile App",
				label: t("baseline.options.productType.mobileApp"),
			},
			{ value: "Desktop App", label: t("baseline.options.productType.desktopApp") },
			{ value: "API", label: t("baseline.options.productType.api") },
			{
				value: "Developer Tool",
				label: t("baseline.options.productType.developerTool"),
			},
			{
				value: "Marketplace",
				label: t("baseline.options.productType.marketplace"),
			},
			{
				value: "Internal Tool",
				label: t("baseline.options.productType.internalTool"),
			},
			{
				value: "Data Platform",
				label: t("baseline.options.productType.dataPlatform"),
			},
			{
				value: "Content Platform",
				label: t("baseline.options.productType.contentPlatform"),
			},
			{
				value: "E-commerce",
				label: t("baseline.options.productType.ecommerce"),
			},
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);

	const businessModelOptions = useMemo<Option[]>(
		() => [
			{ value: "SaaS", label: t("baseline.options.businessModel.saas") },
			{
				value: "Freemium",
				label: t("baseline.options.businessModel.freemium"),
			},
			{
				value: "Subscription",
				label: t("baseline.options.businessModel.subscription"),
			},
			{
				value: "Usage-based",
				label: t("baseline.options.businessModel.usageBased"),
			},
			{
				value: "Transactional",
				label: t("baseline.options.businessModel.transactional"),
			},
			{
				value: "Marketplace fees",
				label: t("baseline.options.businessModel.marketplaceFees"),
			},
			{
				value: "Advertising",
				label: t("baseline.options.businessModel.advertising"),
			},
			{
				value: "Enterprise licensing",
				label: t("baseline.options.businessModel.enterprise"),
			},
			{
				value: "Open Source",
				label: t("baseline.options.businessModel.openSource"),
			},
			{
				value: "Internal cost center",
				label: t("baseline.options.businessModel.internalCost"),
			},
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);

	const stageOptions = useMemo<Option[]>(
		() => [
			{ value: "idea", label: t("baseline.options.stage.idea") },
			{ value: "mvp", label: t("baseline.options.stage.mvp") },
			{ value: "beta", label: t("baseline.options.stage.beta") },
			{
				value: "earlyProduction",
				label: t("baseline.options.stage.earlyProduction"),
			},
			{ value: "production", label: t("baseline.options.stage.production") },
			{ value: "scaling", label: t("baseline.options.stage.scaling") },
			{ value: "mature", label: t("baseline.options.stage.mature") },
		],
		[t],
	);

	const industryOptions = useMemo<Option[]>(
		() => [
			{ value: "Productivity", label: t("baseline.options.industries.productivity") },
			{
				value: "Marketing tech",
				label: t("baseline.options.industries.marketingTech"),
			},
			{
				value: "Customer success",
				label: t("baseline.options.industries.customerSuccess"),
			},
			{
				value: "Developer tools",
				label: t("baseline.options.industries.developerTools"),
			},
			{ value: "Fintech", label: t("baseline.options.industries.fintech") },
			{
				value: "Healthtech",
				label: t("baseline.options.industries.healthtech"),
			},
			{ value: "Edtech", label: t("baseline.options.industries.edtech") },
			{ value: "E-commerce", label: t("baseline.options.industries.ecommerce") },
			{ value: "AI / ML", label: t("baseline.options.industries.ai") },
			{
				value: "Data & Analytics",
				label: t("baseline.options.industries.dataAnalytics"),
			},
			{
				value: "Cybersecurity",
				label: t("baseline.options.industries.cybersecurity"),
			},
			{ value: "HR tech", label: t("baseline.options.industries.hrTech") },
			{ value: "Legal tech", label: t("baseline.options.industries.legalTech") },
			{ value: "Proptech", label: t("baseline.options.industries.proptech") },
			{ value: "Gaming", label: t("baseline.options.industries.gaming") },
			{
				value: "Media & Content",
				label: t("baseline.options.industries.mediaContent"),
			},
			{ value: "IoT", label: t("baseline.options.industries.iot") },
			{
				value: "Enterprise software",
				label: t("baseline.options.industries.enterpriseSoftware"),
			},
			{ value: "Open source", label: t("baseline.options.industries.openSource") },
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);

	const audienceOptions = useMemo<Option[]>(
		() => [
			{
				value: "Product teams",
				label: t("baseline.options.audiences.productTeams"),
			},
			{
				value: "Engineering teams",
				label: t("baseline.options.audiences.engineeringTeams"),
			},
			{
				value: "Marketing teams",
				label: t("baseline.options.audiences.marketingTeams"),
			},
			{
				value: "Customer success teams",
				label: t("baseline.options.audiences.customerSuccessTeams"),
			},
			{
				value: "Sales teams",
				label: t("baseline.options.audiences.salesTeams"),
			},
			{ value: "Founders", label: t("baseline.options.audiences.founders") },
			{
				value: "Executives",
				label: t("baseline.options.audiences.executives"),
			},
			{
				value: "Stakeholders",
				label: t("baseline.options.audiences.stakeholders"),
			},
			{ value: "Market", label: t("baseline.options.audiences.market") },
			{ value: "End users", label: t("baseline.options.audiences.endUsers") },
			{ value: "Developers", label: t("baseline.options.audiences.developers") },
			{ value: "Partners", label: t("baseline.options.audiences.partners") },
			{ value: "Investors", label: t("baseline.options.audiences.investors") },
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);

	const strategicPillarOptions = useMemo<Option[]>(
		() => [
			{
				value: "Product Excellence",
				label: t("baseline.options.strategicPillars.productExcellence"),
				description: t("baseline.options.strategicPillarsDescriptions.productExcellence"),
			},
			{
				value: "User Adoption & Retention",
				label: t("baseline.options.strategicPillars.userAdoptionRetention"),
				description: t(
					"baseline.options.strategicPillarsDescriptions.userAdoptionRetention",
				),
			},
			{
				value: "Growth & Acquisition",
				label: t("baseline.options.strategicPillars.growthAcquisition"),
				description: t(
					"baseline.options.strategicPillarsDescriptions.growthAcquisition",
				),
			},
			{
				value: "Narrative & Brand Positioning",
				label: t("baseline.options.strategicPillars.narrativeBrand"),
				description: t("baseline.options.strategicPillarsDescriptions.narrativeBrand"),
			},
			{
				value: "Operational & Team Efficiency",
				label: t("baseline.options.strategicPillars.operationalEfficiency"),
				description: t(
					"baseline.options.strategicPillarsDescriptions.operationalEfficiency",
				),
			},
			{
				value: "Scalability & Business Impact",
				label: t("baseline.options.strategicPillars.scalabilityImpact"),
				description: t(
					"baseline.options.strategicPillarsDescriptions.scalabilityImpact",
				),
			},
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);

	const metricsOptions = useMemo<Option[]>(
		() => [
			{ value: "User adoption", label: t("baseline.options.metrics.userAdoption") },
			{
				value: "Feature usage",
				label: t("baseline.options.metrics.featureUsage"),
			},
			{ value: "Time to value", label: t("baseline.options.metrics.timeToValue") },
			{
				value: "Performance improvements",
				label: t("baseline.options.metrics.performance"),
			},
			{ value: "Reliability / uptime", label: t("baseline.options.metrics.reliability") },
			{
				value: "Customer satisfaction",
				label: t("baseline.options.metrics.satisfaction"),
			},
			{ value: "Churn reduction", label: t("baseline.options.metrics.churn") },
			{
				value: "Conversion rate",
				label: t("baseline.options.metrics.conversion"),
			},
			{
				value: "Content consistency",
				label: t("baseline.options.metrics.contentConsistency"),
			},
			{ value: "Time saved", label: t("baseline.options.metrics.timeSaved") },
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);

	const personaRoleOptions = useMemo<Option[]>(
		() => [
			{ value: "Founder", label: t("baseline.options.personaRoles.founder") },
			{
				value: "Product Manager",
				label: t("baseline.options.personaRoles.productManager"),
			},
			{ value: "Engineer", label: t("baseline.options.personaRoles.engineer") },
			{
				value: "Marketing Manager",
				label: t("baseline.options.personaRoles.marketingManager"),
			},
			{
				value: "Customer Success Manager",
				label: t("baseline.options.personaRoles.customerSuccess"),
			},
			{
				value: "Sales Manager",
				label: t("baseline.options.personaRoles.salesManager"),
			},
			{ value: "Executive", label: t("baseline.options.personaRoles.executive") },
			{
				value: "Developer Advocate",
				label: t("baseline.options.personaRoles.developerAdvocate"),
			},
			{ value: "Operations", label: t("baseline.options.personaRoles.operations") },
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);

	const personaGoalOptions = useMemo<Option[]>(
		() => [
			{
				value: "Increase visibility into product progress",
				label: t("baseline.options.personaGoals.visibility"),
			},
			{ value: "Align internal teams", label: t("baseline.options.personaGoals.alignment") },
			{
				value: "Reduce manual reporting",
				label: t("baseline.options.personaGoals.reduceManual"),
			},
			{
				value: "Create a compelling product narrative",
				label: t("baseline.options.personaGoals.narrative"),
			},
			{ value: "Ship updates faster", label: t("baseline.options.personaGoals.shipFaster") },
			{
				value: "Improve customer adoption",
				label: t("baseline.options.personaGoals.adoption"),
			},
			{
				value: "Communicate impact to stakeholders",
				label: t("baseline.options.personaGoals.impact"),
			},
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);

	const personaPainOptions = useMemo<Option[]>(
		() => [
			{
				value: "Information scattered across tools",
				label: t("baseline.options.personaPains.scatteredInfo"),
			},
			{ value: "Lack of time to document progress", label: t("baseline.options.personaPains.noTime") },
			{
				value: "Misalignment between product and marketing",
				label: t("baseline.options.personaPains.misalignment"),
			},
			{ value: "Inconsistent messaging", label: t("baseline.options.personaPains.inconsistent") },
			{ value: "Hard to prove impact", label: t("baseline.options.personaPains.proveImpact") },
			{
				value: "Overreliance on engineers",
				label: t("baseline.options.personaPains.overreliance"),
			},
			{
				value: "Manual, repetitive updates",
				label: t("baseline.options.personaPains.manualUpdates"),
			},
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);

	const personaToneOptions = useMemo<Option[]>(
		() => [
			{ value: "Technical", label: t("baseline.options.personaTone.technical") },
			{
				value: "Professional",
				label: t("baseline.options.personaTone.professional"),
			},
			{ value: "Friendly", label: t("baseline.options.personaTone.friendly") },
			{
				value: "Enthusiastic",
				label: t("baseline.options.personaTone.enthusiastic"),
			},
			{ value: "Minimal", label: t("baseline.options.personaTone.minimal") },
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);

	const personaToneLabels = useMemo(
		() =>
			new Map<string, string>(
				personaToneOptions.map((option) => [option.value, option.label]),
			),
		[personaToneOptions],
	);

	const updateValue = <K extends keyof BaselineWizardValues>(
		key: K,
		value: BaselineWizardValues[K],
	) => {
		onValuesChange({ ...values, [key]: value });
	};

	const handlePersonaChange = (
		index: number,
		field: keyof PersonaProfile,
		value: PersonaProfile[keyof PersonaProfile],
	) => {
		const nextPersonas = values.personas.map((persona, personaIndex) =>
			personaIndex === index ? { ...persona, [field]: value } : persona,
		);
		updateValue("personas", nextPersonas);
	};

	const togglePersonaExpansion = (index: number) => {
		setExpandedPersonas((prev) =>
			prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index],
		);
	};

	const handleAddPersona = () => {
		const nextPersonas = [
			...values.personas,
			{
				role: "",
				goals: [],
				painPoints: [],
				preferredTone: "",
			},
		];
		updateValue("personas", nextPersonas);
		setExpandedPersonas((prev) => [...prev, values.personas.length]);
	};

	const handleRemovePersona = (index: number) => {
		updateValue(
			"personas",
			values.personas.filter((_, personaIndex) => personaIndex !== index),
		);
		setExpandedPersonas((prev) => prev.filter((item) => item !== index));
	};

	const valuePropositionInvalid =
		showErrors && step === "basics" && values.valueProposition.trim().length === 0;
	const problemSolvedInvalid =
		showErrors && step === "basics" && values.problemSolved.trim().length === 0;
	const productTypeInvalid =
		showErrors && step === "basics" && values.productType.trim().length === 0;
	const businessModelInvalid =
		showErrors && step === "basics" && values.businessModel.trim().length === 0;
	const stageInvalid =
		showErrors && step === "basics" && values.stage.trim().length === 0;
	const targetMarketInvalid =
		showErrors && step === "basics" && values.targetMarket.trim().length === 0;

	const missingIndustries =
		showErrors && step === "market" && values.industries.length === 0;
	const missingAudiences =
		showErrors && step === "market" && values.audiences.length === 0;

	const personaErrors =
		showErrors && step === "personas"
			? values.personas.map((persona) => !isPersonaValid(persona))
			: values.personas.map(() => false);

	if (step === "basics") {
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<Label htmlFor="wizard-value-proposition">
						{t("baseline.fields.valueProposition")}
					</Label>
					<p className="text-fontSize-xs text-muted-foreground">
						{t("wizard.helpers.valueProposition")}
					</p>
					<Textarea
						id="wizard-value-proposition"
						value={values.valueProposition}
						onChange={(event) => updateValue("valueProposition", event.target.value)}
						disabled={isLoading}
						rows={3}
						placeholder={t("baseline.placeholders.valueProposition")}
						className={placeholderClassName}
					/>
					{valuePropositionInvalid ? (
						<p className="text-fontSize-xs text-destructive">
							{t("baseline.errors.valuePropositionRequired")}
						</p>
					) : null}
				</div>

				<div className="space-y-2">
					<Label htmlFor="wizard-problem-solved">
						{t("baseline.fields.problemSolved")}
					</Label>
					<p className="text-fontSize-xs text-muted-foreground">
						{t("wizard.helpers.problemSolved")}
					</p>
					<Textarea
						id="wizard-problem-solved"
						value={values.problemSolved}
						onChange={(event) => updateValue("problemSolved", event.target.value)}
						disabled={isLoading}
						rows={3}
						placeholder={t("baseline.placeholders.problemSolved")}
						className={placeholderClassName}
					/>
					{problemSolvedInvalid ? (
						<p className="text-fontSize-xs text-destructive">
							{t("baseline.errors.problemSolvedRequired")}
						</p>
					) : null}
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<SelectField
						id="wizard-product-type"
						label={t("baseline.fields.productType")}
						value={values.productType}
						options={productTypeOptions}
						onChange={(value) => updateValue("productType", value)}
						disabled={isLoading}
						helpText={t("wizard.helpers.productType")}
						showError={productTypeInvalid}
						errorMessage={t("baseline.errors.productTypeRequired")}
					/>
					<SelectField
						id="wizard-business-model"
						label={t("baseline.fields.businessModel")}
						value={values.businessModel}
						options={businessModelOptions}
						onChange={(value) => updateValue("businessModel", value)}
						disabled={isLoading}
						helpText={t("wizard.helpers.businessModel")}
						showError={businessModelInvalid}
						errorMessage={t("baseline.errors.businessModelRequired")}
					/>
					<SelectField
						id="wizard-stage"
						label={t("baseline.fields.stage")}
						value={values.stage}
						options={stageOptions}
						onChange={(value) => updateValue("stage", value)}
						disabled={isLoading}
						helpText={t("wizard.helpers.stage")}
						showError={stageInvalid}
						errorMessage={t("baseline.errors.stageRequired")}
					/>
					<SelectField
						id="wizard-target-market"
						label={t("baseline.fields.targetMarket")}
						value={values.targetMarket}
						options={targetMarketOptions}
						onChange={(value) => updateValue("targetMarket", value)}
						disabled={isLoading}
						helpText={t("wizard.helpers.targetMarket")}
						showError={targetMarketInvalid}
						errorMessage={t("baseline.errors.targetMarketRequired")}
					/>
				</div>
			</div>
		);
	}

	if (step === "market") {
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<Label>{t("baseline.fields.industries")}</Label>
					<p className="text-fontSize-xs text-muted-foreground">
						{t("wizard.helpers.industries")}
					</p>
					<MultiSelectDropdown
						options={industryOptions}
						selected={values.industries}
						onChange={(next) => updateValue("industries", next)}
						disabled={isLoading}
						filterPlaceholder={t("baseline.actions.filter")}
						placeholder={t("baseline.placeholders.select")}
					/>
					{missingIndustries ? (
						<p className="text-fontSize-xs text-destructive">
							{t("baseline.errors.industriesRequired")}
						</p>
					) : null}
				</div>
				<div className="space-y-2">
					<Label>{t("baseline.fields.audiences")}</Label>
					<p className="text-fontSize-xs text-muted-foreground">
						{t("wizard.helpers.audiences")}
					</p>
					<MultiSelectDropdown
						options={audienceOptions}
						selected={values.audiences}
						onChange={(next) => updateValue("audiences", next)}
						disabled={isLoading}
						filterPlaceholder={t("baseline.actions.filter")}
						placeholder={t("baseline.placeholders.select")}
					/>
					{missingAudiences ? (
						<p className="text-fontSize-xs text-destructive">
							{t("baseline.errors.audiencesRequired")}
						</p>
					) : null}
				</div>
			</div>
		);
	}

	if (step === "strategy") {
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<Label htmlFor="wizard-product-vision">
						{t("baseline.fields.productVision")}
					</Label>
					<p className="text-fontSize-xs text-muted-foreground">
						{t("wizard.helpers.productVision")}
					</p>
					<Textarea
						id="wizard-product-vision"
						value={values.productVision}
						onChange={(event) => updateValue("productVision", event.target.value)}
						disabled={isLoading}
						rows={3}
						placeholder={t("baseline.placeholders.productVision")}
						className={placeholderClassName}
					/>
				</div>

				<div className="space-y-2">
					<Label>{t("baseline.fields.strategicPillars")}</Label>
					<p className="text-fontSize-xs text-muted-foreground">
						{t("wizard.helpers.strategicPillars")}
					</p>
					<MultiSelectDropdown
						options={strategicPillarOptions}
						selected={values.strategicPillars}
						onChange={(next) => updateValue("strategicPillars", next)}
						disabled={isLoading}
						filterPlaceholder={t("baseline.actions.filter")}
						placeholder={t("baseline.placeholders.select")}
					/>
				</div>
				<div className="space-y-2">
					<Label>{t("baseline.fields.metricsOfInterest")}</Label>
					<p className="text-fontSize-xs text-muted-foreground">
						{t("wizard.helpers.metricsOfInterest")}
					</p>
					<MultiSelectDropdown
						options={metricsOptions}
						selected={values.metricsOfInterest}
						onChange={(next) => updateValue("metricsOfInterest", next)}
						disabled={isLoading}
						filterPlaceholder={t("baseline.actions.filter")}
						placeholder={t("baseline.placeholders.select")}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<p className="text-fontSize-sm text-muted-foreground">
				{t("wizard.helpers.personasIntro")}
			</p>
			{values.personas.length === 0 ? (
				<p className="text-fontSize-sm text-muted-foreground">
					{t("baseline.emptyPersonas")}
				</p>
			) : null}

			<div className="space-y-4">
				{values.personas.map((persona, index) => {
					const isExpanded = expandedPersonas.includes(index);
					const hasError = personaErrors[index];

					return (
						<div
							key={`wizard-persona-${index}`}
							className="rounded-lg border p-4 space-y-4"
						>
							<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
								<div>
									<p className="text-fontSize-sm font-medium">
										{persona.role || t("baseline.persona.untitled")}
									</p>
									<div className="flex flex-wrap gap-2 text-fontSize-xs text-muted-foreground">
										<Badge variant="secondary">
											{t("baseline.persona.goalsCount", {
												count: persona.goals.length,
											})}
										</Badge>
										<Badge variant="secondary">
											{t("baseline.persona.painsCount", {
												count: persona.painPoints.length,
											})}
										</Badge>
										{persona.preferredTone ? (
											<Badge variant="outline">
												{personaToneLabels.get(persona.preferredTone) ??
													persona.preferredTone}
											</Badge>
										) : null}
									</div>
								</div>
								<div className="flex gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => togglePersonaExpansion(index)}
										disabled={isLoading}
									>
										{isExpanded
											? t("baseline.actions.collapse")
											: t("baseline.actions.edit")}
									</Button>
									<Button
										type="button"
										variant="ghost-destructive"
										size="sm"
										onClick={() => handleRemovePersona(index)}
										disabled={isLoading}
									>
										{t("baseline.actions.remove")}
									</Button>
								</div>
							</div>

							{isExpanded ? (
								<div className="space-y-4">
									<SelectField
										id={`wizard-persona-role-${index}`}
										label={t("baseline.persona.role")}
										value={persona.role}
										options={personaRoleOptions}
										onChange={(value) => handlePersonaChange(index, "role", value)}
										disabled={isLoading}
										helpText={t("wizard.helpers.personaRole")}
									/>

									<div className="space-y-2">
										<Label>{t("baseline.persona.goals")}</Label>
										<p className="text-fontSize-xs text-muted-foreground">
											{t("wizard.helpers.personaGoals")}
										</p>
										<MultiSelectDropdown
											options={personaGoalOptions}
											selected={persona.goals}
											onChange={(next) =>
												handlePersonaChange(index, "goals", next)
											}
											disabled={isLoading}
											filterPlaceholder={t("baseline.actions.filter")}
											placeholder={t("baseline.placeholders.select")}
										/>
									</div>

									<div className="space-y-2">
										<Label>{t("baseline.persona.painPoints")}</Label>
										<p className="text-fontSize-xs text-muted-foreground">
											{t("wizard.helpers.personaPainPoints")}
										</p>
										<MultiSelectDropdown
											options={personaPainOptions}
											selected={persona.painPoints}
											onChange={(next) =>
												handlePersonaChange(index, "painPoints", next)
											}
											disabled={isLoading}
											filterPlaceholder={t("baseline.actions.filter")}
											placeholder={t("baseline.placeholders.select")}
										/>
									</div>

									<SelectField
										id={`wizard-persona-tone-${index}`}
										label={t("baseline.persona.preferredTone")}
										value={persona.preferredTone}
										options={personaToneOptions}
										onChange={(value) =>
											handlePersonaChange(index, "preferredTone", value)
										}
										disabled={isLoading}
										helpText={t("wizard.helpers.personaPreferredTone")}
									/>
								</div>
							) : null}

							{hasError ? (
								<p className="text-fontSize-xs text-destructive">
									{t("baseline.errors.personaIncomplete")}
								</p>
							) : null}
						</div>
					);
				})}
			</div>

			<Button
				type="button"
				variant="outline"
				onClick={handleAddPersona}
				disabled={isLoading}
			>
				{t("baseline.actions.addPersona")}
			</Button>
		</div>
	);
}

type SelectFieldProps = {
	id: string;
	label: string;
	value: string;
	options: Option[];
	onChange: (value: string) => void;
	disabled: boolean;
	helpText?: string;
	showError?: boolean;
	errorMessage?: string;
};

function SelectField({
	id,
	label,
	value,
	options,
	onChange,
	disabled,
	helpText,
	showError,
	errorMessage,
}: SelectFieldProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			{helpText ? (
				<p className="text-fontSize-xs text-muted-foreground">{helpText}</p>
			) : null}
			<Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
				<SelectTrigger id={id}>
					<SelectValue placeholder="-" />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{showError && errorMessage ? (
				<p className="text-fontSize-xs text-destructive">{errorMessage}</p>
			) : null}
		</div>
	);
}
