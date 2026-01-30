import { extractJsonPayload } from "./core/json_utils";

export type ContextDetail = {
	domains: Array<{
		name: string;
		purpose: string;
		capabilities: string[];
		pathPatterns: string[];
		schemaEntities: string[];
	}>;
	structure?: {
		type?: string;
		frontend?: string;
		backend?: string;
	};
	meta: {
		filesRead: string[];
		limitations: string[];
	};
};

export type ContextValidationResult = {
	valid: boolean;
	errors: string[];
	value?: ContextDetail;
};

export function validateAndEnrichContext(
	input: Record<string, unknown>,
	detectedStack?: string[],
): Record<string, unknown> {
	const output = { ...input };
	const ensureArray = (value: unknown): unknown[] =>
		Array.isArray(value) ? value : [];
	const ensureString = (value: unknown, fallback = ""): string =>
		typeof value === "string" ? value : fallback;

	output.language = ensureString(output.language, "en");
	output.industries = ensureArray(output.industries);
	output.audiences = ensureArray(output.audiences);
	output.personas = ensureArray(output.personas);
	output.platforms = ensureArray(output.platforms);
	output.integrationEcosystem = ensureArray(output.integrationEcosystem);
	output.technicalStack = ensureArray(output.technicalStack);
	output.audienceSegments = ensureArray(output.audienceSegments);
	output.toneGuidelines = ensureArray(output.toneGuidelines);
	output.productDomains = ensureArray(output.productDomains);
	output.competition = ensureArray(output.competition);
	output.risks = ensureArray(output.risks);
	output.recommendedFocus = ensureArray(output.recommendedFocus);
	output.notableEvents = ensureArray(output.notableEvents);

	if (
		detectedStack &&
		detectedStack.length > 0 &&
		(output.technicalStack as unknown[]).length === 0
	) {
		output.technicalStack = detectedStack;
	}

	if (typeof output.confidence !== "number") {
		output.confidence = 0.4;
	}

	return output;
}

export function parseContextDetailFromText(text: string): {
	value: unknown | null;
	error?: string;
} {
	const trimmed = text.trim();
	if (!trimmed) {
		return { value: null, error: "Empty output" };
	}
	try {
		return { value: JSON.parse(trimmed) as unknown };
	} catch {
		const extracted = extractJsonPayload(text);
		if (extracted?.data !== undefined) {
			return { value: extracted.data as unknown };
		}
	}
	return { value: null, error: "Output is not valid JSON" };
}

export function validateContextDetail(input: unknown): ContextValidationResult {
	if (!isRecord(input)) {
		return { valid: false, errors: ["Output must be a JSON object"] };
	}

	const errors: string[] = [];
	const domains = (input as Record<string, unknown>).domains;
	const meta = (input as Record<string, unknown>).meta;

	if (!Array.isArray(domains)) {
		errors.push("domains must be an array");
	} else {
		domains.forEach((domain, index) => {
			if (!isRecord(domain)) {
				errors.push(`domains[${index}] must be an object`);
				return;
			}
			if (typeof domain.name !== "string" || !domain.name.trim()) {
				errors.push(`domains[${index}].name must be a string`);
			}
			if (typeof domain.purpose !== "string") {
				errors.push(`domains[${index}].purpose must be a string`);
			}
			validateStringArray(
				domain.capabilities,
				`domains[${index}].capabilities`,
				errors,
			);
			validateStringArray(
				domain.pathPatterns,
				`domains[${index}].pathPatterns`,
				errors,
			);
			validateStringArray(
				domain.schemaEntities,
				`domains[${index}].schemaEntities`,
				errors,
			);
		});
	}

	if (!isRecord(meta)) {
		errors.push("meta must be an object");
	} else {
		validateStringArray(
			(meta as Record<string, unknown>).filesRead,
			"meta.filesRead",
			errors,
		);
		validateStringArray(
			(meta as Record<string, unknown>).limitations,
			"meta.limitations",
			errors,
		);
	}

	if (errors.length > 0) {
		return { valid: false, errors };
	}

	return { valid: true, errors: [], value: input as ContextDetail };
}

function validateStringArray(
	value: unknown,
	path: string,
	errors: string[],
) {
	if (!Array.isArray(value)) {
		errors.push(`${path} must be an array of strings`);
		return;
	}
	value.forEach((entry, index) => {
		if (typeof entry !== "string") {
			errors.push(`${path}[${index}] must be a string`);
		}
	});
}

function isRecord(value: unknown): value is Record<string, any> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
