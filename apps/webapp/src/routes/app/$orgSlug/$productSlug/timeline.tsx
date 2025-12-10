import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "@hikai/convex";
import { Button, Card, CardContent, CardHeader, CardTitle, toast } from "@hikai/ui";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug } from "@/domains/products/hooks";

export const Route = createFileRoute("/app/$orgSlug/$productSlug/timeline")({
	component: TimelinePage,
});

function TimelinePage() {
	const { orgSlug, productSlug } = Route.useParams();
	const { currentOrg } = useCurrentOrg();
	const product = useGetProductBySlug(currentOrg?._id, productSlug);
	const interpretPending = useMutation(api.timeline.interpret.interpretPendingEvents);
	const [isProcessing, setIsProcessing] = useState(false);

	const isLoading = product === undefined;
	const productId = product?._id;

	const subtitle = useMemo(() => {
		if (isLoading) return "Cargando producto...";
		if (!product) return "Producto no encontrado";
		return "Procesa eventos pendientes para generar el timeline (version provisional)";
	}, [isLoading, product]);

	const handleInterpret = useCallback(async () => {
		if (!productId) return;
		setIsProcessing(true);
		try {
			const result = await interpretPending({ productId });
			toast.success(
				`Interpretación completada: ${result.processed} procesados, ${result.errors} con error`
			);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "No se pudo interpretar los eventos"
			);
		} finally {
			setIsProcessing(false);
		}
	}, [interpretPending, productId]);

	return (
		<div className="p-6 space-y-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Timeline</h1>
					<p className="text-fontSize-sm text-muted-foreground mt-2">{subtitle}</p>
				</div>
				<Button
					variant="default"
					size="sm"
					disabled={!productId || isProcessing || !product}
					onClick={handleInterpret}
				>
					{isProcessing ? "Procesando..." : "Interpretar pendientes"}
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Accion provisional</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-fontSize-sm text-muted-foreground">
					<p>
						Este boton ejecuta la interpretacion de eventos raw pendientes para el
						producto actual y los marca como procesados.
					</p>
					<p>Mas adelante esta pantalla mostrara el timeline con sync y filtros.</p>
				</CardContent>
			</Card>
		</div>
	);
}
