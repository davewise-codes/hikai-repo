# Refactor Agents 2.0 - Plan de Implementacion

Arquitectura de agentes autonomos para trabajo de producto.

## Contexto

Hikai tiene agentes que actualmente funcionan como **wrappers de una llamada LLM** (single-shot):

- `maxTurns: 1` en todos los usos
- `tool_registry.ts` define tools pero `createStubTool()` no tiene implementacion real
- `plan_manager.ts` existe pero no se expone como tool al agente
- No hay verificacion de outputs ni capacidad de correccion

**Objetivo**: Transformar los agentes en procesos **verdaderamente autonomos** que:

- Iteren hasta cumplir criterios de aceptacion
- Usen tools ejecutables para interactuar con el sistema
- Planifiquen y tracken su trabajo visible en UI
- Verifiquen y corrijan sus outputs

**No objetivos**:

- Migracion de datos existentes
- Cambios en agentes que ya funcionan (productContext, timeline)
- Streaming en tiempo real (fase futura)

**Referencias**:

- `apps/webapp/webapp-plans/2026-01-14 - refactor-agents-2.md` (planteamiento completo)
- `packages/convex/convex/agents/core/` (infraestructura actual)
- `packages/convex/convex/agents/agentRuns.ts` (persistencia de runs)
- `packages/ui/DESIGN-TOKENS.md` y `COMPONENT-GUIDELINES.md`

---

## Progreso

| Subfase | Descripcion                                                               | Estado | Outcome                                                                 | Archivos creados/eliminados                                                                                                                                                                                                                                              |
| ------- | ------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F0.0    | Contratos y criterios de verificacion                                     | ✅     | Docs consolidadas en agents/ + refactor-agents-contracts.md actualizado | apps/webapp/doc/agents/tools.md; apps/webapp/doc/agents/domain-map.md; apps/webapp/doc/refactor-agents-contracts.md                                                                                                                                                      |
| F1.0    | Tools ejecutables core (read_sources, read_baseline, read_context_inputs) | ✅     | Factories creadas y docs actualizadas                                   | packages/convex/convex/agents/core/tools/read_sources.ts; packages/convex/convex/agents/core/tools/read_baseline.ts; packages/convex/convex/agents/core/tools/read_context_inputs.ts; packages/convex/convex/agents/core/tools/index.ts; apps/webapp/doc/agents/tools.md |
| F1.1    | Conectar tools al loop y habilitar maxTurns > 1                           | ✅     | Loop usa executeToolCall + UI provisional de smoke test                 | packages/convex/convex/agents/core/tool_registry.ts; packages/convex/convex/agents/core/agent_loop.ts; packages/convex/convex/agents/actions.ts; apps/webapp/src/domains/products/components/product-context-card.tsx; apps/webapp/src/i18n/locales/en/products.json; apps/webapp/src/i18n/locales/es/products.json; apps/webapp/doc/agents/architecture.md |
| F2.0    | TodoManager como tool del agente                                          | ✅     | Tool todo_manager creado con activeForm obligatorio                     | packages/convex/convex/agents/core/tools/todo_manager.ts; packages/convex/convex/agents/core/tools/index.ts; apps/webapp/doc/agents/tools.md                                                                                                                             |
| F2.1    | UI de progreso de agente (AgentProgress component)                        | ✅     | Componente AgentProgress con polling/backoff y plan                      | apps/webapp/src/domains/products/components/agent-progress.tsx; apps/webapp/src/domains/products/components/index.ts; apps/webapp/src/i18n/locales/en/products.json; apps/webapp/src/i18n/locales/es/products.json |
| F2.2    | Integracion de AgentProgress en ProductContextCard                        | ✅     | AgentProgress integrado en ProductContextCard                            | apps/webapp/src/domains/products/components/product-context-card.tsx; apps/webapp/webapp-plans/2026-01-14 - refactor-agents-2 implementation-plan.md |
| F3.0    | Skill domain-map-agent con taxonomia y reglas                             | ✅     | Skill nuevo alineado a domain-map.md                                    | packages/convex/convex/agents/skills/source/domain-map-agent.skill.md; packages/convex/convex/agents/skills/index.ts; apps/webapp/webapp-plans/2026-01-14 - refactor-agents-2 implementation-plan.md |
| F3.1    | Tool validate_output con validators                                       | ✅     | Tool validate_output + validator domain_map                              | packages/convex/convex/agents/core/tools/validate.ts; packages/convex/convex/agents/core/validators/domain_map.ts; packages/convex/convex/agents/core/validators/index.ts; apps/webapp/doc/agents/validation.md; packages/convex/convex/agents/core/tools/index.ts |
| F3.2    | Action generateDomainMap con loop completo                                | ✅     | Action en archivo nuevo + persistencia domainMap                         | packages/convex/convex/agents/domainMap.ts; packages/convex/convex/agents/domainMapData.ts; packages/convex/convex/schema.ts; packages/convex/convex/agents/index.ts; apps/webapp/webapp-plans/2026-01-14 - refactor-agents-2 implementation-plan.md |
| F3.2.1  | Loop autonomo con budget y control de output                              | ✅     | Loop basado en tools + reintentos por validacion + budget visible         | packages/convex/convex/agents/core/agent_loop.ts; packages/convex/convex/agents/core/tool_prompt_model.ts; packages/convex/convex/agents/core/json_utils.ts; packages/convex/convex/agents/domainMap.ts; apps/webapp/src/domains/products/components/agent-progress.tsx; apps/webapp/doc/agents/architecture.md; apps/webapp/doc/agents/tools.md; apps/webapp/doc/agents/validation.md; apps/webapp/src/i18n/locales/en/products.json; apps/webapp/src/i18n/locales/es/products.json |
| F3.3    | UI trigger y visualizacion de Domain Map                                  | ✅     | Domain map card + trigger con progreso visible                          | apps/webapp/src/domains/products/components/domain-map-card.tsx; apps/webapp/src/domains/products/components/product-context-card.tsx; apps/webapp/src/domains/products/components/index.ts; apps/webapp/src/routes/settings/product/$slug/context.tsx; packages/convex/convex/agents/actions.ts; apps/webapp/src/i18n/locales/en/products.json; apps/webapp/src/i18n/locales/es/products.json; apps/webapp/webapp-plans/2026-01-14 - refactor-agents-2 implementation-plan.md |
| F3.3.1  | Plan management aligned con learn-claude-code                             | ✅     | todo_manager simple + plan visible + nag system                         | packages/convex/convex/agents/core/tools/todo_manager.ts; packages/convex/convex/agents/core/agent_loop.ts; packages/convex/convex/agents/domainMap.ts; packages/convex/convex/agents/core/plan_manager.ts; packages/convex/convex/agents/skills/source/domain-map-agent.skill.md; packages/convex/convex/agents/skills/index.ts; apps/webapp/doc/agents/tools.md; apps/webapp/webapp-plans/2026-01-14 - refactor-agents-2 implementation-plan.md |
| F4.0    | Subagentes: delegate tool y agent_entrypoints                             | ⏳     | -                                                                       | -                                                                                                                                                                                                                                                                        |
| F5.0    | Eliminar flujos legacy de skills (domain-taxonomy, feature-extraction)    | ⏳     | -                                                                       | -                                                                                                                                                                                                                                                                        |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Prompt para arrancar subfases

