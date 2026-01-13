export const SKILL_CONTENTS: Record<string, string> = {
	"surface-classification": `---
name: surface-classification
version: v1.0
description: Classifies code sources into product surfaces with explicit buckets.
---

## Surface Taxonomy

- product_core: Main user-facing product surface.
- marketing_surface: Marketing site, landing pages, brand assets.
- infra: Platform, backend, reliability, shared tooling.
- docs: Documentation, guides, help center.
- experiments: Spikes, prototypes, sandboxes.
- unknown: Not enough evidence.

## Classification Rules

1. Do not use "mixed". Pick a primary surface.
2. If multiple surfaces exist, return surfaceBuckets with pathPrefix evidence.
3. Base decisions on structure signals (apps/, packages/, docs/).
4. Use app paths before sample text.
5. If evidence is weak, return "unknown" with a short reason.

## Output Format

{
  "classification": "product_core",
  "notes": "Monorepo with core app and marketing site",
  "surfaceBuckets": [
    { "surface": "product_core", "pathPrefix": "apps/app", "signalCount": 120 },
    { "surface": "marketing_surface", "pathPrefix": "apps/website", "signalCount": 40 }
  ]
}
`,
	"domain-taxonomy": `---
name: domain-taxonomy
version: v1.0
description: Maps product surfaces to functional domains using a fixed taxonomy.
---

## Domain Taxonomy

Product domains:
- Core Experience
- Data Ingestion
- Automation & AI
- Analytics & Reporting
- Content Distribution
- Collaboration & Access

Technical domains:
- Platform Foundation

Internal domains:
- Internal Tools
- Marketing Presence
- Documentation & Support

## Mapping Rules

1. Product domains require evidence from product_core or product_platform.
2. Marketing/docs/admin evidence should map to internal domains.
3. Keep domain count small for MVP (2-3 product + Platform Foundation + Internal Tools).
4. Prefer naming that matches baseline vocabulary when available.

## Output Format

{
  "domains": [
    { "name": "Core Experience", "kind": "product", "weight": 0.8, "evidence": ["route: apps/app/src/routes/..."] }
  ],
  "decisions": [
    { "domain": "Analytics & Reporting", "decision": "excluded", "reason": "No evidence in product_core" }
  ]
}
`,
	"feature-extraction": `---
name: feature-extraction
version: v1.0
description: Extracts product features and domain map from structured source evidence.
---

## Principles

- Focus on user-facing flows that contribute to the value proposition.
- Prefer stable names and continuity with previous feature map.
- Use evidence priority: UI text > docs > routes > component names.
- Do not invent domains outside the fixed taxonomy.

## Taxonomy (fixed labels)

Product domains:
- Core Experience
- Data Ingestion
- Automation & AI
- Analytics & Reporting
- Content Distribution
- Collaboration & Access

Technical domains:
- Platform Foundation

Internal domains:
- Internal Tools
- Marketing Presence
- Documentation & Support

## Output Format

{
  "domains": [
    { "name": "Core Experience", "description": "...", "kind": "product", "weight": 0.7 }
  ],
  "domainMap": {
    "columns": 6,
    "rows": 4,
    "items": [
      { "domain": "Platform Foundation", "x": 0, "y": 3, "w": 6, "h": 1, "kind": "technical", "weight": 0.4 }
    ]
  },
  "decisionSummary": {
    "surfaceSummary": [
      { "surface": "product_core", "signalCount": 24, "samplePaths": ["apps/app/src/..."] }
    ],
    "domainDecisions": [
      {
        "domain": "Core Experience",
        "decision": "kept",
        "rationale": "Strong UI + route evidence in product_core.",
        "alignment": "high",
        "surfaces": ["product_core"],
        "evidence": [{ "type": "route", "value": "Timeline route", "path": "apps/app/src/..." }]
      }
    ],
    "featureDecisions": [
      {
        "feature": "Narrative Timeline",
        "domain": "Core Experience",
        "visibility": "public",
        "rationale": "User-facing timeline UI in product_core.",
        "alignment": "high",
        "surfaces": ["product_core"],
        "evidence": [{ "type": "component", "value": "Timeline list UI", "path": "apps/app/src/components/..." }]
      }
    ]
  },
  "features": [
    {
      "id": "baseline-editor",
      "slug": "baseline-editor",
      "name": "Baseline editor",
      "domain": "Core Experience",
      "description": "...",
      "visibilityHint": "public|internal",
      "confidence": 0.0-1.0,
      "deprecated": false,
      "lastSeenAt": 0,
      "evidence": [
        { "type": "ui_text|doc|route|component", "value": "...", "path": "..." }
      ]
    }
  ],
  "generatedAt": 0,
  "sourcesUsed": ["github"]
}
`,
	"surface-signal-mapping": `---
name: surface-signal-mapping
version: v1.0
description: Maps sources to product surfaces and buckets with deterministic rules.
---

## Surfaces

- management: product direction, requirements, planning.
- design: UX, UI, visual design, prototypes.
- product_front: user-facing screens, components, UI flows.
- platform: APIs, auth, backend, infrastructure.
- marketing: marketing pages, campaigns, distribution.
- admin: analytics, housekeeping, operational tooling.
- docs: documentation for users and developers.

## Rules

1. A source can map to multiple surfaces.
2. Use evidence from paths, labels, and source type.
3. For GitHub repos, use path prefixes as bucketId (e.g. apps/webapp, packages/convex, docs).
4. Keep output deterministic: stable ordering, no extra commentary.

## Output Format

{
  "sources": [
    {
      "sourceType": "github",
      "sourceId": "org/repo",
      "sourceLabel": "org/repo",
      "surfaces": [
        { "surface": "product_front", "bucketId": "apps/webapp", "evidence": ["path: apps/webapp"] },
        { "surface": "platform", "bucketId": "packages/convex", "evidence": ["path: packages/convex"] }
      ]
    }
  ]
}
`,
	"glossary-curation": `---
name: glossary-curation
version: v1.0
description: Curates product glossary terms from signals for tenant-facing language.
---

## Goal

Select 20 terms that a tenant would recognize and that represent the product value proposition.

## Principles

- Favor product language from baseline, marketing, docs, and UI titles.
- Avoid generic UI copy (e.g. "title", "welcome", "continue").
- Terms must be concrete and narrative-ready.
- Use evidence from signals only; do not invent.

## Output format

{
  "terms": [
    { "term": "Product Timeline", "evidenceIds": ["sig_1", "sig_7"] }
  ]
}
`,
};
