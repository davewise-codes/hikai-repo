# Hikai Agents - Planteamiento

Arquitectura de agentes autónomos para trabajo de producto.
Basada en el repo: https://github.com/shareAI-lab/learn-claude-code

## Contexto y punto de partida

Hikai nace como un hub de agregación de datos de producto.
Hoy ya somos capaces de conectar múltiples fuentes (GitHub, Linear, docs, feedback, etc.) y mapear cada fuente a distintas superficies de producto, entendiendo qué información aporta cada una y para qué tipo de análisis o decisión es relevante.

Este primer paso resuelve el input problem:

- tener los datos de producto accesibles, normalizados y contextualizados.

El siguiente paso —el crítico— es resolver el reasoning problem:
cómo convertir esos datos en conocimiento accionable de forma fiable, repetible y escalable.

Ahí es donde entra la arquitectura de agentes autónomos.

## Visión: agentes, no prompts

En lugar de pedirle a un modelo que “infiera cosas” en un único prompt, Hikai adopta un modelo de agentes autónomos inspirados en el repo de referencia que estamos tomando como base.

Un agente en Hikai no es:

- un prompt largo
- una llamada aislada a un modelo de chat

Un agente es un proceso autónomo que:

- recibe un objetivo claro
- descompone el problema en subtareas
- itera hasta cumplir criterios de aceptación
- usa herramientas explícitas
- puede invocar otros agentes especializados
- mantiene estado y memoria entre iteraciones

La autonomía no es “creatividad sin control”, sino capacidad de iterar y corregirse dentro de unos límites bien definidos.

## Principios de los agentes en Hikai

Todos los agentes de Hikai se regirán por los mismos principios:

1. Agent Loop

Cada agente funciona como un loop controlado:

- decide el siguiente paso
- ejecuta acciones (tools)
- evalúa resultados
- corrige o avanza
- termina solo cuando se cumplen criterios explícitos

No hay “respuesta final” sin verificación.

2. Tools como interfaz con la realidad

- Los agentes no inventan inputs.
- Interactúan con el sistema exclusivamente mediante tools bien definidas, por ejemplo:
  - leer datos de GitHub o Linear
  - escribir artefactos JSON
  - validar outputs
  - consultar estado previo

Las tools son deterministas, tipadas y trazables.
Cada tool debe corresponder a una intención de dominio clara (evitar tools genéricas tipo `read_anything`).

3. Skills como especialización

Cada agente opera bajo un skill:

- define su objetivo
- limita las tools que puede usar
- fija el formato de output esperado
- encapsula conocimiento experto reutilizable

Los skills son versionables y composables.

4. Descomposición autónoma

Ante tareas complejas, el agente:

- divide el problema en partes más pequeñas
- puede delegar subtareas en otros agentes
- coordina resultados parciales

Este patrón es clave para escalar complejidad sin aumentar fragilidad.

5. Verificación y reparación

Un agente no “cree” que ha terminado:
lo sabe porque sus outputs pasan validadores objetivos (schema, cobertura, trazabilidad, consistencia).

Si falla:

- recibe errores concretos
- repara el output
- vuelve a validar

Este ciclo es la base del determinismo.

6. Criterio de finalización

Un agente no termina cuando “cree” que ha terminado,
sino cuando cumple criterios objetivos de aceptación definidos por el sistema.

7. Subagentes como capacidad base

Cada agente debe ser invocable como subagente. Todo agente expone un entrypoint estándar que permite delegación, composición y aislamiento de contexto.

## Observabilidad y trazabilidad de los agentes

Uno de los principios fundamentales de esta iniciativa es que los agentes de Hikai no operen como una “caja negra”.
La trazabilidad no es un añadido técnico, sino una propiedad inherente de cómo entendemos un agente autónomo.

En Hikai, un agente no solo entrega un resultado, sino que reporta de forma explícita y continua qué está haciendo, por qué lo hace y qué decisiones va tomando a lo largo del proceso.

### Estado del agente vs. artefactos

Para evitar confusiones entre "el agente" y "su output", distinguimos:

**Estado del agente**:

- plan, memoria, turn actual, decisiones

**Artefactos de dominio**:

- `domain-map.json`, `feature-list.json`, etc.

Esta separación facilita encadenar agentes, comparar runs y re-ejecutar con nuevos datos sin mezclar ejecución con resultado.

### Qué queremos

Queremos agentes que:

