import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import {
	ContextSnapshotCard,
	ProductContextCard,
	useGetProductBySlug,
} from "@/domains/products";

const CONTEXT_AGENT_USE_CASE = "context_agent";

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
	const isDirty = useMemo(() => {
		if (!currentSnapshot?.createdAt || !latestRun?.startedAt) return false;
		return latestRun.startedAt > currentSnapshot.createdAt;
	}, [currentSnapshot?.createdAt, latestRun?.startedAt]);

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
				<ProductContextCard
					product={product}
					snapshot={currentSnapshot ?? undefined}
					isDirty={isDirty}
				/>
				<ContextSnapshotCard snapshot={currentSnapshot} isDirty={isDirty} />
			</div>
		</SettingsLayout>
	);
}
