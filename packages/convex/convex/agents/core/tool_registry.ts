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
