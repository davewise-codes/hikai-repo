# Refactorizacion del Sistema de Agentes (Plan de Implementacion)

## Contexto

Este plan aterriza la propuesta de `apps/webapp/webapp-plans/2026-01-11-refactor-agents.md` en subfases operables. Cada fase tiene un prompt listo para ejecutar y una tabla de seguimiento. El objetivo es migrar el sistema de agentes a una arquitectura mas determinista, modular y escalable, con aislamiento de contexto, planning explicito y skills versionados.

**Objetivo**: Implementar Agent Core + Skills + Orchestration con validacion de determinismo y rollback.

**No objetivos**:
- Migrar historicos o hacer backfills.
- Reescribir el pipeline completo en una sola iteracion.

**Referencias**:
- `apps/webapp/webapp-plans/2026-01-11-refactor-agents.md`
- `packages/convex/convex/agents/actions.ts`
- `packages/convex/convex/ai/prompts/*`
- `packages/convex/convex/schema.ts`

---

## Progreso

| Subfase | Descripcion                                         | Estado |
| ------- | --------------------------------------------------- | ------ |
| F0.0    | Contratos de datos, checkpoints y validacion        | ✅     |
| F1.0    | Agent Core Layer (loop + tools + metrics)           | ✅     |
| F2.0    | Skill system (parser + loader + skills base)        | ✅     |
| F3.0    | Surface Classifier (primera migracion)              | ✅     |
| F4.0    | Plan Manager + Feature Extractor                    | ✅     |
| F5.0    | Domain Mapper + Orchestrator con aislamiento        | ✅     |
| F6.0    | Validacion determinismo + comparativas              | ⏳     |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Prompt para arrancar subfases

```
- En apps/webapp/webapp-plans/refactor-agents-implementation-plan.md puedes ver el plan
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

- Seguir `CLAUDE.md` y la regla apps -> packages.
- Backend Convex: primera linea de queries/mutations/actions debe llamar a `assertProductAccess`.
- No cambiar la taxonomia sin actualizar skills y validacion.
- Usar Zod schemas estrictos para outputs de agentes.
- Mantener outputs compatibles mientras dure la migracion.
- Pruebas minimas: `pnpm --filter @hikai/convex exec tsc --noEmit`.

---

## Subfases

### F0.0: Contratos de datos, checkpoints y validacion

**Objetivo**: Definir contratos y decisiones clave antes de tocar implementacion.

**Prompt**:

```
F0.0: Contratos y decisiones base

PARTE 1: OUTPUTS
- Definir schemas Zod para outputs de Surface, Domain, Feature, Narrative.
- Definir reglas de versionado para outputs (outputVersion).

PARTE 2: CHECKPOINTS
- Definir formato de checkpoint por fase (phase, checkpointVersion, payload).
- Definir tabla Convex dedicada y campos obligatorios.

PARTE 3: SUMMARIES
- Definir summarizeSurfaces determinista (ordenamiento, dedupe, estructura).
- Definir tamaño maximo de resumen por fase.

PARTE 4: RETRIES
- Definir politica de retry + backoff y estado "blocked".

PARTE 5: VALIDACION
- Checklist de validacion por fase y criterios de salida.
```

**Validacion**:
- [ ] Schemas Zod definidos
- [ ] Checkpoints versionados definidos
- [ ] Reglas de resumen determinista definidas
- [ ] Politica de retry definida

---

### F1.0: Agent Core Layer (loop + tools + metrics)

**Objetivo**: Implementar AgentLoop, tool registry y configuracion de sampling con metricas.

**Prompt**:

```
F1.0: Agent Core Layer

PARTE 1: AGENT LOOP
- Crear agent-loop.ts con maxTurns, maxTokens, timeoutMs, tools.
- Incluir configuracion de sampling (temperature/top_p/maxTokens).
- Guardar metrics (turns, tokens, latency) por ejecucion.

PARTE 2: TOOL REGISTRY
- Definir TOOL_SETS con read_only, analysis, generation.
- Asegurar que subagentes no puedan orquestar.

