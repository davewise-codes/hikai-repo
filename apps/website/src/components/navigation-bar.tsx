"use client";

import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	HikaiImagotipo,
	cn
} from "@hikai/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MobileNavigation } from "./mobile-navigation";
import { WaitlistButton } from "./waitlist-button";
import { useScrollSpy } from "@/hooks/use-scroll-spy";

export function NavigationBar() {
	const t = useTranslations("Nav");
	const activeSection = useScrollSpy(["problem", "product", "how", "impact", "why", "roadmap"]);

	const navItems = [
		{ href: "#problem", label: t("problem"), id: "problem" },
		{ href: "#product", label: t("product"), id: "product" },
		{ href: "#how", label: t("how"), id: "how" },
		{ href: "#impact", label: t("impact"), id: "impact" },
		{ href: "#why", label: t("why"), id: "why" },
		{ href: "#roadmap", label: t("roadmap"), id: "roadmap" }
	];

	return (
		<nav className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur">
			<div className="mx-auto flex h-16 w-full items-center justify-between px-6 sm:px-8">
				{/* Logo */}
				<Link href="#hero" className="flex items-center">
					<HikaiImagotipo className="h-5 w-auto text-white" variant="mono" />
				</Link>

				{/* Desktop Navigation */}
				<NavigationMenu className="hidden md:flex">
					<NavigationMenuList>
						{navItems.map((item) => (
							<NavigationMenuItem key={item.href}>
								<NavigationMenuLink asChild>
									<Link
										href={item.href}
										className="relative px-3 py-2 text-sm font-medium hover:text-primary transition-colors"
									>
										{item.label}
										<span
											className={cn(
												"absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300",
												activeSection === item.id ? "w-full" : "w-0"
											)}
										/>
									</Link>
								</NavigationMenuLink>
							</NavigationMenuItem>
						))}
					</NavigationMenuList>
				</NavigationMenu>

				{/* Desktop Controls */}
				<div className="hidden md:flex items-center gap-2">
					<WaitlistButton className="ml-2" size="sm">
						{t("cta")}
					</WaitlistButton>
				</div>

				{/* Mobile Navigation */}
				<MobileNavigation />
			</div>
		</nav>
	);
}
