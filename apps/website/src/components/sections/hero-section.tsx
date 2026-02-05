import { Badge } from "@hikai/ui";
import { useTranslations } from "next-intl";
import { HeroImage } from "./hero-image";
import { WaitlistButton } from "@/components/waitlist-button";

export function HeroSection() {
	const t = useTranslations("HomePage.hero");

	return (
		<section className="py-16 md:py-24 lg:py-28">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8">
				<div className="mx-auto w-full max-w-6xl text-white">
					<Badge variant="secondary" className="mb-6 bg-primary text-primary-foreground border border-primary/40 text-xs tracking-wide">
						{t("badge")}
					</Badge>
					<h1 className="font-sans font-black text-4xl md:text-6xl lg:text-7xl leading-tight">
						{t("title")}
					</h1>
					<p className="mt-4 text-2xl md:text-3xl font-serif italic text-white/90">
						{t("tagline")}
					</p>
					<div className="h-px w-full bg-white/35 my-6" />
					<div className="grid grid-cols-1 sm:grid-cols-[0.3fr_0.7fr] gap-6">
						<div className="sm:col-start-2 flex flex-col items-start sm:items-end gap-6">
							<p className="text-base md:text-lg text-white/80 text-left sm:text-right leading-snug max-w-xl">
								{t("subtitle")}
							</p>
							<WaitlistButton className="w-full sm:w-auto">
								{t("cta")}
							</WaitlistButton>
						</div>
					</div>
					<div className="mt-12 flex justify-center">
						<HeroImage />
					</div>
				</div>
			</div>
		</section>
	);
}
