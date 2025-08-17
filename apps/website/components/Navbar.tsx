"use client";

import {
        NavigationMenu,
        NavigationMenuList,
        NavigationMenuItem,
        NavigationMenuLink,
        navigationMenuTriggerStyle,
} from "@hikai/ui";
import { useTranslations } from "next-intl";

export function Navbar() {
        const t = useTranslations();

	return (
		<nav className="p-4 flex justify-center">
			<NavigationMenu>
				<NavigationMenuList>
					<NavigationMenuItem>
						<NavigationMenuLink asChild>
							<a href="#features" className={navigationMenuTriggerStyle()}>
								{t("nav.features")}
							</a>
						</NavigationMenuLink>
					</NavigationMenuItem>
					<NavigationMenuItem>
						<NavigationMenuLink asChild>
							<a href="#waitlist" className={navigationMenuTriggerStyle()}>
								{t("nav.waitlist")}
							</a>
						</NavigationMenuLink>
					</NavigationMenuItem>
				</NavigationMenuList>
			</NavigationMenu>
		</nav>
	);
}
