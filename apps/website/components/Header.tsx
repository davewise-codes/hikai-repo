"use client";

import { Navbar } from "./Navbar";
import {
        DropdownMenu,
        DropdownMenuTrigger,
        DropdownMenuContent,
        DropdownMenuItem,
} from "@hikai/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

export function Header() {
        const locale = useLocale();
        const pathname = usePathname();

        return (
                <header className="p-4 flex items-center justify-between">
                        <Navbar />
                        <DropdownMenu>
                                <DropdownMenuTrigger>{locale}</DropdownMenuTrigger>
                                <DropdownMenuContent>
                                        <DropdownMenuItem>
                                                <Link href={pathname} locale="en">
                                                        English
                                                </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                                <Link href={pathname} locale="es">
                                                        Español
                                                </Link>
                                        </DropdownMenuItem>
                                </DropdownMenuContent>
                        </DropdownMenu>
                </header>
        );
}
