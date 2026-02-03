import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useQuery } from "convex/react";
import { api } from "@hikai/convex";
import type { Id } from "@hikai/convex/convex/_generated/dataModel";
import { useConnections } from "@/domains/connectors/hooks";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	RefreshCw,
	toast,
} from "@hikai/ui";

type SnapshotAgentRuns = {
	contextAgent?: string;
	structureScout?: string;
	glossaryScout?: string;
	domainMapper?: string;
	featureScout?: string;
	capabilityAggregator?: string;
};

type ContextSnapshot = {
	_id: string;
	status?: "in_progress" | "completed" | "failed" | "partial";
	createdAt?: number;
	generatedBy?: "manual" | "contextAgent" | "scheduled";
	triggerReason?: "initial_setup" | "source_change" | "manual_refresh";
	completedPhases?: Array<
		"structure" | "glossary" | "domains" | "features" | "capabilities"
	>;
	errors?: SnapshotError[];
	agentRuns?: SnapshotAgentRuns;
	contextDetail?: Record<string, unknown> | null;
	features?: Record<string, unknown> | null;
	capabilities?: Record<string, unknown> | null;
};

export function ContextSnapshotCard({
	productId,
	snapshot,
	isDirty,
}: {
	productId: Id<"products">;
	snapshot: ContextSnapshot | null | undefined;
	isDirty?: boolean;
}) {
	const { t, i18n } = useTranslation("products");
	const locale = i18n.language ?? "en";
	const generateContextSnapshot = useAction(
		api.agents.contextAgent.generateContextSnapshot,
	);
	const classifySourceContext = useAction(
		api.agents.actions.classifySourceContext,
	);
	const generateFeatureScout = useAction(
		api.agents.featureScoutAgent.generateFeatureScoutFromContext,
	);
	const generateCapabilities = useAction(
		api.agents.capabilityAggregator.generateCapabilitiesFromFeatures,
	);
	const { connections, isLoading: isConnectionsLoading } =
		useConnections(productId);
	const sourceContexts = useQuery(
		api.agents.sourceContext.listSourceContexts,
		{ productId },
	);
	const features = useQuery(
		api.products.features.listProductFeatures,
		snapshot ? { productId } : "skip",
	);
	const capabilities = useQuery(
		api.products.capabilities.listProductCapabilities,
		snapshot ? { productId } : "skip",
	);
	const latestContextRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		{ productId, useCase: "context_agent" },
	);
	const latestSourceContextRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		{ productId, useCase: "source_context_classification" },
	);
	const latestFeatureRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		{ productId, useCase: "feature_scout" },
	);
	const latestCapabilityRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		{ productId, useCase: "capability_aggregator" },
	);
	const [expandedAgents, setExpandedAgents] = useState<string[]>([]);
	const [isSourceContextRunning, setIsSourceContextRunning] = useState(false);
	const [isContextRunning, setIsContextRunning] = useState(false);
	const [isFeatureRunning, setIsFeatureRunning] = useState(false);
	const [isCapabilityRunning, setIsCapabilityRunning] = useState(false);
	const [agentError, setAgentError] = useState<string | null>(null);
	const contextDetail = snapshot?.contextDetail ?? null;
	const domains = Array.isArray((contextDetail as any)?.domains)
		? ((contextDetail as any).domains as Array<Record<string, unknown>>)
		: [];
	const latestSourceContext = useMemo(() => {
		if (!Array.isArray(sourceContexts) || sourceContexts.length === 0) {
			return null;
		}
		return [...sourceContexts].sort((a, b) => {
			const aTime = (a as any)?.updatedAt ?? (a as any)?.createdAt ?? 0;
			const bTime = (b as any)?.updatedAt ?? (b as any)?.createdAt ?? 0;
			return bTime - aTime;
		})[0];
	}, [sourceContexts]);
	const surfaceBuckets = useMemo(() => {
		const buckets = (latestSourceContext as any)?.surfaceMapping ?? null;
		return Array.isArray(buckets)
			? (buckets as Array<{
					surface: string;
					pathPrefix: string;
				}>)
			: [];
	}, [latestSourceContext]);
	const surfaceBucketsBySurface = useMemo(() => {
		const map = new Map<
			string,
			Array<{ pathPrefix: string }>
		>();
		surfaceBuckets.forEach((bucket) => {
			const list = map.get(bucket.surface) ?? [];
			list.push({
				pathPrefix: bucket.pathPrefix,
			});
			map.set(bucket.surface, list);
		});
		return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	}, [surfaceBuckets]);
	const taxonomyPayload = {
		domains,
		capabilities: capabilities ?? [],
		features: features ?? [],
	};
	const featureByDomain = useMemo(() => {
		type ProductFeature = {
			_id: string;
			name: string;
			domain?: string;
			description?: string;
			layer?: string;
			visibility?: string;
			status?: string;
			entryPoints?: string[];
			slug: string;
		};
		const map = new Map<string, ProductFeature[]>();
		const featureList = (features ?? []) as ProductFeature[];
		featureList.forEach((feature) => {
			const domain = feature.domain ?? "Unassigned";
			const list = map.get(domain) ?? [];
			list.push(feature);
			map.set(domain, list);
		});
		return map;
	}, [features]);
	const featureBySlug = useMemo(() => {
		type ProductFeature = {
			_id: string;
			slug: string;
			name: string;
			domain?: string;
			description?: string;
			layer?: string;
			visibility?: string;
			status?: string;
			entryPoints?: string[];
		};
		const map = new Map<string, ProductFeature>();
		(features ?? []).forEach((feature) => {
			map.set((feature as ProductFeature).slug, feature as ProductFeature);
		});
		return map;
	}, [features]);
	const capabilitiesByDomain = useMemo(() => {
		type ProductCapability = {
			_id: string;
			slug: string;
			name: string;
			description?: string;
			domain?: string;
			visibility?: string;
			featureSlugs: string[];
		};
		const map = new Map<string, ProductCapability[]>();
		(capabilities ?? []).forEach((capability) => {
			const domain = (capability as ProductCapability).domain ?? "Unassigned";
			const list = map.get(domain) ?? [];
			list.push(capability as ProductCapability);
			map.set(domain, list);
		});
		return map;
	}, [capabilities]);
	const hasSources =
		!isConnectionsLoading &&
		(connections ?? []).some((connection) => connection.status === "active");

	const runSourceContext = async () => {
		if (!hasSources) {
			toast.error(t("context.noSources"));
			return;
		}
		setIsSourceContextRunning(true);
		setAgentError(null);
		try {
			await classifySourceContext({ productId });
			toast.success(t("context.sourceContextSuccess"));
		} catch (err) {
			const message = err instanceof Error ? err.message : t("errors.unknown");
			setAgentError(message);
			toast.error(t("context.sourceContextError"));
		} finally {
			setIsSourceContextRunning(false);
		}
	};

	const runContextAgent = async () => {
		if (!hasSources) {
			toast.error(t("context.noSources"));
			return;
		}
		setIsContextRunning(true);
		setAgentError(null);
		try {
			await generateContextSnapshot({
				productId,
				triggerReason: "manual_refresh",
				forceRefresh: true,
			});
			toast.success(t("context.contextAgentGenerateSuccess"));
		} catch (err) {
			const message = err instanceof Error ? err.message : t("errors.unknown");
			setAgentError(message);
			toast.error(t("context.contextAgentGenerateError"));
		} finally {
			setIsContextRunning(false);
		}
	};

	const runFeatureScout = async () => {
		if (!hasSources) {
			toast.error(t("context.noSources"));
			return;
		}
		setIsFeatureRunning(true);
		setAgentError(null);
		try {
			await generateFeatureScout({
				productId,
				triggerReason: "manual_refresh",
			});
			toast.success(t("context.featureScoutGenerateSuccess"));
		} catch (err) {
			const message = err instanceof Error ? err.message : t("errors.unknown");
			setAgentError(message);
			toast.error(t("context.featureScoutGenerateError"));
		} finally {
			setIsFeatureRunning(false);
		}
	};

	const runCapabilities = async () => {
		if (!hasSources) {
			toast.error(t("context.noSources"));
			return;
		}
		setIsCapabilityRunning(true);
		setAgentError(null);
		try {
			await generateCapabilities({
				productId,
				triggerReason: "manual_refresh",
			});
			toast.success(t("context.capabilityAggregatorGenerateSuccess"));
		} catch (err) {
			const message = err instanceof Error ? err.message : t("errors.unknown");
			setAgentError(message);
			toast.error(t("context.capabilityAggregatorGenerateError"));
		} finally {
			setIsCapabilityRunning(false);
		}
	};

	const createdAt = snapshot?.createdAt;
	const createdLabel =
		createdAt !== undefined
			? formatDateTime(createdAt, locale)
			: t("context.contextSnapshotUnknown");

	const handleCopy = async (payload: Record<string, unknown>) => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
			toast.success(t("context.contextSnapshotCopySuccess"));
		} catch {
			toast.error(t("context.contextSnapshotCopyError"));
		}
	};

	const agentRows = [
		{
			id: "source_context_classification",
			label: t("context.runSourceContext"),
			run: latestSourceContextRun,
		},
		{
			id: "context_agent",
			label: t("context.contextSnapshotRunContextAgent"),
			run: latestContextRun,
		},
		{
			id: "feature_scout",
			label: t("context.contextSnapshotRunFeatures"),
			run: latestFeatureRun,
		},
		{
			id: "capability_aggregator",
			label: t("context.contextSnapshotRunCapabilities"),
			run: latestCapabilityRun,
		},
	];

	return (
		<Card>
			<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<CardTitle className="text-fontSize-lg">
						{t("context.taxonomyTitle")}
					</CardTitle>
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.taxonomySubtitle")}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{snapshot ? (
						<Badge variant={statusToVariant(snapshot.status)}>
							{snapshot.status ?? t("context.contextSnapshotUnknown")}
						</Badge>
					) : (
						<Badge variant="secondary">
							{t("context.contextSnapshotUnknown")}
						</Badge>
					)}
					{isDirty ? (
						<Badge variant="destructive">
							{t("context.contextSnapshotDirty")}
						</Badge>
					) : null}
					<div className="flex flex-wrap items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={runSourceContext}
							disabled={isSourceContextRunning || !hasSources}
						>
							{isSourceContextRunning ? (
								<RefreshCw className="h-3 w-3 animate-spin" />
							) : null}
							<span className="ml-2">{t("context.runSourceContext")}</span>
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={runContextAgent}
							disabled={isContextRunning || !hasSources}
						>
							{isContextRunning ? (
								<RefreshCw className="h-3 w-3 animate-spin" />
							) : null}
							<span className="ml-2">{t("context.runContextAgent")}</span>
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={runFeatureScout}
							disabled={isFeatureRunning || !hasSources}
						>
							{isFeatureRunning ? (
								<RefreshCw className="h-3 w-3 animate-spin" />
							) : null}
							<span className="ml-2">{t("context.runFeatureScout")}</span>
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={runCapabilities}
							disabled={isCapabilityRunning || !hasSources}
						>
							{isCapabilityRunning ? (
								<RefreshCw className="h-3 w-3 animate-spin" />
							) : null}
							<span className="ml-2">{t("context.runCapabilities")}</span>
						</Button>
					</div>
					{!hasSources && !isConnectionsLoading ? (
						<p className="text-fontSize-xs text-muted-foreground">
							{t("context.noSources")}
						</p>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{agentError ? (
					<p className="text-fontSize-sm text-destructive">{agentError}</p>
				) : null}
				<div className="text-fontSize-xs text-muted-foreground">
					{t("context.contextSnapshotCreated", { value: createdLabel })}
				</div>
				{!snapshot ? (
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.taxonomyEmpty")}
					</p>
				) : null}

				<div className="rounded-md border border-border px-3 py-2">
					<div className="text-fontSize-xs font-medium text-muted-foreground">
						{t("context.taxonomyAuditTitle")}
					</div>
					<div className="mt-3 space-y-2">
						{agentRows.map((row) => (
							<AgentAuditRow
								key={row.id}
								label={row.label}
								run={row.run ?? null}
								productId={productId}
								triggerReason={snapshot?.triggerReason}
								isExpanded={expandedAgents.includes(row.id)}
								onToggle={(next) =>
									setExpandedAgents((prev) =>
										next
											? [...prev, row.id]
											: prev.filter((item) => item !== row.id),
									)
								}
							/>
						))}
					</div>
				</div>

				<div className="rounded-md border border-border px-3 py-2">
					<div className="text-fontSize-xs font-medium text-muted-foreground">
						{t("context.surfacesTitle")}
					</div>
					<div className="mt-3 space-y-2">
						{surfaceBucketsBySurface.length === 0 ? (
							<p className="text-fontSize-xs text-muted-foreground">
								{t("context.surfacesEmpty")}
							</p>
						) : (
							surfaceBucketsBySurface.map(([surface, buckets]) => (
								<div key={surface} className="rounded-md border border-border px-3 py-2">
									<div className="text-fontSize-xs font-medium">{surface}</div>
									<div className="mt-2 space-y-1">
										{buckets.map((bucket) => (
											<div
												key={`${surface}-${bucket.pathPrefix}`}
												className="flex flex-wrap items-center justify-between gap-2 text-fontSize-xs text-muted-foreground"
											>
												<span className="truncate">
													{bucket.pathPrefix}/**
												</span>
											</div>
										))}
									</div>
								</div>
							))
						)}
					</div>
				</div>

				{snapshot ? (
					<div className="rounded-md border border-border px-3 py-2">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="text-fontSize-xs font-medium text-muted-foreground">
								{t("context.taxonomyTreeTitle", { count: domains.length })}
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									handleCopy(taxonomyPayload as Record<string, unknown>)
								}
							>
								{t("context.taxonomyCopy")}
							</Button>
						</div>
						<div className="mt-3">
							{domains.length === 0 ? (
								<p className="text-fontSize-xs text-muted-foreground">
									{t("context.taxonomyEmpty")}
								</p>
							) : (
								<Accordion type="multiple" className="space-y-2">
									{domains.map((domain, index) => {
										const name =
											typeof domain.name === "string" ? domain.name : "-";
										const purpose =
											typeof domain.purpose === "string"
												? domain.purpose
												: null;
										const domainFeatures =
											featureByDomain.get(name) ?? [];
										const domainCapabilities =
											capabilitiesByDomain.get(name) ?? [];
										return (
											<AccordionItem
												key={`${name}-${index}`}
												value={`${name}-${index}`}
												className="rounded-md border border-border px-3"
											>
												<AccordionTrigger className="text-fontSize-xs">
													<div className="flex w-full items-center justify-between gap-3">
														<span>{name}</span>
														<span className="text-muted-foreground">
															{t("context.taxonomyDomainSummary", {
																count: domainFeatures.length,
															})}
														</span>
													</div>
												</AccordionTrigger>
												<AccordionContent className="pb-4 pt-2">
													{purpose ? (
														<p className="text-fontSize-xs text-muted-foreground">
															{purpose}
														</p>
													) : null}
													<div className="mt-4 space-y-3">
														{domainCapabilities.length > 0 ? (
															<Accordion type="multiple" className="space-y-2">
																{domainCapabilities.map((capability) => {
																const featureItems = (capability.featureSlugs ?? [])
																	.map((slug) => featureBySlug.get(slug))
																	.filter(Boolean);
																return (
																	<AccordionItem
																		key={capability._id}
																		value={capability._id}
																		className="rounded-md border border-border px-3"
																	>
																		<AccordionTrigger className="text-fontSize-xs">
																			<div className="flex w-full items-center justify-between gap-3">
																				<span>{capability.name}</span>
																				<Badge variant="outline">
																					{capability.visibility ?? "public"}
																				</Badge>
																			</div>
																		</AccordionTrigger>
																		<AccordionContent className="pb-4 pt-2">
																			{capability.description ? (
																				<p className="text-fontSize-xs text-muted-foreground">
																					{capability.description}
																				</p>
																			) : null}
																			<div className="mt-3 space-y-3">
																				{featureItems.length === 0 ? (
																					<p className="text-fontSize-xs text-muted-foreground">
																						{t("context.taxonomyDomainNoFeatures")}
																					</p>
																				) : (
																					featureItems.map((feature) => (
																						<div
																							key={feature._id}
																							className="rounded-md border border-border px-3 py-2"
																						>
																							<div className="text-fontSize-xs font-medium">
																								{feature.name}
																							</div>
																							<div className="mt-2 flex flex-wrap items-center gap-2">
																								<Badge variant="secondary">
																									{feature.layer ?? "ui"}
																								</Badge>
																								<Badge variant="outline">
																									{feature.visibility}
																								</Badge>
																								<Badge variant="outline">
																									{feature.status ?? "active"}
																								</Badge>
																							</div>
																							{feature.description ? (
																								<p className="mt-2 text-fontSize-xs text-muted-foreground">
																									{feature.description}
																								</p>
																							) : null}
																							{feature.entryPoints?.length ? (
																								<details className="mt-2 text-fontSize-2xs text-muted-foreground">
																									<summary className="cursor-pointer">
																										{t("context.taxonomyEntryPoints")}
																									</summary>
																									<div className="mt-2 space-y-1">
																										{feature.entryPoints.map((entry) => (
																											<div key={entry} className="truncate">
																												{entry}
																											</div>
																										))}
																									</div>
																								</details>
																							) : null}
																						</div>
																					))
																				)}
																			</div>
																		</AccordionContent>
																	</AccordionItem>
																);
															})}
															</Accordion>
														) : domainFeatures.length === 0 ? (
															<p className="text-fontSize-xs text-muted-foreground">
																{t("context.taxonomyDomainNoFeatures")}
															</p>
														) : (
															domainFeatures.map((feature) => (
																<div
																	key={feature._id}
																	className="rounded-md border border-border px-3 py-2"
																>
																	<div className="text-fontSize-xs font-medium">
																		{feature.name}
																	</div>
																	<div className="mt-2 flex flex-wrap items-center gap-2">
																		<Badge variant="secondary">
																			{feature.layer ?? "ui"}
																		</Badge>
																		<Badge variant="outline">
																			{feature.visibility}
																		</Badge>
																		<Badge variant="outline">
																			{feature.status ?? "active"}
																		</Badge>
																	</div>
																	{feature.description ? (
																		<p className="mt-2 text-fontSize-xs text-muted-foreground">
																			{feature.description}
																		</p>
																	) : null}
																	{feature.entryPoints?.length ? (
																		<details className="mt-2 text-fontSize-2xs text-muted-foreground">
																			<summary className="cursor-pointer">
																				{t("context.taxonomyEntryPoints")}
																			</summary>
																			<div className="mt-2 space-y-1">
																				{feature.entryPoints.map((entry) => (
																					<div key={entry} className="truncate">
																						{entry}
																					</div>
																				))}
																			</div>
																		</details>
																	) : null}
																</div>
															))
														)}
													</div>
												</AccordionContent>
											</AccordionItem>
										);
									})}
								</Accordion>
							)}
						</div>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

function statusToVariant(status?: string) {
	if (status === "failed") return "destructive";
	if (status === "partial") return "outline";
	if (status === "completed") return "secondary";
	return "outline";
}

function formatDateTime(timestamp: number, locale: string) {
	return new Intl.DateTimeFormat(locale, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(timestamp));
}

function formatDurationMs(durationMs: number) {
	const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type AgentRun = {
	_id: Id<"agentRuns">;
	status: "running" | "success" | "error";
	agentName?: string;
	useCase?: string;
	steps: Array<{
		step: string;
		status: "info" | "success" | "warn" | "error";
		timestamp: number;
		metadata?: Record<string, unknown>;
	}>;
	errorMessage?: string;
	startedAt?: number;
	finishedAt?: number;
};

function AgentAuditRow({
	label,
	run,
	productId,
	triggerReason,
	isExpanded,
	onToggle,
}: {
	label: string;
	run: AgentRun | null;
	productId: Id<"products">;
	triggerReason?: string;
	isExpanded: boolean;
	onToggle: (expanded: boolean) => void;
}) {
	const { t, i18n } = useTranslation("products");
	const locale = i18n.language ?? "en";
	const exportRunTrace = useAction(api.agents.agentRuns.exportRunTrace);
	const childRuns = useQuery(
		api.agents.agentRuns.getChildRuns,
		run?._id
			? {
					productId,
					parentRunId: run._id,
				}
			: "skip",
	);

	const statusLabel =
		run?.status === "success"
			? t("context.contextSnapshotRunSuccess")
			: run?.status === "error"
				? t("context.contextSnapshotRunFailed")
				: run?.status === "running"
					? t("context.contextSnapshotRunRunning")
					: t("context.contextSnapshotRunUnknown");

	const statusVariant =
		run?.status === "success"
			? "secondary"
			: run?.status === "error"
				? "destructive"
				: "outline";

	const lastTimestamp = run?.finishedAt ?? run?.startedAt;
	const timestampLabel = lastTimestamp
		? formatDateTime(lastTimestamp, locale)
		: t("context.contextSnapshotUnknown");

	const currentAction = run?.status === "running"
		? deriveCurrentAction(run.steps, t)
		: null;

	return (
		<div className="rounded-md border border-border px-3 py-2">
			<button
				type="button"
				className="flex w-full items-center justify-between gap-3 text-left"
				onClick={() => onToggle(!isExpanded)}
			>
				<div>
					<div className="text-fontSize-xs font-medium">{label}</div>
					<div className="text-fontSize-xs text-muted-foreground">
						{run?.status === "running"
							? currentAction ?? t("context.contextSnapshotRunWorking")
							: t("context.contextSnapshotRunLine", {
									status: statusLabel,
									date: timestampLabel,
								})}
					</div>
					{run?.status === "error" && run.errorMessage ? (
						<div className="mt-1 text-fontSize-xs text-destructive">
							{run.errorMessage}
						</div>
					) : null}
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={statusVariant}>{statusLabel}</Badge>
					{run?._id ? (
						<Button
							variant="outline"
							size="sm"
							onClick={async (event) => {
								event.stopPropagation();
								const parentTrace = await exportRunTrace({
									productId,
									runId: run._id,
								});
								if (!parentTrace) {
									toast.error(t("context.contextSnapshotCopyError"));
									return;
								}
								const childTraces = await Promise.all(
									(parentTrace.childRuns ?? []).map(async (child) => {
										const trace = await exportRunTrace({
											productId,
											runId: child.runId as Id<"agentRuns">,
										});
										return trace ?? { runId: child.runId };
									}),
								);
								await navigator.clipboard.writeText(
									JSON.stringify(
										{ parent: parentTrace, children: childTraces },
										null,
										2,
									),
								);
								toast.success(t("context.contextSnapshotCopySuccess"));
							}}
						>
							{t("context.contextSnapshotRunCopySteps")}
						</Button>
					) : null}
				</div>
			</button>
			{isExpanded && run ? (
				<div className="mt-3 space-y-2 text-fontSize-xs text-muted-foreground">
					<div className="flex flex-wrap gap-3">
						<div>
							{t("context.contextSnapshotRunDuration", {
								value: formatDurationMs(
									(run.finishedAt ?? Date.now()) -
										(run.startedAt ?? Date.now()),
								),
							})}
						</div>
						{triggerReason ? (
							<div>
								{t("context.contextSnapshotTriggerLabel", {
									value: triggerReason,
								})}
							</div>
						) : null}
					</div>
					{run.steps?.length ? (
						<div>{t("context.contextSnapshotRunSteps", { count: run.steps.length })}</div>
					) : null}
					{childRuns?.length ? (
						<div className="space-y-2">
							<div className="text-fontSize-xs font-medium text-muted-foreground">
								{t("context.contextSnapshotRunSubagents")}
							</div>
							{childRuns.map((child) => (
								<ChildRunRow
									key={child._id}
									productId={productId}
									runId={child._id}
								/>
							))}
						</div>
					) : null}
				</div>
			) : null}
		</div>
	);
}

function ChildRunRow({
	productId,
	runId,
}: {
	productId: Id<"products">;
	runId: Id<"agentRuns">;
}) {
	const { t } = useTranslation("products");
	const run = useQuery(api.agents.agentRuns.getRunById, {
		productId,
		runId,
	});
	if (!run) return null;

	const statusLabel =
		run.status === "success"
			? t("context.contextSnapshotRunSuccess")
			: run.status === "error"
				? t("context.contextSnapshotRunFailed")
				: t("context.contextSnapshotRunRunning");

	return (
		<details className="rounded-md border border-border px-3 py-2">
			<summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-fontSize-xs font-medium">
				<span>{run.agentName ?? t("context.contextSnapshotRunUnknown")}</span>
				<Badge variant={run.status === "error" ? "destructive" : "outline"}>
					{statusLabel}
				</Badge>
			</summary>
			<div className="mt-2 space-y-1 text-fontSize-xs text-muted-foreground">
				<div>
					{t("context.contextSnapshotRunDuration", {
						value: formatDurationMs(
							(run.finishedAt ?? Date.now()) -
								(run.startedAt ?? Date.now()),
						),
					})}
				</div>
				{run.steps?.length ? (
					<div>{t("context.contextSnapshotRunSteps", { count: run.steps.length })}</div>
				) : null}
			</div>
		</details>
	);
}

function deriveCurrentAction(
	steps: AgentRun["steps"],
	t: (key: string) => string,
): string | null {
	for (let i = steps.length - 1; i >= 0; i -= 1) {
		const step = steps[i];
		if (step.step.startsWith("Tool: ")) {
			const toolName = step.step.replace("Tool: ", "").trim();
			switch (toolName) {
				case "list_dirs":
					return t("context.agentProgressActionListDirs");
				case "list_files":
					return t("context.agentProgressActionListFiles");
				case "read_file":
					return t("context.agentProgressActionReadFile");
				case "search_code":
					return t("context.agentProgressActionSearchCode");
				default:
					return t("context.agentProgressActionUsingTool");
			}
		}
		if (step.step.startsWith("Repo context attempt")) {
			return t("context.agentProgressActionAttempting");
		}
		if (step.step === "Repo context validation failed") {
			return t("context.agentProgressActionFixingValidation");
		}
		if (step.step === "Compaction") {
			return t("context.agentProgressActionCompacting");
		}
		if (step.step.startsWith("Model output")) {
			return t("context.agentProgressActionThinking");
		}
	}
	return null;
}
