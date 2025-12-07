## Theme Settings

## Contexto

Hikai es una app saas B2B orientada a facilitar el marketing de productos digitales dónde:

- Los usuarios pertenecen a organizaciones.
- Las organizaciones son los tenants de Hikai.
- Las organizaciones pueden tener uno o muchos productos digitales, que serán sobre lo que hikai implementará las funcionalidades de asistencia al marketing.
- Un usuario puede pertenecer a una o a muchas organizaciones.
- Cuando un usuario accede a Hikai por primera vez, se le asigna una organización personal por defecto.
- No habrá usuarios sin organizaciones.
- Las organizaciones personales permiten a los usuarios explorar hikai de una manera más liviana o para proyectos de carácter personal
- A partir de cierto plan de subscripción los usuarios podrán crear organizaciones profesionales, en las que invitar colaboradores
- Las organizaciones profesionales son las que adquieren licencias dentro del plan de subscripción en el que se encuentren.
- El plan de subscripción permitirá crear más de un producto o acceder a ciertas funcionalidades.
- Es clave por tanto poder de manera sencilla obtener el contexto del plan actual de una organización para determinar el acceso a una funcionalidad.
- Al añadir un usuario a una organización se consumirán licencias de esa organización.
- No implementaremos aún el modelo de licencias pero el modelo propuesto para users, organizaciones y productos debe facilitar su incorporación.
- La membresía a organización-producto será lo que limite el acceso a los datos de hikai a cada member. Es clave esto en términos de seguridad y control de acceso a datos.
- Los usuarios podrán: cambiar su dirección de email, usar distintos medios de autenticación, cambiar el nombre de sus organizaciones, cambiar el nombre de los productos en sus organizaciones, etc. sin que esto afecte a los datos subyacentes.
- En algún momento los usuarios tendrán roles en cada organización y posteriormente incluso en el producto. Un usuario podrá ser un owner o un admin de una organización pudiendo contratar licencias, cambiar de plan, invitar usuarios, transferir ownership, y el otra simplemente ser un miembro activo más.
- Los roles en el producto vendrán más adelante y permitirán a algunos usuarios hacer cierta administración de la actividad del producto mientras o otros sólo colaboran o actuan como invitados

## Documentación:

- Documentación funcional en apps/webapp/doc
- Documentación técnica en los README de cada dominio (ej: apps/webapp/src/domains/organizations/README.md)

---

## Objetivo

Validar que el sistema de tokens de diseño está correctamente implementado mediante la adición de dos configuraciones de usuario:

1. **Densidad de Información** - Permitir al usuario elegir entre tres niveles (compact, normal, comfortable) que afectan tamaño de fuente, padding, y espaciado.
2. **Tema de Color** - Además de light/dark/system, permitir elegir entre un catálogo de temas de color importados de tweakcn.com.

---

## Prompt para arrancar cada fase

- En apps/webapp/webapp-plans/theme-settings.md puedes ver el plan de implementación de Theme Settings
- Vamos a proceder con la fase siguiente pendiente de ejecutar
- Analiza el documento y el plan y toma el prompt de esa fase como instrucción para implementarla
- Cuando tengas un plan para ello compártelo conmigo para validarlo
- No hagas asunciones, compárteme dudas y las debatimos
- Máxima capacidad de ultrathink

---

## Progreso

| Fase                              | Estado       |
| --------------------------------- | ------------ |
| F0: Fix Token Violations          | ✅ Completado |
| F1: Density System Infrastructure | ⏳ Pendiente |
| F2: Color Theme Infrastructure    | ⏳ Pendiente |
| F3: Settings UI in UserMenu       | ⏳ Pendiente |
| F4: Settings Page Completa        | ⏳ Pendiente |
| F5: Validación y Ajustes          | ⏳ Pendiente |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Análisis del Sistema Actual

### Sistema de Tokens Existente

**Ubicación**: `packages/ui/src/tokens/tokens.css`

| Categoría          | Estado                      | Variables                                                                                                |
| ------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------- |
| Colores semánticos | ✅ Bien definidos           | `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, etc. |
| Border radius      | ✅ Parametrizado            | `--radius` como base, derivados calculados                                                               |
| Shadows            | ✅ Con variantes light/dark | `--shadow-sm` a `--shadow-xl`                                                                            |
| Z-index            | ✅ Semánticos               | `--z-dropdown` a `--z-notification`                                                                      |
| Animaciones        | ✅ Tokenizados              | `--duration-*`, `--ease-*`                                                                               |
| Tipografía         | ⚠️ Usa escala Tailwind      | No hay tokens CSS custom para tamaños                                                                    |
| Spacing            | ⚠️ Usa escala Tailwind      | No hay tokens CSS custom                                                                                 |

### Compatibilidad con tweakcn.com

El sistema ya es compatible. Variables requeridas por tweakcn:

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`
- `--radius`
- `--chart-1` a `--chart-5` (opcional)

**Formato**: HSL sin wrapper (ej: `240 10% 3.9%`) - **Tailwind v3.x / v4.x compatible**

### Violaciones Detectadas

