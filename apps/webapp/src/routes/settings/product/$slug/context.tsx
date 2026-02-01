import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import {
	ContextSnapshotCard,
	useGetProductBySlug,
} from "@/domains/products";

const CONTEXT_AGENT_USE_CASE = "context_agent";
const FEATURE_SCOUT_USE_CASE = "feature_scout";
const CAPABILITY_AGGREGATOR_USE_CASE = "capability_aggregator";

export const Route = createFileRoute("/settings/product/$slug/context")({
	component: ProductContextPage,
});

function ProductContextPage() {
	const { t } = useTranslation("products");
	const { slug } = Route.useParams();
	const { currentOrg } = useCurrentOrg();
	const product = useGetProductBySlug(currentOrg?._id, slug);
	const currentSnapshot = useQuery(
		api.products.products.getCurrentProductContextSnapshot,
		product?._id ? { productId: product._id } : "skip",
	);
	const latestRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		product?._id
			? {
					productId: product._id,
					useCase: CONTEXT_AGENT_USE_CASE,
				}
			: "skip",
	);
	const latestFeatureRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		product?._id
			? {
					productId: product._id,
					useCase: FEATURE_SCOUT_USE_CASE,
				}
			: "skip",
	);
	const latestCapabilityRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		product?._id
			? {
					productId: product._id,
					useCase: CAPABILITY_AGGREGATOR_USE_CASE,
				}
			: "skip",
	);
	const isDirty = useMemo(() => {
		const contextRunning = latestRun?.status === "running";
		const featureRunning = latestFeatureRun?.status === "running";
		const capabilityRunning = latestCapabilityRun?.status === "running";
		return Boolean(contextRunning || featureRunning || capabilityRunning);
	}, [latestRun?.status, latestFeatureRun?.status, latestCapabilityRun?.status]);

	if (!product) {
		return (
			<SettingsLayout>
				<div className="text-center py-8 text-muted-foreground">
					{t("common.loading")}
				</div>
			</SettingsLayout>
		);
	}

	return (
		<SettingsLayout>
			<SettingsHeader
				title={t("context.sectionTitle")}
				subtitle={t("context.sectionDescription")}
			/>
			<div className="space-y-6">
				<ContextSnapshotCard
					productId={product._id}
					snapshot={currentSnapshot}
					isDirty={isDirty}
				/>
			</div>
		</SettingsLayout>
	);
}
