import { Badge, Card, CardContent, CardHeader, CardTitle } from "@hikai/ui";
import { useTranslations } from "next-intl";

export function HowItWorksSection() {
	const t = useTranslations("HomePage.how");

	const steps = [
		{
			title: t("step1.title"),
			description: t("step1.description"),
			illustration: "🔗" // Placeholder icon
		},
		{
			title: t("step2.title"),
			description: t("step2.description"),
			illustration: "⚙️" // Placeholder icon
		},
		{
			title: t("step3.title"),
			description: t("step3.description"),
			illustration: "✨" // Placeholder icon
		}
	];

	return (
		<section className="py-20 md:py-32">
			<div className="container max-w-6xl mx-auto">
				{/* Header */}
				<div className="text-center mb-16">
					<Badge variant="secondary" className="mb-6">
						{t("badge")}
					</Badge>
					<h2 className="font-sans font-black text-3xl md:text-4xl lg:text-5xl mb-6 leading-tight">
						{t("title")}{" "}
						<span className="text-primary font-serif italic text-4xl md:text-5xl lg:text-6xl">
							{t("highlighted")}
						</span>
					</h2>
					<p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
						{t("subtitle")}
					</p>
				</div>

				{/* Steps Grid - Desktop: 3 columns, Mobile: 1 column */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{steps.map((step, index) => (
						<Card key={index} className="text-center">
							<CardHeader className="pb-4">
								{/* Illustration placeholder */}
								<div className="h-24 w-24 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center text-4xl">
									{step.illustration}
								</div>
								<CardTitle className="text-xl font-semibold">
									{step.title}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground leading-relaxed">
									{step.description}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}