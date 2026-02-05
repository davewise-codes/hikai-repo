import { useTranslations } from "next-intl";

export function ContextSection() {
	const t = useTranslations("HomePage.context");
	const body = t.raw("body") as string[];

	return (
		<section className="relative py-20 md:py-24 text-white">
			<div className="absolute inset-0">
				<div className="absolute inset-0 bg-[url('/why-hikai-bg-v2.png')] bg-cover bg-center" />
				<div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/75 to-slate-950/90" />
				<div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:88px_88px] opacity-20" />
			</div>
			<div className="container relative z-10 max-w-2xl mx-auto px-6 sm:px-8 text-center">
				<h2 className="text-4xl md:text-5xl lg:text-6xl font-black">{t("title")}</h2>
				<div className="mt-6 space-y-6 text-lg text-white/80 leading-relaxed">
					{body.map((paragraph) => (
						<p key={paragraph}>{paragraph}</p>
					))}
				</div>
				<div className="mt-12 border-t border-white/20 pt-8">
					<p className="text-3xl font-serif italic text-white">{t("closing")}</p>
				</div>
			</div>
		</section>
	);
}
