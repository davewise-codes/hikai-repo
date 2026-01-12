# Refactorización del Sistema de Agentes - Hikai

> Fecha: 2026-01-11
> Objetivo: Arquitectura de agentes LLM predecible y reutilizable para clasificar taxonomías de productos digitales

---

## 1. Análisis del Enfoque learn-claude-code

El repositorio [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) presenta una arquitectura educativa de agentes en 5 versiones progresivas (~1100 líneas totales).

### 1.1 Principios Fundamentales

| Principio | Descripción |
|-----------|-------------|
| **"The model is 80%, code is 20%"** | Los modelos modernos ya son agentes; el código solo habilita, no complica |
| **Simplicidad radical** | v0 funciona con ~50 líneas y 1 herramienta (bash) |
| **Loop minimal** | `while: invoke → if stop_reason != tool_use → return → execute → repeat` |
| **Aislamiento de contexto** | Cada subagente inicia con historial vacío |
| **Planning materializado** | El plan existe como artefacto visible, no solo en la "cabeza" del modelo |
| **Skills como conocimiento** | SKILL.md inyecta expertise de dominio sin modificar system prompt |

### 1.2 Patrones Arquitectónicos Clave

#### A. Subagentes con Aislamiento (v3)
```python
# Cada subagente inicia limpio
sub_messages = [{"role": "user", "content": prompt}]

# Subagentes NO pueden crear subagentes (corta recursión)
return BASE_TOOLS  # Sin Task tool

# Tipos especializados con herramientas restringidas
AGENT_TYPES = {
    "explore": ["bash", "read_file"],  # Solo lectura
    "plan": ["bash", "read_file"],      # Análisis sin modificación
    "code": ALL_TOOLS                   # Acceso completo
}
```

#### B. Planning Explícito con Todos (v2)
```python
# Restricciones que habilitan determinismo
max_items = 20           # Evita listas infinitas
max_in_progress = 1      # Fuerza enfoque monolítico

# Actualización completa (no diffs)
def update(todos: List[Todo]):
    self.todos = todos  # Reemplazo total

# Visibilidad bidireccional
render()  # Tanto usuario como modelo ven el mismo plan
```

#### C. Skills como Conocimiento Inyectado (v4)
```python
# Carga progresiva en 3 capas
Layer 1: Metadatos (~100 tokens) - siempre disponible
Layer 2: Cuerpo (~2000 tokens) - bajo demanda
Layer 3: Recursos (ilimitado) - acceso diferido

# Inyección en tool_result (preserva cache de prompt)
# NO en system prompt (evita invalidación costosa)
return {"role": "user", "content": f"<skill-loaded>{skill_content}</skill-loaded>"}
```

### 1.3 Loop Fundamental
```
while True:
    response = model(messages, tools)
    if response.stop_reason != "tool_use":
        return response.text
    results = execute(response.tool_calls)
    messages.append(results)
```

---

## 2. Análisis del Enfoque Actual de Hikai

### 2.1 Arquitectura Actual

```
Raw Data (GitHub events)
    ↓
sourceContextAgent → classifySourceContext
    ↓ (classification: product_core | marketing_surface | infra | docs | experiments | mixed | unknown)
    ├─→ productContextAgent → generateProductContext
    │       ↓
    │   productContextData (saved snapshots)
    │       ↓
    │   featureMapAgent → refreshFeatureMap
    │       ↓
    │   productContextSnapshots
    │
    └─→ timelineContextInterpreterAgent → interpretTimelineEvents
            ↓
        narratives (timelines con contexto)
```

### 2.2 Características del Sistema Actual

#### Fortalezas Identificadas
- **Versionado explícito de prompts** (v1.2, v1.4, v1.6) con correlación en telemetría
- **Snapshots inmutables** con version incrementada para auditoría
- **Hashing para detección de cambios** (evita actualizaciones vacías)
- **Taxonomía fija de dominios** (10 dominios únicos, canonicalización)
- **Validación post-generación** robusta (normalizeFeatureMap, applyFeatureMapGuardrails)

#### Patrones de Determinismo Actuales
```typescript
// Reglas de determinismo en prompts
- Si stage es "mvp" → maturity DEBE ser "early"
- Si strategicPillars vacío → confidence < 0.5
- focusAreas: usar productDomains names cuando sea posible; si no match → "Other"
- Feature IDs: reutilizar si match >=70% de signals
```

