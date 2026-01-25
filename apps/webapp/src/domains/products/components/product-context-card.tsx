import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { useConnections } from "@/domains/connectors/hooks";
import {
	Button,
	ButtonGroup,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownIcon,
	CheckmarkIcon,
	toast,
} from "@hikai/ui";
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
const STRUCTURE_SCOUT_USE_CASE = "structure_scout";

type AgentSelection = "domain_map" | "structure_scout";

export function ProductContextCard({
	product,
	onRunStart,
}: ProductContextCardProps) {
	const { t } = useTranslation("products");
	const generateDomainMap = useAction(api.agents.domainMap.generateDomainMap);
	const generateStructureScout = useAction(
		api.agents.structureScout.generateStructureScout,
	);
	const [agentRunId, setAgentRunId] = useState<Id<"agentRuns"> | null>(null);
	const [isAgentRunning, setIsAgentRunning] = useState(false);
	const [agentError, setAgentError] = useState<string | null>(null);
	const [triggerStartedAt, setTriggerStartedAt] = useState<number | null>(null);
	const [selectedAgent, setSelectedAgent] =
		useState<AgentSelection>("domain_map");
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
			useCase:
				selectedAgent === "domain_map"
					? DOMAIN_MAP_USE_CASE
					: STRUCTURE_SCOUT_USE_CASE,
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
		if (selectedAgent === "domain_map") {
			onRunStart?.({ startedAt, runId: null });
		}
		try {
			const result =
				selectedAgent === "domain_map"
					? await generateDomainMap({ productId: product._id })
					: await generateStructureScout({ productId: product._id });
			if (result?.runId) {
				const nextRunId = result.runId as Id<"agentRuns">;
				setAgentRunId(nextRunId);
				if (selectedAgent === "domain_map") {
					onRunStart?.({ startedAt, runId: nextRunId });
				}
			} else {
				setAgentRunId(null);
			}
			toast.success(
				selectedAgent === "domain_map"
					? t("context.domainMapGenerateSuccess")
					: t("context.structureScoutGenerateSuccess"),
			);
		} catch (err) {
			const message = err instanceof Error ? err.message : t("errors.unknown");
			setAgentError(message);
			toast.error(
				selectedAgent === "domain_map"
					? t("context.domainMapGenerateError")
					: t("context.structureScoutGenerateError"),
			);
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
						{t("context.domainMapTitle")}
					</CardTitle>
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.domainMapSubtitle")}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<ButtonGroup>
						<Button
							variant="outline"
							onClick={handleRunAgent}
							disabled={isAgentRunning}
						>
							{isAgentRunning ? (
								<div className="flex items-center gap-2">
									<span className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full inline-block animate-spin" />
									<span>
										{selectedAgent === "domain_map"
											? t("context.domainMapGenerateRunning")
											: t("context.structureScoutGenerateRunning")}
									</span>
								</div>
							) : selectedAgent === "domain_map" ? (
								t("context.domainMapGenerate")
							) : (
								t("context.structureScoutGenerate")
							)}
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="icon" disabled={isAgentRunning}>
									<DropdownIcon className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={() => setSelectedAgent("domain_map")}
									className="flex items-center justify-between gap-2"
								>
									<span>{t("context.agentOptionDomainMap")}</span>
									{selectedAgent === "domain_map" ? (
										<CheckmarkIcon className="h-4 w-4 text-primary" />
									) : null}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setSelectedAgent("structure_scout")}
									className="flex items-center justify-between gap-2"
								>
									<span>{t("context.agentOptionStructureScout")}</span>
									{selectedAgent === "structure_scout" ? (
										<CheckmarkIcon className="h-4 w-4 text-primary" />
									) : null}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</ButtonGroup>
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
					<AgentProgress productId={product._id} runId={activeRun._id} />
				) : null}
			</CardContent>
		</Card>
	);
}
