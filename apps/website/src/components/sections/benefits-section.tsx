import {
	Badge,
	Clock,
	Circle,
	Eye,
	Lightbulb,
	User,
	Users,
} from "@hikai/ui";
import { useTranslations } from "next-intl";

export function BenefitsSection() {
	const t = useTranslations("HomePage.benefits");

	const benefits = [
		{
			icon: Eye,
			title: t("items.1.title"),
			description: t("items.1.description"),
		},
		{
			icon: Circle,
			title: t("items.2.title"),
			description: t("items.2.description"),
		},
		{
			icon: Clock,
			title: t("items.0.title"),
			description: t("items.0.description"),
		},
		{
			icon: Lightbulb,
			title: t("items.3.title"),
			description: t("items.3.description"),
		},
		{
			icon: User,
			title: t("items.4.title"),
			description: t("items.4.description"),
		},
		{
			icon: Users,
			title: t("items.5.title"),
			description: t("items.5.description"),
		},
	];

	return (
		<section className="py-16 md:py-24">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8">
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

				<div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-muted/10">
					<div className="pointer-events-none absolute inset-0">
						<div className="absolute inset-0 bg-[url('/why-hikai-bg-v2.png')] bg-cover bg-center" />
						<div className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/25 to-slate-950/45" />
						<div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:88px_88px] opacity-30" />
					</div>

					<div className="relative space-y-12 p-8 md:p-10">
						<div className="grid grid-cols-1 lg:grid-cols-[180px_1px_1fr] gap-6 lg:gap-8 items-stretch">
							<div className="space-y-3">
								<p className="text-fontSize-sm uppercase tracking-[0.16em] text-foreground drop-shadow-[0_2px_6px_rgba(15,23,42,0.5)]">
									{t("externalTitle")}
								</p>
							</div>
							<div className="hidden lg:block w-px bg-white/30" />
							<div className="lg:hidden h-px w-full bg-border" />
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{benefits.slice(0, 2).map((benefit) => {
									const IconComponent = benefit.icon;
									return (
										<div
											key={benefit.title}
											className="rounded-2xl border border-white/20 bg-white/5 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur"
										>
											<div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
												<IconComponent className="h-5 w-5 text-primary" />
											</div>
											<p className="text-lg font-semibold">{benefit.title}</p>
											<p className="mt-2 text-fontSize-sm text-muted-foreground">
												{benefit.description}
											</p>
										</div>
									);
								})}
							</div>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-[180px_1px_1fr] gap-6 lg:gap-8 items-stretch">
							<div className="space-y-3">
								<p className="text-fontSize-sm uppercase tracking-[0.16em] text-foreground drop-shadow-[0_2px_6px_rgba(15,23,42,0.5)]">
									{t("internalTitle")}
								</p>
							</div>
							<div className="hidden lg:block w-px bg-white/30" />
							<div className="lg:hidden h-px w-full bg-border" />
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{benefits.slice(2).map((benefit) => {
									const IconComponent = benefit.icon;
									return (
										<div
											key={benefit.title}
											className="rounded-xl border border-white/15 bg-white/4 px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.1)] backdrop-blur"
										>
											<div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
												<IconComponent className="h-4 w-4 text-primary" />
											</div>
											<p className="text-fontSize-sm font-semibold">
												{benefit.title}
											</p>
											<p className="mt-1 text-fontSize-xs text-muted-foreground">
												{benefit.description}
											</p>
										</div>
									);
								})}
							</div>
						</div>

					</div>
				</div>
			</div>
		</section>
	);
}
