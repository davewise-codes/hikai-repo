import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useConvex, useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { formatRelativeDate, formatShortDate } from "@/domains/shared/utils";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	AlertCircle,
	CheckCircle,
	Circle,
	RefreshCw,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	toast,
} from "@hikai/ui";
type AgentRunStep = {
	step: string;
	status: "info" | "success" | "warn" | "error";
	timestamp: number;
	metadata?: Record<string, unknown>;
};

type AgentRun = {
	_id: Id<"agentRuns">;
	status: "running" | "success" | "error";
	agentName?: string;
	useCase?: string;
	steps: AgentRunStep[];
	errorMessage?: string;
	startedAt?: number;
	finishedAt?: number;
};

type SnapshotContext = {
	_id: string;
	status?: "in_progress" | "completed" | "failed" | "partial";
	createdAt?: number;
	generatedBy?: "manual" | "contextAgent" | "scheduled";
	triggerReason?: "initial_setup" | "source_change" | "manual_refresh";
	completedPhases?: Array<"structure" | "glossary" | "domains" | "features">;
	errors?: Array<{ phase?: string; error?: string; timestamp?: number }>;
};

type PlanItem = {
	id: string;
	content: string;
	activeForm: string;
	status: "pending" | "in_progress" | "completed" | "blocked";
};

type PlanManager = {
	items: PlanItem[];
	currentItem?: PlanItem | null;
};

const INITIAL_POLL_MS = 1000;
const MAX_POLL_MS = 5000;
const POLL_FACTOR = 1.5;
const PLAN_COLLAPSE_THRESHOLD = 6;

type BudgetInfo = {
	turns: number;
	maxTurns: number;
	tokensIn: number;
	tokensOut: number;
	totalTokens: number;
	maxTotalTokens?: number;
	status?: string;
};

