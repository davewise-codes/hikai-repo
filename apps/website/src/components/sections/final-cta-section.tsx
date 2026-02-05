import { useTranslations } from "next-intl";
import { WaitlistButton } from "@/components/waitlist-button";

export function FinalCtaSection() {
	const t = useTranslations("HomePage.finalCta");

	return (
		<section className="bg-primary text-primary-foreground py-20 md:py-24">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8 text-center">
				<h2 className="text-4xl md:text-5xl lg:text-6xl font-black">
					{t("titlePrimary")}
				</h2>
				<p className="mt-2 text-4xl md:text-5xl lg:text-6xl font-serif italic">
					{t("titleSecondary")}
				</p>
				<p className="mt-6 text-lg text-primary-foreground/80 max-w-2xl mx-auto">
					{t("subtitle")}
				</p>
				<WaitlistButton variant="secondary" size="lg" className="mt-10">
					{t("cta")}
				</WaitlistButton>
			</div>
		</section>
	);
}