```
- En apps/webapp/webapp-plans/2026-01-14 - refactor-agents-2 implementation-plan.md puedes ver el plan
- Revisa antes de empezar apps/webapp/webapp-plans/2026-01-14 - refactor-agents-2.md para asegurar que entiendes el planteamiento y los outcomes esperados
- Vamos a proceder con la siguiente subfase pendiente
- Usa el prompt de esa subfase como instruccion completa
- Comparte el plan de implementacion antes de ejecutar cambios
- No hagas asunciones, comparteme dudas y las debatimos antes de empezar el desarrollo
- Asegurate de que cumples las reglas del repo (CLAUDE.md, DESIGN-TOKENS.md, COMPONENT-GUIDELINES.md)
- No hagas commit hasta confirmar pruebas OK
- Una vez validado haz commit y actualiza el progreso en el documento
- Tras terminar de desarrollar cada subfase, indicame las pruebas funcionales con las que puedo validar la fase antes del commit
- Maxima capacidad de ultrathink
```

---

## Instrucciones generales

- Seguir `CLAUDE.md` y la regla apps → packages
- Componentes UI e iconos siempre desde `@hikai/ui`
- Backend Convex: primera linea de queries/mutations/actions debe llamar a `assertProductAccess` o `assertOrgAccess`
- Usar tokens semanticos del design system (no colores hardcodeados, no z-index arbitrarios)
- Tools deben tener pagination/limits para evitar outputs masivos
- No migrar datos existentes; cambios solo para nuevos datos
- Commits con formato `feat(agents): [F#.#] descripcion`

### Convex: separacion de responsabilidades

**Regla por fase**: action orquesta, mutation persiste, query lee.

| Capa       | Responsabilidad                            | Ejemplo                            |
| ---------- | ------------------------------------------ | ---------------------------------- |
| `action`   | Orquesta agente, llama LLM, coordina tools | `generateDomainMap`                |
| `mutation` | Persiste resultados, actualiza estado      | `saveDomainMap`, `appendStep`      |
| `query`    | Lee datos para tools y UI                  | `getRunById`, `listSourceContexts` |

Las actions NO escriben directamente a BD; llaman mutations internas.

### Documentacion

**Cada fase debe documentar contratos y decisiones en `apps/webapp/doc/`**:

- Crear/actualizar archivos en `apps/webapp/doc/agents/`
- **Principio: concision > verbosidad**. Sacrificar prosa por tablas, diagramas y ejemplos.
- Formato sugerido:
  - `agents/tools.md` - Contratos de tools (input/output)
  - `agents/domain-map.md` - Schema y reglas del Domain Map
  - `agents/validation.md` - Reglas de validacion
  - `agents/architecture.md` - Diagrama de arquitectura
- Actualizar docs existentes en lugar de crear nuevos si aplica

### Principios a verificar empiricamente

Cada fase debe validar al menos uno de estos principios:

| Principio                    | Descripcion                             | Como verificar en UI                            |
| ---------------------------- | --------------------------------------- | ----------------------------------------------- |
| **Agent Loop**               | El agente itera hasta cumplir criterios | Ver multiples turns en steps, no solo 1         |
| **Tools ejecutables**        | Tools interactuan con el sistema real   | Ver tool calls con datos reales (no inventados) |
| **Descomposicion**           | El agente planifica su trabajo          | Ver plan con items en AgentProgress             |
| **Verificacion**             | Outputs pasan validadores objetivos     | Ver step de validacion (pass/fail)              |
| **Criterio de finalizacion** | Termina por criterio, no por maxTurns   | status != "max_turns_exceeded"                  |
| **Observabilidad**           | Progreso visible en tiempo real         | Steps aparecen mientras el agente trabaja       |
| **Subagentes**               | Puede delegar a agentes especializados  | Ver sub-runs en AgentProgress                   |

---

## Subfases

### F0.0: Contratos y criterios de verificacion

**Objetivo**: Definir contratos de datos y criterios de validacion antes de tocar codigo.

**Convex**: N/A (fase de diseño, sin codigo)

**Prompt**:

