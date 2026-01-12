---
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
