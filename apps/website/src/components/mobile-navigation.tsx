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
import { WaitlistButton } from "./waitlist-button";

export function MobileNavigation() {
	const t = useTranslations("Nav");

	const navItems = [
		{ href: "#problem", label: t("problem") },
		{ href: "#product", label: t("product") },
		{ href: "#how", label: t("how") },
		{ href: "#impact", label: t("impact") },
		{ href: "#why", label: t("why") },
		{ href: "#roadmap", label: t("roadmap") }
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

					{/* CTA Button */}
					<WaitlistButton size="lg" className="w-full">
						{t("cta")}
					</WaitlistButton>
				</div>
			</SheetContent>
		</Sheet>
	);
}
