import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Button,
	Badge,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
	cn,
	ChevronRight,
	ChevronDown,
	Sparkles,
	ShieldCheck,
	TrendingUp,
	Cog,
	X,
	Filter,
} from "@hikai/ui";
import type { DomainColorMap } from "./domain-list";
import { CapabilityEventRow } from "./capability-event-row";
import type { BrowserEventGroup, BrowserFilterState } from "../hooks/use-capabilities-browser-data";

interface CapabilitiesBrowserProps {
	groups: BrowserEventGroup[];
	domainColorMap: DomainColorMap;
	filters: BrowserFilterState;
	onFiltersChange: (next: BrowserFilterState) => void;
	productName: string;
	className?: string;
}

const categoryOptions = [
	{ key: "features", labelKey: "filters.features", icon: Sparkles },
	{ key: "improvements", labelKey: "filters.improvements", icon: TrendingUp },
	{ key: "fixes", labelKey: "filters.fixes", icon: ShieldCheck },
	{ key: "work", labelKey: "filters.work", icon: Cog },
] as const;

export function CapabilitiesBrowser({
	groups,
	domainColorMap,
	filters,
	onFiltersChange,
	productName,
	className,
}: CapabilitiesBrowserProps) {
	const { t } = useTranslation("timeline");
	const [expandedDomains, setExpandedDomains] = useState<Set<string>>(() => new Set());
	const [expandedCapabilities, setExpandedCapabilities] = useState<Set<string>>(
		() => new Set(),
	);


	const handleDomainToggle = (domain: string) => {
		setExpandedDomains((prev) => {
			const next = new Set(prev);
			if (next.has(domain)) {
				next.delete(domain);
			} else {
				next.add(domain);
			}
			return next;
		});
	};

	const handleCapabilityToggle = (domain: string, slug: string) => {
		const key = `${domain}::${slug}`;
		setExpandedCapabilities((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const updateFilters = (patch: Partial<BrowserFilterState>) => {
		onFiltersChange({ ...filters, ...patch });
	};
	const hasActiveFilters =
		filters.categories.length > 0 || filters.visibility.length > 0;

	return (
		<div className={cn("flex h-full min-h-0 flex-col", className)}>
			<div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
				<div className="flex flex-wrap items-center gap-3">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm">
								<Filter className="h-4 w-4" />
								<span className="text-fontSize-sm">{t("controls.filter")}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<div className="px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
								{t("filters.categories")}
							</div>
							{categoryOptions.map((option) => (
								<DropdownMenuCheckboxItem
									key={option.key}
									checked={filters.categories.includes(option.key)}
									onCheckedChange={() => {
										const exists = filters.categories.includes(option.key);
										updateFilters({
											categories: exists
												? filters.categories.filter((value) => value !== option.key)
												: [...filters.categories, option.key],
										});
									}}
									className="text-fontSize-sm"
								>
									<span className="mr-2 inline-flex items-center">
										<option.icon className="h-3 w-3" />
									</span>
									{t(option.labelKey)}
								</DropdownMenuCheckboxItem>
							))}
							<div className="my-1 border-t" />
							<div className="px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
								{t("filters.visibility")}
							</div>
							{(["public", "internal"] as const).map((value) => (
								<DropdownMenuCheckboxItem
									key={value}
									checked={filters.visibility.includes(value)}
									onCheckedChange={() => {
										const exists = filters.visibility.includes(value);
										updateFilters({
											visibility: exists
												? filters.visibility.filter((item) => item !== value)
												: [...filters.visibility, value],
										});
									}}
									className="text-fontSize-sm"
								>
									{t(`filters.${value}`)}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
					{hasActiveFilters ? (
						<div className="flex flex-wrap items-center gap-2 text-fontSize-xs text-muted-foreground">
							{filters.categories.map((category) => {
								const label = t(`filters.${category}`);
								return (
									<span
										key={category}
										className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5"
									>
										{label}
										<button
											type="button"
											onClick={() =>
												updateFilters({
													categories: filters.categories.filter((item) => item !== category),
												})
											}
											className="text-muted-foreground hover:text-foreground"
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								);
							})}
							{filters.visibility.map((value) => (
								<span
									key={value}
									className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5"
								>
									{t(`filters.${value}`)}
									<button
										type="button"
										onClick={() =>
											updateFilters({
												visibility: filters.visibility.filter((item) => item !== value),
											})
										}
										className="text-muted-foreground hover:text-foreground"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							))}
						</div>
					) : null}
				</div>
				<div className="text-right">
					<p className="text-lg font-extrabold tracking-tight">
						{t("browser.title", { product: productName })}
					</p>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto px-5 py-4">
				<div className="space-y-4">
					{groups.map((group) => {
						const isExpanded = expandedDomains.has(group.domain);
						const color = domainColorMap[group.domain];
						const hasEvents = group.totalCount > 0;
						return (
							<div key={group.domain}>
								<button
									type="button"
									onClick={() => handleDomainToggle(group.domain)}
									className={cn(
										"flex w-full items-center justify-between gap-3 text-left",
										hasEvents ? "" : "text-muted-foreground",
									)}
								>
									<div className="flex items-center gap-2">
										<Badge
											variant="outline"
											className={cn(
												"text-fontSize-2xs",
												"group flex items-center gap-1",
												!group.activeInBucket &&
													"border-muted-foreground/20 bg-muted/10 text-muted-foreground/70 opacity-60",
											)}
											style={
												group.activeInBucket && color
													? {
														borderColor: color.border,
														backgroundColor: color.background,
														color: color.text,
													}
													: undefined
											}
										>
											{group.domain}
										</Badge>
									</div>
									<div className="flex items-center gap-2 text-fontSize-xs text-muted-foreground">
										{group.totalCount} {t("browser.events")}
										{isExpanded ? (
											<ChevronDown className="h-3.5 w-3.5" />
										) : (
											<ChevronRight className="h-3.5 w-3.5" />
										)}
									</div>
								</button>
								{isExpanded ? (
									<div className="mt-3 space-y-3 pl-5">
										{group.capabilities.map((capability) => {
											const key = `${group.domain}::${capability.slug}`;
											const isCapExpanded = expandedCapabilities.has(key);
											const hasCapEvents = capability.count > 0;
											return (
												<div key={capability.slug}>
													<button
														type="button"
														onClick={() =>
														handleCapabilityToggle(group.domain, capability.slug)
													}
													className={cn(
														"flex w-full items-center justify-between gap-3 text-left",
														hasCapEvents ? "" : "text-muted-foreground",
													)}
												>
													<div className="flex items-center gap-2">
														{isCapExpanded ? (
															<ChevronDown className="h-3.5 w-3.5" />
														) : (
															<ChevronRight className="h-3.5 w-3.5" />
														)}
														<span
															className={cn(
																"text-fontSize-sm",
																hasCapEvents
																	? "font-medium text-foreground"
																	: "text-muted-foreground/50",
															)}
														>
															{capability.name}
														</span>
														<span
															className={cn(
																"text-fontSize-xs",
																hasCapEvents
																	? "text-muted-foreground"
																	: "text-muted-foreground/40",
															)}
														>
															{capability.count} {t("browser.events")}
														</span>
													</div>
												</button>
												{isCapExpanded ? (
													<div className="mt-2 space-y-3 pl-6">
														{capability.events.map((event) => (
															<div key={event._id}>
																<CapabilityEventRow event={event} />
															</div>
														))}
													</div>
												) : null}
												</div>
											);
										})}
									</div>
								) : null}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
