import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Clock,
	Megaphone,
	Users,
	Package,
	FileText,
	Send,
	Settings,
	Button,
	cn,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@hikai/ui";

interface WorkspaceSidebarProps {
	productId: string;
	productSlug: string;
	orgSlug: string;
}

const navItems = [
	{ key: "timeline", icon: Clock, href: "timeline" },
	{ key: "marketing", icon: Megaphone, href: "marketing" },
	{ key: "customerSuccess", icon: Users, href: "customer-success" },
	{ key: "productTeam", icon: Package, href: "product-team" },
	{ key: "content", icon: FileText, href: "content" },
	{ key: "publishing", icon: Send, href: "publishing" },
];

export function WorkspaceSidebar({ productSlug, orgSlug }: WorkspaceSidebarProps) {
	const { t } = useTranslation("common");
	const location = useLocation();
	const basePath = `/app/${orgSlug}/${productSlug}`;

	return (
		<aside className="w-14 border-r bg-muted/30 flex flex-col items-center py-4 gap-1">
			<div className="flex flex-col items-center gap-2">
				{navItems.slice(0, 1).map((item) => {
					const Icon = item.icon;
					const fullPath = `${basePath}/${item.href}`;
					const isActive = location.pathname.startsWith(fullPath);

					return (
						<Tooltip key={item.key} delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									asChild
									size="compact"
									variant="ghost"
									className={cn(
										"w-10 h-10 shrink-0 px-0",
										isActive
											? "bg-accent text-accent-foreground font-medium"
											: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
									)}
								>
									<Link to={fullPath}>
										<Icon />
									</Link>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="right">
								{t(`workspace.nav.${item.key}`)}
							</TooltipContent>
						</Tooltip>
					);
				})}
			</div>

			<div className="w-9 h-px bg-border rounded-full my-3" aria-hidden />

			<div className="flex flex-col items-center gap-2">
				{navItems.slice(1, 4).map((item) => {
					const Icon = item.icon;
					const fullPath = `${basePath}/${item.href}`;
					const isActive = location.pathname.startsWith(fullPath);

					return (
						<Tooltip key={item.key} delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									asChild
									size="compact"
									variant="ghost"
									className={cn(
										"w-10 h-10 shrink-0 px-0",
										isActive
											? "bg-accent text-accent-foreground font-medium"
											: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
									)}
								>
									<Link to={fullPath}>
										<Icon />
									</Link>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="right">
								{t(`workspace.nav.${item.key}`)}
							</TooltipContent>
						</Tooltip>
					);
				})}
			</div>

			<div className="w-9 h-px bg-border rounded-full my-3" aria-hidden />

			<div className="flex flex-col items-center gap-2">
				{navItems.slice(4, 6).map((item) => {
					const Icon = item.icon;
					const fullPath = `${basePath}/${item.href}`;
					const isActive = location.pathname.startsWith(fullPath);

					return (
						<Tooltip key={item.key} delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									asChild
									size="compact"
									variant="ghost"
									className={cn(
										"w-10 h-10 shrink-0 px-0",
										isActive
											? "bg-accent text-accent-foreground font-medium"
											: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
									)}
								>
									<Link to={fullPath}>
										<Icon />
									</Link>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="right">
								{t(`workspace.nav.${item.key}`)}
							</TooltipContent>
						</Tooltip>
					);
				})}
			</div>

			<div className="flex-1" />

			<Tooltip delayDuration={0}>
				<TooltipTrigger asChild>
					<Button
						asChild
						size="compact"
						variant="ghost"
						className="w-10 h-10 shrink-0 px-0 text-muted-foreground"
					>
						<Link to="/settings/product/$slug/general" params={{ slug: productSlug }}>
							<Settings />
						</Link>
					</Button>
				</TooltipTrigger>
				<TooltipContent side="right">
					{t("workspace.nav.settings")}
				</TooltipContent>
			</Tooltip>
		</aside>
	);
}