PARTE 3: VALIDACION
- Tests unitarios para loop y tool registry.
- Verificar que el loop corta en maxTurns y registra estado.
```

**Validacion**:
- [ ] AgentLoop implementado con sampling
- [ ] Tool registry con sets definidos
- [ ] Tests basicos del core

---

### F2.0: Skill system (parser + loader + skills base)

**Objetivo**: Implementar parser, loader e inyeccion de skills versionados.

**Prompt**:

```
F2.0: Skill system

PARTE 1: FORMATO
- Definir frontmatter (name, version, description).
- Definir body y ejemplos opcionales.

PARTE 2: PARSER + LOADER
- Implementar parseSkillMd y loadSkill.
- Validar con Zod el shape de Skill.

PARTE 3: INYECCION
- Inyectar skills via tool_result, no system prompt.

PARTE 4: SKILLS BASE
- Crear surface-classification.skill.md.
- Crear domain-taxonomy.skill.md.

PARTE 5: VALIDACION
- Tests de parse/load/inject.
```

**Validacion**:
- [ ] Parser y loader listos
- [ ] Skills base creadas
- [ ] Inyeccion en tool_result funcionando

---

### F3.0: Surface Classifier (primera migracion)

**Objetivo**: Migrar sourceContextAgent a SurfaceClassifierAgent usando Agent Core.

**Prompt**:

```
F3.0: Surface Classifier

PARTE 1: AGENTE
- Crear surface-classifier.ts con AgentLoop + read_only tools.
- Consumir skill surface-classification.

PARTE 2: OUTPUT
- Ajustar parseSurfaceClassification con Zod strict.
- Mantener compatibilidad del output actual (si aplica).

PARTE 3: VALIDACION
- Ejecutar determinismo 5x (>85% match).
- Medir tokens y latency.
```

**Validacion**:
- [ ] Agente migrado
- [ ] Output validado con Zod
- [ ] Determinismo >85%

---

### F4.0: Plan Manager + Feature Extractor

**Objetivo**: Introducir planning explicito y migrar Feature Extractor.

**Prompt**:

```
F4.0: Plan Manager + Feature Extractor

PARTE 1: PLAN MANAGER
- Implementar plan-manager.ts con maxItems=15 y 1 in_progress.
- Render y update atomico.

PARTE 2: FEATURE SKILL
- Crear feature-extraction.skill.md desde prompt actual.

PARTE 3: FEATURE EXTRACTOR
- Migrar featureMapAgent a FeatureExtractorAgent.
- Usar Plan Manager para guiar la extraccion.

PARTE 4: VALIDACION
- Tests de plan manager.
- Determinismo 5x con inputs estables.
```

**Validacion**:
- [ ] Plan Manager implementado
- [ ] Feature skill creada
- [ ] Feature Extractor migrado

---

### F5.0: Domain Mapper + Orchestrator con aislamiento

**Objetivo**: Completar pipeline con fases aisladas y checkpoints.

**Prompt**:

```
F5.0: Domain Mapper + Orchestrator

PARTE 1: DOMAIN MAPPER
- Crear domain-mapper.ts con skill domain-taxonomy.
- Consumir solo summaries (no raw data).

PARTE 2: ORCHESTRATOR
- Implementar TaxonomyOrchestrator con fases aisladas.
- Checkpoints por fase en tabla dedicada.
- Rollback a fase previa.

PARTE 3: RESUMENES
- Implementar summarizeSurfaces determinista.
- Limites de tokens por resumen.

PARTE 4: VALIDACION
- Pipeline end-to-end con surface -> domain -> feature.
```

**Validacion**:
- [ ] Domain Mapper creado
- [ ] Orchestrator con checkpoints y rollback
- [ ] Resumen determinista aplicado

---

### F6.0: Validacion determinismo + comparativas

**Objetivo**: Asegurar consistencia antes/despues y medir mejoras.

**Prompt**:

```
F6.0: Validacion final

PARTE 1: DETERMINISMO
- Ejecutar 5x el pipeline completo con mismo input.
- Calcular similitud y confirmar >85%.

PARTE 2: METRICAS
- Medir tokens y latency por fase.
- Comparar contra baseline actual.

PARTE 3: DOCUMENTACION
- Registrar cambios breaking.
- Documentar limites y recomendaciones de uso.
```

**Validacion**:
- [ ] Determinismo validado
- [ ] Metricas comparadas
- [ ] Documentacion lista

---

# Fin del documento