- Expongan su progreso en tiempo real, permitiendo entender en qué punto del trabajo se encuentran.
- Reporten sus decisiones y acciones, incluyendo:
  - cómo descomponen una tarea compleja,
  - qué herramientas utilizan,
  - cuándo detectan que un resultado no es suficiente,
  - y por qué deciden iterar o corregir.
- Sean auditables y reproducibles, de modo que podamos analizar ejecuciones pasadas, detectar patrones de error y mejorar los skills de forma sistemática.
- Generen confianza, tanto a nivel interno como de cara al usuario, al hacer visible el proceso que conduce a un resultado.
- Permitan intervención y control, como pausar, cancelar o inspeccionar agentes mientras están en ejecución.

La trazabilidad es, por tanto, una salida de primer nivel del agente, no un log técnico ni un efecto colateral del sistema.

### Qué no queremos

Explícitamente no buscamos:

- Exponer el razonamiento interno del modelo o su chain-of-thought.
- La trazabilidad no consiste en “mostrar cómo piensa el modelo”, sino en reportar acciones y decisiones operativas.
- Agentes que solo devuelvan un resultado final sin contexto sobre cómo se ha llegado a él.
- Logs técnicos difíciles de interpretar que solo sirvan para debugging.
- Sistemas donde el comportamiento del agente sea imposible de explicar, comparar o mejorar de forma estructurada.
- “Magia opaca” que funcione a veces bien y a veces mal sin una forma clara de entender por qué.

### Mitigaciones propuestas

- **Acceso y límites**: todas las tools y actions deben iniciar con `assertOrgAccess` o `assertProductAccess` y aplicar límites de plan antes de cualquier llamada a conectores.
- **Privacidad y tamaño**: loggear outputs de tools con política híbrida (inline < 10KB, storage si es mayor) para trazabilidad sin sobrecargar `agentRuns`.
- **Reproducibilidad**: registrar snapshots/IDs de fuentes consultadas para auditoría sin depender del estado actual de las integraciones.

### Por qué es clave para Hikai

Este enfoque es especialmente relevante porque Hikai trabaja sobre datos reales de producto y genera artefactos que influyen en decisiones estratégicas.

La trazabilidad permite:

- Validar no solo el resultado, sino el proceso.
- Construir agentes más autónomos sin perder control.
- Evolucionar de forma incremental hacia tareas más complejas sin aumentar el riesgo.
- Diferenciar Hikai de enfoques basados únicamente en prompts o respuestas aisladas de IA.
- En Hikai, un agente fiable no es el que “acierta”, sino el que puede explicar qué ha hecho y demostrar que ha cumplido los criterios definidos.

## Primer agente: Product Domain Map

La primera tarea que implementamos bajo este modelo es la generación de un Mapa de Dominios de Producto.

### Objetivo

Construir un mapa estructurado que represente:

los dominios reales del producto
sus capacidades principales
su trazabilidad a datos reales (GitHub, Linear)
en el lenguaje que utiliza la organización dueña de ese producto

No es un ejercicio teórico, sino un reflejo de:

“qué está pasando realmente en el producto”.

### Output

Un JSON estructurado, simple y accionable, que pueda:

- alimentar visualizaciones
- servir como base para decisiones de producto
- evolucionar hacia análisis más avanzados (roadmap, ownership, gaps)

## Propuesta de arquitectura técnica (alto nivel)

Componentes principales

1. Convex (backend central)

Source of truth

Persistencia de:

- ejecuciones de agentes
- estado y memoria
- artefactos generados (JSON)

Orquestación de iteraciones (tick-based)

2. Hub de conectores (gestionado en convex, como hasta ahora)

Integraciones con GitHub, Linear, etc.

- Normalización de datos en “Product Facts”
- Aislamiento del ruido de las fuentes

3. Agent Runtime (server-side)

Implementado como loops iterativos

- Ejecuta decisiones del agente
- Invoca tools
- Valida outputs
- Persiste progreso

No dependemos de filesystem persistente:
el estado vive en Convex; el loop vive en el servidor.

Nota de separación de responsabilidades:

- **Convex**: loop, tools, validators, skills, runs, storage y acceso a datos.
- **Webapp**: UI para disparar runs, mostrar progreso y resultados (sin lógica de agente).

## Arquitectura del repo (resultante)

Diagrama de folders y responsabilidades clave tras el refactor de agentes.