### 2.3 Limitaciones Detectadas

| Área | Problema | Impacto |
|------|----------|---------|
| **Contexto acumulativo** | previousFeatureMap, eventSummaries se pasan completos | Token bloat, variabilidad |
| **Pipeline monolítico** | 4 agentes encadenados sin checkpoints | Difícil debuggear, rollback imposible |
| **Determinismo por prompt** | Reglas son sugerencias, no restricciones | El modelo puede ignorarlas |
| **Sin planning explícito** | El plan existe solo en la "cabeza" del modelo | No auditable, no corregible |
| **Prompts largos monolíticos** | featureMapPrompt tiene ~230 líneas | Difícil mantener, propenso a drift |
| **Focus Area "Other" trap** | Items no reconocidos → "Other" → internal | Oculta información importante |

---

## 3. Comparativa y Gaps

### 3.1 Tabla Comparativa

| Aspecto | learn-claude-code | Hikai Actual | Gap |
|---------|-------------------|--------------|-----|
| **Complejidad** | ~50-550 líneas por versión | ~2000+ líneas en actions.ts | Alto |
| **Loop** | Minimal recursivo | Pipeline secuencial multi-paso | Medio |
| **Aislamiento** | Historial limpio por subagente | Contexto acumulativo en snapshots | Crítico |
| **Planning** | Todo list visible, máx 20 items | Inexistente | Crítico |
| **Especialización** | SKILL.md files modulares | Prompts monolíticos | Alto |
| **Determinismo** | Restricciones arquitectónicas | Instrucciones en prompt | Crítico |
| **Feedback** | Reminders periódicos | Sin checkpoints | Alto |
| **Recuperación** | Process isolation | Sin rollback automático | Medio |

### 3.2 Gaps Críticos

#### Gap 1: Determinismo Arquitectónico vs Determinismo por Instrucciones
- **LCC**: El código restringe qué puede hacer el agente (whitelist de tools, límites de tokens, timeouts)
- **Hikai**: El prompt instruye qué debería hacer el agente (pero puede ignorarlo)
- **Consecuencia**: Resultados varían significativamente entre ejecuciones con mismo input

#### Gap 2: Aislamiento de Contexto
- **LCC**: `sub_messages = [{"role": "user", "content": prompt}]` - contexto limpio
- **Hikai**: Pasa previousFeatureMap completo, 50+ eventSummaries, todo el productContext
- **Consecuencia**: El modelo "olvida" instrucciones cuando el contexto crece

#### Gap 3: Planning como Artefacto
- **LCC**: Todo list materializada, visible para usuario y modelo, actualización atómica
- **Hikai**: No hay mecanismo de planning; el agente decide todo en una pasada
- **Consecuencia**: No hay forma de validar el plan antes de ejecutar, ni de corregir durante

#### Gap 4: Modularidad del Conocimiento
- **LCC**: SKILL.md files separados, carga progresiva, inyección en tool_result
- **Hikai**: featureMapPrompt = 230 líneas monolíticas en system prompt
- **Consecuencia**: Difícil mantener, expensive cache invalidation, conocimiento no reutilizable

---

## 4. Propuesta de Refactorización

### 4.1 Arquitectura Propuesta: Agent Core Reusable

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Agent Core Layer                            │
├─────────────────────────────────────────────────────────────────────┤
│  AgentLoop        │  PlanManager       │  SkillLoader              │
│  - execute()      │  - create()        │  - load()                 │
│  - step()         │  - update()        │  - inject()               │
│  - terminate()    │  - checkpoint()    │  - registry                │
├─────────────────────────────────────────────────────────────────────┤
│                         Tool Registry                               │
│  - read_only: [read_file, glob, grep]                              │
│  - analysis: [read_file, glob, grep, classify]                     │
│  - full: [read_file, write_file, edit, bash]                       │
└─────────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Domain Agents (Taxonomy)                        │
├─────────────────────────────────────────────────────────────────────┤
│  SurfaceClassifierAgent    │  Uses: SKILL: surface-classification  │
│  DomainMapperAgent         │  Uses: SKILL: domain-taxonomy         │
│  FeatureExtractorAgent     │  Uses: SKILL: feature-extraction      │
│  NarrativeBuilderAgent     │  Uses: SKILL: narrative-generation    │
└─────────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Orchestration Layer                             │
├─────────────────────────────────────────────────────────────────────┤
│  TaxonomyOrchestrator                                               │
│  - phase1_classify_surfaces()   → isolated context per repo        │
│  - phase2_map_domains()         → uses phase1 summary only         │
│  - phase3_extract_features()    → uses phase2 summary only         │
│  - phase4_build_narrative()     → uses phase3 summary only         │
│  - checkpoint_after_each_phase()                                    │
│  - rollback_to_phase(n)                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Componentes Clave

