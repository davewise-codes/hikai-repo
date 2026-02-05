import { useTranslations } from "next-intl";

export function SystemSection() {
	const t = useTranslations("HomePage.system");
	const benefits = t.raw("benefits") as Array<{ title: string; description: string }>;

	return (
		<section className="bg-background py-20 md:py-24">
			<div className="container max-w-3xl mx-auto px-6 sm:px-8">
				<h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
					{t("title")}
				</h2>
				<p className="mt-6 text-lg text-muted-foreground leading-relaxed">
					{t("body")}
				</p>
				<div className="mt-10 space-y-6">
					{benefits.map((benefit) => (
						<div key={benefit.title}>
							<p className="text-2xl font-semibold">{benefit.title}</p>
							<p className="text-lg text-muted-foreground">{benefit.description}</p>
						</div>
					))}
				</div>
				<p className="mt-12 text-2xl font-serif italic text-foreground">
					{t("closing")}
				</p>
			</div>
		</section>
	);
}
