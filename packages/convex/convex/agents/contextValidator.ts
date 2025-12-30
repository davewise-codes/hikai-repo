import { ProductContextPayload } from "../ai/prompts/productContext";

const VALID_STAGES = new Set([
	"idea",
	"mvp",
	"beta",
	"early-production",
	"production",
	"scaling",
	"mature",
	"unknown",
]);

const VALID_MATURITY = new Set(["early", "mid", "late", "unknown"]);

const EARLY_STAGE_SET = new Set(["idea", "mvp", "beta", "early-production"]);

const normalizeEnum = (value: string | undefined, allowed: Set<string>) => {
	if (!value) return "";
	const normalized = value.trim().toLowerCase();
	if (!normalized) return "";
	return allowed.has(normalized) ? normalized : "unknown";
};

const hasItems = (items?: unknown[]) => Array.isArray(items) && items.length > 0;

const normalizeRelatedKeyFeatures = (
	events: ProductContextPayload["notableEvents"],
	keyFeatures: ProductContextPayload["keyFeatures"],
) => {
	if (!events || events.length === 0) return events;
	const names = new Set(
		(keyFeatures ?? []).map((feature) => feature.name).filter(Boolean),
	);

	return events.map((event) => {
		if (!event.relatedKeyFeatures?.length) return event;
		const filtered = event.relatedKeyFeatures.filter((name) => names.has(name));
		return {
			...event,
			relatedKeyFeatures: filtered.length > 0 ? filtered : undefined,
		};
	});
};

export function validateAndEnrichContext(
	context: ProductContextPayload,
	detectedStack?: string[],
): ProductContextPayload & { qualityScore: number } {
	const result: ProductContextPayload = { ...context };

	result.stage = normalizeEnum(result.stage, VALID_STAGES);
	result.maturity = normalizeEnum(result.maturity, VALID_MATURITY);

	if (result.stage && EARLY_STAGE_SET.has(result.stage)) {
		result.maturity = "early";
	}

	if (detectedStack && detectedStack.length > 0) {
		result.technicalStack = detectedStack;
	}

	result.notableEvents = normalizeRelatedKeyFeatures(
		result.notableEvents,
		result.keyFeatures,
	);

	let score =
		typeof result.confidence === "number" ? result.confidence : 0.5;

	if (!hasItems(result.strategicPillars)) score -= 0.2;
	if (!hasItems(result.competition)) score -= 0.1;
	if (
		!hasItems(result.risks) &&
		result.stage &&
		EARLY_STAGE_SET.has(result.stage)
	) {
		score -= 0.1;
	}
	if (!hasItems(result.keyFeatures)) score -= 0.15;
	if (!result.valueProposition || result.valueProposition.trim().length === 0) {
		score -= 0.1;
	}

	if (hasItems(result.technicalStack)) score += 0.05;
	if (
		hasItems(result.notableEvents) &&
		(Array.isArray(result.notableEvents)
			? result.notableEvents.length > 2
			: false)
	) {
		score += 0.1;
	}
	if (
		hasItems(result.personas) &&
		result.personas?.every(
			(persona) =>
				typeof persona.description === "string" &&
				persona.description.trim().length > 0,
		)
	) {
		score += 0.05;
	}

	const qualityScore = Math.max(0, Math.min(1, score));

	return { ...result, qualityScore };
}
