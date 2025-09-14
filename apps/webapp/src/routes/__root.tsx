import { createRootRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { ConvexProvider } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { FontProvider } from "@/providers/font-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { convex } from "@/lib/convex";
import { useAuth } from "@/domains/auth/hooks";
import { ReactNode, useEffect, useState } from "react";

function GlobalAuthGuard({ children }: { children: ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

	// Check if we're handling an OAuth callback - TanStack Router uses search object, not string
	const hasOAuthCode = !!(location.search && typeof location.search === 'object' && 'code' in location.search);
	const isPublicRoute = ['/login'].includes(location.pathname);



	// Handle OAuth callback processing
	useEffect(() => {
		if (hasOAuthCode && !isAuthenticated) {
			setIsProcessingOAuth(true);

			// Wait for Convex Auth to process the OAuth code
			const timeout = setTimeout(() => {
				// If still not authenticated after reasonable time, reset
				if (!isAuthenticated) {
					setIsProcessingOAuth(false);
				}
			}, 5000); // 5 second timeout

			return () => clearTimeout(timeout);
		}
	}, [hasOAuthCode, isAuthenticated]);

	// Clear OAuth processing state when authenticated
	useEffect(() => {
		if (isAuthenticated && isProcessingOAuth) {
			setIsProcessingOAuth(false);

			// Clean up URL by navigating to home
			if (hasOAuthCode) {
				navigate({ to: '/', replace: true });
			}
		}
	}, [isAuthenticated, isProcessingOAuth, hasOAuthCode, navigate]);

	// Regular auth guard logic
	useEffect(() => {
		// Don't redirect if we have OAuth code OR are processing OAuth
		if (hasOAuthCode || isProcessingOAuth) {
			return;
		}

		// Si no es ruta pública y no está autenticado, redirigir a login
		if (!isPublicRoute && !isLoading && !isAuthenticated) {
			navigate({ to: '/login', replace: true });
		}
	}, [isAuthenticated, isLoading, location.pathname, navigate, hasOAuthCode, isProcessingOAuth, isPublicRoute]);

	// Show OAuth processing state - check both code presence and processing state
	if ((hasOAuthCode || isProcessingOAuth) && !isAuthenticated) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center space-y-4">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<div className="text-muted-foreground">Processing authentication...</div>
				</div>
			</div>
		);
	}

	// Mostrar loading mientras verifica auth (solo en rutas protegidas)
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
