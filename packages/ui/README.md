# @hikai/ui

Sistema de diseño centralizado con componentes React, basado en [shadcn/ui](https://ui.shadcn.dev/) y configurado para funcionar con cualquier framework React.

## 📦 Estructura del paquete

```
src/
├── components/
│   └── ui/              # Componentes UI exportables  
├── fonts/
│   └── fonts.css        # Importaciones de Google Fonts
├── lib/
│   ├── themes.ts        # Definiciones de themes
│   ├── utils.ts         # Utilidades (cn helper)
│   └── icons.ts         # Iconos centralizados (lucide-react)
├── styles/
│   ├── globals.css      # Estilos base + imports
│   └── themes.css       # Variables CSS por theme
└── index.ts             # Exports principales
```

## 🎯 ¿Qué incluye este paquete?

- ✅ **Componentes UI** - Button, Alert, NavigationMenu, DropdownMenu, etc.
- ✅ **Sistema de iconos** - Iconos centralizados de lucide-react
- ✅ **Sistema de themes** - Definiciones y variables CSS
- ✅ **Sistema de fuentes** - Configuración centralizada de tipografías
- ❌ **Providers** - Cada app los implementa según su framework

## 🚀 Uso básico

### Componentes
```tsx
import { Button, Alert, AlertDescription } from "@hikai/ui";

export function MyComponent() {
  return (
    <>
      <Button variant="default" size="lg">
        Mi Botón
      </Button>
      
      <Alert>
        <AlertDescription>
          Mensaje de alerta
        </AlertDescription>
      </Alert>
    </>
  );
}
```

### Iconos
```tsx
import { SearchIcon, HomeIcon, CloseIcon, Sun, Moon } from "@hikai/ui";

export function Navigation() {
  return (
    <nav>
      <HomeIcon className="h-5 w-5" />
      <SearchIcon className="h-4 w-4" />
      <CloseIcon className="h-4 w-4" />
    </nav>
  );
}
```

### Themes
```tsx
import { Theme, themes, defaultTheme } from "@hikai/ui";

// Themes disponibles: "light" | "dark" | "system"
const currentTheme = themes.light;
```

## 🏗️ Configuración en apps

### 1. Importar estilos globales
```css
/* En tu CSS principal */
@import "@hikai/ui/styles/globals.css";
```

### 2. Implementar providers locales

**⚠️ Importante**: Los providers se implementan por app, no se importan desde @hikai/ui

**Next.js:**
```tsx
// app/providers/font-provider.tsx
"use client";
export function FontProvider({ children }) {
  return <div className="antialiased">{children}</div>;
}

// app/providers/theme-provider.tsx  
"use client";
import { createContext, useEffect, useState } from "react";
import { Theme, defaultTheme } from "@hikai/ui";
// ... implementación completa con localStorage
```

**Vite/otros frameworks:**
```tsx
// src/providers/font-provider.tsx (sin "use client")
export function FontProvider({ children }) {
  return <div className="antialiased">{children}</div>;
}

// src/providers/theme-provider.tsx (sin "use client")
import { createContext, useEffect, useState } from "react";
import { Theme, defaultTheme } from "@hikai/ui";
// ... implementación completa
```

### 3. Usar en tu aplicación
```tsx
import { Button, SearchIcon } from "@hikai/ui";
import { FontProvider } from "./providers/font-provider";
import { ThemeProvider } from "./providers/theme-provider";

export function App() {
  return (
    <ThemeProvider>
      <FontProvider>
        <Button>
          <SearchIcon className="h-4 w-4" />
          Buscar
        </Button>
      </FontProvider>
    </ThemeProvider>
  );
}
```

## 🎨 Sistema de personalización

### Fuentes
Para cambiar las fuentes del sistema, editar:
1. `src/fonts/fonts.css` - URLs de Google Fonts
2. `../tailwind-config/index.js` - Configuración de fontFamily

### Themes
Variables CSS definidas en `src/styles/themes.css`:
```css
/* Light theme (por defecto) */
--primary, --secondary, --accent, --muted
--background, --foreground, --border

/* Dark theme */
.dark { /* Variables con valores oscuros */ }
```

### Iconos
Para añadir nuevos iconos:
1. Editar `src/lib/icons.ts`
2. Añadir export: `export { NewIcon } from "lucide-react"`
3. Opcionalmente crear alias semántico

## 🔧 Desarrollo

### Añadir nuevo componente
1. Crear en `src/components/ui/nuevo-componente.tsx`
2. Exportar en `src/components/ui/index.ts`
3. Seguir patrón shadcn/ui con forwardRef y variants

### Principios de diseño
- **Framework agnóstico** - Compatible con Next.js, Vite, etc.
- **Accesible por defecto** - Componentes con accesibilidad integrada
- **Tipado completo** - Full TypeScript con props bien definidas
- **Consistencia** - Mismo diseño en todas las apps del monorepo

## 📚 Referencias de implementación

**Ejemplos completos:**
- **Next.js**: `apps/website/src/providers/`
- **Vite**: `apps/webapp/src/providers/`

**Tecnologías:**
- [shadcn/ui](https://ui.shadcn.dev/) - Base de componentes
- [Radix UI](https://www.radix-ui.com/) - Primitivos accesibles  
- [Lucide React](https://lucide.dev/) - Sistema de iconos
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [CVA](https://cva.style/) - Class Variance Authority