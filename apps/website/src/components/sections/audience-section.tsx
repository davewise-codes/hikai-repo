import { useTranslations } from "next-intl";

export function AudienceSection() {
	const t = useTranslations("HomePage.audience");
	const items = t.raw("items") as Array<{ title: string; description: string }>;

	return (
		<section className="bg-muted/10 py-20 md:py-24">
			<div className="container max-w-5xl mx-auto px-6 sm:px-8">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-10">
					{items.map((item) => (
						<div key={item.title}>
							<h3 className="text-2xl font-bold mb-4">{item.title}</h3>
							<p className="text-lg text-muted-foreground leading-relaxed">{item.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
