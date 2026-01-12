---
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
