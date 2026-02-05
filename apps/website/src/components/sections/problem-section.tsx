import { Badge } from "@hikai/ui";
import { useTranslations } from "next-intl";

export function ProblemSection() {
	const t = useTranslations("HomePage.problem");
	const body = t.raw("body") as string[];

	return (
		<section className="bg-background py-20 md:py-24">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8">
				<Badge variant="secondary" className="mb-8 bg-primary text-primary-foreground border border-primary/40 text-xs tracking-wide">
					{t("badge")}
				</Badge>
				<div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-12 items-stretch">
					<div className="flex h-full">
						<h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
							{t("title")}
						</h2>
					</div>
					<div className="flex h-full">
						<div className="flex h-full flex-col justify-between text-lg text-muted-foreground leading-relaxed">
							{body.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</div>
					</div>
				</div>
				<div className="mt-12 border-l-2 border-primary pl-6 py-2 text-2xl font-serif italic text-foreground">
					{t("insight")}
				</div>
			</div>
		</section>
	);
}
