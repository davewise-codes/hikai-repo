export const TIMELINE_INTERPRETER_PROMPT_VERSION = "v1.2";

export type TimelineRawEventInput = {
	rawEventId: string;
	occurredAt: number;
	sourceType: "commit" | "pull_request" | "release" | "other";
	summary: string;
};

export type TimelineNarrativeItem = {
	title: string;
	summary?: string;
	focusArea?: string;
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
  "rawEvents": [
    { "rawEventId": "…", "occurredAt": 0, "sourceType": "commit|pull_request|release|other", "summary": "…" }
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
      "features": [{ "title": "...", "summary": "...", "focusArea": "Focus Area A" }],
      "fixes": [{ "title": "...", "summary": "...", "focusArea": "Focus Area B" }],
      "improvements": [{ "title": "...", "summary": "...", "focusArea": "Focus Area A" }]
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
`.trim();