```
F0.0: Contratos y criterios

PARTE 1: CONTRATOS DE TOOLS
- Mantener interface ToolDefinition actual: execute(input) sin ctx
- Usar patron closure: createTool(ctx, productId) retorna tool con execute(input)
- Contratos de input/output:
  - read_sources: { productId } → SourceContext[]
  - read_baseline: { productId } → ProductBaseline
  - read_context_inputs: { productId } → ContextInputs
  - todo_manager: { items } → Plan
  - validate_output: { outputType, data } → ValidationResult
- Comportamiento si tool no existe: fail fast con error en ToolResult

PARTE 2: CONTRATOS DE DOMAIN MAP
- Definir schema JSON del domain map output:
  - domains[]: { name, kind, weight, surfaces[], evidence[] }
  - layout: { columns[], rows[] }
  - summary: { totalDomains, productDomains, confidence, warnings[] }
- Definir reglas de validacion:
  - Campos requeridos
  - Rangos validos (weight 0..1, kind enum)
  - Evidencia no vacia por dominio

PARTE 3: CRITERIOS DE AUTONOMIA
- Definir test de autonomia minimo:
  1. Agente debe hacer >= 1 tool call antes de generar output
  2. Si validacion falla, debe reintentar (no fallar inmediatamente)
  3. Debe terminar con status != "max_turns_exceeded"
- Definir metricas a capturar:
  - Turns usados vs maxTurns
  - Tool calls por turn
  - Validation passes/failures

PARTE 4: MITIGACIONES
- Pagination en tools (limit, cursor)
- Timeout y budget (maxTurns: 10, timeoutMs: 480000)
- Outputs grandes (> 10KB): guardar en ctx.storage, referenciar via rawOutputFileId

PARTE 5: SUBAGENTES COMO PRINCIPIO BASE
- Todo agente DEBE registrar entrypoint invocable en agent_entrypoints.ts
- Entrypoint define: name, skill, defaultConfig
- Esto habilita delegacion desde el inicio (no es opcional)

PARTE 6: CONVENCIONES DE PATHS
| Ruta | Propósito |
|------|-----------|
| agents/core/tools/ | Factories de tools ejecutables |
| agents/skills/source/ | Skills .md fuente (nuevos) |
| agents/skills/*.skill.md | Skills legacy (no mover) |
| agents/skills/index.ts | Registry compilado (todos) |
| agents/actions/ | Actions por dominio |
| agents/actions/index.ts | Re-exports públicos |
| agents/core/validators/ | Funciones de validación |
| agents/core/agent_entrypoints.ts | Registry de agentes invocables |

PARTE 7: DOCUMENTACION
- Crear apps/webapp/doc/agents/tools.md con contratos de tools
- Crear apps/webapp/doc/agents/domain-map.md con schema
- Formato: tablas y ejemplos JSON, minima prosa

PARTE 8: VALIDACION
- Checklist de coherencia de contratos
- Docs creados y revisados
```

**Documentacion a crear**:

- `apps/webapp/doc/agents/tools.md`
- `apps/webapp/doc/agents/domain-map.md`

**Validacion**:

- [ ] Interfaces de tools definidas (patron closure)
- [ ] Schema de domain map documentado
- [ ] Test de autonomia especificado
- [ ] Mitigaciones acordadas (storage para outputs grandes)
- [ ] Requisito de entrypoint por agente documentado
- [ ] Docs creados en apps/webapp/doc/agents/

**Principios verificados**: Ninguno (fase de diseno)

---

### F1.0: Tools ejecutables core

**Objetivo**: Implementar tools que lean datos reales del sistema.

**Convex**: queries existentes (listSourceContexts, getProductWithContext, getLatestContextInputRun)

**Archivos**:

- `packages/convex/convex/agents/core/tools/read_sources.ts` (crear)
- `packages/convex/convex/agents/core/tools/read_baseline.ts` (crear)
- `packages/convex/convex/agents/core/tools/read_context_inputs.ts` (crear)
- `packages/convex/convex/agents/core/tools/index.ts` (crear)

**Prompt**:

````
F1.0: Tools ejecutables core

PARTE 1: ESTRUCTURA
- Crear carpeta agents/core/tools/
- Patron closure para inyectar contexto:
  ```ts
  // createReadSourcesTool(ctx, productId) retorna ToolDefinition
  export function createReadSourcesTool(
    ctx: ActionCtx,
    productId: Id<"products">
  ): ToolDefinition {
    return {
      name: "read_sources",
      description: "Get classified sources for the product",
      execute: async (input) => {
        // ctx y productId capturados en closure
        return ctx.runQuery(internal.agents.sourceContextData.listSourceContexts, {
          productId,
          limit: input.limit ?? 50
        });
      }
    };
  }
````

- Mantener ToolDefinition actual: { name, description?, execute(input) }

PARTE 2: IMPLEMENTAR read_sources

- Factory: createReadSourcesTool(ctx, productId)
- Output: SourceContext[] (usando listSourceContexts existente)
- La query ya valida acceso internamente
- Limite de resultados (max 50 sources, configurable)

PARTE 3: IMPLEMENTAR read_baseline

- Factory: createReadBaselineTool(ctx, productId)
- Output: ProductBaseline (name, type, valueProposition, etc.)
- Usar getProductWithContext existente
- Filtrar solo campos de baseline (no todo el product)

PARTE 4: IMPLEMENTAR read_context_inputs

- Factory: createReadContextInputsTool(ctx, productId)
- Output: { uiSitemap, userFlows, businessDataModel, repoTopology }
- Usar getLatestContextInputRun existente
- Manejar caso donde no existe run previo (retornar null fields)

PARTE 5: DOCUMENTACION

- Actualizar apps/webapp/doc/agents/tools.md con implementacion real
- Anadir ejemplos de output reales

PARTE 6: VALIDACION

- tsc convex sin errores

```

**Documentacion a actualizar**:
- `apps/webapp/doc/agents/tools.md` (ejemplos reales)

**Validacion**:
- [ ] Carpeta tools/ creada con 3 factories
- [ ] Cada factory retorna tool con execute() implementado
- [ ] Tools usan queries existentes (no duplican logica)
- [ ] Patron closure documentado
- [ ] Docs actualizados

**Principios verificados**: Tools como interfaz con la realidad

**Pruebas funcionales**:
1. Ejecutar manualmente cada tool desde una action de test
2. Verificar que retorna datos reales del producto
3. Verificar que falla correctamente si el usuario no tiene acceso

---

### F1.1: Conectar tools al loop y habilitar iteracion

**Objetivo**: El loop puede ejecutar tools reales y el agente puede iterar.

**Convex**: action orquesta loop, mutation persiste steps

**Archivos**:
- `packages/convex/convex/agents/core/tool_registry.ts` (modificar)
- `packages/convex/convex/agents/core/agent_loop.ts` (modificar si necesario)

