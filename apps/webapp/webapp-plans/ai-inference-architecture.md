# Infraestructura de inferencia AI con Convex Agents

## Objetivo

Diseñar un sistema centralizado de inferencia que permita a las distintas funcionalidades de Hikai solicitar respuestas de LLMs reutilizando la plataforma Convex Agents. El sistema debe ser escalable, observable y fácil de extender a nuevos casos de uso.

## MVP inicial (basado en el ejemplo oficial de Convex Agents)

1. **Caso mínimo**: implementar un agente "echo" (similar al quickstart de Convex Agents) que reciba texto del usuario y devuelva una versión resumida. Sirve como prueba extremo a extremo y base para prompts más ricos.
2. **Ubicación de código**:
   - `packages/convex/agents/echo.ts`: agente simple con prompt fijo y límite de tokens; usa el ejemplo de Convex Agents para configurar `model`, `temperature` y `maxTokens`.
   - `packages/convex/domain/echo.ts`: mutation `summarizeEcho` que valida `assertOrgAccess`, normaliza el payload y llama al agente.
   - `apps/webapp/lib/ai/client.ts`: helper `useEchoSummary` que invoca la mutation y maneja `loading/error`.
   - `apps/webapp/doc/ai-inference-architecture.md`: documentar contrato de entrada/salida y SLA del MVP.
3. **Flujo paso a paso**:
   - El frontend llama `summarizeEcho` con `{ text: string, lang?: string }`.
   - La mutation aplica el contrato del quickstart: construye el `agentRequest` con el prompt fijo "Resume brevemente: {{text}}" y llama al agente `echoAgent`.
   - El agente usa el runtime de Convex Agents (según docs) para ejecutar el modelo configurado y devuelve `{ summary: string, model: string, tokensUsed: number }`.
   - La mutation registra métricas básicas (latencia, coste estimado) y responde al frontend.
4. **Validación del MVP**:
   - Habilitar la UI con un textarea y botón en un feature flag interno.
   - Medir latencia extremo a extremo y coste promedio por llamada.
   - Registrar feedback interno antes de habilitar más herramientas o casos de uso.

## Arquitectura

- **Frontends Hikai (webapp/website)**: originan solicitudes de inferencia y consumen resultados.
- **Backend de dominio (Convex queries/mutations)**: valida permisos, enriquece el contexto (organización, producto, límites de plan) y despacha tareas al orquestador de agentes.
- **Orquestador de agentes (Convex Agent)**: instancia principal que coordina prompts, políticas y enruta la llamada al proveedor LLM configurado.
- **Providers LLM**: modelos externos configurables por entorno (p. ej. OpenAI, Anthropic). Se seleccionan vía configuración centralizada y soportan conmutación por bandera/plan.
- **Observabilidad**: logging estructurado de requests/responses, métricas de latencia y cuota; almacenamiento mínimo de payloads para debugging seguro.
- **Almacenamiento de contexto**: colecciones Convex para historiales breves, plantillas y metadata de ejecución (trace IDs, coste estimado) asociadas a organización/usuario.

## Estructura propuesta en el repo

- `packages/convex/agents/<use-case>.ts`: definiciones de Convex Agents por caso de uso (prompt base, herramientas, límites, retries).
- `packages/convex/domain/<use-case>.ts`: adaptadores de dominio (queries/mutations) que validan acceso y normalizan inputs antes de llamar al agente.
- `packages/convex/lib/modelRouter.ts`: lógica de ruteo de modelo según plan/bandera y sensibilidad de datos.
- `packages/convex/lib/prompts/*.md|.ts`: plantillas de prompt versionadas y sus variables.
- `packages/convex/lib/telemetry.ts`: helper de logging/observabilidad para métricas y auditoría.
- `apps/webapp/lib/ai/client.ts`: SDK ligero para frontends (hooks/helpers para invocar mutations de AI y manejar estados).
- `apps/webapp/doc/ai-inference-architecture.md`: documentación viva de contratos y flujos (este documento).

## Componentes y responsabilidades

- **Convex Agents**: definen la lógica de cada agente, incluyendo prompt base, herramientas disponibles y límites (tokens, tiempo). Gestionan retries y selección de modelo.
- **Adaptador de dominio**: capa Convex que normaliza inputs desde los productos (p. ej. strings de descripción, parámetros de filtrado) hacia el contrato del agente. Aplica `assertOrgAccess` y checks de plan.
- **Gestor de plantillas**: repositorio de prompts y system messages versionados por caso de uso; permite inyectar variables de organización/idioma.
- **Router de modelo**: decide qué modelo usar según plan, sensibilidad de datos o coste; soporta fallback y A/B mediante flags.
- **Auditoría y trazas**: guarda metadata mínima (IDs, tiempos, modelo) y referencia a logs externos; habilita replay limitado para soporte.
- **SDK cliente**: helpers en frontend para construir la petición, mostrar estados de carga y manejar respuestas/errores de manera consistente.

### Uso explícito de Convex Agents

- **Definición**: cada archivo en `packages/convex/agents` exporta un `Agent` según la API de Convex Agents (prompt base, herramientas opcionales, política de reintentos, selección de modelo) y se registra en el servidor Convex.
- **Invocación**: las mutations/queries de `packages/convex/domain` llaman al agente vía el cliente de Convex Agents, pasando un payload tipado y recibiendo resultados estructurados (p. ej. JSON con campos de negocio).
- **Herramientas**: se pueden exponer herramientas Convex (p. ej. búsqueda en colecciones) como funciones registradas en el agente para enriquecer respuestas.
- **Configuración de modelos**: el router selecciona el `model` del agente (OpenAI/Anthropic) con parámetros (`temperature`, `maxTokens`) ajustados por plan o feature flag.
- **Observabilidad**: cada llamada de agente se envuelve con trazas/metrics (`telemetry.ts`), registrando latencia, costes y resultado resumido siguiendo las recomendaciones de Convex.

## Flujo de petición

1. El frontend invoca una mutation Convex específica del caso de uso con el payload del usuario.
2. La mutation valida acceso/plan, enriquece con contexto (org, idioma, límites), y llama al agente correspondiente.
3. El Convex Agent ejecuta el prompt templado, llama al proveedor LLM y retorna resultado estructurado.
4. La mutation registra métricas/auditoría y devuelve la respuesta al frontend para renderizado o acciones posteriores.

## Casos de uso iniciales

- **Resúmenes de conversaciones**: generar un TL;DR de hilos de soporte o feedback del usuario.
- **Asistente de configuración**: sugerir plantillas de productos o campañas según datos de la organización.
- **Validación de contenido**: revisar descripciones/textos creados por usuarios y devolver sugerencias o bloqueos.
- **Generación de texto inicial**: autopoblar campos de onboarding (nombre corto, mensaje de bienvenida) con controles de tono/idioma.
- **Análisis de sentimiento**: etiquetar comentarios para priorización en pipelines de soporte.

## Roadmap de implementación

- Definir modelos/planes soportados y crear el router de modelo con flags de entorno.
- Crear agentes base en Convex (uno por caso de uso) y su capa de adaptadores de dominio.
- Centralizar plantillas de prompt con variables y versionado ligero.
- Implementar logging/observabilidad y almacenamiento de metadatos de ejecución.
- Exponer SDK cliente mínimo en `@hikai/convex` para las llamadas desde frontend.
- Documentar contratos de entrada/salida por agente y límites de uso por plan.
