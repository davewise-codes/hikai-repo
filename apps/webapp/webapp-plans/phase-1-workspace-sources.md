# Fase 1: Product Workspace + GitHub Source

## Contexto

Esta fase establece los **fundamentos del Product Workspace** y la capacidad de **conectar sources** (inicialmente solo GitHub).

**Objetivos**:

1. Crear el layout del workspace de producto (zona funcional principal de Hikai)
2. Implementar el dominio `connectors` (backend + frontend)
3. Permitir conectar repositorios GitHub a un producto

**Documentación de referencia**:

- `apps/webapp/webapp-plans/hikai-architecture.md` - Arquitectura técnica
- `apps/webapp/webapp-plans/Hikai_resumen_arquitectura.md` - Visión de negocio (sección 4: Arquitectura de Navegación)
- `CLAUDE.md` - Reglas del repositorio

---

## Progreso

| Subfase | Descripción                          | Estado       |
| ------- | ------------------------------------ | ------------ |
| F1.0    | Schema: connectorTypes, connections  | ✅ Completado |
| F1.1    | WorkspaceShell (layout en core)      | ✅ Completado |
| F1.2    | WorkspaceSidebar (navegación iconos) | ✅ Completado |
| F1.3    | Rutas del workspace                  | ✅ Completado |
| F1.4    | Connectors backend (CRUD)            | ⏳ Pendiente |
| F1.5    | Connectors frontend (UI)             | ⏳ Pendiente |
| F1.6    | GitHub OAuth flow                    | ⏳ Pendiente |
| F1.7    | Settings > Product > Sources         | ⏳ Pendiente |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Prompt para arrancar subfases

```
- En apps/webapp/webapp-plans/phase-1-workspace-sources.md puedes ver el plan de la Fase 1
- Vamos a proceder con la subfase siguiente pendiente de ejecutar
- Analiza el documento y toma el prompt de esa subfase como instrucción
- Comparte el plan de implementación antes de comenzar
- No hagas commit hasta que yo confirme las pruebas OK
- Una vez validado haz commit y actualiza el progreso en el documento apps/webapp/webapp-plans/phase-1-workspace-sources.md
- No hagas asunciones, compárteme dudas y las debatimos
- Máxima capacidad de ultrathink
```

---

## Instrucciones Generales

### Reglas del Repo

- Seguir `CLAUDE.md` estrictamente
- Componentes UI de `@hikai/ui` (Button, Badge, etc.)
- Iconos de `@hikai/ui` (no lucide-react directo en apps/)
- Tokens de diseño de `packages/ui/src/tokens/`
- Clases `text-fontSize-sm` para texto estándar

### Backend (Convex)

- Validar acceso: `await assertProductAccess(ctx, productId)`
- Seguir patrones de `packages/convex/convex/organizations/` y `products/`
- Índices para queries frecuentes
- Manejar errores con mensajes traducibles

### Frontend (Webapp)

- Hooks en `domains/[dominio]/hooks/`
- Componentes en `domains/[dominio]/components/`
- Exportar API pública en `domains/[dominio]/index.ts`
- i18n: usar `useTranslation` con namespaces

### Commits

- Un commit por subfase completada
- Formato: `feat(scope): [F1.X] descripción breve`
- NO commit hasta pruebas confirmadas OK

---

## Subfases

### F1.0: Schema Backend

**Objetivo**: Crear las tablas `connectorTypes` y `connections` en Convex.

**Archivos**:

- `packages/convex/convex/schema.ts` - Añadir tablas

**Prompt**:

```
FASE 1.0: Schema de Connectors

PARTE 1: AÑADIR TABLAS A schema.ts
ARCHIVO: packages/convex/convex/schema.ts

Añadir las siguientes tablas:

// Catálogo de tipos de conector disponibles
connectorTypes: defineTable({
  type: v.union(v.literal("source"), v.literal("channel")),
  provider: v.string(), // "github", "twitter", "linkedin"
  name: v.string(),
  description: v.optional(v.string()),
  iconUrl: v.optional(v.string()),
  isEnabled: v.boolean(),
  createdAt: v.number(),
})
  .index("by_type", ["type"])
  .index("by_provider", ["provider"]),

// Conexiones de un producto a sources/channels
connections: defineTable({
  productId: v.id("products"),
  connectorTypeId: v.id("connectorTypes"),
  name: v.string(), // Nombre dado por el usuario (ej: "hikai-repo")
  config: v.any(), // Configuración específica del provider (repo, owner, etc.)
  status: v.union(
    v.literal("pending"),    // Esperando OAuth
    v.literal("active"),     // Conectado y funcionando
    v.literal("error"),      // Error de conexión
    v.literal("disconnected") // Desconectado manualmente
  ),
  credentials: v.optional(v.object({
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  })),
  lastSyncAt: v.optional(v.number()),
  lastError: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_product", ["productId"])
  .index("by_product_type", ["productId", "connectorTypeId"])
  .index("by_status", ["status"]),

PARTE 2: VERIFICAR TIPOS

Ejecutar:
pnpm --filter @hikai/convex exec tsc --noEmit

VALIDACIÓN:
- [ ] Tablas añadidas sin errores de TypeScript
- [ ] Índices definidos correctamente
- [ ] Schema genera tipos en _generated/
```

**Validación**:

- [ ] `connectorTypes` table creada con índices
- [ ] `connections` table creada con índices
- [ ] `pnpm --filter @hikai/convex exec tsc --noEmit` pasa
- [ ] Tipos generados correctamente

---

### F1.1: WorkspaceShell

**Objetivo**: Crear el layout principal del Product Workspace en el dominio `core`.

**Archivos**:

- `apps/webapp/src/domains/core/components/workspace-shell.tsx` - Crear
- `apps/webapp/src/domains/core/components/index.ts` - Exportar

**Prompt**:

```
FASE 1.1: WorkspaceShell

PARTE 1: CREAR workspace-shell.tsx
ARCHIVO: apps/webapp/src/domains/core/components/workspace-shell.tsx

Crear el layout del Product Workspace. Estructura similar a AppShell pero con sidebar lateral para navegación del workspace.

import { ReactNode } from "react";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { AppHeader } from "./app-header";
import { Toaster } from "@hikai/ui";

interface WorkspaceShellProps {
  children: ReactNode;
  productId: string;
  productName: string;
}

export function WorkspaceShell({ children, productId, productName }: WorkspaceShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex pt-14">
        <WorkspaceSidebar productId={productId} productName={productName} />
        <main className="flex-1 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

NOTAS:
- Reutiliza AppHeader existente (mantiene org/product switchers)
- WorkspaceSidebar será creado en F1.2 (por ahora placeholder)
- pt-14 compensa la altura del header (h-14)
- El sidebar es fijo a la izquierda, contenido ocupa el resto

PARTE 2: PLACEHOLDER DE WorkspaceSidebar
ARCHIVO: apps/webapp/src/domains/core/components/workspace-sidebar.tsx

Crear un placeholder temporal:

interface WorkspaceSidebarProps {
  productId: string;
  productName: string;
}

export function WorkspaceSidebar({ productName }: WorkspaceSidebarProps) {
  return (
    <aside className="w-14 border-r bg-muted/30 flex flex-col items-center py-4">
      <span className="text-fontSize-xs text-muted-foreground">{productName[0]}</span>
    </aside>
  );
}

PARTE 3: EXPORTAR
ARCHIVO: apps/webapp/src/domains/core/components/index.ts

Añadir exports:
export { WorkspaceShell } from "./workspace-shell";
export { WorkspaceSidebar } from "./workspace-sidebar";

VALIDACIÓN:
- [ ] pnpm --filter @hikai/webapp exec tsc --noEmit
- [ ] Componentes exportados correctamente
```

**Validación**:

- [ ] `WorkspaceShell` creado y exportado
- [ ] `WorkspaceSidebar` placeholder creado
- [ ] Sin errores de TypeScript

---

### F1.2: WorkspaceSidebar

**Objetivo**: Implementar la navegación del workspace (sidebar minimalista con iconos).

**Archivos**:

- `apps/webapp/src/domains/core/components/workspace-sidebar.tsx` - Implementar
- `apps/webapp/src/i18n/locales/en/common.json` - Traducciones
- `apps/webapp/src/i18n/locales/es/common.json` - Traducciones

**Prompt**:

