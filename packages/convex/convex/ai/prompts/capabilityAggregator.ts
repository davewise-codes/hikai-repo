export const CAPABILITY_AGGREGATOR_PROMPT_VERSION = "v1.1";

type CapabilityAggregatorInput = {
	domains: Array<{
		name: string;
		purpose?: string;
	}>;
	features: Array<{
		slug: string;
		name: string;
		description?: string;
		domain?: string;
		visibility: "public" | "internal";
		layer?: "ui" | "backend" | "infra";
		entryPoints?: string[];
	}>;
	baseline?: Record<string, unknown> | null;
	languagePreference?: string;
};

export const capabilityAggregatorPrompt = (
	input: CapabilityAggregatorInput,
): string => `
Eres un agregador de capabilities. Tu objetivo es agrupar features reales en capacidades de negocio comprensibles.

REGLAS:
- Solo usa features provistas (no inventes nuevas).
- Una capability es una accion de negocio que el usuario entiende (verbo + objeto).
- Cada capability debe incluir 1+ features relacionadas.
- El lenguaje debe alinearse con el baseline si está disponible, pero NO inventes capabilities si no hay evidencia.
- Evita duplicados: si dos capabilities son casi iguales, fusiona en una.
- Mantén descripciones cortas (<= 120 caracteres).
- Usa "${input.languagePreference ?? "en"}" para name/description visibles al usuario.
- Los slugs/ids siempre en ingles (kebab-case) para estabilidad.

INPUT JSON:
${JSON.stringify(input, null, 2)}

LIMITES DE SALIDA:
- Máximo 30 capabilities.
- Si hay más, prioriza las de mayor alcance y omite el resto.
- No añadas texto fuera del JSON.

OUTPUT JSON (solo JSON, sin markdown):
{
  "capabilities": [
    {
      "slug": "invite-member",
      "name": "Invite Members",
      "description": "Invite users to join the organization via email",
      "domain": "Organizations",
      "visibility": "public",
      "featureSlugs": ["invite-member-dialog", "org-members"]
    }
  ]
}
`.trim();
