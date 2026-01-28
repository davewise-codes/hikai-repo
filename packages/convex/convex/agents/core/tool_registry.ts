export type ToolName = string;

export type ToolCall = {
	name: ToolName;
	input: unknown;
	id?: string;
};

export type ToolResult = {
	name: ToolName;
	input: unknown;
	output?: unknown;
	error?: string;
	toolCallId?: string;
};

export type ToolDefinition = {
	name: ToolName;
	description?: string;
	inputSchema?: Record<string, unknown>;
	execute?: (input: unknown) => Promise<unknown>;
};

export async function executeToolCall(
	tools: ToolDefinition[],
	call: ToolCall,
): Promise<ToolResult> {
	const tool = tools.find((candidate) => candidate.name === call.name);
	if (!tool?.execute) {
		return {
			name: call.name,
			input: call.input,
			error: `Tool ${call.name} not found or has no execute`,
			toolCallId: call.id,
		};
	}
	if (tool.inputSchema) {
		const validation = validateToolInput(tool.inputSchema, call.input);
		if (!validation.valid) {
			return {
				name: call.name,
				input: call.input,
				error: `Invalid input for ${call.name}: ${validation.errors.join("; ")}`,
				toolCallId: call.id,
			};
		}
	}
	try {
		const output = await tool.execute(call.input);
		return {
			name: call.name,
			input: call.input,
			output,
			toolCallId: call.id,
		};
	} catch (error) {
		return {
			name: call.name,
			input: call.input,
			error: error instanceof Error ? error.message : "Unknown tool error",
			toolCallId: call.id,
		};
	}
}

type JsonSchema = {
	type?: string | string[];
	properties?: Record<string, JsonSchema>;
	required?: string[];
	additionalProperties?: boolean;
	items?: JsonSchema;
	enum?: unknown[];
	oneOf?: JsonSchema[];
	anyOf?: JsonSchema[];
};

type ValidationResult = {
	valid: boolean;
	errors: string[];
};

function validateToolInput(schema: Record<string, unknown>, input: unknown): ValidationResult {
	const errors = validateSchema(schema as JsonSchema, input, "$");
	return { valid: errors.length === 0, errors };
}

function validateSchema(schema: JsonSchema, value: unknown, path: string): string[] {
	if (!schema || typeof schema !== "object") return [];
	const typeErrors = validateType(schema.type, value, path);
	if (typeErrors.length > 0) return typeErrors;
	if (schema.enum && !schema.enum.includes(value)) {
		return [`${path} must be one of ${schema.enum.map(String).join(", ")}`];
	}
	if (schema.type === "object" || (Array.isArray(schema.type) && schema.type.includes("object"))) {
		if (!isPlainObject(value)) {
			return [`${path} must be an object`];
		}
		const errors: string[] = [];
		const obj = value as Record<string, unknown>;
		const required = schema.required ?? [];
		for (const key of required) {
			if (obj[key] === undefined) {
				errors.push(`${path}.${key} is required`);
			}
		}
		if (schema.properties) {
			for (const [key, propSchema] of Object.entries(schema.properties)) {
				if (obj[key] !== undefined) {
					errors.push(...validateSchema(propSchema, obj[key], `${path}.${key}`));
				}
			}
		}
		if (schema.additionalProperties === false && schema.properties) {
			for (const key of Object.keys(obj)) {
				if (!(key in schema.properties)) {
					errors.push(`${path}.${key} is not allowed`);
				}
			}
		}
		return errors;
	}
	if (schema.type === "array" || (Array.isArray(schema.type) && schema.type.includes("array"))) {
		if (!Array.isArray(value)) {
			return [`${path} must be an array`];
		}
		if (schema.items) {
			const errors: string[] = [];
			value.forEach((item, index) => {
				errors.push(...validateSchema(schema.items as JsonSchema, item, `${path}[${index}]`));
			});
			return errors;
		}
	}
	if (schema.oneOf) {
		const anyValid = schema.oneOf.some(
			(sub) => validateSchema(sub, value, path).length === 0,
		);
		return anyValid ? [] : [`${path} does not match any allowed schema`];
	}
	if (schema.anyOf) {
		const anyValid = schema.anyOf.some(
			(sub) => validateSchema(sub, value, path).length === 0,
		);
		return anyValid ? [] : [`${path} does not match any allowed schema`];
	}
	return [];
}

function validateType(
	type: JsonSchema["type"],
	value: unknown,
	path: string,
): string[] {
	if (!type) return [];
	const types = Array.isArray(type) ? type : [type];
	const matches = types.some((entry) => {
		switch (entry) {
			case "object":
				return isPlainObject(value);
			case "array":
				return Array.isArray(value);
			case "string":
				return typeof value === "string";
			case "number":
				return typeof value === "number" && !Number.isNaN(value);
			case "integer":
				return Number.isInteger(value);
			case "boolean":
				return typeof value === "boolean";
			case "null":
				return value === null;
			default:
				return true;
		}
	});
	return matches ? [] : [`${path} must be of type ${types.join(" or ")}`];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