export function AgentProgress({
	productId,
	runId,
	snapshot,
	isDirty,
}: {
	productId: Id<"products">;
	runId: Id<"agentRuns">;
	snapshot?: SnapshotContext | null;
	isDirty?: boolean;
}) {
	const { t, i18n } = useTranslation("products");
	const locale = i18n.language ?? "en";
	const convex = useConvex();
	const exportRunTrace = useAction(api.agents.agentRuns.exportRunTrace);
	const run = useQuery(api.agents.agentRuns.getRunById, { productId, runId }) as
		| AgentRun
		| null
		| undefined;
	const childRuns = useQuery(
		api.agents.agentRuns.getChildRuns,
		runId
			? {
					productId,
					parentRunId: runId,
				}
			: "skip",
	) as AgentRun[] | null | undefined;
	const [polledRun, setPolledRun] = useState<AgentRun | null>(null);
	const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "error">(
		"idle",
	);
	const timeoutRef = useRef<number | null>(null);
	const copyTimeoutRef = useRef<number | null>(null);
	const pollDelayRef = useRef(INITIAL_POLL_MS);

	const activeRun = polledRun ?? run ?? null;
	const steps = activeRun?.steps ?? [];
	const plan = useMemo(() => extractPlan(steps), [steps]);
	const planDurations = useMemo(
		() => extractPlanDurations(steps, activeRun?.finishedAt),
		[steps, activeRun?.finishedAt],
	);
	const planItems = useMemo(() => {
		const items = plan?.items ?? [];
		if (
			activeRun?.status === "running" &&
			items.length > 0 &&
			items.every((item) => item.status === "completed")
		) {
			return [
				...items,
				{
					id: "finalizing",
					content: t("context.agentProgressFinalizing"),
					activeForm: t("context.agentProgressFinalizing"),
					status: "in_progress" as const,
				},
			];
		}
		return items;
	}, [plan?.items, activeRun?.status, t]);
	const showPlanToggle = planItems.length > PLAN_COLLAPSE_THRESHOLD;
	const budget = useMemo(() => extractBudget(steps), [steps]);
	const subRuns = childRuns ?? [];

	useEffect(() => {
		let isActive = true;

		const schedulePoll = (delay: number) => {
			if (timeoutRef.current) {
				window.clearTimeout(timeoutRef.current);
			}
			timeoutRef.current = window.setTimeout(async () => {
				const result = (await convex.query(api.agents.agentRuns.getRunById, {
					productId,
					runId,
				})) as AgentRun | null;
				if (!isActive) return;
				setPolledRun(result);
				if (result?.status === "running") {
					pollDelayRef.current = Math.min(
						MAX_POLL_MS,
						Math.round(pollDelayRef.current * POLL_FACTOR),
					);
					schedulePoll(pollDelayRef.current);
				} else {
					pollDelayRef.current = INITIAL_POLL_MS;
				}
			}, delay);
		};

		if (runId && activeRun?.status === "running") {
			pollDelayRef.current = INITIAL_POLL_MS;
			schedulePoll(pollDelayRef.current);
		}

		return () => {
			isActive = false;
			if (timeoutRef.current) {
				window.clearTimeout(timeoutRef.current);
			}
			if (copyTimeoutRef.current) {
				window.clearTimeout(copyTimeoutRef.current);
			}
		};
	}, [convex, productId, runId, activeRun?.status]);

	const latestError = useMemo(
		() => (activeRun ? findLatestErrorStep(activeRun.steps) : null),
		[activeRun],
	);

	if (!activeRun) {
		return null;
	}

	const statusLabel =
		activeRun.status === "success"
			? t("context.agentProgressCompleted")
			: activeRun.status === "error"
				? t("context.agentProgressFailed")
				: t("context.agentProgressRunning");
	const totalDurationMs = activeRun.startedAt
		? (activeRun.finishedAt ?? Date.now()) - activeRun.startedAt
		: null;
	const canCopy = activeRun.status !== "running";
	const errorMessage =
		activeRun.status === "error" && activeRun.errorMessage
			? activeRun.errorMessage
			: null;
	const copyLabel =
		copyState === "copied"
			? t("context.agentProgressCopySuccess")
			: copyState === "error"
				? t("context.agentProgressCopyError")
				: t("context.agentProgressCopyTrace");

	const snapshotCreatedLabel =
		snapshot?.createdAt !== undefined
			? `${formatShortDate(snapshot.createdAt, locale)} · ${formatRelativeDate(
					snapshot.createdAt,
					locale,
				)}`
			: t("context.agentProgressSnapshotUnknown");

	const handleCopy = async () => {
		if (!canCopy || copyState === "copying") return;
		setCopyState("copying");
		try {
			const trace = await exportRunTrace({ productId, runId });
			if (!trace) {
				setCopyState("error");
				return;
			}
			const payload = JSON.stringify(trace, null, 2);
			await navigator.clipboard.writeText(payload);
			setCopyState("copied");
			if (copyTimeoutRef.current) {
				window.clearTimeout(copyTimeoutRef.current);
			}
			copyTimeoutRef.current = window.setTimeout(() => {
				setCopyState("idle");
			}, 2000);
		} catch {
			setCopyState("error");
		}
	};

	const handleCopySnapshot = async () => {
		if (!snapshot) return;
		try {
			await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
			toast.success(t("context.agentProgressSnapshotCopySuccess"));
		} catch {
			toast.error(t("context.agentProgressSnapshotCopyError"));
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<CardTitle className="text-fontSize-base">
						{t("context.agentProgressTitle")}
					</CardTitle>
					<p className="text-fontSize-xs text-muted-foreground">
						{statusLabel}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<StatusBadge status={activeRun.status} />
					<Button
						variant="outline"
						size="sm"
						onClick={handleCopy}
						disabled={!canCopy || copyState === "copying"}
					>
						{copyLabel}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{snapshot ? (
					<div className="rounded-md border border-border px-3 py-2 text-fontSize-xs">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant={statusToVariant(snapshot.status)}>
								{snapshot.status ?? t("context.agentProgressSnapshotUnknown")}
							</Badge>
							{isDirty ? (
								<Badge variant="destructive">
									{t("context.agentProgressSnapshotDirty")}
								</Badge>
							) : null}
							<span className="text-muted-foreground">
								{t("context.agentProgressSnapshotCreated", {
									value: snapshotCreatedLabel,
								})}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={handleCopySnapshot}
							>
								{t("context.agentProgressSnapshotCopy")}
							</Button>
						</div>
						<div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
							<span>
								{t("context.agentProgressSnapshotGeneratedBy", {
									value: snapshot.generatedBy ?? "-",
								})}
							</span>
							<span>·</span>
							<span>
								{t("context.agentProgressSnapshotTrigger", {
									value: snapshot.triggerReason ?? "-",
								})}
							</span>
							<span>·</span>
							<span>
								{t("context.agentProgressSnapshotId", {
									value: snapshot._id,
								})}
							</span>
						</div>
						{snapshot.completedPhases?.length ? (
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<span className="text-muted-foreground">
									{t("context.agentProgressSnapshotPhases")}
								</span>
								{snapshot.completedPhases.map((phase) => (
									<Badge key={phase} variant="secondary">
										{phase}
									</Badge>
								))}
							</div>
						) : null}
						{snapshot.errors?.length ? (
							<div className="mt-3 space-y-1 text-destructive">
								<div className="font-medium">
									{t("context.agentProgressSnapshotErrors")}
								</div>
								{snapshot.errors.map((error, index) => (
									<div key={`${error.phase ?? "error"}-${index}`}>
										{error.phase ? `${error.phase}: ` : ""}
										{error.error}
									</div>
								))}
							</div>
						) : null}
					</div>
				) : null}
				{errorMessage ? (
					<div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-fontSize-xs text-destructive">
						{errorMessage}
					</div>
				) : null}
				{latestError ? (
					<div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-fontSize-xs text-destructive">
						<div className="font-medium">
							{t("context.agentProgressLatestErrorTitle")}
						</div>
						<div>
							{latestError.label}
							{latestError.detail ? ` — ${latestError.detail}` : ""}
						</div>
					</div>
				) : null}
				{budget ? (
					<div className="space-y-1 rounded-md border border-border px-3 py-2 text-fontSize-xs">
						<div className="font-medium text-muted-foreground">
							{t("context.agentProgressBudgetTitle")}
						</div>
						<div className="flex flex-wrap items-center gap-2 text-muted-foreground">
							<span>
								{t("context.agentProgressBudgetTurns", {
									turns: budget.turns,
									maxTurns: budget.maxTurns,
								})}
							</span>
							<span>·</span>
							<span>
								{t("context.agentProgressBudgetTokens", {
									total: budget.totalTokens,
									max: budget.maxTotalTokens ?? "-",
								})}
							</span>
						</div>
						{budget.status === "budget_exceeded" ? (
							<div className="flex items-center gap-2 text-warning">
								<AlertCircle className="h-3.5 w-3.5" />
								<span>{t("context.agentProgressBudgetExceeded")}</span>
							</div>
						) : null}
						{totalDurationMs !== null ? (
							<div className="text-muted-foreground">
								{t("context.agentProgressDurationTotal", {
									value: formatDuration(totalDurationMs),
								})}
							</div>
						) : null}
					</div>
				) : null}
				{planItems.length > 0 ? (
					<div className="space-y-2">
						<div className="text-fontSize-xs font-medium text-muted-foreground">
							{t("context.agentProgressPlanTitle")}
						</div>
						{showPlanToggle ? (
							<details className="rounded-md border border-border px-3 py-2">
								<summary className="cursor-pointer text-fontSize-xs font-medium text-muted-foreground">
									{t("context.agentProgressPlanToggle", {
										count: planItems.length,
									})}
								</summary>
								<div className="mt-3 space-y-2">
									{planItems.map((item) => (
										<PlanRow
											key={item.id}
											item={item}
											durationMs={planDurations[item.id]}
										/>
									))}
								</div>
							</details>
						) : (
							<div className="space-y-2">
								{planItems.map((item) => (
									<PlanRow
										key={item.id}
										item={item}
										durationMs={planDurations[item.id]}
									/>
								))}
							</div>
						)}
					</div>
				) : null}
				{subRuns.length > 0 ? (
					<div className="space-y-2">
						<div className="text-fontSize-xs font-medium text-muted-foreground">
							{t("context.agentProgressSubrunsTitle")}
						</div>
						<div className="space-y-2">
							{subRuns.map((subRun) => {
								const subRunSteps = subRun.steps ?? [];
								const subPlan = extractPlan(subRunSteps);
								const subPlanItems = subPlan?.items ?? [];
								const subPlanDurations = extractPlanDurations(
									subRunSteps,
									subRun.finishedAt,
								);
								return (
									<details
										key={subRun._id}
										className="rounded-md border border-border px-3 py-2"
									>
										<summary className="cursor-pointer text-fontSize-xs font-medium text-muted-foreground">
											<span className="mr-2 inline-flex items-center gap-2">
												<StatusBadge status={subRun.status} />
												<span>{subRun.agentName ?? subRun._id}</span>
											</span>
											<span className="text-muted-foreground/70">
												{t("context.agentProgressSubrunsToggle", {
													count: subRun.steps?.length ?? 0,
												})}
											</span>
										</summary>
										{subRun.errorMessage ? (
											<div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-fontSize-xs text-destructive">
												{subRun.errorMessage}
											</div>
										) : null}
										{subPlanItems.length > 0 ? (
											<div className="mt-3 space-y-2">
												{subPlanItems.map((item) => (
													<PlanRow
														key={`${subRun._id}-${item.id}`}
														item={item}
														durationMs={subPlanDurations[item.id]}
													/>
												))}
											</div>
										) : null}
										{subRun.steps?.length ? (
											<div className="mt-3 space-y-2">
												{subRun.steps.map((step, index) => (
													<StepRow key={`${subRun._id}-${index}`} step={step} />
												))}
											</div>
										) : (
											<div className="mt-3 text-fontSize-xs text-muted-foreground">
												{t("context.agentProgressNoSteps")}
											</div>
										)}
									</details>
								);
							})}
						</div>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

function StatusBadge({ status }: { status: "running" | "success" | "error" }) {
	const variant = status === "error" ? "destructive" : "outline";
	return <Badge variant={variant}>{status}</Badge>;
}

function StepRow({ step }: { step: AgentRunStep }) {
	const detail = extractStepDetail(step);
	const details = extractStepDetails(step);
	const rawJson = JSON.stringify(step, null, 2);
	const icon =
		step.status === "success" ? (
			<CheckCircle className="h-3.5 w-3.5 text-success" />
		) : step.status === "warn" ? (
			<AlertCircle className="h-3.5 w-3.5 text-warning" />
		) : step.status === "error" ? (
			<AlertCircle className="h-3.5 w-3.5 text-destructive" />
		) : (
			<Circle className="h-3.5 w-3.5 text-muted-foreground" />
		);

	if (details.length === 0) {
		return (
			<div className="flex items-center gap-2 text-fontSize-xs text-muted-foreground">
				{icon}
				<span>
					{step.step}
					{detail ? (
						<span className="text-muted-foreground/70"> — {detail}</span>
					) : null}
				</span>
				<StepJsonDialog json={rawJson} />
			</div>
		);
	}

	return (
		<details className="rounded-md border border-border px-2 py-1">
			<summary className="flex cursor-pointer items-center justify-between gap-2 text-fontSize-xs text-muted-foreground">
				<span className="flex items-center gap-2">
					{icon}
					<span>
						{step.step}
						{detail ? (
							<span className="text-muted-foreground/70"> — {detail}</span>
						) : null}
					</span>
				</span>
				<StepJsonDialog json={rawJson} />
			</summary>
			<div className="mt-2 space-y-1 text-fontSize-xs text-muted-foreground">
				{details.map((item, index) => (
					<div key={`${step.step}-${index}`}>
						<span className="font-medium text-muted-foreground">
							{item.label}:
						</span>{" "}
						<span>{item.value}</span>
					</div>
				))}
			</div>
		</details>
	);
}

function PlanRow({
	item,
	durationMs,
}: {
	item: PlanItem;
	durationMs?: number;
}) {
	const label =
		item.status === "in_progress" ? item.activeForm : item.content;

	return (
		<div className="flex items-center gap-2 text-fontSize-xs">
			{item.status === "completed" ? (
				<CheckCircle className="h-3.5 w-3.5 text-success" />
			) : item.status === "in_progress" ? (
				<RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
			) : item.status === "blocked" ? (
				<AlertCircle className="h-3.5 w-3.5 text-warning" />
			) : (
				<Circle className="h-3.5 w-3.5 text-muted-foreground" />
			)}
			<span className="text-muted-foreground">{label}</span>
			{durationMs !== undefined ? (
				<span className="text-muted-foreground/70">
					{formatDuration(durationMs)}
				</span>
			) : null}
		</div>
	);
}

function extractPlan(steps: AgentRunStep[]): PlanManager | null {
	for (let i = steps.length - 1; i >= 0; i -= 1) {
		const step = steps[i];
		if (step.step !== "plan_update") continue;
		const metadata = step.metadata as { plan?: PlanManager } | undefined;
		if (metadata?.plan?.items?.length) {
			return metadata.plan;
		}
	}
	return null;
}

function extractBudget(steps: AgentRunStep[]): BudgetInfo | null {
	for (let i = steps.length - 1; i >= 0; i -= 1) {
		const step = steps[i];
		if (step.step !== "Budget") continue;
		const metadata = step.metadata as BudgetInfo | undefined;
		if (
			typeof metadata?.turns !== "number" ||
			typeof metadata?.maxTurns !== "number"
		) {
			return null;
		}
		return metadata;
	}
	return null;
}

function extractPlanDurations(
	steps: AgentRunStep[],
	finishedAt?: number,
): Record<string, number> {
	const durations: Record<string, number> = {};
	const startedAtById: Record<string, number> = {};
	let lastPlan: PlanManager | null = null;

	for (const step of steps) {
		if (step.step !== "plan_update") continue;
		const metadata = step.metadata as { plan?: PlanManager } | undefined;
		const plan = metadata?.plan;
		if (!plan?.items?.length) continue;

		plan.items.forEach((item) => {
			const prev = lastPlan?.items?.find((prevItem) => prevItem.id === item.id);
			if (item.status === "in_progress" && !startedAtById[item.id]) {
				startedAtById[item.id] = step.timestamp;
			}
			if (prev?.status !== "completed" && item.status === "completed") {
				const start = startedAtById[item.id] ?? step.timestamp;
				durations[item.id] = Math.max(0, step.timestamp - start);
				delete startedAtById[item.id];
			}
		});

		lastPlan = plan;
	}

	const endTime = finishedAt ?? Date.now();
	Object.entries(startedAtById).forEach(([id, start]) => {
		durations[id] = Math.max(0, endTime - start);
	});

	return durations;
}

function formatDuration(durationMs: number): string {
	if (!Number.isFinite(durationMs)) return "-";
	const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes === 0) return `${seconds}s`;
	return `${minutes}m ${seconds}s`;
}

function statusToVariant(status?: string) {
	if (status === "failed") return "destructive";
	if (status === "partial") return "outline";
	if (status === "completed") return "secondary";
	return "outline";
}

function extractStepDetail(step: AgentRunStep): string | null {
	const metadata = step.metadata as
		| { error?: unknown; reason?: unknown; message?: unknown; stopReason?: unknown }
		| undefined;
	if (typeof metadata?.error === "string" && metadata.error.trim().length > 0) {
		return metadata.error;
	}
	if (
		typeof metadata?.stopReason === "string" &&
		metadata.stopReason.trim().length > 0
	) {
		return metadata.stopReason;
	}
	if (
		typeof metadata?.reason === "string" &&
		metadata.reason.trim().length > 0
	) {
		return metadata.reason;
	}
	if (
		typeof metadata?.message === "string" &&
		metadata.message.trim().length > 0
	) {
		return metadata.message;
	}
	return null;
}

function extractStepDetails(
	step: AgentRunStep,
): Array<{ label: string; value: string }> {
	const metadata = step.metadata as Record<string, unknown> | undefined;
	if (!metadata) return [];

	const details: Array<{ label: string; value: string }> = [];
	const preview =
		typeof metadata.modelOutputPreview === "string"
			? metadata.modelOutputPreview
			: null;
	if (preview) {
		details.push({
			label: "Preview",
			value: preview,
		});
	}

	const validation = metadata.validation as
		| { errors?: unknown; warnings?: unknown }
		| undefined;
	if (validation?.errors && Array.isArray(validation.errors)) {
		details.push({
			label: "Validation errors",
			value: validation.errors.length ? validation.errors.join(", ") : "-",
		});
	}
	if (validation?.warnings && Array.isArray(validation.warnings)) {
		details.push({
			label: "Validation warnings",
			value: validation.warnings.length ? validation.warnings.join(", ") : "-",
		});
	}

	const outputRef =
		(metadata as { outputRef?: { fileId?: string; sizeBytes?: number } })
			.outputRef ?? null;
	if (outputRef?.fileId) {
		details.push({
			label: "Output",
			value: outputRef.sizeBytes
				? `Stored (${outputRef.sizeBytes} bytes)`
				: "Stored",
		});
	}

	const toolCalls = metadata.toolCalls as Array<{ name?: string }> | undefined;
	if (toolCalls && toolCalls.length > 0) {
		const names = toolCalls
			.map((call) => call?.name)
			.filter(Boolean)
			.join(", ");
		if (names) {
			details.push({ label: "Tools", value: names });
		}
	}

	return details;
}

function StepJsonDialog({ json }: { json: string }) {
	const { t } = useTranslation("products");

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					{t("context.agentProgressStepJsonOpen")}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle className="text-fontSize-base">
						{t("context.agentProgressStepJsonTitle")}
					</DialogTitle>
					<DialogDescription>
						{t("context.agentProgressStepJsonDescription")}
					</DialogDescription>
				</DialogHeader>
				<pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted px-3 py-2 text-fontSize-xs text-muted-foreground">
					{json}
				</pre>
			</DialogContent>
		</Dialog>
	);
}

function findLatestErrorStep(steps: AgentRunStep[]): {
	label: string;
	detail?: string | null;
} | null {
	for (let i = steps.length - 1; i >= 0; i -= 1) {
		const step = steps[i];
		if (step.status !== "error") continue;
		return {
			label: step.step,
			detail: extractStepDetail(step),
		};
	}
	return null;
}
