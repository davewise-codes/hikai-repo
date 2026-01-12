export const TOOL_SETS = {
	read_only: ["read_file", "glob", "grep", "list_directory"],
	analysis: ["read_file", "glob", "grep", "list_directory", "summarize_file"],
	generation: ["read_file", "glob", "grep", "classify", "extract_features"],
} as const;

export type ToolSetName = keyof typeof TOOL_SETS;
export type ToolName = (typeof TOOL_SETS)[ToolSetName][number];

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
	execute?: (input: unknown) => Promise<unknown>;
};

export type ToolRegistry = Partial<Record<ToolName, ToolDefinition>>;

const createStubTool = (name: ToolName): ToolDefinition => ({ name });

export function getToolsForAgent(
	setName: ToolSetName,
	registry: ToolRegistry = {},
): ToolDefinition[] {
	return TOOL_SETS[setName].map((name) => registry[name] ?? createStubTool(name));
}
