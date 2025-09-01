import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ConvexProvider } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { FontProvider } from "@/providers/font-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { convex } from "@/lib/convex";

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
							<div className="min-h-screen bg-background text-foreground">
								<Outlet />
							</div>
						</FontProvider>
					</ThemeProvider>
				</I18nProvider>
			</ConvexAuthProvider>
		</ConvexProvider>
	),
});
