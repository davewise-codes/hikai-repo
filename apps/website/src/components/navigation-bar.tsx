"use client";

import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	Button
} from "@hikai/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "./theme-switcher";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNavigation } from "./mobile-navigation";

export function NavigationBar() {
	const t = useTranslations("Nav");
	const tHome = useTranslations("HomePage");

	const navItems = [
		{ href: "#hero", label: t("hero") },
		{ href: "#how", label: t("how") },
		{ href: "#before-after", label: t("beforeAfter") },
		{ href: "#benefits", label: t("benefits") },
		{ href: "#faq", label: t("faq") }
	];

	return (
		<nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container max-w-6xl mx-auto flex h-16 items-center justify-between">
				{/* Logo */}
				<Link href="#hero" className="flex items-center gap-2">
					<div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
						H
					</div>
					<span className="font-semibold text-lg hidden sm:inline-block">
						Hikai
					</span>
				</Link>

				{/* Desktop Navigation */}
				<NavigationMenu className="hidden md:flex">
					<NavigationMenuList>
						{navItems.map((item) => (
							<NavigationMenuItem key={item.href}>
								<NavigationMenuLink asChild>
									<Link href={item.href} className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">
										{item.label}
									</Link>
								</NavigationMenuLink>
							</NavigationMenuItem>
						))}
					</NavigationMenuList>
				</NavigationMenu>

				{/* Desktop Controls */}
				<div className="hidden md:flex items-center gap-2">
					<ThemeSwitcher />
					<LanguageSwitcher />
					<Button asChild className="ml-2">
						<Link href="#">
							{tHome("hero.cta")}
						</Link>
					</Button>
				</div>

				{/* Mobile Navigation */}
				<MobileNavigation />
			</div>
		</nav>
	);
}
