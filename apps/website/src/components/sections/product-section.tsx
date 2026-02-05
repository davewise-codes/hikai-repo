"use client";

import { Badge, cn } from "@hikai/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { WaitlistButton } from "@/components/waitlist-button";

const FEATURE_DURATION_MS = 6000;

export function ProductSection() {
	const t = useTranslations("HomePage.product");
	const tHero = useTranslations("HomePage.hero");
	const features = t.raw("features") as Array<{ title: string; description: string }>;
	const [activeIndex, setActiveIndex] = useState(0);
	const [progress, setProgress] = useState(0);
	const activeFeature = features[activeIndex];

	useEffect(() => {
		if (features.length <= 1) {
			return;
		}

		let start = Date.now();
		const interval = window.setInterval(() => {
			const elapsed = Date.now() - start;
			const nextProgress = Math.min(100, (elapsed / FEATURE_DURATION_MS) * 100);
			setProgress(nextProgress);

			if (elapsed >= FEATURE_DURATION_MS) {
				start = Date.now();
				setProgress(0);
				setActiveIndex((prev) => (prev + 1) % features.length);
			}
		}, 50);

		return () => {
			window.clearInterval(interval);
		};
	}, [activeIndex, features.length]);

	const handleSelect = (index: number) => {
		setActiveIndex(index);
		setProgress(0);
	};

	return (
		<section className="bg-muted/10 py-20 md:py-24">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8 text-center">
				<Badge variant="secondary" className="mb-8 bg-primary text-primary-foreground border border-primary/40 text-xs tracking-wide">
					{t("badge")}
				</Badge>
				<h2 className="text-4xl md:text-5xl lg:text-6xl font-black">
					{t("title")}
				</h2>
				<p className="mt-3 text-2xl md:text-3xl text-foreground">
					{t("subtitle")}
				</p>
				<p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto">
					{t("body")}
				</p>
				<div className="mt-12 grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-10 items-start text-left">
					<div>
						<ul className="space-y-4">
							{features.map((feature, index) => (
								<li key={feature.title}>
									<button
										type="button"
										className={cn(
											"w-full text-left text-lg transition-colors",
											index === activeIndex
												? "font-semibold text-foreground"
												: "text-muted-foreground hover:text-foreground"
											)}
										onClick={() => handleSelect(index)}
									>
										<span className="block h-[2px] bg-border/40">
											<span
												className="block h-[2px] bg-primary transition-[width] duration-150"
												style={{ width: index === activeIndex ? `${progress}%` : "0%" }}
											/>
										</span>
										<span className="mt-3 block">{feature.title}</span>
									</button>
								</li>
							))}
						</ul>
						<div className="mt-8">
							<WaitlistButton className="w-full sm:w-auto">
								{tHero("cta")}
							</WaitlistButton>
						</div>
					</div>
					<div className="relative">
						<div className="absolute -inset-6 bg-white/10 blur-3xl" aria-hidden="true" />
						<div className="relative rounded-2xl border border-border bg-background/40 p-6 shadow-2xl backdrop-blur-sm h-full">
							<div className="aspect-[4/3] w-full rounded-xl border border-border bg-gradient-to-br from-muted/30 via-muted/10 to-transparent p-5">
								<div className="flex items-center gap-2">
									<span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
									<span className="h-2 w-16 rounded-full bg-muted-foreground/30" />
								</div>
								<div className="mt-6 space-y-3">
									<div className="h-3 w-3/5 rounded bg-muted-foreground/25" />
									<div className="h-3 w-4/5 rounded bg-muted-foreground/20" />
									<div className="h-3 w-2/5 rounded bg-muted-foreground/20" />
								</div>
								<div className="mt-8 grid grid-cols-3 gap-3">
									<div className="h-20 rounded-lg bg-muted/30" />
									<div className="h-20 rounded-lg bg-muted/30" />
									<div className="h-20 rounded-lg bg-muted/30" />
								</div>
							</div>
							{activeFeature && (
								<div className="pointer-events-none absolute inset-x-6 bottom-6 rounded-lg border border-border bg-background/80 p-4 text-sm text-muted-foreground backdrop-blur">
									{activeFeature.description}
								</div>
							)}
						</div>
					</div>
				</div>
				<div className="mt-10 border-l-2 border-primary pl-6 py-2 text-2xl font-serif italic text-foreground text-left">
					{t("closing")}
				</div>
			</div>
		</section>
	);
}
