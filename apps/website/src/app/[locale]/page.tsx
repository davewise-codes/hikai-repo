import { useTranslations } from "next-intl";
import { NavigationBar } from "@/components/navigation-bar";
import { HeroSection } from "@/components/hero-section";
import { HowSection } from "@/components/how-section";

export default function HomePage() {
	const t = useTranslations("HomePage");

	return (
		<div className="min-h-screen flex flex-col">
			<NavigationBar />
			<main className="flex-1">
				<section id="hero">
					<HeroSection
						title={t("hero.title")}
						subtitle={t("hero.subtitle")}
						cta={t("hero.cta")}
					/>
				</section>
				<section id="how">
					<HowSection
						title={t("how.title")}
						steps={[t("how.step1"), t("how.step2"), t("how.step3")]}
					/>
				</section>
			</main>
		</div>
	);
}
