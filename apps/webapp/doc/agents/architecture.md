# Agents Architecture - Loop

Diagrama base del loop de agente con tools ejecutables.

```
+----------------+          +--------------------+
| User prompt    |          | Tools (runtime)    |
+-------+--------+          +---------+----------+
        |                             ^
        v                             |
+----------------+    tool_calls   +--+----------------+
| Agent Loop     +---------------->+ executeToolCall   |
| (maxTurns)     |                 +--+----------------+
+-------+--------+                    |
        |                              |
        v                              |
+----------------+    results     +---+---------------+
| Model          +<---------------+ ToolResult[]      |
| (LLM)          |                +-------------------+
+-------+--------+
        |
        v
+----------------+          +------------------+
| Validation     +<---------+ Final output     |
+-------+--------+          +------------------+
        |
        v
+----------------+
| Loop control   |
| (budget)       |
+----------------+
```

## Notas

- El loop itera hasta `stopReason: end`, `maxTurns` o `maxTotalTokens`.
- Si la validacion falla, el agente recibe feedback y reintenta.
- El modelo decide tool_use vs final en cada turno.
- Las tools se registran por agente (factories con closure).
- Las tools son ejecutables en runtime, no stubs.

## Subagentes (delegate tool)

Diagrama de ejecucion de subagentes con runs anidados.

```
+--------------------+        delegate        +----------------------+
| Parent Agent Loop  +----------------------->+ Sub-agent Entrypoint |
| (domain map)       |                        | (skill + config)     |
+---------+----------+                        +----------+-----------+
          |                                               |
          |                                               v
          |                                    +----------------------+
          |                                    | Sub-agent Loop       |
          |                                    | (maxTurns <= 5)      |
          |                                    +----------+-----------+
          |                                               |
          v                                               v
+--------------------+                        +----------------------+
| agentRuns (parent) |<-----------------------+ agentRuns (child)    |
| steps + outputs    |   parentRunId linkage  | steps + outputs      |
+--------------------+                        +----------------------+
```

- Cada subagente crea su propio `agentRuns` con `parentRunId`.
- El parent agrega el resultado del subagente como output de tool.
- AgentProgress muestra la lista de sub-runs con detalle expandible.
