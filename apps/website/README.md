# Website - Hikai Marketing Site

Sitio web de marketing construido con Next.js 15, usando los paquetes centrales del monorepo para componentes UI y configuración de estilos.

## Arquitectura

Este proyecto utiliza:
- **Next.js 15** con App Router
- **Internacionalización** con next-intl (español/inglés)
- **Componentes UI** desde `@hikai/ui`
- **Configuración de Tailwind** desde `@hikai/tailwind-config`
- **TypeScript** para type safety

## Paquetes Centrales

### `@hikai/ui`
Proporciona todos los componentes de UI reutilizables:
- `Button` - Botón con múltiples variantes
- `Alert` / `AlertDescription` - Componentes de alerta
- `NavigationMenu` / `NavigationMenuItem` / `NavigationMenuLink` - Navegación
- Estilos globales con variables CSS del sistema de diseño

### `@hikai/tailwind-config`
Configuración base de Tailwind CSS que incluye:
- Sistema de colores personalizado usando variables CSS
- Configuración de border radius, spacing, etc.
- Soporte para modo oscuro
- Plugin tailwindcss-animate

## Estructura del Proyecto

```
src/
├── app/
│   ├── [locale]/           # Rutas dinámicas por idioma
│   │   ├── layout.tsx      # Layout principal + i18n
│   │   └── page.tsx        # Página principal
│   ├── favicon.ico
│   └── globals.css         # Estilos globales + Tailwind + variables del tema
├── components/
│   ├── hero-section.tsx    # Sección hero usando Button de @hikai/ui
│   ├── how-section.tsx     # Sección "cómo" usando Alert de @hikai/ui
│   └── navigation-bar.tsx  # Navegación usando NavigationMenu de @hikai/ui
└── i18n/                   # Configuración de internacionalización
    ├── navigation.ts
    ├── request.ts
    └── routing.ts
messages/                   # Traducciones
├── en.json
└── es.json
middleware.ts              # Middleware de next-intl
```

## Configuración

### Next.js (`next.config.ts`)
```typescript
const nextConfig: NextConfig = {
  transpilePackages: ['@hikai/ui', '@hikai/tailwind-config'],
};
```
- `transpilePackages`: Permite a Next.js transpilar los paquetes del workspace

### Tailwind (`tailwind.config.js`)
```javascript
export default {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  presets: [preset], // Usa el preset de @hikai/tailwind-config
};
```

### PostCSS (`postcss.config.js`)
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

## Desarrollo

### Instalar dependencias
```bash
pnpm install
```

### Servidor de desarrollo
```bash
pnpm dev
```

### Build de producción
```bash
pnpm build
```

### Linting
```bash
pnpm lint
```

## Uso de Componentes UI

Los componentes de `@hikai/ui` están disponibles para importar directamente:

```tsx
import { Button, Alert, AlertDescription, NavigationMenu } from "@hikai/ui";

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

## Internacionalización

El sitio soporta múltiples idiomas usando next-intl:
- Rutas: `/en/...` y `/es/...`
- Traducciones en `messages/en.json` y `messages/es.json`
- Configuración en `src/i18n/`

### Usar traducciones
```tsx
import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations("HomePage");
  
  return <h1>{t("hero.title")}</h1>;
}
```

## Variables de Tema

Los estilos usan variables CSS definidas en `globals.css`:
- `--primary`, `--secondary`, `--accent`
- `--background`, `--foreground`
- `--border`, `--input`, `--ring`
- Soporte completo para modo oscuro

Estas variables son consumidas por los componentes de `@hikai/ui` automáticamente.