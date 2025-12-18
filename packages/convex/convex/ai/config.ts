import { createOpenAIAdapter, createAnthropicAdapter } from "./adapters";
import { LLMPort } from "./ports/llmPort";

export type AIProvider = "openai" | "anthropic";

export interface AIConfig {
	provider: AIProvider;
	model: string;
	debugLogContent: boolean;
}

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
