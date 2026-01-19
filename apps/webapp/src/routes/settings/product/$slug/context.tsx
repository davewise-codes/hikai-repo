import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import {
	DomainMapCard,
	ProductContextCard,
	useGetProductBySlug,
} from "@/domains/products";

const DOMAIN_MAP_USE_CASE = "domain_map";

export const Route = createFileRoute("/settings/product/$slug/context")({
	component: ProductContextPage,
});

function ProductContextPage() {
	const { t } = useTranslation("products");
	const { slug } = Route.useParams();
	const { currentOrg } = useCurrentOrg();
	const product = useGetProductBySlug(currentOrg?._id, slug);
	const [refreshStartedAt, setRefreshStartedAt] = useState<number | null>(null);
	const latestRun = useQuery(
		api.agents.agentRuns.getLatestRunForUseCase,
		product?._id
			? {
					productId: product._id,
					useCase: DOMAIN_MAP_USE_CASE,
				}
			: "skip",
	);
	const isRefreshing = useMemo(() => {
		if (!refreshStartedAt) return false;
		if (!latestRun) return true;
		if (latestRun.startedAt && latestRun.startedAt >= refreshStartedAt) {
			return latestRun.status === "running";
		}
		return true;
	}, [latestRun, refreshStartedAt]);

	useEffect(() => {
		if (!refreshStartedAt || !latestRun?.startedAt) return;
		if (latestRun.startedAt < refreshStartedAt) return;
		if (latestRun.status !== "running") {
			setRefreshStartedAt(null);
		}
	}, [latestRun, refreshStartedAt]);

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
					onRunStart={({ startedAt, runId }) => {
						setRefreshStartedAt(startedAt);
					}}
				/>
				<DomainMapCard
					domainMap={isRefreshing ? null : product.domainMap}
					isRefreshing={isRefreshing}
				/>
			</div>
		</SettingsLayout>
	);
}
