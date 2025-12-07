import { createRootRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { FontProvider } from "@/providers/font-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { DensityProvider } from "@/providers/density-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { ReactNode, useEffect } from "react";

function GlobalAuthGuard({ children }: { children: ReactNode }) {
	const location = useLocation();
	const navigate = useNavigate();
	const isPublicRoute = ['/login'].includes(location.pathname);

	// Allow public routes
	if (isPublicRoute) {
		return <>{children}</>;
	}

	// For protected routes, use Authenticated/Unauthenticated
	return (
		<>
			<Authenticated>
				{children}
			</Authenticated>
			<Unauthenticated>
				<RedirectToLogin />
			</Unauthenticated>
		</>
	);
}

function RedirectToLogin() {
	const navigate = useNavigate();

	useEffect(() => {
		navigate({ to: '/login', replace: true });
	}, [navigate]);

	return null;
}

function RootComponent() {
	return (
		<GlobalAuthGuard>
			<I18nProvider>
				<ThemeProvider
					defaultTheme="system"
					storageKey="webapp-theme"
					enableSystem
				>
					<DensityProvider>
						<FontProvider>
							<div className="min-h-screen bg-background text-foreground">
								<Outlet />
							</div>
						</FontProvider>
					</DensityProvider>
				</ThemeProvider>
			</I18nProvider>
		</GlobalAuthGuard>
	);
}

export const Route = createRootRoute({
	component: RootComponent,
});