```
apps/
  webapp/
    domains/
      products/
        components/
          agent-progress.tsx          # UI: progreso en tiempo real de agentRuns
          product-context-card.tsx    # UI: dispara runs y muestra contexto
    routes/
      settings/
        product/
          $slug/
            context.tsx               # UI: vista principal de contexto
packages/
  convex/
    convex/
      agents/                         # Lógica de agentes (backend)
        core/
          agent_loop.ts               # Loop de ejecución de agentes
          tool_registry.ts            # Registro/lookup de tools disponibles
          plan_manager.ts             # Planificación y estado de tareas
          skill_loader.ts             # Carga y parsing de skills
          agent_entrypoints.ts        # Registry de entrypoints para invocar subagentes
          validators/
            domain_map.ts             # Validación objetiva de Domain Map
          tools/
            github_list_files.ts      # Tool: listar archivos del repo
            github_read_file.ts       # Tool: leer archivo del repo
            github_search_code.ts     # Tool: buscar patrones en codigo
            todo_manager.ts           # Tool: plan/todo tracking
            validate.ts               # Tool: validación de outputs
        skills/
          domain-map-agent.md         # Skill: dominio y reglas del agente
        agentRuns.ts                  # Persistencia de runs y steps
        contextTools.ts               # Helpers para contexto de producto
        actions.ts                    # Actions: entrypoints (generateDomainMap)
      lib/
        planLimits.ts                 # Límite de planes y guardrails
```

Componentes de la arquitectura actual que desaparecen o se absorben:

- **Wrappers single-shot** (p. ej. `productContextAgent`, `timelineContextInterpreterAgent`) se reemplazan por loops autónomos con tools + validación para evitar ejecuciones de un solo turno.
- **Tools stub** (`createStubTool()` sin `execute`) se sustituyen por tools ejecutables con queries/mutations reales.
- **Ejecución sin plan/observabilidad** se reemplaza por `todo_manager` + `agentRuns.steps` + UI de progreso para trazabilidad útil.

## Por qué este enfoque

Este modelo responde a problemas reales que ya hemos visto:

❌ Inferencias inconsistentes
❌ Resultados “a veces buenos, a veces no”
❌ Dificultad para aumentar determinismo sin perder calidad

La arquitectura de agentes permite:

- aumentar fiabilidad sin rigidizar el sistema
- iterar hasta calidad aceptable
- convertir razonamiento en proceso, no en suerte
- escalar a tareas más complejas sin rehacer la base

## Qué desbloquea a futuro

Una vez establecido este patrón:

- nuevos agentes reutilizan la misma arquitectura
- los skills se convierten en activos de producto
- los agentes pueden encadenarse (mapa de dominios → gaps → roadmap → ownership)

el sistema aprende a trabajar con producto, no solo a describirlo

Hikai no es “IA que responde”.
Es una plataforma donde agentes trabajan.

Diseñamos el sistema para permitir replay completo de ejecuciones a futuro (paso a paso y comparaciones entre runs).

---

# Hikai Agents - Consideraciones

Esta sección describe las diferencias entre este planteamiento y la implementación actual de Hikai e intenta profundizar en las diferencias clave y por qué los "agentes" actuales no actúan de manera autónoma y qué podemos accionar para que sí lo sean. También cuáles deben ser las comprobaciones clave antes de implementar el primer agente para corroborar que estos funcionan con autonomía.

## Diagnóstico: Estado actual vs. Arquitectura propuesta

### Lo que tenemos

| Componente         | Existe | Funciona como agente                       |
| ------------------ | ------ | ------------------------------------------ |
| `agent_loop.ts`    | ✅     | ❌ (`maxTurns: 1` en todos los usos)       |
| `tool_registry.ts` | ✅     | ❌ (`createStubTool()` sin implementación) |
| `skill_loader.ts`  | ✅     | ✅ (skills .md cargados y usados)          |
| `plan_manager.ts`  | ✅     | ❌ (no expuesto como tool al agente)       |
| Subagentes (Task)  | ❌     | —                                          |
| Tools ejecutables  | ❌     | —                                          |

### Lo que dicen ser agentes, pero no lo son

Los "agentes" actuales (`productContextAgent`, `timelineContextInterpreterAgent`, etc.) son **wrappers de una llamada LLM**:

```
Input → LLM.generateText() → Parse JSON → Persistir
```

No hay:

- Loop de iteración
- Ejecución de tools
- Verificación de outputs
- Capacidad de corrección
- Descomposición de tareas

