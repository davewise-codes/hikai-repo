# Hikai - Arquitectura Técnica MVP

> Documento de referencia para la arquitectura de Hikai Fases 0-3.
> Complementa a `Hikai_resumen_arquitectura.md` (visión de negocio).

---

## Decisiones Clave

| # | Decisión | Elección | Razón |
|---|----------|----------|-------|
| 1 | Event Pipeline | Dominio único **Timeline** | Simplifica el flujo raw → interpreted → view |
| 2 | Areas (Marketing, CS, Product) | **Vistas del Content Store** | Un store unificado con tags/categorías, no dominios separados |
| 3 | Product Context | **Subdocumento en Product** | Balance entre simplicidad y estructura |
| 4 | Sources + Channels | **Connectors unificado** | Comparten OAuth, credentials, patterns. Adaptadores específicos |
| 5 | Multi-tenant | **Product-scoped** | Todo dato nuevo pertenece a un producto (ya dentro de org) |
| 6 | Product Workspace | **Parte de core** | Capa de composición como AppShell, no dominio de negocio |
| 7 | Auditoría | **Timestamps + activityLog** | Timestamps para queries rápidas, log para auditoría detallada |
| 8 | Editores por área | **Variantes en content** | Base común + especializaciones por área (Marketing, CS, Product) |

---

## Dominios

### Existentes (5)
- `core` - Transversal (AppShell, theme, i18n)
- `auth` - Autenticación
- `organizations` - Tenants
- `products` - Productos
- `shared` - UI patterns reutilizables

### Nuevos (4)

| Dominio | Responsabilidad | No hace |
|---------|-----------------|---------|
| **connectors** | OAuth, credentials, webhooks, adaptadores | Procesar eventos, crear contenido |
| **timeline** | Ingesta raw → interpretación → visualización | Conectar a sources, publicar |
| **content** | Content Store, tags, versiones, AI ops | Publicar a canales |
| **publishing** | Cola, scheduling, ejecución | Almacenar contenido, conectar |

---

## Product Workspace

El workspace de producto es la **zona funcional principal** de Hikai. No es un dominio de negocio, sino una **capa de composición** (como AppShell).

**Ubicación**: Parte del dominio `core`

**Ruta**: `/app/org/:orgId/product/:productId/*`

**Estructura de navegación**:
```
Product Workspace
├── timeline          → Dominio timeline
├── marketing         → Vista área (Content Store filtrado)
├── customer-success  → Vista área (Content Store filtrado)
├── product-team      → Vista área (Content Store filtrado)
├── content           → Dominio content (Content Store completo)
└── publishing        → Dominio publishing
```

**Componentes (en core)**:
```
core/components/
├── workspace-shell.tsx       # Layout principal del workspace
├── workspace-sidebar.tsx     # Sidebar minimalista (iconos)
├── workspace-header.tsx      # Header contextual al producto
└── area-layout.tsx           # Layout para vistas de área (subtabs)
```

**Subtabs por área** (Overview | Suggestions | Editors | History):
- Los componentes de cada subtab vienen de los dominios correspondientes
- El workspace solo orquesta la navegación

---

## Auditoría

**Modelo dual**: Timestamps en entidades + tabla centralizada

### Timestamps en entidades

```typescript
// content table
content: {
  // ... campos existentes
  createdAt: number;
  updatedAt: number;
  approvedAt?: number;
  approvedBy?: Id<"users">;
  publishedAt?: number;
}

// rawEvents (ya tiene)
rawEvents: {
  occurredAt: number;   // Cuándo pasó en source
  ingestedAt: number;   // Cuándo lo recibimos
  processedAt?: number; // Cuándo se interpretó
}
```

### Tabla activityLog

```typescript
activityLog: defineTable({
  productId: v.id("products"),
  actorId: v.id("users"),
  action: v.string(),      // Ver acciones abajo
  entityType: v.string(),  // "connection", "rawEvent", "content", "publishingJob"
  entityId: v.string(),
  metadata: v.optional(v.any()),
  occurredAt: v.number(),
})
  .index("by_product", ["productId"])
  .index("by_product_time", ["productId", "occurredAt"])
```

