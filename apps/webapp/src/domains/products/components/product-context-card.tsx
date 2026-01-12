import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { useConnections } from "@/domains/connectors/hooks";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Clock,
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	toast,
} from "@hikai/ui";

type ProductContextCardProps = {
	product: {
		_id: Id<"products">;
		name: string;
		userRole?: "admin" | "member";
	};
};

type AgentRunStep = {
	step: string;
	status: "info" | "success" | "warn" | "error";
	timestamp: number;
	metadata?: Record<string, unknown>;
};

type AgentRun = {
	_id: Id<"agentRuns">;
	status: "running" | "success" | "error";
	steps: AgentRunStep[];
	errorMessage?: string;
	startedAt?: number;
	finishedAt?: number;
};

type SurfaceKey =
	| "management"
	| "design"
	| "product_front"
	| "platform"
	| "marketing"
	| "admin"
	| "docs";

type SurfaceSignalRun = {
	_id: Id<"surfaceSignalRuns">;
	createdAt: number;
	rawOutput?: string;
	steps?: AgentRunStep[];
	sources: Array<{
		sourceType: string;
		sourceId: string;
		sourceLabel: string;
		surfaces: Array<{
			surface: SurfaceKey;
			bucketId: string;
			evidence?: string[];
		}>;
	}>;
};

const SURFACE_KEYS: SurfaceKey[] = [
	"management",
	"design",
	"product_front",
	"platform",
	"marketing",
	"admin",
	"docs",
];

const USE_CASE = "surface_signal_mapping";
const AGENT_NAME = "Surface Signal Mapper Agent";

