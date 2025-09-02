import { createRootRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { ConvexProvider } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { FontProvider } from "@/providers/font-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { convex } from "@/lib/convex";
import { useAuth } from "@/domains/auth/hooks";
import { ReactNode, useEffect } from "react";

function GlobalAuthGuard({ children }: { children: ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	// Debug temporal
	useEffect(() => {
		console.log('GlobalAuthGuard - Auth state changed:', {
			isAuthenticated,
			isLoading,
			pathname: location.pathname
		});
	}, [isAuthenticated, isLoading, location.pathname]);

	useEffect(() => {
		// Lista de rutas públicas (no requieren auth)
		const publicRoutes = ['/login'];
		const isPublicRoute = publicRoutes.includes(location.pathname);

		// Si no es ruta pública y no está autenticado, redirigir a login
		// Usar timeout 0 para asegurar que la redirección ocurra en el siguiente tick
		if (!isPublicRoute && !isLoading && !isAuthenticated) {
			setTimeout(() => {
				navigate({ to: '/login', replace: true });
			}, 0);
		}
	}, [isAuthenticated, isLoading, location.pathname, navigate]);

	// Mostrar loading mientras verifica auth (solo en rutas protegidas)
	const isPublicRoute = ['/login'].includes(location.pathname);
	if (!isPublicRoute && isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	return <>{children}</>;
}

export const Route = createRootRoute({
	component: () => (
		<ConvexProvider client={convex}>
			<ConvexAuthProvider client={convex}>
				<I18nProvider>
					<ThemeProvider
						defaultTheme="system"
						storageKey="webapp-theme"
						enableSystem
					>
						<FontProvider>
							<GlobalAuthGuard>
								<div className="min-h-screen bg-background text-foreground">
									<Outlet />
								</div>
							</GlobalAuthGuard>
						</FontProvider>
					</ThemeProvider>
				</I18nProvider>
			</ConvexAuthProvider>
		</ConvexProvider>
	),
});
