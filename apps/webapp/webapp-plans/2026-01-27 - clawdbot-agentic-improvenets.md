Análisis Comparativo: Principios Agentic en Clawdbot vs Hikai

Contexto

Ambos sistemas parten de los mismos principios fundamentales documentados en learn-claude-code: el loop agentic (model → tool_use → execute → append → repeat), planning explícito y skills como conocimiento inyectado. La diferencia está en cómo cada uno escala esos
principios.

Repos de referencia:
https://github.com/shareAI-lab/learn-claude-code
https://github.com/clawdbot/clawdbot#

---

1. EL LOOP AGENTIC

Principio base (learn-claude-code):
while True:
response = model(messages, tools)
if response.stop_reason != "tool_use": return response.text
results = execute(response.tool_calls)
messages.append(results)

Hikai (core/agent_loop.ts):

- Loop clásico plan-act-validate con gates de salida
- Terminación por: final_output validado + plan completado, timeout, token budget, max turns
- Validación obligatoria antes de retornar (schema + validate_json tool)
- Si la validación falla → feedback como mensaje user → continúa el loop
- Limitación: ejecución secuencial de tools, un tool call a la vez

Clawdbot (pi-embedded-runner/run.ts):

- Loop delegado a @mariozechner/pi-coding-agent (Pi Agent Framework)
- Streaming nativo: events (text_delta, tool_use, tool_result) procesados en tiempo real
- No hay validation gate explícita - el modelo decide cuándo terminar
- Auto-compaction: si el context window se desborda, resume mensajes viejos y reintenta
- Auth failover automático: rota entre perfiles de API si uno falla

Patrones a adoptar de Clawdbot:
┌─────────────────────────┬───────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────┐
│ Patrón │ Qué hace │ Por qué importa │
├─────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ Auto-compaction │ Resumir mensajes viejos cuando context overflow │ Hikai falla con "token budget exceeded"; clawdbot se recupera │
├─────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ Thinking level fallback │ high → medium → low → off si el modelo no soporta │ Hikai hardcodea el thinking level; no tiene degradación graceful │
├─────────────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ Streaming incremental │ Emite bloques parciales mientras genera │ Hikai espera respuesta completa; peor UX en tareas largas │
└─────────────────────────┴───────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────┘

---

2. TOOL SYSTEM

Hikai (core/tool_registry.ts):

- Tools definidos como { name, description, execute } simple
- Catálogo inyectado como JSON en el prompt
- Protocol string fuerza formato {"type":"tool_use","toolCalls":[...]} — el modelo parsea y devuelve JSON raw
- Tools especializados: list_dirs, list_files, read_file, search_code, todo_manager, validate_json, delegate
- No hay tool policies — todos los tools disponibles siempre

Clawdbot (pi-tools.ts, pi-tools.policy.ts):

- Tools definidos con un sistema de policies multicapa:
  Global → Agent → Model → Profile → Group → Sandbox
- Cada capa puede allow/deny tools independientemente
- Tools adaptativos por provider (Anthropic vs OpenAI vs Google tienen diferentes schemas)
- Approval gates: algunos tools requieren confirmación del usuario antes de ejecutar
- Tools channel-specific: cada canal (Discord, Slack, etc.) agrega tools propios
- Tool profiles: conjuntos predefinidos de tools para diferentes niveles de confianza

Patrones a adoptar de Clawdbot:
┌─────────────────────────┬────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────┐
│ Patrón │ Qué hace │ Aplicación en Hikai │
├─────────────────────────┼────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ Tool policies multicapa │ Allow/deny por agente, use-case, contexto │ Diferentes scouts necesitan diferentes tools; hoy todos tienen acceso a todo │
├─────────────────────────┼────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ Approval gates │ Confirmar antes de ejecutar tools destructivos │ Para operaciones que modifiquen datos del producto │
├─────────────────────────┼────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ Tool profiles │ Conjuntos predefinidos de tools │ "explorer" (read-only), "builder" (read+write), "admin" (todo) │
└─────────────────────────┴────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────┘

---

3. PLANNING & TASK DECOMPOSITION

Hikai (core/plan_manager.ts, todo_manager tool):

- Plan obligatorio: el agent loop exige que el plan esté completado antes de aceptar final_output
- PlanManager con items: pending → in_progress → completed | blocked
- Solo 1 item in_progress a la vez
- Max 15 items por plan
- Renderizado visual: [x], [>], [ ], [!]
- Nag system: recuerda al agente actualizar el plan si no hay progreso en N turnos
- Inspirado directamente en learn-claude-code v2 (TodoManager)

Clawdbot:

- No tiene planning explícito — el modelo decide libremente qué hacer
- La "planificación" emerge del sistema de skills: el SKILL.md guía la secuencia
- Thinking/reasoning tags (<thinking>) son el equivalente implícito
- Memory search antes de actuar funciona como "planificación por recall"

Insight clave: Hikai tiene mejor planning que Clawdbot. El plan obligatorio es una fortaleza — fuerza al agente a ser metódico. Clawdbot compensa con skills más detallados y memory search, pero no garantiza ejecución ordenada.

Patrón a mantener en Hikai: El plan obligatorio es superior. Clawdbot lo confirma indirectamente: sus skills más exitosos incluyen pasos secuenciales explícitos en el markdown.

---

4. CONTEXT MANAGEMENT

Hikai:

- Cada agente es una invocación fresh (stateless)
- Context = skill prompt + tool catalog + conversation turns
- Sub-agentes via delegate tool tienen contexto aislado (learn-claude-code v3)
- Context enrichment: baseline + repo structure + glossary + domain map pasados como parámetros
- Limitación: no hay mecanismo de compaction; si el budget se agota, falla

Clawdbot:

- Sessions JSONL persistentes (append-only)
- History limiting por canal (Signal: 30 turns, Telegram: 50)
- Auto-compaction: resume por chunks cuando context overflow
- Memory search: embedding-based RAG sobre MEMORY.md (vector 70% + text 30%)
- Sub-agentes via sessions_spawn() con contexto heredado configurable

Patrones a adoptar de Clawdbot:
┌─────────────────────┬─────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────┐
│ Patrón │ Qué hace │ Aplicación en Hikai │
├─────────────────────┼─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
│ Auto-compaction │ Resume mensajes viejos preservando lo relevante │ Para agentes como domain_map que hacen 8+ turns │
├─────────────────────┼─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
│ Memory search (RAG) │ Busca en conocimiento previo antes de actuar │ Usar snapshots anteriores como "memoria" para contextualizar mejor │
├─────────────────────┼─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
│ History limiting │ Limita turns incluidos por contexto │ Configurar por tipo de agente: scouts = 5 turns, orchestrator = 15 │
└─────────────────────┴─────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────┘

---

5. SKILL SYSTEM

Hikai (skills/index.ts, core/skill_loader.ts):

- Skills como markdown con YAML frontmatter
- Compilados en SKILL_CONTENTS record (estáticos)
- Inyectados como mensaje user: <skill name="...">contenido</skill>
- 9 skills: surface-classification, domain-taxonomy, feature-extraction, etc.
- Skills especializados por dominio — cada agente tiene un skill específico

Clawdbot (skills/, agents/skills/workspace.ts):

- 54+ skills bundled + skills instalables + workspace skills
- SKILL.md con frontmatter extendido (requires, install, emoji)
- Discovery dinámico: el system prompt lista skills disponibles
- Lazy loading: el agente decide cuál leer basándose en la tarea
- Eligibility checking: verifica que las dependencias estén instaladas
- Skill marketplace: instalación desde clawdhub

Patrones a adoptar de Clawdbot:
┌────────────────────┬─────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────┐
│ Patrón │ Qué hace │ Aplicación en Hikai │
├────────────────────┼─────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Lazy skill loading │ No cargar todos los skills en el prompt; dejar que el agente elija │ Reducir tokens en el system prompt — cargar skill solo cuando el agente lo necesita │
├────────────────────┼─────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Skill eligibility │ Verificar que los prereqs estén cumplidos antes de ofrecer un skill │ Verificar que el producto tiene repo conectado antes de ofrecer structure_scout │
├────────────────────┼─────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Skill metadata │ Frontmatter con requires, install, versión │ Versionar skills para tracking de cambios en outputs │
└────────────────────┴─────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────┘

---

6. MULTI-AGENT COORDINATION

Hikai (contextAgent.ts):

- Orquestación explícita en código:
  Phase 1 (parallel): Structure + Glossary → Promise.allSettled
  Phase 2 (sequential): Domain Map (usa output de Phase 1)
  Phase 3 (sequential): Features (usa output de Phase 2)
- Dependencias hardcodeadas en el orchestrator
- Delegation via ctx.runAction() (Convex actions)
- Parent-child tracking via parentRunId

Clawdbot:

- No hay orquestación explícita entre agentes
- Sub-agentes via sessions_spawn() — el agente padre decide cuándo y qué delegar
- El modelo decide la coordinación (tool-driven delegation)
- Lane-based queuing previene race conditions
- Gateway routing: mensajes ruteados a agentes por sesión/grupo/canal

Insight: Hikai tiene orquestación más robusta y predecible. Clawdbot depende del modelo para coordinar, lo cual es más flexible pero menos confiable.

Patrón a explorar de Clawdbot:
┌─────────────────────────┬──────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Patrón │ Qué hace │ Aplicación en Hikai │
├─────────────────────────┼──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Lane-based queuing │ Serializa operaciones por sesión │ Para evitar race conditions cuando múltiples usuarios lanzan agents sobre el mismo producto │
├─────────────────────────┼──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Model-driven delegation │ El agente decide a quién delegar │ Complementar la orquestación hardcodeada con un modo "libre" donde el context agent decida qué scouts lanzar │
└─────────────────────────┴──────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

7. ERROR HANDLING & RECOVERY

Hikai:

- Try/catch por fase en contextAgent
- Status tracking: completed | partial | failed
- Snapshot reuse si no es stale (evita re-ejecución innecesaria)
- Timeout guards: skip fase si < 90s remaining
- Limitación: no hay retry automático, no hay fallback de modelo

Clawdbot:

- Auth profile rotation: si un API key falla, rota al siguiente
- Thinking level fallback: degrada de high → off automáticamente
- Context overflow → auto-compact: resume y reintenta
- Rate limit tracking: cooldown por perfil con timestamps
- Model fallback: configuración de modelos alternativos

Patrones a adoptar de Clawdbot:
┌──────────────────────────────┬───────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────┐
│ Patrón │ Qué hace │ Prioridad │
├──────────────────────────────┼───────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Auto-compact on overflow │ Resume context y reintenta │ ALTA — hoy hikai falla silenciosamente │
├──────────────────────────────┼───────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Model fallback │ Intentar con modelo alternativo si el primero falla │ MEDIA — útil para degradación graceful │
├──────────────────────────────┼───────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Retry con backoff │ Reintentar operaciones fallidas con delay exponencial │ MEDIA — especialmente para GitHub API │
├──────────────────────────────┼───────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Partial success preservation │ Guardar lo que se logró antes del fallo │ ALTA — hikai ya lo hace parcialmente con status: "partial" │
└──────────────────────────────┴───────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────┘

---

8. OBSERVABILITY & TELEMETRY

Hikai (agentRuns.ts, core/agent_run_steps.ts):

- Run tracking con steps detallados
- Inference logs: prompt + response + tokens + latency
- Large output → Convex storage con referencia
- Parent-child run linking
- Multi-tenant scoping (orgId + productId)

Clawdbot:

- Session JSONL como audit trail
- Diagnostic logging por lane
- Cache trace mode
- Full API payload logging (debug mode)
- Timing por task

Insight: Hikai tiene mejor telemetry para producción (structured, queryable, multi-tenant). Clawdbot tiene mejor debugging (payload logs, cache traces).

