import { useTranslations } from "next-intl";

export function SolutionSection() {
	const t = useTranslations("HomePage.solution");
	const points = t.raw("points") as Array<{ title: string; description: string }>;

	return (
		<section className="bg-muted/10 py-20 md:py-24">
			<div className="container max-w-5xl mx-auto px-6 sm:px-8 text-center">
				<h2 className="text-4xl md:text-6xl font-black">{t("title")}</h2>
				<p className="mt-4 text-2xl md:text-3xl text-muted-foreground">
					{t("subtitle")}
				</p>
				<p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
					{t("body")}
				</p>
				<p className="mt-4 text-lg text-muted-foreground">
					{t("closing")}
				</p>
				<div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 text-left md:text-center">
					{points.map((point) => (
						<div key={point.title} className="space-y-3">
							<h3 className="text-2xl font-semibold">{point.title}</h3>
							<p className="text-lg text-muted-foreground">{point.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
