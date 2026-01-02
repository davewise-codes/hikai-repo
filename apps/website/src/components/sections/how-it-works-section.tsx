"use client";

import {
	Badge,
	Button,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	cn,
} from "@hikai/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";

export function HowItWorksSection() {
	const t = useTranslations("HomePage.how");
	const tHero = useTranslations("HomePage.hero");

	const steps = [
		{
			id: "step-1",
			tabLabel: t("step1.tabLabel"),
			headline: t("step1.headline"),
			body: t("step1.body"),
			bullets: t.raw("step1.bullets") as string[],
			featureTitle: t("step1.feature.title"),
			featureDescription: t("step1.feature.description"),
			featureLinks: t.raw("step1.feature.links") as string[],
			imageSrc: "/how-it-works-step-1-v1.png",
			imageAlt: "Hikai sources connected preview",
			fallbackClassName: "from-amber-200/40 via-amber-100/10 to-transparent",
			overlaySlots: [
				{
					label: "Product intake",
					className: "from-amber-300/45 via-amber-100/20 to-transparent",
				},
				{
					label: "Source map",
					className: "from-orange-200/45 via-amber-100/20 to-transparent",
				},
				{
					label: "Baseline",
					className: "from-yellow-200/45 via-amber-100/20 to-transparent",
				},
			],
		},
		{
			id: "step-2",
			tabLabel: t("step2.tabLabel"),
			headline: t("step2.headline"),
			body: t("step2.body"),
			bullets: t.raw("step2.bullets") as string[],
			featureTitle: t("step2.feature.title"),
			featureDescription: t("step2.feature.description"),
			featureLinks: t.raw("step2.feature.links") as string[],
			imageSrc: "/how-it-works-step-2-v1.png",
			imageAlt: "Hikai content queue preview",
			fallbackClassName: "from-blue-200/35 via-slate-100/10 to-transparent",
			overlaySlots: [
				{
					label: "Event stream",
					className: "from-blue-300/40 via-slate-100/20 to-transparent",
				},
				{
					label: "Timeline view",
					className: "from-cyan-200/45 via-slate-100/20 to-transparent",
				},
				{
					label: "Audience lens",
					className: "from-sky-200/45 via-slate-100/20 to-transparent",
				},
			],
		},
		{
			id: "step-3",
			tabLabel: t("step3.tabLabel"),
			headline: t("step3.headline"),
			body: t("step3.body"),
			bullets: t.raw("step3.bullets") as string[],
			featureTitle: t("step3.feature.title"),
			featureDescription: t("step3.feature.description"),
			featureLinks: t.raw("step3.feature.links") as string[],
			imageSrc: "/how-it-works-step-3-v1.png",
			imageAlt: "Hikai editor workspace preview",
			fallbackClassName: "from-emerald-200/35 via-emerald-100/10 to-transparent",
			overlaySlots: [
				{
					label: "Draft flow",
					className: "from-emerald-300/40 via-emerald-100/20 to-transparent",
				},
				{
					label: "Audience switch",
					className: "from-lime-200/45 via-emerald-100/20 to-transparent",
				},
				{
					label: "Editorial line",
					className: "from-teal-200/45 via-emerald-100/20 to-transparent",
				},
			],
		},
		{
			id: "step-4",
			tabLabel: t("step4.tabLabel"),
			headline: t("step4.headline"),
			body: t("step4.body"),
			bullets: t.raw("step4.bullets") as string[],
			featureTitle: t("step4.feature.title"),
			featureDescription: t("step4.feature.description"),
			featureLinks: t.raw("step4.feature.links") as string[],
			imageSrc: "/how-it-works-step-4-v1.png",
			imageAlt: "Hikai publishing preview",
			fallbackClassName: "from-slate-200/35 via-slate-100/15 to-transparent",
			overlayClassName:
				"from-slate-950/80 via-slate-950/45 to-slate-950/70",
			overlaySlots: [
				{
					label: "Intent edit",
					className: "from-slate-300/40 via-slate-100/20 to-transparent",
				},
				{
					label: "Narrative shape",
					className: "from-neutral-200/45 via-slate-100/20 to-transparent",
				},
				{
					label: "Publish check",
					className: "from-stone-200/45 via-slate-100/20 to-transparent",
				},
			],
		}
	];

	const [activeStepId, setActiveStepId] = useState(steps[0]?.id);
	const [activeFeatureByStep, setActiveFeatureByStep] = useState<
		Record<string, number | null>
	>({});
	const activeStepIndex = useMemo(
		() => Math.max(0, steps.findIndex((step) => step.id === activeStepId)),
		[activeStepId, steps],
	);
	const canGoPrev = activeStepIndex > 0;
	const canGoNext = activeStepIndex < steps.length - 1;

	return (
		<section className="py-20 md:py-32">
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

				<Tabs
					value={activeStepId}
					onValueChange={(value) => setActiveStepId(value)}
					className="mx-auto max-w-5xl"
				>
					<div className="flex items-center justify-between border-b border-border pb-3 md:hidden">
						<div>
							<p className="text-fontSize-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
								{t("stepLabel")}
							</p>
							<p className="text-fontSize-sm font-semibold">
								{activeStepIndex + 1}. {steps[activeStepIndex]?.headline}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="icon"
								className="h-9 w-9"
								disabled={!canGoPrev}
								onClick={() =>
									canGoPrev && setActiveStepId(steps[activeStepIndex - 1].id)
								}
								aria-label="Previous step"
							>
								<span aria-hidden="true">‹</span>
							</Button>
							<Button
								variant="outline"
								size="icon"
								className="h-9 w-9"
								disabled={!canGoNext}
								onClick={() =>
									canGoNext && setActiveStepId(steps[activeStepIndex + 1].id)
								}
								aria-label="Next step"
							>
								<span aria-hidden="true">›</span>
							</Button>
						</div>
					</div>
					<TabsList className="hidden w-full flex-wrap gap-x-8 gap-y-2 border-b border-border bg-transparent p-0 h-auto justify-start md:flex md:justify-between">
						{steps.map((step, index) => (
							<TabsTrigger
								key={step.id}
								value={step.id}
								className="basis-1/2 sm:basis-0 flex-1 rounded-none bg-transparent px-0 py-4 text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-foreground"
							>
								<span className="mr-2 text-muted-foreground/70">
									{index + 1}
								</span>
								<span className="text-fontSize-sm font-semibold tracking-wide">
									{step.tabLabel}
								</span>
							</TabsTrigger>
						))}
					</TabsList>
					{steps.map((step, index) => {
						const activeFeatureIndex =
							activeFeatureByStep[step.id] ?? null;
						return (
							<TabsContent key={step.id} value={step.id} className="mt-10">
								<div className="grid grid-cols-1 lg:grid-cols-[0.65fr_1fr] gap-16 items-start">
									<div className="max-w-md">
										<p className="text-fontSize-sm font-semibold text-muted-foreground mb-3">
											{t("stepLabel")} {index + 1}
										</p>
										<h3 className="text-3xl font-semibold mb-4">
											{step.headline}
										</h3>
										<div className="text-muted-foreground leading-relaxed space-y-4">
											{step.body.split("\n\n").map((paragraph) => (
												<p key={paragraph}>{paragraph}</p>
											))}
										</div>
										<ul className="mt-6 space-y-2 text-muted-foreground">
											{step.bullets.map((item) => (
												<li key={item} className="flex items-start gap-2">
													<span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
													<span>{item}</span>
												</li>
											))}
										</ul>
										<Button size="lg" asChild className="mt-8">
											<Link href="#">
												{tHero("cta")}
											</Link>
										</Button>
									</div>
									<div className="rounded-3xl border border-border bg-muted/20">
										<div className="relative overflow-hidden rounded-t-3xl">
											<div className="absolute inset-0 z-10">
												<div
													className={cn(
														"absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/35 to-slate-950/60",
														step.overlayClassName,
													)}
												/>
												<div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:88px_88px] opacity-30" />
											</div>
											<div className="absolute left-0 right-0 top-0 z-20 p-5 text-white">
												<p className="text-fontSize-xs uppercase tracking-[0.16em] text-white/70 drop-shadow-[0_2px_6px_rgba(15,23,42,0.6)]">
													{step.featureTitle}
												</p>
												<p className="mt-2 text-fontSize-sm text-white/90 max-w-sm drop-shadow-[0_2px_6px_rgba(15,23,42,0.6)]">
													{step.featureDescription}
												</p>
											</div>
											<div className="relative z-0 aspect-[5/4] sm:aspect-[4/3] w-full min-h-[360px] sm:min-h-[420px]">
												{step.imageSrc ? (
													<Image
														src={step.imageSrc}
														alt={step.imageAlt || ""}
														width={1200}
														height={900}
														className="h-full w-full object-cover"
													/>
												) : (
													<div
														className={cn(
															"h-full w-full bg-gradient-to-br",
															step.fallbackClassName,
														)}
													/>
												)}
											</div>
											{activeFeatureIndex !== null && (
												<div className="absolute inset-x-6 bottom-6 z-10">
													<div
														className={cn(
															"rounded-2xl border border-white/30 bg-white/10 p-4 text-white backdrop-blur",
															"shadow-[0_12px_30px_rgba(15,23,42,0.35)]",
														)}
													>
														<div
															className={cn(
																"h-32 w-full rounded-xl border border-white/20 bg-gradient-to-br",
																step.overlaySlots[activeFeatureIndex]?.className,
															)}
														/>
														<p className="mt-4 text-fontSize-sm font-semibold">
															{step.featureLinks[activeFeatureIndex]}
														</p>
														<p className="text-fontSize-xs text-white/70">
															Preview placeholder
														</p>
													</div>
												</div>
											)}
										</div>
										<div className="rounded-b-3xl border-t border-border bg-background/70 px-6 py-5">
											<div className="grid grid-cols-3 text-fontSize-sm">
												{step.featureLinks.map((link, linkIndex) => (
													<button
														key={link}
														type="button"
														onClick={() =>
															setActiveFeatureByStep((prev) => ({
																...prev,
																[step.id]: linkIndex,
															}))
														}
														className={cn(
															"min-h-[52px] px-3 text-left transition-colors",
															activeFeatureIndex === linkIndex
																? "text-foreground"
																: "text-muted-foreground hover:text-foreground",
														)}
													>
														<span className="block leading-relaxed">{link}</span>
													</button>
												))}
											</div>
										</div>
									</div>
								</div>
							</TabsContent>
						);
					})}
				</Tabs>
			</div>
		</section>
	);
}
