/**
 * Puerto abstracto para proveedores LLM
 * Arquitectura hexagonal: permite cambiar proveedor sin modificar lógica de negocio.
 */
export interface LLMGenerateParams {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMGenerateResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  totalTokens: number;
  model: string;
  provider: string;
  latencyMs: number;
}

export interface LLMPort {
  /**
   * Genera texto a partir de un prompt.
   */
  generateText(params: LLMGenerateParams): Promise<LLMGenerateResult>;

  /**
   * Información del proveedor.
   */
  getProviderInfo(): { name: string; model: string };
}

/**
 * Precios por 1M tokens (para estimación de costes).
 * Actualizar según cambios de proveedores.
 */
export const TOKEN_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 5.0, output: 15.0 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
};

/**
 * Calcula coste estimado en USD.
 */
export function estimateCost(
  model: string,
  tokensIn: number,
  tokensOut: number
): number {
  const prices = TOKEN_PRICES[model] ?? { input: 0, output: 0 };
  return (tokensIn * prices.input + tokensOut * prices.output) / 1_000_000;
}
