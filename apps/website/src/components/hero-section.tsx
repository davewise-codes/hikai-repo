import { Button } from "@hikai/ui";
import { useTranslations } from "next-intl";
import { HeroImage } from "./hero-image";

export function HeroSection() {
	const t = useTranslations("HomePage");

	return (
		<div className="container max-w-4xl mx-auto text-center">
			<h1 className="font-sans font-black text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight">
				{t("hero.title")}
				<span className="text-primary font-serif">
					{" "}
					{t("hero.highlighted")}
				</span>
			</h1>
			<p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
				{t("hero.subtitle")}
			</p>
			<Button size="lg" variant="default">
				{t("hero.cta")}
			</Button>
			<HeroImage />
		</div>
	);
}
