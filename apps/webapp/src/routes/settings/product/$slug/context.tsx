import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Button,
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
	Card,
	CardContent,
	Select,
	SelectTrigger,
	SelectContent,
	SelectItem,
	SelectValue,
	Textarea,
} from "@hikai/ui";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug, useUpdateProduct, ProductContextCard } from "@/domains/products";

export const Route = createFileRoute("/settings/product/$slug/context")({
	component: ProductContextPage,
});

const personaOptions = ["Product manager", "Developer", "Marketing", "Support"];
const platformOptions = ["Web", "iOS", "Android", "Desktop"];
const integrationOptions = ["Slack", "GitHub Apps", "Zapier", "Notion"];
const stackOptions = ["Node", "Python", "PostgreSQL", "AWS", "React"];
const toneOptions = ["Professional", "Friendly", "Technical", "Concise"];

function ProductContextPage() {
	const { t } = useTranslation("products");
	const { slug } = Route.useParams();
	const { currentOrg } = useCurrentOrg();
	const product = useGetProductBySlug(currentOrg?._id, slug);
	const updateProduct = useUpdateProduct();

	const [languagePreference, setLanguagePreference] = useState("en");
	const [valueProposition, setValueProposition] = useState("");
	const [targetMarket, setTargetMarket] = useState("");
	const [productCategory, setProductCategory] = useState("");
	const [productType, setProductType] = useState("");
	const [businessModel, setBusinessModel] = useState("");
	const [stage, setStage] = useState("");
	const [personas, setPersonas] = useState<string[]>([]);
	const [platforms, setPlatforms] = useState<string[]>([]);
	const [integrationEcosystem, setIntegrationEcosystem] = useState<string[]>([]);
	const [technicalStack, setTechnicalStack] = useState<string[]>([]);
	const [toneGuidelines, setToneGuidelines] = useState<string[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saveSuccess, setSaveSuccess] = useState(false);

	useEffect(() => {
		if (product) {
			setLanguagePreference(product.languagePreference ?? "en");
			setValueProposition(product.productBaseline?.valueProposition ?? "");
			setTargetMarket(product.productBaseline?.targetMarket ?? "");
			setProductCategory(product.productBaseline?.productCategory ?? "");
			setProductType(product.productBaseline?.productType ?? "");
			setBusinessModel(product.productBaseline?.businessModel ?? "");
			setStage(product.productBaseline?.stage ?? "");
			setPersonas(product.productBaseline?.personas?.map((p) => p.name) ?? []);
			setPlatforms(product.productBaseline?.platforms ?? []);
			setIntegrationEcosystem(product.productBaseline?.integrationEcosystem ?? []);
			setTechnicalStack(product.productBaseline?.technicalStack ?? []);
			setToneGuidelines(product.productBaseline?.toneGuidelines?.map((p) => p.name) ?? []);
		}
	}, [product]);

	if (!product) {
		return (
			<SettingsLayout>
				<div className="text-center py-8 text-muted-foreground">
					{t("common.loading")}
				</div>
			</SettingsLayout>
		);
	}

	const initial = useMemo(
		() => ({
			languagePreference: product.languagePreference ?? "en",
			valueProposition: product.productBaseline?.valueProposition ?? "",
			targetMarket: product.productBaseline?.targetMarket ?? "",
			productCategory: product.productBaseline?.productCategory ?? "",
			productType: product.productBaseline?.productType ?? "",
			businessModel: product.productBaseline?.businessModel ?? "",
			stage: product.productBaseline?.stage ?? "",
			personas: product.productBaseline?.personas?.map((p) => p.name) ?? [],
			platforms: product.productBaseline?.platforms ?? [],
			integrationEcosystem: product.productBaseline?.integrationEcosystem ?? [],
			technicalStack: product.productBaseline?.technicalStack ?? [],
			toneGuidelines: product.productBaseline?.toneGuidelines?.map((p) => p.name) ?? [],
		}),
		[product],
	);

	const baselineChanged =
		languagePreference !== initial.languagePreference ||
		valueProposition !== initial.valueProposition ||
		targetMarket !== initial.targetMarket ||
		productCategory !== initial.productCategory ||
		productType !== initial.productType ||
		businessModel !== initial.businessModel ||
		stage !== initial.stage ||
		JSON.stringify(personas) !== JSON.stringify(initial.personas) ||
		JSON.stringify(platforms) !== JSON.stringify(initial.platforms) ||
		JSON.stringify(integrationEcosystem) !== JSON.stringify(initial.integrationEcosystem) ||
		JSON.stringify(technicalStack) !== JSON.stringify(initial.technicalStack) ||
		JSON.stringify(toneGuidelines) !== JSON.stringify(initial.toneGuidelines);

	const handleSave = async () => {
		setIsSaving(true);
		setSaveError(null);
		setSaveSuccess(false);

		try {
			await updateProduct({
				productId: product._id,
				languagePreference,
				productBaseline: {
					valueProposition: valueProposition.trim() || undefined,
					targetMarket: targetMarket || undefined,
					productCategory: productCategory.trim() || undefined,
					productType: productType.trim() || undefined,
					businessModel: businessModel.trim() || undefined,
					stage: stage || undefined,
					personas: personas.length ? personas.map((name) => ({ name })) : undefined,
					platforms,
					integrationEcosystem,
					technicalStack,
					toneGuidelines: toneGuidelines.length
						? toneGuidelines.map((name) => ({ name }))
						: undefined,
				},
			});
			setSaveSuccess(true);
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : t("errors.unknown"));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<SettingsLayout>
			<SettingsHeader
				title={t("context.baselineTitle")}
				subtitle={t("context.baselineDescription")}
			/>

			<div className="flex flex-col gap-6">
				<Card className="border-border bg-card/80">
					<CardContent className="p-6 space-y-6">
						<Tabs defaultValue="identity">
							<TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
								<TabsTrigger value="identity">{t("context.tabs.identity")}</TabsTrigger>
								<TabsTrigger value="market">{t("context.tabs.market")}</TabsTrigger>
								<TabsTrigger value="tech">{t("context.tabs.tech")}</TabsTrigger>
								<TabsTrigger value="tone">{t("context.tabs.tone")}</TabsTrigger>
							</TabsList>

							<TabsContent value="identity" className="pt-4 space-y-4">
								<FieldRow
									label={t("context.valueProposition")}
									description={t("context.valuePropositionHelp")}
									control={
										<Textarea
											value={valueProposition}
											onChange={(e) => setValueProposition(e.target.value)}
											disabled={isSaving}
											rows={3}
										/>
									}
								/>
								<FieldRow
									label={t("context.targetMarket")}
									description={t("context.targetMarketHelp")}
									control={
										<Select
											value={targetMarket || undefined}
											onValueChange={(val) => setTargetMarket(val)}
											disabled={isSaving}
										>
											<SelectTrigger>
												<SelectValue placeholder={t("common.unknown")} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="B2B">B2B</SelectItem>
												<SelectItem value="B2C">B2C</SelectItem>
												<SelectItem value="hybrid">Hybrid</SelectItem>
											</SelectContent>
										</Select>
									}
								/>
								<FieldRow
									label={t("context.languagePreference")}
									description={t("context.languagePreferenceHelp")}
									control={
										<Select
											value={languagePreference}
											onValueChange={(val) => setLanguagePreference(val)}
											disabled={isSaving}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="en">English</SelectItem>
												<SelectItem value="es">Español</SelectItem>
											</SelectContent>
										</Select>
									}
								/>
								<FieldRow
									label={t("context.personas")}
									description={t("context.personasHelp")}
									control={
										<ChipSelector
											options={personaOptions}
											selected={personas}
											onToggle={(item) =>
												setPersonas((prev) =>
													prev.includes(item)
														? prev.filter((p) => p !== item)
														: [...prev, item],
												)
											}
										/>
									}
								/>
							</TabsContent>

							<TabsContent value="market" className="pt-4 space-y-4">
								<FieldRow
									label={t("context.productCategory")}
									description={t("context.productCategoryHelp")}
									control={
										<Select
											value={productCategory || undefined}
											onValueChange={(val) => setProductCategory(val)}
											disabled={isSaving}
										>
											<SelectTrigger>
												<SelectValue placeholder={t("common.unknown")} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="crm">CRM</SelectItem>
												<SelectItem value="devtool">DevTool</SelectItem>
												<SelectItem value="platform">Platform</SelectItem>
												<SelectItem value="analytics">Analytics</SelectItem>
												<SelectItem value="other">Other</SelectItem>
											</SelectContent>
										</Select>
									}
								/>
								<FieldRow
									label={t("context.productType")}
									description={t("context.productTypeHelp")}
									control={
										<Select
											value={productType || undefined}
											onValueChange={(val) => setProductType(val)}
											disabled={isSaving}
										>
											<SelectTrigger>
												<SelectValue placeholder={t("common.unknown")} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="webapp">Web app</SelectItem>
												<SelectItem value="mobile">Mobile app</SelectItem>
												<SelectItem value="api">API</SelectItem>
												<SelectItem value="platform">Platform</SelectItem>
												<SelectItem value="other">Other</SelectItem>
											</SelectContent>
										</Select>
									}
								/>
								<FieldRow
									label={t("context.businessModel")}
									description={t("context.businessModelHelp")}
									control={
										<Select
											value={businessModel || undefined}
											onValueChange={(val) => setBusinessModel(val)}
											disabled={isSaving}
										>
											<SelectTrigger>
												<SelectValue placeholder={t("common.unknown")} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="saas">SaaS</SelectItem>
												<SelectItem value="marketplace">Marketplace</SelectItem>
												<SelectItem value="usage">Usage-based</SelectItem>
												<SelectItem value="onprem">On-prem</SelectItem>
												<SelectItem value="other">Other</SelectItem>
											</SelectContent>
										</Select>
									}
								/>
								<FieldRow
									label={t("context.stage")}
									description={t("context.stageHelp")}
									control={
										<Select
											value={stage || undefined}
											onValueChange={(val) => setStage(val)}
											disabled={isSaving}
										>
											<SelectTrigger>
												<SelectValue placeholder={t("common.unknown")} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="idea">Idea</SelectItem>
												<SelectItem value="mvp">MVP</SelectItem>
												<SelectItem value="beta">Beta</SelectItem>
												<SelectItem value="production">Production</SelectItem>
												<SelectItem value="scale-up">Scale-up</SelectItem>
											</SelectContent>
										</Select>
									}
								/>
							</TabsContent>

							<TabsContent value="tech" className="pt-4 space-y-4">
								<FieldRow
									label={t("context.platforms")}
									description={t("context.platformsHelp")}
									control={
										<ChipSelector
											options={platformOptions}
											selected={platforms}
											onToggle={(item) =>
												setPlatforms((prev) =>
													prev.includes(item)
														? prev.filter((p) => p !== item)
														: [...prev, item],
												)
											}
										/>
									}
								/>
								<FieldRow
									label={t("context.integrationEcosystem")}
									description={t("context.integrationEcosystemHelp")}
									control={
										<ChipSelector
											options={integrationOptions}
											selected={integrationEcosystem}
											onToggle={(item) =>
												setIntegrationEcosystem((prev) =>
													prev.includes(item)
														? prev.filter((p) => p !== item)
														: [...prev, item],
												)
											}
										/>
									}
								/>
								<FieldRow
									label={t("context.technicalStack")}
									description={t("context.technicalStackHelp")}
									control={
										<ChipSelector
											options={stackOptions}
											selected={technicalStack}
											onToggle={(item) =>
												setTechnicalStack((prev) =>
													prev.includes(item)
														? prev.filter((p) => p !== item)
														: [...prev, item],
												)
											}
										/>
									}
								/>
							</TabsContent>

							<TabsContent value="tone" className="pt-4 space-y-4">
								<FieldRow
									label={t("context.toneGuidelines")}
									description={t("context.toneGuidelinesHelp")}
									control={
										<ChipSelector
											options={toneOptions}
											selected={toneGuidelines}
											onToggle={(item) =>
												setToneGuidelines((prev) =>
													prev.includes(item)
														? prev.filter((p) => p !== item)
														: [...prev, item],
												)
											}
										/>
									}
								/>
							</TabsContent>
						</Tabs>

						<div className="flex justify-end gap-4">
							{saveError ? (
								<p className="text-fontSize-sm text-destructive">{saveError}</p>
							) : null}
							{saveSuccess ? (
								<p className="text-fontSize-sm text-success">{t("settings.saveSuccess")}</p>
							) : null}
							<Button onClick={handleSave} disabled={!baselineChanged || isSaving}>
								{isSaving ? t("common.loading") : t("settings.save")}
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card className="border-border bg-card/80">
					<CardContent className="p-6">
						<ProductContextCard product={product} />
					</CardContent>
				</Card>
			</div>
		</SettingsLayout>
	);
}

type ChipSelectorProps = {
	options: string[];
	selected: string[];
	onToggle: (value: string) => void;
};

function ChipSelector({ options, selected, onToggle }: ChipSelectorProps) {
	return (
		<div className="flex flex-wrap gap-2">
			{options.map((option) => {
				const isActive = selected.includes(option);
				return (
					<Button
						key={option}
						variant={isActive ? "default" : "secondary"}
						size="sm"
						className="h-8"
						onClick={() => onToggle(option)}
					>
						{option}
					</Button>
				);
			})}
		</div>
	);
}

type FieldRowProps = {
	label: string;
	description?: string;
	control: ReactNode;
};

function FieldRow({ label, description, control }: FieldRowProps) {
	return (
		<div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-6 md:justify-between">
			<div className="space-y-1 md:w-1/3">
				<p className="text-fontSize-sm font-medium">{label}</p>
				{description ? (
					<p className="text-fontSize-xs text-muted-foreground">{description}</p>
				) : null}
			</div>
			<div className="md:w-2/3">{control}</div>
		</div>
	);
}