```
FASE 1.2: WorkspaceSidebar

PARTE 1: IMPLEMENTAR workspace-sidebar.tsx
ARCHIVO: apps/webapp/src/domains/core/components/workspace-sidebar.tsx

Implementar sidebar minimalista estilo Linear con solo iconos.

import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Clock,        // Timeline
  Megaphone,    // Marketing
  Users,        // Customer Success
  Package,      // Product Team
  FileText,     // Content
  Send,         // Publishing
  Settings      // Settings (link a /settings/product/$slug)
} from "@hikai/ui";
import { cn } from "@hikai/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hikai/ui";

interface WorkspaceSidebarProps {
  productId: string;
  productSlug: string;
  orgSlug: string;
}

const navItems = [
  { key: "timeline", icon: Clock, href: "timeline" },
  { key: "marketing", icon: Megaphone, href: "marketing" },
  { key: "customerSuccess", icon: Users, href: "customer-success" },
  { key: "productTeam", icon: Package, href: "product-team" },
  { key: "content", icon: FileText, href: "content" },
  { key: "publishing", icon: Send, href: "publishing" },
];

export function WorkspaceSidebar({ productSlug, orgSlug }: WorkspaceSidebarProps) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const basePath = `/app/${orgSlug}/${productSlug}`;

  return (
    <aside className="w-14 border-r bg-muted/30 flex flex-col items-center py-4 gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const fullPath = `${basePath}/${item.href}`;
        const isActive = location.pathname.startsWith(fullPath);

        return (
          <Tooltip key={item.key} delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                to={fullPath}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              {t(`workspace.nav.${item.key}`)}
            </TooltipContent>
          </Tooltip>
        );
      })}

      {/* Separator */}
      <div className="flex-1" />

      {/* Settings link */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            to={`/settings/product/${productSlug}/general`}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          {t("workspace.nav.settings")}
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}

PARTE 2: TRADUCCIONES
ARCHIVO: apps/webapp/src/i18n/locales/en/common.json

Añadir en sección apropiada:
"workspace": {
  "nav": {
    "timeline": "Timeline",
    "marketing": "Marketing",
    "customerSuccess": "Customer Success",
    "productTeam": "Product Team",
    "content": "Content",
    "publishing": "Publishing",
    "settings": "Product Settings"
  }
}

ARCHIVO: apps/webapp/src/i18n/locales/es/common.json

"workspace": {
  "nav": {
    "timeline": "Timeline",
    "marketing": "Marketing",
    "customerSuccess": "Customer Success",
    "productTeam": "Equipo de Producto",
    "content": "Contenido",
    "publishing": "Publicación",
    "settings": "Configuración"
  }
}

PARTE 3: VERIFICAR ICONOS EN @hikai/ui

Si algún icono no está exportado en packages/ui/src/lib/icons.ts, añadirlo.

VALIDACIÓN:
- [ ] Sidebar muestra 6 iconos de navegación + settings
- [ ] Tooltips funcionan con traducciones
- [ ] Active state visual correcto
- [ ] pnpm --filter @hikai/webapp exec tsc --noEmit
```

**Validación**:

- [ ] Sidebar con 7 iconos (6 nav + settings)
- [ ] Tooltips con traducciones en/es
- [ ] Active state funciona
- [ ] Sin errores de TypeScript

---

### F1.3: Rutas del Workspace

**Objetivo**: Crear la estructura de rutas para el Product Workspace.

**Archivos**:

- `apps/webapp/src/routes/app/$orgSlug/$productSlug.tsx` - Layout padre
- `apps/webapp/src/routes/app/$orgSlug/$productSlug/index.tsx` - Redirect a timeline
- `apps/webapp/src/routes/app/$orgSlug/$productSlug/timeline.tsx` - Placeholder

**Prompt**:

```
FASE 1.3: Rutas del Workspace

PARTE 1: CREAR LAYOUT PADRE
ARCHIVO: apps/webapp/src/routes/app/$orgSlug/$productSlug.tsx

Crear el layout que envuelve todas las rutas del workspace.

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { WorkspaceShell } from "@/domains/core/components";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug } from "@/domains/products/hooks";

export const Route = createFileRoute("/app/$orgSlug/$productSlug")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { orgSlug, productSlug } = Route.useParams();
  const { currentOrg } = useCurrentOrg();
  const product = useGetProductBySlug(currentOrg?._id, productSlug);

  // Loading state
  if (product === undefined) {
    return <div>Loading...</div>; // TODO: skeleton
  }

  // Not found
  if (product === null) {
    return <div>Product not found</div>; // TODO: proper 404
  }

  return (
    <WorkspaceShell
      productId={product._id}
      productSlug={productSlug}
      orgSlug={orgSlug}
    >
      <Outlet />
    </WorkspaceShell>
  );
}

PARTE 2: REDIRECT INDEX A TIMELINE
ARCHIVO: apps/webapp/src/routes/app/$orgSlug/$productSlug/index.tsx

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/$orgSlug/$productSlug/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/app/$orgSlug/$productSlug/timeline",
      params,
    });
  },
});

PARTE 3: PLACEHOLDER TIMELINE
ARCHIVO: apps/webapp/src/routes/app/$orgSlug/$productSlug/timeline.tsx

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/$orgSlug/$productSlug/timeline")({
  component: TimelinePage,
});

function TimelinePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Timeline</h1>
      <p className="text-fontSize-sm text-muted-foreground mt-2">
        Coming in Phase 2
      </p>
    </div>
  );
}

PARTE 4: CREAR CARPETAS NECESARIAS

Asegurar que existen:
- apps/webapp/src/routes/app/
- apps/webapp/src/routes/app/$orgSlug/
- apps/webapp/src/routes/app/$orgSlug/$productSlug/

PARTE 5: REGENERAR RUTAS

Ejecutar:
pnpm --filter @hikai/webapp exec tsr generate

VALIDACIÓN:
- [ ] Navegación a /app/[org]/[product] muestra WorkspaceShell
- [ ] Redirect automático a /timeline
- [ ] Sidebar visible con navegación
- [ ] pnpm --filter @hikai/webapp exec tsc --noEmit
```

**Validación**:

- [ ] Ruta `/app/$orgSlug/$productSlug` funciona
- [ ] Redirect a `/timeline` automático
- [ ] WorkspaceShell renderiza correctamente
- [ ] Sin errores de TypeScript

---

### F1.4: Connectors Backend (CRUD)

**Objetivo**: Implementar queries y mutations para gestionar connections.

**Archivos**:

- `packages/convex/convex/connectors/connections.ts` - Crear
- `packages/convex/convex/connectors/index.ts` - Crear
- `packages/convex/convex/lib/access.ts` - Verificar helpers

**Prompt**:

```
FASE 1.4: Connectors Backend

PARTE 1: CREAR connections.ts
ARCHIVO: packages/convex/convex/connectors/connections.ts

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { assertProductAccess } from "../lib/access";

// === QUERIES ===

export const listByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    await assertProductAccess(ctx, productId);

    const connections = await ctx.db
      .query("connections")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    // Enrich with connector type info
    const enriched = await Promise.all(
      connections.map(async (conn) => {
        const connectorType = await ctx.db.get(conn.connectorTypeId);
        return {
          ...conn,
          connectorType,
          // Never expose credentials to frontend
          credentials: undefined,
        };
      })
    );

    return enriched;
  },
});

export const getById = query({
  args: { connectionId: v.id("connections") },
  handler: async (ctx, { connectionId }) => {
    const connection = await ctx.db.get(connectionId);
    if (!connection) return null;

    await assertProductAccess(ctx, connection.productId);

    const connectorType = await ctx.db.get(connection.connectorTypeId);
    return {
      ...connection,
      connectorType,
      credentials: undefined,
    };
  },
});

// === MUTATIONS ===

export const create = mutation({
  args: {
    productId: v.id("products"),
    connectorTypeId: v.id("connectorTypes"),
    name: v.string(),
    config: v.any(),
  },
  handler: async (ctx, args) => {
    const { membership } = await assertProductAccess(ctx, args.productId);

    // Only admins can add connections
    if (membership.role !== "admin") {
      throw new Error("Only admins can add connections");
    }

    const now = Date.now();
    const connectionId = await ctx.db.insert("connections", {
      ...args,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return connectionId;
  },
});

export const updateStatus = mutation({
  args: {
    connectionId: v.id("connections"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("error"),
      v.literal("disconnected")
    ),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, { connectionId, status, lastError }) => {
    const connection = await ctx.db.get(connectionId);
    if (!connection) throw new Error("Connection not found");

    const { membership } = await assertProductAccess(ctx, connection.productId);
    if (membership.role !== "admin") {
      throw new Error("Only admins can update connections");
    }

    await ctx.db.patch(connectionId, {
      status,
      lastError,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { connectionId: v.id("connections") },
  handler: async (ctx, { connectionId }) => {
    const connection = await ctx.db.get(connectionId);
    if (!connection) throw new Error("Connection not found");

    const { membership } = await assertProductAccess(ctx, connection.productId);
    if (membership.role !== "admin") {
      throw new Error("Only admins can remove connections");
    }

    await ctx.db.delete(connectionId);
  },
});

// Internal: Update credentials (called after OAuth)
export const updateCredentials = mutation({
  args: {
    connectionId: v.id("connections"),
    credentials: v.object({
      accessToken: v.optional(v.string()),
      refreshToken: v.optional(v.string()),
      expiresAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { connectionId, credentials }) => {
    const connection = await ctx.db.get(connectionId);
    if (!connection) throw new Error("Connection not found");

    await assertProductAccess(ctx, connection.productId);

    await ctx.db.patch(connectionId, {
      credentials,
      status: "active",
      updatedAt: Date.now(),
    });
  },
});

PARTE 2: CREAR index.ts
ARCHIVO: packages/convex/convex/connectors/index.ts

export * from "./connections";

PARTE 3: SEED CONNECTOR TYPES

Crear una mutation para seed inicial (ejecutar una vez):

// En connections.ts
export const seedConnectorTypes = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("connectorTypes").first();
    if (existing) return "Already seeded";

    const now = Date.now();

    // GitHub source
    await ctx.db.insert("connectorTypes", {
      type: "source",
      provider: "github",
      name: "GitHub",
      description: "Connect GitHub repositories to track commits, PRs, and releases",
      isEnabled: true,
      createdAt: now,
    });

    return "Seeded connector types";
  },
});

VALIDACIÓN:
- [ ] pnpm --filter @hikai/convex exec tsc --noEmit
- [ ] Queries retornan datos correctos (sin credentials)
- [ ] Mutations validan permisos de admin
- [ ] seedConnectorTypes funciona
```

**Validación**:

- [ ] CRUD de connections implementado
- [ ] Access control con `assertProductAccess`
- [ ] Credentials nunca expuestos en queries
- [ ] Sin errores de TypeScript

---

### F1.5: Connectors Frontend (UI)

**Objetivo**: Crear el dominio `connectors` en webapp con componentes UI.

**Archivos**:

- `apps/webapp/src/domains/connectors/hooks/use-connections.ts` - Crear
- `apps/webapp/src/domains/connectors/hooks/index.ts` - Crear
- `apps/webapp/src/domains/connectors/components/connection-list.tsx` - Crear
- `apps/webapp/src/domains/connectors/components/connection-card.tsx` - Crear
- `apps/webapp/src/domains/connectors/components/add-connection-dialog.tsx` - Crear
- `apps/webapp/src/domains/connectors/components/index.ts` - Crear
- `apps/webapp/src/domains/connectors/index.ts` - Crear
- `apps/webapp/src/i18n/locales/en/connectors.json` - Crear
- `apps/webapp/src/i18n/locales/es/connectors.json` - Crear

**Prompt**:

