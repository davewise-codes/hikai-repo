# Hikai Webapp

Aplicación web principal de Hikai que facilita a los equipos de producto llevar este al mercado.

## 🏗️ Arquitectura

### Principios Fundamentales

1. **Dominio Core Unificado**: Funcionalidad transversal (theme, i18n, navegación) vive en `domains/core`. Excepción: dominios con complejidad suficiente (como `auth`) pueden ser separados.
2. **Estado Global Zustand**: Store unificado con sincronización automática entre pestañas
3. **Routes Centralizadas**: TanStack Router en `/routes` para todas las rutas
4. **Hooks por Dominio**: Hooks globales en carpetas, hooks específicos con componentes
5. **YAGNI**: No crear abstracciones hasta necesitarlas

### Estructura del Proyecto

```
src/
├── domains/
│   ├── auth/                    # Autenticación (Convex Auth)
│   │   ├── components/          # Forms de login, signup, reset password
│   │   ├── hooks/              # useAuth hook principal
│   │   └── utils/              # Validaciones compartidas
│   ├── core/                    # Funcionalidad transversal
│   │   ├── components/          # AppShell, Settings, etc.
│   │   ├── hooks/              # useTheme, useI18n
│   │   └── store/              # Core slice (theme, locale)
│   └── organizations/           # Gestión de organizaciones
├── routes/                     # TanStack Router (centralizado)
├── store/                      # Store Zustand global + sync pestañas
├── components/                 # Componentes no vinculados a dominio
├── providers/                  # Providers (theme, i18n, font)
└── lib/                        # Utilidades compartidas
```

## 🚀 Desarrollo

### Comandos

```bash
# Desarrollo
pnpm dev

# Build
pnpm build

# Linting
pnpm lint

# Type checking
pnpm type-check
```

### Funcionalidades Implementadas

- ✅ **Autenticación**: Email/password, Google OAuth, GitHub OAuth via Convex Auth
- ✅ **Theme System**: Cambio de tema con persistencia multi-pestaña
- ✅ **Internacionalización**: Cambio de idioma (EN/ES) con persistencia
- ✅ **Navegación**: AppShell con sidebar navegable
- ✅ **Settings**: Página de configuración funcional
- ✅ **Routing**: TanStack Router configurado
- ✅ **Store**: Zustand con persistencia localStorage
- ✅ **Organizaciones**: CRUD de organizaciones con membresías

## 📋 Reglas de Desarrollo

### Añadir Nueva Funcionalidad

#### 1. ¿Es transversal? → Va en Core
Si la funcionalidad se usa en toda la app (auth, theme, navegación):
```typescript
// domains/core/hooks/use-nueva-funcionalidad.ts
export function useNuevaFuncionalidad() {
  // Hook implementation
}

// domains/core/store/core-slice.ts
export interface CoreSlice {
  // Add to existing interface
  nuevaFuncionalidad: TipoNuevo;
  setNuevaFuncionalidad: (value: TipoNuevo) => void;
}
```

#### 2. ¿Es específica? → Nuevo Dominio
Para funcionalidad específica (sources, timeline, content):
```typescript
// domains/nuevo-dominio/
├── components/
├── hooks/
├── store/              # Opcional, evaluar si va en core
└── index.ts
```

### Añadir Nueva Ruta

```typescript
// routes/nueva-ruta.tsx
import { createFileRoute } from '@tanstack/react-router';
import { NuevaPage } from '@/domains/dominio/components/nueva-page';
import { AppShell } from '@/domains/core/components/app-shell';

export const Route = createFileRoute('/nueva-ruta')({
  component: () => (
    <AppShell>
      <NuevaPage />
    </AppShell>
  ),
});
```

### Añadir Estado Global

#### Opción 1: Expandir Core Slice (recomendado para estado transversal)
```typescript
// domains/core/store/core-slice.ts
export interface CoreSlice {
  // Existing...
  nuevoEstado: TipoNuevo;
  setNuevoEstado: (value: TipoNuevo) => void;
}
```

#### Opción 2: Nuevo Slice (solo para dominios complejos)
```typescript
// domains/dominio/store/dominio-slice.ts
export interface DominioSlice {
  // Domain specific state
}

// store/index.ts
interface StoreState extends CoreSlice, DominioSlice {
  // Combined state
}
```

### Añadir Hook

#### Global (usado en múltiples componentes):
```typescript
// domains/core/hooks/use-nuevo.ts
export function useNuevo() {
  const value = useStore(state => state.nuevo);
  const setValue = useStore(state => state.setNuevo);
  return { value, setValue };
}

// domains/core/hooks/index.ts
export { useNuevo } from './use-nuevo';
```

#### Específico (usado en un componente):
```typescript
// domains/dominio/components/componente/use-componente.ts
export function useComponente() {
  // Specific logic
}
```

## 🔧 Herramientas y Stack

- **Framework**: React 19
- **Router**: TanStack Router
- **Estado**: Zustand
- **UI**: @hikai/ui (design system compartido)
- **Styling**: Tailwind CSS
- **i18n**: react-i18next  
- **Types**: TypeScript
- **Build**: Vite
- **Linting**: ESLint

## 🎯 Próximos Pasos

1. **Dominios**: Implementar sources y timeline
2. **Testing**: Configurar testing suite cuando sea necesario

## 📚 Referencias

- [Documentación Arquitectura Completa](./webapp-plans/2025-08-26%20-%20Overall%20web%20app%20architecture.md)
- [TanStack Router](https://tanstack.com/router)
- [Zustand](https://github.com/pmndrs/zustand)
- [Hikai UI Package](../../packages/ui/)