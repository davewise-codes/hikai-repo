# Shared Domain

Componentes y utilidades compartidos entre dominios de webapp.
Siguen el estilo visual de Linear (centrado, compacto, profesional).

## Estructura

```
shared/
├── components/
│   ├── settings-nav/              # Navegación lateral de settings
│   │   ├── settings-nav.tsx       # Contenedor con resize
│   │   ├── settings-nav-section.tsx # Sección con título
│   │   ├── settings-nav-item.tsx  # Item de navegación
│   │   └── use-nav-width.ts       # Hook para resize y persistencia
│   ├── settings-layout.tsx        # Layout centrado (narrow/wide)
│   ├── settings-header.tsx        # Header con título y acciones
│   ├── settings-section.tsx       # SettingsSection, SettingsRow
│   ├── members-table/             # Tabla de miembros
│   ├── entity-form/               # Formularios de creación
│   └── confirm-delete-dialog/     # Diálogo de eliminación
└── utils/
    ├── get-initials.ts            # Iniciales para avatares
    ├── slug-utils.ts              # Generación de slugs
    └── date-utils.ts              # Formateo de fechas
```

## Principios

1. **Estilo Linear**: Layouts centrados, filas label-control
2. **i18n via props**: Labels y mensajes como props traducidas
3. **Composición flexible**: Slots para contenido personalizado
4. **Font size compatible**: Usan `text-fontSize-*`

## SettingsNav

Navegación lateral resizable para páginas de settings. Estilo Linear con secciones y items.

```tsx
import {
  SettingsNav,
  SettingsNavSection,
  SettingsNavItem,
} from "@/domains/shared";

<SettingsNav>
  <SettingsNavSection title="User">
    <SettingsNavItem
      label="Profile"
      href="/settings/profile"
      icon={User}
      isActive={pathname === "/settings/profile"}
    />
    <SettingsNavItem
      label="Security"
      href="/settings/security"
      icon={Shield}
      disabled
      badge="Coming soon"
    />
  </SettingsNavSection>
</SettingsNav>
```

**Características:**
- Resize con drag en borde derecho
- Persistencia de ancho en localStorage
- Secciones con títulos uppercase
- Items con iconos, badges y estados disabled
- Active state visual

## SettingsLayout

Layout para contenido de páginas de settings con variantes de ancho.

```tsx
<SettingsLayout variant="narrow">  {/* max-w-2xl, default */}
  <SettingsHeader title="Profile" />
  <SettingsSection>...</SettingsSection>
</SettingsLayout>

<SettingsLayout variant="wide">    {/* max-w-5xl para tablas/grids */}
  <SettingsHeader title="Team" />
  <MembersTable ... />
</SettingsLayout>
```

## Uso completo

```tsx
import {
  // Navigation
  SettingsNav,
  SettingsNavSection,
  SettingsNavItem,
  // Layout
  SettingsLayout,
  SettingsHeader,
  SettingsSection,
  SettingsRow,
  SettingsRowContent,
  // Components
  MembersTable,
  EntityFormCard,
  EntityFields,
  ConfirmDeleteDialog,
  // Utils
  getInitials,
  generateSlug,
} from "@/domains/shared";
```

## Estructura de rutas de Settings

Ver `apps/webapp/doc/settings.md` para documentación completa de la arquitectura.