**Acciones registradas**:
| Acción | Cuándo |
|--------|--------|
| `source_synced` | Al sincronizar (manual/auto) |
| `events_ingested` | Al procesar batch de rawEvents |
| `events_interpreted` | Al interpretar eventos |
| `content_created` | Al crear contenido |
| `content_updated` | Al editar contenido |
| `content_submitted` | Al enviar a revisión |
| `content_approved` | Al aprobar contenido |
| `content_published` | Al publicar contenido |

---

## Editores por Área

Cada área tiene editores especializados, pero comparten una base común.

**Estructura en dominio content**:
```
content/components/
├── editors/
│   ├── base-editor.tsx           # Componente base compartido
│   ├── short-update-editor.tsx   # Marketing: tweets, posts cortos
│   ├── long-form-editor.tsx      # Marketing: blogs, newsletters
│   ├── changelog-editor.tsx      # Product Team: changelogs
│   ├── release-notes-editor.tsx  # Product Team: release notes
│   ├── help-article-editor.tsx   # CS: artículos de ayuda
│   └── announcement-editor.tsx   # CS: anuncios a clientes
```

**Base editor incluye**:
- Edición de texto (sin AI en Free)
- Formato básico
- Preview
- Guardar borrador
- Enviar a revisión

**Editores avanzados añaden**:
- AI ops (reformular, resumir, expandir)
- Plantillas específicas
- Validaciones de área
- Sugerencias contextuales

---

## Flujo Colaborativo

**Estados de contenido**:
```
draft → review → approved → scheduled → published
                    ↓
                 archived
```

**Campos para workflow**:
```typescript
content: {
  status: "draft" | "review" | "approved" | "scheduled" | "published" | "archived";
  createdBy: Id<"users">;
  assignedReviewerId?: Id<"users">;
  approvedBy?: Id<"users">;
  approvedAt?: number;
}
```

**Roles y permisos**:
| Rol | Puede |
|-----|-------|
| Editor | Crear, editar, enviar a review |
| Approver | Todo de Editor + aprobar contenido |
| Area Editor | Editor pero solo en su área |

---

## Modelo de Datos

### Nuevas Tablas

```
CONNECTORS
├── connectorTypes      # Catálogo (github, twitter, linkedin)
└── connections         # Instancias por producto + OAuth tokens

TIMELINE
├── rawEvents           # Eventos crudos de sources
└── interpretedEvents   # Eventos con significado semántico

CONTENT
├── tags                # Categorías por producto
├── content             # Piezas de contenido + status + areas[]
└── contentVersions     # Historial

PUBLISHING
├── publishingJobs      # Cola de publicación
└── publishingAnalytics # Métricas

AUDITORÍA
└── activityLog         # Log centralizado de acciones
```

### Extensión a Products

```typescript
// Nuevo campo en products table
context: {
  description?: string;
  targetAudience?: string;
  tone?: string;
  keywords?: string[];
  customInstructions?: string;
}
```

---

## Flujo de Datos

```
Source (GitHub)
    │
    ▼
[connector adapter] ──webhook/poll──▶ rawEvents
                                          │
                                          ▼
                                   [AI interpreter]
                                          │
                                          ▼
                                   interpretedEvents
                                          │
                              ┌───────────┴───────────┐
                              ▼                       ▼
                         [Timeline UI]         [Create Content]
                                                      │
                                                      ▼
                                               Content Store
                                                      │
                                                      ▼
                                              publishingJobs
                                                      │
                                                      ▼
                                           [channel adapter]
                                                      │
                                                      ▼
                                          Twitter / LinkedIn
```

---

## Estructura de Archivos

### Backend (Convex)
```
packages/convex/convex/
├── connectors/
│   ├── adapters/sources/github/
│   ├── adapters/channels/twitter/
│   ├── lib/ports.ts
│   └── connections.ts
├── timeline/
│   ├── raw-events.ts
│   └── interpreted-events.ts
├── content/
│   ├── content.ts
│   └── tags.ts
└── publishing/
    └── jobs.ts
```

### Frontend (Webapp)
```
apps/webapp/src/domains/
├── connectors/    # Gestión conexiones
├── timeline/      # Vista timeline
├── content/       # Editor + lista
└── publishing/    # Cola + calendario
```

---

## Contratos Entre Dominios

