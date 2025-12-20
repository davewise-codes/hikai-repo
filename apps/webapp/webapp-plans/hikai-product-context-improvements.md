# Mejora del Product Context Agent

## Contexto

El Product Context Agent genera la base estratégica que usa Hikai para interpretar eventos y generar contenido. El output actual presenta problemas críticos que impactan la calidad del contenido generado para Marketing, Customer Success y Product Team.

**Problema identificado**: El contexto generado es genérico y no captura la esencia del producto. Por ejemplo, para Hikai:
- `keyFeatures`: i18n, Multi-user (técnicos, no funcionales)
- `strategicPillars`: [] vacío (debería tener 6 pilares)
- `technicalStack`: PostgreSQL (incorrecto, es Convex)
- `recommendedFocus`: "mejorar i18n" (irrelevante para el core)

**Impacto**: El Timeline Interpreter y Content Generation producen contenido genérico sin valor diferencial.

**Documentación de referencia**:

- `apps/webapp/webapp-plans/hikai-ai-inference-implementation.md` — Plan de inferencia IA
- `apps/webapp/webapp-plans/hikai_resumen_arquitectura.md` — Visión de negocio
- `packages/convex/convex/ai/prompts/productContext.ts` — Prompt actual
- `packages/convex/convex/agents/actions.ts` — Action generateProductContext
- `CLAUDE.md` — Reglas del repositorio

---

## Progreso

| Subfase | Descripción                                    | Estado        |
| ------- | ---------------------------------------------- | ------------- |
| F1.0    | Mejoras al prompt (few-shot, coherencia)       | ✅ Completado |
| F1.1    | Mutation updateBaseline + regeneración auto    | ✅ Completado |
| F1.2    | BaselineEditor en settings de producto         | ⏳ Pendiente  |
| F1.3    | BaselineWizard en creación de producto         | ⏳ Pendiente  |
| F1.4    | Detección automática de stack (package.json)   | ⏳ Pendiente  |
| F1.5    | Post-procesamiento y quality score             | ⏳ Pendiente  |
| F1.6    | Modelo por use-case/agente                     | ⏳ Pendiente  |
| F1.7    | Persistencia extendida de inferencias + rating | ⏳ Pendiente  |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Prompt para arrancar subfases

```
- En apps/webapp/webapp-plans/hikai-product-context-improvements.md puedes ver el plan
- Vamos a proceder con la siguiente subfase pendiente
- Usa el prompt de esa subfase como instrucción completa
- Comparte el plan de implementación antes de ejecutar cambios
- No hagas asunciones, compárteme dudas y las debatimos antes de empezar el desarrollo
- Asegúrate de que cumples las reglas del repo al desarrollar
- No hagas commit hasta confirmar pruebas OK
- Una vez validado haz commit y actualiza el progreso en el documento
- Tras terminar de desarrollar cada subfase, indícame las pruebas funcionales con las que puedo validar la fase antes del commit
- Máxima capacidad de ultrathink
```

---

## Instrucciones generales

- Seguir `CLAUDE.md` y la regla apps → packages (apps consumen `@hikai/*`).
- Componentes UI e iconos siempre desde `@hikai/ui`; sin `lucide-react` directo en apps/.
- Backend Convex: primera línea de queries/mutations/actions debe llamar a `assertProductAccess`.
- i18n: añadir textos en `en/products.json` y `es/products.json`.
- Commit por subfase con formato `feat(scope): [F1.X] descripción`; sin commit hasta validar tests.
- Pruebas mínimas: `pnpm --filter @hikai/convex exec tsc --noEmit` y `pnpm --filter @hikai/webapp exec tsc --noEmit`.

---

## Subfases

### F1.0: Mejoras al prompt (few-shot, coherencia)

**Objetivo**: Refinar instrucciones del prompt para outputs más alineados con negocio.

**Archivos**:

- `packages/convex/convex/ai/prompts/productContext.ts` — Añadir ejemplos y reglas

**Prompt**:

```
F1.0: Mejoras al prompt

PARTE 1: FEW-SHOT EXAMPLES
Añadir al prompt en productContext.ts sección de ejemplos:

## Examples of GOOD outputs:

### keyFeatures (business-oriented, not technical):
✅ "Intelligent Timeline: Transforms scattered development activity into a coherent product narrative"
✅ "Automated Content Generation: Creates marketing copy, changelogs, and help articles from product events"
❌ "i18n support" (too technical)
❌ "Multi-user" (too generic)

### strategicPillars (must not be empty for any real product):
✅ ["Connected Sources", "Semantic Timeline", "Content by Area", "Publishing Hub"]

### competition (always try to identify at least 1):
✅ [{ "name": "LaunchNotes", "description": "Focus on release notes only" }]
❌ [] (never leave empty without lowering confidence)

PARTE 2: REGLAS DE COHERENCIA
Añadir al prompt:

## Coherence Rules:
- If stage is "mvp" or "idea", maturity MUST be "early", never "mid" or "late"
- If < 10 events available, releaseCadence SHOULD be "unknown" or "irregular"
- If strategicPillars is empty, confidence MUST be < 0.5
- If competition is empty and targetMarket is known, confidence -= 0.2
- risks should have at least 1 item for stages before "production"

PARTE 3: INSTRUCCIONES PARA FEATURES
Añadir al prompt:

## Feature Guidelines:
- keyFeatures describe WHAT THE PRODUCT DOES FOR USERS, not implementation details
- Each feature should answer: "What value does this provide?"
- Avoid: technical terms (i18n, OAuth, SSO), generic capabilities (multi-user, settings)
- Include: workflow descriptions, outcomes, differentiators

PARTE 4: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
- Regenerar contexto de un producto y verificar mejoras en output
```

**Validación**:

- [x] Prompt incluye ejemplos de good/bad outputs
- [x] Reglas de coherencia stage/maturity añadidas
- [x] Guidelines para features orientadas a negocio
- [x] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa
- [x] Test manual: regenerar contexto y verificar mejora

---

### F1.1: Mutation updateBaseline + regeneración automática

**Objetivo**: Crear mutation para actualizar baseline que dispare regeneración de contexto.

**Archivos**:

- `packages/convex/convex/products/products.ts` — Nueva mutation updateBaseline

**Prompt**:

```
F1.1: Mutation updateBaseline

PARTE 1: MUTATION
Crear en packages/convex/convex/products/products.ts:

export const updateBaseline = mutation({
  args: {
    productId: v.id("products"),
    baseline: v.object({
      valueProposition: v.optional(v.string()),
      targetMarket: v.optional(v.string()),
      productCategory: v.optional(v.string()),
      productType: v.optional(v.string()),
      businessModel: v.optional(v.string()),
      stage: v.optional(v.string()),
      personas: v.optional(v.array(v.object({ name: v.string(), description: v.optional(v.string()) }))),
      platforms: v.optional(v.array(v.string())),
      integrationEcosystem: v.optional(v.array(v.string())),
      technicalStack: v.optional(v.array(v.string())),
      audienceSegments: v.optional(v.array(v.object({ name: v.string(), description: v.optional(v.string()) }))),
      toneGuidelines: v.optional(v.array(v.object({ name: v.string(), description: v.optional(v.string()) }))),
    }),
  },
  handler: async (ctx, { productId, baseline }) => {
    const { membership } = await assertProductAccess(ctx, productId);

    // Solo admin puede modificar baseline
    if (membership.role !== "admin") {
      throw new Error("Only admins can update product baseline");
    }

    await ctx.db.patch(productId, {
      productBaseline: baseline,
      updatedAt: Date.now(),
    });

    // Disparar regeneración de contexto en background
    await ctx.scheduler.runAfter(0, api.agents.actions.generateProductContext, {
      productId,
      forceRefresh: true,
    });

    return { success: true };
  },
});

PARTE 2: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
- Probar mutation desde dashboard Convex
```

**Validación**:

- [ ] Mutation updateBaseline creada con validación de rol admin
- [ ] Scheduler dispara regeneración automática
- [ ] productBaseline se guarda correctamente
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F1.2: BaselineEditor en settings de producto

**Objetivo**: UI para editar baseline desde settings del producto.

**Archivos**:

- `apps/webapp/src/domains/products/components/baseline-editor.tsx` — Nuevo
- `apps/webapp/src/domains/products/components/index.ts` — Export
- `apps/webapp/src/routes/settings/product/$slug/general.tsx` — Integrar
- `apps/webapp/src/i18n/locales/en/products.json` — Textos
- `apps/webapp/src/i18n/locales/es/products.json` — Textos

**Prompt**:

```
F1.2: BaselineEditor en settings

PARTE 1: COMPONENTE
Crear apps/webapp/src/domains/products/components/baseline-editor.tsx:
- Props: { product, onSave }
- Form con campos del baseline:
  - valueProposition: Textarea (obligatorio)
  - targetMarket: Select (B2B, B2C, hybrid)
  - productCategory: Input con sugerencias
  - productType: Select (WebApp, Mobile, API, SDK, CLI, Other)
  - businessModel: Select (SaaS, Marketplace, Freemium, One-time, Subscription, Other)
  - stage: Select (idea, mvp, beta, production, scale-up)
  - platforms: Multi-select chips (Web, iOS, Android, Desktop)
  - languagePreference: Select (en, es)
- Sección colapsable "Advanced" para:
  - personas, audienceSegments, toneGuidelines (lista editable)
- Botón "Save" que llama a mutation updateBaseline
- Loading state mientras guarda
- Success toast al guardar
- Usa componentes de @hikai/ui: Card, Input, Textarea, Select, Button, Label, Badge

PARTE 2: INTEGRACIÓN
En apps/webapp/src/routes/settings/product/$slug/general.tsx:
- Añadir BaselineEditor debajo del formulario de datos básicos
- Separar con <Separator /> y título "Product Baseline"

PARTE 3: i18n
Añadir en products.json (en/es):
- baseline.title, baseline.description
- baseline.fields.* para cada campo
- baseline.save, baseline.saving, baseline.saved

PARTE 4: VALIDACIÓN
- pnpm --filter @hikai/webapp exec tsc --noEmit
- Navegar a settings de producto y verificar editor visible
- Guardar cambios y verificar regeneración de contexto
```

**Validación**:

- [ ] BaselineEditor renderiza todos los campos
- [ ] Campos obligatorios validados (valueProposition)
- [ ] Guardar llama a updateBaseline y muestra feedback
- [ ] Contexto se regenera automáticamente tras guardar
- [ ] Solo componentes de @hikai/ui
- [ ] `pnpm --filter @hikai/webapp exec tsc --noEmit` pasa

---

### F1.3: BaselineWizard en creación de producto

**Objetivo**: Wizard de baseline obligatorio (mínimo) al crear producto.

**Archivos**:

- `apps/webapp/src/domains/products/components/baseline-wizard.tsx` — Nuevo
- `apps/webapp/src/domains/products/components/create-product-form.tsx` — Integrar wizard
- `apps/webapp/src/domains/products/hooks/use-create-product.ts` — Modificar para incluir baseline
- `packages/convex/convex/products/products.ts` — Mutation create acepta baseline
- `apps/webapp/src/i18n/locales/*/products.json` — Textos

**Prompt**:

```
F1.3: BaselineWizard en creación

PARTE 1: WIZARD COMPONENT
Crear apps/webapp/src/domains/products/components/baseline-wizard.tsx:
- Props: { values, onValuesChange, isLoading }
- Step 1 (obligatorio):
  - valueProposition: Textarea con placeholder guía
  - targetMarket: Select
  - stage: Select
- Step 2 (opcional, colapsable):
  - productType, businessModel, platforms
- Indicador de progreso visual
- Hint/helper text explicando importancia de cada campo

PARTE 2: INTEGRAR EN CREATE FORM
Modificar apps/webapp/src/domains/products/components/create-product-form.tsx:
- Cambiar flow a 2 pasos:
  - Step 1: name, slug, description (existente)
  - Step 2: BaselineWizard
- Botón "Next" en step 1, "Create" en step 2
- Botón "Back" para volver a step 1
- Validar valueProposition no vacío antes de crear

PARTE 3: MUTATION
Modificar packages/convex/convex/products/products.ts create mutation:
- Añadir arg opcional `baseline` con mismo schema que productBaseline
- Si viene baseline, guardarlo en productBaseline

PARTE 4: HOOK
Actualizar use-create-product.ts para pasar baseline a mutation

PARTE 5: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
- pnpm --filter @hikai/webapp exec tsc --noEmit
- Crear producto nuevo y verificar wizard funciona
- Verificar baseline se guarda y contexto se puede generar
```

**Validación**:

- [ ] Wizard de 2 pasos funciona
- [ ] valueProposition obligatorio validado
- [ ] Baseline se guarda al crear producto
- [ ] Navegación back/next funciona
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa
- [ ] `pnpm --filter @hikai/webapp exec tsc --noEmit` pasa

---

### F1.4: Detección automática de stack (package.json)

**Objetivo**: Detectar stack técnico real desde repositorio conectado.

**Archivos**:

- `packages/convex/convex/agents/stackDetector.ts` — Nuevo
- `packages/convex/convex/agents/productContextData.ts` — Query metadata repo
- `packages/convex/convex/agents/actions.ts` — Integrar detección

**Prompt**:

```
F1.4: Detección automática de stack

PARTE 1: DETECTOR
Crear packages/convex/convex/agents/stackDetector.ts:

const FRAMEWORK_PATTERNS: Record<string, string[]> = {
  "React": ["react", "react-dom"],
  "Next.js": ["next"],
  "Vite": ["vite"],
  "Convex": ["convex", "@convex-dev/agent"],
  "TailwindCSS": ["tailwindcss"],
  "TypeScript": ["typescript"],
  "Node.js": ["@types/node"],
  "Express": ["express"],
  "Fastify": ["fastify"],
  "Vue": ["vue"],
  "Angular": ["@angular/core"],
  "Svelte": ["svelte"],
  "Prisma": ["prisma", "@prisma/client"],
  "Drizzle": ["drizzle-orm"],
  "tRPC": ["@trpc/server"],
  "GraphQL": ["graphql", "@apollo/client"],
  "Zustand": ["zustand"],
  "Redux": ["@reduxjs/toolkit", "redux"],
  "TanStack Query": ["@tanstack/react-query"],
  "TanStack Router": ["@tanstack/react-router"],
};

export function detectStackFromPackageJson(pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }): string[] {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const detected: string[] = [];

  for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
    if (patterns.some(p => deps[p])) {
      detected.push(framework);
    }
  }

  return detected;
}

PARTE 2: QUERY METADATA
Añadir en packages/convex/convex/agents/productContextData.ts:

export const getRepositoryMetadata = internalQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_product", q => q.eq("productId", productId))
      .collect();

    // Buscar conexión github activa
    const githubConn = connections.find(c =>
      c.status === "active" && c.config?.provider === "github"
    );

    if (!githubConn) return null;

    return {
      provider: "github",
      owner: githubConn.config.owner as string,
      repo: githubConn.config.repo as string,
      installationId: githubConn.config.installationId as number | undefined,
    };
  },
});

PARTE 3: INTEGRAR EN ACTION
En packages/convex/convex/agents/actions.ts generateProductContext:
- Antes de llamar al agente:
  1. Obtener metadata con getRepositoryMetadata
  2. Si hay repo, fetch package.json via GitHub API
  3. Parsear con detectStackFromPackageJson
  4. Incluir en input como detectedTechnicalStack

- En post-proceso:
  1. Si detectedStack tiene items, sobrescribir technicalStack del LLM
  2. Añadir "package.json" a sourcesUsed

PARTE 4: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
- Regenerar contexto de producto con repo conectado
- Verificar stack correcto (ej: Convex en lugar de PostgreSQL)
```

**Validación**:

- [ ] Stack detector identifica frameworks principales
- [ ] Query obtiene metadata del repo conectado
- [ ] Action integra detección antes de llamar agente
- [ ] Stack detectado sobrescribe inferido por LLM
- [ ] sourcesUsed incluye "package.json"
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F1.5: Post-procesamiento y quality score

**Objetivo**: Validar coherencia y calcular score de calidad del contexto.

**Archivos**:

- `packages/convex/convex/agents/contextValidator.ts` — Nuevo
- `packages/convex/convex/agents/actions.ts` — Integrar validación
- `packages/convex/convex/ai/prompts/productContext.ts` — Añadir qualityScore a tipos

**Prompt**:

```
F1.5: Post-procesamiento y quality score

PARTE 1: VALIDADOR
Crear packages/convex/convex/agents/contextValidator.ts:

import { ProductContextPayload } from "../ai/prompts/productContext";

export function validateAndEnrichContext(
  context: ProductContextPayload,
  detectedStack?: string[]
): ProductContextPayload & { qualityScore: number } {
  const result = { ...context };

  // Coherencia stage/maturity
  if (["mvp", "idea"].includes(result.stage || "") && result.maturity === "mid") {
    result.maturity = "early";
  }
  if (["mvp", "idea"].includes(result.stage || "") && result.maturity === "late") {
    result.maturity = "early";
  }

  // Sobrescribir stack si hay detección
  if (detectedStack && detectedStack.length > 0) {
    result.technicalStack = detectedStack;
  }

  // Calcular quality score
  let score = result.confidence ?? 0.5;

  // Penalizaciones
  if (!result.strategicPillars?.length) score -= 0.2;
  if (!result.competition?.length) score -= 0.1;
  if (!result.risks?.length && ["mvp", "idea", "beta"].includes(result.stage || "")) score -= 0.1;
  if (!result.keyFeatures?.length) score -= 0.15;
  if (!result.valueProposition) score -= 0.1;

  // Bonificaciones
  if (result.technicalStack?.length) score += 0.05;
  if (result.notableEvents?.length && result.notableEvents.length > 2) score += 0.1;
  if (result.personas?.length && result.personas.every(p => p.description)) score += 0.05;

  const qualityScore = Math.max(0, Math.min(1, score));

  return { ...result, qualityScore };
}

PARTE 2: TIPOS
Añadir en packages/convex/convex/ai/prompts/productContext.ts:
- qualityScore: number a ProductContextPayload
- Actualizar ProductContextVersion

PARTE 3: INTEGRAR EN ACTION
En packages/convex/convex/agents/actions.ts generateProductContext:
- Después de parsear JSON:
  1. Llamar validateAndEnrichContext(parsed, detectedStack)
  2. Guardar resultado con qualityScore

PARTE 4: UI (opcional)
En product-context-card.tsx:
- Mostrar badge con qualityScore (color según nivel)
- Si < 0.5: badge warning "Low quality - improve baseline"

PARTE 5: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
- pnpm --filter @hikai/webapp exec tsc --noEmit
- Regenerar contexto y verificar qualityScore calculado
- Verificar coherencia stage/maturity corregida
```