#### A. AgentLoop (Core Minimal)
```typescript
// packages/convex/convex/agents/core/agent-loop.ts
export interface AgentLoopConfig {
  maxTurns: number;           // Límite de iteraciones
  maxTokens: number;          // Límite de tokens por respuesta
  timeoutMs: number;          // Timeout total
  tools: ToolSet;             // Herramientas permitidas (whitelist)
  onStep?: (step: StepResult) => Promise<void>;  // Callback para checkpoints
}

export async function executeAgentLoop(
  ctx: ActionCtx,
  config: AgentLoopConfig,
  initialPrompt: string,
  skills?: string[]
): Promise<AgentResult> {
  const messages: Message[] = [{ role: "user", content: initialPrompt }];
  let turns = 0;

  // Inyectar skills si los hay
  if (skills?.length) {
    const skillContent = await loadSkills(skills);
    messages.push({ role: "user", content: `<skills-loaded>${skillContent}</skills-loaded>` });
  }

  while (turns < config.maxTurns) {
    const response = await model.generate(messages, config.tools, { maxTokens: config.maxTokens });

    if (response.stopReason !== "tool_use") {
      return { text: response.text, turns, status: "completed" };
    }

    const results = await executeTools(response.toolCalls, config.tools);
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: formatToolResults(results) });

    if (config.onStep) {
      await config.onStep({ turn: turns, toolCalls: response.toolCalls, results });
    }

    turns++;
  }

  return { text: "", turns, status: "max_turns_exceeded" };
}
```

#### B. PlanManager (Planning Explícito)
```typescript
// packages/convex/convex/agents/core/plan-manager.ts
export interface PlanItem {
  id: string;
  content: string;
  activeForm: string;  // "Clasificando superficies..."
  status: "pending" | "in_progress" | "completed" | "blocked";
  evidence?: string[];
  checkpoint?: unknown;  // Estado para rollback
}

export interface PlanManager {
  items: PlanItem[];
  maxItems: 15;  // Límite para evitar context bloat
  currentItem: PlanItem | null;
}

export function createPlan(items: Array<{ content: string; activeForm: string }>): PlanManager {
  return {
    items: items.slice(0, 15).map((item, i) => ({
      id: `step-${i}`,
      ...item,
      status: i === 0 ? "in_progress" : "pending",
    })),
    maxItems: 15,
    currentItem: null,
  };
}

export function renderPlan(plan: PlanManager): string {
  return plan.items.map(item => {
    const icon = item.status === "completed" ? "[x]" :
                 item.status === "in_progress" ? "[>]" :
                 item.status === "blocked" ? "[!]" : "[ ]";
    const suffix = item.status === "in_progress" ? ` <- ${item.activeForm}` : "";
    return `${icon} ${item.content}${suffix}`;
  }).join("\n");
}
```

#### C. SkillLoader (Conocimiento Modular)
```typescript
// packages/convex/convex/agents/core/skill-loader.ts
export interface Skill {
  name: string;
  version: string;
  description: string;  // ~100 tokens
  body: string;         // ~2000 tokens
  examples?: string[];
}

// Skills como archivos separados
// packages/convex/convex/agents/skills/surface-classification.skill.md
// packages/convex/convex/agents/skills/domain-taxonomy.skill.md
// packages/convex/convex/agents/skills/feature-extraction.skill.md

export async function loadSkill(skillName: string): Promise<Skill> {
  // Carga desde archivo o base de datos
  const content = await readSkillFile(`${skillName}.skill.md`);
  return parseSkillMd(content);
}

export function injectSkill(skill: Skill): Message {
  // Inyecta en tool_result, NO en system prompt
  return {
    role: "user",
    content: `<skill name="${skill.name}" version="${skill.version}">
${skill.body}
</skill>`
  };
}
```

