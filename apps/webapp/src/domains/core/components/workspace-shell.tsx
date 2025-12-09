import { ReactNode } from "react";
import { Toaster } from "@hikai/ui";

import { useTheme } from "../hooks/use-theme";
import { AppHeader } from "./app-header";
import { WorkspaceSidebar } from "./workspace-sidebar";

interface WorkspaceShellProps {
	children: ReactNode;
	productId: string;
	productSlug: string;
	orgSlug: string;
}

export function WorkspaceShell({ children, productId, productSlug, orgSlug }: WorkspaceShellProps) {
	const { theme } = useTheme();

	return (
		<div className="min-h-screen bg-background">
			<AppHeader />
			<div className="flex pt-14">
				<WorkspaceSidebar
					productId={productId}
					productSlug={productSlug}
					orgSlug={orgSlug}
				/>
				<main className="flex-1 min-h-[calc(100vh-3.5rem)]">
					{children}
				</main>
			</div>
			<Toaster theme={theme} richColors />
		</div>
	);
}
