import { createOpenAIAdapter, createAnthropicAdapter } from "./adapters";
import { LLMPort } from "./ports/llmPort";

export type AIProvider = "openai" | "anthropic";

export interface AIConfig {
	provider: AIProvider;
	model: string;
	debugLogContent: boolean;
}

type AgentModelOverride = {
	provider: AIProvider;
	model: string;
};

export type AgentTelemetryConfig = {
	persistInferenceLogs: boolean;
	enableRating: boolean;
};

const AGENT_MODEL_OVERRIDES: Record<string, AgentModelOverride> = {
	"Product Context Agent": { provider: "openai", model: "gpt-5-mini" },
	"Repo Context Agent": { provider: "openai", model: "gpt-5-mini" },
	"Timeline Context Interpreter Agent": { provider: "openai", model: "gpt-5-mini" },
	"Source Context Classifier Agent": { provider: "openai", model: "gpt-5-mini" },
	"Feature Map Agent": { provider: "openai", model: "gpt-5-mini" },
	"Hello World Agent": { provider: "openai", model: "gpt-4o-mini" },
};

const AGENT_TELEMETRY_CONFIG: Record<string, AgentTelemetryConfig> = {
	"Product Context Agent": { persistInferenceLogs: true, enableRating: true },
	"Repo Context Agent": { persistInferenceLogs: true, enableRating: false },
	"Timeline Context Interpreter Agent": {
		persistInferenceLogs: true,
		enableRating: true,
	},
	"Source Context Classifier Agent": {
		persistInferenceLogs: false,
		enableRating: false,
	},
	"Feature Map Agent": { persistInferenceLogs: true, enableRating: false },
	"Hello World Agent": { persistInferenceLogs: true, enableRating: false },
};

/**
 * Obtiene configuración de IA desde variables de entorno.
 */
export function getAIConfig(): AIConfig {
	const provider = (process.env.AI_PROVIDER ?? "openai") as AIProvider;
	const debugLogContent = process.env.AI_DEBUG_LOG_CONTENT === "true";

	const defaultModels: Record<AIProvider, string> = {
		openai: "gpt-4o-mini",
		anthropic: "claude-3-haiku-20240307",
	};

	const model = process.env.AI_MODEL ?? defaultModels[provider];

	return { provider, model, debugLogContent };
}

/**
 * Obtiene configuración efectiva de IA por agente.
 */
export function getAgentAIConfig(agentName: string): AIConfig {
	const baseConfig = getAIConfig();
	const override = AGENT_MODEL_OVERRIDES[agentName];
	if (!override) {
		return baseConfig;
	}

	return {
		...baseConfig,
		provider: override.provider,
		model: override.model,
	};
}

export function getAgentTelemetryConfig(agentName: string): AgentTelemetryConfig {
	return (
		AGENT_TELEMETRY_CONFIG[agentName] ?? {
			persistInferenceLogs: true,
			enableRating: false,
		}
	);
}

/**
 * Crea el adaptador LLM según configuración.
 */
export function createLLMAdapter(config?: Partial<AIConfig>): LLMPort {
	const finalConfig = { ...getAIConfig(), ...config };

	switch (finalConfig.provider) {
		case "openai":
			return createOpenAIAdapter(finalConfig.model);
		case "anthropic":
			return createAnthropicAdapter(finalConfig.model);
		default:
			throw new Error(`Unknown AI provider: ${finalConfig.provider}`);
	}
}