---

9. RESUMEN DE PATRONES PRIORITARIOS A ADOPTAR

Prioridad ALTA (impacto directo en calidad de resultados)

1. Auto-compaction on context overflow
   - Clawdbot resume mensajes viejos por chunks y reintenta
   - Hikai: implementar en agent_loop.ts — detectar token overflow, resumir mensajes N-2 a N, reinsertar summary, continuar

2. Streaming incremental de respuestas
   - Clawdbot emite bloques parciales mientras genera (block chunking por párrafos)
   - Hikai: el frontend ya muestra progreso del plan, pero no hay streaming de la generación

3. Lazy skill loading
   - Clawdbot lista skills disponibles y el agente decide cuál leer
   - Hikai: inyectar solo metadata de skills, cargar contenido completo solo cuando el agente lo solicita

Prioridad MEDIA (mejoran robustez)

4. Model/provider fallback
   - Configurar modelos alternativos por agente
   - Si Claude falla, intentar con modelo alternativo

5. Tool policies por agente
   - Definir qué tools puede usar cada scout/agent
   - Structure scout: solo read tools. Feature scout: read + search. Context agent: delegate only.

6. Thinking level degradation
   - Si extended thinking falla o excede budget → degradar nivel automáticamente

Prioridad BAJA (nice-to-have)

7. Memory/RAG sobre snapshots anteriores
   - Usar snapshots anteriores como contexto semántico para nuevas generaciones

8. Skill eligibility checking
   - Verificar prerrequisitos antes de ofrecer un skill al agente

9. Lane-based queuing
   - Serializar ejecuciones concurrentes sobre el mismo producto

---

10. DIFERENCIAS ARQUITECTÓNICAS FUNDAMENTALES
    ┌───────────────────┬────────────────────────────────┬───────────────────────────────────────┐
    │ Aspecto │ Hikai │ Clawdbot │
    ├───────────────────┼────────────────────────────────┼───────────────────────────────────────┤
    │ Runtime │ Convex (serverless, stateless) │ Node.js (persistent process) │
    ├───────────────────┼────────────────────────────────┼───────────────────────────────────────┤
    │ Session │ Fresh per invocation │ Persistent JSONL │
    ├───────────────────┼────────────────────────────────┼───────────────────────────────────────┤
    │ Planning │ Obligatorio (todo_manager) │ Implícito (model-driven) │
    ├───────────────────┼────────────────────────────────┼───────────────────────────────────────┤
    │ Orchestration │ Hardcoded phases │ Model-driven delegation │
    ├───────────────────┼────────────────────────────────┼───────────────────────────────────────┤
    │ Tool protocol │ JSON raw en prompt │ Native API tool_use │
    ├───────────────────┼────────────────────────────────┼───────────────────────────────────────┤
    │ Skill loading │ Eager (all upfront) │ Lazy (on-demand) │
    ├───────────────────┼────────────────────────────────┼───────────────────────────────────────┤
    │ Error recovery │ Partial status tracking │ Multi-layer failover │
    ├───────────────────┼────────────────────────────────┼───────────────────────────────────────┤
    │ Output validation │ Schema + validate_json gate │ None (model decides) │
    ├───────────────────┼────────────────────────────────┼───────────────────────────────────────┤
    │ Context overflow │ Fail │ Auto-compact + retry │
    ├───────────────────┼────────────────────────────────┼───────────────────────────────────────┤
    │ Multi-channel │ Single (web) │ WhatsApp, Telegram, Slack, Discord... │
    └───────────────────┴────────────────────────────────┴───────────────────────────────────────┘
    Conclusión

La fortaleza de Hikai está en la estructura y predictibilidad: planning obligatorio, validación de output, orquestación explícita por fases, y telemetry multi-tenant. Estos son patrones que Clawdbot no tiene y que dan consistencia a los resultados.

La fortaleza de Clawdbot está en la resiliencia y adaptabilidad: auto-compaction, model fallback, tool policies, lazy skill loading, y streaming. Son patrones que hacen al sistema robusto ante fallos y eficiente en uso de contexto.

La mayor oportunidad para Hikai es adoptar los patrones de resiliencia de Clawdbot (auto-compaction, fallback, tool policies) sin sacrificar la estructura que ya tiene (planning, validation, orchestration). Específicamente, auto-compaction en el agent loop y tool
policies por agente son los dos cambios que mayor impacto tendrían.

---

Plan de Adopción de Patrones Clawdbot → Hikai

Mapa de cambios en el repo

packages/convex/convex/agents/
│
├── core/
│ ├── agent_loop.ts ················ [P1] [P2] [P6]
│ │ ├─ P1: Auto-compaction on context overflow
│ │ ├─ P2: Retry con clasificación de error en catch block
│ │ └─ P6: Thinking level degradation
│ │
│ ├── agent_entrypoints.ts ········· [P5] [P3]
│ │ ├─ P5: Añadir toolPolicy por agente (allow/deny list)
│ │ └─ P3: Añadir campo modelFallbacks al AgentConfig
│ │
│ ├── compaction.ts ················ [P1] NUEVO
│ │ └─ Módulo de compaction: resumir mensajes viejos
│ │
│ ├── tool_prompt_model.ts ········· [P5]
│ │ └─ Filtrar tool catalog según toolPolicy del agente
│ │
│ ├── tool_registry.ts ············· [P5]
│ │ └─ Aceptar toolPolicy y filtrar en executeToolCalls
│ │
│ ├── skill_loader.ts ·············· [P4]
│ │ └─ Separar carga de metadata vs contenido completo
│ │
│ ├── plan_manager.ts ·············· (sin cambios)
│ ├── agent_run_steps.ts ··········· [P1] [P2]
│ │ └─ Nuevos step types: "compaction", "retry", "fallback"
│ │
│ ├── json_utils.ts ················ (sin cambios)
│ │
│ ├── tools/
│ │ ├── index.ts ················· [P5]
│ │ │ └─ Exportar herramienta de filtrado por policy
│ │ ├── delegate.ts ·············· [P5]
│ │ │ └─ Pasar toolPolicy del entrypoint al sub-agente
│ │ ├── github_helpers.ts ········ [P7]
│ │ │ └─ Retry con backoff para GitHub API errors
│ │ ├── github_list_dirs.ts ······ (sin cambios)
│ │ ├── github_list_files.ts ····· (sin cambios)
│ │ ├── github_read_file.ts ······ (sin cambios)
│ │ ├── github_search_code.ts ···· (sin cambios)
│ │ ├── todo_manager.ts ·········· (sin cambios)
│ │ ├── validate.ts ·············· (sin cambios)
│ │ └── validate_json.ts ········· (sin cambios)
│ │
│ └── validators/
│ ├── domain_map.ts ············ (sin cambios)
│ └── index.ts ················· (sin cambios)
│
├── skills/
│ ├── index.ts ····················· [P4]
│ │ └─ Exportar metadata (name, description) separado de contenido
│ ├── source/
│ │ ├── context-agent.skill.md ··· (sin cambios)
│ │ ├── domain-map-agent.skill.md (sin cambios)
│ │ ├── feature-scout.skill.md ··· (sin cambios)
│ │ ├── glossary-scout.skill.md ·· (sin cambios)
│ │ └── structure-scout.skill.md · (sin cambios)
│ ├── domain-taxonomy.skill.md ····· (sin cambios)
│ ├── feature-extraction.skill.md ·· (sin cambios)
│ └── surface-classification.skill.md (sin cambios)
│
├── contextAgent.ts ·················· [P8]
│ └─ Usar snapshots anteriores como contexto para nuevas generaciones
│
├── domainMap.ts ····················· (sin cambios)
├── structureScout.ts ················ (sin cambios)
├── featureScout.ts ·················· (sin cambios)
├── glossaryScout.ts ················· (sin cambios)
├── productContextData.ts ············ [P8]
│ └─ Query para obtener snapshot anterior como input de contexto
│
├── agentRuns.ts ····················· [P1] [P2]
│ └─ Registrar eventos de compaction/retry/fallback en runs
│
└── actions.ts ······················· (sin cambios)

---

Cambios priorizados

P1 — Auto-compaction on context overflow

Problema: Cuando un agente consume su token budget, el loop termina con budget_exceeded y se pierde todo el trabajo parcial. Los agentes con más turns (domain_mapper: 10, feature_scout: 10) son los más afectados.

Qué hacer:

- core/compaction.ts (NUEVO): Módulo independiente que recibe un array de mensajes y devuelve uno compactado. Estrategia: preservar siempre el system prompt (mensaje 0) y los últimos N mensajes (ventana reciente). Los mensajes intermedios se resumen en un solo
  mensaje sintético con las conclusiones clave. El resumen lo genera una llamada LLM separada con un prompt específico de compaction (no el agente principal).
- core/agent_loop.ts: Tres puntos de inserción:
  a. En el catch del model.generate(): Si el error es context overflow (detectar por mensaje de error del provider), triggear compaction sobre messages[] y reintentar el turn sin incrementar el contador.
  b. Post-generación, en el check de totalTokens: Si totalTokens > maxTotalTokens \* 0.75, compactar proactivamente antes de que se agote. No terminar — compactar y continuar.
  c. Después de appendear tool results: Si messages.length > COMPACTION_THRESHOLD (configurable por agente), compactar mensajes intermedios.
- core/agent_run_steps.ts: Nuevo tipo de step "compaction" con metadata: tokens antes, tokens después, mensajes eliminados.
- core/agent_entrypoints.ts: Añadir al AgentConfig un campo compaction: { enabled: boolean, threshold: number, preserveLastN: number } con defaults razonables por agente.

---

P2 — Retry con clasificación de errores

Problema: Un error en model.generate() termina el loop completo sin distinguir entre errores transitorios (rate limit, timeout de red) y permanentes (input inválido, auth).

Qué hacer:

- core/agent_loop.ts: En el catch block actual, clasificar el error antes de terminar:
  - Retryable (rate limit, timeout, server error 5xx): esperar con backoff exponencial y reintentar. Máximo 2 retries. No incrementar turns.
  - Recoverable (context overflow): triggear compaction (enlaza con P1).
  - Terminal (auth failure, invalid request, 4xx): terminar inmediatamente como hoy.
- core/agent_run_steps.ts: Nuevo tipo de step "retry" con metadata: error original, intento número, delay aplicado.
- agentRuns.ts: Los retries se registran como steps del run, no como runs separados.

---

P3 — Model fallback

Problema: Si el modelo configurado falla (quota, downtime), no hay alternativa. El agente falla directamente.

Qué hacer:

- core/agent_entrypoints.ts: Añadir modelFallbacks: string[] al AgentConfig. Ejemplo: domain_mapper podría tener ["claude-sonnet-4-20250514"] como fallback del modelo principal.
- core/agent_loop.ts: Después de agotar retries (P2), si hay fallbacks disponibles, reiniciar el loop completo con el siguiente modelo. Preservar mensajes, plan, y progreso — solo cambiar el modelo. Registrar el fallback como step.
- core/tool_prompt_model.ts: Recibir model identifier como parámetro en vez de tenerlo hardcodeado. El loop le pasa el modelo activo (principal o fallback).

---

P4 — Lazy skill loading

Problema: Los skills se cargan en SKILL_CONTENTS al evaluar el módulo y se inyectan completos en el prompt. En agentes con contexto limitado (structure_scout: 1800 tokens), el skill consume una proporción grande del budget.

Qué hacer:

- skills/index.ts: Exportar un SKILL_METADATA record con solo { name, description, version } por skill (extraído del frontmatter). SKILL_CONTENTS sigue existiendo pero se carga on-demand.
- core/skill_loader.ts: Nueva función loadSkillMetadata(name) que retorna solo el frontmatter. loadSkillFromRegistry(name) sigue funcionando igual para carga completa.
- core/agent_entrypoints.ts: Evaluar si cada agente necesita el skill completo upfront (scouts sí, porque su skill ES su misión) o si puede recibir solo metadata. En la práctica, para los scouts actuales esto no cambia mucho, pero sienta la base para cuando haya
  más skills y un agente "picker" que elija cuál cargar.

