# Claude Development Guidelines

Este archivo contiene directivas específicas para el desarrollo y mantenimiento del monorepo hikai-repo.

## Architecture Principles

### Monorepo Structure
- **`packages/`**: Código compartido y reutilizable
- **`apps/`**: Aplicaciones que consumen los packages
- **Regla de oro**: Las apps NUNCA implementan UI/styling propio, siempre consumen de packages

### Dependency Flow
```
apps/ → consumes → packages/
```
- ✅ Apps importan de packages
- ❌ Apps NUNCA duplican código de packages
- ❌ Packages NUNCA dependen de apps

## UI/Design System

### Font Management

**🎯 Objetivo**: Fuentes centralizadas y consistentes en todo el monorepo

**✅ HACER:**
- Cambiar fuentes SOLO en `packages/ui/src/fonts/fonts.css` y `packages/tailwind-config/index.js`
- Crear FontProvider local en cada app (no importar de @hikai/ui)
- Importar `@hikai/ui/styles/globals.css` en apps

**❌ NO HACER:**
- Nunca añadir fuentes directamente en apps
- No usar next/font/google en packages/ui (rompe la compatibilidad con otros frameworks)
- No crear variables CSS específicas por app
- No importar FontProvider desde @hikai/ui (ya no existe)

**📍 Para cambiar una fuente:**
1. Editar `packages/ui/src/fonts/fonts.css` - Cambiar URL de Google Fonts
2. Editar `packages/tailwind-config/index.js` - Actualizar fontFamily array
3. Reiniciar dev server

**📍 FontProvider en apps:**
```tsx
// Para Next.js: app/providers/font-provider.tsx
"use client";
export function FontProvider({ children }) {
  return <div className="antialiased">{children}</div>;
}

// Para Vite: src/providers/font-provider.tsx (sin "use client")
export function FontProvider({ children }) {
  return <div className="antialiased">{children}</div>;
}
```

### Component Development

**✅ PATRÓN:**
- Todos los componentes UI van en `packages/ui/src/components/ui/`
- Usar patrón shadcn/ui (variant props, forwardRef, etc.)
- Exportar desde `packages/ui/src/components/ui/index.ts`

**📍 Para añadir nuevo componente:**
1. Crear en `packages/ui/src/components/ui/nuevo-componente.tsx`
2. Exportar en `packages/ui/src/components/ui/index.ts`
3. Usar en apps: `import { NuevoComponente } from "@hikai/ui"`

### Theme System

**🎯 Sistema**: Variables CSS + providers per-app

**✅ HACER:**
- Definiciones de themes en `packages/ui/src/lib/themes.ts`
- Variables CSS en `packages/ui/src/styles/themes.css`
- Cada app implementa su propio ThemeProvider + useTheme hook
- Importar tipos: `import { Theme, themes, defaultTheme } from "@hikai/ui"`

**❌ NO HACER:**
- No importar ThemeProvider desde @hikai/ui (ya no existe)
- No añadir colores específicos por app
- No sobrescribir variables de tema en apps

**📍 ThemeProvider en apps:**

**Next.js:**
```tsx
// app/providers/theme-provider.tsx
"use client";
import { createContext, useEffect, useState } from "react";
import { Theme, defaultTheme } from "@hikai/ui";
// ... implementación completa con localStorage
```

**Vite:**
```tsx
// src/providers/theme-provider.tsx (sin "use client")
import { createContext, useEffect, useState } from "react";
import { Theme, defaultTheme } from "@hikai/ui";
// ... misma implementación pero sin directiva
```

**📍 useTheme hook:**
```tsx
// app/hooks/use-theme.ts
import { useContext } from "react";
import { ThemeContext } from "@/providers/theme-provider";
```

**Referencias completas en:**
- Next.js: `apps/website/src/providers/`
- Vite: `apps/webapp/src/providers/`

## Development Patterns

### TypeScript
- Configuración base en `packages/typescript-config/base.json`
- Apps extienden la configuración base
- Nunca duplicar configuraciones de TS

### i18n (Internacionalización)
- Configuración central en `packages/i18n/`
- Apps usan `useTranslations` internamente en componentes
- No pasar traducciones como props, cada componente maneja sus propias traducciones

## Common Tasks

### Cambiar fuentes del sistema
```bash
# 1. Editar Google Fonts URL
packages/ui/src/fonts/fonts.css

# 2. Actualizar nombres de fuente
packages/tailwind-config/index.js

# 3. Reiniciar
pnpm dev
```

### Añadir nuevo componente UI
```bash
# 1. Crear componente
packages/ui/src/components/ui/my-component.tsx

# 2. Exportar
packages/ui/src/components/ui/index.ts

# 3. Usar en app
import { MyComponent } from "@hikai/ui"
```

### Crear nueva app

**Ejemplo: Nueva app Vite**
```bash
# 1. Crear estructura
mkdir -p apps/nueva-app/src/{providers,components,styles}

# 2. package.json básico
{
  "dependencies": {
    "@hikai/ui": "workspace:*",
    "@hikai/tailwind-config": "workspace:*"
  }
}

# 3. tsconfig.json
{
  "extends": "../../packages/typescript-config/base.json"
}

# 4. tailwind.config.js
import preset from "@hikai/tailwind-config";
export default { presets: [preset] };

# 5. Crear providers locales
# - src/providers/font-provider.tsx
# - src/providers/theme-provider.tsx
# - src/hooks/use-theme.ts

# 6. CSS principal
# src/styles/globals.css → @import "@hikai/ui/styles/globals.css";
```

### Cambiar colores del tema
```bash
# 1. Variables CSS light theme
packages/ui/src/styles/globals.css

# 2. Variables CSS dark theme  
packages/ui/src/styles/themes.css

# 3. Si es necesario, config de Tailwind
packages/tailwind-config/index.js
```

## DO's and DON'Ts

### ✅ DO's
- Crear FontProvider y ThemeProvider localmente en cada app
- Hacer cambios de styling solo en packages/
- Usar useTranslations dentro de componentes
- Mantener componentes autocontenidos
- Seguir el patrón de exportación de shadcn/ui
- Importar definiciones de @hikai/ui: `import { Theme, themes } from "@hikai/ui"`

### ❌ DON'Ts
- NUNCA añadir fuentes específicas en apps/
- No pasar traducciones como props
- No duplicar código entre packages y apps
- No mezclar configuraciones de diferentes frameworks en packages/ui
- No importar providers desde @hikai/ui (crear localmente por app)

## Framework Compatibility

### packages/ui Requirements
- ✅ Must work with React (any version)
- ✅ Must work with any bundler (Next.js, Vite, etc.)
- ❌ Never depend on specific frameworks (no next/font, no next/image in packages)

### apps/ Specific
- ✅ Can use framework-specific optimizations
- ✅ Should consume packages/ as much as possible
- ❌ Should not implement UI/styling independently

---

## Notes for AI Assistants

Cuando trabajes en este proyecto:
1. **Siempre revisar** este archivo antes de hacer cambios estructurales
2. **Preguntar** antes de añadir nuevas dependencias a packages/
3. **Verificar** que los cambios no rompan la compatibilidad entre packages y apps
4. **Mantener** la consistencia en patrones ya establecidos