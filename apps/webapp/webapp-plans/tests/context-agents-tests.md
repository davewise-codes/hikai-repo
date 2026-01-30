# Context Agents — Bitácora de pruebas

- 2026-01-27: Primera corrida del Context Agent falló por error de esquema (faltaba `completedPhases` en snapshots antiguos). Se borraron snapshots legacy para continuar.
- 2026-01-27: Error en `products` por campo legacy `currentContextSnapshotId`; se limpiaron productos legacy para alinear con el nuevo schema.
- 2026-01-27: UI de progreso no mostraba plan/errores; se añadió visualización de plan en sub‑agents, error message y botón “View JSON” por step para depuración.
- 2026-01-27: Fallos por `todo_manager` con status inválido (`not_started`) y campos (`task/notes`) → se normalizaron inputs en el tool.
- 2026-01-27: `list_files` devolvía vacío cuando `path="."` → se normalizaron paths en tools GitHub.
- 2026-01-27: DomainMap caía por budget → se subió `MAX_TURNS` y `MAX_TOTAL_TOKENS`.
- 2026-01-27: Se reorganizó UI: se eliminó card “Domain map”, se movió trazabilidad al card de progreso, y el snapshot pasó a mostrar outputs por agente + copy JSON.
- 2026-01-27: Se añadió badge “dirty” cuando hay un run más reciente que el snapshot.
- 2026-01-27: Fallos por `tool` vs `name` en toolCalls → parser acepta ambos.
- 2026-01-27: Scouts devolvían `final` sin `validate_json` y fallaban → se añadió recuperación de output en Structure/Glossary + recordatorios estrictos; Feature scout con más budget.
- 2026-01-27: Persistía loop en `todo_manager` con plan completado → el loop ahora fuerza `validate_json`/final si plan está completo y se vuelve a llamar `todo_manager`.
- 2026-01-27: Glossary seguía quedándose en `todo_manager` (plan completado) → se subió `MAX_TURNS` y se añadió recuperación de `final` embebido en rawText (tool_use + final concatenado) para no perder output.
- 2026-01-27: Run estable: Structure + Glossary + Domain Map completan; Feature se omite por guardia de timeout del Context Agent (snapshot partial).
- 2026-01-27: Run quedó “in_progress” con Structure+Glossary completadas (snapshot incluye outputs). Domain/Feature no llegaron a ejecutarse antes del timeout del Context Agent. Se registró snapshot con repoStructure + glossary y status in_progress.
- 2026-01-28: Intento de F1.4 vía script (convex run) falló por DNS en este entorno (`hallowed-meerkat-600.convex.cloud` / `hallowed-meerkat-600.convex.site` no resolvieron). Requiere ejecutar desde máquina con acceso a Convex.
- 2026-01-28: F1.4 desde UI falló con timeout del context agent (600s) porque Convex no pudo bundlear `convex/agents/skills/index.ts` (backticks en template literal rompieron el parse).
- 2026-01-28: F1.4 desde UI (deployment dev `hallowed-meerkat-600`) terminó con timeout del context agent (600s). En UI: Structure Scout = error, Glossary Scout = success, Domain Map = success, Feature Scout = running. Logs de Structure Scout muestran plan inicial todo_manager con todos items en pending (sin in_progress) y uso de toolCalls con campo `tool` (parser lo acepta). Requiere reintentar tras fix de skills index + revisar si el scout avanza a in_progress correctamente.
- 2026-01-28: Regeneración desde UI terminó en timeout del context agent (600s). DomainMap se quedó en el paso "Reading files" (turnos 4-10), con múltiples list_files/read_file sin llegar a draft/validate_json/final.
- 2026-01-28: Tras ajustar schema de todo_manager, los scouts no devolvieron output. Errores: "Structure scout did not return output", "Glossary scout did not return output", "Domain map did not return output".
- 2026-01-28: Investigación de runs fallidos: los agentes repetían `todo_manager` con input `{}` (sin `items`), acumulando errores "todo_manager: items array is required" y agotando `max_turns`. Se ajusta tool_registry para devolver error en lugar de throw en validación de schema y se vuelve a exigir `items` en el schema de todo_manager.
- 2026-01-28: Nuevo intento tras fix: se espera que el modelo reciba error de schema sin abortar el loop y vuelva a enviar `todo_manager.items` correctamente (pendiente de verificación).
- 2026-01-28: Structure scout sigue fallando: repite `todo_manager` con input `{}` y recibe error "Invalid input for todo_manager: $.items is required" en todos los turns hasta agotar maxTurns.
- 2026-01-28: Aun con reminder y ejemplo en tool description, structure_scout siguió enviando `{}` a todo_manager. Se reforzó el reminder para aparecer antes del JSON de resultados y con instrucción explícita de rehacer el call con items.
- 2026-01-28: Para acelerar pruebas, se desactivó structure/domain/feature en contextAgent y se dejó solo glossary_scout (se registran steps como disabled_for_testing).
- 2026-01-28: Glossary scout siguió enviando `{}` a todo_manager y agotó turns. Se añadió mensaje inicial explícito para crear plan con items antes del prompt principal.
- 2026-01-28: Se reemplazó el flujo por un agente único `repoContextAgent` con output `contextDetail` y validación determinista (sin todo_manager/validate_json).
- 2026-01-28: Convex bundling falló por import faltante `validateAndEnrichContext`; se restauró export en contextValidator para compatibilidad con actions.ts.
- 2026-01-28: `convex dev` sin errores y run completo de context agent generó `contextDetail` válido en snapshot.
- 2026-01-28: RepoContextAgent completó en 2 runs, pero hubo errores repetidos de tool input (`read_file` sin path) que no impidieron el final. El output resultó superficial/ruidoso (demasiadas inferencias desde nombres de archivos y sin lectura real), calidad percibida baja pese a completar.
- 2026-01-28: Se añadió recordatorio explícito en agent_loop cuando falla `todo_manager` por missing items, y ejemplo en la descripción del tool para reforzar el uso correcto.
- 2026-01-28: F2.0b implementado: truncado global de outputs de tools con overrides por tool y metadata de truncación en steps. Pendiente ejecutar pruebas funcionales de truncado.
- 2026-01-28: Run context_agent (m978yff2e8neyynyscph916at5803qe5) completó con éxito. Se observa metadata `truncation` en outputs de `list_dirs`/`list_files` (applied=false); no hubo truncación efectiva en esta prueba. Persisten errores de `read_file` por missing path que no bloquean el output final.
- 2026-01-28: F2.0c en curso: se actualizó prompt del RepoContextAgent con reglas evidence-first y checklist mínima; se añadieron skills base (stack-fingerprints, repo-patterns, repo-exploration-checklist). Pendiente validar en run real.
- 2026-01-28: F2.0c prueba falló por timeout. El agente repitió `read_file` con input `{}` (sin `path`) en múltiples turns y alternó con `list_files/list_dirs` sin recuperar. Resultado: budget timeout y validación "Empty output".
- 2026-01-28: Hipótesis de root cause: AI SDK espera tool schema con `parameters` (no `inputSchema`) y toolCalls entregan `input` (no `args`). Ajustado en adapters OpenAI/Anthropic; pendiente re-ejecutar para validar que `read_file` recibe `path`.
- 2026-01-29: Revisión tipos SDK (ai v5): tools esperan `inputSchema` y toolCalls entregan `input`. Se corrigió adapters OpenAI/Anthropic para leer `call.input` y no `args`, y se revirtió tools a `inputSchema`. Pendiente re-test para confirmar que `read_file` recibe `path`.
- 2026-01-29: Se añadió guard de cancelación para evitar escribir steps cuando el run ya no está `running` (appendStep ignora; persistToolSteps/persistCompactionStep retornan si cancelado).
- 2026-01-29: Run exitoso con evidence-first (m977wqfgzwj4x8yf9s29xvf0c9804kwg). `read_file` recibe `path`, se leen README.md, root package.json y apps/webapp/package.json; output incluye `meta.filesRead` y `limitations`. Sin timeouts.
- 2026-01-29: F2.0d en curso: prompt orientado a negocio + nuevo esquema (surfaces/capabilities/journeys/domainLanguage/alignment/technicalSignals) y skills de negocio añadidas. Pendiente run de validación.
- 2026-01-29: Se inyecta baseline real en repoContextAgent y se refuerza prompt para evitar enfoque de template (priorizar src/ y corroborar README). Pendiente nueva ejecución para validar.
- 2026-01-29: Run F2.0d en timeout con validación "Empty output". En steps: list_dirs/list_files raíz, read README.md y package.json, read apps/webapp/package.json, list_files apps/website, read apps/website/package.json, search_code("marketing"). No llegó a leer ningún archivo de `src/` y nunca emitió JSON final antes del timeout. Indica que el prompt empuja exploración pero no fuerza un “stop condition” (emitir output tras leer archivos mínimos en src).
- 2026-01-29: Tras añadir reglas de cierre explícitas en el prompt, nueva ejecución sigue en timeout/Empty output. Steps muestran list_dirs/list_files raíz, read README.md, read package.json, list_dirs apps/webapp (detecta src/), pero no list_files/read_file en src/; se queda en search_code ("progress") y no produce JSON. Indica que las reglas de cierre aún no se cumplen en práctica y el modelo evita escoger/leer un archivo de código.
- 2026-01-30: Se migró `contextDetail` a un schema “clasificador” por dominios: `name`, `purpose`, `capabilities` (keywords), `pathPatterns`, `schemaEntities`, y `structure`. UI actualizada para mostrar estos campos y el bloque de estructura.
- 2026-01-30: RepoContextAgent: compaction desactivada; warning de tiempo al 80% del timeout; límites estrictos de tool calls/read_file; prompt orientado a dominios + schemaEntities + pathPatterns. Herramientas GitHub con cache (tree/file/connection) y search_code optimizado (GitHub code search + fallback; brace globs). Sin timeouts en el último run.
- 2026-01-30: Resumen de últimas pruebas (context agent):

  ┌────────────────────┬──────────┬──────────┬────────────┐
  │       Prueba       │ Duración │ Dominios │ Tool calls │
  ├────────────────────┼──────────┼──────────┼────────────┤
  │ Inicial (timeout)  │ >600s    │ 0        │ 37+        │
  ├────────────────────┼──────────┼──────────┼────────────┤
  │ Después de límites │ 554s     │ 4        │ 28         │
  ├────────────────────┼──────────┼──────────┼────────────┤
  │ Optimizada         │ 167s     │ 5        │ 8          │
  ├────────────────────┼──────────┼──────────┼────────────┤
  │ Anterior           │ 186s     │ 3        │ 8          │
  ├────────────────────┼──────────┼──────────┼────────────┤
  │ Esta               │ 186s     │ 6        │ 8          │
  └────────────────────┴──────────┴──────────┴────────────┘
