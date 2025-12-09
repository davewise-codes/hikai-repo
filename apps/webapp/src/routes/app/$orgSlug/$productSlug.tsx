import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WorkspaceShell } from "@/domains/core/components";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug } from "@/domains/products/hooks";

export const Route = createFileRoute("/app/$orgSlug/$productSlug")({
	component: WorkspaceLayout,
});

function WorkspaceLayout() {
	const { orgSlug, productSlug } = Route.useParams();
	const { currentOrg } = useCurrentOrg();
	const product = useGetProductBySlug(currentOrg?._id, productSlug);

	if (product === undefined) {
		return <div>Loading...</div>;
	}

	if (product === null) {
		return <div>Product not found</div>;
	}

	return (
		<WorkspaceShell
			productId={product._id}
			productSlug={productSlug}
			orgSlug={orgSlug}
		>
			<Outlet />
		</WorkspaceShell>
	);
}