| Archivo                    | Línea      | Violación             | Prioridad |
| -------------------------- | ---------- | --------------------- | --------- |
| `profile-page.tsx`         | 192        | `text-green-600`      | Alta      |
| `home-page.tsx`            | 79, 88, 97 | `text-green-500` (x3) | Alta      |
| `product-members.tsx`      | 227        | `text-yellow-500`     | Alta      |
| `org-members.tsx`          | 239        | `text-yellow-500`     | Alta      |
| `social-login-buttons.tsx` | 64-76      | Hex colors (brand)    | Aceptable |

**Resolución requerida**: Crear tokens `--success` y `--warning` (o usar variantes existentes).

---

## Instrucciones para Importar Temas de tweakcn.com

### Ruta para Archivos de Tema

```
packages/ui/src/themes/
├── default.css      # Tema actual (ya en tokens.css)
├── ocean.css        # Ejemplo: tema azul
├── forest.css       # Ejemplo: tema verde
├── sunset.css       # Ejemplo: tema cálido
└── index.ts         # Registro de temas disponibles
```

### Formato Esperado

**Versión Tailwind**: v3.x (el proyecto usa v3)

**Formato de colores**: HSL sin wrapper

```css
/* Ejemplo: packages/ui/src/themes/ocean.css */
:root {
	--background: 210 40% 98%;
	--foreground: 222 47% 11%;
	--card: 0 0% 100%;
	--card-foreground: 222 47% 11%;
	--popover: 0 0% 100%;
	--popover-foreground: 222 47% 11%;
	--primary: 221 83% 53%;
	--primary-foreground: 210 40% 98%;
	--secondary: 210 40% 96%;
	--secondary-foreground: 222 47% 11%;
	--muted: 210 40% 96%;
	--muted-foreground: 215 16% 47%;
	--accent: 210 40% 96%;
	--accent-foreground: 222 47% 11%;
	--destructive: 0 84% 60%;
	--destructive-foreground: 210 40% 98%;
	--border: 214 32% 91%;
	--input: 214 32% 91%;
	--ring: 221 83% 53%;
	--radius: 0.5rem;
	--chart-1: 12 76% 61%;
	--chart-2: 173 58% 39%;
	--chart-3: 197 37% 24%;
	--chart-4: 43 74% 66%;
	--chart-5: 27 87% 67%;
}

.dark {
	--background: 222 47% 11%;
	--foreground: 210 40% 98%;
	/* ... resto de variables dark */
}
```

### Pasos para Copiar desde tweakcn.com

