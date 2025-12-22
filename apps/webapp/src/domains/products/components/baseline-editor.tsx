import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
	Badge,
	Button,
	Card,
	CardContent,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Textarea,
	toast,
	MultiSelectDropdown,
} from "@hikai/ui";
import { useUpdateBaseline } from "../hooks";

type PersonaProfile = {
	role: string;
	goals: string[];
	painPoints: string[];
	preferredTone: string;
};

type ProductBaseline = {
	valueProposition?: string;
	problemSolved?: string;
	targetMarket?: string;
	productType?: string;
	businessModel?: string;
	stage?: string;
	industries?: string[];
	audiences?: string[];
	productVision?: string;
	strategicPillars?: string[];
	metricsOfInterest?: string[];
	personas?: PersonaProfile[];
};

type BaselineEditorProps = {
	product: {
		_id: Id<"products">;
		productBaseline?: ProductBaseline;
	};
	onSave?: () => void;
};

type Option = {
	value: string;
	label: string;
	description?: string;
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

const isPersonaValid = (persona: PersonaProfile) =>
	(persona.role?.trim() ?? "").length > 0 &&
	(persona.preferredTone?.trim() ?? "").length > 0 &&
	(persona.goals ?? []).length > 0 &&
	(persona.painPoints ?? []).length > 0;

const buildBaselinePayload = (values: {
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
}): ProductBaseline => ({
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

const buildBaselineFromProduct = (
	baseline: ProductBaseline | undefined,
): ProductBaseline => ({
	valueProposition: baseline?.valueProposition,
	problemSolved: baseline?.problemSolved,
	targetMarket: baseline?.targetMarket,
	productType: baseline?.productType,
	businessModel: baseline?.businessModel,
	stage: baseline?.stage,
	industries: baseline?.industries,
	audiences: baseline?.audiences,
	productVision: baseline?.productVision,
	strategicPillars: baseline?.strategicPillars,
	metricsOfInterest: baseline?.metricsOfInterest,
	personas: baseline?.personas,
});

export function BaselineEditor({ product, onSave }: BaselineEditorProps) {
	const { t } = useTranslation("products");
	const updateBaseline = useUpdateBaseline();
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [expandedPersonas, setExpandedPersonas] = useState<number[]>([]);

	const [valueProposition, setValueProposition] = useState("");
	const [problemSolved, setProblemSolved] = useState("");
	const [targetMarket, setTargetMarket] = useState("");
	const [productType, setProductType] = useState("");
	const [businessModel, setBusinessModel] = useState("");
	const [stage, setStage] = useState("");
	const [industries, setIndustries] = useState<string[]>([]);
	const [audiences, setAudiences] = useState<string[]>([]);
	const [productVision, setProductVision] = useState("");
	const [strategicPillars, setStrategicPillars] = useState<string[]>([]);
	const [metricsOfInterest, setMetricsOfInterest] = useState<string[]>([]);
	const [personas, setPersonas] = useState<PersonaProfile[]>([]);

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
				value: "early-production",
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
				value: "Marketing Tech",
				label: t("baseline.options.industries.marketingTech"),
			},
			{
				value: "Customer Success",
				label: t("baseline.options.industries.customerSuccess"),
			},
			{
				value: "Developer Tools",
				label: t("baseline.options.industries.developerTools"),
			},
			{ value: "Fintech", label: t("baseline.options.industries.fintech") },
			{ value: "Healthtech", label: t("baseline.options.industries.healthtech") },
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
			{ value: "HR Tech", label: t("baseline.options.industries.hrTech") },
			{ value: "Legal Tech", label: t("baseline.options.industries.legalTech") },
			{ value: "Proptech", label: t("baseline.options.industries.proptech") },
			{ value: "Gaming", label: t("baseline.options.industries.gaming") },
			{
				value: "Media & Content",
				label: t("baseline.options.industries.mediaContent"),
			},
			{ value: "IoT", label: t("baseline.options.industries.iot") },
			{
				value: "Enterprise Software",
				label: t("baseline.options.industries.enterpriseSoftware"),
			},
			{ value: "Open Source", label: t("baseline.options.industries.openSource") },
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
			{ value: "Executives", label: t("baseline.options.audiences.executives") },
			{
				value: "Stakeholders",
				label: t("baseline.options.audiences.stakeholders"),
			},
			{ value: "Market", label: t("baseline.options.audiences.market") },
			{ value: "End users", label: t("baseline.options.audiences.endUsers") },
			{
				value: "Developers",
				label: t("baseline.options.audiences.developers"),
			},
			{ value: "Partners", label: t("baseline.options.audiences.partners") },
			{ value: "Investors", label: t("baseline.options.audiences.investors") },
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);

	const strategicPillarOptions = useMemo<Option[]>(
		() => [
			{
				value: "product_excellence",
				label: t("baseline.options.strategicPillars.productExcellence"),
				description: t(
					"baseline.options.strategicPillarsDescriptions.productExcellence",
				),
			},
			{
				value: "user_adoption_retention",
				label: t("baseline.options.strategicPillars.userAdoptionRetention"),
				description: t(
					"baseline.options.strategicPillarsDescriptions.userAdoptionRetention",
				),
			},
			{
				value: "growth_acquisition",
				label: t("baseline.options.strategicPillars.growthAcquisition"),
				description: t(
					"baseline.options.strategicPillarsDescriptions.growthAcquisition",
				),
			},
			{
				value: "narrative_brand",
				label: t("baseline.options.strategicPillars.narrativeBrand"),
				description: t(
					"baseline.options.strategicPillarsDescriptions.narrativeBrand",
				),
			},
			{
				value: "operational_efficiency",
				label: t("baseline.options.strategicPillars.operationalEfficiency"),
				description: t(
					"baseline.options.strategicPillarsDescriptions.operationalEfficiency",
				),
			},
			{
				value: "scalability_business_impact",
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
			{
				value: "User adoption",
				label: t("baseline.options.metrics.userAdoption"),
			},
			{
				value: "Feature usage",
				label: t("baseline.options.metrics.featureUsage"),
			},
			{
				value: "Time to value",
				label: t("baseline.options.metrics.timeToValue"),
			},
			{
				value: "Performance improvements",
				label: t("baseline.options.metrics.performance"),
			},
			{
				value: "Reliability / uptime",
				label: t("baseline.options.metrics.reliability"),
			},
			{
				value: "Customer satisfaction",
				label: t("baseline.options.metrics.satisfaction"),
			},
			{
				value: "Churn reduction",
				label: t("baseline.options.metrics.churn"),
			},
			{
				value: "Conversion rate",
				label: t("baseline.options.metrics.conversion"),
			},
			{
				value: "Content consistency",
				label: t("baseline.options.metrics.contentConsistency"),
			},
			{
				value: "Time saved",
				label: t("baseline.options.metrics.timeSaved"),
			},
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);

	const personaRoleOptions = useMemo<Option[]>(
		() => [
			{
				value: "Founder",
				label: t("baseline.options.personaRoles.founder"),
			},
			{
				value: "Product Manager",
				label: t("baseline.options.personaRoles.productManager"),
			},
			{
				value: "Engineer",
				label: t("baseline.options.personaRoles.engineer"),
			},
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
			{
				value: "Executive",
				label: t("baseline.options.personaRoles.executive"),
			},
			{
				value: "Developer Advocate",
				label: t("baseline.options.personaRoles.developerAdvocate"),
			},
			{
				value: "Operations",
				label: t("baseline.options.personaRoles.operations"),
			},
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
			{
				value: "Align internal teams",
				label: t("baseline.options.personaGoals.alignment"),
			},
			{
				value: "Reduce manual reporting",
				label: t("baseline.options.personaGoals.reduceManual"),
			},
			{
				value: "Create a compelling product narrative",
				label: t("baseline.options.personaGoals.narrative"),
			},
			{
				value: "Ship updates faster",
				label: t("baseline.options.personaGoals.shipFaster"),
			},
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
			{
				value: "Lack of time to document progress",
				label: t("baseline.options.personaPains.noTime"),
			},
			{
				value: "Misalignment between product and marketing",
				label: t("baseline.options.personaPains.misalignment"),
			},
			{
				value: "Inconsistent messaging",
				label: t("baseline.options.personaPains.inconsistent"),
			},
			{
				value: "Hard to prove impact",
				label: t("baseline.options.personaPains.proveImpact"),
			},
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
			{
				value: "technical",
				label: t("baseline.options.personaTone.technical"),
			},
			{
				value: "professional",
				label: t("baseline.options.personaTone.professional"),
			},
			{
				value: "friendly",
				label: t("baseline.options.personaTone.friendly"),
			},
			{
				value: "enthusiastic",
				label: t("baseline.options.personaTone.enthusiastic"),
			},
			{
				value: "minimal",
				label: t("baseline.options.personaTone.minimal"),
			},
			{ value: "Other", label: t("baseline.options.common.other") },
		],
		[t],
	);
	const personaToneLabels = useMemo(
		() => new Map(personaToneOptions.map((option) => [option.value, option.label])),
		[personaToneOptions],
	);

	useEffect(() => {
		const baseline = product.productBaseline;
		setValueProposition(baseline?.valueProposition ?? "");
		setProblemSolved(baseline?.problemSolved ?? "");
		setTargetMarket(baseline?.targetMarket ?? "");
		setProductType(baseline?.productType ?? "");
		setBusinessModel(baseline?.businessModel ?? "");
		setStage(baseline?.stage ?? "");
		setIndustries(baseline?.industries ?? []);
		setAudiences(baseline?.audiences ?? []);
		setProductVision(baseline?.productVision ?? "");
		setStrategicPillars(baseline?.strategicPillars ?? []);
		setMetricsOfInterest(baseline?.metricsOfInterest ?? []);
		const rawPersonas = (baseline?.personas ?? []) as Array<
			Partial<PersonaProfile> & { name?: string }
		>;
		setPersonas(
			rawPersonas.map((persona) => ({
				role: persona.role ?? persona.name ?? "",
				goals: persona.goals ?? [],
				painPoints: persona.painPoints ?? [],
				preferredTone: persona.preferredTone ?? "",
			})),
		);
		setExpandedPersonas([]);
	}, [product]);

	const personaErrors = personas.map((persona) => !isPersonaValid(persona));

	const missingIndustries = industries.length === 0;
	const missingAudiences = audiences.length === 0;

	const valuePropositionInvalid = valueProposition.trim().length === 0;
	const problemSolvedInvalid = problemSolved.trim().length === 0;
	const targetMarketInvalid = targetMarket.trim().length === 0;
	const productTypeInvalid = productType.trim().length === 0;
	const businessModelInvalid = businessModel.trim().length === 0;
	const stageInvalid = stage.trim().length === 0;
	const basicsPendingCount = [
		valuePropositionInvalid,
		problemSolvedInvalid,
		targetMarketInvalid,
		productTypeInvalid,
		businessModelInvalid,
		stageInvalid,
	].filter(Boolean).length;
	const marketPendingCount = [missingIndustries, missingAudiences].filter(Boolean)
		.length;
	const personasPendingCount = personaErrors.filter(Boolean).length;

	const baselinePayload = useMemo(
		() =>
			buildBaselinePayload({
				valueProposition,
				problemSolved,
				targetMarket,
				productType,
				businessModel,
				stage,
				industries,
				audiences,
				productVision,
				strategicPillars,
				metricsOfInterest,
				personas,
			}),
		[
			valueProposition,
			problemSolved,
			targetMarket,
			productType,
			businessModel,
			stage,
			industries,
			audiences,
			productVision,
			strategicPillars,
			metricsOfInterest,
			personas,
		],
	);

	const hasChanges = useMemo(() => {
		const initialBaseline = buildBaselineFromProduct(product.productBaseline);
		const baselineChanged =
			JSON.stringify(baselinePayload) !== JSON.stringify(initialBaseline);
		return baselineChanged;
	}, [baselinePayload, product]);

	const hasPersonaErrors = personaErrors.some(Boolean);

	const isSaveDisabled =
		isSaving ||
		!hasChanges ||
		valuePropositionInvalid ||
		problemSolvedInvalid ||
		targetMarketInvalid ||
		productTypeInvalid ||
		businessModelInvalid ||
		stageInvalid ||
		missingIndustries ||
		missingAudiences ||
		hasPersonaErrors;

	const handleSave = async () => {
		setError(null);

		if (isSaveDisabled) {
			return;
		}

		setIsSaving(true);

		try {
			await updateBaseline({
				productId: product._id,
				baseline: baselinePayload,
			});

			toast.success(t("baseline.saved"));
			onSave?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.unknown"));
		} finally {
			setIsSaving(false);
		}
	};

	const handlePersonaChange = (
		index: number,
		field: keyof PersonaProfile,
		value: string | string[],
	) => {
		setPersonas((prev) =>
			prev.map((persona, personaIndex) =>
				personaIndex === index
					? { ...persona, [field]: value }
					: persona,
			),
		);
	};

	const togglePersonaExpansion = (index: number) => {
		setExpandedPersonas((prev) =>
			prev.includes(index)
				? prev.filter((item) => item !== index)
				: [...prev, index],
		);
	};

	const handleAddPersona = () => {
		setPersonas((prev) => [
			...prev,
			{
				role: "",
				goals: [],
				painPoints: [],
				preferredTone: "",
			},
		]);
		setExpandedPersonas((prev) => [...prev, personas.length]);
	};

	const handleRemovePersona = (index: number) => {
		setPersonas((prev) => prev.filter((_, personaIndex) => personaIndex !== index));
		setExpandedPersonas((prev) => prev.filter((item) => item !== index));
	};

	return (
		<Card>
			<CardContent className="p-6 space-y-6">
				<Tabs defaultValue="basics" className="space-y-6">
					<TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
						<TabsTrigger value="basics" className="gap-2">
							{t("baseline.tabs.basics")}
							{basicsPendingCount > 0 ? (
								<Badge variant="secondary" className="h-5 px-1.5">
									{basicsPendingCount}
								</Badge>
							) : null}
						</TabsTrigger>
						<TabsTrigger value="market" className="gap-2">
							{t("baseline.tabs.market")}
							{marketPendingCount > 0 ? (
								<Badge variant="secondary" className="h-5 px-1.5">
									{marketPendingCount}
								</Badge>
							) : null}
						</TabsTrigger>
						<TabsTrigger value="strategy">{t("baseline.tabs.strategy")}</TabsTrigger>
						<TabsTrigger value="personas" className="gap-2">
							{t("baseline.tabs.personas")}
							{personasPendingCount > 0 ? (
								<Badge variant="secondary" className="h-5 px-1.5">
									{personasPendingCount}
								</Badge>
							) : null}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="basics" className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="baseline-value-proposition">
								{t("baseline.fields.valueProposition")}
							</Label>
							<Textarea
								id="baseline-value-proposition"
								value={valueProposition}
								onChange={(event) => setValueProposition(event.target.value)}
								disabled={isSaving}
								rows={3}
								placeholder={t("baseline.placeholders.valueProposition")}
							/>
							{valuePropositionInvalid ? (
								<p className="text-fontSize-xs text-destructive">
									{t("baseline.errors.valuePropositionRequired")}
								</p>
							) : null}
						</div>

						<div className="space-y-2">
							<Label htmlFor="baseline-problem-solved">
								{t("baseline.fields.problemSolved")}
							</Label>
							<Textarea
								id="baseline-problem-solved"
								value={problemSolved}
								onChange={(event) => setProblemSolved(event.target.value)}
								disabled={isSaving}
								rows={3}
								placeholder={t("baseline.placeholders.problemSolved")}
							/>
							{problemSolvedInvalid ? (
								<p className="text-fontSize-xs text-destructive">
									{t("baseline.errors.problemSolvedRequired")}
								</p>
							) : null}
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<SelectField
								id="baseline-product-type"
								label={t("baseline.fields.productType")}
								value={productType}
								options={productTypeOptions}
								onChange={setProductType}
								disabled={isSaving}
								showError={productTypeInvalid}
								errorMessage={t("baseline.errors.productTypeRequired")}
							/>
							<SelectField
								id="baseline-business-model"
								label={t("baseline.fields.businessModel")}
								value={businessModel}
								options={businessModelOptions}
								onChange={setBusinessModel}
								disabled={isSaving}
								showError={businessModelInvalid}
								errorMessage={t("baseline.errors.businessModelRequired")}
							/>
							<SelectField
								id="baseline-stage"
								label={t("baseline.fields.stage")}
								value={stage}
								options={stageOptions}
								onChange={setStage}
								disabled={isSaving}
								showError={stageInvalid}
								errorMessage={t("baseline.errors.stageRequired")}
							/>
							<SelectField
								id="baseline-target-market"
								label={t("baseline.fields.targetMarket")}
								value={targetMarket}
								options={targetMarketOptions}
								onChange={setTargetMarket}
								disabled={isSaving}
								showError={targetMarketInvalid}
								errorMessage={t("baseline.errors.targetMarketRequired")}
							/>
						</div>
					</TabsContent>

					<TabsContent value="market" className="space-y-6">
						<div className="space-y-2">
							<Label>{t("baseline.fields.industries")}</Label>
							<MultiSelectDropdown
								options={industryOptions}
								selected={industries}
								onChange={setIndustries}
								disabled={isSaving}
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
							<MultiSelectDropdown
								options={audienceOptions}
								selected={audiences}
								onChange={setAudiences}
								disabled={isSaving}
								filterPlaceholder={t("baseline.actions.filter")}
								placeholder={t("baseline.placeholders.select")}
							/>
							{missingAudiences ? (
								<p className="text-fontSize-xs text-destructive">
									{t("baseline.errors.audiencesRequired")}
								</p>
							) : null}
						</div>
					</TabsContent>

					<TabsContent value="strategy" className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="baseline-product-vision">
								{t("baseline.fields.productVision")}
							</Label>
							<Textarea
								id="baseline-product-vision"
								value={productVision}
								onChange={(event) => setProductVision(event.target.value)}
								disabled={isSaving}
								rows={3}
								placeholder={t("baseline.placeholders.productVision")}
							/>
						</div>

						<div className="space-y-2">
							<Label>{t("baseline.fields.strategicPillars")}</Label>
							<MultiSelectDropdown
								options={strategicPillarOptions}
								selected={strategicPillars}
								onChange={setStrategicPillars}
								disabled={isSaving}
								filterPlaceholder={t("baseline.actions.filter")}
								placeholder={t("baseline.placeholders.select")}
							/>
						</div>
						<div className="space-y-2">
							<Label>{t("baseline.fields.metricsOfInterest")}</Label>
							<MultiSelectDropdown
								options={metricsOptions}
								selected={metricsOfInterest}
								onChange={setMetricsOfInterest}
								disabled={isSaving}
								filterPlaceholder={t("baseline.actions.filter")}
								placeholder={t("baseline.placeholders.select")}
							/>
						</div>
					</TabsContent>

					<TabsContent value="personas" className="space-y-6">
						{personas.length === 0 ? (
							<p className="text-fontSize-sm text-muted-foreground">
								{t("baseline.emptyPersonas")}
							</p>
						) : null}

						<div className="space-y-4">
							{personas.map((persona, index) => {
								const isExpanded = expandedPersonas.includes(index);
								const hasError = personaErrors[index];

								return (
									<div
										key={`persona-${index}`}
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
													disabled={isSaving}
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
													disabled={isSaving}
												>
													{t("baseline.actions.remove")}
												</Button>
											</div>
										</div>

										{isExpanded ? (
											<div className="space-y-4">
												<SelectField
													id={`persona-role-${index}`}
													label={t("baseline.persona.role")}
													value={persona.role}
													options={personaRoleOptions}
													onChange={(value) =>
														handlePersonaChange(index, "role", value)
													}
													disabled={isSaving}
												/>

												<div className="space-y-2">
													<Label>{t("baseline.persona.goals")}</Label>
													<MultiSelectDropdown
														options={personaGoalOptions}
														selected={persona.goals}
														onChange={(value) =>
															handlePersonaChange(index, "goals", value)
														}
														disabled={isSaving}
														filterPlaceholder={t("baseline.actions.filter")}
														placeholder={t("baseline.placeholders.select")}
													/>
												</div>

												<div className="space-y-2">
													<Label>{t("baseline.persona.painPoints")}</Label>
													<MultiSelectDropdown
														options={personaPainOptions}
														selected={persona.painPoints}
														onChange={(value) =>
															handlePersonaChange(index, "painPoints", value)
														}
														disabled={isSaving}
														filterPlaceholder={t("baseline.actions.filter")}
														placeholder={t("baseline.placeholders.select")}
													/>
												</div>

												<SelectField
													id={`persona-tone-${index}`}
													label={t("baseline.persona.preferredTone")}
													value={persona.preferredTone}
													options={personaToneOptions}
													onChange={(value) =>
														handlePersonaChange(index, "preferredTone", value)
													}
													disabled={isSaving}
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
							disabled={isSaving}
						>
							{t("baseline.actions.addPersona")}
						</Button>
					</TabsContent>
				</Tabs>

				{error ? (
					<p className="text-fontSize-sm text-destructive">{error}</p>
				) : null}

				<div className="flex justify-end">
					<Button type="button" onClick={handleSave} disabled={isSaveDisabled}>
						{isSaving ? t("baseline.saving") : t("baseline.save")}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

type SelectFieldProps = {
	id: string;
	label: string;
	value: string;
	options: Option[];
	onChange: (value: string) => void;
	disabled: boolean;
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
	showError,
	errorMessage,
}: SelectFieldProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
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
