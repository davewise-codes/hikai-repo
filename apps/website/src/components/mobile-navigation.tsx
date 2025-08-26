"use client";

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	Button,
	Separator,
	Menu
} from "@hikai/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "./theme-switcher";
import { LanguageSwitcher } from "./language-switcher";

export function MobileNavigation() {
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
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" className="md:hidden">
					<Menu className="h-5 w-5" />
					<span className="sr-only">Open menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="w-[300px] sm:w-[350px]">
				<SheetHeader>
					<SheetTitle className="text-left">Hikai</SheetTitle>
				</SheetHeader>
				
				<div className="flex flex-col gap-4 mt-6">
					{/* Navigation Links */}
					<nav className="flex flex-col gap-2">
						{navItems.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className="flex items-center gap-2 p-3 rounded-md hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
							>
								{item.label}
							</Link>
						))}
					</nav>

					<Separator />

					{/* Theme and Language Controls */}
					<div className="flex items-center justify-between px-3">
						<span className="text-sm font-medium">Settings</span>
						<div className="flex items-center gap-2">
							<ThemeSwitcher />
							<LanguageSwitcher />
						</div>
					</div>

					<Separator />

					{/* CTA Button */}
					<Button size="lg" className="w-full" asChild>
						<Link href="#">
							{tHome("hero.cta")}
						</Link>
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}