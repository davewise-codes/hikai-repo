import { useTranslations } from "next-intl";

export function DayOneSection() {
	const t = useTranslations("HomePage.dayOne");
	const items = t.raw("items") as Array<{ title: string; description: string }>;

	return (
		<section className="bg-background py-16 md:py-20">
			<div className="container max-w-2xl mx-auto px-6 sm:px-8">
				<div className="divide-y divide-border">
					{items.map((item) => (
						<div key={item.title} className="flex gap-4 py-6">
							<span className="mt-2 h-2 w-2 rounded-full bg-primary" />
							<div>
								<p className="text-lg font-semibold">{item.title}</p>
								<p className="text-muted-foreground">{item.description}</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
