export type ExtractedJson = {
	data: unknown;
	normalizedText: string;
	hadExtraText: boolean;
};

const CODE_FENCE_REGEX = /```[a-zA-Z]*\n([\s\S]*?)```/g;

export function extractJsonPayload(text: string): ExtractedJson | null {
	if (!text) return null;
	const trimmed = text.trim();
	const stripped = trimmed.replace(CODE_FENCE_REGEX, "$1").trim();
	if (!stripped) return null;

	const startIndex = findJsonStart(stripped);
	if (startIndex === -1) return null;

	const endIndex = findJsonEnd(stripped, startIndex);
	if (endIndex === -1) return null;

	const slice = stripped.slice(startIndex, endIndex + 1);
	try {
		const data = JSON.parse(slice) as unknown;
		const normalizedText = JSON.stringify(data, null, 2);
		const hadExtraText =
			stripped.slice(0, startIndex).trim().length > 0 ||
			stripped.slice(endIndex + 1).trim().length > 0;
		return { data, normalizedText, hadExtraText };
	} catch {
		const fallbackToolUse = extractToolCallsFallback(stripped);
		if (fallbackToolUse) {
			return fallbackToolUse;
		}
		return fallbackParseJson(stripped);
	}
}

function fallbackParseJson(text: string): ExtractedJson | null {
	try {
		const parsed = JSON.parse(text) as unknown;
		if (parsed && typeof parsed === "object") {
			return {
				data: parsed,
				normalizedText: JSON.stringify(parsed, null, 2),
				hadExtraText: false,
			};
		}
		if (typeof parsed === "string") {
			const nested = JSON.parse(parsed) as unknown;
			if (nested && typeof nested === "object") {
				return {
					data: nested,
					normalizedText: JSON.stringify(nested, null, 2),
					hadExtraText: false,
				};
			}
		}
	} catch {
		return null;
	}
	return null;
}

function extractToolCallsFallback(text: string): ExtractedJson | null {
	const toolCallsIndex = text.indexOf("\"toolCalls\"");
	if (toolCallsIndex === -1) return null;
	const arrayStart = text.indexOf("[", toolCallsIndex);
	if (arrayStart === -1) return null;
	const arrayEnd = findJsonEnd(text, arrayStart);
	if (arrayEnd === -1) return null;
	const arraySlice = text.slice(arrayStart, arrayEnd + 1);
	try {
		const toolCalls = JSON.parse(arraySlice) as unknown;
		if (!Array.isArray(toolCalls)) return null;
		const data = { type: "tool_use", toolCalls };
		return {
			data,
			normalizedText: JSON.stringify(data, null, 2),
			hadExtraText: true,
		};
	} catch {
		return null;
	}
}

function findJsonStart(text: string): number {
	for (let i = 0; i < text.length; i += 1) {
		const char = text[i];
		if (char === "{" || char === "[") {
			return i;
		}
	}
	return -1;
}

function findJsonEnd(text: string, startIndex: number): number {
	const stack: string[] = [];
	let inString = false;
	let escaped = false;
	for (let i = startIndex; i < text.length; i += 1) {
		const char = text[i];
		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (char === "\\") {
				escaped = true;
				continue;
			}
			if (char === "\"") {
				inString = false;
			}
			continue;
		}

		if (char === "\"") {
			inString = true;
			continue;
		}

		if (char === "{" || char === "[") {
			stack.push(char);
			continue;
		}

		if (char === "}" || char === "]") {
			const last = stack.pop();
			if (!last) {
				return -1;
			}
			if (last === "{" && char !== "}") return -1;
			if (last === "[" && char !== "]") return -1;
			if (stack.length === 0) {
				return i;
			}
		}
	}
	return -1;
}
