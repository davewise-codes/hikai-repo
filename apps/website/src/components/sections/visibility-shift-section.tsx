import Image from "next/image";
import { Badge, cn } from "@hikai/ui";
import { useTranslations } from "next-intl";

function VisibilityState({
	imageSrc,
	label,
	headline,
	bullets,
	isLight,
}: {
	imageSrc: string;
	label: string;
	headline: string;
	bullets: string[];
	isLight?: boolean;
}) {
	return (
		<div>
			<div className="relative min-h-[280px] md:min-h-[420px] overflow-hidden">
				<Image src={imageSrc} alt="" fill className="object-cover" priority={false} />
				<div
					className={cn(
						"absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/45 to-slate-950/70",
						isLight && "from-slate-950/60 via-slate-950/35 to-slate-950/55"
					)}
				/>
				<div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:88px_88px] opacity-30" />
				<div
					className={cn(
						"absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-900/30 to-slate-800/20",
						isLight && "from-slate-900/35 via-slate-900/20 to-slate-800/15"
					)}
				/>
				<div className="relative z-10 hidden md:grid grid-cols-[180px_1fr] gap-8 p-8 text-white">
					<div>
						<p className="text-xs uppercase tracking-[0.14em] text-white/70">{label}</p>
					</div>
					<div>
						<h3 className="text-2xl font-semibold mb-3">{headline}</h3>
						<ul className="space-y-2 text-white/80">
							{bullets.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</div>
				</div>
			</div>
			<div className="md:hidden bg-background/95 border-t border-border px-6 py-6">
				<p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
				<h3 className="mt-2 text-xl font-semibold">{headline}</h3>
				<ul className="mt-3 space-y-2 text-muted-foreground">
					{bullets.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			</div>
		</div>
	);
}

export function VisibilityShiftSection() {
	const t = useTranslations("HomePage.visibility");
	const stateABody = t.raw("stateA.body") as string[];
	const stateBBody = t.raw("stateB.body") as string[];

	return (
		<section className="bg-muted/20 py-20 md:py-24">
			<div className="container max-w-6xl mx-auto px-6 sm:px-8">
				<div className="text-center mb-16">
					<Badge variant="secondary" className="mb-6 text-xs uppercase tracking-[0.2em]">
						{t("badge")}
					</Badge>
					<h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
						{t("title")}
					</h2>
					<p className="text-lg text-muted-foreground max-w-3xl mx-auto">
						{t("subtitle")}
					</p>
				</div>
				<div className="max-w-5xl mx-auto rounded-3xl border border-border bg-muted/20 overflow-hidden">
					<VisibilityState
						imageSrc="/visibility-shift-state-1-v1.png"
						label={t("stateA.label")}
						headline={t("stateA.headline")}
						bullets={stateABody}
					/>
					<div className="h-px bg-border" />
					<VisibilityState
						imageSrc="/visibility-shift-state-2-v1.png"
						label={t("stateB.label")}
						headline={t("stateB.headline")}
						bullets={stateBBody}
						isLight
					/>
				</div>
			</div>
		</section>
	);
}