### El patrón de referencia (learn-claude-code)

```python
while True:
    response = model(messages, tools)
    if response.stop_reason != "tool_use":
        return response.text
    results = execute(response.tool_calls)
    messages.append(results)
```

Diferencia fundamental: **el modelo decide cuándo terminar**, no el código.
El modelo decide dentro de un marco controlado por el sistema (límites, validación y persistencia).

## Contrastes críticos

| Aspecto          | Referencia                          | Hikai actual                |
| ---------------- | ----------------------------------- | --------------------------- |
| **Iteración**    | Loop infinito hasta `end`           | `maxTurns: 1` (single-shot) |
| **Tools**        | bash, read, write, edit ejecutables | Stubs sin implementación    |
| **Terminación**  | Modelo decide (stop_reason)         | Código fuerza (1 turn)      |
| **Verificación** | Iteración permite reintentos        | Si falla parse, falla todo  |
| **Plan/Todo**    | Tool que el agente invoca           | Existe pero es externo      |
| **Subagentes**   | Task tool crea agentes hijos        | No existe                   |
| **Contexto**     | Acumulativo entre turns             | Una llamada, sin memoria    |

## Por qué los "agentes" actuales no son autónomos

1. **No toman decisiones de continuidad**: El código les impone `maxTurns: 1`, nunca pueden decidir "necesito más información".

2. **No interactúan con el sistema**: `tool_registry.ts` define tools (`read_file`, `glob`, `grep`) pero `createStubTool()` devuelve objetos vacíos sin `execute`.

3. **No pueden verificar sus outputs**: Sin iteración, si el JSON es inválido, la ejecución falla. No hay oportunidad de reparación.

4. **No descomponen tareas**: Sin TodoManager como tool, no pueden planificar ni trackear subtareas.

5. **Son deterministas por imposición, no por diseño**: La "determinismo" actual es porque no hay alternativa, no porque el sistema valide resultados.

## Qué debe cambiar

### 1. Habilitar iteración real

```diff
- maxTurns: 1
+ maxTurns: 10  // o más, según complejidad
```

El modelo debe poder pedir más información, reintentar, y decidir cuándo ha terminado.

Mitigaciones:

- **Timeout y budget**: `maxTurns: 10` con `timeoutMs: 8 * 60 * 1000` para cubrir ~5 min de ejecución y margen operativo.
- **Degradación**: para tareas largas, usar chunking o subagentes (Fase 4) en lugar de incrementar turnos indefinidamente.
- **Guardrail**: `maxTurns` es un límite de seguridad, no una política; la completitud la define la validación.

### 2. Implementar tools ejecutables

Las tools deben hacer algo real. En contexto Convex (sin filesystem):

| Tool               | Implementación Hikai                    |
| ------------------ | --------------------------------------- |
| `read_data`        | Query a BD (eventos, contexto, sources) |
| `validate_output`  | Schema validation + reglas de negocio   |
| `persist_artifact` | Mutation para guardar resultado parcial |
| `query_sources`    | Fetch de conectores (GitHub, Linear)    |
| `delegate`         | Invocar otro agente especializado       |

### 3. Exponer TodoManager como tool

El agente debe poder:

- Crear plan de trabajo
- Marcar pasos completados
- Añadir subtareas descubiertas

Esto también habilita **trazabilidad en tiempo real**.

Mitigaciones:

- **Guardrails**: si el agente no invoca `todo_manager` en el primer turno, el loop debe generar un plan inicial por defecto y persistirlo.

### 4. Implementar verificación objetiva

```typescript
const validators = {
	schema: (output) => validateAgainstSchema(output, expectedSchema),
	coverage: (output) => checkRequiredFields(output),
	consistency: (output) => crossReferenceWithSources(output),
};
```

Si falla validación → el agente recibe el error y puede corregir (porque tiene múltiples turns).

Mitigaciones:

- **v1 best-effort**: ejecutar validación siempre, pero solo emitir warnings y loggear `validation failures` sin bloquear la salida.
- **Ruta a mandatory**: activar validación estricta cuando el failure rate sea < 10%.
- **Evolución**: en v1 la validación informa; en v2 la validación gobierna.

### 5. Mecanismo de subagentes (opcional para v1)

```typescript
tools: [
	{
		name: "delegate",
		execute: async ({ agentType, task }) => {
			return await executeAgentLoop(
				subAgents[agentType],
				{ maxTurns: 5 },
				task,
			);
		},
	},
];
```

