import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
	Badge,
	Button,
	Card,
	CardContent,
	Input,
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

type IcpProfile = {
	id: string;
	name?: string;
	segment: string;
	pains: string[];
	goals: string[];
};

type ProductBaseline = {
	targetMarket?: string;
	productCategory?: string;
	businessModel?: string;
	stage?: string;
	industry?: string;
	valueProposition?: string;
	problemSolved?: string;
	productVision?: string;
	strategicPillars?: string[];
	metricsOfInterest?: string[];
	icps?: IcpProfile[];
};

type BaselineEditorProps = {
	product: {
		_id: Id<"products">;
		name?: string;
		baseline?: ProductBaseline;
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
	return trimmed.length > 0 ? trimmed : "";
};

const normalizeArray = (values?: string[]) =>
	(values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);

const ensureIcpId = (id?: string) => {
	if (id && id.trim().length > 0) return id;
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeIcp = (icp: IcpProfile): IcpProfile => ({
	...icp,
	id: ensureIcpId(icp.id),
	name: normalizeString(icp.name) || undefined,
	segment: normalizeString(icp.segment),
	pains: normalizeArray(icp.pains),
	goals: normalizeArray(icp.goals),
});

const normalizeBaseline = (baseline: ProductBaseline | undefined) => {
	if (!baseline) return undefined;

	const icps =
		baseline.icps && baseline.icps.length > 0
			? baseline.icps.map(normalizeIcp)
			: undefined;

	return {
		targetMarket: normalizeString(baseline.targetMarket) || undefined,
		productCategory: normalizeString(baseline.productCategory) || undefined,
		businessModel: normalizeString(baseline.businessModel) || undefined,
		stage: normalizeString(baseline.stage) || undefined,
		industry: normalizeString(baseline.industry) || undefined,
		problemSolved: normalizeString(baseline.problemSolved) || undefined,
		valueProposition: normalizeString(baseline.valueProposition) || undefined,
		productVision: normalizeString(baseline.productVision) || undefined,
		strategicPillars:
			baseline.strategicPillars && baseline.strategicPillars.length > 0
				? baseline.strategicPillars
				: undefined,
		metricsOfInterest:
			baseline.metricsOfInterest && baseline.metricsOfInterest.length > 0
				? baseline.metricsOfInterest
				: undefined,
		icps,
	};
};

const isIcpValid = (icp: IcpProfile) =>
	(icp.segment?.trim() ?? "").length > 0 &&
	(icp.pains ?? []).length > 0 &&
	(icp.goals ?? []).length > 0;

const buildBaselinePayload = (values: {
	targetMarket: string;
	productCategory: string;
	businessModel: string;
	stage: string;
	industry: string;
	valueProposition: string;
	problemSolved: string;
	productVision: string;
	strategicPillars: string[];
	metricsOfInterest: string[];
	icps: IcpProfile[];
}): ProductBaseline => ({
	targetMarket: normalizeString(values.targetMarket),
	productCategory: normalizeString(values.productCategory),
	businessModel: normalizeString(values.businessModel),
	stage: normalizeString(values.stage),
	industry: normalizeString(values.industry),
	valueProposition: normalizeString(values.valueProposition),
	problemSolved: normalizeString(values.problemSolved),
	productVision: normalizeString(values.productVision),
	strategicPillars: values.strategicPillars,
	metricsOfInterest: values.metricsOfInterest,
	icps: values.icps.map((icp) => ({
		id: ensureIcpId(icp.id),
		name: normalizeString(icp.name) || undefined,
		segment: normalizeString(icp.segment),
		pains: normalizeArray(icp.pains),
		goals: normalizeArray(icp.goals),
	})),
});

const buildBaselineFromProduct = (
	baseline: ProductBaseline | undefined,
): ProductBaseline => {
	const normalized = normalizeBaseline(baseline);
	return {
		targetMarket: normalized?.targetMarket,
		productCategory: normalized?.productCategory,
		businessModel: normalized?.businessModel,
		stage: normalized?.stage,
		industry: normalized?.industry,
		problemSolved: normalized?.problemSolved,
		valueProposition: normalized?.valueProposition,
		productVision: normalized?.productVision,
		strategicPillars: normalized?.strategicPillars,
		metricsOfInterest: normalized?.metricsOfInterest,
		icps: normalized?.icps,
	};
};

export function BaselineEditor({ product, onSave }: BaselineEditorProps) {
	const { t, i18n } = useTranslation("products");
	const updateBaseline = useUpdateBaseline();
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);

	const [targetMarket, setTargetMarket] = useState("");
	const [productCategory, setProductCategory] = useState("");
	const [businessModel, setBusinessModel] = useState("");
	const [stage, setStage] = useState("");
	const [industry, setIndustry] = useState("");
	const [valueProposition, setValueProposition] = useState("");
	const [problemSolved, setProblemSolved] = useState("");
	const [productVision, setProductVision] = useState("");
	const [strategicPillars, setStrategicPillars] = useState<string[]>([]);
	const [metricsOfInterest, setMetricsOfInterest] = useState<string[]>([]);
	const [icps, setIcps] = useState<IcpProfile[]>([]);

	const productName =
		product.name?.trim() || t("baseline.productNameGeneric");

	const targetMarketOptions = useMemo<Option[]>(
		() => [
			{
				value: "b2b",
				label: t("baseline.options.targetMarket.b2b.label"),
				description: t("baseline.options.targetMarket.b2b.description"),
			},
			{
				value: "b2c",
				label: t("baseline.options.targetMarket.b2c.label"),
				description: t("baseline.options.targetMarket.b2c.description"),
			},
			{
				value: "b2b2c",
				label: t("baseline.options.targetMarket.b2b2c.label"),
				description: t("baseline.options.targetMarket.b2b2c.description"),
			},
			{
				value: "internal",
				label: t("baseline.options.targetMarket.internal.label"),
				description: t("baseline.options.targetMarket.internal.description"),
			},
		],
		[t, i18n.language],
	);

	const productCategoryOptions = useMemo<Option[]>(
		() => [
			{
				value: "digital-service",
				label: t("baseline.options.productCategory.digitalService.label"),
				description: t(
					"baseline.options.productCategory.digitalService.description",
				),
			},
			{
				value: "platform",
				label: t("baseline.options.productCategory.platform.label"),
				description: t(
					"baseline.options.productCategory.platform.description",
				),
			},
			{
				value: "tool",
				label: t("baseline.options.productCategory.tool.label"),
				description: t("baseline.options.productCategory.tool.description"),
			},
			{
				value: "content",
				label: t("baseline.options.productCategory.content.label"),
				description: t(
					"baseline.options.productCategory.content.description",
				),
			},
			{
				value: "commerce",
				label: t("baseline.options.productCategory.commerce.label"),
				description: t(
					"baseline.options.productCategory.commerce.description",
				),
			},
			{
				value: "connected",
				label: t("baseline.options.productCategory.connected.label"),
				description: t(
					"baseline.options.productCategory.connected.description",
				),
			},
		],
		[t, i18n.language],
	);

	const businessModelOptions = useMemo<Option[]>(
		() => [
			{
				value: "subscription",
				label: t("baseline.options.businessModel.subscription.label"),
				description: t(
					"baseline.options.businessModel.subscription.description",
				),
			},
			{
				value: "usage-based",
				label: t("baseline.options.businessModel.usageBased.label"),
				description: t("baseline.options.businessModel.usageBased.description"),
			},
			{
				value: "transactional",
				label: t("baseline.options.businessModel.transactional.label"),
				description: t(
					"baseline.options.businessModel.transactional.description",
				),
			},
			{
				value: "freemium",
				label: t("baseline.options.businessModel.freemium.label"),
				description: t(
					"baseline.options.businessModel.freemium.description",
				),
			},
			{
				value: "marketplace",
				label: t("baseline.options.businessModel.marketplace.label"),
				description: t(
					"baseline.options.businessModel.marketplace.description",
				),
			},
			{
				value: "advertising",
				label: t("baseline.options.businessModel.advertising.label"),
				description: t(
					"baseline.options.businessModel.advertising.description",
				),
			},
			{
				value: "licensing",
				label: t("baseline.options.businessModel.licensing.label"),
				description: t(
					"baseline.options.businessModel.licensing.description",
				),
			},
			{
				value: "internal",
				label: t("baseline.options.businessModel.internal.label"),
				description: t(
					"baseline.options.businessModel.internal.description",
				),
			},
		],
		[t, i18n.language],
	);

	const stageOptions = useMemo<Option[]>(
		() => [
			{
				value: "mvp",
				label: t("baseline.options.stage.mvp.label"),
				description: t("baseline.options.stage.mvp.description"),
			},
			{
				value: "growth",
				label: t("baseline.options.stage.growth.label"),
				description: t("baseline.options.stage.growth.description"),
			},
			{
				value: "scale",
				label: t("baseline.options.stage.scale.label"),
				description: t("baseline.options.stage.scale.description"),
			},
			{
				value: "mature",
				label: t("baseline.options.stage.mature.label"),
				description: t("baseline.options.stage.mature.description"),
			},
		],
		[t, i18n.language],
	);

	const industryOptions = useMemo<Option[]>(
		() => [
			{ value: "technology", label: t("baseline.options.industry.technology") },
			{ value: "healthcare", label: t("baseline.options.industry.healthcare") },
			{ value: "financial", label: t("baseline.options.industry.financial") },
			{ value: "retail", label: t("baseline.options.industry.retail") },
			{
				value: "manufacturing",
				label: t("baseline.options.industry.manufacturing"),
			},
			{ value: "education", label: t("baseline.options.industry.education") },
			{
				value: "hospitality",
				label: t("baseline.options.industry.hospitality"),
			},
			{ value: "realestate", label: t("baseline.options.industry.realestate") },
			{ value: "agriculture", label: t("baseline.options.industry.agriculture") },
			{
				value: "transportation",
				label: t("baseline.options.industry.transportation"),
			},
			{ value: "media", label: t("baseline.options.industry.media") },
			{
				value: "professional",
				label: t("baseline.options.industry.professional"),
			},
			{ value: "energy", label: t("baseline.options.industry.energy") },
			{ value: "government", label: t("baseline.options.industry.government") },
			{ value: "nonprofit", label: t("baseline.options.industry.nonprofit") },
		],
		[t, i18n.language],
	);

	const strategicPillarOptions = useMemo<Option[]>(
		() => [
			{
				value: "product-excellence",
				label: t("baseline.options.strategicPillars.productExcellence.label"),
				description: t(
					"baseline.options.strategicPillars.productExcellence.description",
				),
			},
			{
				value: "user-engagement",
				label: t("baseline.options.strategicPillars.userEngagement.label"),
				description: t(
					"baseline.options.strategicPillars.userEngagement.description",
				),
			},
			{
				value: "growth",
				label: t("baseline.options.strategicPillars.growth.label"),
				description: t(
					"baseline.options.strategicPillars.growth.description",
				),
			},
			{
				value: "operational",
				label: t("baseline.options.strategicPillars.operational.label"),
				description: t(
					"baseline.options.strategicPillars.operational.description",
				),
			},
			{
				value: "market-position",
				label: t("baseline.options.strategicPillars.marketPosition.label"),
				description: t(
					"baseline.options.strategicPillars.marketPosition.description",
				),
			},
		],
		[t, i18n.language],
	);

	const metricsOptions = useMemo<Option[]>(
		() => [
			{
				value: "acquisition",
				label: t("baseline.options.metrics.acquisition.label"),
				description: t("baseline.options.metrics.acquisition.description"),
			},
			{
				value: "activation",
				label: t("baseline.options.metrics.activation.label"),
				description: t("baseline.options.metrics.activation.description"),
			},
			{
				value: "engagement",
				label: t("baseline.options.metrics.engagement.label"),
				description: t("baseline.options.metrics.engagement.description"),
			},
			{
				value: "retention",
				label: t("baseline.options.metrics.retention.label"),
				description: t("baseline.options.metrics.retention.description"),
			},
			{
				value: "revenue",
				label: t("baseline.options.metrics.revenue.label"),
				description: t("baseline.options.metrics.revenue.description"),
			},
			{
				value: "satisfaction",
				label: t("baseline.options.metrics.satisfaction.label"),
				description: t("baseline.options.metrics.satisfaction.description"),
			},
			{
				value: "efficiency",
				label: t("baseline.options.metrics.efficiency.label"),
				description: t("baseline.options.metrics.efficiency.description"),
			},
			{
				value: "performance",
				label: t("baseline.options.metrics.performance.label"),
				description: t("baseline.options.metrics.performance.description"),
			},
		],
		[t, i18n.language],
	);

	useEffect(() => {
		const normalized = normalizeBaseline(product.baseline);
		setTargetMarket(normalized?.targetMarket ?? "");
		setProductCategory(normalized?.productCategory ?? "");
		setBusinessModel(normalized?.businessModel ?? "");
		setStage(normalized?.stage ?? "");
		setIndustry(normalized?.industry ?? "");
		setValueProposition(normalized?.valueProposition ?? "");
		setProblemSolved(normalized?.problemSolved ?? "");
		setProductVision(normalized?.productVision ?? "");
		setStrategicPillars(normalized?.strategicPillars ?? []);
		setMetricsOfInterest(normalized?.metricsOfInterest ?? []);
		setIcps(normalized?.icps ?? []);
		setIsEditing(false);
	}, [product]);

	const icpErrors = icps.map((icp) => !isIcpValid(icp));

	const targetMarketInvalid = targetMarket.trim().length === 0;
	const productCategoryInvalid = productCategory.trim().length === 0;
	const businessModelInvalid = businessModel.trim().length === 0;
	const stageInvalid = stage.trim().length === 0;
	const industryInvalid = industry.trim().length === 0;
	const valuePropositionInvalid = valueProposition.trim().length === 0;
	const problemSolvedInvalid = problemSolved.trim().length === 0;
	const productVisionInvalid = productVision.trim().length === 0;
	const strategicPillarsInvalid = strategicPillars.length === 0;
	const metricsInvalid = metricsOfInterest.length === 0;
	const icpsMissing = icps.length === 0;

	const basicsPendingCount = [
		targetMarketInvalid,
		productCategoryInvalid,
		businessModelInvalid,
		stageInvalid,
		industryInvalid,
	].filter(Boolean).length;

	const strategyPendingCount = [
		problemSolvedInvalid,
		valuePropositionInvalid,
		productVisionInvalid,
		strategicPillarsInvalid,
		metricsInvalid,
	].filter(Boolean).length;

	const icpsPendingCount =
		(icpsMissing ? 1 : 0) + icpErrors.filter(Boolean).length;

	const baselinePayload = useMemo(
		() =>
			buildBaselinePayload({
				targetMarket,
				productCategory,
				businessModel,
				stage,
				industry,
				valueProposition,
				problemSolved,
				productVision,
				strategicPillars,
				metricsOfInterest,
				icps,
			}),
		[
			targetMarket,
			productCategory,
			businessModel,
			stage,
			industry,
			valueProposition,
			problemSolved,
			productVision,
			strategicPillars,
			metricsOfInterest,
			icps,
		],
	);

	const hasChanges = useMemo(() => {
		const initialBaseline = buildBaselineFromProduct(product.baseline);
		return JSON.stringify(baselinePayload) !== JSON.stringify(initialBaseline);
	}, [baselinePayload, product]);

	const hasIcpErrors = icpErrors.some(Boolean);

	const isSaveDisabled =
		isSaving ||
		!isEditing ||
		!hasChanges ||
		targetMarketInvalid ||
		productCategoryInvalid ||
		businessModelInvalid ||
		stageInvalid ||
		industryInvalid ||
		valuePropositionInvalid ||
		problemSolvedInvalid ||
		productVisionInvalid ||
		strategicPillarsInvalid ||
		metricsInvalid ||
		icpsMissing ||
		hasIcpErrors;

	const handleSave = async () => {
		setError(null);
		if (isSaveDisabled) return;

		setIsSaving(true);

		try {
			await updateBaseline({
				productId: product._id,
				baseline: baselinePayload,
			});

			toast.success(t("baseline.saved"));
			setIsEditing(false);
			onSave?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.unknown"));
		} finally {
			setIsSaving(false);
		}
	};

	const handleIcpChange = <K extends keyof IcpProfile>(
		index: number,
		field: K,
		value: IcpProfile[K],
	) => {
		setIcps((prev) =>
			prev.map((icp, icpIndex) =>
				icpIndex === index ? { ...icp, [field]: value } : icp,
			),
		);
	};

	const handleAddIcp = () => {
		setIcps((prev) => [
			...prev,
			{
				id: ensureIcpId(),
				segment: "",
				pains: [],
				goals: [],
			},
		]);
	};

	const handleRemoveIcp = (index: number) => {
		setIcps((prev) => prev.filter((_, icpIndex) => icpIndex !== index));
	};

	return (
		<Card>
			<CardContent className="p-6 space-y-[var(--spacing-field-group)]">
				<Tabs defaultValue="basics" className="space-y-[var(--spacing-field-group)]">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="basics" className="gap-2">
							{t("baseline.tabs.basics")}
							{basicsPendingCount > 0 ? (
								<Badge variant="secondary" className="h-5 px-1.5">
									{basicsPendingCount}
								</Badge>
							) : null}
						</TabsTrigger>
						<TabsTrigger value="strategy" className="gap-2">
							{t("baseline.tabs.strategy")}
							{strategyPendingCount > 0 ? (
								<Badge variant="secondary" className="h-5 px-1.5">
									{strategyPendingCount}
								</Badge>
							) : null}
						</TabsTrigger>
						<TabsTrigger value="icps" className="gap-2">
							{t("baseline.tabs.icps")}
							{icpsPendingCount > 0 ? (
								<Badge variant="secondary" className="h-5 px-1.5">
									{icpsPendingCount}
								</Badge>
							) : null}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="basics" className="space-y-[var(--spacing-field-group)]">
						<SelectField
							id="baseline-target-market"
							question={t("baseline.questions.targetMarket", { productName })}
							description={t("baseline.descriptions.targetMarket")}
							required
							value={targetMarket}
							options={targetMarketOptions}
							onChange={setTargetMarket}
							disabled={isSaving || !isEditing}
							showError={isEditing && targetMarketInvalid}
							errorMessage={t("baseline.errors.targetMarketRequired")}
						/>

						<SelectField
							id="baseline-product-category"
							question={t("baseline.questions.productCategory", { productName })}
							description={t("baseline.descriptions.productCategory")}
							required
							value={productCategory}
							options={productCategoryOptions}
							onChange={setProductCategory}
							disabled={isSaving || !isEditing}
							showError={isEditing && productCategoryInvalid}
							errorMessage={t("baseline.errors.productCategoryRequired")}
						/>

						<SelectField
							id="baseline-business-model"
							question={t("baseline.questions.businessModel", { productName })}
							description={t("baseline.descriptions.businessModel")}
							required
							value={businessModel}
							options={businessModelOptions}
							onChange={setBusinessModel}
							disabled={isSaving || !isEditing}
							showError={isEditing && businessModelInvalid}
							errorMessage={t("baseline.errors.businessModelRequired")}
						/>

						<SelectField
							id="baseline-stage"
							question={t("baseline.questions.stage", { productName })}
							description={t("baseline.descriptions.stage")}
							required
							value={stage}
							options={stageOptions}
							onChange={setStage}
							disabled={isSaving || !isEditing}
							showError={isEditing && stageInvalid}
							errorMessage={t("baseline.errors.stageRequired")}
						/>

						<SelectField
							id="baseline-industry"
							question={t("baseline.questions.industry", { productName })}
							description={t("baseline.descriptions.industry")}
							required
							value={industry}
							options={industryOptions}
							onChange={setIndustry}
							disabled={isSaving || !isEditing}
							showError={isEditing && industryInvalid}
							errorMessage={t("baseline.errors.industryRequired")}
						/>
					</TabsContent>

					<TabsContent value="strategy" className="space-y-[var(--spacing-field-group)]">
						<div className="space-y-[var(--spacing-field-description)]">
							<FieldHeader
								id="baseline-problem-solved"
								question={t("baseline.questions.problemSolved", {
									productName,
								})}
								description={t("baseline.descriptions.problemSolved")}
								required
							/>
							<Textarea
								id="baseline-problem-solved"
								value={problemSolved}
								onChange={(event) => setProblemSolved(event.target.value)}
								disabled={isSaving || !isEditing}
								rows={3}
								placeholder={t("baseline.placeholders.problemSolved")}
							/>
							{isEditing && problemSolvedInvalid ? (
								<p className="text-fontSize-xs text-destructive">
									{t("baseline.errors.problemSolvedRequired")}
								</p>
							) : null}
						</div>

						<div className="space-y-[var(--spacing-field-description)]">
							<FieldHeader
								id="baseline-value-proposition"
								question={t("baseline.questions.valueProposition", {
									productName,
								})}
								description={t("baseline.descriptions.valueProposition")}
								required
							/>
							<Textarea
								id="baseline-value-proposition"
								value={valueProposition}
								onChange={(event) =>
									setValueProposition(event.target.value)
								}
								disabled={isSaving || !isEditing}
								rows={3}
								placeholder={t("baseline.placeholders.valueProposition")}
							/>
							{isEditing && valuePropositionInvalid ? (
								<p className="text-fontSize-xs text-destructive">
									{t("baseline.errors.valuePropositionRequired")}
								</p>
							) : null}
						</div>

						<div className="space-y-[var(--spacing-field-description)]">
							<FieldHeader
								id="baseline-product-vision"
								question={t("baseline.questions.productVision", { productName })}
								description={t("baseline.descriptions.productVision")}
								required
							/>
							<Textarea
								id="baseline-product-vision"
								value={productVision}
								onChange={(event) => setProductVision(event.target.value)}
								disabled={isSaving || !isEditing}
								rows={3}
								placeholder={t("baseline.placeholders.productVision")}
							/>
							{isEditing && productVisionInvalid ? (
								<p className="text-fontSize-xs text-destructive">
									{t("baseline.errors.productVisionRequired")}
								</p>
							) : null}
						</div>

						<div className="space-y-[var(--spacing-field-description)]">
							<FieldHeader
								question={t("baseline.questions.strategicPillars", {
									productName,
								})}
								description={t("baseline.descriptions.strategicPillars")}
								required
							/>
							<MultiSelectDropdown
								options={strategicPillarOptions}
								selected={strategicPillars}
								onChange={setStrategicPillars}
								disabled={isSaving || !isEditing}
								filterPlaceholder={t("baseline.actions.filter")}
								placeholder={t("baseline.placeholders.select")}
							/>
							{isEditing && strategicPillarsInvalid ? (
								<p className="text-fontSize-xs text-destructive">
									{t("baseline.errors.strategicPillarsRequired")}
								</p>
							) : null}
						</div>

						<div className="space-y-[var(--spacing-field-description)]">
							<FieldHeader
								question={t("baseline.questions.metricsOfInterest", {
									productName,
								})}
								description={t("baseline.descriptions.metricsOfInterest")}
								required
							/>
							<MultiSelectDropdown
								options={metricsOptions}
								selected={metricsOfInterest}
								onChange={setMetricsOfInterest}
								disabled={isSaving || !isEditing}
								filterPlaceholder={t("baseline.actions.filter")}
								placeholder={t("baseline.placeholders.select")}
							/>
							{isEditing && metricsInvalid ? (
								<p className="text-fontSize-xs text-destructive">
									{t("baseline.errors.metricsRequired")}
								</p>
							) : null}
						</div>
					</TabsContent>

					<TabsContent value="icps" className="space-y-[var(--spacing-field-group)]">
						{icps.length > 0 ? (
							<p className="text-fontSize-sm text-muted-foreground mb-[var(--spacing-field-description)]">
								{t("baseline.icpsIntro")}
							</p>
						) : null}

						{icps.length === 0 ? (
							<div className="space-y-[var(--spacing-field-description)]">
								<p className="text-fontSize-sm text-muted-foreground">
									{t("baseline.icpsIntro")}
								</p>
								<p className="text-fontSize-sm text-muted-foreground">
									{t("baseline.emptyIcps")}
								</p>
							</div>
						) : null}

						<div className="space-y-[var(--spacing-field-group)]">
							{icps.map((icp, index) => {
								const hasError = icpErrors[index];

								return (
									<div
										key={`icp-${icp.id}`}
										className="rounded-lg border p-4 space-y-[var(--spacing-field-group)]"
									>
										<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
											<div className="space-y-[var(--spacing-field-group)]">
												<p className="text-fontSize-sm font-medium">
													{icp.segment ||
														t("baseline.icp.untitled", { index: index + 1 })}
												</p>
												<div className="flex flex-wrap gap-2 text-fontSize-xs text-muted-foreground">
													<Badge variant="secondary">
														{t("baseline.icp.painsCount", {
															count: icp.pains.length,
														})}
													</Badge>
													<Badge variant="secondary">
														{t("baseline.icp.goalsCount", {
															count: icp.goals.length,
														})}
													</Badge>
												</div>
											</div>
											<div className="flex gap-2">
												<Button
													type="button"
													variant="ghost-destructive"
													size="sm"
													onClick={() => handleRemoveIcp(index)}
													disabled={isSaving || !isEditing}
												>
													{t("baseline.actions.remove")}
												</Button>
											</div>
										</div>

										<div className="space-y-[var(--spacing-field-group)]">
											<div className="space-y-[var(--spacing-field-description)]">
												<FieldHeader
													id={`icp-segment-${icp.id}`}
													question={t("baseline.icp.segment.question")}
													description={t("baseline.icp.segment.description")}
													required
												/>
												<Textarea
													id={`icp-segment-${icp.id}`}
													value={icp.segment}
													onChange={(event) =>
														handleIcpChange(index, "segment", event.target.value)
													}
													disabled={isSaving || !isEditing}
													rows={2}
													placeholder={t("baseline.placeholders.icpSegment")}
												/>
												{isEditing && hasError && icp.segment.trim().length === 0 ? (
													<p className="text-fontSize-xs text-destructive">
														{t("baseline.errors.icpSegmentRequired")}
													</p>
												) : null}
											</div>

											<div className="space-y-[var(--spacing-field-description)]">
												<FieldHeader
													question={t("baseline.icp.pains.question")}
													description={t("baseline.icp.pains.description")}
													required
												/>
												<TagInput
													values={icp.pains}
													onChange={(next) =>
														handleIcpChange(index, "pains", next)
													}
													disabled={isSaving || !isEditing}
													placeholder={t("baseline.placeholders.icpPains")}
												/>
												{isEditing && hasError && icp.pains.length === 0 ? (
													<p className="text-fontSize-xs text-destructive">
														{t("baseline.errors.icpPainsRequired")}
													</p>
												) : null}
											</div>

											<div className="space-y-[var(--spacing-field-description)]">
												<FieldHeader
													question={t("baseline.icp.goals.question")}
													description={t("baseline.icp.goals.description")}
													required
												/>
												<TagInput
													values={icp.goals}
													onChange={(next) =>
														handleIcpChange(index, "goals", next)
													}
													disabled={isSaving || !isEditing}
													placeholder={t("baseline.placeholders.icpGoals")}
												/>
												{isEditing && hasError && icp.goals.length === 0 ? (
													<p className="text-fontSize-xs text-destructive">
														{t("baseline.errors.icpGoalsRequired")}
													</p>
												) : null}
											</div>
										</div>

										{isEditing && hasError ? (
											<p className="text-fontSize-xs text-destructive">
												{t("baseline.errors.icpIncomplete")}
											</p>
										) : null}
									</div>
								);
							})}
						</div>

						{isEditing && icpsMissing ? (
							<p className="text-fontSize-xs text-destructive">
								{t("baseline.errors.icpRequired")}
							</p>
						) : null}

						<Button
							type="button"
							variant="outline"
							onClick={handleAddIcp}
							disabled={isSaving || !isEditing}
						>
							{t("baseline.actions.addIcp")}
						</Button>
					</TabsContent>
				</Tabs>

				{error ? (
					<p className="text-fontSize-sm text-destructive">{error}</p>
				) : null}

				<div className="flex justify-end">
					{isEditing ? (
						<Button type="button" onClick={handleSave} disabled={isSaveDisabled}>
							{isSaving ? t("baseline.saving") : t("baseline.save")}
						</Button>
					) : (
						<Button
							type="button"
							onClick={() => setIsEditing(true)}
							disabled={isSaving}
						>
							{t("baseline.actions.modifyBaseline")}
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

type SelectFieldProps = {
	id: string;
	question: string;
	description: string;
	value: string;
	options: Option[];
	onChange: (value: string) => void;
	disabled: boolean;
	required?: boolean;
	showError?: boolean;
	errorMessage?: string;
};

function SelectField({
	id,
	question,
	description,
	value,
	options,
	onChange,
	disabled,
	required,
	showError,
	errorMessage,
}: SelectFieldProps) {
	const { t } = useTranslation("products");
	return (
		<div className="space-y-[var(--spacing-field-description)]">
			<FieldHeader
				id={id}
				question={question}
				description={description}
				required={required}
			/>
			<Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
				<SelectTrigger id={id}>
					<SelectValue placeholder={t("baseline.placeholders.select")} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem
							key={option.value}
							value={option.value}
							description={option.description}
						>
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

type FieldHeaderProps = {
	id?: string;
	question: string;
	description: string;
	required?: boolean;
};

function FieldHeader({ id, question, description, required }: FieldHeaderProps) {
	return (
		<div className="space-y-1">
			<Label htmlFor={id} className="text-fontSize-sm font-medium">
				{question}
				{required ? <span className="ml-1 text-destructive">*</span> : null}
			</Label>
			<p className="text-fontSize-xs text-muted-foreground">{description}</p>
		</div>
	);
}

type TagInputProps = {
	values: string[];
	onChange: (next: string[]) => void;
	disabled?: boolean;
	placeholder?: string;
};

function TagInput({ values, onChange, disabled, placeholder }: TagInputProps) {
	const { t } = useTranslation("products");
	const [inputValue, setInputValue] = useState("");

	const addValue = () => {
		const trimmed = inputValue.trim();
		if (!trimmed) return;
		if (!values.includes(trimmed)) {
			onChange([...values, trimmed]);
		}
		setInputValue("");
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter" || event.key === ",") {
			event.preventDefault();
			addValue();
		}
	};

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap gap-2">
				{values.map((value) => (
					<Badge key={value} variant="secondary" className="gap-1">
						{value}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() => onChange(values.filter((item) => item !== value))}
							disabled={disabled}
							className="h-5 w-5"
						>
							x
						</Button>
					</Badge>
				))}
			</div>
			<div className="flex gap-2">
				<Input
					value={inputValue}
					onChange={(event) => setInputValue(event.target.value)}
					onKeyDown={handleKeyDown}
					disabled={disabled}
					placeholder={placeholder}
				/>
				<Button type="button" variant="outline" onClick={addValue} disabled={disabled}>
					{t("baseline.actions.addTag")}
				</Button>
			</div>
		</div>
	);
}