```
FASE 1.5: Connectors Frontend

PARTE 1: HOOK use-connections.ts
ARCHIVO: apps/webapp/src/domains/connectors/hooks/use-connections.ts

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useConnections(productId: Id<"products"> | undefined) {
  const connections = useQuery(
    api.connectors.connections.listByProduct,
    productId ? { productId } : "skip"
  );

  return { connections, isLoading: connections === undefined };
}

export function useConnectionMutations() {
  const createConnection = useMutation(api.connectors.connections.create);
  const removeConnection = useMutation(api.connectors.connections.remove);
  const updateStatus = useMutation(api.connectors.connections.updateStatus);

  return { createConnection, removeConnection, updateStatus };
}

PARTE 2: COMPONENTES

Crear ConnectionList, ConnectionCard, AddConnectionDialog siguiendo patrones de:
- ProductList/ProductCard para estructura
- Shared components (SettingsSection, etc.) para UI

ConnectionCard debe mostrar:
- Icono del provider
- Nombre de la conexión
- Status badge (active/pending/error)
- Menú de acciones (disconnect, remove)

AddConnectionDialog:
- Lista de connectorTypes disponibles (solo GitHub por ahora)
- Form para configurar la conexión (nombre, repo owner/name)
- Botón para iniciar OAuth flow

PARTE 3: i18n

Crear archivos de traducción para el dominio connectors.

PARTE 4: EXPORTS

Exportar hooks y componentes desde index.ts

VALIDACIÓN:
- [ ] pnpm --filter @hikai/webapp exec tsc --noEmit
- [ ] Componentes siguen patrones del repo
- [ ] Traducciones en en/es
```

**Validación**:

- [ ] Hook `useConnections` funciona
- [ ] Componentes creados y exportados
- [ ] Traducciones configuradas
- [ ] Sin errores de TypeScript

---

### F1.6: GitHub OAuth Flow

**Objetivo**: Implementar el flujo de autenticación OAuth con GitHub.

**Archivos**:

- `packages/convex/convex/connectors/github.ts` - Crear
- `packages/convex/convex/http.ts` - Añadir callback
- `apps/webapp/src/domains/connectors/components/add-connection-dialog.tsx` - Actualizar

**Prompt**:

```
FASE 1.6: GitHub OAuth Flow

PARTE 1: CREAR github.ts
ARCHIVO: packages/convex/convex/connectors/github.ts

Implementar funciones para:
1. Generar URL de autorización OAuth
2. Manejar callback OAuth
3. Intercambiar code por access token

NOTA: Esta es una implementación simplificada. En producción:
- Usar Convex actions para llamadas HTTP externas
- Almacenar client_id/secret en environment variables
- Implementar refresh token flow

export const getAuthUrl = query({
  args: {
    productId: v.id("products"),
    connectionId: v.id("connections"),
  },
  handler: async (ctx, { productId, connectionId }) => {
    await assertProductAccess(ctx, productId);

    // TODO: Usar CONVEX_SITE_URL para callback
    const redirectUri = `${process.env.CONVEX_SITE_URL}/api/github/callback`;
    const clientId = process.env.GITHUB_CLIENT_ID;

    const state = connectionId; // Simplificado - en prod usar JWT con expiry

    const params = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: redirectUri,
      scope: "repo read:org",
      state,
    });

    return `https://github.com/login/oauth/authorize?${params}`;
  },
});

PARTE 2: HTTP CALLBACK
ARCHIVO: packages/convex/convex/http.ts

Añadir handler para el callback de GitHub:

http.route({
  path: "/api/github/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // connectionId

    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 });
    }

    // Exchange code for token (via action)
    // Update connection credentials
    // Redirect to success page

    return Response.redirect(`${WEBAPP_URL}/oauth/success`);
  }),
});

PARTE 3: ACTUALIZAR UI

En AddConnectionDialog, al hacer click en "Connect GitHub":
1. Crear connection en status "pending"
2. Obtener authUrl
3. Abrir popup/redirect para OAuth
4. Manejar callback success

NOTA: Esta subfase establece la estructura. El flujo completo puede requerir ajustes según la configuración de GitHub App.

VALIDACIÓN:
- [ ] getAuthUrl genera URL válida
- [ ] HTTP callback handler creado
- [ ] UI inicia el flujo OAuth
- [ ] pnpm --filter @hikai/convex exec tsc --noEmit
```

**Validación**:

- [ ] Endpoint OAuth funciona
- [ ] Callback handler implementado
- [ ] UI conecta el flujo
- [ ] Sin errores de TypeScript

---

### F1.7: Settings > Product > Sources

**Objetivo**: Crear la página de configuración de sources en settings.

**Archivos**:

- `apps/webapp/src/routes/settings/product/$slug/sources.tsx` - Crear
- `apps/webapp/src/routes/settings.tsx` - Añadir nav item
- `apps/webapp/src/i18n/locales/en/common.json` - Traducción nav
- `apps/webapp/src/i18n/locales/es/common.json` - Traducción nav

**Prompt**:

```
FASE 1.7: Settings > Sources

