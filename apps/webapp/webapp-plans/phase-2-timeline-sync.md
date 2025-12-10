# Fase 2: Timeline + Sync

## Contexto

La Fase 2 habilita la ingesta de eventos desde GitHub y su visualización en un timeline product-centric. Completa el pipeline `rawEvents → interpretedEvents` con sync manual y UI básica en el workspace del producto.

**Documentación de referencia**:

- `apps/webapp/webapp-plans/hikai-architecture.md` — Arquitectura técnica (sección Timeline + Sync)
- `apps/webapp/webapp-plans/Hikai_resumen_arquitectura.md` — Visión de negocio (MVP Timeline)
- `apps/webapp/webapp-plans/phase-1-workspace-sources.md` — Fase previa (workspace + sources)
- `apps/webapp/webapp-plans/ui-density.md` — Formato y patrones de planes
- `CLAUDE.md` y `README.md` — Reglas del repositorio

---

## Progreso

| Subfase | Descripción                              | Estado        |
| ------- | ---------------------------------------- | ------------- |
| F2.0    | Schema timeline (rawEvents, interpreted) | ✅ Completado |
| F2.1    | Ingesta GitHub → rawEvents               | ✅ Completado |
| F2.2    | Interpretación básica → interpreted      | ✅ Completado |
| F2.3    | Queries/mutations timeline (Convex)      | ⏳ Pendiente  |
| F2.4    | Hooks timeline en webapp                 | ⏳ Pendiente  |
| F2.5    | UI timeline + botón de sync              | ⏳ Pendiente  |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Prompt para arrancar subfases

```
- En apps/webapp/webapp-plans/phase-2-timeline-sync.md puedes ver el plan de la Fase 2
- Vamos a proceder con la siguiente subfase pendiente
- Usa el prompt de esa subfase como instrucción completa
- Comparte el plan de implementación antes de ejecutar cambios
- No hagas asunciones, compárteme dudas y las debatimos antes de empezar el desarrollo
- Asegúrate de que cumples las reglas del repo al desarrollar
- No hagas commit hasta confirmar pruebas OK
- Una vez validado haz commit y actualiza el progreso en el documento apps/webapp/webapp-plans/phase-2-timeline-sync.md sección Progreso
- Tras terminar de desarrollar cada subfase, indícame las pruebas funcionales con las que puedo validar la fase antes del commit
- Máxima capacidad de ultrathink

```

---

## Instrucciones generales

- Seguir `CLAUDE.md` y la regla apps → packages (apps consumen `@hikai/*`).
- Componentes UI e iconos siempre desde `@hikai/ui`; sin `lucide-react` directo en apps/.
- Backend Convex: primera línea de queries/mutations/actions debe llamar a `assertProductAccess`; usar índices para filtros por producto/tiempo; respetar límites de plan con `packages/convex/convex/lib/planLimits.ts` cuando aplique (sync manual).
- Timeline y sync deben registrar estados sin exponer credenciales; limpiar tokens en respuestas.
- Commit por subfase con formato `feat(scope): [F2.X] descripción`; sin commit hasta validar tests.
- Pruebas mínimas: `pnpm --filter @hikai/convex exec tsc --noEmit` y `pnpm --filter @hikai/webapp exec tsc --noEmit`; añadir lint si hay cambios en webapp.

---

## Subfases

### F2.0: Schema timeline

**Objetivo**: Definir tablas Convex para `rawEvents` e `interpretedEvents` con índices por producto y tiempo.

**Archivos**:

- `packages/convex/convex/schema.ts` — Añadir tablas e índices
- (Opcional) `packages/convex/convex/lib/` — Tipos/helpers compartidos si son necesarios

**Prompt**:

