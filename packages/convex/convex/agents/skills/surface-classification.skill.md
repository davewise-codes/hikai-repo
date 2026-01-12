---
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