export function ProductContextCard({ product }: ProductContextCardProps) {
	const { t } = useTranslation("products");
	const regenerateSurfaceSignals = useAction(
		api.agents.actions.regenerateSurfaceSignals,
	);
	const createAgentRun = useMutation(api.agents.agentRuns.createAgentRun);
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [agentRunId, setAgentRunId] = useState<Id<"agentRuns"> | null>(null);
	const { connections, isLoading } = useConnections(product._id);

	const agentRun = useQuery(
		api.agents.agentRuns.getRunById,
		agentRunId
			? {
					productId: product._id,
					runId: agentRunId,
				}
			: "skip",
	) as AgentRun | null | undefined;
	const latestRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		{
			productId: product._id,
			useCase: USE_CASE,
		},
	) as AgentRun | null | undefined;
	const activeRun = agentRun ?? latestRun;

	const latestSurfaceRun = useQuery(
		api.agents.surfaceSignals.getLatestSurfaceSignalRun,
		{ productId: product._id },
	) as SurfaceSignalRun | null | undefined;
	const surfaceRunHistory =
		(useQuery(api.agents.surfaceSignals.listSurfaceSignalRuns, {
			productId: product._id,
			limit: 20,
		}) as SurfaceSignalRun[] | undefined) ?? [];

	const surfaceRows = useMemo(() => {
		const map = new Map<SurfaceKey, Array<{ sourceLabel: string; bucketId: string }>>();
		SURFACE_KEYS.forEach((surface) => map.set(surface, []));

		if (latestSurfaceRun?.sources) {
			for (const source of latestSurfaceRun.sources) {
				for (const surface of source.surfaces ?? []) {
					const entry = map.get(surface.surface) ?? [];
					entry.push({
						sourceLabel: source.sourceLabel,
						bucketId: surface.bucketId,
					});
					map.set(surface.surface, entry);
				}
			}
		}

		return SURFACE_KEYS.map((surface) => {
			const items = (map.get(surface) ?? []).sort((a, b) =>
				a.sourceLabel.localeCompare(b.sourceLabel),
			);
			return { surface, items };
		});
	}, [latestSurfaceRun]);

	const agentStep =
		activeRun?.steps?.length
			? activeRun.steps[activeRun.steps.length - 1]
			: null;
	const showProgress = isGenerating || activeRun?.status === "running";
	const hasSources = (connections?.length ?? 0) > 0;

	const handleGenerate = async () => {
		setIsGenerating(true);
		setError(null);
		try {
			let runId: Id<"agentRuns"> | undefined;
			try {
				const run = await createAgentRun({
					productId: product._id,
					useCase: USE_CASE,
					agentName: AGENT_NAME,
				});
				runId = run.runId;
				setAgentRunId(run.runId);
			} catch {
				setAgentRunId(null);
			}

			const result = await regenerateSurfaceSignals({
				productId: product._id,
				agentRunId: runId,
			});
			if (result?.runId) {
				setAgentRunId(result.runId as Id<"agentRuns">);
			}
			toast.success(t("context.surfaceSignalsUpdated"));
		} catch (err) {
			setError(err instanceof Error ? err.message : t("errors.unknown"));
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<CardTitle className="text-fontSize-lg">
						{t("context.title")}
					</CardTitle>
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.surfaceSignalsSubtitle")}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Sheet>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<SheetTrigger asChild>
										<Button variant="outline" size="icon">
											<Clock className="h-4 w-4" />
										</Button>
									</SheetTrigger>
								</TooltipTrigger>
								<TooltipContent side="bottom" sideOffset={8}>
									{t("context.surfaceSignalsHistoryTitle")}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<SheetContent side="right" className="w-[520px] max-w-full">
							<SheetHeader>
								<SheetTitle>
									{t("context.surfaceSignalsHistoryTitle")}
								</SheetTitle>
							</SheetHeader>
							<div className="mt-4 space-y-4">
								{surfaceRunHistory.length === 0 ? (
									<p className="text-fontSize-sm text-muted-foreground">
										{t("context.surfaceSignalsHistoryEmpty")}
									</p>
								) : (
									surfaceRunHistory.map((run) => (
										<div
											key={run._id}
											className="rounded-md border border-border p-3"
										>
											<div className="text-fontSize-sm font-medium">
												{new Date(run.createdAt).toLocaleString()}
											</div>
											<div className="text-fontSize-xs text-muted-foreground">
												{t("context.surfaceSignalsHistorySources", {
													count: run.sources.length,
												})}
											</div>
											{run.steps?.length ? (
												<div className="mt-3 space-y-2">
													<div className="text-fontSize-xs font-medium text-muted-foreground">
														{t("context.surfaceSignalsHistorySteps")}
													</div>
													<div className="space-y-1">
														{run.steps.map((step, index) => (
															<div
																key={`${run._id}-${index}`}
																className="flex items-center gap-2 text-fontSize-xs"
															>
																<span className="text-muted-foreground">
																	{new Date(step.timestamp).toLocaleTimeString()}
																</span>
																<span className="text-muted-foreground">
																	·
																</span>
																<span>{step.step}</span>
															</div>
														))}
													</div>
												</div>
											) : null}
											{run.rawOutput ? (
												<details className="mt-3 rounded-md border border-border px-3 py-2">
													<summary className="cursor-pointer text-fontSize-xs font-medium text-muted-foreground">
														{t("context.surfaceSignalsHistoryRaw")}
													</summary>
													<pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-fontSize-xs text-muted-foreground">
														{run.rawOutput}
													</pre>
												</details>
											) : null}
										</div>
									))
								)}
							</div>
						</SheetContent>
					</Sheet>
					<Button
						variant="default"
						onClick={handleGenerate}
						disabled={isGenerating}
					>
						{isGenerating ? (
							<div className="flex items-center gap-2">
								<span className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full inline-block animate-spin" />
								<span>{t("context.generating")}</span>
							</div>
						) : (
							t("context.regenerate")
						)}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && <p className="text-sm text-destructive">{error}</p>}
				{!hasSources && !isLoading && (
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.noSources")}
					</p>
				)}
				{showProgress && (
					<div className="flex items-center gap-2 text-fontSize-sm text-muted-foreground">
						<span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
						<span>
							{agentStep?.step
								? t("context.progressStep", { step: agentStep.step })
								: t("context.progressRunning")}
						</span>
					</div>
				)}
				<SurfaceSignalsTable rows={surfaceRows} />
			</CardContent>
		</Card>
	);
}

function SurfaceSignalsTable({
	rows,
}: {
	rows: Array<{
		surface: SurfaceKey;
		items: Array<{ sourceLabel: string; bucketId: string }>;
	}>;
}) {
	const { t } = useTranslation("products");
	return (
		<div className="rounded-md border border-border">
			<div className="grid grid-cols-[220px_1fr] border-b border-border text-fontSize-xs text-muted-foreground">
				<div className="px-4 py-2">{t("context.surfaceSignalsHeader")}</div>
				<div className="px-4 py-2">{t("context.surfaceSignalsSources")}</div>
			</div>
			<div className="divide-y divide-border">
				{rows.map((row) => (
					<div key={row.surface} className="grid grid-cols-[220px_1fr]">
						<div className="px-4 py-3 text-fontSize-sm font-medium">
							{t(`context.surfaceSignals.${row.surface}`)}
						</div>
						<div className="px-4 py-3">
							{row.items.length === 0 ? (
								<span className="text-fontSize-sm text-muted-foreground">
									{t("context.surfaceSignalsEmpty")}
								</span>
							) : (
								<div className="flex flex-wrap gap-2">
									{row.items.map((item, index) => (
										<Badge
											key={`${item.sourceLabel}-${item.bucketId}-${index}`}
											variant="outline"
										>
											{item.sourceLabel} · {item.bucketId}
										</Badge>
									))}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