## Checklist antes de implementar primer agente autónomo

### Infraestructura

- [ ] `maxTurns > 1` funciona correctamente en `agent_loop.ts`
- [ ] Al menos 3 tools con `execute` implementado
- [ ] TodoManager expuesto como tool del agente
- [ ] Validators implementados y conectados al loop

### Observabilidad

- [ ] Cada turn persiste en `agentRuns.steps[]`
- [ ] Tool calls logeadas con input/output
- [ ] Plan visible en UI durante ejecución
- [ ] Métricas de tokens por turn (no solo total)

Mitigaciones:

- **Tokens por turn**: si el proveedor no devuelve métricas por turn, almacenar estimaciones basadas en input/output size.

### Comportamiento

- [ ] Agente puede completar tarea en 1 turn si es simple
- [ ] Agente usa tools cuando necesita más información
- [ ] Agente itera si validación falla
- [ ] Agente termina con `stop_reason: end` (no `max_turns_exceeded`)

### Test de autonomía

Ejecutar el agente con una tarea que **requiera iteración**:

1. Input incompleto que necesite fetch de datos
2. Primer output con errores de validación
3. Verificar que el agente:
   - Llama tool para obtener datos
   - Recibe error de validación
   - Corrige y reintenta
   - Termina con output válido

Si pasa este test, el agente es autónomo. Si falla en cualquier paso, es un wrapper de LLM.

## Filosofía clave de la referencia

> "El modelo es el 80%. El código es el 20%."

El trabajo del código es:

- Dar tools útiles
- No interferir
- Persistir estado
- Observar sin bloquear

El trabajo del modelo es:

- Razonar
- Decidir qué hacer
- Saber cuándo parar
- Usar tools correctamente

Actualmente Hikai invierte esto: el código hace todo el trabajo (orquestación, decisiones, terminación) y el modelo solo "rellena huecos" en un template.

---

# Plan de Ejecución: Domain Map Agent

Implementación incremental del primer agente autónomo. Cada fase es testeable desde el UI de Hikai.

Cada fase debe:

- ser incremental
- tener un test funcional desde UI
- verificar al menos un principio clave (loop, tools, skills, validación, trazabilidad, subagentes)

## Inventario: Qué existe y qué falta

### ✅ Reutilizable (existe y funciona)

| Componente        | Ubicación                                   | Uso                                                               |
| ----------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| `agent_loop.ts`   | `agents/core/`                              | Motor de iteración (solo necesita `maxTurns > 1`)                 |
| `skill_loader.ts` | `agents/core/`                              | Carga skills .md                                                  |
| `plan_manager.ts` | `agents/core/`                              | Gestión de planes (falta exponer como tool)                       |
| Skills existentes | `agents/skills/`                            | `surface-classification`, `domain-taxonomy`, `feature-extraction` |
| Queries de datos  | `agents/*Data.ts`                           | `listSourceContexts`, `getProductWithContext`, etc.               |
| Context tools     | `agents/contextTools.ts`                    | `getUiSitemap`, `getBusinessDataModel`, `getRepoFolderTopology`   |
| UI de contexto    | `routes/settings/product/$slug/context.tsx` | `ProductContextCard`                                              |
| Telemetría        | `ai/telemetry.ts`                           | `recordUsage`, `recordError`, `recordInferenceLog`                |
| Runs tracking     | `agents/agentRuns.ts`                       | `createAgentRun`, `appendStep`, `finishRun`                       |

### ❌ Falta crear

| Componente              | Propósito                                      |
| ----------------------- | ---------------------------------------------- |
| Tools ejecutables       | Implementar `execute()` para queries/mutations |
| Tool: TodoManager       | Exponer plan_manager como tool del agente      |
| Tool: Validate          | Validación de outputs contra schema            |
| Validators              | Funciones de validación objetiva               |
| UI: Agent Progress      | Vista de steps en tiempo real                  |
| Skill: domain-map-agent | Skill completo para el agente                  |

---

## Fase 1: Tools Ejecutables

**Objetivo**: El agente puede leer datos reales del sistema.

### 1.1 Implementar tools core

```typescript
// agents/core/tools/github_list_files.ts
export const listFilesTool: ToolDefinition = {
	name: "list_files",
	description: "List files in the connected GitHub repo",
	execute: async (input: { path?: string; pattern?: string; limit?: number }) => {
		return await listFilesFromGithub(input);
	},
};
```

