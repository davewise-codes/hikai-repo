"use client";

import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from "@hikai/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function NavigationBar() {
	const t = useTranslations("Nav");

	return (
		<nav className="border-b">
			<div className="container mx-auto flex h-14 items-center">
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
			</div>
		</nav>
	);
}
