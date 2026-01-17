import type { ToolDefinition } from "../tool_registry";
import { validateDomainMap, type ValidationResult } from "../validators";

type ValidateInput = {
	outputType: string;
	data: unknown;
};

export function createValidateTool(): ToolDefinition {
	return {
		name: "validate_output",
		description: "Validate agent output against schema",
		execute: async (input) => {
			if (!input || typeof input !== "object") {
				return {
					valid: false,
					errors: ["Invalid input for validate_output"],
					warnings: [],
				} satisfies ValidationResult;
			}

			const { outputType, data } = input as ValidateInput;
			const validators: Record<string, (value: unknown) => ValidationResult> = {
				domain_map: validateDomainMap,
			};

			const validator = validators[outputType];
			if (!validator) {
				return {
					valid: false,
					errors: [`Unknown output type: ${outputType}`],
					warnings: [],
				} satisfies ValidationResult;
			}

			return validator(data);
		},
	};
}
