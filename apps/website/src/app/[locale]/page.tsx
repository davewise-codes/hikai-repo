import { NavigationBar } from "@/components/navigation-bar";
import { HeroSection } from "@/components/sections/hero-section";
import { ProblemSection } from "@/components/sections/problem-section";
import { ProductSection } from "@/components/sections/product-section";
import { HowItWorksCondensedSection } from "@/components/sections/how-it-works-condensed-section";
import { ImpactSection } from "@/components/sections/impact-section";
import { WhySection } from "@/components/sections/why-section";
import { RoadmapSection } from "@/components/sections/roadmap-section";
import { FinalCtaSection } from "@/components/sections/final-cta-section";
import { Footer } from "@/components/footer";
import { HeroShell } from "@/components/hero-shell";

export default function HomePage() {
	return (
		<div className="min-h-screen flex flex-col">
			<NavigationBar />
			<HeroShell>
				<section id="hero" className="relative z-10 pt-16">
					<HeroSection />
				</section>
			</HeroShell>
			<main className="flex-1">
				<section id="problem">
					<ProblemSection />
				</section>
				<section id="product">
					<ProductSection />
				</section>
				<section id="how">
					<HowItWorksCondensedSection />
				</section>
				<section id="impact">
					<ImpactSection />
				</section>
				<section id="why">
					<WhySection />
				</section>
				<section id="roadmap">
					<RoadmapSection />
				</section>
				<section id="cta">
					<FinalCtaSection />
				</section>
			</main>
			<Footer />
		</div>
	);
}
