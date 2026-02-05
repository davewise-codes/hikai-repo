import { useTranslations } from "next-intl";

export function ComingSection() {
	const t = useTranslations("HomePage.coming");
	const items = t.raw("items") as string[];

	return (
		<section className="bg-background py-16 md:py-20">
			<div className="container max-w-xl mx-auto px-6 sm:px-8 text-center">
				<p className="text-lg text-muted-foreground leading-relaxed">{t("intro")}</p>
				<ul className="mt-6 space-y-2 text-muted-foreground">
					{items.map((item) => (
						<li key={item}>· {item}</li>
					))}
				</ul>
			</div>
		</section>
	);
}
