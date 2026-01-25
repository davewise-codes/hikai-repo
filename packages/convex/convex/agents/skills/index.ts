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
	"domain-map-agent": `---
name: domain-map-agent
version: v3.0
description: Autonomous agent that builds a product domain map through layered codebase exploration.
---

## Goal

Build a domain map that reflects the main product areas based on evidence from the codebase.

## Tools

- list_dirs: See directory structure (depth-limited). Use first.
- list_files: List files in a specific directory (non-recursive).
- read_file: Read specific files to gather evidence.
- delegate: Run sub-agent for structure scouting.
- validate_json: Validate JSON syntax and return parsed data.
- todo_manager: Track the execution plan.

## Exploration Strategy (suggested)

- Start with list_dirs({ depth: 2 }) to see structure.
- Identify product code areas (apps/, src/, domains/, features/, routes/).
- Drill down with list_dirs({ path: "...", depth: 2 }).
- Use list_files({ path: "..." }) to see files in a folder.
- read_file on a few key files to justify each domain.

## Guidelines

- Start broad (directories) and narrow down (files, content).
- Be selective; do not read everything.
- Use delegate for structure_scout when you need a fast structure summary.
- Use actual folder names as domain names.
- Each domain needs file path evidence.
- Each domain should include at least 2 evidence paths, with at least 1 non-README file.
- Each domain must include at least one code file you actually read (.ts/.tsx).
- Before output, derive domain candidates from src/domains (or equivalent) to avoid missing domains.
- When your plan is completed, immediately produce JSON -> validate_json -> final JSON output.
- If you feel stuck, regenerate the JSON candidate and validate it (never return an empty response).
- Ignore marketing, admin, observability, CI/CD, tests, configs.
- Always create a plan first, then update it as you progress.
- Output MUST be valid JSON and match the domain_map schema (name, responsibility, weight, evidence).
- Weights must sum to 1.0.
- Before final output, call validate_json with your JSON object. You may include it in the same tool_use response as todo_manager if needed. Fix parse errors if any.
`,
	"structure-scout": `---
name: structure-scout
version: v1.0
description: Reconnaissance agent that maps repository structure, identifies tech stack, and locates business entry points.
---

## Mission

Produce a structural map of a codebase that answers:
1. What kind of project is this? (shape)
2. What technologies does it use? (stack)
3. Where does business logic live? (tiles)
4. Where do user flows start? (entry points)

Do NOT infer domains or business meaning. Only structure and location.

## Tools

- list_dirs: Directory structure (use depth parameter). Start here.
- list_files: Files in a specific directory. Use to inspect tiles.
- read_file: Read specific files. Budget: max 10 reads total.
- validate_json: Validate JSON syntax and return parsed data.

## Planning (recommended but optional)

If you use todo_manager, create a simple plan:
1. Wide scan (list_dirs depth 2)
2. Identify tiles (apps/ and packages/)
3. Detect entry points (routes/ or registries)

If you skip todo_manager, proceed directly and call validate_json when done.

## Output Schema

{
  "repoShape": "monorepo | single-app | microservices | hybrid",
  "techStack": {
    "language": "typescript | python | go | java | ...",
    "framework": "next | react | fastapi | express | ...",
    "runtime": "node | bun | deno | python | ...",
    "buildTool": "turbo | nx | pnpm | npm | gradle | ..."
  },
  "tiles": [
    {
      "path": "apps/webapp",
      "type": "product | marketing | docs | infra | packages | unknown",
      "signals": ["routes/", "domains/", "components/"],
      "estimatedSize": "small | medium | large",
      "priority": "high | medium | low"
    }
  ],
  "entryPoints": [
    {
      "path": "apps/webapp/src/routes",
      "type": "router | handler | registry | api-gateway | background-jobs",
      "pattern": "file-based | explicit | decorator-based",
      "coverage": "high | medium | low"
    }
  ],
  "configFiles": {
    "root": ["package.json", "turbo.json", "tsconfig.json"],
    "notable": ["convex/schema.ts", ".env.example"]
  },
  "explorationPlan": [
    "apps/webapp/src/domains/",
    "packages/convex/convex/"
  ],
  "confidence": 0,
  "limitations": ["Could not access private packages"]
}

## Exploration Strategy

Phase 1: Wide Scan (1-2 reads max)
- list_dirs({ depth: 2 })
- Read config files only if needed for stack.

Phase 2: Tile Identification (2-3 reads max)
- list_dirs({ path: "apps/webapp", depth: 2 })
- list_files({ path: "apps/webapp/src" })

Phase 3: Entry Point Detection (4-5 reads max)
- Focus on routes/, pages/, app/, router files.
- Read files to confirm routing pattern.

Stop exploration when:
- Repo shape is identified
- Tech stack is known
- At least 1 tile is found
- At least 1 entry point is located OR limitations explain why not
- Budget (10 reads) is not exceeded
`,
};
