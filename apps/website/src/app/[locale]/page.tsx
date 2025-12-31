import { NavigationBar } from "@/components/navigation-bar";
import { HeroSection } from "@/components/sections/hero-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { BeforeAfterSection } from "@/components/sections/before-after-section";
import { BenefitsSection } from "@/components/sections/benefits-section";
import { FAQSection } from "@/components/sections/faq-section";
import { CTASection } from "@/components/sections/cta-section";
import { HeroShell } from "@/components/hero-shell";

export default function HomePage() {
	return (
		<div className="min-h-screen flex flex-col">
			<HeroShell>
				<NavigationBar />
				<section id="hero" className="relative z-10 pt-16">
					<HeroSection />
				</section>
			</HeroShell>
			<main className="flex-1">
				{/* How It Works Section */}
				<section id="how">
					<HowItWorksSection />
				</section>

				{/* Before vs After Section */}
				<section id="before-after">
					<BeforeAfterSection />
				</section>

				{/* Benefits Section */}
				<section id="benefits">
					<BenefitsSection />
				</section>

				{/* FAQ Section */}
				<section id="faq">
					<FAQSection />
				</section>

				{/* Final CTA Section */}
				<section id="cta">
					<CTASection />
				</section>
			</main>
		</div>
	);
}
