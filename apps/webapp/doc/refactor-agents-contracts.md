# Refactor Agents - Contratos F0.0

Este documento define los contratos y decisiones base para la refactorizacion del sistema de agentes. Mantiene los shapes actuales y solo agrega metadatos compatibles (versionado y validacion).

Referencia principal: `apps/webapp/webapp-plans/2026-01-11-refactor-agents.md`.

---

## Alcance

- Definir schemas Zod estrictos para outputs actuales.
- Definir versionado de outputs sin romper compatibilidad.
- Definir checkpoints por fase en tabla Convex dedicada.
- Definir summarizeSurfaces determinista.
- Definir politica de retry/backoff y estado blocked.

---

## Outputs (shapes actuales)

### 1) Source Context Classification

**Output actual**:
```
{
  "classification": "product_core|marketing_surface|infra|docs|experiments|mixed|unknown",
  "notes": "short evidence-based reason"
}
```

**Versionado**:
- `outputVersion` opcional en root (string, e.g. "v1.0").
- Validacion Zod estricta (no keys adicionales).

**Regla de superficies**:
- No usar `mixed`. La clasificacion debe ser concreta.
- Si hay multiples superficies en una fuente, se debe generar un **mapa de buckets** por ruta:
  - Cada bucket define `surface`, `pathPrefix` y evidencia minima.
  - Ejemplo: `apps/website` -> `marketing_surface`, `apps/app` -> `product_core`.
- La clasificacion principal debe reflejar la superficie dominante, pero los buckets explicitan el split.
```
{
  "classification": "product_core",
  "notes": "Monorepo con app principal + marketing site",
  "surfaceBuckets": [
    { "surface": "product_core", "pathPrefix": "apps/app", "signalCount": 120 },
    { "surface": "marketing_surface", "pathPrefix": "apps/website", "signalCount": 40 }
  ]
}
```

**Zod (strict)**:
```
const sourceContextSchema = z.object({
  classification: z.enum([
    "product_core",
    "marketing_surface",
    "infra",
    "docs",
    "experiments",
    "unknown",
  ]),
  notes: z.string(),
  outputVersion: z.string().optional(),
  surfaceBuckets: z
    .array(
      z.object({
        surface: z.enum([
          "product_core",
          "marketing_surface",
          "infra",
          "docs",
          "experiments",
          "unknown",
        ]),
        pathPrefix: z.string().min(1),
        signalCount: z.number().int().nonnegative().optional(),
      })
    )
    .optional(),
}).strict();
```

---

### 2) Product Context

**Output actual**: `ProductContextPayload` + metadatos en snapshot.
- `packages/convex/convex/ai/prompts/productContext.ts` define el shape.

**Versionado**:
- Mantener `version` y `createdAt` como existen.
- Agregar `outputVersion` opcional en root (string).
- Validacion Zod estricta con defaults existentes ("" / []).

---

### 3) Feature Map

**Output actual**: `FeatureMapPayload` (domains, domainMap, decisionSummary, features).
- `packages/convex/convex/ai/prompts/featureMap.ts` define el shape.

**Versionado**:
- Mantener `generatedAt` y `sourcesUsed`.
- Agregar `outputVersion` opcional en root (string).
- Validacion Zod estricta.

---

### 4) Timeline Interpretation

**Output actual**: `TimelineInterpretationOutput` con `narratives`.
- `packages/convex/convex/ai/prompts/timelineInterpretation.ts` define el shape.

**Versionado**:
- Agregar `outputVersion` opcional en root (string).
- Validacion Zod estricta.

---

## Zod Schemas (lineamientos)

- Cada output tiene su schema Zod estricto (no unknown keys).
- Validar antes de persistir y antes de pasar a la siguiente fase.
- Si el schema falla: reintento con correccion; si supera el limite, marcar blocked.
- La validacion no reescribe contenido (solo normaliza enums cuando ya existe un normalizador actual).

---

## Checkpoints por fase (Convex table)

**Tabla sugerida**: `agentPhaseCheckpoints`

**Campos base**:
- `productId`: Id<"products">
- `phase`: string (e.g. "surface-classification" | "domain-mapping" | "feature-extraction" | "narrative")
- `status`: "pending" | "in_progress" | "completed" | "blocked"
- `checkpointVersion`: string (e.g. "v1.0")
- `payload`: any (datos minimos necesarios para rollback)
- `createdAt`: number (ms)
- `updatedAt`: number (ms)
- `runId`: optional Id<"agentRuns"> (si aplica)
- `errorMessage`: optional string

**Reglas**:
- Un checkpoint por producto + fase + ejecucion.
- `payload` debe ser serializable y compacto (sin raw data completa).
- Rollback usa el ultimo checkpoint `completed` de la fase anterior.

---

## Summaries deterministas

### summarizeSurfaces

**Objetivo**: pasar a fase siguiente solo un resumen compacto, estable y repetible.

**Reglas**:
- Ordenamiento estable por `sourceId` (asc) y luego por `classification`.
- Dedupe por `sourceId`.
- `samplePaths` limitados a N (N=5) ordenados lexicograficamente.
- `signalCount` recalculado de forma determinista (sin LLM).
- Texto y enums normalizados a lower-case cuando aplique.

**Shape sugerido**:
```
{
  "surfaces": [
    {
      "sourceId": "org/repo",
      "classification": "product_core",
      "confidence": 0.85,
      "notes": "..."
    }
  ],
  "summary": [
    { "surface": "product_core", "signalCount": 24, "samplePaths": ["..."] }
  ]
}
```

---

## Retry + Backoff

**Politica base**:
- Reintentos maximos: 3.
- Backoff exponencial: 500ms, 1500ms, 3000ms.
- Si falla el schema tras reintentos: `status="blocked"` y `errorMessage`.
- Guardar checkpoint de error con metadata para debugging.

---

## Criterios de salida de F0.0

- [ ] Schemas Zod definidos para outputs actuales.
- [ ] OutputVersion documentado y opcional.
- [ ] Tabla de checkpoints definida.
- [ ] summarizeSurfaces determinista especificado.
- [ ] Politica de retry/backoff definida.

---

# Fin del documento
