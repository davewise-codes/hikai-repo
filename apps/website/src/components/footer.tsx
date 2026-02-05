"use client";

import { HikaiImagotipo, XTwitter } from "@hikai/ui";
import { Link, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export function Footer() {
	const pathname = usePathname();
	const locale = useLocale();

	return (
		<footer className="border-t border-border bg-background">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8 py-16">
				<div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-10">
					<div className="space-y-4">
						<div className="flex items-center">
							<HikaiImagotipo className="h-5 w-auto text-white" variant="mono" />
						</div>
						<p className="text-sm text-muted-foreground max-w-md leading-relaxed">
							Hikai is a calm narrative engine for product-led teams. Turn your product progress into clear, consistent updates for your audience. Automatically.
						</p>
					</div>
					<div className="md:justify-self-end">
						<p className="text-sm font-semibold text-foreground mb-3">
							Legal
						</p>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<Link href="#" className="hover:text-foreground transition-colors">
									Privacy Policy
								</Link>
							</li>
							<li>
								<Link href="#" className="hover:text-foreground transition-colors">
									Terms of use
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="mt-12 border-t border-border pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-xs text-muted-foreground">
					<p>© 2026 Hikai. All rights reserved.</p>
					<div className="flex items-center gap-4">
						<Link
							href={pathname || "/"}
							locale="en"
							className={locale === "en" ? "text-foreground" : undefined}
						>
							English
						</Link>
						<Link
							href={pathname || "/"}
							locale="es"
							className={locale === "es" ? "text-foreground" : undefined}
						>
							Español
						</Link>
					</div>
					<div className="flex items-center gap-4">
						<Link href="https://x.com/HikaiPro" aria-label="Hikai on X" className="text-muted-foreground hover:text-foreground transition-colors">
							<XTwitter className="h-4 w-4" />
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
