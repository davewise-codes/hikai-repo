# Public Timeline Publishing - Initiative Definition

## Contexto

### Problema que resuelve Hikai
> "El cuello de botella invisible: Aunque los equipos de ingeniería envían actualizaciones constantemente, nadie fuera del código se entera."

Hikai automatiza la comunicación del progreso del producto, convirtiendo cambios en código en narrativas públicas que la audiencia puede seguir sin esfuerzo manual.

### Por qué es crítica esta funcionalidad
La publicación del timeline es **el mecanismo de entrega** de la propuesta de valor. Sin ella, Hikai genera timelines que solo el equipo interno puede ver. Con ella, el producto se convierte en un **activo de comunicación** que trabaja 24/7.

---

## 1. Visión del Feature

### User Story Principal
> Como usuario de Hikai, quiero publicar mi timeline en una URL pública para que mi audiencia (usuarios, inversores, comunidad) pueda seguir el progreso de mi producto sin que yo tenga que hacer nada más.

### Jobs to be Done
1. **Comunicar progreso sin esfuerzo**: Una vez configurado, el timeline se actualiza solo
2. **Profesionalizar la presencia**: Una página dedicada es más profesional que un tweet o post
3. **Generar confianza**: Transparencia = credibilidad para early adopters e inversores
4. **Crear un activo de SEO**: Cada actualización agrega contenido indexable

---

## 2. Arquitectura Propuesta

### 2.1 Modelo de Datos

#### Nueva tabla: `publicTimelines`
```typescript
publicTimelines: defineTable({
  // Identificación
  productId: v.id("products"),
  slug: v.string(), // URL-friendly identifier, ej: "hikai-updates"

  // Control de acceso
  isActive: v.boolean(),

  // Configuración de contenido
  settings: v.object({
    hideInternalEvents: v.boolean(), // Filtrar eventos con visibility: "internal"
    // Fase 2: customColors, customDomain, etc.
  }),

  // Metadata
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_slug", ["slug"])
  .index("by_product", ["productId"])
```

**Decisiones de diseño:**
- **slug en lugar de token aleatorio**: URLs memorables y compartibles (`/p/hikai-updates` vs `/p/x7k9m2q`)
- **isActive para control**: Permite desactivar sin eliminar
- **settings como objeto**: Extensible para futuras opciones sin migrations

#### Campo `visibility` en interpretedEvents
El campo ya existe y el agente de interpretación ya clasifica eventos como `"public"` o `"internal"` basándose en el contenido. Necesitamos:
1. **Edición manual**: Permitir al usuario cambiar la visibility de eventos individuales desde el timeline privado
2. **Respetar en queries públicas**: Filtrar eventos `internal` cuando `hideInternalEvents: true`

### 2.2 Rutas y URLs

#### MVP: Path-based (Vercel Free compatible)
```
Autenticado (existente):
/app/:orgSlug/:productSlug/timeline     → Timeline completo con controles

Público (nuevo):
/p/:slug                                 → Timeline público (read-only)
```

**Justificación del prefijo `/p/`:**
- Corto y memorable
- Claramente separado de rutas autenticadas
- No conflicta con slugs de org/producto
- Funciona con Vercel plan gratuito

#### Evolución futura: Subdominios (Vercel Pro)
```
MVP (Vercel Free):
https://app.hikai.pro/p/producto

Futuro (Vercel Pro - wildcard domains):
https://producto.hikai.pro

Premium (custom domain):
https://updates.clienteempresa.com → CNAME
```

**Comparativa de patrones:**

| Aspecto | Path (`/p/slug`) | Subdominio (`slug.hikai.pro`) |
|---------|------------------|-------------------------------|
| **Branding** | Claramente "dentro de Hikai" | Parece "tu sitio" |
| **SEO** | Todo beneficia dominio principal | Cada subdominio es sitio separado |
| **Custom domain** | Requiere redirect/proxy | Transición natural (CNAME) |
| **Vercel Free** | ✅ Funciona | ❌ Requiere Pro ($20/mes) |
| **Complejidad** | Baja | Media (wildcard DNS + SSL) |

**Plan de migración**: Cuando se escale a Vercel Pro, migrar de `/p/slug` a `slug.hikai.pro` con redirects 301 para mantener SEO.

### 2.3 Queries de Convex