```typescript
// connectors → timeline
ingestRawEvent(event: SourceEvent): Promise<Id<"rawEvents">>

// timeline → content
createContentFromEvent(eventId: Id<"interpretedEvents">): Promise<Id<"content">>

// content → publishing
schedulePublish(contentId: Id<"content">, channelId: Id<"connections">): Promise<Id<"publishingJobs">>

// publishing → connectors
publishToChannel(jobId: Id<"publishingJobs">): Promise<PublishResult>
```

---

## Seguridad

**Regla**: Todo query/mutation de nuevos dominios DEBE validar acceso:

```typescript
// Primera línea de todo handler
const { membership, product } = await assertProductAccess(ctx, productId);
```

**Credentials**: OAuth tokens en `connections.credentials` (considerar encryption).

---

## Extensibilidad Futura

Evaluación de cómo la arquitectura soporta features de fases avanzadas (6-7).

| Feature | Soporte | Notas |
|---------|---------|-------|
| API de lectura | ✅ Listo | Queries existentes exponen datos |
| API de escritura | ✅ Listo | Mutations existentes |
| Webhooks | ✅ Listo | http.ts ya existe |
| Modo agente básico | ⚠️ Parcial | Añadir scheduled jobs para generación proactiva |
| MCP | ⚠️ Parcial | Definir tools/resources sobre mutations |
| Multi-producto | ⚠️ Parcial | Añadir queries agregadas a nivel org |

**Para modo agente** se necesita:
1. `agentJobs` table para tareas programadas del agente
2. Convex crons para ejecución periódica
3. Límites por tokens del agente

**Para MCP** se necesita:
1. Definir schema de tools (basado en mutations)
2. Definir schema de resources (basado en queries)
3. Endpoint MCP en http.ts

---

## Acoplamiento Entre Dominios

El flujo es **unidireccional** y el acoplamiento es **por ID** (referencia débil):

```
connectors ──(IDs)──▶ timeline ──(IDs)──▶ content ──(IDs)──▶ publishing
     ▲                                                            │
     └────────────────────(IDs para canales)──────────────────────┘
```

| Dominio | Conoce de | Tipo de dependencia |
|---------|-----------|---------------------|
| timeline | connectors (connectionId en rawEvents) | Por ID |
| content | timeline (sourceEventId en content) | Por ID, opcional |
| publishing | content + connectors (contentId, connectionId) | Por ID |

**Cada dominio puede evolucionar independientemente**. Los contratos son IDs y tipos, no implementaciones.

---

## Fases de Implementación

### Fase 1: Product Workspace + GitHub Source
**Objetivo**: Navegación funcional del producto y conexión de primera source

**Backend (Convex)**:
- Schema: `connectorTypes`, `connections`
- GitHub OAuth flow
- CRUD de connections

**Frontend (Webapp)**:
- `WorkspaceShell`, `WorkspaceSidebar` en core
- Rutas: `/app/org/:orgId/product/:productId/*`
- Dominio `connectors`: lista, añadir, estado
- Settings: `/settings/product/$slug/sources`

**Entregable**: Usuario puede entrar al workspace de un producto y conectar un repo GitHub

---

### Fase 2: Timeline + Sync
**Objetivo**: Ingesta de eventos y visualización del timeline

**Backend**:
- Schema: `rawEvents`, `interpretedEvents`
- GitHub adapter: fetch commits/PRs/releases
- Sync manual (botón)
- Interpretación básica (sin AI)

**Frontend**:
- Dominio `timeline`: vista timeline, filtros básicos
- Ruta: `/app/.../product/:productId/timeline`
- Botón "Sync now"

**Entregable**: Usuario sincroniza y ve timeline de eventos de GitHub

---

### Fase 3: Content Store + Áreas
**Objetivo**: Crear y gestionar contenido desde eventos

**Backend**:
- Schema: `tags`, `content`, `contentVersions`, `activityLog`
- CRUD contenido con workflow de estados
- "Crear desde evento"

**Frontend**:
- Dominio `content`: lista, editor base, tags
- Vistas de área (Marketing, CS, Product) con subtabs
- Flujo: evento → contenido

**Entregable**: Usuario crea contenido desde el timeline, organizado por áreas

---

### Fase 4: AI + Editores Avanzados
**Objetivo**: Capacidades AI en editores

**Backend**:
- AI service abstraction
- Operaciones: reformular, resumir, expandir
- Interpretación AI de eventos

