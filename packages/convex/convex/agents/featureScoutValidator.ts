type FeatureScoutFeature = {
	slug: string;
	name: string;
	domain: string;
	description: string;
	visibility: "public" | "internal";
	layer: "ui" | "backend" | "infra";
	entryPoints: string[];
	relatedCapabilities: string[];
};

export type FeatureScoutOutput = {
	features: FeatureScoutFeature[];
	meta: {
		filesRead: string[];
		domainsExplored: string[];
		expectedDomains?: number;
		capabilityCoverage: Record<
			string,
			{ total: number; covered: number; uncovered: string[] }
		>;
		limitations: string[];
	};
};

type ValidationResult =
	| { valid: true; value: FeatureScoutOutput }
	| { valid: false; errors: string[]; value: null };

const slugPattern = /^[a-z0-9-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseFeatureScoutOutput(
	rawText: string,
): { value: unknown | null; error?: string } {
	if (!rawText.trim()) {
		return { value: null, error: "Empty output" };
	}
	try {
		return { value: JSON.parse(rawText) as unknown };
	} catch {
		return { value: null, error: "Output must be valid JSON." };
	}
}

export function validateFeatureScoutOutput(value: unknown): ValidationResult {
	const errors: string[] = [];
	if (!isRecord(value)) {
		return { valid: false, errors: ["Output must be an object"], value: null };
	}

	const output = value as Partial<FeatureScoutOutput>;
	if (!Array.isArray(output.features)) {
		errors.push("features must be an array");
	} else {
		const seen = new Set<string>();
		output.features.forEach((feature, index) => {
			if (!isRecord(feature)) {
				errors.push(`features[${index}] must be an object`);
				return;
			}
			const slug = typeof feature.slug === "string" ? feature.slug.trim() : "";
			if (!slug) {
				errors.push(`features[${index}].slug is required`);
			} else if (!slugPattern.test(slug)) {
				errors.push(`features[${index}].slug must be kebab-case`);
			} else if (seen.has(slug)) {
				errors.push(`Duplicate slug: ${slug}`);
			} else {
				seen.add(slug);
			}

			if (typeof feature.name !== "string" || !feature.name.trim()) {
				errors.push(`features[${index}].name is required`);
			}
			if (typeof feature.domain !== "string" || !feature.domain.trim()) {
				errors.push(`features[${index}].domain is required`);
			}
			if (
				typeof feature.description !== "string" ||
				!feature.description.trim()
			) {
				errors.push(`features[${index}].description is required`);
			}
			if (
				feature.layer !== "ui" &&
				feature.layer !== "backend" &&
				feature.layer !== "infra"
			) {
				errors.push(`features[${index}].layer must be ui|backend|infra`);
			}
			if (
				feature.visibility !== "public" &&
				feature.visibility !== "internal"
			) {
				errors.push(`features[${index}].visibility must be public|internal`);
			}
			if (!Array.isArray(feature.entryPoints) || feature.entryPoints.length === 0) {
				errors.push(`features[${index}].entryPoints must be non-empty`);
			}
			if (!Array.isArray(feature.relatedCapabilities)) {
				errors.push(`features[${index}].relatedCapabilities must be an array`);
			}
		});
	}

	if (!output.meta || !isRecord(output.meta)) {
		errors.push("meta is required");
	} else {
		const filesRead = (output.meta as { filesRead?: unknown }).filesRead;
		if (!Array.isArray(filesRead) || filesRead.length === 0) {
			errors.push("meta.filesRead must not be empty");
		}
		const domainsExplored = (output.meta as { domainsExplored?: unknown })
			.domainsExplored;
		if (!Array.isArray(domainsExplored) || domainsExplored.length === 0) {
			errors.push("meta.domainsExplored must not be empty");
		} else {
			const expectedDomains = (output.meta as { expectedDomains?: unknown })
				.expectedDomains;
			if (typeof expectedDomains === "number") {
				if (domainsExplored.length < expectedDomains) {
					errors.push(
						`Only ${domainsExplored.length} domains explored, expected ${expectedDomains}`,
					);
				}
			}
		}
		const coverage = (output.meta as { capabilityCoverage?: unknown })
			.capabilityCoverage;
		if (!isRecord(coverage)) {
			errors.push("meta.capabilityCoverage must be an object");
		}
		const limitations = (output.meta as { limitations?: unknown }).limitations;
		if (!Array.isArray(limitations)) {
			errors.push("meta.limitations must be an array");
		}
	}

	if (Array.isArray(output.features)) {
		const expectedDomains = isRecord(output.meta)
			? (output.meta as { expectedDomains?: unknown }).expectedDomains
			: undefined;
		if (typeof expectedDomains === "number") {
			if (output.features.length < expectedDomains) {
				errors.push(
					`Only ${output.features.length} features found, expected at least ${expectedDomains}`,
				);
			}
		} else if (output.features.length < 6) {
			errors.push(
				`Only ${output.features.length} features found, minimum is 6`,
			);
		}
	}

	if (errors.length > 0) {
		return { valid: false, errors, value: null };
	}

	return { valid: true, value: output as FeatureScoutOutput };
}
