export type ValidationResult = {
	valid: boolean;
	errors: string[];
	warnings: string[];
};

type DomainMap = {
	domains?: Array<{
		name?: string;
		weight?: number;
		evidence?: string[];
	}>;
	summary?: {
		totalDomains?: number;
		warnings?: string[];
	};
};

export function validateDomainMap(output: unknown): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!output || typeof output !== "object") {
		return { valid: false, errors: ["Output must be an object"], warnings };
	}

	const map = output as DomainMap;
	if (!Array.isArray(map.domains) || map.domains.length === 0) {
		errors.push("Missing 'domains' array");
	} else {
		for (const domain of map.domains) {
			if (!domain?.name) {
				errors.push("Domain missing 'name'");
			}
			if (typeof domain?.weight !== "number" || Number.isNaN(domain.weight)) {
				errors.push(`Domain '${domain?.name ?? "unknown"}' missing 'weight'`);
			} else if (domain.weight < 0 || domain.weight > 1) {
				errors.push(`Domain '${domain?.name ?? "unknown"}' weight out of range`);
			}
			if (!Array.isArray(domain?.evidence) || domain.evidence.length === 0) {
				errors.push(`Domain '${domain?.name ?? "unknown"}' has no evidence`);
			}
		}
	}

	if (!map.summary || typeof map.summary !== "object") {
		errors.push("Missing 'summary' object");
	} else if (typeof map.summary.totalDomains !== "number") {
		errors.push("Missing 'summary.totalDomains'");
	}

	if (Array.isArray(map.summary?.warnings)) {
		warnings.push(...map.summary.warnings);
	}

	return { valid: errors.length === 0, errors, warnings };
}
