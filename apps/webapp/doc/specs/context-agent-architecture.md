# Context Agent Architecture Specification

## Executive Summary

This specification describes the architecture for a **Context Agent** system that orchestrates multiple specialized sub-agents to build and maintain rich product context. The system enables autonomous context generation through agent delegation, producing structured snapshots that capture repository structure, domain maps, glossaries, and features.

---

## 1. Current State

### 1.1 Existing Schema

**`products` table** currently contains mixed concerns:
- Configuration: `name`, `slug`, `organizationId`, `sources`
- Derived context: `structureScout`, `baseline`, `domainMap`
- Snapshot reference: `currentProductSnapshot`

**`productContextSnapshots` table** exists but is underutilized.

### 1.2 Existing Agents

| Agent | Status | Output |
|-------|--------|--------|
| Structure Scout | ✅ Working | `repoStructure` (tiles, entryPoints, techStack) |
| Domain Map | ✅ Working | `domainMap` (domains, weights, evidence) |
| Glossary Scout | ❌ Not built | - |
| Feature Scout | ❌ Not built | - |
| Context Agent | ❌ Not built | - |

### 1.3 Current Flow

Agents run independently, triggered manually. No orchestration or dependency management.

---

## 2. Opportunity

### 2.1 Problem Statement

1. **No orchestration**: Agents don't know about each other or their dependencies
2. **Context fragmentation**: Derived data mixed with configuration in `products`
3. **No versioning**: Can't track context evolution over time
4. **No enrichment pipeline**: Agents don't build on each other's outputs
5. **Missing context types**: No glossary, no features extraction

### 2.2 Desired Outcome

A **Context Agent** that:
- Orchestrates sub-agents in dependency order
- Produces versioned context snapshots
- Enables incremental updates
- Builds rich, interconnected product understanding

---

## 3. Proposed Architecture

### 3.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      INPUTS                                  │
├─────────────────────────────────────────────────────────────┤
│  products.baseline     (user-defined product description)   │
│  products.sources      (GitHub connections, etc.)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CONTEXT AGENT                             │
│                   (Orchestrator)                             │
│                                                              │
│  Responsibilities:                                           │
│  - Determine which sub-agents to run                        │
│  - Manage execution order based on dependencies             │
│  - Aggregate outputs into snapshot                          │
│  - Handle failures gracefully                               │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   │
   ┌─────────────┐    ┌─────────────┐            │
   │  Structure  │    │  Glossary   │            │
   │   Scout     │    │   Scout     │            │
   │             │    │             │            │
   │ Inputs:     │    │ Inputs:     │            │
   │ - sources   │    │ - baseline  │            │
   │             │    │ - sources   │            │
   │ Output:     │    │ - docs      │            │
   │ - repoStruc │    │             │            │
   └─────────────┘    │ Output:     │            │
          │           │ - glossary  │            │
          │           └─────────────┘            │
          │                   │                  │
          └─────────┬─────────┘                  │
                    │                            │
                    ▼                            │
          ┌─────────────────────┐                │
          │    Domain Mapper    │                │
          │                     │                │
          │ Inputs:             │                │
          │ - baseline          │                │
          │ - repoStructure     │                │
          │ - glossary          │                │
          │                     │                │
          │ Output:             │                │
          │ - domainMap         │                │
          └─────────────────────┘                │
                    │                            │
                    ▼                            │
          ┌─────────────────────┐                │
          │   Feature Scout     │◄───────────────┘
          │                     │
          │ Inputs:             │
          │ - domainMap         │
          │ - repoStructure     │
          │ - glossary          │
          │                     │
          │ Output:             │
          │ - features          │
          └─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│               productContextSnapshots                        │
│                                                              │
│  New snapshot created with all outputs                       │
│  products.currentProductSnapshot updated                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Dependency Graph

```
Phase 1 (parallel):
  structureScout ──┐
                   ├──► Phase 2
  glossaryScout ───┘

Phase 2 (sequential):
  domainMapper ────────► Phase 3

Phase 3 (sequential):
  featureScout ────────► Done
```

### 3.3 Agent Delegation Pattern

Following the [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) V3 pattern:

- **Context Agent** is the coordinator with access to `Task` tool
- **Sub-agents** have isolated context and specialized tools
- Sub-agents cannot spawn other sub-agents (safeguard)
- Each sub-agent returns structured JSON output
- Context Agent aggregates outputs and creates snapshot

---

## 4. Schema Changes

### 4.1 Products Table (Simplified)

Remove derived context fields. Keep only configuration.

