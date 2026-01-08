# Context Interpreter Agent (Timeline)

## Contexto

El Timeline debe dejar de mostrar commits y pasar a una narrativa de producto alineada con el contexto (productBaseline + productContext) y la cadencia esperada. La interpretación de eventos se convierte en un agente especialista con modelo propio, telemetria y feedback por interpretacion.

Ademas, el contexto actual mezcla "current" e historico en el mismo JSON. Queremos separar el historico a una tabla dedicada, mantener current en product, y vincular cada interpretacion al snapshot de baseline + contexto usado.

**Objetivo**: Una narrativa coherente, contextualizada y evaluable por los usuarios, con buckets definidos por la cadencia del producto.

**No objetivos**:
- Migracion o retrocompatibilidad de datos existentes.
- Automatizar backfills historicos.

**Referencias**:
- `apps/webapp/webapp-plans/hikai-product-context-improvements.md`
- `apps/webapp/webapp-plans/hikai-ai-inference-implementation.md`
- `packages/convex/convex/ai/config.ts`
- `packages/convex/convex/ai/telemetry.ts`
- `packages/convex/convex/agents/actions.ts`
- `packages/convex/convex/timeline/interpret.ts`
- `packages/convex/convex/schema.ts`

---

## Progreso

| Subfase | Descripcion                                              | Estado |
| ------- | -------------------------------------------------------- | ------ |
| F0.0    | Alineacion de arquitectura y contratos de datos          | ✅     |
| F1.0    | Separar historico de productContext a tabla dedicada     | ✅     |
| F2.0    | Agente de interpretacion (prompt, modelo, telemetria)    | ✅     |
| F3.0    | Pipeline de interpretacion con agrupacion y snapshots    | ✅     |
| F4.0    | UI de timeline y feedback por interpretacion             | ⏳     |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Prompt para arrancar subfases

```
- En apps/webapp/webapp-plans/context-interpreter-agent.md puedes ver el plan
- Vamos a proceder con la siguiente subfase pendiente
- Usa el prompt de esa subfase como instruccion completa
- Comparte el plan de implementacion antes de ejecutar cambios
- No hagas asunciones, comparteme dudas y las debatimos antes de empezar el desarrollo
- Asegurate de que cumples las reglas del repo al desarrollar
- No hagas commit hasta confirmar pruebas OK
- Una vez validado haz commit y actualiza el progreso en el documento
- Tras terminar de desarrollar cada subfase, indicame las pruebas funcionales con las que puedo validar la fase antes del commit
- Maxima capacidad de ultrathink
```

---

## Instrucciones generales

- Seguir `CLAUDE.md` y la regla apps → packages.
- Componentes UI e iconos siempre desde `@hikai/ui`.
- Backend Convex: primera linea de queries/mutations/actions debe llamar a `assertProductAccess`.
- Usar la taxonomia actual de `productBaseline` + `productContext`.
- No migrar datos existentes; cambios solo para nuevos datos.
- Commits con formato `feat(scope): [F#.0] descripcion`.
- Pruebas minimas: `pnpm --filter @hikai/convex exec tsc --noEmit` y `pnpm --filter @hikai/webapp exec tsc --noEmit`.

---

## Subfases

### F0.0: Alineacion de arquitectura y contratos

**Objetivo**: Definir contratos de datos y criterios de interpretacion antes de tocar codigo.

**Prompt**:

```
F0.0: Contratos y criterios

PARTE 1: CONTRATOS
- Definir estructura del nuevo "interpreted timeline event" (campos, tags, links).
- Definir como se agrupan rawEvents en un evento narrativo.
- Definir relacion con baseline/context (snapshot vs referencias).

PARTE 2: CADENCIA
- Especificar buckets segun releaseCadence (cada 2 dias, 2 veces por semana, semanal, quincenal, mensual, irregular).
- Propuesta de buckets:
  - Cada 2 dias: bucketId `YYYY-MM-DD` (fecha de inicio), rango [start, start + 48h).
  - 2x semana: bucketId `YYYY-W##-A` (lun-jue) y `YYYY-W##-B` (vie-dom).
  - Semanal: bucketId `YYYY-W##` (ISO week).
  - Quincenal: bucketId `YYYY-MM-Q1` (1-15) y `YYYY-MM-Q2` (16-fin).
  - Mensual: bucketId `YYYY-MM`.
  - Irregular: bucketId `rolling-30d-YYYY-MM-DD` (inicio) con flag `cadence=irregular`.
- Definir reglas de asignacion de rawEvents a buckets.

PARTE 3: TAXONOMIA
- Mapear usos de keyFeatures, audienceSegments, strategicPillars, productDomains, productEpics.

PARTE 4: VALIDACION
- Checklist de coherencia narrativa.
```

**Validacion**:
- [ ] Contratos definidos y revisados
- [ ] Buckets por cadencia definidos
- [ ] Uso de taxonomia acordado

---

### F1.0: Separar historico de productContext a tabla dedicada

**Objetivo**: Mantener `current` en product y mover el historico a tabla propia.

**Archivos**:
- `packages/convex/convex/schema.ts`
- `packages/convex/convex/agents/productContextData.ts`
- `packages/convex/convex/agents/actions.ts`

**Prompt**:

```
F1.0: productContext history table