#### D. Tool Registry con Restricciones
```typescript
// packages/convex/convex/agents/core/tool-registry.ts
export const TOOL_SETS = {
  // Para clasificación de superficies - solo lectura
  read_only: ["read_file", "glob", "grep", "list_directory"],

  // Para análisis y planning
  analysis: ["read_file", "glob", "grep", "list_directory", "summarize_file"],

  // Para generación (features, narrativas)
  generation: ["read_file", "glob", "grep", "classify", "extract_features"],

  // Nunca para subagentes
  orchestration_only: ["spawn_agent"],
} as const;

export type ToolSetName = keyof typeof TOOL_SETS;

export function getToolsForAgent(setName: ToolSetName): Tool[] {
  return TOOL_SETS[setName].map(name => TOOL_IMPLEMENTATIONS[name]);
}
```

### 4.3 Domain Agents Refactorizados

#### Surface Classifier Agent
```typescript
// packages/convex/convex/agents/taxonomy/surface-classifier.ts
export const surfaceClassifierConfig: AgentLoopConfig = {
  maxTurns: 5,
  maxTokens: 2000,
  timeoutMs: 30000,
  tools: getToolsForAgent("read_only"),
};

export async function classifySurface(
  ctx: ActionCtx,
  repoData: RepoData
): Promise<SurfaceClassification> {
  const prompt = buildClassificationPrompt(repoData);

  const result = await executeAgentLoop(
    ctx,
    surfaceClassifierConfig,
    prompt,
    ["surface-classification"]  // Skill específico
  );

  return parseSurfaceClassification(result.text);
}

// Skill: surface-classification.skill.md
// Contiene: taxonomía de surfaces, ejemplos, reglas de clasificación
// ~2000 tokens, modular y versionado independiente
```

### 4.4 Orchestration con Aislamiento

```typescript
// packages/convex/convex/agents/taxonomy/orchestrator.ts
export async function buildProductTaxonomy(
  ctx: ActionCtx,
  productId: Id<"products">,
  options: { forceRefresh?: boolean }
): Promise<TaxonomyResult> {
  const plan = createPlan([
    { content: "Classify code surfaces by repository", activeForm: "Classifying surfaces..." },
    { content: "Map domains from surface evidence", activeForm: "Mapping domains..." },
    { content: "Extract user-facing features", activeForm: "Extracting features..." },
    { content: "Validate taxonomy consistency", activeForm: "Validating..." },
  ]);

  // Checkpoint inicial
  await savePlanCheckpoint(ctx, productId, plan);

  // Phase 1: Classify Surfaces (aislado por repo)
  const repos = await getProductRepos(ctx, productId);
  const surfaceResults: SurfaceClassification[] = [];

  for (const repo of repos) {
    // Contexto limpio por repo - NO acumula
    const classification = await classifySurface(ctx, {
      repoId: repo.id,
      structure: repo.structure,
      // Solo datos mínimos, no todo el histórico
    });
    surfaceResults.push(classification);

    // Checkpoint después de cada repo
    await updatePlanStep(ctx, productId, plan, 0, { repoId: repo.id, result: classification });
  }

  // Resumen compacto para siguiente fase (no raw data)
  const surfaceSummary = summarizeSurfaces(surfaceResults);
  await completePlanStep(ctx, productId, plan, 0, surfaceSummary);

  // Phase 2: Map Domains (usa solo el resumen, no datos crudos)
  const domainMap = await mapDomains(ctx, {
    surfaceSummary,  // Resumen compacto ~500 tokens
    baseline: await getProductBaseline(ctx, productId),
  });
  await completePlanStep(ctx, productId, plan, 1, domainMap);

  // Phase 3: Extract Features (usa domainMap, no surfaces crudas)
  const features = await extractFeatures(ctx, {
    domainMap,
    surfaceSummary,
  });
  await completePlanStep(ctx, productId, plan, 2, features);

  // Phase 4: Validate (sanity checks)
  const validation = await validateTaxonomy(ctx, { domainMap, features, surfaceSummary });
  await completePlanStep(ctx, productId, plan, 3, validation);

  return { domainMap, features, validation, planId: plan.id };
}
```

### 4.5 Skills Propuestos

