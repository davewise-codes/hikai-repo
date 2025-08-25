"use client";

import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from "@hikai/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "./theme-switcher";

export function NavigationBar() {
	const t = useTranslations("Nav");

	return (
		<nav>
			<div className="container mx-auto flex h-14 items-center justify-between">
				<NavigationMenu>
					<NavigationMenuList>
						<NavigationMenuItem>
							<NavigationMenuLink asChild>
								<Link href="#hero">{t("home")}</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink asChild>
								<Link href="#how">{t("how")}</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>
					</NavigationMenuList>
				</NavigationMenu>
				<ThemeSwitcher />
			</div>
		</nav>
	);
}
