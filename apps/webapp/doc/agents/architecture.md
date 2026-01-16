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
+----------------+
| Final output   |
+----------------+
```

## Notas

- El loop itera hasta `stopReason: end` o `maxTurns`.
- Las tools se registran por agente (factories con closure).
- Las tools son ejecutables en runtime, no stubs.
