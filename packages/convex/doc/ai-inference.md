# IA Inference en Convex (Agentes + Telemetría)

Esta guía resume cómo usamos Convex Agent Component para inferencias IA, cómo registramos telemetría y cuándo usar Agent versus el puerto LLM directo.

## Arquitectura actual

- **Agente**: `Hello World Agent` (`packages/convex/convex/agents/helloWorldAgent.ts`), basado en Convex Agent Component. Usa `usageHandler` para capturar `usage` (tokens/latencia) en cada llamada.
- **Actions**: `chat` y `chatStream` (`packages/convex/convex/agents/actions.ts`) exigen `organizationId` o `productId`, resuelven acceso vía `assertOrgAccessInternal`/`assertProductAccessInternal` y delegan en el agente. Devuelven `threadId` y métricas mínimas.
- **Telemetría**: tabla `aiUsage` en `schema.ts` + helpers `recordUsage`/`recordError` (`packages/convex/convex/ai/telemetry.ts`). `usageHandler` guarda tokens, coste estimado, latencia, org/product/user, useCase, agentName, threadId, metadata.
- **Consultas**: `getOrgUsage`, `getProductUsage`, `getUsageByUseCase` (`packages/convex/convex/lib/aiUsage.ts`) para agregados de uso.

## Flujo de instrumentación (Agent)

1. **Contexto obligatorio**: las actions deben recibir `organizationId` o `productId`; se valida acceso antes de invocar el agente.
2. **Llamada al agente**: `generateText`/`streamText` reciben contexto enriquecido (org/product/user, prompt, startMs).
3. **usageHandler**: se dispara en cada llamada LLM y persiste métricas en `aiUsage` via `recordUsage` (tokensIn/out/total, modelo/proveedor, latencia, useCase/agentName/threadId/metadata).
4. **Errores**: las actions capturan excepciones y llaman `recordError` con provider/model/errorMessage y contexto.

## Cuándo usar Agent vs puerto LLM

- **Usa Agent (Convex)**: si necesitas threads persistidos, streaming por websockets, tool-calls o contexto automático. Ej.: intérprete de timeline, agentes conversacionales.
- **Usa puerto LLM (`createLLMAdapter`)**: para inferencias puntuales sin estado/threads, donde quieras costes/tokens directos y menor acoplamiento. Ej.: enriquecimiento batch, jobs offline, utilidades internas.
- Si en un futuro Convex Agent expone `usage` siempre, priorizar Agent para casos interactivos. Mantén el puerto LLM para tareas sin threads y para poder cambiar de proveedor fácilmente.

## Telemetría: campos clave

- Contexto: `organizationId`, `productId?`, `userId`, `useCase`, `agentName`, `threadId?`.
- Modelo: `provider` (ej. `openai.chat`), `model` (ej. `gpt-4o-mini`).
- Métricas: `tokensIn`, `tokensOut`, `totalTokens`, `latencyMs`, `estimatedCostUsd` (calculado en `recordAIUsage`).
- Estado: `status`, `errorMessage?`, `metadata` (ej. `{ source: "ai-test" }`), `createdAt`.

## Validación rápida

- Invoca `api.agents.actions.chat` con `organizationId` (y `productId` opcional). Revisa `aiUsage` en el dashboard: deberías ver tokens y coste.
- Queries de agregados:
  - `api.lib.aiUsage.getOrgUsage({ organizationId, startDate?, endDate? })`
  - `api.lib.aiUsage.getProductUsage({ productId, startDate?, endDate? })`
  - `api.lib.aiUsage.getUsageByUseCase({ organizationId, productId?, useCase, startDate?, endDate? })`

## Rutas relevantes

- `packages/convex/convex/agents/helloWorldAgent.ts` — agente + usageHandler.
- `packages/convex/convex/agents/actions.ts` — actions con acceso y telemetría.
- `packages/convex/convex/ai/telemetry.ts` — helpers `recordUsage`/`recordError`.
- `packages/convex/convex/lib/aiUsage.ts` — consultas de uso agregadas.
- `packages/convex/convex/schema.ts` — tabla `aiUsage`.

## Notas y próximos pasos

- Si Convex publica mejoras de usage tracking, mantener el agente en la última versión.
- Para casos sin threads, usar `createLLMAdapter` (`packages/convex/convex/ai/config.ts`) como vía directa.
- Documentar en PRs el `useCase` y `agentName` al añadir nuevos agentes/actions para mantener trazabilidad.
