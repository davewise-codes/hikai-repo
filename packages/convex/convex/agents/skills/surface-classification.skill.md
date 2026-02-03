---
name: surface-classification
version: v1.0
description: Classifies code sources into product surfaces with explicit buckets.
---

## Surface Taxonomy

- product_front: Main user-facing product UI.
- platform: Backend services, APIs, core platform logic.
- infra: Deploy/CI/CD, cloud, reliability, build tooling.
- marketing: Marketing site, landing pages, brand assets.
- doc: Documentation, guides, help center.
- management: Roadmaps, specs, planning artifacts.
- admin: Internal admin/backoffice apps.
- analytics: Analytics/telemetry systems and dashboards.
- unknown: Not enough evidence.

## Classification Rules

1. Do not use "mixed". Pick a primary surface.
2. If multiple surfaces exist, return surfaceBuckets with pathPrefix evidence.
3. Base decisions on structure signals (apps/, packages/, docs/).
4. Use app paths before sample text.
5. If evidence is weak, return "unknown" with a short reason.

## Output Format

{
  "sourceCategory": "monorepo",
  "notes": "Monorepo with core app and marketing site",
  "surfaceMapping": [
    { "surface": "product_front", "pathPrefix": "apps/app/src" },
    { "surface": "marketing", "pathPrefix": "apps/website" }
  ]
}
