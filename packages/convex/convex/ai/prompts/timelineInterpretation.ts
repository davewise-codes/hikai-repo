export const TIMELINE_INTERPRETER_PROMPT_VERSION = "v3.0";

export type TimelineRawEventInput = {
	rawEventId: string;
	occurredAt: number;
	sourceType: "commit" | "pull_request" | "release" | "other";
	summary: string;
	filePaths?: string[];
	surfaceHints?: Array<
		"product_core" | "marketing_surface" | "infra" | "docs" | "experiments" | "unknown"
	>;
	domainHint?: { name: string; matchedBy: "path" | "entity" | "none" };
};

export type TimelineInterpretationOutput = {
	bucket: {
		bucketId: string;
		bucketStartAt: number;
		bucketEndAt: number;
		cadence: string;
		title: string;
		narrative?: string;
		domains?: string[];
	};
	events: Array<{
		capabilitySlug?: string | null;
		domain?: string;
		type: "feature" | "fix" | "improvement" | "work";
		title: string;
		summary?: string;
		visibility?: "public" | "internal";
		relevance?: number;
		rawEventIds: string[];
	}>;
	newCapabilities?: Array<{
		slug: string;
		name: string;
		domain?: string;
		description?: string;
		visibility?: "public" | "internal";
		featureSlugs?: string[];
	}>;
	newDomains?: Array<{ name: string; purpose?: string }>;
};

export const timelineInterpretationPrompt = `
You are the Timeline Context Interpreter Agent. Transform raw source events into a narrative timeline aligned with the product's baseline and context.

Principles:
- The output must be product narrative, NOT a list of commits.
- Group related raw events into a single narrative when they describe one coherent product increment.
- Align the narrative with product baseline + product context taxonomy (productDomains, audienceSegments, strategicPillars) and the featureMap.
- Use releaseCadence to decide buckets and assign each rawEvent to one bucket.
- Output ONLY valid JSON, no markdown, no commentary.

Input JSON:
{
  "languagePreference": "en|es|...",
  "releaseCadence": "every_2_days | twice_weekly | weekly | biweekly | monthly | irregular | unknown",
  "bucket": { "bucketId": "...", "bucketStartAt": 0, "bucketEndAt": 0 },
  "baseline": { ... },
  "productContext": { ... },
  "capabilities": [
    { "slug": "...", "name": "...", "domain": "...", "visibility": "public|internal", "featureSlugs": ["..."] }
  ],
  "repoDomains": [
    { "name": "...", "pathPatterns": ["..."], "schemaEntities": ["..."] }
  ],
  "repoContexts": [
    { "sourceId": "org/repo", "classification": "product_core|marketing_surface|infra|docs|experiments|unknown", "notes": "..." }
  ],
  "rawEvents": [
    {
      "rawEventId": "…",
      "occurredAt": 0,
      "sourceType": "commit|pull_request|release|other",
      "summary": "…",
      "filePaths": ["apps/app/..."],
      "surfaceHints": ["product_core"],
      "domainHint": { "name": "...", "matchedBy": "path|entity|none" }
    }
  ]
}

Output JSON:
{
  "bucket": {
    "bucketId": "2026-W02",
    "bucketStartAt": 0,
    "bucketEndAt": 0,
    "cadence": "weekly",
    "title": "…",
    "narrative": "…",
    "domains": ["optional repo domain name (from repoDomains)"]
  },
  "events": [
    {
      "capabilitySlug": "invite-member",
      "domain": "Organizations",
      "type": "feature|fix|improvement|work",
      "title": "...",
      "summary": "...",
      "visibility": "public|internal",
      "relevance": 1-5,
      "rawEventIds": ["rawEventId1", "rawEventId2"]
    }
  ],
  "newCapabilities": [
    {
      "slug": "kebab-case-identifier",
      "name": "Capability name",
      "domain": "optional repo domain name (from repoDomains)",
      "description": "...",
      "visibility": "public|internal",
      "featureSlugs": ["..."]
    }
  ],
  "newDomains": [
    { "name": "New Domain", "purpose": "..." }
  ]
}

Rules:
- Use the provided languagePreference for all text.
- Each rawEventId must appear in exactly one event.
- Do not include raw commit messages or hashes in titles; summarize as product impact.
- If releaseCadence is unknown or irregular, still bucket by time and set cadence accordingly.
- If bucket is provided, output exactly one narrative and use the provided bucketId/bucketStartAt/bucketEndAt.
- Mark items "internal" when they are below-the-glass development work that does not change the value proposition.
- Keep bucket narrative public-safe; only mention public events in narrative.
- If all events are internal, you may omit narrative or keep it minimal.
- Capabilities are canonical: if an event matches one, use its slug.
- Only include newCapabilities whose slug is NOT in the input capabilities list.
- Slugs must be kebab-case and stable. Use the same slug for the same capability across events.
- Use repoContexts, domainHint and surfaceHints to judge relevance: marketing_surface, docs, infra, experiments are usually internal unless they clearly map to value for the ICP.
- If surfaceHints includes marketing_surface and product_core is not present, treat the item as internal by default.
`.trim();