PARTE 1: SCHEMA
- Crear tabla `productContextHistory` con { productId, entry, createdAt, version, createdBy }.
- Mantener `products.productContext.current` solamente.

PARTE 2: WRITE PATH
- saveProductContext: guardar current en product y append en history table.

PARTE 3: READ PATH
- Ajustar lecturas que usan history (si aplica) para consultar la tabla.

PARTE 4: VALIDACION
- tsc convex + webapp
- Verificar que nuevos contextos generan entry en tabla nueva
```

**Validacion**:
- [ ] Tabla nueva creada y usada
- [ ] current permanece en product
- [ ] No hay dependencia de migracion

---

### F2.0: Agente de interpretacion (prompt, modelo, telemetria)

**Objetivo**: Crear agente especialista para interpretar eventos con modelo propio y telemetria completa.

**Archivos**:
- `packages/convex/convex/agents/` (nuevo agente)
- `packages/convex/convex/ai/prompts/` (prompt)
- `packages/convex/convex/ai/config.ts`
- `packages/convex/convex/ai/telemetry.ts`

**Prompt**:

```
F2.0: Timeline Context Interpreter Agent

PARTE 1: AGENTE
- Crear agente con nombre oficial "Timeline Context Interpreter Agent".
- Configurar modelo dedicado en ai/config.ts.
- Persistir inference logs con metadata de interpretacion.

PARTE 2: PROMPT
- Input: rawEvents + baseline + productContext + releaseCadence.
- Output: eventos narrativos con buckets, tags y links a rawEventIds.
- Incluir reglas: no listar commits, contar historia de producto.

PARTE 3: TELEMETRIA
- Asegurar recordAIUsage + recordAIInferenceLog.
- Guardar metadata: bucket, rawEventIds, contextVersion, baseline snapshot hash.

PARTE 4: VALIDACION
- tsc convex
- Ejecutar una interpretacion manual y revisar logs
```

**Validacion**:
- [ ] Agente con modelo propio configurado
- [ ] Prompt produce narrativa coherente
- [ ] Telemetria y logs persistidos

---

### F3.0: Pipeline de interpretacion con agrupacion y snapshots

**Objetivo**: Reemplazar la interpretacion actual por agrupacion narrativa y snapshots de contexto.

**Archivos**:
- `packages/convex/convex/schema.ts`
- `packages/convex/convex/timeline/interpret.ts`
- `packages/convex/convex/timeline/events.ts`
- `packages/convex/convex/agents/actions.ts` (si aplica)

**Prompt**:

```
F3.0: Timeline interpretation pipeline

PARTE 1: MODELO DE DATOS
- Reusar tabla interpretedEvents con nuevo esquema narrativo (many-to-one).
- Crear tabla productContextSnapshots (baseline + context) y guardar referencia en products.currentContextSnapshotId.
- Cada interpreted event guarda contextSnapshotId en vez de duplicar payload.
- Guardar bucket/cadencia.

PARTE 2: INTERPRETACION
- interpretPendingEvents llama al agente y persiste narrativas.
- Mapear rawEvents -> interpreted event (many-to-one).

PARTE 3: INTEGRACION
- triggerManualSync dispara interpretacion y devuelve { ingested, interpreted, buckets }.

PARTE 4: VALIDACION
- tsc convex
- Verificar que rawEvents pasan a status processed
```

**Validacion**:
- [ ] Agrupacion many-to-one funcionando
- [ ] Snapshot baseline/context guardado
- [ ] Buckets por cadencia aplicados

---

### F4.0: UI de timeline y feedback por interpretacion

**Objetivo**: Timeline basado en narrativa y feedback por interpretacion.

**Archivos**:
- `apps/webapp/src/domains/timeline/`
- `apps/webapp/src/routes/app/$orgSlug/$productSlug/timeline.tsx`
- `apps/webapp/src/i18n/locales/en/timeline.json`
- `apps/webapp/src/i18n/locales/es/timeline.json`

**Prompt**:

```
F4.0: Timeline UI + feedback

PARTE 1: UI NARRATIVA
- Mostrar eventos interpretados como incrementos narrativos.
- Ocultar commits individuales en vista principal.
- Detail: lista de rawEvents asociados.

PARTE 2: FEEDBACK
- Botones para valorar interpretacion (up/down).
- Enviar rating via aiInferenceLogs (rateInference) con agentName "Timeline Context Interpreter Agent" y contextVersion.

PARTE 3: VALIDACION
- tsc webapp
- Validar flujo de rating
```

**Validacion**:
- [ ] UI muestra narrativa (no commits)
- [ ] Feedback por interpretacion funciona
- [ ] i18n actualizado

---

# Fin del documento
