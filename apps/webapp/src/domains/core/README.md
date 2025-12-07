# Core Domain

Funcionalidad transversal compartida: layout, navegación, tema, idioma y estado global.

## Estructura

```
core/
├── components/
│   ├── app-shell.tsx      # Layout principal (header + sidebar + content)
│   ├── app-header.tsx     # Header horizontal con switchers y user menu
│   ├── sidebar.tsx        # Sidebar colapsable con navegación
│   ├── user-menu.tsx      # Dropdown de usuario (perfil, prefs, logout)
│   └── profile-page.tsx   # Página de perfil de usuario
├── hooks/
│   ├── use-theme.ts       # Hook para gestión de tema
│   ├── use-i18n.ts        # Hook para gestión de idioma
│   └── index.ts
├── store/
│   └── core-slice.ts      # Estado global transversal
└── index.ts
```

## Store (core-slice.ts)

Estado Zustand con persistencia para datos transversales:

```typescript
interface CoreSlice {
  // Tema - persiste
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Idioma - persiste
  locale: Locale;
  setLocale: (locale: Locale) => void;

  // Org actual - persiste
  currentOrgId: string | null;
  setCurrentOrgId: (id: string | null) => void;

  // Producto actual - persiste
  currentProductId: string | null;
  setCurrentProductId: (id: string | null) => void;

  // Sidebar - NO persiste (se cierra al recargar)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}
```

**Sincronización multi-pestaña**: Los cambios de theme, locale, currentOrgId y currentProductId se sincronizan automáticamente entre pestañas via storage events.

## Hooks

### useTheme

```typescript
const { theme, setTheme } = useTheme();
// theme: 'light' | 'dark'
```

### useI18n

```typescript
const { locale, setLocale } = useI18n();
// locale: 'en' | 'es'
```

## Componentes

### AppShell

Wrapper de layout que incluye header y sidebar:

```tsx
<AppShell>
  <YourPageContent />
</AppShell>
```

### AppHeader

Header horizontal fijo con:
- Botón hamburguesa (toggle sidebar)
- Logo
- OrgSwitcher
- ProductSwitcher
- UserMenu (avatar)

### Sidebar

Navegación colapsable (overlay) con:
- Home → `/`
- Organizations → `/organizations`
- Products → `/products`
- Timeline → disabled (próximamente)

### UserMenu

Dropdown del usuario con:
- Info de usuario + link a perfil
- Preferencias (tema, idioma)
- Productos recientes (cross-org)
- Logout

### ProfilePage

Página `/profile` con:
- Información personal (nombre editable, email readonly)
- Métodos de autenticación conectados

## Exports

```typescript
// Hooks
export { useTheme, useI18n } from './hooks';

// Types
export type { Theme } from '@hikai/ui';
export type { Locale } from './store/core-slice';
```

**Nota**: Los componentes NO se exportan fuera del dominio. Se usan directamente en las rutas.