#### surface-classification.skill.md
```markdown
---
name: surface-classification
version: v1.0
description: Classifies code repositories into product surfaces
---

## Surface Taxonomy

| Surface | Description | Indicators |
|---------|-------------|------------|
| product_core | Main user-facing app | routes/, components/, pages/ |
| product_platform | Backend/API/infra | api/, services/, workers/ |
| product_admin | Internal admin UI | admin/, backoffice/ |
| product_marketing | Website/landing | website/, landing/, marketing/ |
| product_docs | Documentation | docs/, guides/, help/ |
| product_other | Everything else | - |

## Classification Rules

1. Check top-level directories first
2. Look for package.json "name" field hints
3. Analyze route patterns for app type
4. Default to "unknown" if confidence < 0.6

## Output Format

{
  "classification": "product_core",
  "confidence": 0.85,
  "evidence": ["routes/ directory with 15 files", "components/ with UI code"],
  "notes": "React SPA with TanStack Router"
}
```

#### domain-taxonomy.skill.md
```markdown
---
name: domain-taxonomy
version: v1.0
description: Maps product surfaces to functional domains
---

## Universal Domain Taxonomy

### Product Domains (user-facing value)
- Core Experience: Primary user workflows
- Data Ingestion: Import, connectors, integrations
- Automation & AI: Automated/intelligent features
- Analytics & Reporting: Metrics, dashboards, exports
- Content Distribution: Publishing, sharing, notifications
- Collaboration & Access: Teams, permissions, sharing

### Technical Domains (infrastructure)
- Platform Foundation: Auth, billing, infra, security

### Internal Domains (operational)
- Internal Tools: Admin, ops, debugging
- Marketing Presence: Website, landing, campaigns
- Documentation & Support: Docs, help, guides

## Mapping Rules

1. Product domains require evidence in product_core or product_platform
2. Marketing/docs evidence → Internal domains only
3. Keep domain count low for MVP (2-3 product + Platform Foundation + Internal Tools)
4. Derive names from baseline + repo vocabulary

## Output Format

{
  "domains": [
    { "name": "Core Experience", "kind": "product", "weight": 0.8, "evidence": [...] }
  ],
  "decisions": [
    { "domain": "Analytics", "decision": "excluded", "reason": "No evidence in product_core" }
  ]
}
```

---

## 5. Plan de Implementación

### Fase 1: Agent Core Layer
1. Crear `packages/convex/convex/agents/core/agent-loop.ts`
2. Crear `packages/convex/convex/agents/core/plan-manager.ts`
3. Crear `packages/convex/convex/agents/core/skill-loader.ts`
4. Crear `packages/convex/convex/agents/core/tool-registry.ts`
5. Tests unitarios para cada componente

### Fase 2: Skills System
1. Crear directorio `packages/convex/convex/agents/skills/`
2. Migrar lógica de prompts a skill files:
   - `surface-classification.skill.md`
   - `domain-taxonomy.skill.md`
   - `feature-extraction.skill.md`
   - `narrative-generation.skill.md`
3. Implementar parser de skill files
4. Tests de carga e inyección de skills

### Fase 3: Refactorizar Agentes Existentes
1. `sourceContextAgent` → `SurfaceClassifierAgent` usando Agent Core
2. `productContextAgent` + `featureMapAgent` → `DomainMapperAgent` + `FeatureExtractorAgent`
3. `timelineContextInterpreterAgent` → `NarrativeBuilderAgent`
4. Mantener backward compatibility durante migración

### Fase 4: Orchestration Layer
1. Crear `TaxonomyOrchestrator` con fases aisladas
2. Implementar checkpoints entre fases
3. Implementar rollback a fase anterior
4. Implementar resúmenes compactos entre fases

### Fase 5: Validación y Métricas
1. Comparar outputs antes/después con mismo input
2. Medir variabilidad: ejecutar 5x con mismo input, calcular desviación
3. Medir token usage antes/después
4. Documentar breaking changes

---

## 6. Verificación

### Tests de Determinismo
```typescript
// Ejecutar 5 veces con mismo input
const results = await Promise.all(
  Array(5).fill(null).map(() => buildProductTaxonomy(ctx, productId))
);

// Calcular similitud entre outputs
const similarity = calculateJaccardSimilarity(results.map(r => r.features));
expect(similarity).toBeGreaterThan(0.9);  // >90% consistencia
```

### Tests de Aislamiento
```typescript
// Verificar que subagentes no acumulan contexto
const repo1Result = await classifySurface(ctx, repo1Data);
const repo2Result = await classifySurface(ctx, repo2Data);

// repo2 no debe estar influenciado por repo1
expect(repo2Result.evidence).not.toContain(repo1Data.path);
```

