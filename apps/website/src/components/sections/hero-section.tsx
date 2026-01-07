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
					<Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20">
						{t("badge")}
					</Badge>
					<h1 className="sm:max-w-[85%] font-sans font-black text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight">
						<span className="block md:whitespace-nowrap">
							{t.rich("title", {
								em: (chunks) => (
									<span className="font-serif italic text-white">
										{chunks}
									</span>
								),
							})}
						</span>
						<span className="mt-2 block text-lg md:text-2xl lg:text-3xl font-semibold text-white/90">
							{t("highlighted")}
						</span>
					</h1>
					<div className="h-px w-full bg-white/35 mb-6" />
					<div className="grid grid-cols-1 sm:grid-cols-[0.3fr_0.7fr] gap-6">
						<div className="sm:col-start-2 flex flex-col items-end gap-6">
							<div className="text-base md:text-lg text-white/80 text-right leading-snug space-y-1 max-w-none">
								{t("subtitle")
									.split("\n")
									.filter(Boolean)
									.map((line) => (
										<p key={line}>{line}</p>
									))}
							</div>
							<WaitlistButton className="w-auto">
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
