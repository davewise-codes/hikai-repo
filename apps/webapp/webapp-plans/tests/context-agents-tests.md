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
