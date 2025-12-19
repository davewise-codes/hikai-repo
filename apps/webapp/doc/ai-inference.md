## AI Inference en la webapp (ai-test)

Esta guía explica cómo probar agentes Convex desde la webapp y cómo ver las métricas básicas.

### Ruta de prueba
- `/ai-test` (uso interno). Renderiza `AiTestPanel`.

### Flujo
1) Selecciona una organización (y producto opcional) mediante el estado global (`useCurrentOrg` / `useCurrentProduct`).
2) Envía un prompt:
   - La acción `api.agents.actions.chat`/`chatStream` exige `organizationId` o `productId`.
   - Responde con `text`, `threadId` y `usage` (latencia/model/provider en la respuesta; los tokens completos se almacenan en Convex).
3) Telemetría:
   - El agente registra `aiUsage` vía `usageHandler` (tokens, coste, latencia, org/product/user, useCase `ai_test`, agentName).
   - Puedes consultar agregados con las queries `api.lib.aiUsage.*`.

### Contenido del panel
- Estado de streaming ON/OFF.
- ThreadId actual (botón reset).
- Organización/producto activo.
- Respuesta (modo no streaming) o conversación (modo streaming).
- Última métrica básica: provider/model/latencia (los tokens completos se ven en `aiUsage`).
- Manejo de errores sin perder threadId.

### Validación manual
- Con org/product seleccionados: enviar prompt, ver respuesta y threadId.
- Revisar en Convex Dashboard la tabla `aiUsage` y confirmar tokens/coste.
- Opcional: llamar a `api.lib.aiUsage.getOrgUsage` desde un script/console para ver agregados.

### Cuándo usar este panel
- Sanity-check de agentes y telemetría (tokens/latencia/coste).
- No es UI de producción; está pensado para dev/internal.