```typescript
// products (AFTER)
{
  _id: Id<"products">,
  name: string,
  slug: string,
  organizationId: Id<"organizations">,

  // Configuration
  baseline: {
    description: string,
    valueProposition?: string,
    targetAudience?: string,
    // ...
  } | null,

  // Sources
  sources: [...],

  // Current context reference
  currentProductSnapshot: Id<"productContextSnapshots"> | null,

  // Timestamps
  createdAt: number,
  updatedAt: number,
}

// REMOVED from products:
// - structureScout (moved to snapshot)
// - domainMap (moved to snapshot)
```

### 4.2 Product Context Snapshots Table (Enhanced)

```typescript
// productContextSnapshots
{
  _id: Id<"productContextSnapshots">,
  productId: Id<"products">,

  // Snapshot metadata
  createdAt: number,
  generatedBy: "manual" | "contextAgent" | "scheduled",
  triggerReason: string | null,  // "initial_setup" | "source_change" | "manual_refresh"

  // Agent outputs
  repoStructure: {
    repoShape: "monorepo" | "single-app" | "microservices" | "hybrid",
    techStack: {
      language: string,
      framework: string,
      runtime: string,
      buildTool: string,
    },
    tiles: Array<{
      path: string,
      type: "product" | "marketing" | "docs" | "infra" | "packages" | "unknown",
      signals: string[],
      estimatedSize: "small" | "medium" | "large",
      priority: "high" | "medium" | "low",
    }>,
    entryPoints: Array<{
      path: string,
      type: "router" | "handler" | "registry" | "api-gateway" | "background-jobs",
      pattern: string,
      coverage: "high" | "medium" | "low",
    }>,
    configFiles: {
      root: string[],
      notable: string[],
    },
    explorationPlan: string[],
    confidence: number,
    limitations: string[],
  } | null,

  glossary: {
    terms: Array<{
      term: string,
      definition: string,
      sources: Array<{
        type: "baseline" | "code" | "docs" | "marketing",
        path?: string,
        excerpt?: string,
      }>,
      confidence: number,
    }>,
    conflicts: Array<{
      terms: string[],
      resolution: string,
      rationale: string,
    }>,
    generatedAt: number,
  } | null,

  domainMap: {
    domains: Array<{
      name: string,
      responsibility: string,
      weight: number,
      evidence: string[],
    }>,
    summary: {
      totalDomains: number,
      warnings: string[],
    },
  } | null,

  features: {
    features: Array<{
      id: string,
      name: string,
      domain: string,
      description: string,
      visibility: "public" | "internal",
      confidence: number,
      evidence: Array<{
        type: "route" | "component" | "api" | "docs",
        path: string,
        excerpt?: string,
      }>,
    }>,
    generatedAt: number,
  } | null,

  // Traceability
  agentRuns: {
    contextAgent?: Id<"agentRuns">,
    structureScout?: Id<"agentRuns">,
    glossaryScout?: Id<"agentRuns">,
    domainMapper?: Id<"agentRuns">,
    featureScout?: Id<"agentRuns">,
  },

  // Status
  status: "in_progress" | "completed" | "failed" | "partial",
  completedPhases: ("structure" | "glossary" | "domains" | "features")[],
  errors: Array<{
    phase: string,
    error: string,
    timestamp: number,
  }>,
}
```

---

## 5. Agent Specifications

### 5.1 Context Agent (Orchestrator)

**Role**: Coordinator that delegates to sub-agents and aggregates results.

**Tools Available**:
- `task`: Spawn sub-agents (structure_scout, glossary_scout, domain_mapper, feature_scout)
- `read_snapshot`: Read current or previous snapshots
- `write_snapshot`: Create/update snapshot

**Skill**: `context-agent.skill.md`

**Flow**:
1. Check what context already exists (read current snapshot)
2. Determine what needs to be generated/updated
3. Execute Phase 1: Spawn structureScout + glossaryScout (parallel if possible)
4. Wait for Phase 1 completion
5. Execute Phase 2: Spawn domainMapper with Phase 1 outputs
6. Wait for Phase 2 completion
7. Execute Phase 3: Spawn featureScout with all prior outputs
8. Aggregate all outputs into new snapshot
9. Update products.currentProductSnapshot

**Error Handling**:
- If a sub-agent fails, mark phase as failed but continue with available data
- Create partial snapshot with `status: "partial"`
- Log errors for debugging

### 5.2 Structure Scout (Sub-agent)

**Status**: ✅ Already implemented

**Skill**: `structure-scout.skill.md`

**Tools**: `list_dirs`, `list_files`, `read_file`, `validate_json`

**Input**: Product sources (GitHub connection)

**Output**: `repoStructure` object

### 5.3 Glossary Scout (Sub-agent)

**Status**: ❌ To be built

**Skill**: `glossary-scout.skill.md`

**Tools**: `list_files`, `read_file`, `validate_json`

**Inputs**:
- `baseline` (product description from user)
- `sources` (for code/docs extraction)
- `marketingSurfaces` (if available, for enrichment)

**Output**: `glossary` object

