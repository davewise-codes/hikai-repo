import { Button, Badge } from "@hikai/ui";
import { useTranslations } from "next-intl";
import { HeroImage } from "./hero-image";
import Link from "next/link";

export function HeroSection() {
	const t = useTranslations("HomePage.hero");

	return (
		<section className="py-20 md:py-32 lg:py-36">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8">
				<div className="mx-auto w-full max-w-4xl text-white">
					<Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20">
						{t("badge")}
					</Badge>
					<h1 className="sm:max-w-[75%] font-sans font-black text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight">
						{t("title")}{" "}
						<span className="text-white font-serif italic text-5xl md:text-6xl lg:text-7xl">
							{t("highlighted")}
						</span>
					</h1>
					<div className="h-px w-full bg-white/35 mb-6" />
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						<div className="sm:col-start-2 flex flex-col items-end gap-6">
							<p className="text-base md:text-lg text-white/80 text-right leading-relaxed">
								{t("subtitle")}
							</p>
							<Button size="lg" asChild className="w-full sm:w-auto">
								<Link href="#">
									{t("cta")}
								</Link>
							</Button>
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