#### Nueva query pública: `getPublicTimeline`
```typescript
// NO usa assertProductAccess - acceso público
export const getPublicTimeline = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const publicTimeline = await ctx.db
      .query("publicTimelines")
      .withIndex("by_slug", q => q.eq("slug", slug))
      .first();

    if (!publicTimeline || !publicTimeline.isActive) {
      return null; // 404
    }

    // Obtener eventos (filtrados por visibility si aplica)
    const events = await ctx.db
      .query("interpretedEvents")
      .withIndex("by_product_time", q => q.eq("productId", publicTimeline.productId))
      .filter(q =>
        publicTimeline.settings.hideInternalEvents
          ? q.eq(q.field("visibility"), "public")
          : true
      )
      .order("desc")
      .take(500);

    // Obtener bucket summaries
    const buckets = await ctx.db
      .query("bucketSummaries")
      .withIndex("by_product_time", q => q.eq("productId", publicTimeline.productId))
      .order("desc")
      .take(100);

    // Obtener info básica del producto (solo nombre, no datos sensibles)
    const product = await ctx.db.get(publicTimeline.productId);

    return {
      productName: product?.name,
      productDescription: product?.description,
      events,
      buckets,
      settings: publicTimeline.settings,
    };
  },
});
```

#### Mutations para gestión
```typescript
// Crear/actualizar publicación
publishTimeline(productId, slug, settings) → assertProductAccess + validar slug único

// Desactivar publicación
unpublishTimeline(productId) → assertProductAccess

// Actualizar settings
updatePublicTimelineSettings(productId, settings) → assertProductAccess

// Actualizar slug (con warning de romper links)
updatePublicTimelineSlug(productId, newSlug) → assertProductAccess + validar único
```

#### Mutation para editar visibility de eventos
```typescript
// Cambiar visibility de un evento individual
updateEventVisibility(eventId, visibility: "public" | "internal") → assertProductAccess
```

---

## 3. Diseño de UI/UX

### 3.1 Arquitectura de Componentes Compartidos

Para mantener sincronía entre timeline privado y público sin duplicar código, usamos un **contexto de modo**:

```typescript
// domains/timeline/context/timeline-mode.tsx
type TimelineMode = "private" | "public";

const TimelineModeContext = createContext<TimelineMode>("private");

export function TimelineModeProvider({
  mode,
  children
}: {
  mode: TimelineMode;
  children: React.ReactNode
}) {
  return (
    <TimelineModeContext.Provider value={mode}>
      {children}
    </TimelineModeContext.Provider>
  );
}

export function useTimelineMode() {
  return useContext(TimelineModeContext);
}
```

**Uso en componentes:**

```typescript
// Componente que solo se muestra en modo privado
function TimelineControls() {
  const mode = useTimelineMode();

  if (mode === "public") return null;

  return (
    <div className="flex gap-2">
      <SyncButton />
      <RegenerateButton />
      <HistoryButton />
      <CopyTimelineButton />
    </div>
  );
}

// Componente que se comporta diferente según modo
function EventCard({ event }) {
  const mode = useTimelineMode();

  return (
    <Card>
      <EventContent event={event} />
      {mode === "private" && (
        <VisibilityToggle event={event} />
      )}
    </Card>
  );
}
```

**En las rutas:**

```typescript
// Ruta privada (existente) - /app/:org/:product/timeline
<TimelineModeProvider mode="private">
  <TimelinePage />
</TimelineModeProvider>

// Ruta pública (nueva) - /p/:slug
<TimelineModeProvider mode="public">
  <TimelinePage productData={publicData} />
</TimelineModeProvider>
```

**Ventajas:**
- Un solo set de componentes mantenidos
- Cambios en UI privada se reflejan automáticamente en pública
- Control granular por componente
- Fácil de testear ambos modos
- No hay drift entre versiones

### 3.2 Panel de Publicación (en timeline autenticado)

**Ubicación:** Nuevo botón "Publish" junto a los controles existentes (Sync, Regenerate, History)

**Estados del botón:**
1. **No publicado**: "Publish" → Abre modal de configuración
2. **Publicado**: "Published ✓" → Abre modal con URL y opciones

