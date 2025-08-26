import { 
	Badge, 
	Card, 
	CardContent, 
	CardHeader, 
	CardTitle,
	Clock,
	Eye,
	Circle,
	Lightbulb,
	User,
	Users
} from "@hikai/ui";
import { useTranslations } from "next-intl";

export function BenefitsSection() {
	const t = useTranslations("HomePage.benefits");

	const benefits = [
		{
			icon: Clock,
			title: t("items.0.title"),
			description: t("items.0.description")
		},
		{
			icon: Eye,
			title: t("items.1.title"),
			description: t("items.1.description")
		},
		{
			icon: Circle,
			title: t("items.2.title"),
			description: t("items.2.description")
		},
		{
			icon: Lightbulb,
			title: t("items.3.title"),
			description: t("items.3.description")
		},
		{
			icon: User,
			title: t("items.4.title"),
			description: t("items.4.description")
		},
		{
			icon: Users,
			title: t("items.5.title"),
			description: t("items.5.description")
		}
	];

	return (
		<section className="py-20 md:py-32">
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

				{/* Benefits Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{benefits.map((benefit, index) => {
						const IconComponent = benefit.icon;
						return (
							<Card key={index} className="p-6 hover:shadow-lg transition-shadow">
								<CardHeader className="pb-4">
									<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
										<IconComponent className="h-6 w-6 text-primary" />
									</div>
									<CardTitle className="text-lg font-semibold">
										{benefit.title}
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-0">
									<p className="text-muted-foreground leading-relaxed">
										{benefit.description}
									</p>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</section>
	);
}