import type { ToolDefinition } from "../tool_registry";
import { validateDomainMap, type ValidationResult } from "../validators";

type ValidateInput = {
	outputType: string;
	data: unknown;
};

const VALIDATE_OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["outputType", "data"],
	properties: {
		productId: { type: "string" },
		outputType: { type: "string" },
		data: {},
	},
} as const;

export function createValidateTool(): ToolDefinition {
	return {
		name: "validate_output",
		description: "Validate agent output against schema",
		inputSchema: VALIDATE_OUTPUT_SCHEMA,
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
