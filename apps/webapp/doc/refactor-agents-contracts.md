# Refactor Agents - Contratos F0.0 (Actualizado)

Documento consolidado del planteamiento base para agentes autonomos.
Reemplaza el contenido anterior y evita duplicacion con docs nuevas.

Referencias:
- apps/webapp/doc/agents/tools.md
- apps/webapp/doc/agents/domain-map.md

---

## Alcance

- Definir contratos y criterios minimos de autonomia.
- Definir mitigaciones tecnicas obligatorias.
- Definir convenciones de paths para el refactor.
- Validar coherencia documental antes de tocar codigo.

---

## Contratos de tools

Ver detalle en `apps/webapp/doc/agents/tools.md`.

Puntos clave:
- Interface `ToolDefinition` se mantiene: `execute(input)` sin ctx.
- Patron closure: factories `createTool(ctx, productId) -> ToolDefinition`.
- Tool inexistente debe retornar `ToolResult` con `error` (fail fast).

---

## Contratos de Domain Map

Ver schema, taxonomia y reglas en `apps/webapp/doc/agents/domain-map.md`.

Restriccion de superficies:
- Solo usar señales de sources clasificados como `product_front` y `platform`.
- Ignorar marketing, admin u observabilidad para el domain map.

---

## Criterios de autonomia (minimo)

1. El agente realiza >= 1 tool call antes de generar output.
2. Si la validacion falla, reintenta (no falla inmediatamente).
3. Termina con status != `max_turns_exceeded`.

Metricas a capturar:
- Turns usados vs maxTurns.
- Tool calls por turn.
- Validation passes/failures.

---

## Mitigaciones obligatorias

- Pagination en tools (limit, cursor).
- Timeout y budget: maxTurns 10, timeoutMs 480000.
- Outputs grandes (> 10KB): guardar en storage y referenciar en logs.

---

## Subagentes como principio base

Todo agente debe registrar entrypoint invocable en `agent_entrypoints.ts`:

```
{
	name: string
	skill: SkillDefinition
	defaultConfig: AgentConfig
}
```

---

## Convenciones de paths

| Ruta | Proposito |
| --- | --- |
| agents/core/tools/ | Factories de tools ejecutables |
| agents/skills/source/ | Skills .md fuente (nuevos) |
| agents/skills/*.skill.md | Skills legacy (no mover) |
| agents/skills/index.ts | Registry compilado |
| agents/actions/ | Actions por dominio |
| agents/actions/index.ts | Re-exports publicos |
| agents/core/validators/ | Funciones de validacion |
| agents/core/agent_entrypoints.ts | Registry de agentes invocables |

---

## Validacion documental (checklist F0.0)

- [ ] Contratos de tools definidos y documentados.
- [ ] Schema de domain map documentado.
- [ ] Criterios de autonomia especificados.
- [ ] Mitigaciones acordadas.
- [ ] Requisito de entrypoint por agente documentado.
- [ ] Docs creados en `apps/webapp/doc/agents/`.

---

## Nota de compatibilidad

Este documento sustituye la version anterior con contratos legacy.
