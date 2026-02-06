import { Badge, Sparkles, TrendingUp, ShieldCheck, Cog, cn } from "@hikai/ui";
import type { DomainColorMap } from "./domain-list";

interface BucketCompactProps {
	title: string;
	categories: {
		feature: boolean;
		improvement: boolean;
		fix: boolean;
		work: boolean;
	};
	impactedDomains: string[];
	domainColorMap?: DomainColorMap;
	className?: string;
}

export function BucketCompact({
	title,
	categories,
	impactedDomains,
	domainColorMap,
	className,
}: BucketCompactProps) {
	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<div className="flex items-center justify-between gap-3">
				<p className="min-w-0 flex-1 truncate text-fontSize-sm font-semibold leading-snug">
					{title}
				</p>
				<div className="flex items-center gap-2 text-muted-foreground">
					{categories.feature ? <Sparkles className="h-3.5 w-3.5" /> : null}
					{categories.fix ? <ShieldCheck className="h-3.5 w-3.5" /> : null}
					{categories.improvement ? (
						<TrendingUp className="h-3.5 w-3.5" />
					) : null}
					{categories.work ? <Cog className="h-3.5 w-3.5" /> : null}
				</div>
			</div>
			{impactedDomains.length ? (
				<div className="flex flex-wrap gap-1.5 pt-1">
					{impactedDomains.map((domain) => {
						const color = domainColorMap?.[domain];
						return (
							<Badge
								key={domain}
								variant="outline"
								className="text-fontSize-2xs"
								style={
									color
										? {
												borderColor: color.border,
												backgroundColor: color.background,
												color: color.text,
											}
										: undefined
								}
							>
								{domain}
							</Badge>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
