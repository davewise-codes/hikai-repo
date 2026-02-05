import { useTranslations } from "next-intl";
import { WaitlistButton } from "@/components/waitlist-button";

export function HowItWorksV2Section() {
	const t = useTranslations("HomePage.how");
	const tHero = useTranslations("HomePage.hero");
	const steps = t.raw("steps") as Array<{ title: string; description: string }>;

	return (
		<section className="bg-background py-20 md:py-24">
			<div className="container max-w-5xl mx-auto px-6 sm:px-8">
				<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
					{steps.map((step, index) => (
						<div key={step.title} className="flex-1">
							<div className="flex items-center gap-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary text-xl font-bold">
									{index + 1}
								</div>
								{index < steps.length - 1 && (
									<div className="hidden md:block h-px flex-1 bg-border" />
								)}
							</div>
							<h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
							<p className="mt-2 text-sm text-muted-foreground max-w-[220px]">
								{step.description}
							</p>
						</div>
					))}
				</div>
				<div className="mt-12 flex justify-center">
				<WaitlistButton>{tHero("cta")}</WaitlistButton>
			</div>
		</div>
	</section>
	);
}