**Strategy**:
1. Extract terms from baseline (user's product description)
2. Scan README, docs/, CLAUDE.md for terminology
3. Identify key class/component names from code
4. If marketing surfaces exist, extract customer-facing terms
5. Detect conflicts (same concept, different names)
6. Produce unified glossary with sources and confidence

### 5.4 Domain Mapper (Sub-agent)

**Status**: ✅ Already implemented (needs input adaptation)

**Skill**: `domain-map-agent.skill.md` (update to accept pre-computed inputs)

**Tools**: `list_dirs`, `list_files`, `read_file`, `validate_json`, `todo_manager`

**Inputs**:
- `baseline` (product description)
- `repoStructure` (from Structure Scout)
- `glossary` (from Glossary Scout)

**Output**: `domainMap` object

**Adaptation Needed**:
- Accept `repoStructure` as input to skip initial exploration
- Use `glossary` terms for domain naming consistency
- Focus exploration on `repoStructure.explorationPlan` paths

### 5.5 Feature Scout (Sub-agent)

**Status**: ❌ To be built

**Skill**: `feature-scout.skill.md`

**Tools**: `list_files`, `read_file`, `validate_json`

**Inputs**:
- `domainMap` (domains to explore)
- `repoStructure` (entry points, tiles)
- `glossary` (for consistent naming)

**Output**: `features` object

**Strategy**:
1. For each domain in domainMap:
   - Explore entry points (routes, handlers)
   - Identify user-facing features
   - Extract feature names from code/UI
2. Classify features by visibility (public/internal)
3. Link features to domains
4. Assess confidence based on evidence quality

---

## 6. Execution Triggers

### 6.1 Initial Implementation (Manual)

For testing, Context Agent runs manually via:
- Admin action in webapp
- CLI/API call

### 6.2 Future Triggers

| Trigger | When | Behavior |
|---------|------|----------|
| Initial setup | Product created + first source connected | Full context generation |
| Source change | New GitHub repo connected | Incremental update |
| Significant change | Major code changes detected | Partial regeneration |
| Manual refresh | User requests | Full regeneration |
| Scheduled | Weekly/monthly | Incremental update |

---

## 7. Implementation Plan

### Phase 1: Schema Migration
1. Add new fields to `productContextSnapshots`
2. Create migration to move existing data
3. Update queries to use snapshot

### Phase 2: Glossary Scout
1. Write `glossary-scout.skill.md`
2. Implement agent action
3. Test independently

### Phase 3: Feature Scout
1. Write `feature-scout.skill.md`
2. Implement agent action
3. Test independently

### Phase 4: Context Agent
1. Write `context-agent.skill.md`
2. Implement orchestration with Task tool
3. Implement snapshot creation
4. Test full pipeline

### Phase 5: Domain Mapper Adaptation
1. Update skill to accept pre-computed inputs
2. Optimize exploration based on Structure Scout output
3. Test integration

### Phase 6: Integration & Polish
1. Wire up to product settings UI
2. Add progress indicators
3. Error handling and retry logic

---

## 8. Success Criteria

### Functional
- [ ] Context Agent successfully orchestrates all 4 sub-agents
- [ ] Each sub-agent produces valid output matching schema
- [ ] Snapshot is created with all context types
- [ ] products.currentProductSnapshot is updated
- [ ] Partial failures don't block entire pipeline

### Quality
- [ ] Domain Mapper uses Structure Scout output (reduced exploration)
- [ ] Glossary terms appear consistently in domain/feature names
- [ ] Features are correctly linked to domains
- [ ] Confidence scores are realistic

### Performance
- [ ] Full pipeline completes in < 5 minutes for medium repos
- [ ] Token usage is reasonable (< 500K total)
- [ ] Parallel phases actually run in parallel

---

## 9. Open Questions

1. **Incremental updates**: How do we detect what changed and only regenerate affected parts?
2. **Conflict resolution**: What if Domain Mapper disagrees with Structure Scout's tile classification?
3. **User overrides**: Can users manually edit/correct generated context?
4. **Caching**: Should sub-agent outputs be cached independently of snapshots?

---

## 10. References

- [learn-claude-code V3 Architecture](https://github.com/shareAI-lab/learn-claude-code)
- [AgentSkills.io Specification](https://agentskills.io/specification)
- [Existing Structure Scout Skill](../agents/skills/structure-scout.skill.md)
- [Existing Domain Map Skill](../agents/skills/source/domain-map-agent.skill.md)

---

## 11. Implementation Notes (2026-01-25)

- Convex actions: `generateContextSnapshot` (context agent) and `migrateLegacyContextSnapshot` (one-off migration helper).
- Products now reference `currentProductSnapshot` (snapshot-first) and no longer store derived fields directly.
- Sub-agent runs link to the context agent via `parentRunId` for UI traceability.