**Modal de Publicación (primera vez):**
```
┌─────────────────────────────────────────────────────┐
│  Publish Timeline                              [X]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Your timeline will be available at:                │
│  ┌─────────────────────────────────────────────┐    │
│  │ https://app.hikai.pro/p/[slug]          📋 │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  URL slug                                           │
│  ┌─────────────────────────────────────────────┐    │
│  │ hikai-updates                               │    │  ← Auto-generado
│  └─────────────────────────────────────────────┘    │
│  Only lowercase letters, numbers, and hyphens       │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  Content Settings                                   │
│                                                     │
│  ☑ Hide internal events                             │
│    Only show events marked as "public"              │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│              [Cancel]      [Publish Timeline]       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Auto-generación de slug:**
- Basado en nombre del producto: "Hikai App" → `hikai-app`
- Si existe, añadir sufijo: `hikai-app-2`
- Validación en tiempo real de disponibilidad

**Modal cuando ya está publicado:**
```
┌─────────────────────────────────────────────────────┐
│  Timeline Published                            [X]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Your public timeline:                              │
│  ┌─────────────────────────────────────────────┐    │
│  │ https://app.hikai.pro/p/hikai-updates   📋 │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [Open in new tab ↗]                                │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  URL slug                                           │
│  ┌─────────────────────────────────────────────┐    │
│  │ hikai-updates                          [✎] │    │
│  └─────────────────────────────────────────────┘    │
│  ⚠️ Changing the slug will break existing links     │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  Content Settings                                   │
│                                                     │
│  ☑ Hide internal events                             │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│    [Unpublish]             [Save Changes]           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3.3 Página Pública (`/p/:slug`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Product Logo/Icon]  Product Name                          │
│  Brief description if available                             │
│  Last updated: Feb 5, 2026                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┬───────────────────────────────────┤
│  │                     │                                   │
│  │   Timeline List     │   Event Details Panel             │
│  │   (Buckets)         │   (Filtered Events)               │
│  │                     │                                   │
│  │   - Navegación      │   - Filtros (categories, domain)  │
│  │   - Scroll suave    │   - Lista de eventos              │
│  │   - Indicadores     │   - Sin raw events (sensibles)    │
│  │                     │                                   │
│  └─────────────────────┴───────────────────────────────────┤
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Powered by Hikai ─ Automated product updates    [Try it →] │
└─────────────────────────────────────────────────────────────┘
```

**Elementos que SE MUESTRAN:**
- Nombre y descripción del producto
- Fecha de última actualización
- Timeline con buckets y eventos (reutilizando componentes)
- Filtros de categoría, dominio, fecha
- Navegación (prev/next, keyboard)
- Animaciones y transiciones
- Footer con branding Hikai + CTA

**Elementos que NO se muestran (controlados por `useTimelineMode()`):**
- Botones: Sync, Regenerate, History, Copy Timeline
- Indicador de progreso del agente
- Eventos con `visibility: "internal"` (si `hideInternalEvents: true`)
- Raw events (datos técnicos sensibles)
- Controles de edición de visibility
- Controles de administración

### 3.4 Estados de la Página Pública

1. **Loading**: Skeleton screen (mismo que timeline privado)
2. **Success**: Timeline completo con navegación
3. **Not Found (404)**: Slug no existe o timeline desactivado
   ```
   Timeline not found
   This timeline doesn't exist or is no longer public.

   [Discover Hikai →]
   ```
4. **Empty Timeline**: Producto existe pero sin eventos
   ```
   No updates yet
   This product hasn't published any updates yet. Check back soon!

   [Get notified when updates arrive →]  ← Fase futura
   ```

---

## 4. SEO y Compartibilidad

### 4.1 Estrategia SEO con Vercel

**Problema**: La webapp es una SPA (Vite + React). Los bots de redes sociales y algunos crawlers no ejecutan JavaScript.

**Solución**: Vercel Edge Middleware para inyectar meta tags dinámicos.

```typescript
// middleware.ts (raíz del proyecto webapp)
import { NextResponse } from 'next/server';

export const config = {
  matcher: '/p/:slug*',
};

