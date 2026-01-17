import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import {
	DomainMapCard,
	ProductContextCard,
	useGetProductBySlug,
} from "@/domains/products";

export const Route = createFileRoute("/settings/product/$slug/context")({
	component: ProductContextPage,
});

function ProductContextPage() {
	const { t } = useTranslation("products");
	const { slug } = Route.useParams();
	const { currentOrg } = useCurrentOrg();
	const product = useGetProductBySlug(currentOrg?._id, slug);

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
				<ProductContextCard product={product} />
				<DomainMapCard domainMap={product.domainMap} />
			</div>
		</SettingsLayout>
	);
}