PARTE 1: CREAR PÁGINA
ARCHIVO: apps/webapp/src/routes/settings/product/$slug/sources.tsx

import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SettingsLayout, SettingsHeader } from "@/domains/shared/components";
import { ConnectionList, AddConnectionDialog } from "@/domains/connectors/components";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useGetProductBySlug } from "@/domains/products/hooks";
import { Button, Plus } from "@hikai/ui";
import { useState } from "react";

export const Route = createFileRoute("/settings/product/$slug/sources")({
  component: ProductSourcesPage,
});

function ProductSourcesPage() {
  const { slug } = Route.useParams();
  const { t } = useTranslation("connectors");
  const { currentOrg } = useCurrentOrg();
  const product = useGetProductBySlug(currentOrg?._id, slug);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!product) return null;

  return (
    <SettingsLayout variant="wide">
      <SettingsHeader
        title={t("sources.title")}
        subtitle={t("sources.subtitle")}
      >
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("sources.addSource")}
        </Button>
      </SettingsHeader>

      <ConnectionList productId={product._id} />

      <AddConnectionDialog
        productId={product._id}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </SettingsLayout>
  );
}

PARTE 2: AÑADIR NAV ITEM
ARCHIVO: apps/webapp/src/routes/settings.tsx

En la sección de product settings nav, añadir:

<SettingsNavItem
  label={t("settingsNav.sources")}
  href={`/settings/product/${currentProduct.slug}/sources`}
  icon={Link2}
  isActive={location.pathname.includes("/sources")}
/>

PARTE 3: TRADUCCIONES

En common.json añadir:
"settingsNav": {
  ...existing,
  "sources": "Sources"
}

En connectors.json:
{
  "sources": {
    "title": "Connected Sources",
    "subtitle": "Manage data sources connected to this product",
    "addSource": "Add Source",
    "empty": "No sources connected yet",
    "emptyDescription": "Connect a source to start tracking product activity"
  }
}

VALIDACIÓN:
- [ ] Página accesible en /settings/product/$slug/sources
- [ ] Nav item visible y activo
- [ ] ConnectionList muestra conexiones (o empty state)
- [ ] AddConnectionDialog abre correctamente
- [ ] pnpm --filter @hikai/webapp exec tsc --noEmit
```

**Validación**:

- [ ] Página de sources funciona
- [ ] Navegación desde settings
- [ ] Lista de conexiones visible
- [ ] Dialog para añadir funciona
- [ ] Sin errores de TypeScript

---

## Dependencias entre Subfases

```
F1.0 (Schema) ──► F1.4 (Backend CRUD) ──► F1.5 (Frontend UI) ──► F1.7 (Settings)
                                              │
                                              └──► F1.6 (OAuth)

F1.1 (Shell) ──► F1.2 (Sidebar) ──► F1.3 (Routes)
```

- F1.0 es prerequisito para F1.4-F1.7
- F1.1-F1.3 pueden hacerse en paralelo con F1.4-F1.5
- F1.6 y F1.7 dependen de F1.5

---

## Checklist Final de Fase 1

### Backend

- [ ] Schema con connectorTypes y connections
- [ ] CRUD mutations con access control
- [ ] GitHub OAuth endpoints
- [ ] Seed de connectorTypes inicial

### Frontend

- [ ] WorkspaceShell y WorkspaceSidebar
- [ ] Rutas del workspace configuradas
- [ ] Dominio connectors con hooks y componentes
- [ ] Página Settings > Sources

### Testing

- [ ] Navegación al workspace funciona
- [ ] Sidebar muestra iconos con tooltips
- [ ] Lista de conexiones carga
- [ ] Añadir conexión (UI flow)
- [ ] GitHub OAuth flow (hasta donde sea posible sin GitHub App real)

---

## Notas de Implementación

### GitHub App

Para el OAuth flow completo necesitas:

1. Crear GitHub App en github.com/settings/apps
2. Configurar OAuth callback URL
3. Añadir environment variables:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`

### Estado Mínimo Viable

Si el OAuth no está listo, la fase se considera completa cuando:

- El schema existe
- El workspace shell funciona
- La UI de settings muestra la lista de conexiones
- El dialog de añadir muestra opciones (aunque no complete OAuth)