### Métricas de Calidad
- **Determinismo**: % de coincidencia en ejecuciones repetidas
- **Token efficiency**: tokens usados por clasificación
- **Latency**: tiempo total por fase
- **Recovery rate**: % de rollbacks exitosos

---

## 7. Archivos Críticos a Modificar

| Archivo Actual | Acción | Nuevo Archivo |
|----------------|--------|---------------|
| `agents/actions.ts` | Refactorizar | `agents/taxonomy/orchestrator.ts` |
| `agents/sourceContextAgent.ts` | Migrar | `agents/taxonomy/surface-classifier.ts` |
| `agents/productContextAgent.ts` | Dividir | `agents/taxonomy/domain-mapper.ts` |
| `agents/featureMapAgent.ts` | Migrar | `agents/taxonomy/feature-extractor.ts` |
| `ai/prompts/featureMap.ts` | Convertir | `agents/skills/feature-extraction.skill.md` |
| `ai/prompts/productContext.ts` | Convertir | `agents/skills/domain-taxonomy.skill.md` |
| - | Nuevo | `agents/core/agent-loop.ts` |
| - | Nuevo | `agents/core/plan-manager.ts` |
| - | Nuevo | `agents/core/skill-loader.ts` |
| - | Nuevo | `agents/core/tool-registry.ts` |

---

## 8. Especificaciones Técnicas Detalladas

### 8.1 Checkpoints: Tabla Convex Dedicada

```typescript
// packages/convex/convex/schema.ts
agentCheckpoints: defineTable({
  productId: v.id("products"),
  orchestrationRunId: v.string(),  // UUID del run completo
  phase: v.union(
    v.literal("surface_classification"),
    v.literal("domain_mapping"),
    v.literal("feature_extraction"),
    v.literal("narrative_building")
  ),
  phaseIndex: v.number(),  // 0, 1, 2, 3
  status: v.union(
    v.literal("pending"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("blocked"),
    v.literal("retrying")
  ),
  version: v.number(),  // Incrementa con cada retry
  input: v.any(),       // Input de la fase (JSON)
  output: v.optional(v.any()),  // Output si completed (JSON)
  error: v.optional(v.object({
    message: v.string(),
    retryCount: v.number(),
    lastAttemptAt: v.number(),
  })),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_product_run", ["productId", "orchestrationRunId"])
  .index("by_product_phase", ["productId", "phase"]),
```

### 8.2 Summarization: Reglas Determinísticas Puras

```typescript
// packages/convex/convex/agents/core/summarizers.ts

export interface SurfaceSummary {
  totalRepos: number;
  byClassification: Record<SurfaceClassification, number>;
  topPaths: Array<{ path: string; classification: SurfaceClassification }>;
  monorepoDetected: boolean;
  primarySurface: SurfaceClassification;
  confidence: number;
}

export function summarizeSurfaces(
  classifications: SurfaceClassificationResult[]
): SurfaceSummary {
  // Reglas determinísticas - sin LLM
  const byClassification = classifications.reduce((acc, c) => {
    acc[c.classification] = (acc[c.classification] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topPaths = classifications
    .flatMap(c => c.evidence.map(e => ({ path: e.path, classification: c.classification })))
    .slice(0, 10);  // Límite fijo

  const primarySurface = Object.entries(byClassification)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as SurfaceClassification || "unknown";

  const monorepoDetected = classifications.some(c =>
    c.evidence.some(e => e.path.includes("apps/") || e.path.includes("packages/"))
  );

  const confidence = classifications.reduce((sum, c) => sum + c.confidence, 0)
    / classifications.length;

  return {
    totalRepos: classifications.length,
    byClassification,
    topPaths,
    monorepoDetected,
    primarySurface,
    confidence,
  };
}
```

### 8.3 Skill Versioning: Frontmatter + Config

```markdown
<!-- packages/convex/convex/agents/skills/surface-classification.skill.md -->
---
name: surface-classification
version: v1.2
author: hikai-team
updated: 2026-01-11
requires:
  - tool: read_file
  - tool: glob
---

[Contenido del skill...]
```

