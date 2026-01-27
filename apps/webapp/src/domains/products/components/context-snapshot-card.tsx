import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, toast } from "@hikai/ui";
import { formatRelativeDate, formatShortDate } from "@/domains/shared/utils";

type SnapshotAgentRuns = {
	contextAgent?: string;
	structureScout?: string;
	glossaryScout?: string;
	domainMapper?: string;
	featureScout?: string;
};

type ContextSnapshot = {
	_id: string;
	status?: "in_progress" | "completed" | "failed" | "partial";
	createdAt?: number;
	generatedBy?: "manual" | "contextAgent" | "scheduled";
	triggerReason?: "initial_setup" | "source_change" | "manual_refresh";
	completedPhases?: Array<"structure" | "glossary" | "domains" | "features">;
	errors?: SnapshotError[];
	agentRuns?: SnapshotAgentRuns;
	repoStructure?: Record<string, unknown> | null;
	glossary?: Record<string, unknown> | null;
	domainMap?: Record<string, unknown> | null;
	features?: Record<string, unknown> | null;
};

export function ContextSnapshotCard({
	snapshot,
	isDirty,
}: {
	snapshot: ContextSnapshot | null | undefined;
	isDirty?: boolean;
}) {
	const { t, i18n } = useTranslation("products");
	const locale = i18n.language ?? "en";

	if (!snapshot) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-fontSize-lg">
						{t("context.contextSnapshotTitle")}
					</CardTitle>
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.contextSnapshotSubtitle")}
					</p>
				</CardHeader>
				<CardContent>
					<p className="text-fontSize-sm text-muted-foreground">
						{t("context.contextSnapshotEmpty")}
					</p>
				</CardContent>
			</Card>
		);
	}

	const createdAt = snapshot.createdAt;
	const createdLabel =
		createdAt !== undefined
			? `${formatShortDate(createdAt, locale)} · ${formatRelativeDate(
					createdAt,
					locale,
				)}`
			: t("context.contextSnapshotUnknown");

	const handleCopy = async (payload: Record<string, unknown>) => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
			toast.success(t("context.contextSnapshotCopySuccess"));
		} catch {
			toast.error(t("context.contextSnapshotCopyError"));
		}
	};

	const snapshotPayload = snapshot as Record<string, unknown>;
	const repoStructure = snapshot.repoStructure ?? null;
	const glossary = snapshot.glossary ?? null;
	const domainMap = snapshot.domainMap ?? null;
	const features = snapshot.features ?? null;

	return (
		<Card>
			<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<CardTitle className="text-fontSize-lg">
					{t("context.contextSnapshotTitle")}
				</CardTitle>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={statusToVariant(snapshot.status)}>
						{snapshot.status ?? t("context.contextSnapshotUnknown")}
					</Badge>
					{isDirty ? (
						<Badge variant="destructive">
							{t("context.contextSnapshotDirty")}
						</Badge>
					) : null}
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleCopy(snapshotPayload)}
					>
						{t("context.contextSnapshotCopyAll")}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="text-fontSize-xs text-muted-foreground">
					{t("context.contextSnapshotCreated", { value: createdLabel })}
				</div>

				<OutputSection
					title={t("context.contextSnapshotOutputStructure")}
					subtitle={t("context.contextSnapshotOutputStructureHint", {
						count: Array.isArray((repoStructure as any)?.tiles)
							? (repoStructure as any).tiles.length
							: 0,
					})}
					payload={repoStructure}
					onCopy={handleCopy}
					copyLabel={t("context.contextSnapshotCopySection")}
					emptyLabel={t("context.contextSnapshotOutputEmpty")}
				>
					{repoStructure ? (
						<div className="space-y-2 text-fontSize-xs text-muted-foreground">
							<div>
								{t("context.contextSnapshotOutputRepoShape", {
									value: (repoStructure as any).repoShape ?? "-",
								})}
							</div>
							<div>
								{t("context.contextSnapshotOutputTechStack", {
									value: formatTechStack((repoStructure as any).techStack),
								})}
							</div>
							<div>
								{t("context.contextSnapshotOutputEntryPoints", {
									count: Array.isArray((repoStructure as any).entryPoints)
										? (repoStructure as any).entryPoints.length
										: 0,
								})}
							</div>
							<div>
								{t("context.contextSnapshotOutputConfidence", {
									value: (repoStructure as any).confidence ?? "-",
								})}
							</div>
						</div>
					) : null}
				</OutputSection>

				<OutputSection
					title={t("context.contextSnapshotOutputGlossary")}
					subtitle={t("context.contextSnapshotOutputGlossaryHint", {
						count: Array.isArray((glossary as any)?.terms)
							? (glossary as any).terms.length
							: 0,
					})}
					payload={glossary}
					onCopy={handleCopy}
					copyLabel={t("context.contextSnapshotCopySection")}
					emptyLabel={t("context.contextSnapshotOutputEmpty")}
				/>

				<OutputSection
					title={t("context.contextSnapshotOutputDomainMap")}
					subtitle={t("context.contextSnapshotOutputDomainMapHint", {
						count: Array.isArray((domainMap as any)?.domains)
							? (domainMap as any).domains.length
							: 0,
					})}
					payload={domainMap}
					onCopy={handleCopy}
					copyLabel={t("context.contextSnapshotCopySection")}
					emptyLabel={t("context.contextSnapshotOutputEmpty")}
				>
					{domainMap && Array.isArray((domainMap as any).domains) ? (
						<div className="space-y-3">
							{(domainMap as any).domains.map(
								(domain: any, index: number) => (
									<div
										key={`${domain?.name ?? "domain"}-${index}`}
										className="rounded-md border border-border px-3 py-2 text-fontSize-xs"
									>
										<div className="flex items-center justify-between gap-2">
											<span className="font-medium">
												{domain?.name ?? t("context.domainMapUnknown")}
											</span>
											<Badge variant="outline">
												{t("context.domainMapWeight", {
													value: formatWeight(domain?.weight ?? 0),
												})}
											</Badge>
										</div>
										{domain?.responsibility ? (
											<div className="mt-1 text-muted-foreground">
												{domain.responsibility}
											</div>
										) : null}
									</div>
								),
							)}
						</div>
					) : null}
				</OutputSection>

				<OutputSection
					title={t("context.contextSnapshotOutputFeatures")}
					subtitle={t("context.contextSnapshotOutputFeaturesHint", {
						count: Array.isArray((features as any)?.features)
							? (features as any).features.length
							: 0,
					})}
					payload={features}
					onCopy={handleCopy}
					copyLabel={t("context.contextSnapshotCopySection")}
					emptyLabel={t("context.contextSnapshotOutputEmpty")}
				/>
			</CardContent>
		</Card>
	);
}