---

P5 — Tool policies por agente

Problema: Todos los agentes tienen acceso a todos los tools. Un structure_scout no debería poder llamar delegate, y un context_agent no debería poder llamar read_file directamente (debe delegar).

Qué hacer:

- core/agent_entrypoints.ts: Añadir toolPolicy: { allow?: string[], deny?: string[] } al AgentConfig. Definir policies:

| Agente          | allow                                                                      | deny                  |
| --------------- | -------------------------------------------------------------------------- | --------------------- |
| structure_scout | list_dirs, list_files, read_file, todo_manager, validate_json              | delegate, search_code |
| glossary_scout  | list_dirs, list_files, read_file, search_code, todo_manager, validate_json | delegate              |
| domain_mapper   | list_dirs, list_files, read_file, search_code, todo_manager, validate_json | delegate              |
| feature_scout   | list_dirs, list_files, read_file, search_code, todo_manager, validate_json | delegate              |

- core/tool_prompt_model.ts: Al construir el tool catalog del prompt, filtrar tools según la policy del agente activo. Solo incluir tools permitidos.
- core/tool_registry.ts: En executeToolCalls, verificar que el tool llamado está permitido por la policy. Si no, retornar error al modelo (no excepción).
- core/tools/delegate.ts: Al crear sub-agentes, pasar la toolPolicy del entrypoint. El sub-agente hereda la policy de su tipo, no la del padre.

---

P6 — Thinking level degradation

Problema: Si se configura extended thinking y el modelo no lo soporta o excede el budget de thinking, el agente falla.

Qué hacer:

- core/agent_loop.ts: En el catch block, detectar errores relacionados con thinking/reasoning (por mensaje de error del provider). Si se detecta: reducir thinking level un escalón y reintentar.
- core/agent_entrypoints.ts: Añadir thinking: { level: "high" | "medium" | "low" | "off", degradable: boolean } al AgentConfig. Default: { level: "off", degradable: true }.
- core/tool_prompt_model.ts: Pasar el thinking level al model.generate(). Si se degrada, actualizar el level para las siguientes iteraciones del loop.

---

P7 — Retry con backoff para GitHub API

Problema: Las llamadas a GitHub API pueden fallar por rate limiting o errores transitorios. Hoy estos errores se pasan al modelo como tool error, pero el modelo no siempre sabe reintentar.

Qué hacer:

- core/tools/github_helpers.ts: Envolver las llamadas fetch a GitHub API en una función con retry automático. 3 intentos, backoff exponencial (1s, 2s, 4s). Solo para errores 429 (rate limit) y 5xx (server error). Los 4xx (not found, forbidden) no se reintentan.
- No afecta a los tools individuales (github_read_file.ts, etc.) — solo a la capa de helpers que hacen el fetch real.

---

P8 — Contexto histórico de snapshots

Problema: Cuando se regenera un snapshot, el agente parte de cero. No tiene visibilidad sobre qué se generó antes, qué cambió, o qué decisiones se tomaron.

Qué hacer:

- productContextData.ts: Nueva query que obtiene el snapshot anterior (si existe) para un producto. Retornar un resumen compacto: domains anteriores, features anteriores, glossary anterior.
- contextAgent.ts: Antes de lanzar Phase 1, obtener el snapshot anterior. Pasarlo como contexto adicional a cada scout/mapper con una etiqueta previousSnapshot. El skill de cada agente ya puede indicar "si hay snapshot anterior, úsalo como punto de partida y
  enfócate en cambios".
- Los skills (.skill.md) no se modifican ahora — se haría en un segundo paso cuando se implemente, añadiendo una sección condicional tipo "## When Previous Snapshot Exists".

---

Orden de implementación recomendado

Fase 1 (fundamentos del loop)
P1 Auto-compaction ──────┐
P2 Retry + clasificación ┼── Ambos tocan agent_loop.ts, hacerlos juntos
│
Fase 2 (robustez) │
P7 GitHub retry ─────────┘ (independiente, rápido)
P3 Model fallback (depende de P2 para el flujo de fallback)

Fase 3 (eficiencia)
P5 Tool policies (independiente)
P4 Lazy skill loading (independiente)

Fase 4 (inteligencia)
P6 Thinking degradation (depende de P2)
P8 Contexto histórico (independiente, pero mejor después de P1)

Archivos tocados por cambio
┌──────────────────────────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Archivo │ P1 │ P2 │ P3 │ P4 │ P5 │ P6 │ P7 │ P8 │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ core/agent_loop.ts │ ✓ │ ✓ │ ✓ │ │ │ ✓ │ │ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ core/agent_entrypoints.ts │ ✓ │ │ ✓ │ │ ✓ │ ✓ │ │ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ core/compaction.ts (NUEVO) │ ✓ │ │ │ │ │ │ │ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ core/tool_prompt_model.ts │ │ │ ✓ │ │ ✓ │ ✓ │ │ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ core/tool_registry.ts │ │ │ │ │ ✓ │ │ │ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ core/skill_loader.ts │ │ │ │ ✓ │ │ │ │ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ core/agent_run_steps.ts │ ✓ │ ✓ │ │ │ │ │ │ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ core/tools/index.ts │ │ │ │ │ ✓ │ │ │ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ core/tools/delegate.ts │ │ │ │ │ ✓ │ │ │ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ core/tools/github_helpers.ts │ │ │ │ │ │ │ ✓ │ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ skills/index.ts │ │ │ │ ✓ │ │ │ │ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ agentRuns.ts │ ✓ │ ✓ │ │ │ │ │ │ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ contextAgent.ts │ │ │ │ │ │ │ │ ✓ │
├──────────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ productContextData.ts │ │ │ │ │ │ │ │ ✓ │
└──────────────────────────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
1 archivo nuevo, 14 archivos modificados, 0 archivos eliminados.

---

Archivos de referencia por cambio

Cada cambio mapeado a los archivos específicos de los repos de referencia que contienen los patrones en los que basarse.

---

P1 — Auto-compaction on context overflow

Patrón Clawdbot: Compaction como módulo independiente invocado desde el runner cuando el context se desborda.
┌────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Archivo │ Qué mirar │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/pi-embedded-runner/compact.ts │ compactEmbeddedPiSessionDirect() — lógica completa de resumir mensajes viejos: split por token share, chunk, summarize via LLM, merge summaries, reemplazo en el array de mensajes │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/pi-embedded-runner/run.ts │ Líneas ~360-397 — cómo se detecta el context overflow error y se triggerea compaction como recovery, con flag para no reintentar compaction dos veces │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/config/config.compaction-settings.test.ts │ Configuración: mode, reserveTokensFloor, memoryFlush — qué es configurable │
└────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
Patrón learn-claude-code: No implementa compaction explícita; usa estrategias indirectas que también aplicamos.
Archivo: learn-claude-code/v3_subagent.py → run_task() (~línea 309)
Qué mirar: Context isolation como "compaction implícita" — cada sub-agente parte de sub_messages = [], descartando el contexto intermedio del padre. Hikai ya usa este patrón via delegate
────────────────────────────────────────
Archivo: learn-claude-code/articles/上下文缓存经济学.md
Qué mirar: Anti-patrones de context management: por qué sliding windows y compression de mensajes rompen el cache. Si implementamos compaction, debemos hacerlo al final del array (nunca mid-list) para preservar prefix caching

---

P2 — Retry con clasificación de errores

Patrón Clawdbot: Clasificación de errores en categorías con diferentes estrategias de recovery.
┌───────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Archivo │ Qué mirar │
├───────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/pi-embedded-helpers/errors.ts │ classifyFailoverReason() — mapea errores API a categorías: "auth", "billing", "rate_limit", "timeout", "format". Cada categoría tiene un camino de recovery diferente │
├───────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/failover-error.ts │ FailoverError class con reason: FailoverReason — error tipado que el runner puede inspeccionar para decidir retry vs fallback vs abort │
├───────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/pi-embedded-runner/run.ts │ Líneas ~166-292 — el loop de failover completo: intento → error → clasificar → cooldown/rotate/retry. El patrón de "advance to next profile" con tracking de cooldowns │
├───────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/auth-profiles/usage.ts │ markAuthProfileFailure(), isProfileInCooldown() — tracking de estado por perfil con timestamps de cooldown │
└───────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
Patrón learn-claude-code: No tiene retry — el modelo es el mecanismo de retry (tool error → el modelo decide qué hacer). Útil como contraste.
┌───────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Archivo │ Qué mirar │
├───────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ learn-claude-code/v1_basic_agent.py → run_bash() (~línea 177) │ Errores de tool devueltos como string "Error: ..." al modelo — no hay retry a nivel infra. El modelo decide si reintentar. Para P2, nuestro retry es a nivel de model.generate(), no de tool │
└───────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

P3 — Model fallback

Patrón Clawdbot: Fallback configurado con lista ordenada de modelos alternativos.
┌───────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Archivo │ Qué mirar │
├───────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/auto-reply/model.ts │ extractModelDirective() — parsing de directivas model@profile, resolución del modelo activo con fallbacks. El concepto de model+profile como unidad │
├───────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/auth-profiles/order.ts │ resolveAuthProfileOrder() — cómo se ordena la lista de perfiles/modelos para failover: prioridad configurada → último usado exitosamente → disponibilidad │
├───────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/pi-embedded-runner/run.ts │ El outer loop que envuelve los attempts — cuando un modelo falla y se agotan retries, avanza al siguiente perfil/modelo. El modelo nuevo hereda los mensajes y el estado │
└───────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

P4 — Lazy skill loading

Patrón learn-claude-code: Separación explícita en 3 capas de carga.
Archivo: learn-claude-code/v4_skills_agent.py → SkillLoader class (~línea 133)
Qué mirar: Arquitectura completa: load_skills() carga metadata de frontmatter (Layer 1), get_descriptions() retorna solo name+description (~100 tokens), get_skill_content() carga cuerpo completo on-demand (Layer 2). El system prompt solo incluye Layer 1
────────────────────────────────────────
Archivo: learn-claude-code/v4_skills_agent.py → run_skill() (~línea 510)
Qué mirar: Skill content inyectado como tool_result (no modifica system prompt) para preservar prompt cache. El modelo pide un skill por nombre → se carga el .md completo → se devuelve como resultado del tool
────────────────────────────────────────
Archivo: learn-claude-code/docs/v4-skills-mechanism.md
Qué mirar: Documentación del diseño: por qué lazy loading, por qué tool_result en vez de system prompt, economics del caching
Patrón Clawdbot: Discovery dinámico con eligibility checking.
Archivo: clawdbot/src/agents/skills/workspace.ts
Qué mirar: loadWorkspaceSkillEntries() — discovery de skills desde múltiples directorios. buildWorkspaceSkillsPrompt() — genera lista de skills disponibles para el system prompt (solo name + description, no contenido). El agente decide cuál leer
────────────────────────────────────────
Archivo: clawdbot/src/agents/skills/frontmatter.ts
Qué mirar: Parsing de metadata SKILL.md: requires.bins para eligibility. Si un skill requiere gh y no está instalado, no se ofrece
────────────────────────────────────────
Archivo: clawdbot/src/agents/skills/config.ts
Qué mirar: Configuración de filtrado: allow, deny, extraDirs — control granular de qué skills están disponibles

---

P5 — Tool policies por agente