```typescript
// packages/convex/convex/agents/taxonomy/surface-classifier.ts
export const surfaceClassifierConfig: AgentConfig = {
  name: "SurfaceClassifier",
  skill: {
    name: "surface-classification",
    version: "v1.2",  // Versión explícita
  },
  tools: getToolsForAgent("read_only"),
  maxTurns: 5,
  maxTokens: 2000,
  timeoutMs: 30000,
};

// packages/convex/convex/agents/core/skill-loader.ts
export async function loadSkill(
  skillName: string,
  version: string
): Promise<Skill> {
  const skillPath = `skills/${skillName}.skill.md`;
  const content = await readSkillFile(skillPath);
  const parsed = parseSkillMd(content);

  if (parsed.version !== version) {
    console.warn(`Skill version mismatch: expected ${version}, got ${parsed.version}`);
    // Decide: throw o usar la versión disponible
  }

  return parsed;
}
```

### 8.4 Error Handling: Retry con Backoff + Blocked

```typescript
// packages/convex/convex/agents/core/error-handler.ts

export interface RetryConfig {
  maxRetries: 2;  // Máximo 2 reintentos (3 intentos total)
  baseDelayMs: 1000;
  maxDelayMs: 10000;
  backoffMultiplier: 2;
}

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  onRetry?: (attempt: number, error: Error) => Promise<void>
): Promise<{ result: T; attempts: number } | { error: Error; blocked: true; attempts: number }> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      return { result, attempts: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt <= config.maxRetries) {
        const delay = Math.min(
          config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        );

        if (onRetry) {
          await onRetry(attempt, lastError);
        }

        await sleep(delay);
      }
    }
  }

  return { error: lastError!, blocked: true, attempts: config.maxRetries + 1 };
}

// Uso en orchestrator
const classificationResult = await executeWithRetry(
  () => classifySurface(ctx, repoData),
  DEFAULT_RETRY_CONFIG,
  async (attempt, error) => {
    await updateCheckpoint(ctx, checkpointId, {
      status: "retrying",
      error: { message: error.message, retryCount: attempt, lastAttemptAt: Date.now() },
    });
  }
);

if ("blocked" in classificationResult) {
  await updateCheckpoint(ctx, checkpointId, {
    status: "blocked",
    error: {
      message: classificationResult.error.message,
      retryCount: classificationResult.attempts,
      lastAttemptAt: Date.now(),
    },
  });
  throw new PhaseBlockedError(phase, classificationResult.error);
}
```

### 8.5 Schema Validation: Zod Estricto

```typescript
// packages/convex/convex/agents/schemas/surface-classification.schema.ts
import { z } from "zod";

export const SurfaceClassificationSchema = z.object({
  classification: z.enum([
    "product_core",
    "product_platform",
    "product_admin",
    "product_marketing",
    "product_docs",
    "product_other",
    "mixed",
    "unknown",
  ]),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({
    type: z.enum(["path", "file_content", "package_json", "readme"]),
    value: z.string(),
    path: z.string().optional(),
  })).min(1),
  notes: z.string().max(500),
});

export type SurfaceClassification = z.infer<typeof SurfaceClassificationSchema>;

// packages/convex/convex/agents/schemas/feature-map.schema.ts
export const FeatureSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(48),
  name: z.string().min(1).max(100),
  domain: z.string(),
  description: z.string().max(500).optional(),
  visibilityHint: z.enum(["public", "internal"]),
  confidence: z.number().min(0).max(1),
  deprecated: z.boolean().default(false),
  evidence: z.array(z.object({
    type: z.enum(["ui_text", "doc", "route", "component"]),
    value: z.string(),
    path: z.string().optional(),
  })),
});

export const FeatureMapSchema = z.object({
  features: z.array(FeatureSchema),
  domains: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    kind: z.enum(["product", "technical", "internal"]),
    weight: z.number().min(0).max(1),
  })),
  generatedAt: z.number(),
  sourcesUsed: z.array(z.string()),
});

export type FeatureMap = z.infer<typeof FeatureMapSchema>;

// packages/convex/convex/agents/core/agent-loop.ts
export async function executeAgentLoop<T>(
  ctx: ActionCtx,
  config: AgentLoopConfig,
  initialPrompt: string,
  outputSchema: z.ZodType<T>,
  skills?: string[]
): Promise<AgentResult<T>> {
  // ... agent loop logic ...

  const rawOutput = parseJsonSafely(response.text);

  // Validación estricta con Zod
  const parseResult = outputSchema.safeParse(rawOutput);

  if (!parseResult.success) {
    throw new AgentSchemaValidationError(
      config.name,
      parseResult.error.issues,
      rawOutput
    );
  }

  return {
    data: parseResult.data,
    turns,
    status: "completed",
  };
}
```

---

## 9. Decisiones Tomadas

