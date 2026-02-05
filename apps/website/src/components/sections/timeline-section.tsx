import { useTranslations } from "next-intl";

function TimelinePlaceholder() {
	return (
		<div className="rounded-2xl border border-border bg-muted/20 shadow-xl p-6">
			<div className="flex items-center gap-2">
				<span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
				<span className="h-2 w-24 rounded-full bg-muted-foreground/30" />
			</div>
			<div className="mt-6 grid grid-cols-[1fr_3fr] gap-6">
				<div className="space-y-3">
					<div className="h-3 w-4/5 rounded bg-muted-foreground/20" />
					<div className="h-3 w-3/5 rounded bg-muted-foreground/20" />
					<div className="h-3 w-2/5 rounded bg-muted-foreground/20" />
					<div className="mt-6 h-28 rounded-lg border border-border bg-muted/30" />
				</div>
				<div className="space-y-4">
					<div className="h-3 w-3/5 rounded bg-muted-foreground/20" />
					<div className="h-3 w-4/5 rounded bg-muted-foreground/20" />
					<div className="h-3 w-2/5 rounded bg-muted-foreground/20" />
					<div className="grid grid-cols-2 gap-4 mt-6">
						<div className="h-24 rounded-lg border border-border bg-muted/30" />
						<div className="h-24 rounded-lg border border-border bg-muted/30" />
					</div>
				</div>
			</div>
		</div>
	);
}

export function TimelineSection() {
	const t = useTranslations("HomePage.timeline");
	const features = t.raw("features") as Array<{ title: string; description: string }>;

	return (
		<section className="bg-muted/10 py-20 md:py-24">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8">
				<div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-12 items-start">
					<div>
						<h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
							{t("title")}
						</h2>
						<p className="mt-6 text-lg text-muted-foreground leading-relaxed">
							{t("body")}
						</p>
						<div className="mt-8 space-y-6">
							{features.map((feature) => (
								<div key={feature.title}>
									<p className="font-semibold text-lg">{feature.title}</p>
									<p className="text-muted-foreground">{feature.description}</p>
								</div>
							))}
						</div>
					</div>
					<div className="mt-10 lg:mt-0">
						<TimelinePlaceholder />
					</div>
				</div>
				<p className="mt-12 text-center text-2xl font-serif italic text-foreground">
					{t("closing")}
				</p>
			</div>
		</section>
	);
}
