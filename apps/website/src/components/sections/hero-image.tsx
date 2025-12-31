export function HeroImage() {
	return (
		<div className="relative w-full">
			<div className="absolute -inset-6 bg-white/10 blur-3xl" aria-hidden="true" />
			<div className="relative rounded-2xl border border-white/15 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
				<div className="aspect-[16/10] w-full rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-5">
					<div className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full bg-white/60" />
						<span className="h-2 w-16 rounded-full bg-white/30" />
					</div>
					<div className="mt-6 space-y-3">
						<div className="h-3 w-3/5 rounded bg-white/25" />
						<div className="h-3 w-4/5 rounded bg-white/20" />
						<div className="h-3 w-2/5 rounded bg-white/20" />
					</div>
					<div className="mt-8 grid grid-cols-3 gap-3">
						<div className="h-20 rounded-lg bg-white/10" />
						<div className="h-20 rounded-lg bg-white/10" />
						<div className="h-20 rounded-lg bg-white/10" />
					</div>
				</div>
			</div>
		</div>
	);
}