export async function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /bot|crawler|spider|facebook|twitter|linkedin|slack|telegram|whatsapp/i.test(userAgent);

  if (isBot) {
    // Reescribir a endpoint que genera HTML con meta tags
    const url = new URL(request.url);
    const slug = url.pathname.split('/p/')[1];
    return NextResponse.rewrite(
      new URL(`/api/og-timeline/${slug}`, request.url)
    );
  }

  return NextResponse.next();
}
```

```typescript
// api/og-timeline/[slug].ts - Serverless function
export default async function handler(req, res) {
  const { slug } = req.query;

  // Fetch timeline data from Convex
  const timeline = await convex.query(api.publicTimeline.getPublicTimeline, { slug });

  if (!timeline) {
    return res.status(404).send('Not found');
  }

  // Generar HTML con Open Graph tags
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${timeline.productName} - Product Updates</title>
      <meta property="og:title" content="${timeline.productName} - Product Updates" />
      <meta property="og:description" content="${timeline.productDescription || 'Follow the latest updates'}" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://app.hikai.pro/p/${slug}" />
      <meta property="og:image" content="https://app.hikai.pro/api/og-image/${slug}" />
      <meta name="twitter:card" content="summary_large_image" />
      <!-- Redirect usuarios reales a la SPA -->
      <meta http-equiv="refresh" content="0;url=/p/${slug}" />
    </head>
    <body>
      <h1>${timeline.productName}</h1>
      <p>${timeline.productDescription}</p>
      <p>Latest updates from ${timeline.productName}</p>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}
```

### 4.2 Open Graph Image (Fase 2)

Generar imagen dinámica para compartir:

```
┌─────────────────────────────────────────┐
│                                         │
│   🚀 Product Name                       │
│                                         │
│   Latest updates                        │
│   • Feature X launched                  │
│   • Bug fix for Y                       │
│   • Improved Z performance              │
│                                         │
│   app.hikai.pro/p/slug     [Hikai logo] │
└─────────────────────────────────────────┘
```

Herramientas: `@vercel/og` o `satori` para generar imágenes en edge.

### 4.3 Beneficios SEO

| Aspecto | Sin middleware | Con middleware |
|---------|---------------|----------------|
| Twitter/LinkedIn preview | ❌ Sin imagen/título | ✅ Rich preview |
| Google indexación | ⚠️ Eventual (SPA) | ✅ Inmediata |
| Slack/Discord preview | ❌ Link plano | ✅ Card con info |
| Lighthouse SEO score | ~60 | ~95 |

---

## 5. Consideraciones de Seguridad

### 5.1 Qué datos se exponen públicamente

| Dato | Público | Notas |
|------|---------|-------|
| Nombre del producto | ✅ | Necesario para contexto |
| Descripción del producto | ✅ | Opcional, si existe |
| Interpreted events (title, summary, type) | ✅ | El valor principal |
| Bucket summaries (narrative, domains) | ✅ | Contexto agregado |
| Timestamps | ✅ | Necesario para timeline |
| Domains y capabilities | ✅ | Útil para filtrado |
| Raw events (commits, PRs) | ❌ | Datos técnicos sensibles |
| Inference logs | ❌ | Interno |
| Connection details | ❌ | Credenciales |
| Organization/team info | ❌ | Privado |
| Internal events | Configurable | Según `hideInternalEvents` |

### 5.2 Rate Limiting

Para la query pública, implementar en Convex:
- Rate limit por IP: ~100 requests/min
- Cache de resultados: 1-5 minutos (Convex tiene caching nativo)
- Límite de 500 eventos por query

### 5.3 Validación de Slugs

```typescript
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 50;

const RESERVED_SLUGS = [
  'api', 'app', 'admin', 'help', 'status', 'about',
  'login', 'signup', 'settings', 'dashboard', 'www',
  'mail', 'ftp', 'blog', 'shop', 'store', 'support'
];

