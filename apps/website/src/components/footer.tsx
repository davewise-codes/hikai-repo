import { Linkedin, X } from "@hikai/ui";
import Link from "next/link";

export function Footer() {
	return (
		<footer className="border-t border-border bg-background">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8 py-16">
				<div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-10">
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
								H
							</div>
							<span className="font-semibold text-lg">Hikai</span>
						</div>
						<p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
							A calm product narrative engine. Turn product progress into clear, consistent updates for your audience.
						</p>
						<div className="flex items-center gap-3 text-muted-foreground">
							<Link href="#" aria-label="Hikai on X" className="hover:text-foreground transition-colors">
								<X className="h-5 w-5" />
							</Link>
							<Link href="#" aria-label="Hikai on LinkedIn" className="hover:text-foreground transition-colors">
								<Linkedin className="h-5 w-5" />
							</Link>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						<div className="space-y-3">
							<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
								Product
							</p>
							<ul className="space-y-2 text-sm">
								<li>
									<Link href="#" className="hover:text-foreground transition-colors">
										Features
									</Link>
								</li>
								<li>
									<Link href="#" className="hover:text-foreground transition-colors">
										How it works
									</Link>
								</li>
								<li>
									<Link href="#" className="hover:text-foreground transition-colors">
										Pricing
									</Link>
								</li>
							</ul>
						</div>
					</div>
				</div>

				<div className="mt-12 border-t border-border pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
					<p>© 2026 Hikai. All rights reserved.</p>
					<Link href="#" className="hover:text-foreground transition-colors">
						Privacy Policy
					</Link>
				</div>
			</div>
		</footer>
	);
}
