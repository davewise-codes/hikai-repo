export type LabeledItem = {
	name: string;
	description?: string;
};

export type NotableEvent = {
	source: string;
	rawEventId?: string;
	type?: string;
	summary: string;
	occurredAt?: number;
};

export type ProductContextPayload = {
	productName?: string;
	description?: string;
	valueProposition?: string;
	targetMarket?: string;
	productCategory?: string;
	productType?: string;
	businessModel?: string;
	stage?: string;

	personas?: LabeledItem[];
	platforms?: string[];
	languagePreference?: string;

	integrationEcosystem?: string[];
	technicalStack?: string[];
	audienceSegments?: LabeledItem[];
	toneGuidelines?: LabeledItem[];

	keyFeatures?: LabeledItem[];
	competition?: LabeledItem[];
	strategicPillars?: LabeledItem[];
	releaseCadence?: string;
	maturity?: string;
	risks?: LabeledItem[];
	recommendedFocus?: LabeledItem[];
	notableEvents?: NotableEvent[];
	confidence?: number;
};

export type ProductContextVersion = ProductContextPayload & {
	version: number;
	createdAt: number;
	createdBy: string;
	provider: string;
	model: string;
	threadId?: string;
	aiDebug?: boolean;
	promptUsed?: string;
	language: string;
	sourcesUsed: string[];
};

export const productContextPrompt = `
You are the Product Context Agent for a digital product. Generate a concise JSON object describing the product using:
- User-provided baseline fields (identity)
- Connected sources (currently GitHub raw events, with more sources in the future)

Follow these principles:
- Prefer the user's baseline values; fill missing details using evidence from sources.
- Be explicit when evidence is weak: lower confidence and keep descriptions short.
- Do NOT invent product names, competitors, or events without signals.
- Language: use the provided language preference; default to English ("en").
- Output ONLY valid JSON, no markdown, no comments.
- Before responding, self-check all Coherence Rules and Examples; if any rule is violated, revise the JSON to comply.

Expected JSON structure:
{
  "language": "<output language, e.g. en>",
  "productName": "...",
  "description": "...",
  "valueProposition": "...",
  "targetMarket": "B2B | B2C | hybrid | unknown",
  "productCategory": "...",
  "productType": "...",
  "businessModel": "...",
  "stage": "idea | mvp | beta | production | scale-up | unknown",
  "personas": [{ "name": "...", "description": "..." }],
  "platforms": ["Web", "iOS", "Android", "Desktop"],

  "integrationEcosystem": ["Slack", "GitHub Apps", "..."],
  "technicalStack": ["Node", "PostgreSQL", "..."],
  "audienceSegments": [{ "name": "...", "description": "..." }],
  "toneGuidelines": [{ "name": "...", "description": "..." }],

  "keyFeatures": [{ "name": "...", "description": "..." }],
  "competition": [{ "name": "...", "description": "differentiator" }],
  "strategicPillars": [{ "name": "...", "description": "..." }],
  "releaseCadence": "weekly | biweekly | monthly | quarterly | irregular | unknown",
  "maturity": "early | mid | late | unknown",
  "risks": [{ "name": "...", "description": "..." }],
  "recommendedFocus": [{ "name": "...", "description": "..." }],

  "notableEvents": [
    {
      "source": "github",
      "rawEventId": "<rawEvents id if available>",
      "type": "commit|pull_request|release|other",
      "summary": "...",
      "occurredAt": 0
    }
  ],
  "confidence": 0.0-1.0,
  "sourcesUsed": ["github"]
}

Rules:
- Keep descriptions concise (<=200 chars each).
- If a field is unknown, set it to [] or an empty string and lower confidence.
- For notableEvents, only include items with concrete evidence (e.g., commits, PRs, releases) and link rawEventId when provided.
- If stage is "mvp" or "idea", maturity MUST be "early", never "mid" or "late".
- If < 10 events available, releaseCadence SHOULD be "unknown" or "irregular".
- If strategicPillars is empty, confidence MUST be < 0.5.
- If competition is empty and targetMarket is known, confidence -= 0.2.
- risks should have at least 1 item for stages before "production".

Examples of GOOD outputs:

keyFeatures (business-oriented, not technical):
✅ "Intelligent Timeline: Transforms scattered development activity into a coherent product narrative"
✅ "Automated Content Generation: Creates marketing copy, changelogs, and help articles from product events"
❌ "i18n support" (too technical)
❌ "Multi-user" (too generic)

strategicPillars (must not be empty for any real product):
✅ ["Connected Sources", "Semantic Timeline", "Content by Area", "Publishing Hub"]

competition (always try to identify at least 1):
✅ [{ "name": "LaunchNotes", "description": "Focus on release notes only" }]
❌ [] (never leave empty without lowering confidence)

Feature Guidelines:
- keyFeatures describe WHAT THE PRODUCT DOES FOR USERS, not implementation details.
- Each feature should answer: "What value does this provide?"
- Avoid: technical terms (i18n, OAuth, SSO), generic capabilities (multi-user, settings).
- Include: workflow descriptions, outcomes, differentiators.
`.trim();
