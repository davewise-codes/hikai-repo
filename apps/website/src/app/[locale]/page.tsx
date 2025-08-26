import { NavigationBar } from "@/components/navigation-bar";
import { HeroSection } from "@/components/sections/hero-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { BeforeAfterSection } from "@/components/sections/before-after-section";
import { BenefitsSection } from "@/components/sections/benefits-section";
import { FAQSection } from "@/components/sections/faq-section";
import { CTASection } from "@/components/sections/cta-section";

export default function HomePage() {
	return (
		<div className="min-h-screen flex flex-col">
			<NavigationBar />
			<main className="flex-1">
				{/* Hero Section */}
				<section id="hero">
					<HeroSection />
				</section>

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
