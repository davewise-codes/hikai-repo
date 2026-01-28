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
	truncation?: {
		applied: boolean;
		originalSizeBytes: number;
		finalSizeBytes: number;
		limitBytes: number;
		notice?: string;
	};
};

export type ToolDefinition = {
	name: ToolName;
	description?: string;
	inputSchema?: Record<string, unknown>;
	execute?: (input: unknown) => Promise<unknown>;
	outputLimitBytes?: number;
};

const DEFAULT_OUTPUT_LIMIT_BYTES = 20_000;
const TRUNCATION_SUFFIX = "\n... [truncated]";

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
		const limitBytes = tool.outputLimitBytes ?? DEFAULT_OUTPUT_LIMIT_BYTES;
		const truncated = applyOutputLimit(output, limitBytes);
		return {
			name: call.name,
			input: call.input,
			output: truncated.output,
			toolCallId: call.id,
			truncation: truncated.truncation,
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

function applyOutputLimit(
	output: unknown,
	limitBytes: number,
): { output: unknown; truncation: ToolResult["truncation"] } {
	const original = serializeWithSize(output);
	if (original.sizeBytes <= limitBytes) {
		return {
			output,
			truncation: {
				applied: false,
				originalSizeBytes: original.sizeBytes,
				finalSizeBytes: original.sizeBytes,
				limitBytes,
			},
		};
	}

	let nextOutput: unknown = output;
	let notice = "Output truncated to fit tool output limit.";

	if (typeof output === "string") {
		nextOutput = truncateStringByBytes(output, limitBytes, TRUNCATION_SUFFIX);
	} else if (Array.isArray(output)) {
		nextOutput = truncateArrayByBytes(output, limitBytes);
	} else if (isPlainObject(output)) {
		nextOutput = truncateObjectByBytes(output, limitBytes);
	} else {
		nextOutput = truncateStringByBytes(String(output), limitBytes, TRUNCATION_SUFFIX);
		notice = "Non-JSON tool output was stringified and truncated.";
	}

	const nextSerialized = serializeWithSize(nextOutput);
	if (nextSerialized.sizeBytes > limitBytes) {
		const fallback = truncateStringByBytes(original.json, limitBytes, TRUNCATION_SUFFIX);
		nextOutput = { truncated: true, originalSizeBytes: original.sizeBytes, preview: fallback };
		notice = "Output exceeded limit; stored truncated preview.";
	}

	const finalSerialized = serializeWithSize(nextOutput);
	return {
		output: nextOutput,
		truncation: {
			applied: true,
			originalSizeBytes: original.sizeBytes,
			finalSizeBytes: finalSerialized.sizeBytes,
			limitBytes,
			notice,
		},
	};
}

function serializeWithSize(value: unknown): { json: string; sizeBytes: number } {
	let json = "";
	try {
		json = JSON.stringify(value);
	} catch {
		json = JSON.stringify({ value: String(value) });
	}
	return { json, sizeBytes: byteLength(json) };
}

function truncateStringByBytes(
	value: string,
	limitBytes: number,
	suffix: string,
): string {
	const suffixBytes = byteLength(suffix);
	if (limitBytes <= suffixBytes) {
		return suffix.slice(0, Math.max(0, limitBytes));
	}
	const maxBytes = limitBytes - suffixBytes;
	if (byteLength(value) <= limitBytes) return value;
	const truncated = sliceStringByBytes(value, maxBytes);
	return `${truncated}${suffix}`;
}

function truncateArrayByBytes<T>(value: T[], limitBytes: number): T[] {
	if (value.length === 0) return value;
	let low = 0;
	let high = value.length;
	while (low < high) {
		const mid = Math.ceil((low + high) / 2);
		const candidate = value.slice(0, mid);
		if (serializeWithSize(candidate).sizeBytes <= limitBytes) {
			low = mid;
		} else {
			high = mid - 1;
		}
	}
	return value.slice(0, Math.max(0, low));
}

function truncateObjectByBytes(
	value: Record<string, unknown>,
	limitBytes: number,
): Record<string, unknown> {
	const next: Record<string, unknown> = { ...value };
	if (typeof next.content === "string") {
		next.content = truncateStringByBytes(next.content, limitBytes, TRUNCATION_SUFFIX);
	}
	if (Array.isArray(next.files)) {
		next.files = truncateArrayByBytes(next.files, limitBytes);
	}
	if (Array.isArray(next.dirs)) {
		next.dirs = truncateArrayByBytes(next.dirs, limitBytes);
	}
	if (Array.isArray(next.matches)) {
		next.matches = truncateArrayByBytes(next.matches, limitBytes);
	}
	if (Array.isArray(next.items)) {
		next.items = truncateArrayByBytes(next.items, limitBytes);
	}
	return next;
}

function sliceStringByBytes(value: string, maxBytes: number): string {
	if (maxBytes <= 0) return "";
	let low = 0;
	let high = value.length;
	while (low < high) {
		const mid = Math.ceil((low + high) / 2);
		if (byteLength(value.slice(0, mid)) <= maxBytes) {
			low = mid;
		} else {
			high = mid - 1;
		}
	}
	return value.slice(0, low);
}

function byteLength(value: string): number {
	return new TextEncoder().encode(value).length;
}
