import { Button, Badge } from "@hikai/ui";
import { useTranslations } from "next-intl";
import { HeroImage } from "./hero-image";
import Link from "next/link";

export function HeroSection() {
	const t = useTranslations("HomePage.hero");

	return (
		<section className="py-20 md:py-32">
			<div className="container max-w-6xl mx-auto">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
					{/* Left Column - Content */}
					<div className="text-center lg:text-left">
						<Badge variant="secondary" className="mb-6">
							{t("badge")}
						</Badge>
						<h1 className="font-sans font-black text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight">
							{t("title")}{" "}
							<span className="text-primary font-serif italic text-5xl md:text-6xl lg:text-7xl">
								{t("highlighted")}
							</span>
						</h1>
						<p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
							{t("subtitle")}
						</p>
						<Button size="lg" asChild className="lg:w-auto w-full">
							<Link href="#">
								{t("cta")}
							</Link>
						</Button>
					</div>

					{/* Right Column - Illustration */}
					<div className="order-first lg:order-last">
						<HeroImage />
					</div>
				</div>
			</div>
		</section>
	);
}