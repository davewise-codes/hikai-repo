import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConvex, useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	AlertCircle,
	CheckCircle,
	Circle,
	RefreshCw,
	X,
} from "@hikai/ui";
import { formatRelativeDate } from "@/domains/shared/utils/date-utils";

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
	const { t, i18n } = useTranslation("products");
	const convex = useConvex();
	const run = useQuery(api.agents.agentRuns.getRunById, { productId, runId }) as
		| AgentRun
		| null
		| undefined;
	const [polledRun, setPolledRun] = useState<AgentRun | null>(null);
	const timeoutRef = useRef<number | null>(null);
	const pollDelayRef = useRef(INITIAL_POLL_MS);

	const activeRun = polledRun ?? run ?? null;
	const steps = activeRun?.steps ?? [];
	const latestStep = steps.length ? steps[steps.length - 1] : null;
	const plan = useMemo(() => extractPlan(steps), [steps]);
	const planItems = plan?.items ?? [];
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
				<StatusBadge status={activeRun.status} />
			</CardHeader>
			<CardContent className="space-y-4">
				{latestStep && activeRun.status === "running" ? (
					<div className="flex items-center gap-2 text-fontSize-sm text-muted-foreground">
						<RefreshCw className="h-4 w-4 animate-spin" />
						<span>{latestStep.step}</span>
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
										<PlanRow key={item.id} item={item} />
									))}
								</div>
							</details>
						) : (
							<div className="space-y-2">
								{planItems.map((item) => (
									<PlanRow key={item.id} item={item} />
								))}
							</div>
						)}
					</div>
				) : null}
				<div className="space-y-2">
					<div className="text-fontSize-xs font-medium text-muted-foreground">
						{t("context.agentProgressStepsTitle")}
					</div>
					{steps.length === 0 ? (
						<p className="text-fontSize-xs text-muted-foreground">
							{t("context.agentProgressNoSteps")}
						</p>
					) : (
						<div className="space-y-2">
							{steps.map((step, index) => (
								<div
									key={`${step.step}-${index}`}
									className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-fontSize-xs"
								>
									<StepStatusIcon status={step.status} />
									<span>{step.step}</span>
									<span className="text-muted-foreground">
										{formatRelativeDate(step.timestamp, i18n.language)}
									</span>
									{getToolCount(step.metadata) > 0 ? (
										<Badge variant="outline">
											{t("context.agentProgressTools", {
												count: getToolCount(step.metadata),
											})}
										</Badge>
									) : null}
								</div>
							))}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function StatusBadge({ status }: { status: "running" | "success" | "error" }) {
	const variant = status === "error" ? "destructive" : "outline";
	return <Badge variant={variant}>{status}</Badge>;
}

function StepStatusIcon({
	status,
}: {
	status: "info" | "success" | "warn" | "error";
}) {
	if (status === "success") {
		return <CheckCircle className="h-4 w-4 text-success" />;
	}
	if (status === "warn") {
		return <AlertCircle className="h-4 w-4 text-warning" />;
	}
	if (status === "error") {
		return <X className="h-4 w-4 text-destructive" />;
	}
	return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function PlanRow({ item }: { item: PlanItem }) {
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

function getToolCount(metadata?: Record<string, unknown>): number {
	if (!metadata || typeof metadata !== "object") return 0;
	const toolCalls = (metadata as { toolCalls?: unknown }).toolCalls;
	return Array.isArray(toolCalls) ? toolCalls.length : 0;
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
