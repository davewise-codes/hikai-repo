import type { ToolDefinition } from "../tool_registry";

type ValidateJsonInput = {
	json: unknown;
};

const VALIDATE_JSON_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["json"],
	properties: {
		productId: { type: "string" },
		json: {},
	},
} as const;

export function createValidateJsonTool(): ToolDefinition {
	return {
		name: "validate_json",
		description: "Validate JSON syntax and return parsed data",
		inputSchema: VALIDATE_JSON_SCHEMA,
		execute: async (input) => {
			if (!input || typeof input !== "object") {
				return { valid: false, error: "Invalid input for validate_json" };
			}
			const { json } = input as Partial<ValidateJsonInput>;
			if (json === undefined) {
				return { valid: false, error: "validate_json: json is required" };
			}
			if (typeof json === "string") {
				try {
					const parsed = JSON.parse(json) as unknown;
					return { valid: true, parsed };
				} catch (error) {
					return {
						valid: false,
						error: error instanceof Error ? error.message : "Invalid JSON",
					};
				}
			}
			if (json && typeof json === "object") {
				return { valid: true, parsed: json };
			}
			return { valid: false, error: "validate_json: json must be object or string" };
		},
	};
}
