import { 
	Badge,
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from "@hikai/ui";
import { useTranslations } from "next-intl";

export function FAQSection() {
	const t = useTranslations("HomePage.faq");

	return (
		<section className="py-16 md:py-24 bg-muted/30">
			<div className="container max-w-4xl mx-auto px-6 sm:px-8">
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

				{/* FAQ Accordion */}
				<Accordion type="single" collapsible className="w-full">
					{Array.from({ length: 6 }, (_, index) => (
						<AccordionItem key={index} value={`item-${index}`}>
							<AccordionTrigger className="text-left text-lg font-medium">
								{t(`items.${index}.question`)}
							</AccordionTrigger>
							<AccordionContent className="text-muted-foreground leading-relaxed">
								{t(`items.${index}.answer`)}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}
