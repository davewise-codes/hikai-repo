---
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
