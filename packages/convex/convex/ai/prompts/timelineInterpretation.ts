export const TIMELINE_INTERPRETER_PROMPT_VERSION = "v1.4";

export type TimelineRawEventInput = {
	rawEventId: string;
	occurredAt: number;
	sourceType: "commit" | "pull_request" | "release" | "other";
	summary: string;
	filePaths?: string[];
	surfaceHints?: Array<
		"product_core" | "marketing_surface" | "infra" | "docs" | "experiments" | "unknown"
	>;
};

export type TimelineNarrativeItem = {
	title: string;
	summary?: string;
	focusArea?: string;
	visibility?: "public" | "internal";
};

export type TimelineNarrativeEvent = {
	bucketId: string;
	bucketStartAt: number;
	bucketEndAt: number;
	cadence: string;
	title: string;
	summary: string;
	narrative: string;
	kind: string;
	tags?: string[];
	audience?: string;
	feature?: string;
	relevance?: number;
	rawEventIds: string[];
	focusAreas?: string[];
	features?: TimelineNarrativeItem[];
	fixes?: TimelineNarrativeItem[];
	improvements?: TimelineNarrativeItem[];
	ongoingFocusAreas?: string[];
	bucketImpact?: number;
};

export type TimelineInterpretationOutput = {
	narratives: TimelineNarrativeEvent[];
};

export const timelineInterpretationPrompt = `
You are the Timeline Context Interpreter Agent. Transform raw source events into a narrative timeline aligned with the product's baseline and context.

Principles:
- The output must be product narrative, NOT a list of commits.
- Group related raw events into a single narrative when they describe one coherent product increment.
- Align the narrative with product baseline + product context taxonomy (keyFeatures, productDomains, productEpics, audienceSegments, strategicPillars).
- Use releaseCadence to decide buckets and assign each rawEvent to one bucket.
- Use consistent focusAreas derived from the baseline/context taxonomy (reuse existing labels; avoid inventing new ones).
- Output ONLY valid JSON, no markdown, no commentary.

Input JSON:
{
  "languagePreference": "en|es|...",
  "releaseCadence": "every_2_days | twice_weekly | weekly | biweekly | monthly | irregular | unknown",
  "bucket": { "bucketId": "...", "bucketStartAt": 0, "bucketEndAt": 0 },
  "baseline": { ... },
  "productContext": { ... },
  "repoContexts": [
    { "sourceId": "org/repo", "classification": "product_core|marketing_surface|infra|docs|experiments|unknown", "notes": "..." }
  ],
  "rawEvents": [
    {
      "rawEventId": "…",
      "occurredAt": 0,
      "sourceType": "commit|pull_request|release|other",
      "summary": "…",
      "filePaths": ["apps/webapp/..."],
      "surfaceHints": ["product_core"]
    }
  ]
}

Output JSON:
{
  "narratives": [
    {
      "bucketId": "2026-W02",
      "bucketStartAt": 0,
      "bucketEndAt": 0,
      "cadence": "weekly",
      "title": "…",
      "summary": "…",
      "narrative": "…",
      "kind": "feature|bugfix|release|docs|marketing|infra|other",
      "tags": ["feature:...", "audience:...", "pillar:..."],
      "audience": "optional audience segment name",
      "feature": "optional keyFeature name",
      "relevance": 1-5,
      "rawEventIds": ["rawEventId1", "rawEventId2"],
      "focusAreas": ["Focus Area A", "Focus Area B"],
      "features": [{ "title": "...", "summary": "...", "focusArea": "Focus Area A", "visibility": "public|internal" }],
      "fixes": [{ "title": "...", "summary": "...", "focusArea": "Focus Area B", "visibility": "public|internal" }],
      "improvements": [{ "title": "...", "summary": "...", "focusArea": "Focus Area A", "visibility": "public|internal" }],
      "ongoingFocusAreas": ["Focus Area A"],
      "bucketImpact": 1
    }
  ]
}

Rules:
- Use the provided languagePreference for all text.
- Each rawEventId must appear in exactly one narrative entry.
- Do not include raw commit messages or hashes in titles; summarize as product impact.
- Use tags derived from the product taxonomy when possible.
- If releaseCadence is unknown or irregular, still bucket by time and set cadence accordingly.
- For focusAreas, prefer taxonomy labels from baseline/context; if no match, use "Other".
- If bucket is provided, output exactly one narrative and use the provided bucketId/bucketStartAt/bucketEndAt.
- Mark items "internal" when they are below-the-glass development work that does not change the value proposition.
- Keep summary/narrative public-safe; internal items should only appear in improvements and not be mentioned in summary/narrative.
- Every public item must map clearly to a keyFeature or productDomain; if it doesn't, mark it internal.
- Use repoContexts and surfaceHints to judge relevance: marketing_surface, docs, infra, experiments are usually internal unless they clearly map to value for the ICP.
- If surfaceHints includes marketing_surface and product_core is not present, treat the item as internal by default.
`.trim();