**Tools a implementar (Fase 1)**:

| Tool          | Fuente | Input                               |
| ------------- | ------ | ----------------------------------- |
| `list_files`  | GitHub | `{ path?, pattern?, limit? }`       |
| `read_file`   | GitHub | `{ path }`                          |
| `search_code` | GitHub | `{ query, filePattern?, limit? }`   |

### 1.2 Conectar tools al loop

```diff
// agents/core/tool_registry.ts
- const createStubTool = (name: ToolName): ToolDefinition => ({ name });
+ import { listFilesTool, readFileTool, searchCodeTool } from "./tools";
+
+ const TOOL_IMPLEMENTATIONS: Partial<Record<ToolName, ToolDefinition>> = {
+   list_files: listFilesTool,
+   read_file: readFileTool,
+   search_code: searchCodeTool,
+ };
```

### 1.3 Aumentar maxTurns para test

```diff
// agents/taxonomy/domain_mapper.ts
  maxTurns: 1,
+ maxTurns: 5,  // Permitir iteración
```

### 1.4 Test desde UI

- Ir a Settings > Product > Context
- Ejecutar "Refresh context"
- Verificar en logs que el agente usa tools (no solo genera texto)

**Criterio de éxito**: El agente hace al menos 1 tool call antes de responder.

Mitigaciones:

- **Paginación**: cada tool debe exponer límites (p. ej. `limit`, `cursor`) para evitar outputs masivos.
- **Acceso**: las tools deben validar `assertOrgAccess` o `assertProductAccess` y plan limits antes de ejecutar queries.

Principios verificados en esta fase:

- Tools como interfaz con la realidad
- Trazabilidad de acciones (tool calls registradas)

---

## Fase 2: TodoManager + Observabilidad

**Objetivo**: El agente planifica su trabajo y es observable.

### 2.1 Exponer TodoManager como tool

```typescript
// agents/core/tools/todo_manager.ts
export const todoManagerTool: ToolDefinition = {
	name: "todo_manager",
	description: "Create and update execution plan",
	execute: async (input: {
		action: "create" | "update" | "complete";
		items?: PlanItem[];
		itemId?: string;
	}) => {
		switch (input.action) {
			case "create":
				return createPlan(input.items ?? []);
			case "update":
				return updatePlan(currentPlan, input.items ?? []);
			case "complete":
				return markComplete(currentPlan, input.itemId!);
		}
	},
};
```

### 2.2 Persistir steps en agentRuns

```typescript
// En agent_loop.ts, dentro del while loop
if (config.onStep) {
	await config.onStep({
		turn,
		toolCalls: response.toolCalls,
		results,
		plan: currentPlan, // Incluir estado del plan
	});
}
```

Mitigaciones:

- **Outputs grandes**: persistir outputs de tools inline solo si < 10KB; si no, guardar en storage y referenciar.
- **Reducción de payloads**: guardar solo inputs/outputs necesarios para trazabilidad, no el payload completo si no aporta valor.

### 2.3 UI: Agent Progress Component

```typescript
// domains/products/components/agent-progress.tsx
export function AgentProgress({ runId }: { runId: Id<"agentRuns"> }) {
  const run = useQuery(api.agents.agentRuns.getRunById, { runId });

  return (
    <div className="space-y-2">
      {run?.steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <StatusIcon status={step.status} />
          <span>{step.step}</span>
          {step.metadata?.toolCalls && (
            <Badge variant="outline">{step.metadata.toolCalls.length} tools</Badge>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 2.4 Integrar en ProductContextCard

```diff
// domains/products/components/product-context-card.tsx
+ {agentRunId && <AgentProgress runId={agentRunId} />}
```

### 2.5 Test desde UI

- Ejecutar refresh de contexto
- Ver plan de trabajo del agente en tiempo real
- Verificar que steps aparecen progresivamente

**Criterio de éxito**: Puedo ver qué está haciendo el agente mientras trabaja.

Mitigaciones:

- **Polling controlado**: usar intervalos con backoff para evitar exceso de queries en runs largos.
- **Señal sobre ruido**: mostrar plan, uso de tools relevante y validación/corrección; evitar micro-steps internos.

Principios verificados en esta fase:

- Descomposición autónoma (plan visible)
- Observabilidad y trazabilidad operativa

---

## Fase 3: Domain Map Agent

**Objetivo**: Agente autónomo que genera mapa de dominios con verificación.

### 3.1 Skill: domain-map-agent

```markdown
---
name: domain-map-agent
version: v1.0
description: Autonomous agent that builds a product domain map from evidence.
---

