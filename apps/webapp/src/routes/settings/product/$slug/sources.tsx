import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button, Plus } from "@hikai/ui";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug } from "@/domains/products/hooks";
import { ConnectionList, AddConnectionDialog } from "@/domains/connectors/components";

export const Route = createFileRoute("/settings/product/$slug/sources")({
	component: ProductSourcesPage,
});

function ProductSourcesPage() {
	const { slug } = Route.useParams();
	const { t } = useTranslation("connectors");
	const { currentOrg } = useCurrentOrg();
	const product = useGetProductBySlug(currentOrg?._id, slug);
	const [dialogOpen, setDialogOpen] = useState(false);

	if (!product) return null;

	return (
		<SettingsLayout variant="wide">
			<SettingsHeader
				title={t("sources.title")}
				subtitle={t("sources.subtitle")}
				actions={
					<Button onClick={() => setDialogOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						{t("sources.addSource")}
					</Button>
				}
			/>

			<ConnectionList productId={product._id} onAddClick={() => setDialogOpen(true)} />

			<AddConnectionDialog
				productId={product._id}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
			/>
		</SettingsLayout>
	);
}
