export const TIMELINE_INTERPRETER_PROMPT_VERSION = "v1.0";

export type TimelineRawEventInput = {
	rawEventId: string;
	occurredAt: number;
	sourceType: "commit" | "pull_request" | "release" | "other";
	summary: string;
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
- Output ONLY valid JSON, no markdown, no commentary.

Input JSON:
{
  "languagePreference": "en|es|...",
  "releaseCadence": "every_2_days | twice_weekly | weekly | biweekly | monthly | irregular | unknown",
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
      "rawEventIds": ["rawEventId1", "rawEventId2"]
    }
  ]
}

Rules:
- Use the provided languagePreference for all text.
- Each rawEventId must appear in exactly one narrative entry.
- Do not include raw commit messages or hashes in titles; summarize as product impact.
- Use tags derived from the product taxonomy when possible.
- If releaseCadence is unknown or irregular, still bucket by time and set cadence accordingly.
`.trim();
