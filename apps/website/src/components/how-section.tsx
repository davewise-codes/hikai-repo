import { Alert, AlertDescription } from "@hikai/ui";
import { useTranslations } from "next-intl";

export function HowSection() {
	const t = useTranslations("HomePage");
	
	const steps = [
		t("how.step1"),
		t("how.step2"),
		t("how.step3")
	];

	return (
		<div className="container mx-auto py-16">
			<h2 className="text-3xl font-semibold mb-8 text-center">{t("how.title")}</h2>
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
