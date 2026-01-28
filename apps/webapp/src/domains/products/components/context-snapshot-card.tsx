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
	contextDetail?: Record<string, unknown> | null;
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
	const contextDetail = snapshot.contextDetail ?? null;
	const technical = (contextDetail as any)?.technical ?? null;
	const domains = Array.isArray((contextDetail as any)?.domains)
		? ((contextDetail as any).domains as Array<Record<string, unknown>>)
		: [];
	const features = Array.isArray((contextDetail as any)?.features)
		? ((contextDetail as any).features as Array<Record<string, unknown>>)
		: [];
	const language = (contextDetail as any)?.language ?? null;
	const meta = (contextDetail as any)?.meta ?? null;

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
					title={t("context.contextSnapshotOutputContextDetail")}
					subtitle={t("context.contextSnapshotOutputContextDetailHint")}
					payload={contextDetail}
					onCopy={handleCopy}
					copyLabel={t("context.contextSnapshotCopySection")}
					emptyLabel={t("context.contextSnapshotOutputEmpty")}
				/>

				<OutputSection
					title={t("context.contextSnapshotOutputTechnical")}
					subtitle={t("context.contextSnapshotOutputTechnicalHint", {
						count: Array.isArray((technical as any)?.stack)
							? (technical as any).stack.length
							: 0,
					})}
					payload={technical}
					onCopy={handleCopy}
					copyLabel={t("context.contextSnapshotCopySection")}
					emptyLabel={t("context.contextSnapshotOutputEmpty")}
				>
					{technical ? (
						<div className="space-y-2 text-fontSize-xs text-muted-foreground">
							<div>
								{t("context.contextSnapshotOutputTechnicalStack", {
									value: formatList((technical as any).stack),
								})}
							</div>
							<div>
								{t("context.contextSnapshotOutputTechnicalPatterns", {
									value: formatList((technical as any).patterns),
								})}
							</div>
							<div>
								{t("context.contextSnapshotOutputTechnicalRoots", {
									value: formatList((technical as any).rootDirs),
								})}
							</div>
							<div>
								{t("context.contextSnapshotOutputTechnicalEntryPoints", {
									value: formatList((technical as any).entryPoints),
								})}
							</div>
							<div>
								{t("context.contextSnapshotOutputTechnicalIntegrations", {
									value: formatList((technical as any).integrations),
								})}
							</div>
						</div>
					) : null}
				</OutputSection>

				<OutputSection
					title={t("context.contextSnapshotOutputDomains")}
					subtitle={t("context.contextSnapshotOutputDomainsHint", {
						count: domains.length,
					})}
					payload={contextDetail}
					onCopy={handleCopy}
					copyLabel={t("context.contextSnapshotCopySection")}
					emptyLabel={t("context.contextSnapshotOutputEmpty")}
				>
					{domains.length > 0 ? (
						<div className="space-y-3">
							{domains.map((domain, index) => (
								<div
									key={`${domain.name ?? "domain"}-${index}`}
									className="rounded-md border border-border px-3 py-2 text-fontSize-xs"
								>
									<div className="font-medium">
										{typeof domain.name === "string" ? domain.name : "-"}
									</div>
									{typeof domain.purpose === "string" ? (
										<div className="mt-1 text-muted-foreground">
											{domain.purpose}
										</div>
									) : null}
								</div>
							))}
						</div>
					) : null}
				</OutputSection>

				<OutputSection
					title={t("context.contextSnapshotOutputFeatures")}
					subtitle={t("context.contextSnapshotOutputFeaturesHint", {
						count: features.length,
					})}
					payload={contextDetail}
					onCopy={handleCopy}
					copyLabel={t("context.contextSnapshotCopySection")}
					emptyLabel={t("context.contextSnapshotOutputEmpty")}
				>
					{features.length > 0 ? (
						<div className="space-y-3">
							{features.map((feature, index) => (
								<div
									key={`${feature.name ?? "feature"}-${index}`}
									className="rounded-md border border-border px-3 py-2 text-fontSize-xs"
								>
									<div className="font-medium">
										{typeof feature.name === "string" ? feature.name : "-"}
									</div>
									{typeof feature.description === "string" ? (
										<div className="mt-1 text-muted-foreground">
											{feature.description}
										</div>
									) : null}
								</div>
							))}
						</div>
					) : null}
				</OutputSection>

				<OutputSection
					title={t("context.contextSnapshotOutputLanguage")}
					subtitle={t("context.contextSnapshotOutputLanguageHint", {
						count: Array.isArray((language as any)?.glossary)
							? (language as any).glossary.length
							: 0,
					})}
					payload={language}
					onCopy={handleCopy}
					copyLabel={t("context.contextSnapshotCopySection")}
					emptyLabel={t("context.contextSnapshotOutputEmpty")}
				>
					{language ? (
						<div className="space-y-2 text-fontSize-xs text-muted-foreground">
							<div>
								{t("context.contextSnapshotOutputLanguageConventions", {
									value: formatList((language as any).conventions),
								})}
							</div>
						</div>
					) : null}
				</OutputSection>

				<OutputSection
					title={t("context.contextSnapshotOutputMeta")}
					subtitle={t("context.contextSnapshotOutputMetaHint")}
					payload={meta}
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

function formatList(value: unknown): string {
	if (!Array.isArray(value)) return "-";
	const items = value.filter((entry) => typeof entry === "string") as string[];
	return items.length > 0 ? items.join(" · ") : "-";
}
