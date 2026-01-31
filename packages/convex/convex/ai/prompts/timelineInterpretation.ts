export const TIMELINE_INTERPRETER_PROMPT_VERSION = "v2.1";

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

export type TimelineWorkItem = {
	type: "feature" | "fix" | "improvement";
	featureSlug: string;
	title: string;
	summary?: string;
	visibility?: "public" | "internal";
	isNew?: boolean;
	relatesTo?: string;
};

export type TimelineNarrativeEvent = {
	bucketId: string;
	bucketStartAt: number;
	bucketEndAt: number;
	cadence: string;
	title: string;
	summary?: string;
	narrative?: string;
	kind: string;
	domain?: string;
	relevance?: number;
	rawEventIds: string[];
	workItems?: TimelineWorkItem[];
	bucketImpact?: number;
};

export type TimelineInterpretationOutput = {
	narratives: TimelineNarrativeEvent[];
	newFeatures?: Array<{
		slug: string;
		name: string;
		domain?: string;
		description?: string;
		visibility?: "public" | "internal";
	}>;
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
  "existingFeatures": [
    { "slug": "...", "name": "...", "domain": "...", "visibility": "public|internal" }
  ],
  "featureMap": { "features": [ { "id": "...", "slug": "...", "name": "...", "domain": "..." } ] },
  "repoDomains": [
    { "name": "...", "pathPatterns": ["..."], "schemaEntities": ["..."], "capabilities": ["..."] }
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
  "newFeatures": [
    {
      "slug": "kebab-case-identifier",
      "name": "Feature name",
      "domain": "optional repo domain name (from repoDomains)",
      "description": "...",
      "visibility": "public|internal"
    }
  ],
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
      "domains": ["optional repo domain name (from repoDomains)"],
      "relevance": 1-5,
      "rawEventIds": ["rawEventId1", "rawEventId2"],
      "workItems": [
        {
          "type": "feature|fix|improvement",
          "featureSlug": "kebab-case-identifier",
          "title": "...",
          "summary": "...",
          "visibility": "public|internal",
          "isNew": true,
          "relatesTo": "optional-feature-slug"
        }
      ],
      "bucketImpact": 1
    }
  ]
}

Rules:
- Use the provided languagePreference for all text.
- Each rawEventId must appear in exactly one narrative entry.
- Do not include raw commit messages or hashes in titles; summarize as product impact.
- If releaseCadence is unknown or irregular, still bucket by time and set cadence accordingly.
- If bucket is provided, output exactly one narrative and use the provided bucketId/bucketStartAt/bucketEndAt.
- Mark items "internal" when they are below-the-glass development work that does not change the value proposition.
- Keep summary/narrative public-safe; only mention public workItems in summary/narrative.
- If all workItems are internal, you may omit summary/narrative or keep them minimal.
- Every public item must map clearly to an existing feature or a new feature you define.
- existingFeatures are canonical: if a work item matches one, use that slug and set isNew false.
- Only include newFeatures whose slug is NOT in existingFeatures.
- When an existing feature match exists, use its slug and name for workItems.featureSlug/title.
- For new features, add an entry in newFeatures and use its slug for workItems.featureSlug.
- Slugs must be kebab-case and stable. Use the same slug for the same feature across events.
- Use relatesTo only for fix/improvement items to reference the related feature slug.
- Use repoContexts, domainHint and surfaceHints to judge relevance: marketing_surface, docs, infra, experiments are usually internal unless they clearly map to value for the ICP.
- If surfaceHints includes marketing_surface and product_core is not present, treat the item as internal by default.
`.trim();