**Prompt**:

```

F1.1: Conectar tools al loop

PARTE 1: TOOL REGISTRY (reemplazar)

- Eliminar createStubTool() y getToolsForAgent()
- Nueva función: executeToolCall(tools: ToolDefinition[], call: ToolCall): Promise<ToolResult>
  ```ts
  export async function executeToolCall(
  	tools: ToolDefinition[],
  	call: ToolCall,
  ): Promise<ToolResult> {
  	const tool = tools.find((t) => t.name === call.name);
  	if (!tool?.execute) {
  		return {
  			name: call.name,
  			input: call.input,
  			error: `Tool ${call.name} not found or has no execute`,
  		};
  	}
  	try {
  		const output = await tool.execute(call.input);
  		return { name: call.name, input: call.input, output };
  	} catch (e) {
  		return { name: call.name, input: call.input, error: String(e) };
  	}
  }
  ```
- agent_loop recibe tools[] directamente, usa executeToolCall

PARTE 2: HABILITAR ITERACION

- Crear config de agente para Domain Map:
  - maxTurns: 10 (permite iteracion)
  - timeoutMs: 480000 (8 minutos)
- Asegurar que agent_loop ejecuta tools cuando el modelo los invoca
- Acumular resultados de tools en el contexto del agente

PARTE 3: LOGGING DE TOOL CALLS

- Cada tool call debe registrarse en agentRuns.steps
- Formato: "Tool: {toolName}" con metadata { input, duration, output?, outputRef? }
- Outputs pequeños (< 10KB): metadata.output = resultado directo
- Outputs grandes (>= 10KB):
  - Guardar en ctx.storage.store(new Blob([JSON.stringify(output)]))
  - metadata.output = null
  - metadata.outputRef = { fileId: Id<"\_storage">, sizeBytes: number }
- El agente recibe output completo en memoria; solo el log se trunca

PARTE 4: DOCUMENTACION

- Crear apps/webapp/doc/agents/architecture.md con diagrama de flujo del loop

PARTE 5: VALIDACION

- tsc convex sin errores
- Crear action de test que ejecute un agente con tools

```

**Documentacion a crear**:
- `apps/webapp/doc/agents/architecture.md`

**Validacion**:
- [ ] tool_registry.ts con executeToolCall (sin stubs)
- [ ] Tool no encontrado retorna error en result (no crash)
- [ ] maxTurns > 1 configurable
- [ ] Tool calls registradas en steps con outputRef si > 10KB
- [ ] Diagrama de arquitectura creado

**Principios verificados**: Agent Loop, Tools ejecutables

**Pruebas funcionales**:
1. Ejecutar agente de prueba con maxTurns: 5
2. Verificar en agentRuns que hay multiples turns
3. Verificar que tool calls aparecen en steps con datos reales
4. Verificar que el agente termina por criterio (no max_turns_exceeded)
5. Verificar que tool inexistente retorna error en ToolResult (no crash)

---

### F2.0: TodoManager como tool del agente

**Objetivo**: El agente puede planificar su trabajo usando todo_manager como tool.

**Convex**: mutation persiste plan en agentRuns.steps

**Archivos**:
- `packages/convex/convex/agents/core/tools/todo_manager.ts` (crear)
- `packages/convex/convex/agents/core/plan_manager.ts` (adaptar si necesario)

**Prompt**:

```

F2.0: TodoManager tool

PARTE 1: TOOL DEFINITION

- name: "todo_manager"
- description: "Create and update execution plan for the current task"
- parameters:
  - action: "create" | "update" | "complete" | "list"
  - items?: Array<{ id, content, status }>
  - itemId?: string

PARTE 2: IMPLEMENTACION

- create: Crea plan inicial con items
- update: Actualiza items existentes
- complete: Marca item como completado
- list: Retorna estado actual del plan
- Usar plan_manager.ts existente internamente
- Persistir estado en agentRuns.steps con tipo especial "plan_update"

PARTE 3: GUARDRAILS

- Max 15 items por plan
- Si el agente no invoca todo_manager en turno 1, crear plan default
- Plan debe ser visible en cada step

PARTE 4: DOCUMENTACION

- Actualizar apps/webapp/doc/agents/tools.md con todo_manager

PARTE 5: VALIDACION

- tsc convex sin errores
- Test que verifique que el agente crea un plan

```

**Documentacion a actualizar**:
- `apps/webapp/doc/agents/tools.md`

**Validacion**:
- [ ] Tool todo_manager implementado
- [ ] Plan persiste entre turns
- [ ] Guardrail de plan default funciona
- [ ] Docs actualizados

**Principios verificados**: Descomposicion autonoma

**Pruebas funcionales**:
1. Ejecutar agente y verificar que crea plan en turno 1
2. Verificar que el plan tiene items con status
3. Verificar que items se marcan como completed conforme avanza

---

### F2.1: UI de progreso de agente (AgentProgress)

**Objetivo**: Componente React que muestra el progreso del agente en tiempo real.

**Convex**: query lee estado de agentRuns

**Archivos**:
- `apps/webapp/src/domains/products/components/agent-progress.tsx` (crear)
- `apps/webapp/src/domains/products/components/index.ts` (actualizar exports)

**Prompt**:

```

F2.1: AgentProgress component

PARTE 1: QUERY

- Usar useQuery(api.agents.agentRuns.getRunById, { runId })
- Polling con backoff exponencial mientras status === "running":
  - Inicial: 1 segundo
  - Max: 5 segundos
  - Factor: 1.5x por iteracion
- Stop inmediato cuando status !== "running" (no esperar adicional)
- UI muestra estado final sin polling posterior

PARTE 2: UI STRUCTURE

- Layout vertical con steps
- Cada step muestra:
  - Icono de status (info, success, warn, error) usando iconos de @hikai/ui
  - Timestamp relativo
  - Mensaje del step
  - Badge con count de tool calls si aplica
  - Plan items si el step es de tipo plan_update
- Estados visuales:
  - running: spinner + texto "Working..."
  - success: check verde + "Completed"
  - error: X rojo + mensaje de error

PARTE 3: PLAN DISPLAY

- Si el run tiene plan, mostrar mini-list:
  - [ ] pending items
  - [~] in_progress items (con spinner)
  - [x] completed items
- Colapsable si hay muchos items

PARTE 4: STYLING

- Usar tokens semanticos (text-muted-foreground, bg-muted, etc.)
- Usar Badge de @hikai/ui para tool counts
- Usar iconos de @hikai/ui (Check, X, AlertCircle, RefreshCw)
- Responsive: funciona en mobile

PARTE 5: VALIDACION

- tsc webapp sin errores
- Componente renderiza sin errores

```

