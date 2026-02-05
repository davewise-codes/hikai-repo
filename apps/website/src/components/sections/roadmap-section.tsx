import { Badge } from "@hikai/ui";
import { useTranslations } from "next-intl";

export function RoadmapSection() {
	const t = useTranslations("HomePage.roadmap");
	const items = t.raw("items") as Array<{ title: string; description: string }>;

	return (
		<section className="bg-background py-20 md:py-24">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8 text-center">
				<Badge variant="secondary" className="mb-8 bg-primary text-primary-foreground border border-primary/40 text-xs tracking-wide">
					{t("badge")}
				</Badge>
				<h2 className="text-4xl md:text-5xl font-black">{t("title")}</h2>
				<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
					{t("subtitle")}
				</p>
				<div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
					{items.map((item) => (
						<div key={item.title} className="rounded-xl border border-border p-6">
							<h3 className="text-lg font-semibold mb-3">{item.title}</h3>
							<p className="text-muted-foreground">{item.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