**Validación**:

- [ ] Coherencia stage/maturity se corrige automáticamente
- [ ] Stack detectado sobrescribe inferido
- [ ] qualityScore calculado y guardado
- [ ] Score refleja completitud del contexto
- [ ] UI muestra indicador de calidad
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa
- [ ] `pnpm --filter @hikai/webapp exec tsc --noEmit` pasa

---

### F1.6: Modelo por use-case/agente

**Objetivo**: Permitir seleccionar modelo por use-case/agent para optimizar coste vs calidad.

**Archivos**:

- `packages/convex/convex/ai/config.ts` — Ampliar configuración por use-case/agent
- `packages/convex/convex/agents/productContextAgent.ts` — Usar modelo dinámico por caso
- `packages/convex/convex/agents/actions.ts` — Pasar metadata de use-case/agent
- `packages/convex/convex/ai/telemetry.ts` — Registrar modelo efectivo

**Prompt**:

```
F1.6: Modelo por use-case/agente

PARTE 1: CONFIGURACIÓN
- Añadir mapping configurable (env o config) por use-case/agent → modelo.
- Fallback a AI_MODEL global si no hay override.

PARTE 2: INTEGRACIÓN
- Asegurar que Product Context Agent use el modelo del mapping.
- Registrar en telemetría el modelo efectivo usado.

PARTE 3: VALIDACIÓN
- Regenerar contexto con override activo y verificar model en output/telemetría.
```

**Validación**:

- [ ] Mapping por use-case/agent funciona
- [ ] Fallback a AI_MODEL global funciona
- [ ] Telemetría refleja modelo efectivo

---

### F1.7: Persistencia extendida de inferencias + rating

**Objetivo**: Persistir metadata completa de inferencias y permitir feedback/rating por use-case.

**Archivos**:

- `packages/convex/convex/schema.ts` — Nueva tabla/colección para inferencias
- `packages/convex/convex/ai/telemetry.ts` — Guardar prompt, response, versión, timings
- `packages/convex/convex/lib/aiUsage.ts` — Queries/reportes
- `apps/webapp/src/domains/*` — UI opcional para feedback/rating

**Prompt**:

```
F1.7: Persistencia extendida + rating

PARTE 1: PERSISTENCIA
- Guardar: useCase, prompt, promptVersion, response, provider, model,
  latencyMs, orgId, productId, tokens, cost.

PARTE 2: RATING
- Permitir activar/desactivar por use-case.
- Guardar rating de usuario y metadata mínima de feedback.

PARTE 3: VALIDACIÓN
- Verificar que se guarda registro completo por use-case habilitado.
- Validar que rating se persiste y se puede consultar.
```

**Validación**:

- [ ] Registro completo de inferencias guardado
- [ ] Flag por use-case habilita/deshabilita persistencia
- [ ] Rating se guarda y se consulta

## Decisiones tomadas

1. **Wizard UX**: `valueProposition` obligatorio, resto opcional con sugerencias/hints
2. **Documentación**: Crear documento separado `apps/webapp/webapp-plans/hikai-product-context-improvements.md`
3. **Prioridad**: Atacar prompt e inputs en paralelo
4. **Baseline**: Formulario guiado al crear + editable en settings. Cambios = nueva versión contexto
5. **Stack**: Detección automática desde package.json del repo conectado
