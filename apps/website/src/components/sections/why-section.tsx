import { Badge } from "@hikai/ui";
import { useTranslations } from "next-intl";

export function WhySection() {
	const t = useTranslations("HomePage.why");
	const body = t.raw("body") as string[];
	const icps = t.raw("icps") as Array<{ title: string; description: string }>;

	return (
		<section className="relative py-20 md:py-24 text-white">
			<div className="absolute inset-0">
				<div className="absolute inset-0 bg-[url('/why-hikai-bg-v2.png')] bg-cover bg-center" />
				<div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/75 to-slate-950/90" />
				<div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:88px_88px] opacity-20" />
			</div>
			<div className="container relative z-10 max-w-6xl mx-auto px-6 sm:px-8">
				<div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 items-stretch">
					<div className="flex flex-col">
						<Badge variant="secondary" className="mb-6 inline-flex w-fit bg-primary text-primary-foreground border border-primary/40 text-xs tracking-wide">
							{t("badge")}
						</Badge>
						<h2 className="text-4xl md:text-5xl lg:text-6xl font-black">
							{t.rich("title", {
								italic: (chunks) => <span className="italic">{chunks}</span>
							})}
						</h2>
						<div className="mt-10 border-l-2 border-primary pl-6 py-2 text-2xl font-serif italic text-white max-w-3xl">
							{t("closing")}
						</div>
					</div>
					<div className="flex flex-col justify-between gap-6 text-lg text-white/80 leading-relaxed">
						{body.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>
				</div>
				<div className="mt-16">
					<Badge variant="secondary" className="mb-6 inline-flex w-fit bg-primary text-primary-foreground border border-primary/40 text-xs tracking-wide">
						{t("icpBadge")}
					</Badge>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
						{icps.map((icp) => (
							<div key={icp.title} className="rounded-xl border border-white/20 bg-white/5 p-6 backdrop-blur">
								<h3 className="text-lg font-semibold mb-3">{icp.title}</h3>
								<p className="text-white/80">{icp.description}</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
