# Shared Domain

Componentes y utilidades compartidos entre dominios de webapp.
Siguen el estilo visual de Linear (centrado, compacto, profesional).

## Estructura

```
shared/
├── components/
│   ├── settings-layout.tsx        # Layout centrado max-w-2xl
│   ├── settings-header.tsx        # Header con back button
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

## Uso

```tsx
import {
  SettingsLayout,
  SettingsHeader,
  SettingsSection,
  SettingsRow,
  MembersTable,
  EntityFormCard,
  EntityFields,
  ConfirmDeleteDialog,
  getInitials,
  generateSlug,
} from "@/domains/shared";
```