function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (slug.length < MIN_LENGTH) {
    return { valid: false, error: `Minimum ${MIN_LENGTH} characters` };
  }
  if (slug.length > MAX_LENGTH) {
    return { valid: false, error: `Maximum ${MAX_LENGTH} characters` };
  }
  if (!SLUG_REGEX.test(slug)) {
    return { valid: false, error: 'Only lowercase letters, numbers, and hyphens' };
  }
  if (RESERVED_SLUGS.includes(slug)) {
    return { valid: false, error: 'This slug is reserved' };
  }
  return { valid: true };
}
```

---

## 6. Fases de Implementación

### Fase 1: MVP (Esta iniciativa)
- [ ] Schema: tabla `publicTimelines`
- [ ] Queries: `getPublicTimeline`, mutations de gestión
- [ ] Mutation: `updateEventVisibility` para edición manual
- [ ] Context: `TimelineModeProvider` para componentes compartidos
- [ ] UI: Botón Publish + Modal de configuración
- [ ] Ruta: `/p/:slug` con timeline read-only
- [ ] Filtrado: Respetar `hideInternalEvents`
- [ ] SEO: Vercel Edge Middleware para meta tags
- [ ] Estados: Loading, 404, Empty

**Entregable:** URL pública funcional con timeline navegable, filtrable y compartible en redes sociales

### Fase 2: Mejoras de Branding y SEO
- [ ] Open Graph image dinámico (`@vercel/og`)
- [ ] Colores personalizados (background, primary, accent)
- [ ] Logo del producto
- [ ] Modo claro/oscuro configurable
- [ ] Pre-rendering estático para mejor SEO

### Fase 3: Subdominios (requiere Vercel Pro)
- [ ] Migrar de `/p/slug` a `slug.hikai.pro`
- [ ] Wildcard DNS configuration
- [ ] Redirects 301 para mantener SEO
- [ ] Custom domains (CNAME) como feature premium

### Fase 4: Analytics y Engagement
- [ ] Contador de visitas (privacy-friendly)
- [ ] Suscripción por email a updates
- [ ] RSS feed
- [ ] Webhook para integraciones

---

## 7. Métricas de Éxito

### Adopción
- % de productos con timeline publicado
- Tiempo desde creación de producto hasta primera publicación
- Slugs personalizados vs auto-generados

### Engagement
- Visitas a timelines públicos
- Fuentes de tráfico (directo, social, search)
- Tiempo en página
- Uso de filtros
- Profundidad de scroll (cuántos buckets se ven)

### Valor generado
- Links compartidos (referrer tracking)
- Clicks en "Powered by Hikai"
- Conversión de visitantes a usuarios de Hikai
- SEO: rankings de páginas públicas

---

## 8. Decisiones Tomadas

| Decisión | Resolución | Razonamiento |
|----------|------------|--------------|
| URL format | Path-based (`/p/slug`) | Vercel Free compatible, migrable a subdominios |
| Slug editable | Sí, con warning | Flexibilidad > rigidez, usuario informado |
| Auto-generación de slug | Sí, basado en nombre producto | Reduce fricción, siempre editable |
| Visibility classification | Agente AI + edición manual | Ya implementado, añadir UI de edición |
| Componentes UI | Compartidos via Context | Evita drift, mantiene sincronía |
| SEO strategy | Edge Middleware + meta tags | Bajo costo, alto impacto en compartibilidad |
| Fecha última actualización | Mostrar | Señal de actividad, diferenciador |

---

## 9. Dependencias y Riesgos

### Dependencias
- Campo `visibility` en interpretedEvents funcionando (✅ ya existe)
- UI components existentes reutilizables (✅ confirmado)
- Vercel Edge Middleware (✅ disponible en plan Free)

### Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Abuso de URLs públicas (scraping) | Media | Bajo | Rate limiting nativo Convex |
| Exposición accidental de datos sensibles | Baja | Alto | Review exhaustivo de query pública, tests |
| Performance con muchos eventos | Baja | Medio | Límite 500 eventos, paginación futura |
| Slugs ofensivos/abusivos | Baja | Medio | Lista de palabras reservadas |
| Bot detection falsos positivos | Baja | Bajo | Fallback a SPA normal |

---

## 10. Definición de Hecho (MVP)

El feature está completo cuando:

1. ✅ **Publicación funciona**
   - Usuario puede publicar timeline con slug auto-generado o personalizado
   - Puede configurar si ocultar eventos internos
   - Puede editar slug (con warning)
   - Puede despublicar

2. ✅ **URL pública funciona**
   - `/p/:slug` muestra timeline correctamente
   - Usa mismos componentes que timeline privado
   - Filtros funcionan (categoría, dominio, fecha)
   - Navegación por teclado funciona
   - Mobile responsive

3. ✅ **Compartibilidad verificada**
   - Preview correcto en Twitter
   - Preview correcto en LinkedIn
   - Preview correcto en Slack
   - Meta tags básicos funcionan

4. ✅ **Seguridad verificada**
   - Solo datos permitidos se exponen
   - Eventos internal filtrados cuando configurado
   - Slugs validados
   - No expone raw events ni datos sensibles

5. ✅ **UX pulida**
   - Loading states
   - 404 amigable con CTA
   - Empty state informativo
   - Footer con branding Hikai

---

## Anexo A: Component Reuse Matrix

| Componente | Timeline Privado | Timeline Público | Cambios |
|------------|-----------------|------------------|---------|
| `TimelineModeProvider` | `mode="private"` | `mode="public"` | **Nuevo** |
| `timeline-list.tsx` | ✅ | ✅ | Usa context para ocultar controles |
| `bucket-hero.tsx` | ✅ | ✅ | Sin cambios |
| `bucket-compact.tsx` | ✅ | ✅ | Sin cambios |
| `domain-list.tsx` | ✅ | ✅ | Sin cambios |
| `timeline-filters.tsx` | ✅ | ✅ | Sin cambios |
| `TimelineControls` | ✅ | ❌ (hidden) | Usa `useTimelineMode()` |
| `ProgressIndicator` | ✅ | ❌ (hidden) | Usa `useTimelineMode()` |
| `VisibilityToggle` | ✅ | ❌ (hidden) | **Nuevo**, usa context |
| `PublishButton` | ✅ | ❌ (n/a) | **Nuevo** |
| `PublishModal` | ✅ | ❌ (n/a) | **Nuevo** |
| `PublicHeader` | ❌ (n/a) | ✅ | **Nuevo** |
| `PublicFooter` | ❌ (n/a) | ✅ | **Nuevo** |

## Anexo B: API Reference

```typescript
// === Queries ===