## Objective

Build a structured domain map for a product by:

1. Reading classified sources
2. Analyzing surface buckets
3. Mapping surfaces to functional domains
4. Generating visual domain layout

## Available Tools

- `list_files`: List repo structure to locate key areas
- `read_file`: Read specific files for evidence
- `search_code`: Find patterns and features in code
- `todo_manager`: Create and update execution plan
- `validate_output`: Validate output against schema

## Execution Plan Template

1. Gather context: read baseline + sources
2. Analyze surfaces: group by surface type, count signals
3. Map to domains: apply taxonomy rules
4. Generate layout: create grid structure
5. Validate: check required fields and evidence

## Domain Taxonomy

Product domains (require product_front or platform evidence):

- Core Experience: Main user-facing functionality
- Data Management: CRUD, storage, sync
- Automation: Workflows, AI features
- Analytics: Dashboards, reports, metrics
- Collaboration: Sharing, permissions, teams

Technical domains:

- Platform: Auth, API, infra

Internal domains:

- Marketing: Landing, campaigns
- Docs: Help, guides

## Output Schema

{
"domains": [
{
"name": "Core Experience",
"kind": "product" | "technical" | "internal",
"weight": 0.0-1.0,
"surfaces": ["product_front"],
"evidence": ["route: /dashboard", "entity: projects"]
}
],
"layout": {
"columns": ["product", "technical", "internal"],
"rows": [
{ "domain": "Core Experience", "column": "product", "row": 0 }
]
},
"summary": {
"totalDomains": 4,
"productDomains": 2,
"confidence": "high" | "medium" | "low",
"warnings": []
}
}

## Rules

