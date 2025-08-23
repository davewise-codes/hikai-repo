import { Button } from "@hikai/ui";

type HeroSectionProps = {
	title: string;
	subtitle: string;
	cta: string;
};

export function HeroSection({ title, subtitle, cta }: HeroSectionProps) {
	return (
		<div className="container mx-auto py-20 text-center">
			<h1 className="text-4xl font-bold mb-4">{title}</h1>
			<p className="text-lg text-muted-foreground mb-6">{subtitle}</p>
			<Button size="lg" variant="default">
				{cta}
			</Button>
		</div>
	);
}
