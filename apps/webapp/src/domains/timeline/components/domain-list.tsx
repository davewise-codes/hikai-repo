import { Badge, cn } from "@hikai/ui";

export type DomainColorMap = Record<
	string,
	{
		border: string;
		background: string;
		text: string;
		dot: string;
	}
>;

interface DomainListProps {
	domains: string[];
	activeDomains: Set<string>;
	domainColorMap?: DomainColorMap;
	onToggleDomain?: (domain: string) => void;
	className?: string;
}

export function DomainList({
	domains,
	activeDomains,
	domainColorMap,
	onToggleDomain,
	className,
}: DomainListProps) {
	if (!domains.length) return null;

	return (
		<div className={cn("flex flex-col items-end gap-2", className)}>
			{domains.map((domain) => {
				const isActive = activeDomains.has(domain);
				const color = domainColorMap?.[domain];
				const isClickable = typeof onToggleDomain === "function";
				return (
					<Badge
						key={domain}
						variant="outline"
						role={isClickable ? "button" : undefined}
						tabIndex={isClickable ? 0 : undefined}
						onClick={
							isClickable ? () => onToggleDomain(domain) : undefined
						}
						onKeyDown={
							isClickable
								? (event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										onToggleDomain(domain);
									}
								}
								: undefined
						}
						className={cn(
							"text-fontSize-2xs",
							isClickable ? "cursor-pointer" : "cursor-default",
							!isActive &&
								"border-muted-foreground/20 bg-muted/10 text-muted-foreground/70 opacity-60",
						)}
						style={
							isActive && color
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
	);
}
