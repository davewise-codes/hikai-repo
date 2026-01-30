import type { AgentMessage, AgentModel } from "./agent_loop";

export type CompactionConfig = {
	enabled: boolean;
	messageThreshold: number;
	preserveLastN: number;
	maxSummaryTokens: number;
};

export type CompactionResult = {
	messages: AgentMessage[];
	summary: string;
	messagesBefore: number;
	messagesAfter: number;
	removedMessages: number;
	pinnedMessages: number;
};

export const DEFAULT_COMPACTION_CONFIG: CompactionConfig = {
	enabled: true,
	messageThreshold: 12,
	preserveLastN: 4,
	maxSummaryTokens: 100000,
};

const COMPACTION_PROMPT = [
	"Resume los puntos clave de esta conversación de agente, preservando:",
	"- decisiones tomadas",
	"- archivos explorados",
	"- datos recopilados",
	"- errores encontrados",
	"",
	"Contexto a resumir:",
].join("\n");

export function resolveCompactionConfig(
	config?: Partial<CompactionConfig>,
): CompactionConfig {
	if (!config) {
		return DEFAULT_COMPACTION_CONFIG;
	}
	return {
		...DEFAULT_COMPACTION_CONFIG,
		...config,
	};
}

export async function compactMessages(
	messages: AgentMessage[],
	model: AgentModel,
	options: CompactionConfig,
	deterministicSummary?: string,
): Promise<CompactionResult | null> {
	if (messages.length <= 2) return null;

	const preserveLastN = Math.max(
		0,
		Math.min(options.preserveLastN, Math.max(0, messages.length - 1)),
	);
	const tailStart = Math.max(1, messages.length - preserveLastN);
	const middleMessages = messages.slice(1, tailStart);

	const pinnedIndexes = new Set<number>();
	const removedMessages: AgentMessage[] = [];

	for (let i = 0; i < middleMessages.length; i += 1) {
		const message = middleMessages[i];
		if (isPinnedMessage(message)) {
			pinnedIndexes.add(i);
		} else {
			removedMessages.push(message);
		}
	}

	if (removedMessages.length === 0) return null;

	let summary = await summarizeMessages(removedMessages, model, options);
	if (deterministicSummary && deterministicSummary.trim().length > 0) {
		summary = `${summary}\n\n${deterministicSummary.trim()}`;
	}
	const summaryMessage: AgentMessage = {
		role: "assistant",
		content: `<context-summary>\n${summary}\n</context-summary>`,
	};

	const compacted: AgentMessage[] = [messages[0]];
	let summaryInserted = false;

	for (let i = 0; i < middleMessages.length; i += 1) {
		const message = middleMessages[i];
		if (pinnedIndexes.has(i)) {
			compacted.push(message);
			continue;
		}
		if (!summaryInserted) {
			compacted.push(summaryMessage);
			summaryInserted = true;
		}
	}

	compacted.push(...messages.slice(tailStart));

	return {
		messages: compacted,
		summary,
		messagesBefore: messages.length,
		messagesAfter: compacted.length,
		removedMessages: removedMessages.length,
		pinnedMessages: pinnedIndexes.size,
	};
}

function isPinnedMessage(message: AgentMessage): boolean {
	const content = message.content ?? "";
	return (
		content.includes("<current-plan>") ||
		content.includes("validate_json") ||
		content.includes("\"validate_json\"")
	);
}

async function summarizeMessages(
	messages: AgentMessage[],
	model: AgentModel,
	options: CompactionConfig,
): Promise<string> {
	const conversation = messages
		.map((message) => `${message.role.toUpperCase()}: ${message.content}`)
		.join("\n\n");
	const prompt = `${COMPACTION_PROMPT}\n\n${conversation}`;
	const response = await model.generate({
		messages: [{ role: "user", content: prompt }],
		tools: [],
		maxTokens: options.maxSummaryTokens,
		temperature: 0,
	});
	return response.text.trim();
}