function statusToVariant(status?: string) {
	if (status === "failed") return "destructive";
	if (status === "partial") return "outline";
	if (status === "completed") return "secondary";
	return "outline";
}

function OutputSection({
	title,
	subtitle,
	payload,
	onCopy,
	copyLabel,
	emptyLabel,
	children,
}: {
	title: string;
	subtitle?: string;
	payload: Record<string, unknown> | null;
	onCopy: (payload: Record<string, unknown>) => void;
	copyLabel: string;
	emptyLabel: string;
	children?: ReactNode;
}) {
	return (
		<div className="rounded-md border border-border px-3 py-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<div className="text-fontSize-xs font-medium text-muted-foreground">
						{title}
					</div>
					{subtitle ? (
						<div className="text-fontSize-xs text-muted-foreground/70">
							{subtitle}
						</div>
					) : null}
				</div>
				<Button
					variant="outline"
					size="sm"
					disabled={!payload}
					onClick={() => payload && onCopy(payload)}
				>
					{copyLabel}
				</Button>
			</div>
			<div className="mt-3">
				{payload ? (
					children ?? (
						<pre className="max-h-56 overflow-auto rounded-md border border-border bg-muted px-3 py-2 text-fontSize-xs text-muted-foreground">
							{JSON.stringify(payload, null, 2)}
						</pre>
					)
				) : (
					<p className="text-fontSize-xs text-muted-foreground">
						{emptyLabel}
					</p>
				)}
			</div>
		</div>
	);
}

function formatTechStack(techStack?: Record<string, unknown>): string {
	if (!techStack || typeof techStack !== "object") return "-";
	const parts = ["language", "framework", "runtime", "buildTool"]
		.map((key) => {
			const value = (techStack as Record<string, unknown>)[key];
			return typeof value === "string" ? value : null;
		})
		.filter(Boolean) as string[];
	return parts.length > 0 ? parts.join(" · ") : "-";
}

function formatWeight(value: number) {
	return `${Math.round(value * 100)}%`;
}