**Frontend**:
- Editores especializados por área
- AI ops en editor (Pro+)

**Entregable**: Usuario usa AI para mejorar contenido

---

### Fase 5: Publishing
**Objetivo**: Publicar contenido a canales

**Backend**:
- Schema: `publishingJobs`, `publishingAnalytics`
- Twitter/LinkedIn adapters
- Cola y scheduling

**Frontend**:
- Dominio `publishing`: cola, calendario
- Flujo: contenido → publicar

**Entregable**: Usuario publica contenido a Twitter/LinkedIn

---

### Resumen de Fases

| Fase | Foco | Dominios | Documento |
|------|------|----------|-----------|
| 1 | Workspace + GitHub | core, connectors | `phase-1-workspace-sources.md` |
| 2 | Timeline + Sync | timeline | `phase-2-timeline-sync.md` |
| 3 | Content + Áreas | content | `phase-3-content-areas.md` |
| 4 | AI + Editores | content (AI) | `phase-4-ai-editors.md` |
| 5 | Publishing | publishing | `phase-5-publishing.md` |

---

## Generación de Documentos de Fase

Cada fase debe tener un documento de proyecto en `apps/webapp/webapp-plans/` que guíe su implementación.

### Prompt para generar documento de fase

```
Genera el documento de proyecto para la Fase N de Hikai.

CONTEXTO:
- Documento de arquitectura: apps/webapp/webapp-plans/hikai-architecture.md
- Documento de negocio: apps/webapp/webapp-plans/Hikai_resumen_arquitectura.md
- Ejemplo de formato: apps/webapp/webapp-plans/ui-density.md

ESTRUCTURA DEL DOCUMENTO:
1. Contexto - Referencias a docs de arquitectura y objetivo de la fase
2. Documentación - Links a docs relevantes
3. Progreso - Tabla de subfases con estados (⏳ Pendiente | 🔄 En progreso | ✅ Completado)
4. Prompt para arrancar subfases - Instrucción genérica reutilizable
5. Instrucciones generales - Reglas a seguir en todas las subfases
6. Subfases detalladas - Cada una con:
   - Objetivo
   - Archivos a crear/modificar
   - Prompt específico
   - Validación

REGLAS:
- Subfases pequeñas y atómicas (completables en una sesión)
- Cada subfase con prompt autocontenido
- Incluir validaciones verificables
- Seguir patrones existentes del repo (CLAUDE.md)
- Componentes UI siempre de @hikai/ui
- Convex queries/mutations con assertProductAccess
```

### Template de documento de fase

```markdown
## Contexto

[Descripción de la fase y su objetivo]

**Documentación de referencia**:
- `apps/webapp/webapp-plans/hikai-architecture.md` - Arquitectura técnica
- `apps/webapp/webapp-plans/Hikai_resumen_arquitectura.md` - Visión de negocio

---

## Progreso

| Subfase | Descripción | Estado |
|---------|-------------|--------|
| F#.0 | ... | ⏳ Pendiente |
| F#.1 | ... | ⏳ Pendiente |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Prompt para arrancar subfases

\```
- En apps/webapp/webapp-plans/phase-N-xxx.md puedes ver el plan
- Vamos a proceder con la subfase siguiente pendiente
- Analiza el documento y toma el prompt de esa subfase como instrucción
- Comparte el plan antes de implementar
- No hagas commit hasta confirmar pruebas OK
- Máxima capacidad de ultrathink
\```

---

## Instrucciones Generales

### Reglas del Repo
- Seguir `CLAUDE.md` estrictamente
- Componentes UI de `@hikai/ui`
- Iconos de `@hikai/ui` (no lucide-react directo)
- Tokens de diseño de `packages/ui/src/tokens/`

### Backend (Convex)
- Validar acceso: `assertProductAccess(ctx, productId)`
- Seguir patrones de `organizations/` y `products/`
- Índices para queries frecuentes

### Commits
- Un commit por subfase completada
- Formato: `feat(scope): [F#.X] descripción`
- NO commit hasta pruebas OK

---

## Subfases

### F#.0: [Nombre]

**Objetivo**: ...

**Archivos**:
- `path/to/file.ts` - Crear/Modificar

**Prompt**:
\```
[Instrucciones detalladas]
\```

**Validación**:
- [ ] Criterio 1
- [ ] Criterio 2
```
