type FeatureDomainScoutFeature = {
	slug: string;
	name: string;
	description: string;
	visibility: "public" | "internal";
	layer: "ui" | "backend" | "infra";
	entryPoints: string[];
	relatedCapabilities: string[];
};

export type FeatureDomainScoutOutput = {
	domain: string;
	features: FeatureDomainScoutFeature[];
	meta: {
		filesExplored: string[];
		capabilityCoverage: {
			total: number;
			covered: number;
			uncovered: string[];
		};
		limitations: string[];
	};
};

type ValidationResult =
	| { valid: true; value: FeatureDomainScoutOutput }
	| { valid: false; errors: string[]; value: null };

const slugPattern = /^[a-z0-9-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseFeatureDomainScoutOutput(
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

export function validateFeatureDomainScoutOutput(
	value: unknown,
	expectedDomain?: string,
): ValidationResult {
	const errors: string[] = [];
	if (!isRecord(value)) {
		return { valid: false, errors: ["Output must be an object"], value: null };
	}

	const output = value as Partial<FeatureDomainScoutOutput>;
	if (typeof output.domain !== "string" || !output.domain.trim()) {
		errors.push("domain is required");
	} else if (expectedDomain && output.domain !== expectedDomain) {
		errors.push(`domain must be ${expectedDomain}`);
	}

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
			if (
				!Array.isArray(feature.entryPoints) ||
				feature.entryPoints.length === 0
			) {
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
		const filesExplored = (output.meta as { filesExplored?: unknown })
			.filesExplored;
		if (!Array.isArray(filesExplored) || filesExplored.length === 0) {
			errors.push("meta.filesExplored must not be empty");
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

	if (errors.length > 0) {
		return { valid: false, errors, value: null };
	}

	return { valid: true, value: output as FeatureDomainScoutOutput };
}
