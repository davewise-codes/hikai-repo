# Settings

## Arquitectura

La configuración de Hikai se centraliza en `/settings/*` con una navegación lateral persistente (SettingsNav) y páginas especializadas por contexto.

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ AppShell (header)                                                    │
├────────────────┬────────────────────────────────────────────────────┤
│                │                                                    │
│  SettingsNav   │              Content Area                          │
│  (resizable)   │    (narrow: max-w-2xl | wide: max-w-5xl)          │
│                │                                                    │
│  ┌──────────┐  │    ┌─────────────────────────────────────────┐   │
│  │ User     │  │    │                                          │   │
│  │ ├ Profile│  │    │         Page Content                     │   │
│  │ ├ Prefs  │  │    │         (SettingsLayout)                 │   │
│  │ └ ...    │  │    │                                          │   │
│  │          │  │    └─────────────────────────────────────────┘   │
│  │ Org      │  │                                                    │
│  │ ├ General│  │                                                    │
│  │ └ ...    │  │                                                    │
│  │          │  │                                                    │
│  │ Product  │  │                                                    │
│  │ └ ...    │  │                                                    │
│  └──────────┘  │                                                    │
└────────────────┴────────────────────────────────────────────────────┘
```

## Estructura de URLs

### User Settings (siempre visible)

| Ruta | Descripción | Layout |
|------|-------------|--------|
| `/settings` | Redirect → `/settings/preferences` | - |
| `/settings/profile` | Nombre, avatar, email | narrow |
| `/settings/preferences` | Tema, color, font size, idioma | narrow |
| `/settings/security` | *(placeholder)* Coming soon | narrow |
| `/settings/organizations` | Mis organizaciones (cards) | wide |
| `/settings/products` | Mis productos (cards) | wide |
| `/settings/accounts` | *(placeholder)* Connected accounts | narrow |

### Organization Settings (solo admin/owner de la org actual)

| Ruta | Descripción | Layout |
|------|-------------|--------|
| `/settings/org/$slug` | Redirect → `/settings/org/$slug/general` | - |
| `/settings/org/$slug/general` | Nombre, descripción, danger zone | narrow |
| `/settings/org/$slug/plan` | Plan actual, límites, upgrade | narrow |
| `/settings/org/$slug/seats` | *(placeholder)* Coming soon | wide |
| `/settings/org/$slug/billing` | *(placeholder)* Coming soon | narrow |
| `/settings/org/$slug/products` | Productos de la org (cards) | wide |

### Product Settings (solo admin del producto actual)

| Ruta | Descripción | Layout |
|------|-------------|--------|
| `/settings/product/$slug` | Redirect → `/settings/product/$slug/general` | - |
| `/settings/product/$slug/general` | Nombre, descripción, danger zone | narrow |
| `/settings/product/$slug/team` | Miembros del producto (tabla) | wide |

## Permisos

### Secciones de SettingsNav

| Sección | Condición de visibilidad |
|---------|-------------------------|
| User | Siempre visible |
| Organization | `currentOrg` existe Y usuario es admin/owner |
| Product | `currentProduct` existe Y usuario es admin |

### Acceso a páginas

- **User Settings**: Cualquier usuario autenticado
- **Org Settings**: Requiere ser admin/owner de la organización
- **Product Settings**: Requiere ser admin del producto

## Accesos rápidos

### Desde el header

| Componente | Acción | Destino |
|------------|--------|---------|
| UserMenu → Settings icon | Click en engranaje junto al nombre | `/settings/profile` |
| UserMenu → My Products | Link en dropdown | `/settings/products` |
| OrgSwitcher → Settings icon | Click en engranaje de org actual | `/settings/org/$slug/general` |
| ProductSwitcher → Settings icon | Click en engranaje de producto actual | `/settings/product/$slug/general` |

### Desde cards (OrgCard, ProductCard)

| Card | Acción | Destino |
|------|--------|---------|
| OrgCard → View/Settings | Dropdown menu | `/settings/org/$slug/general` |
| ProductCard → View/Settings | Dropdown menu | `/settings/product/$slug/general` |

## Componentes

### SettingsNav

Navegación lateral con secciones dinámicas basadas en contexto y permisos.

```tsx
<SettingsNav>
  <SettingsNavSection title={t("nav.user")}>
    <SettingsNavItem label="Profile" href="/settings/profile" icon={User} />
    <SettingsNavItem label="Security" disabled badge="Coming soon" />
  </SettingsNavSection>

  {currentOrg && isOrgAdmin && (
    <SettingsNavSection title={currentOrg.name}>
      <SettingsNavItem label="General" href={`/settings/org/${slug}/general`} />
    </SettingsNavSection>
  )}
</SettingsNav>
```

### SettingsLayout

Wrapper para contenido con variantes de ancho.

- `variant="narrow"` (default): `max-w-2xl` - Para formularios
- `variant="wide"`: `max-w-5xl` - Para tablas y grids de cards

## Añadir nueva página de settings

1. **Crear la ruta** en `src/routes/settings/[section]/[page].tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { SettingsLayout, SettingsHeader, SettingsSection } from "@/domains/shared";

export const Route = createFileRoute("/settings/nueva-pagina")({
  component: NuevaPagina,
});

function NuevaPagina() {
  return (
    <SettingsLayout variant="narrow">
      <SettingsHeader title="Nueva Página" subtitle="Descripción" />
      <SettingsSection title="Sección">
        {/* Contenido */}
      </SettingsSection>
    </SettingsLayout>
  );
}
```

2. **Añadir item al nav** en `src/routes/settings.tsx`:

```tsx
<SettingsNavItem
  label={t("nav.nuevaPagina")}
  href="/settings/nueva-pagina"
  icon={NuevoIcon}
  isActive={location.pathname === "/settings/nueva-pagina"}
/>
```

3. **Añadir traducciones** en `src/i18n/locales/[lang]/settings.json`

## Danger Zone

Las acciones destructivas (transferir, eliminar) se agrupan en una sección "Danger Zone" al final de las páginas `/general`:

- **Transfer ownership** (solo owner, solo orgs no-personales)
- **Delete** (solo owner/admin según contexto)

Usan `Button variant="ghost-destructive"` y diálogos de confirmación con input del nombre.
