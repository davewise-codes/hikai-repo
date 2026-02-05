import Image from "next/image";
import { Badge, cn } from "@hikai/ui";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

function ImpactState({
	imageSrc,
	label,
	headline,
	bullets,
	isLight,
	children,
	className,
}: {
	imageSrc: string;
	label: string;
	headline: string;
	bullets: string[];
	isLight?: boolean;
	children?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("relative w-full overflow-hidden", className)}>
			<Image src={imageSrc} alt="" fill className="object-cover" priority={false} />
			<div
				className={cn(
					"absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/45 to-slate-950/70",
					isLight && "from-slate-950/60 via-slate-950/35 to-slate-950/55"
				)}
			/>
			<div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:88px_88px] opacity-30" />
			<div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-900/30 to-slate-800/20" />
			<div className="relative z-10 p-6 md:p-10 text-white">
				<p className="text-xs uppercase tracking-[0.14em] text-white/70">{label}</p>
				<h3 className="mt-3 text-2xl font-semibold">{headline}</h3>
				<ul className="mt-4 space-y-2 text-white/85">
					{bullets.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
				{children}
			</div>
		</div>
	);
}

export function ImpactSection() {
	const t = useTranslations("HomePage.impact");
	const stateABullets = t.raw("stateA.bullets") as string[];
	const stateBBullets = t.raw("stateB.bullets") as string[];

	return (
		<section className="bg-muted/20 py-20 md:py-24">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8">
				<div className="text-center">
					<Badge variant="secondary" className="mb-6 bg-primary text-primary-foreground border border-primary/40 text-xs tracking-wide">
						{t("badge")}
					</Badge>
					<h2 className="text-4xl md:text-5xl lg:text-6xl font-black">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
						{t("subtitle")}
					</p>
				</div>
				<div className="mt-12 rounded-3xl border border-border overflow-hidden">
					<ImpactState
						imageSrc="/visibility-shift-state-1-v1.png"
						label={t("stateA.label")}
						headline={t("stateA.headline")}
						bullets={stateABullets}
						className="min-h-[260px] md:min-h-[320px]"
					/>
					<div className="h-px bg-border" />
					<ImpactState
						imageSrc="/visibility-shift-state-2-v1.png"
						label={t("stateB.label")}
						headline={t("stateB.headline")}
						bullets={stateBBullets}
						isLight
						className="min-h-[320px] md:min-h-[420px]"
					>
						<p className="mt-6 text-lg font-serif italic text-white">
							{t("stateB.quote")}
						</p>
						<p className="mt-4 font-semibold text-white">{t("stateB.punch")}</p>
					</ImpactState>
				</div>
			</div>
		</section>
	);
}
