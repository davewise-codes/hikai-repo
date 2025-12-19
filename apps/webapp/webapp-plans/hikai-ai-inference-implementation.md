## Prompt de partida

- Vamos a implementar un mecanismo de inferencia IA
- Nos va a permitir que algunos procesos de Hikai utilicen LLMs
- Puedes ver todo el contexto de hikai apps/webapp/webapp-plans/hikai_resumen_arquitectura.md
- y la arquitectura en apps/webapp/webapp-plans/hikai-architecture.md
- asta ahora hemos generado el timeline, pero la interpretación de eventos, está basada en una eurística y no en un agente
- la idea es cambiar eso y que sea un agente de IA el que interprete los eventos para que genere un timeline con más impacto funcional
- pero antes de eso hay que generar una arquitectura que nos facilite hacer inferencias IA dónde queramos
- nos vamos a basar en las capacidades de convex para eso
- en este documento hay una primera propuesta: apps/webapp/webapp-plans/ai-inference-architecture.md
- no estoy muy convencido. analizala y propón una tuya propia con las mejoras que consideres
- el plan de implementación lo definireemos al estilo de otros que ya hemos realizado
- por ejemplo: apps/webapp/webapp-plans/phase-2-timeline-sync.md
- este plan tiene:
  - todo el contexto
  - prompts por fases
  - reglas del repo
  - modleo de trabajo para la implementación
  - un prompt que arranca cada fase
  - un cuadro de progreso
- escribiremos todo el contexto de tu propuesta en el documento, a continuación del texto que ya haya escrito
- la primera fase siempre será implenmentar el ejemplo de agentes de convex de la manera más fidedigna posible a como plantea la docu oficial, para asegurar que este funciona y lo entendemos

---

# Implementación de Infraestructura de Inferencia IA con Convex Agents

## Contexto

Este documento define el plan de implementación para la infraestructura de inferencia IA de Hikai usando el Convex Agent Component oficial. El objetivo es crear un sistema escalable, observable y fácil de extender que permita a las distintas funcionalidades de Hikai solicitar respuestas de LLMs.

**Propuesta de arquitectura original**: `apps/webapp/webapp-plans/ai-inference-architecture.md`

**Documentación de referencia**:

- `apps/webapp/webapp-plans/hikai-architecture.md` — Arquitectura técnica
- `apps/webapp/webapp-plans/Hikai_resumen_arquitectura.md` — Visión de negocio
- `apps/webapp/webapp-plans/phase-2-timeline-sync.md` — Formato de plan (ejemplo)
- `CLAUDE.md` — Reglas del repositorio
- [Convex Agents Docs](https://docs.convex.dev/agents)
- [Getting Started](https://docs.convex.dev/agents/getting-started)
- [GitHub Repo](https://github.com/get-convex/agent)
- [AI Agents Tutorial](https://stack.convex.dev/ai-agents)

---

## Principios Arquitectónicos

1. **Convex Agent Component como base** — Usar el componente oficial, no reinventar
2. **Arquitectura hexagonal para LLM** — Puerto abstracto + adaptadores por proveedor
3. **Telemetría first-class** — Tracking granular desde el día 0 (por org/producto/caso de uso)
4. **Fallback a heurística** — Si IA falla, la heurística actual sigue funcionando
5. **Configuración por entorno** — Modelo/proveedor configurable sin cambios de código
6. **Debug opcional** — Flag para logging completo de prompts/respuestas en dev/staging

---

## Estructura de Archivos

```
packages/convex/
├── convex.config.ts              # Registrar agent component
└── convex/
    ├── agents/
    │   ├── index.ts              # Registro y export de agentes
    │   ├── echoAgent.ts          # Agente echo (MVP)
    │   ├── interpreterAgent.ts   # Agente de interpretación (futuro)
    │   └── tools/
    │       ├── index.ts          # Export de tools
    │       ├── productContext.ts # Tool: obtener contexto del producto
    │       └── timeline.ts       # Tool: acceder a eventos raw
    ├── ai/
    │   ├── config.ts             # Configuración de modelos (hexagonal)
    │   ├── ports/
    │   │   └── llmPort.ts        # Interfaz abstracta del LLM
    │   ├── adapters/
    │   │   ├── openai.ts         # Adaptador OpenAI
    │   │   └── anthropic.ts      # Adaptador Anthropic
    │   ├── prompts/
    │   │   ├── index.ts          # Registry de prompts
    │   │   ├── echo.ts           # Prompt del echo agent
    │   │   └── interpreter.ts    # Prompt del interpreter (futuro)
    │   └── telemetry.ts          # Helpers de tracking
    ├── lib/
    │   └── aiUsage.ts            # Queries/mutations de uso de IA
    └── schema.ts                 # + tabla aiUsage
```

---

## Progreso

| Subfase | Descripción                                         | Estado        |
| ------- | --------------------------------------------------- | ------------- |
| F0.1    | Instalar dependencias y configurar convex.config.ts | ✅ Completado |
| F0.2    | Crear agente "hello world" con OpenAI               | ✅ Completado |
| F0.3    | Exponer action para invocar el agente               | ✅ Completado |
| F0.4    | UI mínima en webapp para probar                     | ✅ Completado |
| F0.5    | Validar streaming y threads                         | ✅ Completado |
| F1.1    | Schema aiUsage con índices                          | ✅ Completado |
| F1.2    | Puerto abstracto LLM (llmPort.ts)                   | ✅ Completado |
| F1.3    | Adaptador OpenAI                                    | ✅ Completado |
| F1.4    | Adaptador Anthropic                                 | ✅ Completado |
| F1.5    | Config selector de proveedor                        | ✅ Completado |
| F1.6    | Helpers de telemetría con flag debug                | ✅ Completado |
| F1.7    | Queries de uso de IA (por org/producto/caso)        | ✅ Completado  |
| F2.1    | Telemetría E2E con agente actual (chat ai-test)     | ✅ Completado  |
| F2.2    | UI ai-test mostrando thread/usage y flujos de error | ✅ Completado  |
| F2.3    | Validación y documentación de consultas de uso      | ✅ Completado  |
| F3.1    | Prompt + schema de contexto de producto             | ⏳ Pendiente  |
| F3.2    | Agent/action de enriquecimiento de contexto         | ⏳ Pendiente  |
| F3.3    | UI de producto consumiendo contexto enriquecido     | ⏳ Pendiente  |
| F4.1    | Prompt + schema del intérprete de timeline          | ⏳ Pendiente  |
| F4.2    | Agent/action de interpretación de eventos           | ⏳ Pendiente  |
| F4.3    | Validaciones de plan, fallback y UI de timeline     | ⏳ Pendiente  |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Prompt para Arrancar Subfases

```
- En apps/webapp/webapp-plans/hikai-ai-inference-implementation.md puedes ver el plan
- Vamos a proceder con la siguiente subfase pendiente
- Usa el prompt de esa subfase como instrucción completa
- Comparte el plan de implementación antes de ejecutar cambios
- No hagas asunciones, compárteme dudas y las debatimos antes de empezar el desarrollo
- Asegúrate de que cumples las reglas del repo al desarrollar
- No hagas commit hasta confirmar pruebas OK
- Una vez validado haz commit y actualiza el progreso en el documento
- Tras terminar de desarrollar cada subfase, indícame las pruebas funcionales con las que puedo validar la fase antes del commit
- Máxima capacidad de ultrathink
```

---

## Instrucciones Generales

### Reglas del Repo

- Seguir `CLAUDE.md` estrictamente
- Componentes UI de `@hikai/ui`
- Iconos de `@hikai/ui` (no lucide-react directo)
- Tokens de diseño de `packages/ui/src/tokens/`

### Backend (Convex)

- Validar acceso: `assertProductAccess(ctx, productId)` o `assertOrgAccess(ctx, orgId)`
- Seguir patrones de `organizations/` y `products/`
- Índices para queries frecuentes
- Usar `@convex-dev/agent` para definir agentes
- Telemetría en cada invocación de agente

### Variables de Entorno

```env
# Proveedor por defecto
AI_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic (opcional)
ANTHROPIC_API_KEY=sk-ant-...

# Debug (opcional) - logging completo de prompts/respuestas
AI_DEBUG_LOG_CONTENT=false
```

### Commits

- Un commit por subfase completada
- Formato: `feat(convex): [F0.X] descripción` o `feat(webapp): [F0.X] descripción`
- NO commit hasta pruebas OK

---

## Fase 0: Ejemplo Canónico de Convex Agents

**Objetivo**: Implementar el ejemplo oficial de Convex Agents para validar que funciona y entender el componente. Incluye UI mínima.

---

### F0.1: Instalar Dependencias y Configurar convex.config.ts

**Objetivo**: Configurar el Convex Agent Component en el proyecto.

**Archivos**:

- `packages/convex/package.json` — Añadir dependencias
- `packages/convex/convex.config.ts` — Crear archivo de configuración

**Prompt**:

```
F0.1: Instalar dependencias y configurar convex.config.ts

PARTE 1: DEPENDENCIAS
- Añadir a packages/convex/package.json las siguientes dependencias:
  - "@convex-dev/agent": "latest"
  - "@ai-sdk/openai": "latest"
  - "@ai-sdk/anthropic": "latest"
  - "ai": "latest"
- Ejecutar pnpm install desde la raíz del monorepo

PARTE 2: CONFIGURACIÓN
- Crear packages/convex/convex.config.ts con el contenido:
  import { defineApp } from "convex/server";
  import agent from "@convex-dev/agent/convex.config";

  const app = defineApp();
  app.use(agent);

  export default app;

PARTE 3: GENERAR CÓDIGO
- Ejecutar npx convex dev en packages/convex para generar el código del componente
- Verificar que se generan los tipos en _generated/

PARTE 4: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
- Verificar que no hay errores de compilación
```

**Validación**:

- [ ] Dependencias instaladas en package.json
- [ ] convex.config.ts creado con agent component registrado
- [ ] Código generado sin errores
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F0.2: Crear Agente "Hello World" con OpenAI

**Objetivo**: Crear un agente mínimo que responda a prompts usando OpenAI.

**Archivos**:

- `packages/convex/convex/agents/index.ts` — Nuevo archivo
- `packages/convex/convex/agents/helloWorldAgent.ts` — Nuevo archivo

**Prompt**:

```
F0.2: Crear agente hello world con OpenAI

PARTE 1: ESTRUCTURA DE CARPETAS
- Crear carpeta packages/convex/convex/agents/

PARTE 2: DEFINIR AGENTE
- Crear packages/convex/convex/agents/helloWorldAgent.ts:
  import { Agent } from "@convex-dev/agent";
  import { openai } from "@ai-sdk/openai";
  import { components } from "../_generated/api";

  export const helloWorldAgent = new Agent(components.agent, {
    name: "Hello World Agent",
    chat: openai.chat("gpt-4o-mini"),
    instructions: "You are a helpful assistant. Respond concisely and friendly.",
  });

PARTE 3: EXPORTAR
- Crear packages/convex/convex/agents/index.ts:
  export { helloWorldAgent } from "./helloWorldAgent";

PARTE 4: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
- Verificar que el agente se define sin errores

NOTA: Este es un agente mínimo siguiendo el quickstart oficial de Convex Agents.
Referencia: https://docs.convex.dev/agents/getting-started
```

**Validación**:

- [ ] Carpeta agents/ creada
- [ ] helloWorldAgent.ts con definición del agente
- [ ] index.ts con exports
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F0.3: Exponer Action para Invocar el Agente

**Objetivo**: Crear una action que permita invocar el agente desde el frontend.

**Archivos**:

- `packages/convex/convex/agents/actions.ts` — Nuevo archivo
- `packages/convex/convex/agents/index.ts` — Actualizar exports

**Prompt**:

```
F0.3: Exponer action para invocar el agente

PARTE 1: CREAR ACTION
- Crear packages/convex/convex/agents/actions.ts:
  import { v } from "convex/values";
  import { action } from "../_generated/server";
  import { helloWorldAgent } from "./helloWorldAgent";
  import { createThread } from "@convex-dev/agent";
  import { components } from "../_generated/api";

  export const chat = action({
    args: {
      prompt: v.string(),
      threadId: v.optional(v.string()),
    },
    handler: async (ctx, { prompt, threadId }) => {
      // Crear thread si no existe
      let tid = threadId;
      if (!tid) {
        const result = await createThread(ctx, components.agent);
        tid = result.threadId;
      }

      // Invocar agente
      const result = await helloWorldAgent.generateText(ctx, { threadId: tid }, { prompt });

      return {
        text: result.text,
        threadId: tid,
      };
    },
  });

PARTE 2: ACTUALIZAR EXPORTS
- Actualizar packages/convex/convex/agents/index.ts:
  export { helloWorldAgent } from "./helloWorldAgent";
  export { chat } from "./actions";

PARTE 3: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
- Probar la action desde Convex Dashboard si es posible

NOTA: Esta action es pública por ahora (sin assertOrgAccess).
En F2.4 añadiremos validación de acceso.
```

**Validación**:

- [ ] actions.ts creado con action `chat`
- [ ] Action crea thread y genera respuesta
- [ ] Retorna text y threadId
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F0.4: UI Mínima en Webapp para Probar

**Objetivo**: Crear una UI simple para probar el agente desde la webapp.

**Archivos**:

- `apps/webapp/src/routes/ai-test.tsx` — Nueva ruta de prueba
- `apps/webapp/src/domains/core/components/ai-test-panel.tsx` — Nuevo componente

**Prompt**:

```
F0.4: UI mínima en webapp para probar

PARTE 1: COMPONENTE DE PRUEBA
- Crear apps/webapp/src/domains/core/components/ai-test-panel.tsx:
  - Input de texto para el prompt
  - Botón para enviar
  - Área de texto para mostrar la respuesta
  - Estado de loading/error
  - Usar componentes de @hikai/ui (Input, Button, Card, Textarea)
  - Usar useAction de convex/react para llamar a api.agents.chat

PARTE 2: RUTA DE PRUEBA
- Crear apps/webapp/src/routes/ai-test.tsx:
  - Ruta simple que renderiza AiTestPanel
  - Sin AppShell (es una página de prueba interna)
  - Mostrar mensaje "AI Test - Internal Only"

PARTE 3: i18n (opcional)
- Si usas textos, añadirlos a locales/en/common.json y es/common.json

PARTE 4: VALIDACIÓN
- pnpm --filter @hikai/webapp exec tsc --noEmit
- Navegar a /ai-test en la webapp
- Verificar que se puede enviar un prompt y recibir respuesta
```

**Validación**:

- [ ] Componente AiTestPanel creado con Input, Button, área de respuesta
- [ ] Ruta /ai-test accesible
- [ ] Se puede enviar prompt y ver respuesta
- [ ] Loading y error states funcionan
- [ ] Solo componentes de @hikai/ui
- [ ] `pnpm --filter @hikai/webapp exec tsc --noEmit` pasa

---

### F0.5: Validar Streaming y Threads

**Objetivo**: Verificar que streaming y persistencia de threads funcionan correctamente.

**Archivos**:

- `packages/convex/convex/agents/actions.ts` — Añadir action de streaming
- `apps/webapp/src/domains/core/components/ai-test-panel.tsx` — Añadir soporte streaming

**Prompt**:

```
F0.5: Validar streaming y threads

PARTE 1: ACTION CON STREAMING
- Añadir a packages/convex/convex/agents/actions.ts:
  export const chatStream = action({
    args: {
      prompt: v.string(),
      threadId: v.optional(v.string()),
    },
    handler: async (ctx, { prompt, threadId }) => {
      let tid = threadId;
      if (!tid) {
        const result = await createThread(ctx, components.agent);
        tid = result.threadId;
      }

      // Usar streamText para streaming
      const stream = await helloWorldAgent.streamText(ctx, { threadId: tid }, { prompt });

      // Convex Agent maneja el streaming via websockets
      return {
        threadId: tid,
        // El resultado se recibe via subscription al thread
      };
    },
  });

PARTE 2: UI CON STREAMING
- Actualizar AiTestPanel para:
  - Toggle entre modo normal y streaming
  - En modo streaming, usar useQuery para subscribirse a mensajes del thread
  - Mostrar mensajes en tiempo real conforme llegan
  - Referencia: https://docs.convex.dev/agents/getting-started#streaming

PARTE 3: VALIDAR PERSISTENCIA
- Verificar que:
  - Al enviar un segundo mensaje con el mismo threadId, el agente tiene contexto
  - Los mensajes persisten y se pueden ver en Convex Dashboard

PARTE 4: VALIDACIÓN
- pnpm --filter @hikai/webapp exec tsc --noEmit
- pnpm --filter @hikai/convex exec tsc --noEmit
- Probar streaming en la UI
- Probar continuidad de conversación con mismo threadId
```

**Validación**:

- [ ] Action chatStream creada
- [ ] UI muestra texto en streaming
- [ ] Conversación persiste con mismo threadId
- [ ] Contexto se mantiene entre mensajes
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa
- [ ] `pnpm --filter @hikai/webapp exec tsc --noEmit` pasa

---

## Fase 1: Infraestructura Base

**Objetivo**: Schema de telemetría, arquitectura hexagonal, helpers de configuración.

---

### F1.1: Schema aiUsage con Índices

**Objetivo**: Crear la tabla de telemetría para tracking de uso de IA.

**Archivos**:

- `packages/convex/convex/schema.ts` — Añadir tabla aiUsage

**Prompt**:

```
F1.1: Schema aiUsage con índices

PARTE 1: AÑADIR TABLA
- En packages/convex/convex/schema.ts, añadir la tabla aiUsage:
  aiUsage: defineTable({
    // Contexto
    organizationId: v.id("organizations"),
    productId: v.optional(v.id("products")), // Opcional para casos org-level
    userId: v.id("users"),

    // Identificación
    useCase: v.string(),          // "echo", "timeline_interpretation", etc.
    agentName: v.string(),        // Nombre del agente
    threadId: v.optional(v.string()), // Thread de Convex Agent

    // Modelo
    provider: v.string(),         // "openai", "anthropic"
    model: v.string(),            // "gpt-4o-mini", "claude-3-haiku"

    // Métricas
    tokensIn: v.number(),
    tokensOut: v.number(),
    totalTokens: v.number(),
    latencyMs: v.number(),
    estimatedCostUsd: v.number(),

    // Estado
    status: v.union(v.literal("success"), v.literal("error")),
    errorMessage: v.optional(v.string()),

    // Debug (opcional, controlado por flag)
    promptSnapshot: v.optional(v.string()),
    responseSnapshot: v.optional(v.string()),

    // Metadata adicional
    metadata: v.optional(v.any()),

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_month", ["organizationId", "createdAt"])
    .index("by_product", ["productId"])
    .index("by_product_month", ["productId", "createdAt"])
    .index("by_usecase", ["useCase", "createdAt"])
    .index("by_org_product_usecase", ["organizationId", "productId", "useCase"])
    .index("by_user", ["userId", "createdAt"]),

PARTE 2: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
- Ejecutar npx convex dev para aplicar el schema
```

**Validación**:

- [ ] Tabla aiUsage añadida con todos los campos
- [ ] Índices creados para queries frecuentes
- [ ] Schema aplicado sin errores
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F1.2: Puerto Abstracto LLM (llmPort.ts)

**Objetivo**: Definir la interfaz abstracta para proveedores LLM (arquitectura hexagonal).

**Archivos**:

- `packages/convex/convex/ai/ports/llmPort.ts` — Nuevo archivo

**Prompt**:

```
F1.2: Puerto abstracto LLM (llmPort.ts)

PARTE 1: CREAR ESTRUCTURA
- Crear carpeta packages/convex/convex/ai/
- Crear carpeta packages/convex/convex/ai/ports/

PARTE 2: DEFINIR INTERFAZ
- Crear packages/convex/convex/ai/ports/llmPort.ts:
  /**
   * Puerto abstracto para proveedores LLM
   * Arquitectura hexagonal: permite cambiar proveedor sin modificar lógica de negocio
   */

  export interface LLMGenerateParams {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }

  export interface LLMGenerateResult {
    text: string;
    tokensIn: number;
    tokensOut: number;
    totalTokens: number;
    model: string;
    provider: string;
    latencyMs: number;
  }

  export interface LLMPort {
    /**
     * Genera texto a partir de un prompt
     */
    generateText(params: LLMGenerateParams): Promise<LLMGenerateResult>;

    /**
     * Información del proveedor
     */
    getProviderInfo(): { name: string; model: string };
  }

  /**
   * Precios por 1M tokens (para estimación de costes)
   * Actualizar según cambios de proveedores
   */
  export const TOKEN_PRICES: Record<string, { input: number; output: number }> = {
    "gpt-4o-mini": { input: 0.15, output: 0.60 },
    "gpt-4o": { input: 5.00, output: 15.00 },
    "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
    "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00 },
  };

  /**
   * Calcula coste estimado en USD
   */
  export function estimateCost(
    model: string,
    tokensIn: number,
    tokensOut: number
  ): number {
    const prices = TOKEN_PRICES[model] ?? { input: 0, output: 0 };
    return (tokensIn * prices.input + tokensOut * prices.output) / 1_000_000;
  }

PARTE 3: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
```

**Validación**:

- [ ] Carpeta ai/ports/ creada
- [ ] Interfaz LLMPort definida con generateText y getProviderInfo
- [ ] Tipos LLMGenerateParams y LLMGenerateResult exportados
- [ ] Helper estimateCost implementado
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F1.3: Adaptador OpenAI

**Objetivo**: Implementar el adaptador para OpenAI siguiendo la interfaz LLMPort.

**Archivos**:

- `packages/convex/convex/ai/adapters/openai.ts` — Nuevo archivo
- `packages/convex/convex/ai/adapters/index.ts` — Nuevo archivo

**Prompt**:

```
F1.3: Adaptador OpenAI

PARTE 1: CREAR ESTRUCTURA
- Crear carpeta packages/convex/convex/ai/adapters/

PARTE 2: IMPLEMENTAR ADAPTADOR
- Crear packages/convex/convex/ai/adapters/openai.ts:
  import { generateText } from "ai";
  import { openai } from "@ai-sdk/openai";
  import { LLMPort, LLMGenerateParams, LLMGenerateResult, estimateCost } from "../ports/llmPort";

  export function createOpenAIAdapter(modelId: string = "gpt-4o-mini"): LLMPort {
    return {
      async generateText(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        const startTime = Date.now();

        const result = await generateText({
          model: openai(modelId),
          system: params.systemPrompt,
          prompt: params.prompt,
          maxTokens: params.maxTokens,
          temperature: params.temperature,
        });

        const latencyMs = Date.now() - startTime;
        const tokensIn = result.usage?.promptTokens ?? 0;
        const tokensOut = result.usage?.completionTokens ?? 0;

        return {
          text: result.text,
          tokensIn,
          tokensOut,
          totalTokens: tokensIn + tokensOut,
          model: modelId,
          provider: "openai",
          latencyMs,
        };
      },

      getProviderInfo() {
        return { name: "openai", model: modelId };
      },
    };
  }

PARTE 3: EXPORTAR
- Crear packages/convex/convex/ai/adapters/index.ts:
  export { createOpenAIAdapter } from "./openai";

PARTE 4: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
```

**Validación**:

- [ ] Adaptador OpenAI implementa LLMPort
- [ ] Usa AI SDK para llamar a OpenAI
- [ ] Calcula latencia y tokens
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F1.4: Adaptador Anthropic

**Objetivo**: Implementar el adaptador para Anthropic siguiendo la interfaz LLMPort.

**Archivos**:

- `packages/convex/convex/ai/adapters/anthropic.ts` — Nuevo archivo
- `packages/convex/convex/ai/adapters/index.ts` — Actualizar exports

**Prompt**:

```
F1.4: Adaptador Anthropic

PARTE 1: IMPLEMENTAR ADAPTADOR
- Crear packages/convex/convex/ai/adapters/anthropic.ts:
  import { generateText } from "ai";
  import { anthropic } from "@ai-sdk/anthropic";
  import { LLMPort, LLMGenerateParams, LLMGenerateResult, estimateCost } from "../ports/llmPort";

  export function createAnthropicAdapter(modelId: string = "claude-3-haiku-20240307"): LLMPort {
    return {
      async generateText(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        const startTime = Date.now();

        const result = await generateText({
          model: anthropic(modelId),
          system: params.systemPrompt,
          prompt: params.prompt,
          maxTokens: params.maxTokens ?? 1024,
          temperature: params.temperature,
        });

        const latencyMs = Date.now() - startTime;
        const tokensIn = result.usage?.promptTokens ?? 0;
        const tokensOut = result.usage?.completionTokens ?? 0;

        return {
          text: result.text,
          tokensIn,
          tokensOut,
          totalTokens: tokensIn + tokensOut,
          model: modelId,
          provider: "anthropic",
          latencyMs,
        };
      },

      getProviderInfo() {
        return { name: "anthropic", model: modelId };
      },
    };
  }

PARTE 2: ACTUALIZAR EXPORTS
- Actualizar packages/convex/convex/ai/adapters/index.ts:
  export { createOpenAIAdapter } from "./openai";
  export { createAnthropicAdapter } from "./anthropic";

PARTE 3: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
```

**Validación**:

- [ ] Adaptador Anthropic implementa LLMPort
- [ ] Usa AI SDK para llamar a Anthropic
- [ ] Exports actualizados
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F1.5: Config Selector de Proveedor

**Objetivo**: Crear el selector de proveedor basado en variables de entorno.

**Archivos**:

- `packages/convex/convex/ai/config.ts` — Nuevo archivo
- `packages/convex/convex/ai/index.ts` — Nuevo archivo

**Prompt**:

```
F1.5: Config selector de proveedor

PARTE 1: CREAR CONFIGURACIÓN
- Crear packages/convex/convex/ai/config.ts:
  import { createOpenAIAdapter, createAnthropicAdapter } from "./adapters";
  import { LLMPort } from "./ports/llmPort";

  export type AIProvider = "openai" | "anthropic";

  export interface AIConfig {
    provider: AIProvider;
    model: string;
    debugLogContent: boolean;
  }

  /**
   * Obtiene configuración de IA desde variables de entorno
   */
  export function getAIConfig(): AIConfig {
    const provider = (process.env.AI_PROVIDER ?? "openai") as AIProvider;
    const debugLogContent = process.env.AI_DEBUG_LOG_CONTENT === "true";

    // Modelo por defecto según proveedor
    const defaultModels: Record<AIProvider, string> = {
      openai: "gpt-4o-mini",
      anthropic: "claude-3-haiku-20240307",
    };

    const model = process.env.AI_MODEL ?? defaultModels[provider];

    return { provider, model, debugLogContent };
  }

  /**
   * Crea el adaptador LLM según configuración
   */
  export function createLLMAdapter(config?: Partial<AIConfig>): LLMPort {
    const finalConfig = { ...getAIConfig(), ...config };

    switch (finalConfig.provider) {
      case "openai":
        return createOpenAIAdapter(finalConfig.model);
      case "anthropic":
        return createAnthropicAdapter(finalConfig.model);
      default:
        throw new Error(`Unknown AI provider: ${finalConfig.provider}`);
    }
  }

PARTE 2: CREAR INDEX
- Crear packages/convex/convex/ai/index.ts:
  export * from "./config";
  export * from "./ports/llmPort";
  export * from "./adapters";

PARTE 3: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
```

**Validación**:

- [ ] getAIConfig lee variables de entorno
- [ ] createLLMAdapter crea adaptador según provider
- [ ] Modelo por defecto según proveedor
- [ ] Debug flag configurable
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F1.6: Helpers de Telemetría con Flag Debug

**Objetivo**: Crear helpers para registrar uso de IA con soporte para debug logging.

**Archivos**:

- `packages/convex/convex/ai/telemetry.ts` — Nuevo archivo

**Prompt**:

```
F1.6: Helpers de telemetría con flag debug

PARTE 1: CREAR HELPERS
- Crear packages/convex/convex/ai/telemetry.ts:
  import { MutationCtx } from "../_generated/server";
  import { Id } from "../_generated/dataModel";
  import { LLMGenerateResult, estimateCost } from "./ports/llmPort";
  import { getAIConfig } from "./config";

  export interface TelemetryParams {
    ctx: MutationCtx;
    organizationId: Id<"organizations">;
    productId?: Id<"products">;
    userId: Id<"users">;
    useCase: string;
    agentName: string;
    threadId?: string;
    result: LLMGenerateResult;
    prompt?: string;
    response?: string;
    metadata?: Record<string, unknown>;
  }

  /**
   * Registra uso de IA en la tabla aiUsage
   */
  export async function recordAIUsage(params: TelemetryParams): Promise<Id<"aiUsage">> {
    const config = getAIConfig();
    const cost = estimateCost(params.result.model, params.result.tokensIn, params.result.tokensOut);

    return await params.ctx.db.insert("aiUsage", {
      organizationId: params.organizationId,
      productId: params.productId,
      userId: params.userId,
      useCase: params.useCase,
      agentName: params.agentName,
      threadId: params.threadId,
      provider: params.result.provider,
      model: params.result.model,
      tokensIn: params.result.tokensIn,
      tokensOut: params.result.tokensOut,
      totalTokens: params.result.totalTokens,
      latencyMs: params.result.latencyMs,
      estimatedCostUsd: cost,
      status: "success",
      // Debug: solo si está habilitado
      promptSnapshot: config.debugLogContent ? truncate(params.prompt, 5000) : undefined,
      responseSnapshot: config.debugLogContent ? truncate(params.response, 5000) : undefined,
      metadata: params.metadata,
      createdAt: Date.now(),
    });
  }

  /**
   * Registra error de IA
   */
  export async function recordAIError(
    params: Omit<TelemetryParams, "result"> & {
      error: Error;
      provider: string;
      model: string;
    }
  ): Promise<Id<"aiUsage">> {
    const config = getAIConfig();

    return await params.ctx.db.insert("aiUsage", {
      organizationId: params.organizationId,
      productId: params.productId,
      userId: params.userId,
      useCase: params.useCase,
      agentName: params.agentName,
      threadId: params.threadId,
      provider: params.provider,
      model: params.model,
      tokensIn: 0,
      tokensOut: 0,
      totalTokens: 0,
      latencyMs: 0,
      estimatedCostUsd: 0,
      status: "error",
      errorMessage: params.error.message,
      promptSnapshot: config.debugLogContent ? truncate(params.prompt, 5000) : undefined,
      metadata: params.metadata,
      createdAt: Date.now(),
    });
  }

  function truncate(text: string | undefined, maxLength: number): string | undefined {
    if (!text) return undefined;
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  }

PARTE 2: ACTUALIZAR INDEX
- Añadir a packages/convex/convex/ai/index.ts:
  export * from "./telemetry";

PARTE 3: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
```

**Validación**:

- [ ] recordAIUsage registra uso exitoso
- [ ] recordAIError registra errores
- [ ] Debug content solo se guarda si flag está habilitado
- [ ] Truncate evita payloads muy grandes
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

### F1.7: Queries de Uso de IA (por org/producto/caso)

**Objetivo**: Crear queries para consultar uso de IA con agregaciones.

**Archivos**:

- `packages/convex/convex/lib/aiUsage.ts` — Nuevo archivo

**Prompt**:

```
F1.7: Queries de uso de IA

PARTE 1: CREAR QUERIES
- Crear packages/convex/convex/lib/aiUsage.ts:
  import { v } from "convex/values";
  import { query } from "../_generated/server";
  import { assertOrgAccess } from "./access";

  /**
   * Obtiene uso de IA por organización en un rango de fechas
   */
  export const getOrgUsage = query({
    args: {
      organizationId: v.id("organizations"),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
    },
    handler: async (ctx, { organizationId, startDate, endDate }) => {
      await assertOrgAccess(ctx, organizationId);

      const start = startDate ?? Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 días
      const end = endDate ?? Date.now();

      const usage = await ctx.db
        .query("aiUsage")
        .withIndex("by_org_month", (q) =>
          q.eq("organizationId", organizationId).gte("createdAt", start).lte("createdAt", end)
        )
        .collect();

      return aggregateUsage(usage);
    },
  });

  /**
   * Obtiene uso de IA por producto en un rango de fechas
   */
  export const getProductUsage = query({
    args: {
      productId: v.id("products"),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
    },
    handler: async (ctx, { productId, startDate, endDate }) => {
      // Validar acceso al producto
      const product = await ctx.db.get(productId);
      if (!product) throw new Error("Product not found");
      await assertOrgAccess(ctx, product.organizationId);

      const start = startDate ?? Date.now() - 30 * 24 * 60 * 60 * 1000;
      const end = endDate ?? Date.now();

      const usage = await ctx.db
        .query("aiUsage")
        .withIndex("by_product_month", (q) =>
          q.eq("productId", productId).gte("createdAt", start).lte("createdAt", end)
        )
        .collect();

      return aggregateUsage(usage);
    },
  });

  /**
   * Obtiene uso de IA por caso de uso
   */
  export const getUsageByUseCase = query({
    args: {
      organizationId: v.id("organizations"),
      productId: v.optional(v.id("products")),
      useCase: v.string(),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
    },
    handler: async (ctx, { organizationId, productId, useCase, startDate, endDate }) => {
      await assertOrgAccess(ctx, organizationId);

      const start = startDate ?? Date.now() - 30 * 24 * 60 * 60 * 1000;
      const end = endDate ?? Date.now();

      let usage = await ctx.db
        .query("aiUsage")
        .withIndex("by_org_product_usecase", (q) => {
          let query = q.eq("organizationId", organizationId);
          if (productId) query = query.eq("productId", productId);
          return query.eq("useCase", useCase);
        })
        .filter((q) => q.and(
          q.gte(q.field("createdAt"), start),
          q.lte(q.field("createdAt"), end)
        ))
        .collect();

      return aggregateUsage(usage);
    },
  });

  // Helper para agregar métricas
  function aggregateUsage(usage: Array<{
    tokensIn: number;
    tokensOut: number;
    totalTokens: number;
    estimatedCostUsd: number;
    latencyMs: number;
    status: "success" | "error";
    useCase: string;
  }>) {
    const byUseCase: Record<string, {
      calls: number;
      tokensIn: number;
      tokensOut: number;
      totalTokens: number;
      estimatedCostUsd: number;
      avgLatencyMs: number;
      errors: number;
    }> = {};

    for (const u of usage) {
      if (!byUseCase[u.useCase]) {
        byUseCase[u.useCase] = {
          calls: 0,
          tokensIn: 0,
          tokensOut: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          avgLatencyMs: 0,
          errors: 0,
        };
      }
      const entry = byUseCase[u.useCase];
      entry.calls++;
      entry.tokensIn += u.tokensIn;
      entry.tokensOut += u.tokensOut;
      entry.totalTokens += u.totalTokens;
      entry.estimatedCostUsd += u.estimatedCostUsd;
      entry.avgLatencyMs = (entry.avgLatencyMs * (entry.calls - 1) + u.latencyMs) / entry.calls;
      if (u.status === "error") entry.errors++;
    }

    const totals = {
      calls: usage.length,
      tokensIn: usage.reduce((sum, u) => sum + u.tokensIn, 0),
      tokensOut: usage.reduce((sum, u) => sum + u.tokensOut, 0),
      totalTokens: usage.reduce((sum, u) => sum + u.totalTokens, 0),
      estimatedCostUsd: usage.reduce((sum, u) => sum + u.estimatedCostUsd, 0),
      errors: usage.filter((u) => u.status === "error").length,
    };

    return { totals, byUseCase };
  }

PARTE 2: VALIDACIÓN
- pnpm --filter @hikai/convex exec tsc --noEmit
```

**Validación**:

- [ ] Query getOrgUsage con agregaciones
- [ ] Query getProductUsage con agregaciones
- [ ] Query getUsageByUseCase para caso específico
- [ ] Todas las queries validan acceso
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa

---

## Fase 2: Telemetría End-to-End (agente actual)

**Objetivo**: Validar el circuito de telemetría usando el agente/chat de prueba existente (`ai-test`) sin crear más agentes de ejemplo.

### F2.1: Instrumentar actions con telemetría

**Objetivo**: Grabar uso y errores en `aiUsage` al invocar el chat actual.

**Archivos**:

- `packages/convex/convex/agents/actions.ts` — Añadir `recordAIUsage/recordAIError`, assert de acceso y metadata.
- `packages/convex/convex/ai/telemetry.ts` — (si hace falta) utilidades de metadata.

**Prompt**:

```
F2.1: Instrumentar actions con telemetría

- Añadir assert de acceso (product/org) antes de invocar el agente (puede ser productId opcional para ai-test; documenta decisión).
- En las actions de chat/chatStream, envolver la invocación con recordAIUsage/recordAIError:
  - useCase: "ai_test"
  - agentName: "Hello World Agent" (o el nombre real del agente actual)
  - threadId: el que se use/cree
  - metadata: incluir source="ai-test"
- Asegurar que los errores registran provider/model y mensaje.
- No tocar UI aún.

Validación:
- `pnpm --filter @hikai/convex exec tsc --noEmit`
- Ejecutar 1 llamada manual desde ai-test o dashboard y verificar que aparece en aiUsage.
```

### F2.2: UI ai-test mostrando thread/usage y flujos de error

**Objetivo**: Visualizar threadId y última respuesta de uso en la UI de prueba, y gestionar errores.

**Archivos**:

- `apps/webapp/src/domains/core/components/ai-test-panel.tsx`
- `apps/webapp/src/routes/ai-test.tsx` (si hace falta)

**Prompt**:

```
F2.2: UI ai-test con telemetría visible

- Mostrar threadId activo y permitir reset.
- Mostrar estado de la última invocación: provider/model, tokens in/out/total, latencyMs, status (success/error).
- En caso de error, mostrar mensaje amigable y no perder el threadId si existe.
- Usa solo componentes @hikai/ui.
- No exponer datos sensibles (prompt/response snapshots solo si debug está activo).

Validación:
- `pnpm --filter @hikai/webapp exec tsc --noEmit`
- Flujo manual: enviar prompt, ver threadId y métricas, provocar error (por ej. prompt vacío si se valida) y ver manejo.
```

### F2.3: Validación y documentación de consultas de uso

**Objetivo**: Verificar y documentar cómo leer métricas desde el frontend o dashboard.

**Archivos**:

- `packages/convex/convex/lib/aiUsage.ts` (solo si ajustes menores).
- `apps/webapp/webapp-plans/hikai-ai-inference-implementation.md` — sección de notas de validación.
- (Opcional) `apps/webapp/src/domains/core/components/ai-test-panel.tsx` para mostrar agregados simples.

**Prompt**:

```
F2.3: Validar consultas de uso

- Ejecutar queries getOrgUsage/getProductUsage/getUsageByUseCase con datos reales de ai-test y documentar resultados esperados.
- Añadir en el doc (esta página) un mini "How to validate" con filtros y ejemplos de retorno.
- (Opcional) Mostrar en ai-test un agregado mínimo (p.ej. totalTokens del último día para la org/product del usuario).

Validación:
- `pnpm --filter @hikai/convex exec tsc --noEmit`
- Salidas de ejemplo documentadas en el plan.
```

---

## Fase 3: Agente de Enriquecimiento de Contexto de Producto

**Objetivo**: Generar un contexto/taxonomía de producto a partir de las fuentes conectadas (starting point: GitHub).

### F3.1: Prompt + schema de contexto

**Objetivo**: Definir el contrato de salida y el prompt del agente.

**Archivos**:

- `packages/convex/convex/ai/prompts/productContext.ts` (nuevo)
- `packages/convex/convex/ai/prompts/index.ts` (registro)
- `packages/convex/convex/schema.ts` (si se necesita tabla de contexto de producto)

**Prompt**:

```
F3.1: Prompt + schema de contexto

- Definir un schema JSON de salida (ej: platforms, languages, key_features, release_cadence, maturity, risks, summary).
- Redactar prompt del agente con instrucciones, formato de salida y límites (tokens).
- Decidir almacenamiento: nueva tabla productContext con índices por productId/createdAt o campo embebido; documentar elección.
- No implementar agent/action aún.

Validación:
- `pnpm --filter @hikai/convex exec tsc --noEmit`
- Prompt revisado en el doc (copiar en este plan o en archivo).
```

### F3.2: Agent/action de enriquecimiento de contexto

**Objetivo**: Implementar el agente y action protegida para generar/actualizar contexto.

**Archivos**:

- `packages/convex/convex/agents/productContextAgent.ts` (nuevo)
- `packages/convex/convex/agents/actions.ts` (nueva action)
- `packages/convex/convex/lib/planLimits.ts` (si aplica control)
- `packages/convex/convex/ai/telemetry.ts` (uso de recordAIUsage/Error)

**Prompt**:

```
F3.2: Agent/action de contexto

- Agent usa createLLMAdapter y prompt de productContext; nombre p.ej. "Product Context Agent".
- Action con assertProductAccess, inputs { productId, forceRefresh?, threadId? }, soporta reuse de thread.
- Recolectar datos de fuentes disponibles (de momento GitHub: eventos/prs/releases) como contexto textual o herramienta dedicada.
- Telemetría: useCase "product_context_enrichment".
- Control de plan: validar tokens/llamadas si hay límites definidos (añadir o referenciar planLimits).

Validación:
- `pnpm --filter @hikai/convex exec tsc --noEmit`
- Probar con un producto de ejemplo y revisar aiUsage + contexto generado almacenado.
```

### F3.3: UI de producto consumiendo contexto enriquecido

**Objetivo**: Mostrar el contexto generado en la webapp.

**Archivos**:

- `apps/webapp/src/domains/products/...` (componente/ruta que mejor encaje)
- `apps/webapp/src/locales/*` (textos)

**Prompt**:

```
F3.3: UI de contexto de producto

- Mostrar resumen/taxonomía generada (plataformas, stack, features, cadencia).
- Indicar timestamp y modelo/proveedor usados.
- Botón para regenerar (llama a action con forceRefresh) respetando límites de plan.
- Manejar estado loading/error y caso "aún no generado".

Validación:
- `pnpm --filter @hikai/webapp exec tsc --noEmit`
- Flujo manual: generar y visualizar contexto; ver aiUsage reflejado.
```

---

## Fase 4: Intérprete de Timeline (IA)

**Objetivo**: Sustituir la heurística por un agente que normalice eventos raw en interpretedEvents con más valor funcional.

### F4.1: Prompt + schema del intérprete de timeline

**Objetivo**: Definir formato de salida y prompt del agente.

**Archivos**:

- `packages/convex/convex/ai/prompts/timelineInterpreter.ts` (nuevo)
- `packages/convex/convex/ai/prompts/index.ts` (registro)
- `packages/convex/convex/schema.ts` (si se requieren campos extra en interpretedEvents)

### F4.2: Agent/action de interpretación de eventos

**Objetivo**: Implementar agente que lee rawEvents por ventana temporal y escribe interpretedEvents.

**Archivos**:

- `packages/convex/convex/agents/timelineInterpreterAgent.ts` (nuevo)
- `packages/convex/convex/agents/actions.ts` (nueva action)
- `packages/convex/convex/timeline/*` o tools para fetch de rawEvents

**Puntos clave**:

- assertProductAccess, límites de plan.
- Telemetría useCase "timeline_interpretation".
- Fallback: si falla IA, mantener heurística actual (no borrar).

### F4.3: Validaciones de plan, fallback y UI

**Objetivo**: Integrar el resultado en la UI de timeline y asegurar degradación.

**Archivos**:

- `apps/webapp/src/domains/timeline/...`
- `packages/convex/convex/timeline/*` (si hay merges de heurística/IA)

**Puntos clave**:

- Switch/feature flag para usar IA vs heurística.
- Mostrar fuente (IA/heurística), modelo, timestamp.
- Tests manuales/validación de aiUsage + interpretedEvents.
