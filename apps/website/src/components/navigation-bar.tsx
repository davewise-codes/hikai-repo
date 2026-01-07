"use client";

import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	SettingsIcon,
	HikaiImagotipo
} from "@hikai/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "./theme-switcher";
import { ColorThemeSwitcher } from "./color-theme-switcher";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNavigation } from "./mobile-navigation";
import { WaitlistButton } from "./waitlist-button";

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
		<nav className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="mx-auto flex h-16 w-full items-center justify-between px-6 sm:px-8">
				{/* Logo */}
				<Link href="#hero" className="flex items-center">
					<HikaiImagotipo className="h-5 w-auto" variant="brand" />
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
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-9 w-9"
								aria-label="Open settings"
							>
								<SettingsIcon className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-64 p-3">
							<div className="space-y-4">
								<div className="space-y-2">
									<p className="text-fontSize-xs font-semibold text-muted-foreground">
										Appearance
									</p>
									<div className="flex items-center justify-between gap-3">
										<span className="text-fontSize-sm">Mode</span>
										<ThemeSwitcher />
									</div>
									<div className="space-y-2">
										<span className="text-fontSize-sm">Theme</span>
										<ColorThemeSwitcher triggerClassName="w-full" />
									</div>
								</div>
								<div className="h-px bg-muted" />
								<div className="flex items-center justify-between gap-3">
									<span className="text-fontSize-sm">Language</span>
									<LanguageSwitcher />
								</div>
							</div>
						</DropdownMenuContent>
					</DropdownMenu>
					<WaitlistButton className="ml-2">
						{tHome("hero.cta")}
					</WaitlistButton>
				</div>

				{/* Mobile Navigation */}
				<MobileNavigation />
			</div>
		</nav>
	);
}
