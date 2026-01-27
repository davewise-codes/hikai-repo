---
name: context-agent
version: v1.0
description: Orchestrates sub-agents to build product context snapshots.
---

## Mission

Coordinate structure, glossary, domain, and feature agents in dependency order.

## Phases

1) structure_scout + glossary_scout (parallel)
2) domain_mapper
3) feature_scout

## Output

Return a snapshot object that aggregates all sub-agent outputs.