**Validacion**:
- [ ] AgentProgress muestra steps en tiempo real
- [ ] Plan items visibles con estados
- [ ] Usa tokens y componentes de @hikai/ui
- [ ] Polling con backoff implementado (1s inicial, 5s max)

**Principios verificados**: Observabilidad y trazabilidad

**Pruebas funcionales**:
1. Abrir webapp con un agentRun en progreso
2. Ver steps aparecer mientras el agente trabaja
3. Ver plan items actualizarse
4. Ver estado final (success/error) cuando termina
5. Verificar en devtools que polling tiene backoff (no siempre 2s)

---

### F2.2: Integracion AgentProgress en ProductContextCard

**Objetivo**: Ver el progreso del agente directamente en la UI de contexto de producto.

**Convex**: action retorna runId, query lee estado

**Archivos**:
- `apps/webapp/src/domains/products/components/product-context-card.tsx` (modificar)
- `apps/webapp/src/routes/settings/product/$slug/context.tsx` (modificar si necesario)

**Prompt**:

```

F2.2: Integracion AgentProgress (solo smoke test)

PARTE 1: ESTADO

- Mantener agentRunId en estado local cuando se lanza el smoke test
- Obtener runId del resultado de runAgentLoopSmokeTest

PARTE 2: UI

- Mostrar AgentProgress debajo del boton del smoke test cuando hay run activo
- Ocultar cuando el run termina (despues de 3 segundos de completed)
- Mostrar error inline si el run falla

PARTE 3: UX

- Deshabilitar boton del smoke test mientras hay run activo
- Mostrar "Running..." con spinner mientras corre
- Notificacion toast cuando completa o falla

PARTE 4: VALIDACION

- tsc webapp sin errores
- Flujo completo funciona desde UI

```

**Validacion**:
- [ ] AgentProgress aparece al lanzar el smoke test
- [ ] Steps visibles durante ejecucion
- [ ] Estado final se muestra correctamente

**Principios verificados**: Observabilidad, Agent Loop (visible en UI)

**Pruebas funcionales**:
1. Ir a Settings > Product > Context
2. Click en "Lanzar agent smoke test"
3. Ver AgentProgress aparecer con steps
4. Ver plan items si el agente los crea
5. Ver mensaje de completado o error al final
6. **Verificar empiricamente**: Hay multiples steps? (principio Agent Loop)
7. **Verificar empiricamente**: Hay tool calls con datos reales? (principio Tools)

---

### F3.0: Skill domain-map-agent

**Objetivo**: Crear skill especializado para el Domain Map Agent con taxonomia y reglas claras.

**Convex**: N/A (skill es archivo markdown, no codigo Convex)

**Archivos**:
- `packages/convex/convex/agents/skills/source/domain-map-agent.skill.md` (crear)
- `packages/convex/convex/agents/skills/index.ts` (actualizar registry)

**Prompt**:

```

F3.0: Skill domain-map-agent

PARTE 1: ESTRUCTURA DE SKILLS (regla definitiva)

- Skills legacy: skills/\*.skill.md (NO mover, mantener donde están)
- Skills nuevos: skills/source/\*.skill.md
- Registry: skills/index.ts importa ambos
- Workflow:
  1. Crear skill en source/domain-map-agent.skill.md
  2. Registrar en index.ts con nombre y contenido
  3. Runtime usa index.ts (no lee archivos .md directamente)

PARTE 2: FRONTMATTER

- name: domain-map-agent
- version: v1.0
- description: Autonomous agent that builds a product domain map from evidence

PARTE 3: OBJETIVO

- Construir mapa estructurado de dominios del producto
- Basado en evidencia de sources clasificados
- En el lenguaje de la organizacion

PARTE 4: TOOLS DISPONIBLES

- Documentar cada tool y cuando usarlo:
  - read_sources: Obtener sources clasificados con surface signals
  - read_baseline: Obtener baseline del producto (name, type, value proposition)
  - read_context_inputs: Obtener UI sitemap, flows, data model extraidos
  - todo_manager: Crear y actualizar plan de ejecucion
  - validate_output: Validar output contra schema

PARTE 5: PLAN TEMPLATE

1. Gather context: read baseline + sources
2. Analyze surfaces: agrupar por tipo, contar signals
3. Map to domains: aplicar taxonomia
4. Generate layout: crear estructura de grid
5. Validate: verificar campos requeridos y evidencia

PARTE 6: TAXONOMIA (ABIERTA)

- El mapa no usa taxonomia cerrada.
- Puede incluir ejemplos habituales, pero no imponer lista fija.

PARTE 7: OUTPUT SCHEMA

- Estructura JSON esperada (segun apps/webapp/doc/agents/domain-map.md)
- Ejemplos de outputs validos

PARTE 8: REGLAS

1. SIEMPRE empezar con todo_manager para crear plan
2. Leer TODAS las sources antes de mapear
3. Usar evidencia de tools, nunca inventar
4. Validar output antes de terminar
5. Si validacion falla, corregir y reintentar
6. Preferir menos dominios con evidencia fuerte
7. Ignorar inputs de marketing, admin u observabilidad
8. Dominios agregan product_front + platform (no separar por superficie)
9. Trabajo fundacional es evidencia secundaria, no dominio dedicado salvo capacidad clara

PARTE 9: REGISTRAR EN INDEX.TS

- Añadir a SKILL_CONTENTS en skills/index.ts:
  ```ts
  export const SKILL_CONTENTS = {
  	// ... existentes
  	"domain-map-agent": `contenido del skill`,
  };
  ```
- loadSkillFromRegistry("domain-map-agent", SKILL_CONTENTS) funciona

PARTE 10: VALIDACION

- Skill source creado en source/
- Skill registrado en index.ts
- loadSkillFromRegistry parsea correctamente

```

