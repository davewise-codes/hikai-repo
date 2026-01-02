import { Badge, Button } from "@hikai/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function CTASection() {
	const t = useTranslations("HomePage.finalCta");

	return (
		<section className="py-16 md:py-24 bg-primary text-primary-foreground">
			<div className="container max-w-4xl mx-auto text-center">
				<Badge variant="secondary" className="mb-6 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
					{t("badge")}
				</Badge>
				<h2 className="font-sans font-black text-3xl md:text-4xl lg:text-5xl mb-6 leading-tight">
					{t("title")}{" "}
					<span className="text-primary-foreground font-serif italic text-4xl md:text-5xl lg:text-6xl">
						{t("highlighted")}
					</span>
				</h2>
				<p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10 leading-relaxed">
					{t("subtitle")}
				</p>
				<Button size="lg" variant="secondary" className="w-full sm:w-auto" asChild>
					<Link href="#">
						{t("cta")}
					</Link>
				</Button>
			</div>
		</section>
	);
}
