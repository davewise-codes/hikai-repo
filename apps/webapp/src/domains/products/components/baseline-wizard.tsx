import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Badge,
	Button,
	Input,
	Label,
	MultiSelectDropdown,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Textarea,
} from "@hikai/ui";

export type IcpProfile = {
	id: string;
	name?: string;
	segment: string;
	pains: string[];
	goals: string[];
};

export type BaselineWizardValues = {
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
};

type BaselineWizardStep = "basics" | "strategy" | "icps";

type BaselineWizardProps = {
	values: BaselineWizardValues;
	onValuesChange: (values: BaselineWizardValues) => void;
	isLoading: boolean;
	step: BaselineWizardStep;
	showErrors: boolean;
	productName: string;
};

type Option = {
	value: string;
	label: string;
	description?: string;
};

const ensureIcpId = (id?: string) => {
	if (id && id.trim().length > 0) return id;
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isIcpValid = (icp: IcpProfile) =>
	(icp.segment?.trim() ?? "").length > 0 &&
	(icp.pains ?? []).length > 0 &&
	(icp.goals ?? []).length > 0;

export function BaselineWizard({
	values,
	onValuesChange,
	isLoading,
	step,
	showErrors,
	productName,
}: BaselineWizardProps) {
	const { t, i18n } = useTranslation("products");
	const placeholderClassName = "placeholder:italic placeholder:text-muted-foreground/70";

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

	const updateValue = <K extends keyof BaselineWizardValues>(
		key: K,
		value: BaselineWizardValues[K],
	) => {
		onValuesChange({ ...values, [key]: value });
	};

	const handleIcpChange = <K extends keyof IcpProfile>(
		index: number,
		field: K,
		value: IcpProfile[K],
	) => {
		const nextIcps = values.icps.map((icp, icpIndex) =>
			icpIndex === index ? { ...icp, [field]: value } : icp,
		);
		updateValue("icps", nextIcps);
	};

	const handleAddIcp = () => {
		const nextIcps = [
			...values.icps,
			{ id: ensureIcpId(), segment: "", pains: [], goals: [] },
		];
		updateValue("icps", nextIcps);
	};

	const handleRemoveIcp = (index: number) => {
		updateValue(
			"icps",
			values.icps.filter((_, icpIndex) => icpIndex !== index),
		);
	};

	const targetMarketInvalid =
		showErrors && step === "basics" && values.targetMarket.trim().length === 0;
	const productCategoryInvalid =
		showErrors && step === "basics" && values.productCategory.trim().length === 0;
	const businessModelInvalid =
		showErrors && step === "basics" && values.businessModel.trim().length === 0;
	const stageInvalid =
		showErrors && step === "basics" && values.stage.trim().length === 0;
	const industryInvalid =
		showErrors && step === "basics" && values.industry.trim().length === 0;

	const valuePropositionInvalid =
		showErrors && step === "strategy" && values.valueProposition.trim().length === 0;
	const problemSolvedInvalid =
		showErrors && step === "strategy" && values.problemSolved.trim().length === 0;
	const productVisionInvalid =
		showErrors && step === "strategy" && values.productVision.trim().length === 0;
	const strategicPillarsInvalid =
		showErrors && step === "strategy" && values.strategicPillars.length === 0;
	const metricsInvalid =
		showErrors && step === "strategy" && values.metricsOfInterest.length === 0;

	const icpsMissing = showErrors && step === "icps" && values.icps.length === 0;
	const icpErrors =
		showErrors && step === "icps"
			? values.icps.map((icp) => !isIcpValid(icp))
			: values.icps.map(() => false);

	if (step === "basics") {
		return (
			<div className="space-y-[var(--spacing-field-group)]">
				<SelectField
					id="wizard-target-market"
					question={t("baseline.questions.targetMarket", { productName })}
					description={t("baseline.descriptions.targetMarket")}
					required
					value={values.targetMarket}
					options={targetMarketOptions}
					onChange={(value) => updateValue("targetMarket", value)}
					disabled={isLoading}
					showError={targetMarketInvalid}
					errorMessage={t("baseline.errors.targetMarketRequired")}
				/>

				<SelectField
					id="wizard-product-category"
					question={t("baseline.questions.productCategory", { productName })}
					description={t("baseline.descriptions.productCategory")}
					required
					value={values.productCategory}
					options={productCategoryOptions}
					onChange={(value) => updateValue("productCategory", value)}
					disabled={isLoading}
					showError={productCategoryInvalid}
					errorMessage={t("baseline.errors.productCategoryRequired")}
				/>

				<SelectField
					id="wizard-business-model"
					question={t("baseline.questions.businessModel", { productName })}
					description={t("baseline.descriptions.businessModel")}
					required
					value={values.businessModel}
					options={businessModelOptions}
					onChange={(value) => updateValue("businessModel", value)}
					disabled={isLoading}
					showError={businessModelInvalid}
					errorMessage={t("baseline.errors.businessModelRequired")}
				/>

				<SelectField
					id="wizard-stage"
					question={t("baseline.questions.stage", { productName })}
					description={t("baseline.descriptions.stage")}
					required
					value={values.stage}
					options={stageOptions}
					onChange={(value) => updateValue("stage", value)}
					disabled={isLoading}
					showError={stageInvalid}
					errorMessage={t("baseline.errors.stageRequired")}
				/>

				<SelectField
					id="wizard-industry"
					question={t("baseline.questions.industry", { productName })}
					description={t("baseline.descriptions.industry")}
					required
					value={values.industry}
					options={industryOptions}
					onChange={(value) => updateValue("industry", value)}
					disabled={isLoading}
					showError={industryInvalid}
					errorMessage={t("baseline.errors.industryRequired")}
				/>
			</div>
		);
	}

	if (step === "strategy") {
		return (
			<div className="space-y-[var(--spacing-field-group)]">
				<div className="space-y-[var(--spacing-field-description)]">
					<FieldHeader
						id="wizard-problem-solved"
						question={t("baseline.questions.problemSolved", { productName })}
						description={t("baseline.descriptions.problemSolved")}
						required
					/>
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

				<div className="space-y-[var(--spacing-field-description)]">
					<FieldHeader
						id="wizard-value-proposition"
						question={t("baseline.questions.valueProposition", { productName })}
						description={t("baseline.descriptions.valueProposition")}
						required
					/>
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

				<div className="space-y-[var(--spacing-field-description)]">
					<FieldHeader
						id="wizard-product-vision"
						question={t("baseline.questions.productVision", { productName })}
						description={t("baseline.descriptions.productVision")}
						required
					/>
					<Textarea
						id="wizard-product-vision"
						value={values.productVision}
						onChange={(event) => updateValue("productVision", event.target.value)}
						disabled={isLoading}
						rows={3}
						placeholder={t("baseline.placeholders.productVision")}
						className={placeholderClassName}
					/>
					{productVisionInvalid ? (
						<p className="text-fontSize-xs text-destructive">
							{t("baseline.errors.productVisionRequired")}
						</p>
					) : null}
				</div>

				<div className="space-y-[var(--spacing-field-description)]">
					<FieldHeader
						question={t("baseline.questions.strategicPillars", { productName })}
						description={t("baseline.descriptions.strategicPillars")}
						required
					/>
					<MultiSelectDropdown
						options={strategicPillarOptions}
						selected={values.strategicPillars}
						onChange={(next) => updateValue("strategicPillars", next)}
						disabled={isLoading}
						filterPlaceholder={t("baseline.actions.filter")}
						placeholder={t("baseline.placeholders.select")}
					/>
					{strategicPillarsInvalid ? (
						<p className="text-fontSize-xs text-destructive">
							{t("baseline.errors.strategicPillarsRequired")}
						</p>
					) : null}
				</div>
				<div className="space-y-[var(--spacing-field-description)]">
					<FieldHeader
						question={t("baseline.questions.metricsOfInterest", { productName })}
						description={t("baseline.descriptions.metricsOfInterest")}
						required
					/>
					<MultiSelectDropdown
						options={metricsOptions}
						selected={values.metricsOfInterest}
						onChange={(next) => updateValue("metricsOfInterest", next)}
						disabled={isLoading}
						filterPlaceholder={t("baseline.actions.filter")}
						placeholder={t("baseline.placeholders.select")}
					/>
					{metricsInvalid ? (
						<p className="text-fontSize-xs text-destructive">
							{t("baseline.errors.metricsRequired")}
						</p>
					) : null}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-[var(--spacing-field-group)]">
			{values.icps.length > 0 ? (
				<p className="text-fontSize-sm text-muted-foreground mb-[var(--spacing-field-description)]">
					{t("baseline.icpsIntro")}
				</p>
			) : null}
			{values.icps.length === 0 ? (
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
				{values.icps.map((icp, index) => {
					const hasError = icpErrors[index];

					return (
						<div
							key={`wizard-icp-${icp.id}`}
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
								<Button
									type="button"
									variant="ghost-destructive"
									size="sm"
									onClick={() => handleRemoveIcp(index)}
									disabled={isLoading}
								>
									{t("baseline.actions.remove")}
								</Button>
							</div>

							<div className="space-y-[var(--spacing-field-group)]">
								<div className="space-y-[var(--spacing-field-description)]">
									<FieldHeader
										id={`wizard-icp-segment-${icp.id}`}
										question={t("baseline.icp.segment.question")}
										description={t("baseline.icp.segment.description")}
										required
									/>
									<Textarea
										id={`wizard-icp-segment-${icp.id}`}
										value={icp.segment}
										onChange={(event) =>
											handleIcpChange(index, "segment", event.target.value)
										}
										disabled={isLoading}
										rows={2}
										placeholder={t("baseline.placeholders.icpSegment")}
									/>
									{hasError && icp.segment.trim().length === 0 ? (
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
										onChange={(next) => handleIcpChange(index, "pains", next)}
										disabled={isLoading}
										placeholder={t("baseline.placeholders.icpPains")}
									/>
									{hasError && icp.pains.length === 0 ? (
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
										onChange={(next) => handleIcpChange(index, "goals", next)}
										disabled={isLoading}
										placeholder={t("baseline.placeholders.icpGoals")}
									/>
									{hasError && icp.goals.length === 0 ? (
										<p className="text-fontSize-xs text-destructive">
											{t("baseline.errors.icpGoalsRequired")}
										</p>
									) : null}
								</div>
							</div>

							{hasError ? (
								<p className="text-fontSize-xs text-destructive">
									{t("baseline.errors.icpIncomplete")}
								</p>
							) : null}
						</div>
					);
				})}
			</div>

			{icpsMissing ? (
				<p className="text-fontSize-xs text-destructive">
					{t("baseline.errors.icpRequired")}
				</p>
			) : null}

			<Button type="button" variant="outline" onClick={handleAddIcp} disabled={isLoading}>
				{t("baseline.actions.addIcp")}
			</Button>
		</div>
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
