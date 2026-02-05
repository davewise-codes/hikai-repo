import { Badge } from "@hikai/ui";
import { useTranslations } from "next-intl";
import { FaCalendarCheck, FaLayerGroup, FaSeedling } from "react-icons/fa6";

const benefitIcons = [FaCalendarCheck, FaLayerGroup, FaSeedling];

export function HowItWorksCondensedSection() {
	const t = useTranslations("HomePage.how");
	const benefits = t.raw("benefits") as Array<{ title: string; description: string }>;
	const steps = t.raw("steps") as Array<{ title: string; description: string }>;

	return (
		<section className="bg-background py-20 md:py-24">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8">
				<Badge variant="secondary" className="mb-8 bg-primary text-primary-foreground border border-primary/40 text-xs tracking-wide">
					{t("badge")}
				</Badge>
				<div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 items-stretch">
					<div className="flex flex-col h-full">
						<h2 className="text-4xl md:text-5xl lg:text-6xl font-black">{t("title")}</h2>
						<p className="mt-4 text-2xl text-foreground">{t("subtitle")}</p>
						<p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
							{t("body")}
						</p>
						<div className="mt-10 border-l-2 border-primary pl-6 py-2 text-2xl font-serif italic text-foreground max-w-3xl">
							{t("closing")}
						</div>
					</div>
					<div className="grid h-full grid-rows-3 gap-4">
						{benefits.map((benefit, index) => {
							const Icon = benefitIcons[index] ?? FaSeedling;
							return (
								<div key={benefit.title} className="rounded-xl border border-border bg-muted/10 p-5">
									<div className="grid grid-cols-[auto_1fr] gap-4 items-start">
										<Icon className="h-7 w-7 text-white" />
										<div>
											<p className="font-semibold">{benefit.title}</p>
											<p className="text-muted-foreground">{benefit.description}</p>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
				<div className="mt-20">
					<Badge variant="secondary" className="mb-6 bg-primary text-primary-foreground border border-primary/40 text-xs tracking-wide">
						{t("stepsBadge")}
					</Badge>
					<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
						{steps.map((step, index) => (
							<div key={step.title} className="flex-1">
								<div className="flex items-center gap-4">
									<div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary text-xl font-bold">
										{index + 1}
									</div>
									{index < steps.length - 1 && (
										<div className="hidden md:block h-px flex-1 bg-border" />
									)}
								</div>
								<h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
								<p className="mt-2 text-sm text-muted-foreground max-w-[220px]">
									{step.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