```
F2.0: Schema timeline

PARTE 1: TABLAS EN schema.ts
- Crear table rawEvents con campos mínimos:
  - productId: v.id("products")
  - connectionId: v.id("connections")
  - provider: v.literal("github") (extensible a futuro)
  - sourceType: v.union(v.literal("commit"), v.literal("pull_request"), v.literal("release"))
  - payload: v.any() // payload crudo normalizado
  - occurredAt: v.number()
  - ingestedAt: v.number()
  - processedAt: v.optional(v.number())
  - status: v.union(v.literal("pending"), v.literal("processed"), v.literal("error"))
  - lastError: v.optional(v.string())
  - createdAt: v.number()
  - updatedAt: v.number()
- Índices rawEvents:
  - by_product_time: ["productId", "ingestedAt"]
  - by_connection_time: ["connectionId", "ingestedAt"]
  - by_status: ["status"]

- Crear table interpretedEvents con campos:
  - productId: v.id("products")
  - rawEventId: v.id("rawEvents")
  - kind: v.string() // feature, bugfix, chore, docs, release, etc.
  - title: v.string()
  - summary: v.optional(v.string())
  - occurredAt: v.number()
  - relevance: v.optional(v.number()) // 1-5
  - tags: v.optional(v.array(v.string()))
  - createdAt: v.number()
  - updatedAt: v.number()
- Índices interpretedEvents:
  - by_product_time: ["productId", "occurredAt"]
  - by_raw_event: ["rawEventId"]

PARTE 2: VALIDACIÓN
- Ejecutar pnpm --filter @hikai/convex exec tsc --noEmit
```

**Validación**:

- [ ] Tablas `rawEvents` e `interpretedEvents` creadas con índices solicitados
- [ ] Campos cubren pipeline raw → interpreted (tiempos, estado, vínculo rawEventId)
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F2.1: Ingesta GitHub → rawEvents

**Objetivo**: Implementar ingesta manual desde GitHub que registre eventos en `rawEvents` y marque `connections.lastSyncAt`.

**Archivos**:

- `packages/convex/convex/connectors/github.ts` — Ampliar con acción/mutación de sync manual
- `packages/convex/convex/connectors/connections.ts` — Actualizar lastSyncAt si aplica
- `packages/convex/convex/lib/planLimits.ts` — Usar para validar frecuencia de sync (plan free: 1/semana)
- `packages/convex/convex/lib/` — Helper de normalización opcional (ej. `normalizeGithubEvent`)

**Prompt**:

```
F2.1: Ingesta GitHub → rawEvents

PARTE 1: ACCESO Y LÍMITES
- En la acción/mutación de sync, primera línea: await assertProductAccess(ctx, productId)
- Validar límite de sync manual según plan (planLimits). Si se excede, devolver error controlado.

PARTE 2: FETCH DE EVENTOS
- Usar credentials de la connection (sin exponerlas).
- Obtener eventos desde lastSyncAt (o 0).
- Normalizar a un payload homogéneo con campos: id externo, sourceType (commit|pull_request|release), title, body, author, url, occurredAt.

PARTE 3: INSERTAR rawEvents
- Insertar uno por evento nuevo, status "pending", ingestedAt=Date.now(), processedAt null.
- Evitar duplicados mediante id externo (guardar en payload y filtrar).
- Actualizar connection.lastSyncAt con timestamp de sync.
- Registrar errores en rawEvents.lastError y connection.lastError si falla.

PARTE 4: RESPUESTA
- Devolver resumen: { ingested: number, skipped: number, connectionId, productId }
- No incluir credentials en la respuesta.

PARTE 5: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
- Probar manualmente la acción con un productId + connectionId válidos (si hay fixtures) o via tests ligeros si existen utilidades.
```

**Validación**:

- [ ] Sync manual crea `rawEvents` nuevos con status `pending`
- [ ] Se respeta `assertProductAccess` y límites de plan de sync
- [ ] `lastSyncAt` y `lastError` de la conexión se actualizan correctamente
- [ ] Respuesta no expone credenciales
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F2.2: Interpretación básica → interpretedEvents

**Objetivo**: Procesar `rawEvents` pendientes y generar `interpretedEvents` con heurísticas simples (sin IA).

**Nota de evolución a IA**: Mantener la interpretación como capa intercambiable. Implementar `interpretEvent(raw)` como punto único de heurística para que pueda sustituirse por IA sin romper el pipeline. Asegurar que el `payload` de `rawEvents` conserva texto/título/body/labels suficientes para modelos. Preparar un modo de reprocess (`rawEventIds`) para reescribir interpretedEvents cuando se active IA y permitir shadow/fallback (heurística como respaldo si IA falla).

**Notas de modelado para facilitar IA y reporting**:

- Agregación temporal: siempre guardar `occurredAt` y derivar `bucketAt` (p. ej. semanal) para reporting homogéneo. Planes básicos pueden consumir bucketed; planes superiores permiten vista continua. Reprocess debe recalcular bucket si cambian políticas.
- Catálogo opinado de tipos: usar taxonomía estable y extensible (feature, bugfix, chore, refactor, docs, release, perf, security, design, discovery, ui_improvement, data, infra, ops, product_line, experiment). Mapear `sourceType` y labels a este catálogo; versionar el clasificador.
- Contexto de producto: incluir campos opcionales `productAreaId`/`initiativeId`/`audience` y `impact` (ej. latency, conversion, compliance). Extraer `contextHints` (paths, labels, branch, linked issues) para IA futura y mejor clasificación.
- Detalle sin depender de raw: en interpreted guardar `title`, `summary`, `details?`, `url`, `occurredAt`, `bucketAt`, `kind`, `relevance`, `tags`, `actors?`, `components?`, `rawEventId`, `rawPurged`, `sourceType`. Raw se puede purgar por SLA pero dejar `rawPurged` y `classifierVersion` para trazabilidad y migraciones.

**Archivos**:

- `packages/convex/convex/timeline/interpret.ts` — Nuevo archivo con action/mutation
- `packages/convex/convex/timeline/index.ts` — Nuevo índice de exports
- `packages/convex/convex/connectors/github.ts` — Opcional: llamar interpretación al final del sync

**Prompt**:

```
F2.2: Interpretación básica → interpretedEvents

PARTE 1: ACTION/MUTATION
- Crear función interpretPendingEvents(productId) que:
  1) assertProductAccess
  2) Query de rawEvents con status "pending" por productId (orden asc por ingestedAt, límite 100)
  3) Mapear cada rawEvent a interpretedEvent:
     - kind: derivar de sourceType (commit→"chore" por defecto, pull_request→"feature"/"bugfix" según título, release→"release")
     - title: usar title/título derivado
     - summary: opcional a partir del body/commit message (sin IA)
     - occurredAt: raw.occurredAt
     - relevance: set 3 por defecto; releases 5
  4) Insertar interpretedEvents y marcar rawEvent.status="processed", processedAt=Date.now()
  5) En caso de error, rawEvent.status="error" y lastError con mensaje
- Opcional: permitir parámetro `rawEventIds` para reintentos.

PARTE 2: HOOK CON SYNC
- (Opcional) Desde la acción de sync GitHub, llamar interpretPendingEvents(productId) al final.

PARTE 3: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
- Revisar que interpretedEvents conserva referencia rawEventId
```

**Validación**:

- [ ] rawEvents pendientes pasan a processed con processedAt
- [ ] interpretedEvents creados con campos kind/title/occurredAt/relevance
- [ ] Errores dejan rawEvent.status="error" con lastError
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F2.3: Queries/mutations timeline (Convex)

**Objetivo**: Exponer API Convex para consumir el timeline y disparar sync/interpretation desde webapp.

**Archivos**:

- `packages/convex/convex/timeline/events.ts` — Nuevo con queries/mutations
- `packages/convex/convex/timeline/index.ts` — Exportar
- `packages/convex/convex/api.ts` — Asegurar exportaciones (si aplica)

**Prompt**:

```
F2.3: Queries/mutations timeline (Convex)

PARTE 1: QUERIES
- listTimelineByProduct:
  args: { productId, limit?: number, cursor?: string, kind?: string }
  handler:
    - assertProductAccess
    - Query interpretedEvents by productId ordenado por occurredAt desc con índice by_product_time
    - Soportar cursor simple (last occurredAt/id) para paginación
    - Enriquecer cada entry con rawEvent.status/sourceType para UI (sin payload sensible)

PARTE 2: MUTATIONS/ACTIONS
- triggerManualSync:
  args: { productId, connectionId }
  handler:
    - assertProductAccess
    - Delegar en acción de sync GitHub (F2.1)
    - Devolver resumen { ingested, interpreted }
- reprocessRawEvents (opcional):
  args: { productId, rawEventIds: Id<"rawEvents">[] }
  handler: assertProductAccess + llamar interpretPendingEvents con ids

PARTE 3: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
- Revisar que ninguna query expone credentials/payloads sensibles (solo metadata)
```

**Validación**:

- [ ] listTimelineByProduct usa índice by_product_time y pagina
- [ ] triggerManualSync delega en acción de sync y retorna resumen
- [ ] Sin filtrado inseguro: siempre assertProductAccess
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F2.4: Hooks timeline en webapp

**Objetivo**: Crear hooks React para consumir timeline y disparar sync desde la webapp.

**Archivos**:

- `apps/webapp/src/domains/timeline/hooks/use-timeline.ts` — Nuevo
- `apps/webapp/src/domains/timeline/hooks/index.ts` — Nuevo
- `apps/webapp/src/domains/timeline/index.ts` — Nuevo exports
- `apps/webapp/src/domains/timeline/types.ts` — Opcional para tipos locales

**Prompt**:

```
F2.4: Hooks timeline en webapp

PARTE 1: HOOKS DE DATOS
- useTimeline(productId): usa useQuery(api.timeline.events.listTimelineByProduct, { productId }) con cursor/limit opcional; devolver { timeline, isLoading, loadMore }.
- useTriggerSync(): useMutation(api.timeline.events.triggerManualSync)
- useReprocessRawEvents(): useMutation(api.timeline.events.reprocessRawEvents) si se implementó.

PARTE 2: ESTADOS
- isLoading = timeline === undefined
- Manejar errores con toasts (usar Toaster de @hikai/ui)

PARTE 3: EXPORTS
- Exportar hooks desde index.ts y domains/timeline/index.ts

PARTE 4: VALIDACIÓN
- pnpm --filter @hikai/webapp exec tsc --noEmit
- Hooks no importan directamente de lucide-react ni componentes externos
```

**Validación**:

- [ ] Hooks devuelven loading/errores consistentes
- [ ] Mutations expuestas para sync y reprocess
- [ ] Export paths correctos (`@/domains/timeline`)
- [ ] `pnpm --filter @hikai/webapp exec tsc --noEmit` pasa

---

### F2.5: UI timeline + botón de sync

**Objetivo**: Implementar la vista `/app/.../timeline` con listado de interpretedEvents, filtros básicos y botón “Sync now”.

**Archivos**:

- `apps/webapp/src/routes/app/$orgSlug/$productSlug/timeline.tsx` — Reemplazar placeholder
- `apps/webapp/src/domains/timeline/components/timeline-list.tsx` — Nuevo
- `apps/webapp/src/domains/timeline/components/timeline-filters.tsx` — Nuevo
- `apps/webapp/src/domains/timeline/components/index.ts` — Nuevo
- `apps/webapp/src/i18n/locales/en/timeline.json` — Nuevo
- `apps/webapp/src/i18n/locales/es/timeline.json` — Nuevo

**Prompt**:

```
F2.5: UI timeline + botón de sync

PARTE 1: COMPONENTES
- timeline-list.tsx: renderiza interpretedEvents en orden desc; cada ítem muestra kind, title, occurredAt, tags, estado rawEvent (badge). Usar componentes de @hikai/ui (Card/List, Badge, Button, Skeleton).
- timeline-filters.tsx: filtro por kind y rango de fechas básico (client-side para primera versión).

PARTE 2: RUTA
- Actualizar apps/webapp/src/routes/app/$orgSlug/$productSlug/timeline.tsx para:
  - Consumir useTimeline(productId)
  - Mostrar botón “Sync now” que llama useTriggerSync(connectionId) y muestra toasts de éxito/error
  - Manejar empty state con CTA “Connect a source” que lleve a `/settings/product/$productSlug/sources`
  - Loading: Skeleton usando @hikai/ui

PARTE 3: UX
- Respetar UI density (text-fontSize-sm, paddings compactos)
- Iconos desde @hikai/ui (ej: Clock, RefreshCw)

PARTE 4: VALIDACIÓN
- pnpm --filter @hikai/webapp exec tsc --noEmit
- Verificar que el botón de sync se deshabilita durante la llamada
- Empty state visible sin eventos
```

**Validación**:

- [ ] Ruta timeline muestra eventos con filtros básicos
- [ ] Botón “Sync now” dispara triggerManualSync y muestra feedback
- [ ] Empty/loading states listos
- [ ] Solo componentes/iconos de `@hikai/ui`
- [ ] `pnpm --filter @hikai/webapp exec tsc --noEmit` pasa

---
