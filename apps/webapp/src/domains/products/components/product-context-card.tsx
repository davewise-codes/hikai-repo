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
	onRunStart?: (payload: { startedAt: number; runId?: Id<"agentRuns"> | null }) => void;
};

const DOMAIN_MAP_USE_CASE = "domain_map";

export function ProductContextCard({
	product,
	onRunStart,
}: ProductContextCardProps) {
	const { t } = useTranslation("products");
	const generateDomainMap = useAction(api.agents.domainMap.generateDomainMap);
	const [agentRunId, setAgentRunId] = useState<Id<"agentRuns"> | null>(null);
	const [isDomainMapRunning, setIsDomainMapRunning] = useState(false);
	const [domainMapError, setDomainMapError] = useState<string | null>(null);
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
			useCase: DOMAIN_MAP_USE_CASE,
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

	const handleGenerateDomainMap = async () => {
		const startedAt = Date.now();
		setIsDomainMapRunning(true);
		setDomainMapError(null);
		setAgentRunId(null);
		setTriggerStartedAt(startedAt);
		onRunStart?.({ startedAt, runId: null });
		try {
			const result = await generateDomainMap({ productId: product._id });
			if (result?.runId) {
				const nextRunId = result.runId as Id<"agentRuns">;
				setAgentRunId(nextRunId);
				onRunStart?.({ startedAt, runId: nextRunId });
			} else {
				setAgentRunId(null);
			}
			toast.success(t("context.domainMapGenerateSuccess"));
		} catch (err) {
			const message = err instanceof Error ? err.message : t("errors.unknown");
			setDomainMapError(message);
			toast.error(t("context.domainMapGenerateError"));
		} finally {
			setIsDomainMapRunning(false);
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
						{t("context.domainMapTitle")}
					</CardTitle>
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.domainMapSubtitle")}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						variant="outline"
						onClick={handleGenerateDomainMap}
						disabled={isDomainMapRunning}
					>
						{isDomainMapRunning ? (
							<div className="flex items-center gap-2">
								<span className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full inline-block animate-spin" />
								<span>{t("context.domainMapGenerateRunning")}</span>
							</div>
						) : (
							t("context.domainMapGenerate")
						)}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{domainMapError && (
					<p className="text-fontSize-sm text-destructive">
						{domainMapError}
					</p>
				)}
				{!hasSources && !isLoading && (
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.noSources")}
					</p>
				)}
				{showAgentProgress && activeRun ? (
					<AgentProgress productId={product._id} runId={activeRun._id} />
				) : null}
			</CardContent>
		</Card>
	);
}
