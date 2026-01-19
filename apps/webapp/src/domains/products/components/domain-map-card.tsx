import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@hikai/ui";

type DomainMap = {
	domains?: Array<{
		name?: string;
		responsibility?: string;
		weight?: number;
		evidence?: string[];
	}>;
	summary?: {
		totalDomains?: number;
		warnings?: string[];
	};
};

const DEFAULT_WEIGHT = 0;

export function DomainMapCard({
	domainMap,
	isRefreshing,
}: {
	domainMap?: DomainMap | null;
	isRefreshing?: boolean;
}) {
	const { t } = useTranslation("products");
	const domains = domainMap?.domains ?? [];
	const summary = useMemo(() => {
		const warnings = domainMap?.summary?.warnings ?? [];
		const totalDomains = domainMap?.summary?.totalDomains ?? domains.length;
		return { warnings, totalDomains };
	}, [domainMap, domains.length]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-fontSize-lg">
					{t("context.domainMapTitle")}
				</CardTitle>
				<p className="text-fontSize-sm text-muted-foreground">
					{t("context.domainMapSubtitle")}
				</p>
			</CardHeader>
			<CardContent className="space-y-4">
				{isRefreshing ? (
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.domainMapRefreshing")}
					</p>
				) : domains.length === 0 ? (
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.domainMapEmpty")}
					</p>
				) : (
					<div className="space-y-4">
						<div className="space-y-3">
							{domains.map((domain, index) => (
								<div
									key={`${domain.name ?? "domain"}-${index}`}
									className="rounded-md border border-border p-3"
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="text-fontSize-sm font-medium">
											{domain.name ?? t("context.domainMapUnknown")}
										</div>
										<Badge variant="outline">
											{t("context.domainMapWeight", {
												value: formatWeight(domain.weight ?? DEFAULT_WEIGHT),
											})}
										</Badge>
									</div>
									{domain.responsibility ? (
										<p className="mt-1 text-fontSize-xs text-muted-foreground">
											{t("context.domainMapResponsibility", {
												value: domain.responsibility,
											})}
										</p>
									) : null}
									<EvidenceList evidence={domain.evidence} />
								</div>
							))}
						</div>
						<div className="rounded-md border border-border px-3 py-2 text-fontSize-xs text-muted-foreground">
							<div className="font-medium text-muted-foreground">
								{t("context.domainMapSummaryTitle")}
							</div>
							<div className="mt-1">
								{t("context.domainMapSummaryDomains", {
									count: summary.totalDomains,
								})}
							</div>
							<div className="mt-2">
								<div className="font-medium text-muted-foreground">
									{t("context.domainMapSummaryWarnings")}
								</div>
								{summary.warnings.length === 0 ? (
									<p className="mt-1 text-muted-foreground">
										{t("context.domainMapSummaryNoWarnings")}
									</p>
								) : (
									<ul className="mt-1 space-y-1 text-warning">
										{summary.warnings.map((warning, warningIndex) => (
											<li key={`${warning}-${warningIndex}`}>• {warning}</li>
										))}
									</ul>
								)}
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function EvidenceList({ evidence }: { evidence?: string[] }) {
	const { t } = useTranslation("products");
	const items = evidence ?? [];

	return (
		<details className="mt-3 rounded-md border border-border px-3 py-2">
			<summary className="cursor-pointer text-fontSize-xs font-medium text-muted-foreground">
				{t("context.domainMapEvidence", { count: items.length })}
			</summary>
			{items.length === 0 ? (
				<p className="mt-2 text-fontSize-xs text-muted-foreground">
					{t("context.domainMapEvidenceEmpty")}
				</p>
			) : (
				<ul className="mt-2 space-y-1 text-fontSize-xs text-muted-foreground">
					{items.map((item, index) => (
						<li key={`${item}-${index}`}>• {item}</li>
					))}
				</ul>
			)}
		</details>
	);
}

function formatWeight(value: number) {
	return `${Math.round(value * 100)}%`;
}
