import { Badge, Card, CardContent, CardHeader, CardTitle } from "@hikai/ui";
import { useTranslations } from "next-intl";

export function BeforeAfterSection() {
	const t = useTranslations("HomePage.beforeAfter");

	return (
		<section className="py-20 md:py-32 bg-muted/30">
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

				{/* Comparison Cards */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Before Card */}
					<Card className="bg-slate-900 dark:bg-slate-800 text-slate-100 border-slate-700">
						<CardHeader className="text-center pb-6">
							{/* Cave illustration placeholder */}
							<div className="h-32 w-32 mx-auto mb-6 rounded-xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-6xl">
								🕳️
							</div>
							<CardTitle className="text-2xl font-bold text-slate-100">
								{t("before.title")}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<ul className="space-y-3">
								{(t.raw("before.items") as string[]).map((item, index) => (
									<li key={index} className="flex items-start gap-3 text-slate-300">
										<span className="text-red-400 mt-1">❌</span>
										<span className="leading-relaxed">{item}</span>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>

					{/* With Hikai Card */}
					<Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
						<CardHeader className="text-center pb-6">
							{/* Light/visibility illustration placeholder */}
							<div className="h-32 w-32 mx-auto mb-6 rounded-xl bg-primary/20 flex items-center justify-center text-6xl">
								💡
							</div>
							<CardTitle className="text-2xl font-bold text-primary">
								{t("with.title")}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<ul className="space-y-3">
								{(t.raw("with.items") as string[]).map((item, index) => (
									<li key={index} className="flex items-start gap-3 text-foreground">
										<span className="text-green-500 mt-1">✅</span>
										<span className="leading-relaxed">{item}</span>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}