**Documentacion a actualizar**:
- `apps/webapp/doc/agents/domain-map.md` (taxonomia abierta y reglas)

**Validacion**:
- [ ] Skill source creado en skills/source/
- [ ] Skill registrado en skills/index.ts
- [ ] Taxonomia clara y completa
- [ ] Output schema documentado
- [ ] Reglas de comportamiento explicitas

**Principios verificados**: Skills como especializacion

**Pruebas funcionales**:
1. Verificar que archivo existe en skills/source/domain-map-agent.skill.md
2. Cargar skill con loadSkillFromRegistry("domain-map-agent", SKILL_CONTENTS)
3. Verificar que parsea correctamente (frontmatter + body)
4. Verificar que injectSkill genera mensaje correcto

---

### F3.1: Tool validate_output con validators

**Objetivo**: El agente puede validar sus outputs objetivamente.

**Convex**: tool puro (sin BD), validators son funciones sync

**Archivos**:
- `packages/convex/convex/agents/core/tools/validate.ts` (crear)
- `packages/convex/convex/agents/core/validators/domain_map.ts` (crear)
- `packages/convex/convex/agents/core/validators/index.ts` (crear)

**Prompt**:

```

F3.1: Validacion de outputs

PARTE 1: TOOL validate_output

- Input: { outputType: string, data: unknown }
- Output: { valid: boolean, errors: string[], warnings: string[] }
- Mapea outputType a validator correspondiente

PARTE 2: VALIDATOR domain_map

- Campos requeridos:
  - domains (array no vacio)
  - Cada domain tiene name, kind, evidence[]
- Reglas de negocio:
  - kind in ["product", "technical", "internal"]
  - weight in [0, 1]
  - evidence[] no vacia por dominio
- Layout consistency:
  - Cada domain en layout.rows existe en domains[]

PARTE 3: NIVELES DE VALIDACION

- v1: warnings only (telemetria)
- v1.1 (F3.2.1): errores bloquean el cierre del loop
- Loggear validation results en telemetria

PARTE 4: DOCUMENTACION

- Crear apps/webapp/doc/agents/validation.md con reglas

PARTE 5: VALIDACION

- tsc convex sin errores

```

**Documentacion a crear**:
- `apps/webapp/doc/agents/validation.md`

**Validacion**:
- [ ] Tool validate_output implementado
- [ ] Validator domain_map con reglas claras
- [ ] Warnings no bloquean en v1
- [ ] Docs creados

**Principios verificados**: Verificacion y reparacion

**Pruebas funcionales**:
1. Validar domain map valido → { valid: true, errors: [], warnings: [] }
2. Validar domain map sin domains → { valid: false, errors: ["Missing domains array"] }
3. Validar domain map con domain sin evidence → warnings

---

### F3.2: Action generateDomainMap con loop completo

**Objetivo**: Action que ejecuta el Domain Map Agent autonomo.

**Convex**: action orquesta, mutation persiste domainMap, query lee estado

**Archivos**:
- `packages/convex/convex/agents/domainMap.ts` (crear)
- `packages/convex/convex/agents/domainMapData.ts` (crear)

**Prompt**:

```

F3.2: Action generateDomainMap

PARTE 1: ESTRUCTURA DE ACTIONS

- Crear action aislada en agents/domainMap.ts
- Evitar agregar acciones nuevas en agents/actions.ts (legacy)

PARTE 2: SETUP

- Args: { productId: Id<"products"> }
- Validar acceso con assertProductAccess
- Crear agentRun con useCase: "domain_map"

PARTE 3: CONFIGURACION

- Cargar skill domain-map-agent desde SKILL_CONTENTS
- Configurar tools con factories:
  - createReadSourcesTool(ctx, productId)
  - createReadBaselineTool(ctx, productId)
  - createReadContextInputsTool(ctx, productId)
  - createTodoManagerTool(ctx, runId)
  - createValidateTool()
- Config: maxTurns: 10, timeoutMs: 480000

PARTE 4: LOOP

- Ejecutar agent_loop con tools y skill
- onStep callback persiste cada step via mutation
- Capturar metricas: turns, tool_calls, tokens

PARTE 5: PERSISTENCIA (decisión)

- Parsear output JSON del agente
- Validar con validate_output (warnings only en v1)
- Persistir domain map via mutation:
  - Tabla: products
  - Campo: products.domainMap (v.optional(v.any()))
  - Añadir campo a schema si no existe
- Registrar telemetria

PARTE 6: FINALIZACION

- finishRun via mutation con status success/error
- Retornar { runId, domainMap, metrics }

PARTE 7: REGISTRO DE ACTION

- Export en agents/index.ts
- Verificar: api.agents.domainMap.generateDomainMap accesible desde webapp

PARTE 8: VALIDACION

- tsc convex sin errores
- Action ejecutable desde webapp

```

**Validacion**:
- [ ] Action en actions/domainMap.ts
- [ ] Re-exports en actions/index.ts y agents/index.ts
- [ ] api.agents.domainMap.generateDomainMap accesible desde webapp
- [ ] Action crea run y ejecuta loop
- [ ] Tools se ejecutan realmente
- [ ] Domain map persiste en products.domainMap
- [ ] Telemetria registrada

**Principios verificados**: Agent Loop, Tools, Verificacion, Criterio de finalizacion

**Pruebas funcionales (TEST DE AUTONOMIA)**:
1. Ejecutar generateDomainMap en producto con sources
2. Verificar en agentRuns:
   - [ ] Hay > 1 turn?
   - [ ] Hay tool calls con datos reales?
   - [ ] Hay step de validacion?
   - [ ] status === "success" (no "max_turns_exceeded")?
