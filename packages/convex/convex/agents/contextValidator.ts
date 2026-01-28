import { extractJsonPayload } from "./core/json_utils";

export type ContextDetail = {
	technical: {
		stack: string[];
		patterns: string[];
		rootDirs: string[];
		entryPoints: string[];
		integrations: string[];
	};
	domains: Array<{
		name: string;
		description: string;
		purpose: string;
		keyFiles: string[];
	}>;
	features: Array<{
		name: string;
		description: string;
		domain?: string;
		userFacing: boolean;
	}>;
	language: {
		glossary: Array<{
			term: string;
			definition: string;
		}>;
		conventions: string[];
	};
	meta?: Record<string, unknown>;
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
	const technical = input.technical;
	const domains = input.domains;
	const features = input.features;
	const language = input.language;

	if (!isRecord(technical)) {
		errors.push("technical must be an object");
	} else {
		validateStringArray(technical.stack, "technical.stack", errors);
		validateStringArray(technical.patterns, "technical.patterns", errors);
		validateStringArray(technical.rootDirs, "technical.rootDirs", errors);
		validateStringArray(technical.entryPoints, "technical.entryPoints", errors);
		validateStringArray(technical.integrations, "technical.integrations", errors);
	}

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
			if (typeof domain.description !== "string") {
				errors.push(`domains[${index}].description must be a string`);
			}
			if (typeof domain.purpose !== "string") {
				errors.push(`domains[${index}].purpose must be a string`);
			}
			validateStringArray(domain.keyFiles, `domains[${index}].keyFiles`, errors);
		});
	}

	if (!Array.isArray(features)) {
		errors.push("features must be an array");
	} else {
		features.forEach((feature, index) => {
			if (!isRecord(feature)) {
				errors.push(`features[${index}] must be an object`);
				return;
			}
			if (typeof feature.name !== "string" || !feature.name.trim()) {
				errors.push(`features[${index}].name must be a string`);
			}
			if (typeof feature.description !== "string") {
				errors.push(`features[${index}].description must be a string`);
			}
			if (
				feature.domain !== undefined &&
				typeof feature.domain !== "string"
			) {
				errors.push(`features[${index}].domain must be a string`);
			}
			if (typeof feature.userFacing !== "boolean") {
				errors.push(`features[${index}].userFacing must be a boolean`);
			}
		});
	}

	if (!isRecord(language)) {
		errors.push("language must be an object");
	} else {
		const glossary = language.glossary;
		if (!Array.isArray(glossary)) {
			errors.push("language.glossary must be an array");
		} else {
			glossary.forEach((term, index) => {
				if (!isRecord(term)) {
					errors.push(`language.glossary[${index}] must be an object`);
					return;
				}
				if (typeof term.term !== "string" || !term.term.trim()) {
					errors.push(`language.glossary[${index}].term must be a string`);
				}
				if (typeof term.definition !== "string") {
					errors.push(
						`language.glossary[${index}].definition must be a string`,
					);
				}
			});
		}
		validateStringArray(language.conventions, "language.conventions", errors);
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