1. ALWAYS start with todo_manager to create plan
2. Read ALL available sources before mapping
3. Use evidence from tools, never invent
4. Validate output before finishing
5. If validation fails, fix and retry
6. Prefer fewer domains with strong evidence over many with weak
```

### 3.2 Validator implementation

```typescript
// agents/core/validators/domain_map.ts
export function validateDomainMap(output: unknown): ValidationResult {
	const errors: string[] = [];

	if (!output || typeof output !== "object") {
		return { valid: false, errors: ["Output must be an object"] };
	}

	const map = output as Record<string, unknown>;

	// Required fields
	if (!Array.isArray(map.domains)) {
		errors.push("Missing 'domains' array");
	} else {
		for (const domain of map.domains) {
			if (!domain.name) errors.push("Domain missing 'name'");
			if (!domain.kind) errors.push("Domain missing 'kind'");
			if (!Array.isArray(domain.evidence) || domain.evidence.length === 0) {
				errors.push(`Domain '${domain.name}' has no evidence`);
			}
		}
	}

	// Layout consistency
	if (map.layout && map.domains) {
		const domainNames = new Set(map.domains.map((d: any) => d.name));
		for (const row of (map.layout as any).rows ?? []) {
			if (!domainNames.has(row.domain)) {
				errors.push(`Layout references unknown domain: ${row.domain}`);
			}
		}
	}

	return { valid: errors.length === 0, errors };
}
```

Mitigaciones:

- **Reglas mínimas**: validar rangos (`weight` 0..1), `kind` enum y evidencia no vacía para elevar calidad sin bloquear en v1.

### 3.3 Tool: validate_output

```typescript
// agents/core/tools/validate.ts
export const validateTool: ToolDefinition = {
	name: "validate_output",
	description: "Validate agent output against schema",
	execute: async (input: { outputType: string; data: unknown }) => {
		const validators: Record<string, (data: unknown) => ValidationResult> = {
			domain_map: validateDomainMap,
		};

		const validator = validators[input.outputType];
		if (!validator) {
			return {
				valid: false,
				errors: [`Unknown output type: ${input.outputType}`],
			};
		}

		return validator(input.data);
	},
};
```

### 3.4 Nueva action: generateDomainMap

```typescript
// agents/actions.ts
export const generateDomainMap = action({
	args: {
		productId: v.id("products"),
	},
	handler: async (ctx, { productId }) => {
		// 1. Create agent run
		const runId = await ctx.runMutation(
			internal.agents.agentRuns.createAgentRun,
			{
				useCase: "domain_map",
				agentName: "Domain Map Agent",
				productId,
				// ...
			},
		);

		// 2. Load skill
		const skill = loadSkillFromRegistry("domain-map-agent", SKILL_CONTENTS);

		// 3. Configure tools with context
		const tools = [
			createReadSourcesTool(ctx, productId),
			createReadBaselineTool(ctx, productId),
			createReadContextInputsTool(ctx, productId),
			createTodoManagerTool(ctx, runId),
			createValidateTool(),
		];

		// 4. Execute loop
		const result = await executeAgentLoop(
			model,
			{
				maxTurns: 10,
				timeoutMs: 8 * 60 * 1000,
				tools,
				onStep: async (step) => {
					await ctx.runMutation(internal.agents.agentRuns.appendStep, {
						runId,
						step: `Turn ${step.turn}`,
						status: "completed",
						timestamp: Date.now(),
						metadata: { toolCalls: step.toolCalls, results: step.results },
					});
				},
			},
			"Generate domain map for this product",
			[injectSkill(skill)],
		);

		// 5. Parse and persist
		// ...
	},
});
```

### 3.5 UI: Trigger desde ProductContextCard

```diff
// domains/products/components/product-context-card.tsx
+ <Button onClick={() => generateDomainMap({ productId: product._id })}>
+   Generate Domain Map
+ </Button>
```

### 3.6 Test de autonomía

1. Producto sin contexto previo → agente debe:
   - Crear plan (tool call)
   - Leer sources (tool call)
   - Leer baseline (tool call)
   - Generar mapa
   - Validar
   - Si falla, corregir y revalidar

2. Verificar en UI:
   - Steps visibles en tiempo real
   - Resultado con evidence real (no inventada)
   - Si hubo errores, ver corrección

**Criterio de éxito**: Agente completa con `status: completed`, no `max_turns_exceeded`, y la validación se ejecuta (aunque sea con warnings en v1).

Principios verificados en esta fase:

- Skills como especialización (skill `domain-map-agent`)
- Criterio de finalización (validación ejecutada, warnings si falla en v1)

---

## Fase 4: Refinamiento (Opcional)

### 4.1 Subagentes

```typescript
// Tool para delegar a agente especializado
export const delegateTool: ToolDefinition = {
	name: "delegate",
	description: "Delegate subtask to specialized agent",
	execute: async (input: { agentType: string; task: string }) => {
		const subAgents = {
			surface_classifier: surfaceClassifierAgent,
			feature_extractor: featureExtractorAgent,
		};
		// Execute sub-agent with isolated context
	},
};
```

Mitigaciones:

- **Entry point estándar**: cada agente debe registrarse en un `agent_entrypoints` común para ser invocable como subagente.
- **Contexto acotado**: los subagentes reciben solo el contexto necesario, no el estado completo del agente padre.

Principios verificados en esta fase:

- Subagentes como capacidad base

### 4.2 Streaming de progreso

```typescript
// WebSocket o SSE para updates en tiempo real
// En lugar de polling getRunById
```

### 4.3 Cancelación de agente

```typescript
// Tool para abortar ejecución
// UI: botón "Cancel" durante ejecución
```

---

## Resumen: Qué es reutilizable

| Componente            | Reutilizable para otros agentes                |
| --------------------- | ---------------------------------------------- |
| `agent_loop.ts`       | ✅ 100%                                        |
| Tools: read\_\*       | ✅ Cualquier agente que necesite datos         |
| Tool: todo_manager    | ✅ Cualquier agente con planificación          |
| Tool: validate_output | ✅ Añadiendo validators por tipo               |
| Skill loader          | ✅ 100%                                        |
| AgentProgress UI      | ✅ 100%                                        |
| agentRuns persistence | ✅ 100%                                        |
| Validators            | ⚠️ Parcial (cada output type necesita el suyo) |
| Skills                | ❌ Específicos por agente                      |

---

## Métricas de éxito por fase

| Fase | Métrica                                     |
| ---- | ------------------------------------------- |
| 1    | Agente hace ≥1 tool call antes de responder |
| 2    | Steps visibles en UI durante ejecución      |
| 3    | Agente completa sin `max_turns_exceeded`    |
| 4    | Subagente ejecuta y retorna resultado       |

---

## Próximos agentes (post Domain Map)

Una vez validada la arquitectura:

1. **Feature Extractor Agent**: Extrae características del mapa de dominios
2. **Changelog Agent**: Genera changelog desde eventos

Todos reutilizan: loop, tools core, todo_manager, validators, UI progress.
