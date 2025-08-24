import { NavigationBar } from "@/components/navigation-bar";
import { HeroSection } from "@/components/hero-section";
import { HowSection } from "@/components/how-section";

export default function HomePage() {
	return (
		<div className="min-h-screen flex flex-col">
			<NavigationBar />
			<main className="flex-1">
				<section id="hero">
					<HeroSection />
				</section>
				<section id="how">
					<HowSection />
				</section>
			</main>
		</div>
	);
}