Patrón Clawdbot: Sistema multicapa de policies.
┌────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Archivo │ Qué mirar │
├────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/tool-policy.ts │ TOOL*GROUPS (agrupaciones semánticas de tools), TOOL_PROFILES (conjuntos predefinidos), expandToolGroups() — cómo se resuelven aliases como "file_tools" → ["read", "write", "edit"] │
├────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/pi-tools.policy.ts │ Enforcement: cómo se aplican las policies en la creación de tools. Capas: global → agent → model → profile → group → sandbox. Cada capa puede override │
├────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/config/group-policy.ts │ resolveToolsBySender(), resolveChannelGroupToolsPolicy() — policies contextuales (por canal, por grupo). Equivalente a nuestro "por tipo de agente" │
└────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
Patrón learn-claude-code: Filtering por tipo de agente (más simple).
┌───────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Archivo │ Qué mirar │
├───────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ learn-claude-code/v3_subagent.py → AGENT_TYPES (~línea 85) │ Definición directa: "explore": ["bash", "read_file"], "code": "*", "plan": ["bash", "read_file"]. Simple, declarativo, por tipo │
├───────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ learn-claude-code/v3*subagent.py → get_tools_for_agent() (~línea 240) │ Resolución: "*" → all tools, lista explícita → filtrar BASE_TOOLS por nombre. 8 líneas. Este patrón simple es suficiente para nuestro caso │
└───────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

P6 — Thinking level degradation