| Decisión | Opción Elegida | Rationale |
|----------|----------------|-----------|
| **Persistencia de skills** | Archivos .md en repo | Versionados con git, revisables en PR, más simple |
| **Estrategia de migración** | Agente por agente | No hay producción, no hay concern de breaking changes |
| **Métrica de determinismo** | >85% consistencia | Balance entre strictness y flexibilidad práctica |
| **Primer agente a migrar** | Surface Classifier | Es el más simple, valida la arquitectura core |
| **Checkpoints storage** | Tabla Convex `agentCheckpoints` | Query fácil, rollback simple, bien integrado |
| **Summarization** | Reglas determinísticas puras | Sin LLM, 100% reproducible, bajo costo |
| **Skill versioning** | Frontmatter + config por agente | Control explícito de versiones, trazabilidad |
| **Error handling** | Retry con backoff + blocked | 2 reintentos, exponential backoff, falla graceful |
| **Schema validation** | Zod estricto + runtime | Contratos claros, fallo temprano si schema inválido |

---

## 10. Plan de Ejecución Priorizado

### Sprint 1: Agent Core + Surface Classifier

**Objetivo**: Validar la arquitectura con el agente más simple

1. **Crear Agent Core Layer**
   - `packages/convex/convex/agents/core/agent-loop.ts`
   - `packages/convex/convex/agents/core/tool-registry.ts`
   - `packages/convex/convex/agents/core/skill-loader.ts`
   - Tests unitarios

2. **Crear primer Skill**
   - `packages/convex/convex/agents/skills/surface-classification.skill.md`
   - Parser de skill files
   - Tests de carga e inyección

3. **Migrar Surface Classifier**
   - Reescribir `sourceContextAgent.ts` usando Agent Core
   - Herramientas: solo read_only (read_file, glob, grep)
   - Tests de determinismo (5 ejecuciones, >85% match)

4. **Métricas de validación**
   - Ejecutar clasificación en repos de prueba
   - Comparar outputs antes/después
   - Medir token usage

### Sprint 2: Plan Manager + Feature Extractor

**Objetivo**: Añadir planning explícito y migrar el agente más variable

1. **Crear Plan Manager**
   - `packages/convex/convex/agents/core/plan-manager.ts`
   - Límite de 15 items, 1 in_progress
   - Render visible, actualización atómica
   - Checkpoints entre pasos

2. **Crear Skill de Features**
   - `packages/convex/convex/agents/skills/feature-extraction.skill.md`
   - Migrar lógica de `featureMapPrompt`

3. **Migrar Feature Extractor**
   - Reescribir `featureMapAgent.ts`
   - Usar Plan Manager para estructurar extracción
   - Herramientas: generation set
   - Tests de determinismo

### Sprint 3: Domain Mapper + Orchestrator

**Objetivo**: Completar la taxonomía con aislamiento de contexto

1. **Crear Domain Mapper Agent**
   - Fusión de lógica de `productContextAgent` relevante
   - Skill: `domain-taxonomy.skill.md`
   - Contexto aislado (solo recibe summaries, no raw data)

2. **Crear Taxonomy Orchestrator**
   - `packages/convex/convex/agents/taxonomy/orchestrator.ts`
   - Fases aisladas con checkpoints
   - Resúmenes compactos entre fases
   - Rollback a fase anterior

3. **Integración end-to-end**
   - Surface Classifier → Domain Mapper → Feature Extractor
   - Tests de pipeline completo

### Sprint 4: Narrative Builder + Polish

**Objetivo**: Completar migración y optimizar

1. **Migrar Timeline Interpreter**
   - Reescribir `timelineContextInterpreterAgent.ts`
   - Skill: `narrative-generation.skill.md`

2. **Optimización**
   - Profiling de token usage
   - Ajustar límites de Agent Core
   - Documentación

3. **Cleanup**
   - Eliminar código legacy
   - Actualizar imports
   - Final documentation

---

## 11. Próximos Pasos Inmediatos

1. [x] Definir arquitectura propuesta
2. [x] Tomar decisiones sobre skills, migración, métricas
3. [ ] Implementar Agent Core Layer (agent-loop.ts, tool-registry.ts)
4. [ ] Crear primer skill file (surface-classification.skill.md)
5. [ ] Migrar Surface Classifier como prueba de concepto
6. [ ] Medir determinismo: 5 ejecuciones con mismo input, verificar >85% match
