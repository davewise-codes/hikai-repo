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
│ clawdbot/src/agents/tool-policy.ts │ TOOL_GROUPS (agrupaciones semánticas de tools), TOOL_PROFILES (conjuntos predefinidos), expandToolGroups() — cómo se resuelven aliases como "file_tools" → ["read", "write", "edit"] │
├────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/agents/pi-tools.policy.ts │ Enforcement: cómo se aplican las policies en la creación de tools. Capas: global → agent → model → profile → group → sandbox. Cada capa puede override │
├────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ clawdbot/src/config/group-policy.ts │ resolveToolsBySender(), resolveChannelGroupToolsPolicy() — policies contextuales (por canal, por grupo). Equivalente a nuestro "por tipo de agente" │
└────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
Patrón learn-claude-code: Filtering por tipo de agente (más simple).
┌───────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Archivo │ Qué mirar │
├───────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ learn-claude-code/v3_subagent.py → AGENT_TYPES (~línea 85) │ Definición directa: "explore": ["bash", "read_file"], "code": "_", "plan": ["bash", "read_file"]. Simple, declarativo, por tipo │
├───────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ learn-claude-code/v3_subagent.py → get_tools_for_agent() (~línea 240) │ Resolución: "_" → all tools, lista explícita → filtrar BASE_TOOLS por nombre. 8 líneas. Este patrón simple es suficiente para nuestro caso │
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