1. Ir a [tweakcn.com](https://tweakcn.com)
2. Seleccionar/crear tema
3. Copiar CSS (botón "Copy CSS")
4. Crear archivo en `packages/ui/src/themes/nombre-tema.css`
5. Pegar contenido (ya viene en formato correcto)
6. Verificar que incluye `:root` y `.dark`

---

## Decisiones Tomadas

1. **Densidad**: Tres niveles (compact, normal, comfortable) implementados via clase CSS en `<html>`
2. **Temas de color**: Archivos CSS separados en `packages/ui/src/themes/`, aplicados via clase CSS
3. **Persistencia**: En Zustand store con localStorage (ya existe el patrón)
4. **No backend**: Preferencias solo en cliente (sin guardar en Convex)
5. **Compatibilidad tweakcn**: Formato HSL sin wrapper, estructura estándar shadcn/ui

---

## Instrucciones Generales (aplicar en TODAS las fases)

### Actualizar Progreso

- Al completar cada fase, actualizar la tabla de **Progreso** al inicio
- Marcar la fase completada con ✅

### Reglas del Repo

- Asegurar cumplimiento de reglas y principios en `CLAUDE.md`
- Seguir patrones de arquitectura establecidos
- Revisar que no hay errores de TS ni Lint en ningún fichero modificado

### Commits

- Un commit por fase completada
- **NO realizar commit** hasta que el usuario confirme que las pruebas funcionales son OK
- Formato: `feat(webapp): [F#-THEME] descripción breve`

### i18n

- Todas las cadenas de texto deben usar react-i18next
- Añadir keys a los archivos correspondientes en `src/i18n/locales/`
- Namespace principal: `common.json` para settings de theme

---

## FASE 0: Fix Token Violations

**Objetivo**: Corregir las violaciones detectadas del sistema de tokens antes de implementar las nuevas funcionalidades.

### Archivos a modificar

- `packages/ui/src/tokens/tokens.css` (añadir tokens success/warning)
- `packages/tailwind-config/index.js` (mapear nuevos tokens)
- `apps/webapp/src/domains/core/components/profile-page.tsx`
- `apps/webapp/src/components/home-page.tsx`
- `apps/webapp/src/domains/products/components/product-members.tsx`
- `apps/webapp/src/domains/organizations/components/org-members.tsx`

### Prompt

````
Corrige las violaciones del sistema de tokens de diseño.

PARTE 1: AÑADIR TOKENS DE SUCCESS Y WARNING
ARCHIVO: packages/ui/src/tokens/tokens.css

En la sección de colores (:root), añadir después de --destructive:
  /* Success state */
  --success: 142 76% 36%;
  --success-foreground: 0 0% 100%;

  /* Warning state */
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 0%;

En .dark, añadir después de --destructive:
  --success: 142 70% 45%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 0%;

En .high-contrast, añadir después de --destructive:
  --success: 142 100% 30%;
  --success-foreground: 0 0% 100%;
  --warning: 38 100% 40%;
  --warning-foreground: 0 0% 0%;

PARTE 2: MAPEAR EN TAILWIND CONFIG
ARCHIVO: packages/tailwind-config/index.js

En colors: {}, añadir:
  success: {
    DEFAULT: "hsl(var(--success))",
    foreground: "hsl(var(--success-foreground))",
  },
  warning: {
    DEFAULT: "hsl(var(--warning))",
    foreground: "hsl(var(--warning-foreground))",
  },

PARTE 3: CORREGIR VIOLACIONES EN WEBAPP

ARCHIVO: apps/webapp/src/domains/core/components/profile-page.tsx
- Línea ~192: Cambiar `text-green-600` por `text-success`

ARCHIVO: apps/webapp/src/components/home-page.tsx
- Líneas ~79, 88, 97: Cambiar `text-green-500` por `text-success`

ARCHIVO: apps/webapp/src/domains/products/components/product-members.tsx
- Línea ~227: Cambiar `text-yellow-500` por `text-warning`

ARCHIVO: apps/webapp/src/domains/organizations/components/org-members.tsx
- Línea ~239: Cambiar `text-yellow-500` por `text-warning`

PARTE 4: ACTUALIZAR DOCUMENTACIÓN
ARCHIVO: packages/ui/DESIGN-TOKENS.md

Añadir a la tabla de colores:
| `--success` | Estados de éxito, confirmaciones | `142 76% 36%` | `142 70% 45%` |
| `--warning` | Avisos, estados de atención | `38 92% 50%` | `38 92% 50%` |

Añadir ejemplo de uso:
```tsx
<CheckCircle className="text-success" />
<AlertTriangle className="text-warning" />
````

VALIDACIÓN:

1. Ejecutar pnpm tsc en packages/ui y apps/webapp
2. Verificar que los colores se muestran correctamente en light y dark mode
3. Los iconos de check verdes deben usar text-success
4. Los iconos de crown amarillos deben usar text-warning

```

### Validación F0

```

1. Tokens --success y --warning definidos en tokens.css
2. Tailwind config tiene success y warning colors
3. No quedan clases text-green-_ o text-yellow-_ (excepto brand colors)
4. Colores funcionan en light mode, dark mode y high-contrast
5. No hay errores de TS

```

---

## FASE 1: Density System Infrastructure

**Objetivo**: Crear el sistema de densidad de información con tres niveles que afectan tipografía y espaciado.

### Archivos a crear/modificar

- `packages/ui/src/tokens/density.css` (crear)
- `packages/ui/src/styles/globals.css` (modificar - importar density)
- `packages/ui/src/lib/density.ts` (crear)
- `packages/ui/src/index.ts` (exportar tipos)
- `apps/webapp/src/domains/core/store/core-slice.ts` (añadir density)
- `apps/webapp/src/store/index.ts` (persistir density)
- `apps/webapp/src/domains/core/hooks/use-density.ts` (crear)
- `apps/webapp/src/domains/core/hooks/index.ts` (exportar)
- `apps/webapp/src/providers/density-provider.tsx` (crear)
- `apps/webapp/src/main.tsx` (añadir provider)

### Prompt

```

Implementa el sistema de densidad de información.

PARTE 1: CREAR TOKENS DE DENSIDAD
ARCHIVO: packages/ui/src/tokens/density.css

/\* ============================================

- DENSITY SYSTEM
- ============================================
- Tres niveles de densidad que afectan:
- - Tamaño base de fuente
- - Espaciado (padding/margin)
- - Altura de línea
-
- Se aplica via clase en <html>: density-compact, density-normal, density-comfortable
  \*/

:root {
/_ Base multiplier - usado por componentes que quieran ser density-aware _/
--density-multiplier: 1;

/_ Font size base _/
--density-font-xs: 0.75rem;
--density-font-sm: 0.875rem;
--density-font-base: 1rem;

/_ Spacing base _/
--density-space-xs: 0.25rem;
--density-space-sm: 0.5rem;
--density-space-md: 1rem;
--density-space-lg: 1.5rem;

/_ Component heights _/
--density-input-height: 2.25rem;
--density-button-height: 2.25rem;
}

/_ Compact: Para usuarios power que quieren ver más información _/
.density-compact {
--density-multiplier: 0.875;

--density-font-xs: 0.6875rem;
--density-font-sm: 0.75rem;
--density-font-base: 0.875rem;

--density-space-xs: 0.125rem;
--density-space-sm: 0.375rem;
--density-space-md: 0.75rem;
--density-space-lg: 1rem;

--density-input-height: 1.75rem;
--density-button-height: 1.75rem;
}

/_ Normal: Por defecto, balance entre información y comodidad _/
.density-normal {
/_ Usa los valores de :root _/
}

/_ Comfortable: Para usuarios que prefieren más espacio _/
.density-comfortable {
--density-multiplier: 1.125;

--density-font-xs: 0.8125rem;
--density-font-sm: 0.9375rem;
--density-font-base: 1.125rem;

--density-space-xs: 0.375rem;
--density-space-sm: 0.625rem;
--density-space-md: 1.25rem;
--density-space-lg: 2rem;

--density-input-height: 2.75rem;
--density-button-height: 2.75rem;
}

PARTE 2: IMPORTAR EN GLOBALS.CSS
ARCHIVO: packages/ui/src/styles/globals.css

Añadir después del import de tokens.css:
@import '../tokens/density.css';

PARTE 3: CREAR TIPOS Y CONSTANTES
ARCHIVO: packages/ui/src/lib/density.ts

export type Density = "compact" | "normal" | "comfortable";

export const densities: Record<Density, { name: string; displayName: string; description: string }> = {
compact: {
name: "compact",
displayName: "Compact",
description: "More information, smaller elements",
},
normal: {
name: "normal",
displayName: "Normal",
description: "Balanced view",
},
comfortable: {
name: "comfortable",
displayName: "Comfortable",
description: "Larger elements, more spacing",
},
};

export const defaultDensity: Density = "normal";

PARTE 4: EXPORTAR DESDE PACKAGES/UI
ARCHIVO: packages/ui/src/index.ts

Añadir export:
export { type Density, densities, defaultDensity } from "./lib/density";

PARTE 5: AÑADIR AL STORE
ARCHIVO: apps/webapp/src/domains/core/store/core-slice.ts

Importar:
import { Density, defaultDensity } from '@hikai/ui';

Añadir a CoreSlice interface:
// Density settings
density: Density;
setDensity: (newDensity: Density) => void;

Añadir a createCoreSlice:
// Density management
density: defaultDensity,
setDensity: (newDensity) => set({ density: newDensity }),

PARTE 6: PERSISTIR DENSITY
ARCHIVO: apps/webapp/src/store/index.ts

Añadir density a partialize:
partialize: (state) => ({
theme: state.theme,
locale: state.locale,
density: state.density,
currentOrgId: state.currentOrgId,
currentProductId: state.currentProductId,
}),

PARTE 7: CREAR HOOK
ARCHIVO: apps/webapp/src/domains/core/hooks/use-density.ts

import { useStore } from '@/store';

export function useDensity() {
const density = useStore((state) => state.density);
const setDensity = useStore((state) => state.setDensity);
return { density, setDensity };
}

PARTE 8: EXPORTAR HOOK
ARCHIVO: apps/webapp/src/domains/core/hooks/index.ts

Añadir:
export { useDensity } from './use-density';

PARTE 9: CREAR DENSITY PROVIDER
ARCHIVO: apps/webapp/src/providers/density-provider.tsx

import { ReactNode, useEffect } from "react";
import { useDensity } from "@/domains/core";

interface DensityProviderProps {
children: ReactNode;
}

export function DensityProvider({ children }: DensityProviderProps) {
const { density } = useDensity();

useEffect(() => {
const root = window.document.documentElement;

    // Remove all density classes
    root.classList.remove("density-compact", "density-normal", "density-comfortable");

    // Add current density class
    root.classList.add(`density-${density}`);

}, [density]);

return <>{children}</>;
}

PARTE 10: INTEGRAR PROVIDER
ARCHIVO: apps/webapp/src/main.tsx

Importar DensityProvider y añadir al árbol de providers:

- Debe estar dentro de StoreProvider (para que useDensity funcione)
- Puede estar al mismo nivel que ThemeProvider

VALIDACIÓN:

1. density se persiste en localStorage
2. Cambiar density añade clase correcta al <html>
3. Variables CSS de density están disponibles
4. No hay errores de TS

```

### Validación F1

```

1. Clase density-\* se aplica al <html> element
2. Variables --density-\* cambian según la clase
3. Store persiste density en localStorage
4. Hook useDensity funciona correctamente
5. No hay errores de TS ni regresiones visuales

```

---

## FASE 2: Color Theme Infrastructure

**Objetivo**: Crear el sistema de temas de color con soporte para múltiples paletas importadas de tweakcn.

### Archivos a crear/modificar

- `packages/ui/src/themes/default.css` (crear - extraer de tokens.css)
- `packages/ui/src/themes/index.ts` (crear - registro de temas)
- `packages/ui/src/lib/color-themes.ts` (crear)
- `packages/ui/src/index.ts` (exportar)
- `apps/webapp/src/domains/core/store/core-slice.ts` (añadir colorTheme)
- `apps/webapp/src/store/index.ts` (persistir colorTheme)
- `apps/webapp/src/domains/core/hooks/use-color-theme.ts` (crear)
- `apps/webapp/src/providers/theme-provider.tsx` (modificar)
- `packages/ui/src/styles/globals.css` (modificar)

### Prompt

```

Implementa el sistema de temas de color.

PARTE 1: CREAR ESTRUCTURA DE TEMAS
ARCHIVO: packages/ui/src/themes/default.css

Copiar SOLO la sección de colores de tokens.css (:root y .dark) a este archivo.
Mantener comentarios explicativos.
NO incluir radius, shadows, z-index, animations (esos quedan en tokens.css).

Estructura:
/_ Default Theme - Hikai _/
:root {
/_ Colores... _/
}
.dark {
/_ Colores dark... _/
}

ARCHIVO: packages/ui/src/themes/index.ts

// Importar CSS de temas (side-effect imports)
import './default.css';
// Futuros temas se importarán aquí:
// import './ocean.css';
// import './forest.css';

// Metadata de temas disponibles
export const availableThemes = {
default: {
id: 'default',
name: 'Default',
description: 'Hikai default theme',
},
// Futuros temas se registrarán aquí
} as const;

export type ColorThemeId = keyof typeof availableThemes;

PARTE 2: CREAR TIPOS Y UTILIDADES
ARCHIVO: packages/ui/src/lib/color-themes.ts

export type ColorThemeId = 'default'; // Se expandirá con más temas

export interface ColorTheme {
id: ColorThemeId;
name: string;
description: string;
}

export const colorThemes: Record<ColorThemeId, ColorTheme> = {
default: {
id: 'default',
name: 'Default',
description: 'Hikai default theme',
},
};

export const defaultColorTheme: ColorThemeId = 'default';

// Helper para obtener la clase CSS del tema
export function getColorThemeClass(themeId: ColorThemeId): string {
return `theme-${themeId}`;
}

PARTE 3: EXPORTAR DESDE PACKAGES/UI
ARCHIVO: packages/ui/src/index.ts

Añadir exports:
export {
type ColorThemeId,
type ColorTheme,
colorThemes,
defaultColorTheme,
getColorThemeClass
} from "./lib/color-themes";

PARTE 4: MODIFICAR GLOBALS.CSS
ARCHIVO: packages/ui/src/styles/globals.css

Cambiar la importación:

- Antes: @import '../tokens/tokens.css';
- Ahora:
  @import '../tokens/tokens.css'; /_ Non-color tokens (radius, shadows, z-index, animations) _/
  @import '../themes/default.css'; /_ Color tokens - default theme _/

PARTE 5: MODIFICAR TOKENS.CSS
ARCHIVO: packages/ui/src/tokens/tokens.css

MOVER la sección de colores (:root colors, .dark colors, .high-contrast colors) a themes/default.css.
MANTENER en tokens.css:

- Border radius
- Shadows
- Z-index
- Animations
- Comentarios de documentación de colores (como referencia)

PARTE 6: AÑADIR AL STORE
ARCHIVO: apps/webapp/src/domains/core/store/core-slice.ts

Importar:
import { ColorThemeId, defaultColorTheme } from '@hikai/ui';

Añadir a CoreSlice interface:
// Color theme settings
colorTheme: ColorThemeId;
setColorTheme: (newTheme: ColorThemeId) => void;

Añadir a createCoreSlice:
// Color theme management
colorTheme: defaultColorTheme,
setColorTheme: (newTheme) => set({ colorTheme: newTheme }),

PARTE 7: PERSISTIR COLOR THEME
ARCHIVO: apps/webapp/src/store/index.ts

Añadir colorTheme a partialize:
partialize: (state) => ({
theme: state.theme,
locale: state.locale,
density: state.density,
colorTheme: state.colorTheme,
currentOrgId: state.currentOrgId,
currentProductId: state.currentProductId,
}),

PARTE 8: CREAR HOOK
ARCHIVO: apps/webapp/src/domains/core/hooks/use-color-theme.ts

import { useStore } from '@/store';

export function useColorTheme() {
const colorTheme = useStore((state) => state.colorTheme);
const setColorTheme = useStore((state) => state.setColorTheme);
return { colorTheme, setColorTheme };
}

PARTE 9: EXPORTAR HOOK
ARCHIVO: apps/webapp/src/domains/core/hooks/index.ts

Añadir:
export { useColorTheme } from './use-color-theme';

PARTE 10: MODIFICAR THEME PROVIDER
ARCHIVO: apps/webapp/src/providers/theme-provider.tsx

Añadir lógica para aplicar colorTheme:

import { useColorTheme } from "@/domains/core";
import { getColorThemeClass, colorThemes, ColorThemeId } from "@hikai/ui";

// Dentro del componente:
const { colorTheme } = useColorTheme();

useEffect(() => {
const root = window.document.documentElement;

// Remove all theme classes
Object.keys(colorThemes).forEach((themeId) => {
root.classList.remove(getColorThemeClass(themeId as ColorThemeId));
});

// Add current color theme class
root.classList.add(getColorThemeClass(colorTheme));
}, [colorTheme]);

VALIDACIÓN:

1. tokens.css solo tiene tokens no-color
2. default.css tiene todos los colores para :root y .dark
3. colorTheme se persiste en localStorage
4. Clase theme-default se aplica al <html>
5. La UI mantiene exactamente el mismo aspecto visual
6. No hay errores de TS

```

### Validación F2

```

1. Separación de archivos: tokens.css (no-color) + themes/default.css (colors)
2. UI visualmente idéntica al estado anterior
3. Clase theme-\* se aplica al <html>
4. Store persiste colorTheme
5. Hook useColorTheme funciona
6. No hay errores de TS ni regresiones

```

---

## FASE 3: Settings UI in UserMenu

**Objetivo**: Añadir controles de densidad y tema de color al UserMenu existente.

### Archivos a modificar

- `apps/webapp/src/domains/core/components/user-menu.tsx`
- `apps/webapp/src/i18n/locales/en/common.json`
- `apps/webapp/src/i18n/locales/es/common.json`

### Prompt

```

Añade controles de densidad y color theme al UserMenu.

MODIFICAR: apps/webapp/src/domains/core/components/user-menu.tsx

IMPORTACIONES NUEVAS:
import { useDensity, useColorTheme } from "@/domains/core";
import { densities, Density, colorThemes, ColorThemeId } from "@hikai/ui";

NUEVA ESTRUCTURA DEL DROPDOWN (orden de secciones):

1. USER INFO HEADER (existente)
   - Avatar, nombre, email, settings gear

2. SEPARATOR

3. APPEARANCE (nueva sección agrupada)
   - Label: "Apariencia"

   3a. Theme submenu (existente - renombrar a "Modo") - Light / Dark / System

   3b. Color Theme submenu (nuevo) - Label: "Tema de color" - Lista de colorThemes disponibles - Check mark en el seleccionado - Al click: setColorTheme(themeId)

   3c. Density submenu (nuevo) - Label: "Densidad" - Compact / Normal / Comfortable - Cada opción con su description - Check mark en el seleccionado - Al click: setDensity(density)

4. SEPARATOR

5. LANGUAGE (existente)
   - English / Spanish

6. SEPARATOR

7. RECENT PRODUCTS (existente)

8. SEPARATOR

9. LOGOUT (existente)

IMPLEMENTACIÓN DE SUBMENUS:

Para Color Theme:
<DropdownMenuSub>
<DropdownMenuSubTrigger>
<Palette className="mr-2 h-4 w-4" />
{t("userMenu.colorTheme")}
</DropdownMenuSubTrigger>
<DropdownMenuPortal>
<DropdownMenuSubContent>
{Object.values(colorThemes).map((theme) => (
<DropdownMenuCheckboxItem
key={theme.id}
checked={colorTheme === theme.id}
onCheckedChange={() => setColorTheme(theme.id)} >
{theme.name}
</DropdownMenuCheckboxItem>
))}
</DropdownMenuSubContent>
</DropdownMenuPortal>
</DropdownMenuSub>

Para Density:
<DropdownMenuSub>
<DropdownMenuSubTrigger>
<Rows className="mr-2 h-4 w-4" /> {/_ o LayoutGrid _/}
{t("userMenu.density")}
</DropdownMenuSubTrigger>
<DropdownMenuPortal>
<DropdownMenuSubContent>
{Object.values(densities).map((d) => (
<DropdownMenuCheckboxItem
key={d.name}
checked={density === d.name}
onCheckedChange={() => setDensity(d.name as Density)} >

<div className="flex flex-col">
<span>{t(`userMenu.density.${d.name}`)}</span>
<span className="text-xs text-muted-foreground">
{t(`userMenu.density.${d.name}Description`)}
</span>
</div>
</DropdownMenuCheckboxItem>
))}
</DropdownMenuSubContent>
</DropdownMenuPortal>
</DropdownMenuSub>

i18n KEYS:
ARCHIVO: apps/webapp/src/i18n/locales/en/common.json

Añadir:
"userMenu": {
...existentes,
"appearance": "Appearance",
"mode": "Mode",
"colorTheme": "Color Theme",
"density": "Density",
"density.compact": "Compact",
"density.compactDescription": "More information, smaller elements",
"density.normal": "Normal",
"density.normalDescription": "Balanced view",
"density.comfortable": "Comfortable",
"density.comfortableDescription": "Larger elements, more spacing"
}

ARCHIVO: apps/webapp/src/i18n/locales/es/common.json

Añadir:
"userMenu": {
...existentes,
"appearance": "Apariencia",
"mode": "Modo",
"colorTheme": "Tema de color",
"density": "Densidad",
"density.compact": "Compacto",
"density.compactDescription": "Más información, elementos más pequeños",
"density.normal": "Normal",
"density.normalDescription": "Vista equilibrada",
"density.comfortable": "Cómodo",
"density.comfortableDescription": "Elementos más grandes, más espaciado"
}

ICONOS:

- Palette (para color theme) - importar de @hikai/ui
- Rows o LayoutGrid (para density) - importar de @hikai/ui

Si no existen en icons.ts, añadirlos:
ARCHIVO: packages/ui/src/lib/icons.ts
export { Palette, Rows, LayoutGrid } from "lucide-react";

VALIDACIÓN:

1. UserMenu muestra nuevos submenus
2. Cambiar density actualiza clase en <html> y UI cambia
3. Cambiar color theme actualiza clase en <html>
4. Selección persiste al recargar
5. i18n funciona en ambos idiomas

```

### Validación F3

```

1. UserMenu tiene sección "Appearance" con Mode, Color Theme, Density
2. Cambiar density aplica cambios visuales inmediatos
3. Cambiar color theme aplica cambios (aunque aún solo hay default)
4. Checkmarks muestran selección actual
5. Persiste en localStorage y sobrevive recarga
6. i18n funciona correctamente

```

---

## FASE 4: Settings Page Completa

**Objetivo**: Crear una página de Settings dedicada accesible desde el UserMenu.

### Archivos a crear/modificar

- `apps/webapp/src/routes/settings.tsx` (crear)
- `apps/webapp/src/domains/core/components/settings-page.tsx` (crear)
- `apps/webapp/src/domains/core/components/user-menu.tsx` (añadir link)
- `apps/webapp/src/i18n/locales/en/common.json`
- `apps/webapp/src/i18n/locales/es/common.json`

### Prompt

```

Crea la página de Settings completa.

PARTE 1: CREAR RUTA
ARCHIVO: apps/webapp/src/routes/settings.tsx

import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/domains/core/components/app-shell";
import { SettingsPage } from "@/domains/core/components/settings-page";

export const Route = createFileRoute("/settings")({
component: () => (
<AppShell>
<SettingsPage />
</AppShell>
),
});

PARTE 2: CREAR SETTINGS PAGE
ARCHIVO: apps/webapp/src/domains/core/components/settings-page.tsx

LAYOUT:

- Container max-w-2xl mx-auto p-6
- Header: título "Settings" + subtítulo
- Cards para cada sección

SECCIONES:

Card 1: "Appearance"

- Descripción: "Customize how Hikai looks"
- Theme Mode (Light/Dark/System) - RadioGroup o SegmentedControl
- Color Theme - Select con preview de colores
- Density - RadioGroup con descriptions

Card 2: "Language"

- Descripción: "Choose your preferred language"
- Select con banderas/nombres de idioma

Card 3: "About" (informativa)

- Versión de la app
- Links a documentación, feedback, etc.

COMPONENTES SUGERIDOS:

- Card, CardHeader, CardTitle, CardDescription, CardContent de @hikai/ui
- RadioGroup para opciones exclusivas
- Select para listas largas
- Label para cada campo

HOOKS A USAR:

- useTheme() - para light/dark/system
- useColorTheme() - para tema de color
- useDensity() - para densidad
- useTranslation() - para i18n

PATRÓN VISUAL:
Cada opción debe mostrar claramente:

- Label del setting
- Descripción corta (text-muted-foreground)
- Control de selección

PREVIEW DE TEMA (opcional pero recomendado):
Para Color Theme, mostrar un mini-preview con los colores principales:

- Cuadradito bg-primary
- Cuadradito bg-secondary
- Cuadradito bg-accent

PARTE 3: AÑADIR LINK EN USERMENU
ARCHIVO: apps/webapp/src/domains/core/components/user-menu.tsx

Añadir item "Settings" que navega a /settings:

- Icono Settings (gear)
- Texto "Settings" / "Configuración"
- Posición: después del user info header, antes de Appearance

<DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
<Settings className="mr-2 h-4 w-4" />
{t("userMenu.settings")}
</DropdownMenuItem>

PARTE 4: i18n
ARCHIVOS: apps/webapp/src/i18n/locales/\*/common.json

Añadir keys:
"settings": {
"title": "Settings" / "Configuración",
"subtitle": "Manage your preferences" / "Gestiona tus preferencias",
"appearance": {
"title": "Appearance" / "Apariencia",
"description": "Customize how Hikai looks" / "Personaliza el aspecto de Hikai",
"themeMode": "Theme Mode" / "Modo de tema",
"themeModeDescription": "Select light, dark, or system theme" / "Selecciona tema claro, oscuro o del sistema",
"colorTheme": "Color Theme" / "Tema de color",
"colorThemeDescription": "Choose a color palette" / "Elige una paleta de colores",
"density": "Density" / "Densidad",
"densityDescription": "Adjust information density" / "Ajusta la densidad de información"
},
"language": {
"title": "Language" / "Idioma",
"description": "Choose your preferred language" / "Elige tu idioma preferido"
},
"about": {
"title": "About" / "Acerca de",
"version": "Version" / "Versión",
"feedback": "Send feedback" / "Enviar comentarios",
"documentation": "Documentation" / "Documentación"
}
}
"userMenu.settings": "Settings" / "Configuración"

VALIDACIÓN:

1. /settings muestra la página correctamente
2. Todos los controles funcionan y persisten
3. UserMenu tiene link a Settings
4. i18n funciona en ambos idiomas
5. Layout es responsive

```

### Validación F4

```

1. Navegar a /settings muestra la página
2. UserMenu tiene item "Settings" que navega
3. Controles de Theme Mode, Color Theme, Density funcionan
4. Cambios se reflejan inmediatamente en la UI
5. Cambios persisten al recargar
6. i18n funciona
7. Layout responsive correcto

```

---

## FASE 5: Validación y Ajustes

**Objetivo**: Añadir temas adicionales de tweakcn y validar que el sistema funciona end-to-end.

### Archivos a crear/modificar

- `packages/ui/src/themes/*.css` (añadir temas)
- `packages/ui/src/themes/index.ts` (registrar temas)
- `packages/ui/src/lib/color-themes.ts` (añadir metadata)
- Componentes de UI si necesitan ajustes para density

### Prompt

```

Añade temas adicionales y valida el sistema completo.

PARTE 1: AÑADIR TEMAS DE TWEAKCN
El usuario proporcionará archivos CSS de tweakcn.com.

Para cada tema:

1. Crear archivo: packages/ui/src/themes/[nombre].css
2. Envolver los estilos en una clase .theme-[nombre]:

/_ packages/ui/src/themes/ocean.css _/
.theme-ocean {
--background: 210 40% 98%;
--foreground: 222 47% 11%;
/_ ... resto de variables _/
}
.theme-ocean.dark {
--background: 222 47% 11%;
--foreground: 210 40% 98%;
/_ ... resto de variables dark _/
}

3. Importar en packages/ui/src/themes/index.ts:
   import './ocean.css';

4. Añadir a availableThemes

5. Añadir metadata en packages/ui/src/lib/color-themes.ts

PARTE 2: VALIDAR COMPONENTES CON DENSITY
Revisar que los componentes principales responden a density:

Componentes críticos a verificar:

- Button: altura debería usar --density-button-height
- Input: altura debería usar --density-input-height
- Card: padding podría usar --density-space-\*
- Table rows: spacing
- Sidebar items: spacing y font size

Si algún componente no responde bien a density, crear variant o ajustar CSS.

PARTE 3: TESTING MANUAL CHECKLIST

Para cada tema de color:
[ ] Light mode se ve correctamente
[ ] Dark mode se ve correctamente
[ ] Transiciones entre temas son suaves
[ ] Contraste de texto es legible (WCAG AA)
[ ] Focus rings son visibles
[ ] Estados hover son distinguibles

Para cada nivel de density:
[ ] Compact: UI más densa, legible
[ ] Normal: UI balanceada
[ ] Comfortable: UI espaciosa, touch-friendly
[ ] Transiciones no causan layout shift
[ ] Todos los componentes se adaptan

Cross-testing:
[ ] Cada combinación theme + density funciona
[ ] Persiste correctamente al recargar
[ ] Multi-pestaña sincroniza cambios

PARTE 4: DOCUMENTAR
Actualizar packages/ui/DESIGN-TOKENS.md con:

- Sección de temas de color disponibles
- Sección de sistema de densidad
- Ejemplos de uso de variables --density-\*

VALIDACIÓN:

1. Múltiples temas de color disponibles y funcionando
2. Density afecta componentes clave
3. Todas las combinaciones theme+density funcionan
4. Documentación actualizada

```

### Validación F5

```

1. Al menos 2-3 temas de color adicionales funcionando
2. Selector de tema muestra todos los disponibles
3. Cambio de tema es inmediato sin recarga
4. Density afecta visiblemente a la UI
5. No hay regresiones en componentes existentes
6. Documentación actualizada

```

---

## Archivos Críticos

| Archivo | Rol |
|---------|-----|
| `packages/ui/src/tokens/tokens.css` | Tokens no-color (radius, shadows, z-index, animations) |
| `packages/ui/src/tokens/density.css` | Tokens de densidad |
| `packages/ui/src/themes/default.css` | Tema de color por defecto |
| `packages/ui/src/themes/*.css` | Temas adicionales |
| `packages/ui/src/lib/density.ts` | Tipos y constantes de densidad |
| `packages/ui/src/lib/color-themes.ts` | Tipos y constantes de temas |
| `packages/tailwind-config/index.js` | Mapping de tokens a Tailwind |
| `apps/webapp/src/domains/core/store/core-slice.ts` | Estado global |
| `apps/webapp/src/providers/theme-provider.tsx` | Aplicación de clases tema |
| `apps/webapp/src/providers/density-provider.tsx` | Aplicación de clase densidad |
| `apps/webapp/src/domains/core/components/user-menu.tsx` | UI de selección rápida |
| `apps/webapp/src/domains/core/components/settings-page.tsx` | UI de settings completa |

---

## Resumen de Fases

| Fase | Backend | Frontend | Objetivo |
|------|---------|----------|----------|
| F0 | tokens.css, tailwind-config | 4 archivos webapp | Corregir violaciones |
| F1 | density.css, density.ts | store, hook, provider | Sistema de densidad |
| F2 | themes/, color-themes.ts | store, hook, provider | Sistema de temas |
| F3 | - | user-menu.tsx, i18n | UI rápida en UserMenu |
| F4 | - | settings page, i18n | Página de settings |
| F5 | themes/*.css | docs | Temas adicionales + validación |

---

## Próximo Paso

Ejecutar F0 con el prompt correspondiente para corregir las violaciones de tokens detectadas.
```
