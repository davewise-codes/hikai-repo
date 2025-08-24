# @hikai/ui

Sistema de diseño centralizado con componentes React, basado en [shadcn/ui](https://ui.shadcn.dev/) y configurado para funcionar con cualquier framework React.

## 🎨 Componentes disponibles

- **Button** - Botón con múltiples variantes y tamaños
- **Alert / AlertDescription / AlertTitle** - Componentes de alerta
- **NavigationMenu / NavigationMenuItem / NavigationMenuLink** - Navegación
- **DropdownMenu** - Menús desplegables
- **FontProvider** - Provider para aplicar fuentes del tema

### Uso básico
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

## 🎭 Sistema de fuentes

### Fuentes actuales
- **Sans**: Inter - Para UI y texto del cuerpo
- **Serif**: Playfair Display - Para títulos y texto elegante  
- **Mono**: JetBrains Mono - Para código y contenido técnico

### Cambiar fuentes

**1. Actualizar CDN de Google Fonts**
```css
/* src/fonts/fonts.css */

/* Inter → Nueva fuente sans */
@import url('https://fonts.googleapis.com/css2?family=Nueva+Fuente:wght@100;200;300;400;500;600;700;800;900&display=swap');
```

**2. Actualizar configuración de Tailwind**
```js
// ../tailwind-config/index.js
fontFamily: {
  sans: ["Nueva Fuente", "system-ui", "sans-serif"],  // Cambiar aquí
  serif: ["Playfair Display", "Georgia", "serif"],
  mono: ["JetBrains Mono", "Consolas", "monospace"],
},
```

**3. Reiniciar servidor de desarrollo**

### Usando fuentes en componentes
```tsx
<h1 className="font-serif">Título elegante</h1>
<p className="font-sans">Texto normal</p>  
<code className="font-mono">Código</code>
```

## 🎨 Sistema de colores

Los colores se definen como variables CSS y se adaptan automáticamente al modo claro/oscuro:

```css
/* Variables disponibles */
--primary
--secondary  
--accent
--muted
--destructive
--background
--foreground
--border
```

### Usar colores en componentes
```tsx
<div className="bg-primary text-primary-foreground">
  <p className="text-muted-foreground">Texto secundario</p>
</div>
```

## 🔧 Añadir nuevos componentes

**1. Crear el componente**
```tsx
// src/components/ui/my-component.tsx
import * as React from "react";
import { cn } from "../../lib/utils";

export interface MyComponentProps {
  className?: string;
  children: React.ReactNode;
}

const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("my-component-styles", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MyComponent.displayName = "MyComponent";

export { MyComponent };
```

**2. Exportar desde el índice**
```tsx
// src/components/ui/index.ts
export * from "./my-component";
```

**3. Usar en apps**
```tsx
import { MyComponent } from "@hikai/ui";
```

## 🏗️ Arquitectura

```
src/
├── components/
│   └── ui/              # Componentes exportables
├── fonts/
│   └── fonts.css        # Google Fonts imports
├── lib/
│   └── utils.ts         # Utilidades (cn helper)
├── providers/
│   └── font-provider.tsx # Provider de fuentes
├── styles/
│   └── globals.css      # Variables CSS + Tailwind
└── index.ts            # Exports principales
```

## 🎯 Principios de diseño

- **Framework agnóstico**: Funciona con Next.js, Vite, etc.
- **Accesible por defecto**: Componentes construidos con accesibilidad
- **Personalizable**: Variables CSS para fácil personalización
- **Consistente**: Mismo diseño en todas las apps del monorepo
- **Tipado**: Full TypeScript con props bien definidas

## 📦 Configuración en apps

**1. Instalar estilos globales**
```tsx
// En tu layout o App component
import "@hikai/ui/styles/globals.css";
```

**2. Usar FontProvider (opcional)**
```tsx
import { FontProvider } from "@hikai/ui";

export default function App({ children }) {
  return (
    <FontProvider>
      {children}
    </FontProvider>
  );
}
```

**3. Importar componentes**
```tsx
import { Button, Alert } from "@hikai/ui";
```

## 🔗 Referencias

- [shadcn/ui](https://ui.shadcn.dev/) - Base de componentes
- [Radix UI](https://www.radix-ui.com/) - Primitivos accesibles  
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [CVA](https://cva.style/) - Class Variance Authority para variants