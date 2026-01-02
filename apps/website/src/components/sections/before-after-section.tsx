import { Badge } from "@hikai/ui";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function BeforeAfterSection() {
	const t = useTranslations("HomePage.beforeAfter");

	return (
		<section className="relative py-16 md:py-24">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[size:20px_20px] opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)]" />
				<div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-transparent" />
			</div>
			<div className="container max-w-6xl mx-auto px-6 sm:px-8 relative">
				<div className="text-center mb-16">
					<Badge variant="secondary" className="mb-6">
						{t("badge")}
					</Badge>
					<h2 className="font-sans font-black text-3xl md:text-4xl lg:text-5xl mb-6 leading-tight">
						{t.rich("title", {
							highlight: (chunks) => (
								<span className="text-primary font-serif italic">
									{chunks}
								</span>
							),
						})}
					</h2>
					<p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
						{t("subtitle")}
					</p>
				</div>

				<div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-muted/20">
					<div className="grid grid-cols-1">
						<div className="relative">
							<div className="hidden md:grid grid-cols-[180px_1fr] gap-8 p-8 text-white absolute inset-0 z-20">
								<p className="text-fontSize-sm uppercase tracking-[0.14em] text-white/70">
									{t("stateA.label")}
								</p>
								<div>
									<p className="text-2xl font-semibold mb-3">
										{t("stateA.headline")}
									</p>
									<div className="text-white/80 leading-relaxed max-w-lg space-y-2">
										{(t.raw("stateA.body") as string[]).map((line) => (
											<p key={line}>{line}</p>
										))}
									</div>
								</div>
							</div>
							<div className="relative h-[360px] md:h-[420px]">
								<Image
									src="/visibility-shift-state-1-v1.png"
									alt="Fragmented product progress"
									fill
									className="object-cover"
								/>
								<div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-950/80 via-slate-950/45 to-slate-950/70" />
								<div className="absolute inset-0 z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:88px_88px] opacity-25" />
								<div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-950/50 via-slate-900/30 to-slate-800/20" />
							</div>
							<div className="md:hidden px-6 py-8">
								<p className="text-fontSize-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
									{t("stateA.label")}
								</p>
								<p className="text-2xl font-semibold mb-3">
									{t("stateA.headline")}
								</p>
								<div className="text-muted-foreground leading-relaxed space-y-2">
									{(t.raw("stateA.body") as string[]).map((line) => (
										<p key={line}>{line}</p>
									))}
								</div>
							</div>
						</div>
						<div className="relative border-t border-border">
							<div className="hidden md:grid grid-cols-[180px_1fr] gap-8 p-8 text-white absolute inset-0 z-20">
								<p className="text-fontSize-sm uppercase tracking-[0.14em] text-white/70">
									{t("stateB.label")}
								</p>
								<div>
									<p className="text-2xl font-semibold mb-3">
										{t("stateB.headline")}
									</p>
									<div className="text-white/80 leading-relaxed max-w-lg space-y-2">
										{(t.raw("stateB.body") as string[]).map((line) => (
											<p key={line}>{line}</p>
										))}
									</div>
								</div>
							</div>
							<div className="relative h-[360px] md:h-[420px]">
								<Image
									src="/visibility-shift-state-2-v1.png"
									alt="Structured product progress"
									fill
									className="object-cover"
								/>
								<div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-950/70 via-slate-950/35 to-slate-950/55" />
								<div className="absolute inset-0 z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:88px_88px] opacity-30" />
								<div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-900/35 via-slate-800/15 to-slate-700/15" />
							</div>
							<div className="md:hidden px-6 py-8">
								<p className="text-fontSize-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
									{t("stateB.label")}
								</p>
								<p className="text-2xl font-semibold mb-3">
									{t("stateB.headline")}
								</p>
								<div className="text-muted-foreground leading-relaxed space-y-2">
									{(t.raw("stateB.body") as string[]).map((line) => (
										<p key={line}>{line}</p>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