// Público - sin auth
api.publicTimeline.getPublicTimeline({ slug: string })
// Returns: { productName, productDescription, events, buckets, settings } | null

// Privado - requiere auth
api.publicTimeline.getPublicTimelineByProduct({ productId: Id<"products"> })
// Returns: PublicTimeline | null (para saber si está publicado)

// === Mutations ===

// Crear publicación
api.publicTimeline.publish({
  productId: Id<"products">,
  slug: string,
  settings: { hideInternalEvents: boolean }
})
// Returns: { slug: string, url: string }

// Actualizar settings
api.publicTimeline.updateSettings({
  productId: Id<"products">,
  settings: { hideInternalEvents: boolean }
})

// Actualizar slug
api.publicTimeline.updateSlug({
  productId: Id<"products">,
  newSlug: string
})
// Returns: { slug: string, url: string }

// Despublicar
api.publicTimeline.unpublish({ productId: Id<"products"> })

// Editar visibility de evento
api.timeline.updateEventVisibility({
  eventId: Id<"interpretedEvents">,
  visibility: "public" | "internal"
})

// === Helpers ===

// Validar disponibilidad de slug
api.publicTimeline.checkSlugAvailability({ slug: string })
// Returns: { available: boolean, suggestion?: string }

// Generar slug sugerido
api.publicTimeline.generateSlug({ productId: Id<"products"> })
// Returns: { slug: string }
```

## Anexo C: File Structure

```
apps/webapp/src/
├── domains/timeline/
│   ├── components/
│   │   ├── timeline-list.tsx        # Existente, añadir useTimelineMode()
│   │   ├── bucket-hero.tsx          # Sin cambios
│   │   ├── bucket-compact.tsx       # Sin cambios
│   │   ├── domain-list.tsx          # Sin cambios
│   │   ├── timeline-filters.tsx     # Sin cambios
│   │   ├── timeline-controls.tsx    # Nuevo: Sync/Regenerate/History (usa context)
│   │   ├── visibility-toggle.tsx    # Nuevo: Toggle public/internal
│   │   ├── publish-button.tsx       # Nuevo: Botón de publicación
│   │   └── publish-modal.tsx        # Nuevo: Modal de configuración
│   ├── context/
│   │   └── timeline-mode.tsx        # Nuevo: TimelineModeProvider
│   └── hooks/
│       └── use-timeline.ts          # Existente
├── routes/
│   ├── app/$orgSlug/$productSlug/
│   │   └── timeline.tsx             # Existente, wrap con mode="private"
│   └── p/
│       └── $slug.tsx                # Nuevo: Página pública
├── api/
│   └── og-timeline/
│       └── [slug].ts                # Nuevo: Meta tags para bots
└── middleware.ts                     # Nuevo: Bot detection
```
