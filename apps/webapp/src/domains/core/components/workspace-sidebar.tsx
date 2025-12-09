interface WorkspaceSidebarProps {
	productId: string;
	productName: string;
}

export function WorkspaceSidebar({ productName }: WorkspaceSidebarProps) {
	const label = productName?.trim().charAt(0)?.toUpperCase() ?? "?";

	return (
		<aside className="w-14 border-r bg-muted/30 flex flex-col items-center py-4">
			<span className="text-fontSize-xs text-muted-foreground uppercase">
				{label}
			</span>
		</aside>
	);
}
