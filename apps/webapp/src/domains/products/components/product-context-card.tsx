import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { useConnections } from "@/domains/connectors/hooks";
import { Button, Card, CardContent, CardHeader, CardTitle, toast } from "@hikai/ui";
import { AgentProgress } from "./agent-progress";

type ProductContextCardProps = {
	product: {
		_id: Id<"products">;
		name: string;
		userRole?: "admin" | "member";
	};
	snapshot?: {
		_id: string;
		status?: "in_progress" | "completed" | "failed" | "partial";
		createdAt?: number;
		generatedBy?: "manual" | "contextAgent" | "scheduled";
		triggerReason?: "initial_setup" | "source_change" | "manual_refresh";
		completedPhases?: Array<"structure" | "glossary" | "domains" | "features">;
		errors?: Array<{ phase?: string; error?: string; timestamp?: number }>;
	};
	isDirty?: boolean;
	onRunStart?: (payload: { startedAt: number; runId?: Id<"agentRuns"> | null }) => void;
};

const CONTEXT_AGENT_USE_CASE = "context_agent";

export function ProductContextCard({
	product,
	snapshot,
	isDirty,
	onRunStart,
}: ProductContextCardProps) {
	const { t } = useTranslation("products");
	const generateContextSnapshot = useAction(
		api.agents.contextAgent.generateContextSnapshot,
	);
	const [agentRunId, setAgentRunId] = useState<Id<"agentRuns"> | null>(null);
	const [isAgentRunning, setIsAgentRunning] = useState(false);
	const [agentError, setAgentError] = useState<string | null>(null);
	const [triggerStartedAt, setTriggerStartedAt] = useState<number | null>(null);
	const { connections, isLoading } = useConnections(product._id);

	const agentRun = useQuery(
		api.agents.agentRuns.getRunById,
		agentRunId
			? {
					productId: product._id,
					runId: agentRunId,
				}
			: "skip",
	);
	const latestRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		{
			productId: product._id,
			useCase: CONTEXT_AGENT_USE_CASE,
		},
	);
	const activeRun = agentRunId
		? agentRun
		: latestRun && triggerStartedAt
			? latestRun.startedAt >= triggerStartedAt
				? latestRun
				: null
			: latestRun;

	const showAgentProgress = Boolean(activeRun);
	const hasSources = (connections?.length ?? 0) > 0;

	const handleRunAgent = async () => {
		const startedAt = Date.now();
		setIsAgentRunning(true);
		setAgentError(null);
		setAgentRunId(null);
		setTriggerStartedAt(startedAt);
		onRunStart?.({ startedAt, runId: null });
		try {
			const result = await generateContextSnapshot({
				productId: product._id,
				triggerReason: "manual_refresh",
				forceRefresh: true,
			});
			if (result?.runId) {
				const nextRunId = result.runId as Id<"agentRuns">;
				setAgentRunId(nextRunId);
				onRunStart?.({ startedAt, runId: nextRunId });
			} else {
				setAgentRunId(null);
			}
			toast.success(t("context.contextAgentGenerateSuccess"));
		} catch (err) {
			const message = err instanceof Error ? err.message : t("errors.unknown");
			setAgentError(message);
			toast.error(t("context.contextAgentGenerateError"));
		} finally {
			setIsAgentRunning(false);
		}
	};

	useEffect(() => {
		return () => {
			setAgentRunId(null);
		};
	}, []);

	return (
		<Card>
			<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<CardTitle className="text-fontSize-lg">
						{t("context.contextAgentTitle")}
					</CardTitle>
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.contextAgentSubtitle")}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						variant="outline"
						onClick={handleRunAgent}
						disabled={isAgentRunning}
					>
						{isAgentRunning ? (
							<div className="flex items-center gap-2">
								<span className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full inline-block animate-spin" />
								<span>{t("context.contextAgentGenerateRunning")}</span>
							</div>
						) : (
							t("context.contextAgentGenerate")
						)}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{agentError && (
					<p className="text-fontSize-sm text-destructive">{agentError}</p>
				)}
				{!hasSources && !isLoading && (
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.noSources")}
					</p>
				)}
				{showAgentProgress && activeRun ? (
					<AgentProgress
						productId={product._id}
						runId={activeRun._id}
						snapshot={snapshot}
						isDirty={isDirty}
					/>
				) : null}
			</CardContent>
		</Card>
	);
}
