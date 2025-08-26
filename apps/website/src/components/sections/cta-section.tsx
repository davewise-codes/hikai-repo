import { Badge, Button } from "@hikai/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function CTASection() {
	const t = useTranslations("HomePage.finalCta");

	return (
		<section className="py-20 md:py-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
			<div className="container max-w-4xl mx-auto text-center">
				<Badge variant="default" className="mb-6 bg-primary/20 text-primary border-primary/30">
					{t("badge")}
				</Badge>
				<h2 className="font-sans font-black text-3xl md:text-4xl lg:text-5xl mb-6 leading-tight">
					{t("title")}{" "}
					<span className="text-primary font-serif italic text-4xl md:text-5xl lg:text-6xl">
						{t("highlighted")}
					</span>
				</h2>
				<p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
					{t("subtitle")}
				</p>
				<Button size="lg" className="px-8 py-6 text-lg w-full sm:w-auto" asChild>
					<Link href="#">
						{t("cta")}
					</Link>
				</Button>
			</div>
		</section>
	);
}