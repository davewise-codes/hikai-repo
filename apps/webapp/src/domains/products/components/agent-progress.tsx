import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useConvex, useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
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
	steps: AgentRunStep[];
	errorMessage?: string;
	startedAt?: number;
	finishedAt?: number;
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
}: {
	productId: Id<"products">;
	runId: Id<"agentRuns">;
}) {
	const { t } = useTranslation("products");
	const convex = useConvex();
	const exportRunTrace = useAction(api.agents.agentRuns.exportRunTrace);
	const run = useQuery(api.agents.agentRuns.getRunById, { productId, runId }) as
		| AgentRun
		| null
		| undefined;
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
	const copyLabel =
		copyState === "copied"
			? t("context.agentProgressCopySuccess")
			: copyState === "error"
				? t("context.agentProgressCopyError")
				: t("context.agentProgressCopyTrace");

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
			</CardContent>
		</Card>
	);
}

function StatusBadge({ status }: { status: "running" | "success" | "error" }) {
	const variant = status === "error" ? "destructive" : "outline";
	return <Badge variant={variant}>{status}</Badge>;
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
