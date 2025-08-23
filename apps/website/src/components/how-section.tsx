import { Alert, AlertDescription } from "@hikai/ui";

type HowSectionProps = {
	title: string;
	steps: string[];
};

export function HowSection({ title, steps }: HowSectionProps) {
	return (
		<div className="container mx-auto py-16">
			<h2 className="text-3xl font-semibold mb-8 text-center">{title}</h2>
			<div className="grid gap-6 md:grid-cols-3">
				{steps.map((step, i) => (
					<Alert key={i} className="text-center">
						<AlertDescription className="text-lg">
							<span className="font-semibold text-primary">Paso {i + 1}:</span> {step}
						</AlertDescription>
					</Alert>
				))}
			</div>
		</div>
	);
}
