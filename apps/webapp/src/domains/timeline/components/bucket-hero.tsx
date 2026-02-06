import { Sparkles, TrendingUp, ShieldCheck, Cog, cn } from "@hikai/ui";
import { DomainList, type DomainColorMap } from "./domain-list";

export type BucketCategoryCounts = {
	feature: number;
	improvement: number;
	fix: number;
	work: number;
};

interface BucketHeroProps {
	title: string;
	narrative?: string;
	categoryCounts: BucketCategoryCounts;
	productDomains: string[];
	impactedDomains: Set<string>;
	domainColorMap?: DomainColorMap;
	onToggleDomain?: (domain: string) => void;
	className?: string;
}

const categoryMeta = [
	{
		key: "feature",
		icon: Sparkles,
	},
	{
		key: "improvement",
		icon: TrendingUp,
	},
	{
		key: "fix",
		icon: ShieldCheck,
	},
	{
		key: "work",
		icon: Cog,
	},
] as const;

export function BucketHero({
	title,
	narrative,
	categoryCounts,
	productDomains,
	impactedDomains,
	domainColorMap,
	onToggleDomain,
	className,
}: BucketHeroProps) {
	const activeCategories = categoryMeta.filter(
		(meta) => categoryCounts[meta.key] > 0,
	);

	return (
		<div
			className={cn(
				"grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_auto]",
				className,
			)}
		>
			<div className="flex flex-col gap-4">
				<p className="text-2xl font-black leading-tight tracking-tight md:text-3xl">
					{title}
				</p>
				{narrative ? (
					<div className="flex items-stretch gap-3">
						<span className="w-0.5 rounded-full bg-primary/70 self-stretch" />
						<p className="text-sm italic text-muted-foreground md:text-base">
							{narrative}
						</p>
					</div>
				) : null}
				{activeCategories.length ? (
					<div className="flex flex-wrap items-center gap-3 text-fontSize-xs text-muted-foreground">
						{activeCategories.map((meta, index) => {
							const Icon = meta.icon;
							const count = categoryCounts[meta.key];
							const label =
								meta.key === "feature"
									? count === 1
										? "feature"
										: "features"
									: meta.key === "fix"
										? count === 1
											? "fix"
											: "fixes"
										: meta.key === "improvement"
											? count === 1
												? "improvement"
												: "improvements"
											: count === 1
												? "work item"
												: "work items";
							return (
								<div
									key={meta.key}
									className="flex items-center gap-1"
								>
									<Icon className="h-3.5 w-3.5" />
									<span>{`${count} ${label}`}</span>
									{index < activeCategories.length - 1 ? (
										<span className="text-muted-foreground">·</span>
									) : null}
								</div>
							);
						})}
					</div>
				) : null}
			</div>
			<DomainList
				domains={productDomains}
				activeDomains={impactedDomains}
				domainColorMap={domainColorMap}
				onToggleDomain={onToggleDomain}
				className="items-end md:items-start"
			/>
		</div>
	);
}