Patrón Clawdbot: Degradación automática con tracking de niveles intentados.
┌─────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Archivo │ Qué mirar │
├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/auto-reply/thinking.ts │ ThinkLevel type: `"off" │
├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/pi-embedded-helpers/thinking.ts │ pickFallbackThinkingLevel() — dado un nivel que falló, selecciona el siguiente nivel inferior. Mantiene set de attemptedThinking para no reintentar un nivel ya fallido │
├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/pi-embedded-runner/run.ts │ Integración en el loop: detect thinking error → pickFallbackThinkingLevel() → clear attempted levels if switching profile → retry. El thinking level se pasa como parámetro al attempt, no como config global │
└─────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

P7 — Retry con backoff para GitHub API

Patrón Clawdbot: No tiene un ejemplo directo de retry en GitHub API, pero sí el patrón general de retry en el runner.
┌───────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Archivo │ Qué mirar │
├───────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/pi-embedded-runner/run.ts │ El patrón de retry con cooldown tracking: isProfileInCooldown() usa timestamps para implementar backoff. Mismo concepto aplicable a GitHub API rate limits │
├───────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/auth-profiles/usage.ts │ markAuthProfileFailure() con timestamp — patrón de "marcar fallo + calcular cooldown exponencial" que se puede adaptar para GitHub API 429s │
└───────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
Patrón learn-claude-code: Output truncation como prevención.
┌───────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Archivo │ Qué mirar │
├───────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ learn-claude-code/v1_basic_agent.py → run_bash() (~línea 177) │ output[:50000] — truncación preventiva. No es retry, pero evita que outputs grandes rompan el contexto. Nuestros github_read_file ya hacen esto (100KB max) │
└───────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

P8 — Contexto histórico de snapshots

Patrón Clawdbot: Memory search como sistema de recall antes de actuar.
Archivo: clawdbot/src/memory/manager-search.ts
Qué mirar: searchVector() — búsqueda por embeddings sobre contenido previo. El concepto de "buscar en lo que ya sé antes de explorar de nuevo"
────────────────────────────────────────
Archivo: clawdbot/src/memory/session-files.ts
Qué mirar: listSessionFilesForAgent() — acceso a historial de sesiones anteriores. El patrón de "sesiones como memoria persistente"
────────────────────────────────────────
Archivo: clawdbot/src/agents/system-prompt.ts
Qué mirar: Sección de Memory Recall en el system prompt — instrucciones al agente de usar memory_search antes de responder sobre trabajo previo. El prompt dice: "Before answering anything about prior work, decisions, dates... run memory_search"
Patrón learn-claude-code: TodoManager como memoria externa.
┌──────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Archivo │ Qué mirar │
├──────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ learn-claude-code/v2_todo_agent.py → TodoManager (~línea 80) │ El plan como estado externo que sobrevive entre turns — concepto transferible a "snapshot anterior como estado externo que sobrevive entre ejecuciones" │
└──────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

Resumen rápido de rutas

clawdbot/
├── src/agents/pi-embedded-runner/
│ ├── compact.ts ··················· P1 (compaction logic)
│ ├── run.ts ······················· P1 P2 P3 P6 (runner loop, failover, retry)
│ └── history.ts ··················· (referencia adicional: history limiting)
├── src/agents/pi-embedded-helpers/
│ ├── errors.ts ···················· P2 (error classification)
│ └── thinking.ts ·················· P6 (thinking fallback)
├── src/agents/
│ ├── auth-profiles/usage.ts ······· P2 P7 (cooldown tracking)
│ ├── auth-profiles/order.ts ······· P3 (profile ordering)
│ ├── tool-policy.ts ··············· P5 (tool groups & profiles)
│ ├── pi-tools.policy.ts ·········· P5 (policy enforcement)
│ ├── failover-error.ts ··········· P2 (typed errors)
│ ├── skills/workspace.ts ·········· P4 (lazy loading, discovery)
│ ├── skills/frontmatter.ts ······· P4 (metadata parsing)
│ ├── skills/config.ts ············ P4 (skill filtering)
│ └── system-prompt.ts ············ P8 (memory recall instructions)
├── src/auto-reply/
│ ├── model.ts ····················· P3 (model directive parsing)
│ └── thinking.ts ·················· P6 (thinking level types)
├── src/memory/
│ ├── manager-search.ts ··········· P8 (vector search)
│ └── session-files.ts ············ P8 (session history access)
└── src/config/
└── group-policy.ts ·············· P5 (contextual policies)

learn-claude-code/
├── v2_todo_agent.py ·················· P8 (TodoManager as external state)
├── v3_subagent.py ···················· P1 P5 (context isolation, tool filtering)
├── v4_skills_agent.py ················ P4 (SkillLoader, lazy 3-layer loading)
├── v1_basic_agent.py ················· P2 P7 (error-as-string, truncation)
├── articles/上下文缓存经济学.md ······ P1 (anti-patrones de compaction)
└── docs/
├── v3-subagent-mechanism.md ······ P5 (tool isolation rationale)
└── v4-skills-mechanism.md ········ P4 (lazy loading rationale)

---

Diagnóstico: por qué los agentes no terminan, tardan mucho, y provocan timeouts

Causa raíz 1 — Protocolo de tools basado en texto, no en API nativa

tool_prompt_model.ts construye un prompt de texto plano con todo embedido:

Protocol (instrucciones JSON) + Tool catalog (JSON as text) + Conversation (USER/ASSISTANT as text)

Esto se envía a adapter.generateText({ prompt }) — una llamada de texto simple. El adapter (Anthropic/OpenAI) no recibe parámetro tools. El LLMPort ni siquiera lo acepta en su interfaz.

Consecuencias directas:

- El modelo tiene que generar {"type":"tool_use","toolCalls":[...]} como texto raw → frecuentemente mete texto extra antes/después → trigger de toolUseExtraTextReminder → turn desperdiciado
- El modelo a veces concatena tool_use + final output en la misma respuesta → trigger de extractFinalFromRawText recovery → a veces funciona, a veces no
- No hay prompt caching: cada turn re-envía protocol + tool catalog + toda la conversación como texto. En el turn 8, el prompt ya incluye 7 turnos anteriores serializados
- No hay schemas de input para tools (solo {name, description}) → el modelo inventa parámetros incorrectos (status: "not_started" en vez de "pending", campos task/notes que no existen)

Cuántos turns se desperdician: Contando los paths en agent_loop.ts que consumen un turn sin progreso real:
┌───────────────┬──────────────────────────────────────────────────┬────────────────────────┐
│ Path │ Trigger │ Qué pasa │
├───────────────┼──────────────────────────────────────────────────┼────────────────────────┤
│ Línea 274-280 │ looksLikeToolUse pero no parsed │ Reminder, turn perdido │
├───────────────┼──────────────────────────────────────────────────┼────────────────────────┤
│ Línea 281-291 │ requireValidateJson && !hasValidatedJson │ Reminder, turn perdido │
├───────────────┼──────────────────────────────────────────────────┼────────────────────────┤
│ Línea 292-300 │ Respuesta vacía │ Reminder, turn perdido │
├───────────────┼──────────────────────────────────────────────────┼────────────────────────┤
│ Línea 324-336 │ Validación falla │ Feedback, turn perdido │
├───────────────┼──────────────────────────────────────────────────┼────────────────────────┤
│ Línea 369-389 │ Plan completado + llama todo_manager otra vez │ Reminder, turn perdido │
├───────────────┼──────────────────────────────────────────────────┼────────────────────────┤
│ Línea 390-400 │ Plan completado + tools que no son validate_json │ Reminder, turn perdido │
├───────────────┼──────────────────────────────────────────────────┼────────────────────────┤
│ Línea 402-407 │ Extra text con tool calls │ Reminder, turn perdido │
└───────────────┴──────────────────────────────────────────────────┴────────────────────────┘
En un agente con maxTurns: 8, perder 2-3 turns en reminders significa que solo quedan 5-6 turns para trabajo real. La bitácora confirma esto: "Scouts devolvían final sin validate_json y fallaban", "Persistía loop en todo_manager con plan completado".

Causa raíz 2 — Phase 1 es secuencial, no paralela

En contextAgent.ts, structure y glossary se ejecutan en serie:

línea 157: structureResult = await ctx.runAction(structureScout...) // bloquea
línea 177: glossaryResult = await ctx.runAction(glossaryScout...) // espera a que termine structure

No hay Promise.allSettled. Cada scout tiene TIMEOUT*MS = 5 * 60 \_ 1000. En serie: 5min + 5min = 10min. El context agent tiene MAX_DURATION_MS = 9min. Nunca hay tiempo suficiente para las 4 fases.

La bitácora lo confirma: "Feature se omite por guardia de timeout del Context Agent (snapshot partial)" y "Domain/Feature no llegaron a ejecutarse antes del timeout".

Causa raíz 3 — Secuencia de finalización excesiva

Para que un agente termine con éxito necesita:

1. Llamar todo_manager marcando todo como completed → 1 turn
2. Llamar validate_json con el output final → 1 turn
3. Retornar {"type":"final","output":{...}} → 1 turn (aunque autoFinalizeOnValidateJson lo reduce a 0)

Con autoFinalizeOnValidateJson: true, son 2 turns mínimos. Pero el modelo frecuentemente intercala otros calls entre estos pasos, o mete texto extra, lo que consume turns adicionales.

Con maxTurns: 8 para structure_scout, la secuencia real observada es:
Turn 1: todo_manager (plan)
Turn 2: list_dirs
Turn 3: list_files / read_file
Turn 4: read_file
Turn 5: todo_manager (update)
Turn 6: read_file + texto extra → reminder (turn perdido)
Turn 7: todo_manager (complete)
Turn 8: validate_json → auto-finalize ← si llega aquí, ok

Margen cero. Si hay un solo tropiezo, el agente no termina.

Causa raíz 4 — Prompt crece sin límite

tool_prompt_model.ts → buildPrompt() serializa TODOS los mensajes como texto plano cada turn:

const conversation = messages
.map((message) => `${message.role.toUpperCase()}: ${message.content}`)
.join("\n\n");

Cada tool result (que puede ser un JSON grande: directorio completo, contenido de archivo) se acumula. En el turn 8, el prompt incluye las 7 respuestas anteriores + 7 tool results. Sin compaction ni truncation.

---

Impacto en la propuesta P1-P8
┌─────────────────────────┬─────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────┐
│ Propuesta │ ¿Aborda causa raíz? │ Impacto real │
├─────────────────────────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
│ P1 Auto-compaction │ CR4 parcialmente │ Medio — reduce budget_exceeded pero no la causa de turns perdidos │
├─────────────────────────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
│ P2 Retry errores │ Ninguna directa │ Bajo — los errores de model.generate() son raros; el problema son los turns desperdiados │
├─────────────────────────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
│ P3 Model fallback │ Ninguna directa │ Bajo — misma razón │
├─────────────────────────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
│ P4 Lazy skills │ CR4 marginalmente │ Bajo — los skills son ~50 líneas, el problema es la conversación │
├─────────────────────────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
│ P5 Tool policies │ CR1 parcialmente │ Bajo — evita calls incorrectos pero no el formato │
├─────────────────────────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
│ P6 Thinking degradation │ Ninguna │ Nulo — thinking no está habilitado │
├─────────────────────────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
│ P7 GitHub retry │ Ninguna │ Bajo — errores GitHub son infrecuentes │
├─────────────────────────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
│ P8 Snapshots históricos │ Ninguna │ Bajo — mejora calidad, no velocidad/completación │
└─────────────────────────┴─────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘
Ningún P1-P8 aborda las causas raíz principales. Son mejoras de robustez útiles pero secundarias.

---

Propuesta revisada: prioridades reales

R0 — Paralelizar Phase 1 (impacto inmediato, cambio mínimo)

contextAgent.ts: cambiar los dos await secuenciales por Promise.allSettled([structure, glossary]). Un cambio de ~10 líneas que corta el tiempo de Phase 1 a la mitad.

R1 — Migrar a native tool_use API (impacto máximo, cambio estructural)

Refactorizar LLMPort para aceptar tools como parámetro nativo. El adapter Anthropic los pasa como tools en la API. El modelo responde con stop_reason: "tool_use" y content[].type: "tool_use" nativos — sin parsing de JSON, sin extra text, sin reminders.

Esto elimina de golpe:

- Todos los "wasted turn" paths por formato
- La necesidad de {"type":"tool_use"} / {"type":"final"} protocol
- El extractJsonPayload y todos los fallbacks
- La mayoría de reminders

R2 — Añadir input schemas a tools (complementa R1)

Cada tool debería declarar su schema de input (JSON Schema). Con native tool_use, Anthropic valida inputs automáticamente. Sin native, al menos el modelo ve qué parámetros espera cada tool.

R3 — Simplificar secuencia de finalización (complementa R1)

Con native tool_use, el modelo termina con stop_reason: "end_turn" naturalmente. Sin el protocolo JSON, no necesita el wrapper {"type":"final","output":{...}}. El validate_json tool puede seguir existiendo pero como validación inline, no como gate obligatorio de 1
turn extra.

R4 — Auto-compaction (P1 original, sigue siendo útil)

Después de R1, los prompts serán más eficientes pero el problema de crecimiento lineal persiste. Compaction sigue siendo necesaria para agentes con muchos turns.

---

Hallazgos adicionales (para incorporar al plan)

1. Manejo explícito de respuestas mixtas (texto + tool calls)
   - Incluso con native tool_use, el modelo puede devolver texto y tool calls en el mismo turno.
   - Debe definirse una política clara: ejecutar tools primero y preservar/descartar el texto parcial, o permitir ambos (y cómo se valida).

2. Control de tamaño de outputs de tools (antes de llegar al prompt)
   - El problema de crecimiento de contexto no se resuelve solo con native tools.
   - Falta una capa de truncación/resumen de tool results grandes (list_files, read_file, search_code) antes de reinyectar al loop.

3. Compaction debe preservar estado crítico del loop
   - El plan/todo_manager y las validaciones no pueden perderse en un resumen.
   - Definir qué mensajes son “pinned” además del system prompt (plan state, últimos N tool results clave, validaciones recientes).

4. Validación y schemas: manejo de argumentos inválidos
   - Con tools nativos y schemas, aún pueden llegar args inválidos o incompletos.
   - Debe existir una respuesta consistente del tool registry (errores de schema → mensaje claro al modelo + no crash del loop).

5. Medición explícita de éxito por fase
   - Definir métricas mínimas por fase (completion rate, turns promedio, latencia total).
   - Esto evita “terminamos la fase” sin confirmar que resolvió CR1/CR3/CR4.

Orden revisado

Fase 0 (quick win, hoy)
R0 Paralelizar Phase 1 ············ ~10 líneas en contextAgent.ts

Fase 1 (cambio estructural)
R1 Native tool_use API ············ LLMPort + adapters + tool_prompt_model + agent_loop
R2 Tool input schemas + validación de args ··········· tool definitions + tool_registry
R3 Simplificar finalización + manejo de mixed responses ········ agent_loop + protocol

Fase 2 (robustez, los P originales que sí aportan)
R4 Auto-compaction (=P1) con pinned state ··········· compaction.ts + agent_loop
R4b Control de tamaño de outputs de tools ··········· tool_registry + tools/\*
R5 Retry con clasificación (=P2) ·· agent_loop catch block
R6 GitHub retry (=P7) ·············· github_helpers.ts

Fase 3 (optimización)
R7 Tool policies (=P5) ············· entrypoints + tool_registry
R8 Model fallback (=P3) ··········· entrypoints + agent_loop

---

# Plan de Implementación — Agentic Improvements

Mejoras al sistema agentic de Hikai basadas en el análisis comparativo con Clawdbot y el diagnóstico de causas raíz.

## Contexto

Los agentes actuales tienen tres problemas observados en testing:

1. **No terminan**: Incierto que devuelvan el output esperado
2. **Tardan mucho**: Individualmente y en conjunto
3. **Provocan timeouts**: Por budget y por desconexión de Convex

Las causas raíz identificadas (ver diagnóstico arriba) son:

- **CR1**: Protocolo de tools basado en texto (no native API tool_use)
- **CR2**: Phase 1 (structure + glossary) se ejecuta en serie, no en paralelo
- **CR3**: Secuencia de finalización excesiva (2-3 turns solo para terminar)
- **CR4**: Prompt crece sin límite (sin compaction)

Este plan aborda las causas raíz en orden de impacto y luego incorpora mejoras de robustez.

## Referencias

- Diagnóstico completo: secciones anteriores de este documento
- Plan anterior de refactor: `apps/webapp/webapp-plans/2026-01-14 - refactor-agents-2 implementation-plan.md`
- Bitácora de tests: `apps/webapp/webapp-plans/tests/context-agents-tests.md`
- Repos de referencia:
  - https://github.com/shareAI-lab/learn-claude-code (v0-v4, principios agentic)
  - https://github.com/clawdbot/clawdbot (patrones de resiliencia)

### Archivos clave del sistema actual

| Archivo                                                   | Rol                                             |
| --------------------------------------------------------- | ----------------------------------------------- |
| `packages/convex/convex/ai/ports/llmPort.ts`              | Interfaz LLMPort (solo texto hoy)               |
| `packages/convex/convex/ai/adapters/anthropic.ts`         | Adapter Anthropic (usa `ai` SDK `generateText`) |
| `packages/convex/convex/ai/adapters/openai.ts`            | Adapter OpenAI                                  |
| `packages/convex/convex/agents/core/agent_loop.ts`        | Loop agentic principal                          |
| `packages/convex/convex/agents/core/tool_prompt_model.ts` | Construye prompt + parsea respuesta             |
| `packages/convex/convex/agents/core/json_utils.ts`        | Extracción de JSON de texto                     |
| `packages/convex/convex/agents/core/tool_registry.ts`     | Ejecución de tools                              |
| `packages/convex/convex/agents/core/agent_entrypoints.ts` | Registry de agentes + configs                   |
| `packages/convex/convex/agents/core/plan_manager.ts`      | Estado del plan                                 |
| `packages/convex/convex/agents/contextAgent.ts`           | Orquestador de fases                            |
| `packages/convex/convex/agents/structureScout.ts`         | Scout de estructura                             |
| `packages/convex/convex/agents/glossaryScout.ts`          | Scout de glosario                               |
| `packages/convex/convex/agents/domainMap.ts`              | Agente domain map                               |
| `packages/convex/convex/agents/featureScout.ts`           | Scout de features                               |

---

## Progreso

| Subfase | Descripción                                                       | Estado | Causa raíz | Archivos tocados                                                   |
| ------- | ----------------------------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------ |
| F0.0    | Paralelizar Phase 1 en contextAgent                               | ✅     | CR2        | `contextAgent.ts`                                                  |
| F1.0    | Extender LLMPort con soporte native tools                         | ✅     | CR1        | `llmPort.ts`, `anthropic.ts`, `openai.ts`                          |
| F1.1    | Añadir input schemas + validación de args                         | ✅     | CR1        | `tools/*.ts`, `tool_registry.ts`                                   |
| F1.2    | Refactorizar tool_prompt_model para native tool_use               | ✅     | CR1        | `tool_prompt_model.ts`, `agent_loop.ts`                            |
| F1.3    | Simplificar secuencia de finalización + manejo de mixed responses | ✅     | CR3        | `agent_loop.ts`, `todo_manager.ts`, skills/scouts                 |
| F1.4    | Validar todos los scouts con native tool_use                      | ⏳     | CR1,CR3    | scouts, skills                                                     |
| F2.0    | Auto-compaction de mensajes (pinned state)                        | ⏳     | CR4        | `compaction.ts` (nuevo), `agent_loop.ts`, `agent_entrypoints.ts`   |
| F2.0b   | Control de tamaño de outputs de tools                             | ⏳     | CR4        | `tool_registry.ts`, `tools/*.ts`                                   |
| F2.1    | Clasificación de errores y retry con backoff                      | ⏳     | —          | `agent_loop.ts`, `agent_run_steps.ts`                              |
| F2.2    | Retry con backoff para GitHub API                                 | ⏳     | —          | `github_helpers.ts`                                                |
| F3.0    | Tool policies por agente                                          | ⏳     | —          | `agent_entrypoints.ts`, `tool_prompt_model.ts`, `tool_registry.ts` |
| F3.1    | Model fallback                                                    | ⏳     | —          | `agent_entrypoints.ts`, `agent_loop.ts`                            |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Prompt para arrancar subfases

```
- En apps/webapp/webapp-plans/2026-01-27 - clawdbot-agentic-improvenets.md está el plan de implementación (sección "Plan de Implementación — Agentic Improvements")
- Lee el diagnóstico de causas raíz en ese mismo documento (secciones "Diagnóstico" y "Propuesta revisada") para entender el contexto completo
- Lee la bitácora de tests en apps/webapp/webapp-plans/tests/context-agents-tests.md para entender los problemas observados
- Vamos a proceder con la siguiente subfase pendiente
- Usa el prompt de esa subfase como instrucción completa
- Comparte el plan de implementación antes de ejecutar cambios
- No hagas asunciones, comparteme dudas y las debatimos antes de empezar el desarrollo
- Asegurate de que cumples las reglas del repo (CLAUDE.md)
- No hagas commit hasta confirmar pruebas OK
- Una vez validado haz commit y actualiza el progreso en el documento (apartado ##Progreso)
- Tras terminar de desarrollar cada subfase, indicame las pruebas funcionales con las que puedo validar la fase antes del commit
- Máxima capacidad de ultrathink
```

---

## Instrucciones generales

- Seguir `CLAUDE.md` y la regla apps → packages
- Backend Convex: primera línea de queries/mutations/actions debe llamar a `assertProductAccess` o `assertOrgAccess`
- No migrar datos existentes; cambios solo para nuevos datos
- Commits con formato `feat(agents): [F#.#] descripcion`
- **Breaking changes permitidos**: no se requiere compatibilidad hacia atrás durante la migración (se prioriza simplicidad y reducción de turnos).

### Convex: separación de responsabilidades

| Capa       | Responsabilidad                            | Ejemplo                            |
| ---------- | ------------------------------------------ | ---------------------------------- |
| `action`   | Orquesta agente, llama LLM, coordina tools | `generateDomainMap`                |
| `mutation` | Persiste resultados, actualiza estado      | `saveDomainMap`, `appendStep`      |
| `query`    | Lee datos para tools y UI                  | `getRunById`, `listSourceContexts` |

### Principios a verificar

| Principio                                      | Cómo verificar                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Los agentes terminan con `status: "completed"` | Ejecutar scout y verificar status en agentRuns                                |
| Tiempo total < 3min para snapshot completo     | Medir desde UI o logs                                                         |
| Sin turns desperdiciados por formato           | Revisar steps: no hay reminders de `toolUseExtraText`                         |
| Tools con schemas nativos                      | Revisar API payload: `tools` parameter presente                               |
| Phase 1 paralela                               | Logs muestran structure y glossary solapados en tiempo                        |
| Outputs de tools acotados                      | Verificar truncación/resumen en `tool_registry` antes de reinyectar al prompt |
| Mixed responses manejadas                      | Validar que texto + tool_calls no rompe el loop ni la validación              |

---

## Subfases

### F0.0: Paralelizar Phase 1 en contextAgent

**Objetivo**: Structure scout y glossary scout se ejecutan en paralelo. Corta el tiempo de Phase 1 a la mitad.

**Causa raíz**: CR2

**Archivos**:

- `packages/convex/convex/agents/contextAgent.ts` (modificar)

**Prompt**:

```
F0.0: Paralelizar Phase 1 en contextAgent

CONTEXTO:
- En contextAgent.ts, structure scout y glossary scout se ejecutan secuencialmente
  con dos `await` separados (líneas ~157 y ~177)
- Cada scout tiene TIMEOUT_MS hasta 5 minutos
- En serie suman hasta 10min, pero el context agent tiene MAX_DURATION_MS de 9min
- Esto causa que Phase 2 y Phase 3 rara vez se ejecuten

CAMBIO:
- Reemplazar los dos await secuenciales por Promise.allSettled([...])
- Cada resultado se procesa individualmente (fulfilled vs rejected)
- El manejo de errores por fase se mantiene igual (try/catch → errors array)
- Los updates de snapshot entre fases se mantienen igual

RESTRICCIONES:
- NO cambiar la lógica interna de los scouts
- NO cambiar timeouts ni budgets
- NO tocar Phase 2 ni Phase 3
- Mantener el tracking de completedPhases y errors
```

**Validación**:

- [ ] `tsc` convex sin errores
- [ ] Structure y glossary se lanzan en paralelo
- [ ] Si uno falla, el otro sigue ejecutándose
- [ ] Snapshot se actualiza correctamente con resultados de ambos
- [ ] Phase 2 recibe outputs de ambos scouts

**Pruebas funcionales**:

1. Ejecutar `generateContextSnapshot` en un producto con repo conectado
2. Verificar en logs/steps que structure y glossary comienzan al mismo tiempo (no secuencial)
3. Verificar que Phase 2 (domain map) se ejecuta — antes era imposible por timeout
4. Verificar que si un scout falla, el snapshot es `partial` pero el otro scout sí contribuye su output
5. Medir tiempo total de Phase 1: debe ser ~max(structure, glossary), no sum(structure, glossary)

---

### F1.0: Extender LLMPort con soporte native tools

**Objetivo**: El adapter LLM puede recibir definiciones de tools y devolver tool calls nativos. Backward compatible: `generateText` sigue existiendo.

**Causa raíz**: CR1

**Archivos**:

- `packages/convex/convex/ai/ports/llmPort.ts` (modificar)
- `packages/convex/convex/ai/adapters/anthropic.ts` (modificar)
- `packages/convex/convex/ai/adapters/openai.ts` (modificar)
- `packages/convex/convex/ai/adapters/index.ts` (modificar si necesario)

**Prompt**:

```
F1.0: Extender LLMPort con soporte native tools

CONTEXTO:
- LLMPort actual solo tiene generateText(prompt) — texto plano
- Los adapters usan el Vercel AI SDK (`ai` package) con `generateText` de `ai`
- El AI SDK ya soporta native tool calling via su parámetro `tools`
- Referencia: https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#tools

PARTE 1: TIPOS NUEVOS EN llmPort.ts
- Añadir interface LLMToolDefinition:
  - name: string
  - description: string
  - parameters: Record<string, unknown> (JSON Schema del input)
- Añadir interface LLMToolCall:
  - toolCallId: string
  - toolName: string
  - args: Record<string, unknown>
- Añadir interface LLMGenerateWithToolsParams:
  - messages: Array<{ role: "user"|"assistant"|"tool", content: string | LLMToolCall[] }>
    (formato messages del AI SDK)
  - systemPrompt?: string
  - tools: LLMToolDefinition[]
  - maxTokens?: number
  - temperature?: number
- Añadir interface LLMGenerateWithToolsResult:
  - text: string (texto generado, puede ser vacío si solo hay tool calls)
  - toolCalls: LLMToolCall[] (puede estar vacío si solo hay texto)
  - stopReason: "end_turn" | "tool_use" | "max_tokens"
  - tokensIn, tokensOut, totalTokens, model, provider, latencyMs

PARTE 2: EXTENDER LLMPort
- Añadir método opcional: generateWithTools?(params): Promise<LLMGenerateWithToolsResult>
- Mantener generateText intacto (backward compatible)

PARTE 3: ADAPTER ANTHROPIC
- Implementar generateWithTools usando generateText del AI SDK con parámetro tools
- El AI SDK convierte tools a formato nativo Anthropic automáticamente
- Usar `tool` de ai para definir tools con schema zod o JSON Schema
- Manejar response.toolCalls para extraer calls nativos

PARTE 4: ADAPTER OPENAI
- Implementar generateWithTools de la misma manera
- El AI SDK maneja la conversión a function calling de OpenAI

RESTRICCIONES:
- NO modificar generateText existente
- NO romper código que usa generateText
- Los nuevos tipos se exportan desde llmPort.ts
- No crear nuevos archivos — extender los existentes
```

**Validación**:

- [ ] `tsc` convex sin errores
- [ ] `generateText` sigue funcionando igual (sin cambios en callers)
- [ ] `generateWithTools` existe en ambos adapters
- [ ] Los tipos nuevos se exportan correctamente

**Pruebas funcionales**:

1. Verificar que `tsc` compila sin errores
2. Crear un test ad-hoc en Convex dashboard que llame a `generateWithTools` con un tool simple (ej: un tool "echo" que devuelve su input)
3. Verificar que la respuesta tiene `toolCalls` con el tool call nativo
4. Verificar que `stopReason` es `"tool_use"` cuando hay tool calls
5. Verificar que `stopReason` es `"end_turn"` cuando no hay tool calls
6. Verificar que los agents existentes (que usan `generateText`) siguen funcionando sin cambios

---

### F1.1: Añadir input schemas + validación de args

**Objetivo**: Cada tool declara su JSON Schema de input y el registry valida args. Esto permite native tool_use y reduce errores de parámetros.

**Causa raíz**: CR1

**Archivos**:

- `packages/convex/convex/agents/core/tool_registry.ts` (modificar ToolDefinition + validación)
- `packages/convex/convex/agents/core/tools/github_list_dirs.ts` (modificar)
- `packages/convex/convex/agents/core/tools/github_list_files.ts` (modificar)
- `packages/convex/convex/agents/core/tools/github_read_file.ts` (modificar)
- `packages/convex/convex/agents/core/tools/github_search_code.ts` (modificar)
- `packages/convex/convex/agents/core/tools/todo_manager.ts` (modificar)
- `packages/convex/convex/agents/core/tools/validate_json.ts` (modificar)
- `packages/convex/convex/agents/core/tools/delegate.ts` (modificar)

**Prompt**:

```
F1.1: Añadir input schemas + validación de args

CONTEXTO:
- ToolDefinition actual: { name, description?, execute? }
- Sin schemas, el modelo inventa parámetros incorrectos
- Los schemas se usarán con native tool_use (F1.2) y como documentación

PARTE 1: EXTENDER ToolDefinition
- Añadir campo parameters: Record<string, unknown> (JSON Schema)
- El campo es obligatorio para tools nuevos y para los tools existentes usados por el loop
- Tipo: JSON Schema estándar (type, properties, required, etc.)

PARTE 2: SCHEMAS POR TOOL
- Revisar cada tool, leer su execute() para extraer los parámetros reales
- Definir JSON Schema que coincida exactamente con lo que execute() espera
- Incluir descriptions en cada property para guiar al modelo
- Marcar required vs optional correctamente

Ejemplo de referencia (no copiar, adaptar a cada tool):
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Directory path relative to repo root" },
      depth: { type: "number", description: "Max directory depth (default 2)" }
    },
    required: ["path"]
  }

PARTE 3: VALIDACIÓN EN tool_registry
- Antes de ejecutar un tool, validar args contra su schema
- Si falla: devolver error estructurado al modelo (no throw)
- El error debe indicar el campo inválido/ausente para facilitar el retry

RESTRICCIONES:
- NO cambiar la lógica de execute() de ningún tool
- NO introducir dependencias nuevas
- Añadir validación dentro del registry sin romper el flujo existente
```

**Validación**:

- [ ] `tsc` convex sin errores
- [ ] Todos los tools con execute() tienen parameters definidos
- [ ] Los schemas coinciden con los parámetros reales de execute()
- [ ] tool_registry rechaza args inválidos con error claro (sin romper el loop)
- [ ] Agents existentes siguen funcionando (schemas no afectan el prompt-based flow actual)

**Pruebas funcionales**:

1. Verificar que `tsc` compila sin errores
2. Ejecutar un scout existente (structure_scout) — debe funcionar idéntico (schemas no se usan aún)
3. Inspeccionar los schemas definidos para cada tool y verificar coherencia con execute()

---

### F1.2: Refactorizar tool_prompt_model para native tool_use

**Objetivo**: El agent loop usa `generateWithTools` del adapter en vez de construir un prompt de texto con tools embedidos. Elimina el protocolo JSON basado en texto.

**Causa raíz**: CR1

**Archivos**:

- `packages/convex/convex/agents/core/tool_prompt_model.ts` (refactorizar)
- `packages/convex/convex/agents/core/agent_loop.ts` (adaptar)

**Prompt**:

```
F1.2: Refactorizar tool_prompt_model para native tool_use

CONTEXTO:
- tool_prompt_model.ts hoy construye un prompt de texto con:
  Protocol (instrucciones JSON) + Tool catalog (JSON as text) + Conversation (serializada)
- Esto se envía a adapter.generateText({ prompt })
- El modelo responde con JSON raw → se parsea con extractJsonPayload
- Esto causa: extra text, JSON malformado, turns desperdiciados en reminders

PARTE 1: NUEVO MÉTODO EN tool_prompt_model
- Crear generateWithNativeTools() que:
  - Recibe messages[], tools[], systemPrompt, adapter
  - Convierte ToolDefinition[] a LLMToolDefinition[] (usando parameters de F1.1)
  - Llama a adapter.generateWithTools({ messages, tools, systemPrompt })
  - Devuelve resultado tipado: { text, toolCalls, stopReason, usage }
- Mantener el método generate() actual como fallback (por si el adapter no soporta generateWithTools)

PARTE 2: ADAPTAR FORMATO DE MESSAGES
- El AI SDK espera messages en formato:
  - { role: "user", content: "..." }
  - { role: "assistant", content: [...tool_use blocks...] }
  - { role: "tool", content: "...", toolCallId: "..." }
- Mapear desde el formato actual de agent_loop (que es más simple)
- El skill se inyecta como primer mensaje user (como hoy)
- Los tool results se formatean como messages de rol "tool"

PARTE 3: ADAPTAR agent_loop.ts
- Detectar si el adapter soporta generateWithTools
- Si sí: usar generateWithNativeTools, el loop:
  - Si stopReason === "tool_use": ejecutar toolCalls, append results, continuar
  - Si stopReason === "end_turn": tratar text como output final
  - NO necesitar protocolo {"type":"tool_use"} ni {"type":"final"}
  - NO necesitar extractJsonPayload para tool calls
  - MANTENER validate_json como tool (el modelo lo llama nativamente)
  - MANTENER todo_manager como tool
- Si no: usar flujo actual (backward compat)

PARTE 4: ELIMINAR REMINDERS INNECESARIOS
- Con native tool_use, estos paths desaparecen:
  - toolUseExtraTextReminder (no existe extra text con native)
  - looksLikeToolUse pero no parsed (native siempre parsea)
  - validateJsonReminder (el modelo llama validate_json como tool normal)
- Mantener solo los reminders que siguen teniendo sentido:
  - emptyResponseReminder (si text vacío y sin tool calls)
  - validación de output final (si el output no pasa schema)

RESTRICCIONES:
- Mantener generate() original como fallback
- NO eliminar json_utils.ts (sigue usándose para parsear outputs finales)
- El plan (todo_manager) sigue funcionando igual
- autoFinalizeOnValidateJson sigue funcionando
- Steps y run tracking siguen funcionando
```

**Validación**:

- [ ] `tsc` convex sin errores
- [ ] Agent loop detecta native tools y los usa
- [ ] Tool calls llegan como nativos (no JSON parseado)
- [ ] No hay reminders de toolUseExtraText en los steps
- [ ] El plan (todo_manager) funciona igual

**Pruebas funcionales**:

1. Ejecutar structure_scout con native tool_use
2. Verificar en agentRuns steps:
   - [ ] Tool calls sin reminders de formato
   - [ ] `stopReason` viene del adapter (no de parsing JSON)
   - [ ] Los tool results se devuelven correctamente al modelo
3. Verificar que el scout termina con `status: "completed"` (no `max_turns_exceeded`)
4. Comparar turns usados vs turns con flujo anterior — debe ser menor
5. Verificar que el API payload enviado a Anthropic incluye `tools` parameter (inspeccionar logs de inference)

---

### F1.3: Simplificar secuencia de finalización + manejo de mixed responses

**Objetivo**: Reducir el overhead de finalización de 2-3 turns a 0-1 turn y definir una política clara para respuestas mixtas (texto + tool calls).

**Causa raíz**: CR3

**Archivos**:

- `packages/convex/convex/agents/core/agent_loop.ts` (modificar)

**Prompt**:

```
F1.3: Simplificar secuencia de finalización + manejo de mixed responses

CONTEXTO:
- Hoy el agente necesita 2-3 turns para terminar:
  1. todo_manager (mark all completed)
  2. validate_json (validar output)
  3. {"type":"final","output":{...}} (o auto-finalize)
- Con native tool_use (F1.2), el modelo para naturalmente con end_turn
- Pero el loop exige plan completado + validate_json antes de aceptar

CAMBIO 1: HACER validate_json OPCIONAL
- Si el output final (text cuando stopReason === "end_turn") es JSON válido
  y pasa el validator de schema → aceptar directamente
- validate_json sigue existiendo como tool para que el modelo lo use si quiere
- Pero no es gate obligatorio — el loop valida inline

CAMBIO 2: PLAN COMPLETADO COMO SOFT CHECK
- Si todos los items del plan están completed → ok
- Si hay items pending pero el modelo emitió end_turn con output válido →
  marcar items remaining como "skipped" y aceptar
- Mantener warning en el step si el plan no estaba completo
- Rationale: el modelo decidió que terminó. Forzar más turns por plan
  incompleto a menudo causa loops infinitos.

CAMBIO 3: LIMPIAR PATHS MUERTOS
- Eliminar o simplificar los paths de reminders que ya no aplican con native:
  - finalOutputOnlyReminder → ya no necesario (no hay protocolo JSON)
  - requireValidateJson gate → inline validation
  - Plan completion gate → soft check

CAMBIO 4: POLÍTICA DE RESPUESTAS MIXTAS
- Si llegan tool calls + texto en el mismo turno:
  - Ejecutar tool calls primero
  - Ignorar el texto parcial en ese turno (no validarlo como output final)
  - Registrar un step que indique que hubo texto parcial descartado
- Si stopReason es end_turn y hay texto sin tool calls → tratar como output final normal

RESTRICCIONES:
- Mantener validate_json como tool disponible (el modelo puede elegir usarlo)
- Mantener validación de schema del output final
- NO cambiar plan_manager.ts ni todo_manager.ts
- Los steps de validación se siguen registrando
```

**Validación**:

- [ ] `tsc` convex sin errores
- [ ] Un agente puede terminar en el mismo turn que produce su output final
- [ ] No hay turns perdidos por "plan not completed" cuando el output es válido
- [ ] Validación de schema sigue funcionando inline
- [ ] Steps registran si el plan estaba completo o no
- [ ] Respuestas mixtas no rompen el loop ni se validan como output final

**Pruebas funcionales**:

1. Ejecutar structure_scout y contar turns totales — debe ser ~5-6 (antes ~8)
2. Verificar que no hay steps con reminders de finalización
3. Ejecutar glossary_scout — verificar que termina con output válido
4. Forzar un output inválido (ej: modificar skill para pedir schema imposible) → verificar que la validación inline rechaza y el agente reintenta
5. Verificar que el plan queda como "completed" o "skipped" (no "pending")

---

### F1.4: Validar todos los scouts con native tool_use

**Objetivo**: Ejecutar todos los scouts y el context agent completo para verificar que el stack funciona end-to-end.

**Causa raíz**: CR1, CR3 (validación integral)

**Archivos**: Ninguno (solo testing y ajustes menores si se encuentran bugs)

**Prompt**:

```
F1.4: Validar todos los scouts con native tool_use

CONTEXTO:
- F0.0 paralelizó Phase 1
- F1.0-F1.3 migraron a native tool_use
- Esta fase es solo validación integral, no desarrollo

VALIDAR:
1. structure_scout:
   - Ejecutar solo → completado en < 90s
   - Output tiene repoShape, techStack, tiles, entryPoints
   - Turns usados <= 6

2. glossary_scout:
   - Ejecutar solo → completado en < 120s
   - Output tiene terms con evidence
   - Turns usados <= 6

3. domain_mapper:
   - Ejecutar solo → completado en < 180s
   - Output tiene domains con evidence real
   - Turns usados <= 8

4. feature_scout:
   - Ejecutar solo → completado en < 180s
   - Output tiene features mapped to domains
   - Turns usados <= 8

5. context agent (snapshot completo):
   - Ejecutar generateContextSnapshot
   - Phase 1 paralela (structure + glossary)
   - Phase 2 ejecuta (domain map)
   - Phase 3 ejecuta (features)
   - Status final: "completed"
   - Tiempo total < 5 min

AJUSTES:
- Si algún scout falla consistentemente, ajustar:
  - maxTurns (subir si native es más eficiente y necesita más turns de trabajo)
  - timeoutMs (ajustar a la realidad observada)
  - Skill .md (clarificar instrucciones si el modelo se confunde)
- Documentar ajustes en este documento
```

**Validación**:

- [ ] Los 4 scouts terminan con `status: "completed"`
- [ ] Context agent completo termina con `status: "completed"`
- [ ] Tiempo total < 5 minutos
- [ ] No hay turns desperdiciados en reminders de formato
- [ ] Cada scout produce output que pasa su validator

**Pruebas funcionales**:

1. Ejecutar cada scout individualmente desde Convex dashboard → todos `completed`
2. Ejecutar `generateContextSnapshot` completo → `completed` (no `partial`)
3. Verificar tiempos individuales en agentRuns steps
4. Verificar calidad: outputs tienen evidence de archivos reales del repo
5. Repetir 3 veces → al menos 2 de 3 ejecuciones son `completed` (fiabilidad > 66%)

---

### F2.0: Auto-compaction de mensajes (pinned state)

**Objetivo**: Cuando el contexto crece demasiado, resumir mensajes viejos automáticamente preservando estado crítico del loop.

**Causa raíz**: CR4

**Archivos**:

- `packages/convex/convex/agents/core/compaction.ts` (CREAR)
- `packages/convex/convex/agents/core/agent_loop.ts` (modificar)
- `packages/convex/convex/agents/core/agent_entrypoints.ts` (modificar)

**Prompt**:

```
F2.0: Auto-compaction de mensajes (pinned state)

CONTEXTO:
- El prompt crece linealmente con cada turn (mensajes + tool results)
- Sin compaction, agentes con 8+ turns agotan el budget o el context window
- Referencia: clawdbot/src/agents/pi-embedded-runner/compact.ts

PARTE 1: MÓDULO compaction.ts
- Función compactMessages(messages, adapter, options):
  - Recibe el array de messages actual
  - Preserva: primer mensaje (skill/system), últimos N mensajes (ventana reciente) y mensajes críticos (plan state + validaciones recientes)
  - Los mensajes intermedios se resumen en 1 mensaje sintético
  - El resumen lo genera una llamada LLM separada (con prompt de compaction)
  - Retorna nuevo array de messages compactado
- Options: { preserveLastN: number, maxSummaryTokens: number }
- El prompt de compaction debe ser conciso: "Resume los puntos clave de esta
  conversación de agente, preservando: decisiones tomadas, archivos explorados,
  datos recopilados, errores encontrados"

PARTE 2: INTEGRACIÓN EN agent_loop.ts
- Punto de inserción: después de appendear tool results, antes del siguiente generate
- Trigger: si messages.length > threshold (configurable, default 12)
  O si totalTokens > maxTotalTokens * 0.75
- Cuando se activa: llamar compactMessages, reemplazar messages, registrar step
- Solo compactar una vez por ejecución (flag compactionDone)
- Registrar step tipo "compaction" con metadata: messages_before, messages_after

PARTE 3: CONFIGURACIÓN EN agent_entrypoints.ts
- Añadir al AgentConfig: compaction?: { enabled: boolean, messageThreshold: number, preserveLastN: number }
- Defaults: { enabled: true, messageThreshold: 12, preserveLastN: 4 }
- Cada agente puede override

RESTRICCIONES:
- NO modificar el flujo happy path (solo actuar cuando se acerca al límite)
- NO compactar si messages.length <= threshold
- La llamada LLM de compaction usa el mismo adapter pero con prompt separado
- Preservar siempre el plan actual y validaciones recientes (no compactarlas)
```

**Referencia Clawdbot**:

- `clawdbot/src/agents/pi-embedded-runner/compact.ts`: `compactEmbeddedPiSessionDirect()`
- `clawdbot/src/config/config.compaction-settings.test.ts`: configuración

**Referencia learn-claude-code**:

- `learn-claude-code/articles/上下文缓存经济学.md`: anti-patrones de compaction

**Validación**:

- [ ] `tsc` convex sin errores
- [ ] Compaction se activa solo cuando se supera el threshold
- [ ] Messages compactados preservan skill + últimos N mensajes + estado de plan/validaciones
- [ ] Step "compaction" registrado en agentRuns
- [ ] Agente continúa trabajando después de compaction

**Pruebas funcionales**:

1. Ejecutar domain_mapper (10 turns) en un repo con muchos archivos
2. Verificar en steps que aparece un step "compaction" si se excede threshold
3. Verificar que el agente sigue trabajando correctamente después de la compaction
4. Verificar que el output final es correcto (la compaction no perdió info crítica)
5. Forzar compaction bajando el threshold a 4 → verificar que funciona en agentes cortos

---

### F2.0b: Control de tamaño de outputs de tools

**Objetivo**: Acotar el tamaño de los resultados de tools antes de reinyectarlos al prompt para evitar crecimiento explosivo del contexto.

**Causa raíz**: CR4

**Archivos**:

- `packages/convex/convex/agents/core/tool_registry.ts` (modificar)
- `packages/convex/convex/agents/core/tools/*` (ajustar outputs si aplica)

**Prompt**:

```
F2.0b: Control de tamaño de outputs de tools

CONTEXTO:
- Tool results grandes (list_files, search_code, read_file) se acumulan en messages
- Esto infla el prompt y provoca budget_exceeded aun con compaction

CAMBIO 1: LÍMITE GLOBAL EN tool_registry
- Definir un máximo de bytes/tokens por tool result (ej: 20k chars)
- Si excede: truncar y añadir un sufijo claro indicando truncación

CAMBIO 2: LÍMITES POR TOOL
- Permitir overrides por tool (ej: read_file puede ser mayor que list_files)
- Evitar truncar metadata crítica (ej: rutas/line numbers en search_code)

CAMBIO 3: METADATA DE TRUNCACIÓN
- Incluir en el resultado un campo que indique truncación aplicada (ej: truncated: true, originalSize)
- Registrar un step opcional si hubo truncación fuerte

RESTRICCIONES:
- No cambiar la semántica principal del resultado (mantener estructura JSON)
- Evitar truncar JSON de forma inválida
- Mantener compatibilidad con los validators actuales
```

**Validación**:

- [ ] `tsc` convex sin errores
- [ ] Tool results grandes se truncaron antes de reinyectarse al prompt
- [ ] El resultado sigue siendo JSON válido
- [ ] Se reporta truncación con metadata clara

**Pruebas funcionales**:

1. Ejecutar search_code en un repo grande → verificar truncación y metadata
2. Ejecutar read_file en un archivo grande → verificar límite aplicado
3. Verificar que el agente sigue funcionando con outputs truncados

---

### F2.1: Clasificación de errores y retry con backoff

**Objetivo**: Los errores de `model.generate()` se clasifican y los transitorios se reintentan automáticamente.

**Causa raíz**: Robustez (P2 original)

**Archivos**:

- `packages/convex/convex/agents/core/agent_loop.ts` (modificar catch block)
- `packages/convex/convex/agents/core/agent_run_steps.ts` (modificar)

**Prompt**:

```
F2.1: Clasificación de errores y retry

CONTEXTO:
- Hoy un error en model.generate() termina el loop completo
- No distingue entre rate limit (retryable) y auth failure (terminal)
- Referencia: clawdbot/src/agents/pi-embedded-helpers/errors.ts

PARTE 1: CLASIFICACIÓN
- Crear función classifyError(error): "retryable" | "recoverable" | "terminal"
- retryable: rate limit (429), timeout, server error (5xx), "overloaded"
- recoverable: context overflow (se resuelve con compaction de F2.0)
- terminal: auth failure (401/403), invalid request (400), billing, unknown

PARTE 2: RETRY
- En el catch block de agent_loop:
  - Si retryable y retries < 2: esperar backoff (1s, 3s), reintentar, no incrementar turns
  - Si recoverable y compaction habilitada: triggear compaction, reintentar
  - Si terminal: terminar como hoy
- Registrar cada retry como step con metadata: error, intento, delay

PARTE 3: STEP TYPE
- Nuevo step status: "retry"
- Metadata: { error: string, attempt: number, delayMs: number, classification: string }

RESTRICCIONES:
- Max 2 retries por error (no infinite loop)
- Backoff: 1000ms primer retry, 3000ms segundo
- No reintentar si el agente ya excedió maxTurns o timeout
```

**Referencia Clawdbot**:

- `clawdbot/src/agents/pi-embedded-helpers/errors.ts`: `classifyFailoverReason()`
- `clawdbot/src/agents/failover-error.ts`: `FailoverError`

**Validación**:

- [ ] `tsc` convex sin errores
- [ ] Errores retryable se reintentan (hasta 2 veces)
- [ ] Errores terminal terminan inmediatamente
- [ ] Steps de retry se registran con metadata
- [ ] No hay infinite retry loop

**Pruebas funcionales**:

1. Verificar que `tsc` compila sin errores
2. Simular un rate limit (mock o provocar con calls concurrentes) → verificar retry en steps
3. Verificar que errores terminales (auth) no se reintentan
4. Verificar que el agente completa correctamente después de un retry exitoso

---

### F2.2: Retry con backoff para GitHub API

**Objetivo**: Las llamadas a GitHub API reintentan automáticamente en errores transitorios.

**Causa raíz**: Robustez (P7 original)

**Archivos**:

- `packages/convex/convex/agents/core/tools/github_helpers.ts` (modificar)

**Prompt**:

```
F2.2: Retry con backoff para GitHub API

CONTEXTO:
- github_helpers.ts tiene funciones que hacen fetch a GitHub API
- Errores 429 (rate limit) y 5xx son transitorios
- Hoy estos errores se pasan al modelo como tool error
- El modelo no siempre sabe reintentar

CAMBIO:
- Crear wrapper fetchWithRetry(url, options) que envuelve fetch
- 3 intentos, backoff exponencial: 1s, 2s, 4s
- Retry solo para: 429, 500, 502, 503, 504
- No retry para: 400, 401, 403, 404, 422
- Usar este wrapper en todas las funciones que hacen fetch a GitHub

RESTRICCIONES:
- NO cambiar las firmas de las funciones de tools
- NO cambiar la lógica de los tools individuales
- Solo envolver el fetch subyacente
```

**Validación**:

- [ ] `tsc` convex sin errores
- [ ] Llamadas a GitHub API usan fetchWithRetry
- [ ] Errores 429/5xx se reintentan (hasta 3 veces)
- [ ] Errores 4xx se propagan inmediatamente

**Pruebas funcionales**:

1. Ejecutar un scout que haga read_file → funciona normalmente
2. Verificar que el código de retry está en su lugar (code review)
3. Si es posible, provocar un rate limit con calls concurrentes → verificar retry en logs

---

### F3.0: Tool policies por agente

**Objetivo**: Cada tipo de agente tiene un subset de tools definido, evitando calls incorrectos.

**Causa raíz**: Optimización (P5 original)

**Archivos**:

- `packages/convex/convex/agents/core/agent_entrypoints.ts` (modificar)
- `packages/convex/convex/agents/core/tool_prompt_model.ts` (modificar)
- `packages/convex/convex/agents/core/tool_registry.ts` (modificar)

**Prompt**:

```
F3.0: Tool policies por agente

CONTEXTO:
- Todos los agentes tienen acceso a todos los tools
- Un structure_scout no debería poder llamar delegate
- Referencia: learn-claude-code/v3_subagent.py → AGENT_TYPES + get_tools_for_agent()

PARTE 1: POLICY EN ENTRYPOINTS
- Añadir toolPolicy al AgentConfig: { allow?: string[], deny?: string[] }
- Si allow definido: solo esos tools disponibles (más todo_manager y validate_json siempre)
- Si deny definido: todos excepto esos
- Definir policies por agente según tabla del diagnóstico

PARTE 2: FILTRADO EN tool_prompt_model
- Al construir la lista de tools para generateWithTools:
  filtrar según toolPolicy del agente activo
- Solo enviar tools permitidos al modelo

PARTE 3: ENFORCEMENT EN tool_registry
- Si el modelo llama un tool no permitido (edge case con native):
  retornar error "Tool X not available for this agent"
- No lanzar excepción, retornar como tool result

RESTRICCIONES:
- todo_manager y validate_json siempre disponibles (no filtrables)
- NO cambiar la lógica de ejecución de tools
- Policies son declarativas, no procedurales
```

**Referencia**:

- `learn-claude-code/v3_subagent.py` → `AGENT_TYPES` (~línea 85), `get_tools_for_agent()` (~línea 240)
- `clawdbot/src/agents/tool-policy.ts`: `TOOL_GROUPS`, `TOOL_PROFILES`

**Validación**:

- [ ] `tsc` convex sin errores
- [ ] Cada agente recibe solo sus tools permitidos
- [ ] Tool no permitido retorna error (no crash)
- [ ] todo_manager y validate_json siempre disponibles

**Pruebas funcionales**:

1. Ejecutar structure_scout → verificar que no tiene delegate ni search_code en sus tool calls
2. Verificar en los inference logs que el payload a Anthropic solo incluye los tools permitidos
3. Ejecutar un scout completo → funciona correctamente con subset de tools

---

### F3.1: Model fallback

**Objetivo**: Si el modelo principal falla persistentemente, el agente puede continuar con un modelo alternativo.

**Causa raíz**: Robustez (P3 original)

**Archivos**:

- `packages/convex/convex/agents/core/agent_entrypoints.ts` (modificar)
- `packages/convex/convex/agents/core/agent_loop.ts` (modificar)

**Prompt**:

```
F3.1: Model fallback

CONTEXTO:
- Si el modelo configurado falla (quota, downtime), el agente falla
- Referencia: clawdbot/src/agents/pi-embedded-runner/run.ts (outer loop de failover)

PARTE 1: CONFIGURACIÓN
- Añadir modelFallbacks: string[] al AgentConfig
- Ejemplo: domain_mapper tiene fallbacks: ["claude-sonnet-4-20250514"]
- Los fallbacks se intentan en orden

PARTE 2: INTEGRACIÓN EN agent_loop
- Después de agotar retries (F2.1), si hay fallbacks:
  - Crear nuevo adapter con el modelo fallback
  - Reiniciar el loop con el nuevo adapter
  - Preservar: messages, plan, turns gastados
  - Registrar step "fallback" con metadata: original_model, fallback_model

PARTE 3: LÍMITES
- Max 1 fallback por ejecución (no cascada infinita)
- Si el fallback también falla: terminar con error

RESTRICCIONES:
- NO cambiar el adapter en runtime — crear uno nuevo
- Preservar todo el estado del agente al cambiar de modelo
- Steps de retry y fallback son distintos (retry = mismo modelo, fallback = otro modelo)
```

**Referencia Clawdbot**:

- `clawdbot/src/auto-reply/model.ts`: `extractModelDirective()`
- `clawdbot/src/agents/auth-profiles/order.ts`: `resolveAuthProfileOrder()`
- `clawdbot/src/agents/pi-embedded-runner/run.ts`: outer loop de failover

**Validación**:

- [ ] `tsc` convex sin errores
- [ ] Si modelo principal falla → intenta fallback
- [ ] Step "fallback" registrado con metadata
- [ ] Si fallback también falla → error limpio
- [ ] Mensajes y plan se preservan al cambiar de modelo

**Pruebas funcionales**:

1. Configurar un agente con un modelo inexistente como principal y claude-sonnet como fallback
2. Ejecutar → verificar que falla con principal, hace fallback, y completa con sonnet
3. Verificar steps: retry (del principal) → fallback → tool calls (con sonnet) → completed
4. Verificar que el output final es correcto

---

## Checklist final

Tras completar todas las fases, verificar:

### Fiabilidad

- [ ] Los 4 scouts terminan con `completed` en 3 de 3 ejecuciones
- [ ] Context agent completo termina en < 5 minutos
- [ ] No hay turns desperdiciados en reminders de formato

### Rendimiento

- [ ] Phase 1 es paralela (structure + glossary simultáneos)
- [ ] Turns promedio por scout: 4-6 (no 8-10)
- [ ] Compaction se activa solo cuando es necesario

### Robustez

- [ ] Rate limit en Anthropic → retry automático
- [ ] Rate limit en GitHub → retry automático
- [ ] Modelo principal caído → fallback funciona
- [ ] Context overflow → compaction + continúa

### Observabilidad

- [ ] Todos los events (retry, compaction, fallback) tienen steps en agentRuns
- [ ] Tool calls registrados con input/output
- [ ] Plan visible y actualizado en cada turn

---