3. Verificar domain map persistido en products.domainMap:
   - [ ] Tiene domains con evidence real?
   - [ ] Evidence viene de las sources (no inventada)?

---

### F3.2.1: Loop autonomo con budget y control de output

**Objetivo**: Cerrar gap de autonomia. El modelo decide tools y reintenta hasta pasar validacion. Controlar presupuesto (turns + tokens) y recortar output a JSON valido.

**Convex**: elevar capacidades al core para reutilizar en otros agentes

**Archivos**:
- `packages/convex/convex/agents/core/agent_loop.ts` (actualizar)
- `packages/convex/convex/agents/core/tool_prompt_model.ts` (crear)
- `packages/convex/convex/agents/core/json_utils.ts` (crear)
- `packages/convex/convex/agents/domainMap.ts` (actualizar)
- `apps/webapp/src/domains/products/components/agent-progress.tsx` (actualizar)
- `apps/webapp/doc/agents/architecture.md` (actualizar)
- `apps/webapp/doc/agents/tools.md` (actualizar)
- `apps/webapp/doc/agents/validation.md` (actualizar)

**Prompt**:

```

F3.2.1: Loop autonomo con budget

PARTE 1: CORE LOOP

- Agregar maxTotalTokens al agent_loop
- Nuevo status: budget_exceeded
- Recortar output a JSON valido si hay texto extra
- Si validate_output falla, reintentar hasta pasar o agotar budget

PARTE 2: TOOL PROMPT MODEL

- Crear model wrapper que permita tool calls via JSON protocol
- El modelo decide tool_use vs final en cada turno

PARTE 3: DOMAIN MAP ACTION

- Usar el nuevo tool prompt model
- Eliminar el primer turno forzado
- El loop debe iterar hasta validar output
- Registrar step de validation por intento
- Registrar step de budget con turns/tokens/maxTokens

PARTE 4: UI

- Mostrar budget (turns/tokens) en AgentProgress
- Mostrar status budget_exceeded si aplica

PARTE 5: DOCUMENTACION

- Actualizar docs para:
  - budget_exceeded
  - reintentos por validacion
  - recorte de output a JSON

```

**Validacion**:
- [ ] El agente decide tools (no primer turno forzado)
- [ ] Hay reintentos cuando la validacion falla
- [ ] budget_exceeded existe y se reporta
- [ ] Output final es JSON valido aunque el modelo incluya texto extra

**Principios verificados**: Agent Loop, Verificacion, Criterio de finalizacion, Observabilidad

**Pruebas funcionales**:
1. Ejecutar generateDomainMap en producto con sources
2. Verificar en agentRuns:
   - [ ] Hay multiples turns con tools
   - [ ] Hay al menos un step de validacion
   - [ ] Hay step de budget con turns/tokens
3. Forzar invalid JSON (prompt alterado o inputs vacios) y confirmar:
   - [ ] El agente reintenta hasta validar
   - [ ] status != "completed" si excede budget

---

### F3.3: UI trigger y visualizacion de Domain Map

**Objetivo**: Poder generar y ver el Domain Map desde la UI.

**Convex**: action dispara agente, query lee products.domainMap

**Archivos**:
- `apps/webapp/src/domains/products/components/domain-map-card.tsx` (crear)
- `apps/webapp/src/routes/settings/product/$slug/context.tsx` (modificar)
- `apps/webapp/src/domains/products/components/product-context-card.tsx` (modificar)

**Prompt**:

```

F3.3: UI Domain Map

PARTE 1: BOTON TRIGGER

- Boton "Generate Domain Map" reemplaza el smoke test en ProductContextCard
- Disabled si hay run activo
- onClick llama a generateDomainMap action

PARTE 2: PROGRESS

- Reusar AgentProgress para mostrar progreso
- Mostrar plan del agente mientras trabaja

PARTE 3: VISUALIZACION

- Card que muestra el domain map generado
- Estructura:
  - Lista de domains con nombre, weight y evidence colapsable
- Summary section:
  - Total domains
  - Warnings si existen

PARTE 4: STYLING

- Usar Card, Badge, Progress de @hikai/ui
- Layout simple y legible

PARTE 5: VALIDACION

- tsc webapp sin errores
- UI renderiza domain map correctamente

```

**Validacion**:
- [ ] Boton trigger funciona
- [ ] AgentProgress muestra progreso
- [ ] Domain map se visualiza correctamente
- [ ] Evidence es trazable a sources

**Principios verificados**: Observabilidad (UI completa de agente autonomo)

**Pruebas funcionales (VALIDACION FINAL DE AUTONOMIA)**:
1. Ir a Settings > Product > Context
2. Click en "Generate Domain Map"
3. **Ver AgentProgress con**:
   - [ ] Plan del agente (items con status)
   - [ ] Tool calls (read_sources, read_baseline, etc.)
   - [ ] Step de validacion
4. **Ver Domain Map Card con**:
   - [ ] Dominios con evidence real de sources
   - [ ] Summary con total y warnings si aplica
5. **Verificacion empirica de principios**:
   - [ ] Agent Loop: Multiples turns visibles
   - [ ] Tools: Tool calls con datos del producto
   - [ ] Descomposicion: Plan visible con items
   - [ ] Verificacion: Step de validacion presente
   - [ ] Criterio: status "success", no "max_turns_exceeded"
   - [ ] Observabilidad: Todo visible mientras trabaja

---

### F3.3.1: Plan management aligned con learn-claude-code

**Objetivo**: El agente actualiza y ve su plan en cada turno (modelo 80%). Simplificar todo_manager y añadir nag.

**Convex**: core loop + tools + skill/prompt

**Archivos**:
- `packages/convex/convex/agents/core/tools/todo_manager.ts` (breaking change)
- `packages/convex/convex/agents/core/agent_loop.ts` (plan render + nag hook)
- `packages/convex/convex/agents/domainMap.ts` (nag logic + inject plan)
- `packages/convex/convex/agents/skills/source/domain-map-agent.skill.md` (reglas)
- `apps/webapp/doc/agents/tools.md` (contrato tool)

**Prompt**:

```

F3.3.1: Plan management

PARTE 1: TODO MANAGER (BREAKING)

- Simplificar input: { items: [...] } (reemplazo total)
- Validar max 15 items y 1 in_progress
- Actualizar description del tool

PARTE 2: PLAN VISIBLE EN CADA TURNO

- Renderizar plan en cada turn y enviarlo al modelo
- Formato tipo learn-claude-code: [x]/[>]/[ ]

PARTE 3: NAG SYSTEM

- Contar turnos sin update de plan
- Si >= 2 turnos, inyectar reminder en siguiente turno

PARTE 4: SKILL

- Reforzar reglas: create plan primero, update plan tras cada fase, validate_output antes de final

```

**Validacion**:
- [ ] todo_manager acepta solo items (sin action/itemId)
- [ ] Plan renderizado se ve en los turnos del modelo
- [ ] Plan se actualiza tras cada fase (modelo)
- [ ] Nag aparece tras 2 turnos sin plan update
- [ ] validate_output usado antes de output final

**Principios verificados**: Descomposicion, Observabilidad

**Pruebas funcionales**:
1. Ejecutar generateDomainMap
2. Ver plan renderizado en outputs del modelo
3. Ver plan avanzar (update/complete) tras fases
4. Forzar 2 turnos sin update → ver reminder inyectado

---

### F4.0: Subagentes (delegate tool)

**Objetivo**: Un agente puede delegar subtareas a agentes especializados.

**Convex**: action ejecuta subagente, mutation persiste sub-run con parentRunId

**Archivos**:
- `packages/convex/convex/agents/core/tools/delegate.ts` (crear)
- `packages/convex/convex/agents/core/agent_entrypoints.ts` (crear)

**Prompt**:

```

F4.0: Subagentes

PARTE 1: AGENT ENTRYPOINTS

- Registry de agentes invocables como subagentes
- Cada entry tiene:
  - name: string
  - skill: SkillDefinition
  - defaultConfig: AgentConfig
- Entrypoints iniciales:
  - surface_classifier
  - feature_extractor

PARTE 2: DELEGATE TOOL

- Input: { agentType: string, task: string, context?: unknown }
- Ejecuta agente hijo con:
  - Contexto acotado (solo lo necesario)
  - maxTurns reducido (5 max)
  - Timeout propio
- Retorna resultado del subagente

PARTE 3: AISLAMIENTO

- Subagente tiene su propio runId (sub-run)
- Sub-run linked al parent run
- Sub-run visible en AgentProgress (nested)

PARTE 4: DOCUMENTACION

- Actualizar apps/webapp/doc/agents/architecture.md con diagrama de subagentes

PARTE 5: VALIDACION

- tsc convex sin errores
- Test de delegacion funciona

```

**Documentacion a actualizar**:
- `apps/webapp/doc/agents/architecture.md`

**Validacion**:
- [ ] delegate tool implementado
- [ ] Agent entrypoints registry creado
- [ ] Sub-runs visibles en AgentProgress
- [ ] Docs actualizados

**Principios verificados**: Subagentes como capacidad base

**Pruebas funcionales**:
1. Ejecutar agente que use delegate
2. Ver sub-run creado y linked al parent
3. Ver sub-run en AgentProgress (nested)
4. Verificar que resultado del subagente se usa en agente padre

---

## Estructura de documentacion

Al finalizar, `apps/webapp/doc/agents/` deberia contener:

```

agents/
├── tools.md # Contratos de tools (F0.0, F1.0, F2.0)
├── domain-map.md # Schema y taxonomia (F0.0, F3.0)
├── validation.md # Reglas de validacion (F3.1)
└── architecture.md # Diagrama de flujo y subagentes (F1.1, F4.0)

```

**Formato de cada doc**:
- Titulo + descripcion de 1 linea
- Tablas para contratos (input/output)
- Ejemplos JSON minimos
- Diagramas ASCII o mermaid si aplica
- Sin prosa innecesaria

---

## Checklist final de autonomia

Antes de considerar el refactor completo, verificar:

### Infraestructura
- [ ] `maxTurns > 1` funciona en agent_loop
- [ ] Al menos 5 tools con execute() implementado
- [ ] TodoManager expuesto como tool
- [ ] Validators implementados y conectados

### Observabilidad
- [ ] Cada turn persiste en agentRuns.steps
- [ ] Tool calls loggeadas con input/output
- [ ] Plan visible en UI durante ejecucion
- [ ] Metricas por turn (no solo total)

### Comportamiento
- [ ] Agente puede completar tarea en 1 turn si es simple
- [ ] Agente usa tools cuando necesita informacion
- [ ] Agente itera si validacion falla
- [ ] Agente termina con status "success" (no "max_turns_exceeded")

### Test de autonomia final
Ejecutar Domain Map Agent con:
1. Input incompleto que necesite fetch de datos
2. Primer output con errores de validacion

Verificar que el agente:
- [ ] Llama tools para obtener datos
- [ ] Recibe error de validacion
- [ ] Corrige y reintenta
- [ ] Termina con output valido

**Si pasa este test, el agente es autonomo. Si falla en cualquier paso, es un wrapper de LLM.**

---

# Fin del documento
```

### F5.0: Eliminar flujos legacy de skills

**Objetivo**: Eliminar el uso de skills legacy y migrar a los nuevos skills source.

**Prompt**:

```
F5.0: Eliminar flujos legacy

PARTE 1: INVENTARIO
- Listar skills legacy en skills/*.skill.md
- Identificar usages en agents/taxonomy/*

PARTE 2: MIGRACION
- Migrar acciones y agentes al nuevo skill domain-map-agent
- Eliminar referencias a domain-taxonomy y feature-extraction en runtime

PARTE 3: CLEANUP
- Deprecar skills legacy no usados
- Actualizar registry skills/index.ts

PARTE 4: VALIDACION
- tsc convex sin errores
- Flujo de dominio usa solo skills nuevos
```

**Validacion**:
- [ ] No hay referencias a skills legacy en agents/taxonomy
- [ ] SKILL_CONTENTS solo expone skills nuevos para el domain map
- [ ] Agents usan domain-map-agent
