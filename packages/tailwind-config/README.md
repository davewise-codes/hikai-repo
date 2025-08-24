# @hikai/tailwind-config

Preset de Tailwind CSS centralizado que proporciona la configuración base para todas las aplicaciones del monorepo.

## 🎨 Configuración incluida

### Colores del tema
Variables CSS que se adaptan automáticamente al modo claro/oscuro:

```js
colors: {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
  secondary: {
    DEFAULT: "hsl(var(--secondary))",
    foreground: "hsl(var(--secondary-foreground))",
  },
  // ... más colores
}
```

### Fuentes del sistema
```js
fontFamily: {
  sans: ["Inter", "system-ui", "sans-serif"],
  serif: ["Playfair Display", "Georgia", "serif"], 
  mono: ["JetBrains Mono", "Consolas", "monospace"],
}
```

### Border radius
```js
borderRadius: {
  lg: "var(--radius)",           // 8px por defecto
  md: "calc(var(--radius) - 2px)", // 6px
  sm: "calc(var(--radius) - 4px)", // 4px
}
```

### Plugins incluidos
- `tailwindcss-animate` - Animaciones y transiciones

## 📖 Uso en aplicaciones

**1. Instalar en tu app**
```js
// tailwind.config.js
import preset from "@hikai/tailwind-config";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [preset],
};
```

**2. Usar las clases**
```tsx
<div className="bg-background text-foreground">
  <h1 className="font-serif text-primary">Título</h1>
  <p className="font-sans text-muted-foreground">Descripción</p>
  <button className="bg-primary text-primary-foreground rounded-md">
    Botón
  </button>
</div>
```

## 🎭 Personalización

### Extender el preset
```js
// En tu app/tailwind.config.js
import preset from "@hikai/tailwind-config";

export default {
  presets: [preset],
  theme: {
    extend: {
      // Añadir colores específicos de la app
      colors: {
        brand: "#ff6b35",
      },
      // Añadir fuentes adicionales
      fontFamily: {
        display: ["Oswald", "sans-serif"],
      },
    },
  },
};
```

### Sobrescribir configuración
```js
// Solo si necesitas cambios específicos por app
export default {
  presets: [preset],
  theme: {
    // Esto sobrescribirá completamente la configuración del preset
    fontFamily: {
      sans: ["Custom Font", "sans-serif"],
    },
  },
};
```

## 🔧 Modificar el preset

### Cambiar fuentes globalmente

**1. Editar fuentes en Google Fonts**
```js
// En @hikai/ui/src/fonts/fonts.css
@import url('https://fonts.googleapis.com/css2?family=Nueva+Fuente:wght@400;700&display=swap');
```

**2. Actualizar configuración**
```js
// En index.js
fontFamily: {
  sans: ["Nueva Fuente", "system-ui", "sans-serif"],
}
```

### Cambiar colores del tema

**1. Variables CSS**
```css
/* En @hikai/ui/src/styles/globals.css */
:root {
  --primary: 210 100% 50%;  /* Nuevo color primario */
}
```

**2. Si necesitas nuevos colores**
```js
// En index.js
colors: {
  // ... colores existentes
  brand: {
    DEFAULT: "hsl(var(--brand))",
    foreground: "hsl(var(--brand-foreground))",
  },
}
```

## 🏗️ Arquitectura del preset

```js
// index.js estructura
const preset = {
  darkMode: "class",           // Modo oscuro por clase CSS
  theme: {
    extend: {
      borderRadius: { ... },   // Radius personalizados
      colors: { ... },         // Sistema de colores con variables
      fontFamily: { ... },     // Fuentes del sistema
    },
  },
  plugins: [
    require("tailwindcss-animate")  // Plugin de animaciones
  ],
};
```

## 🎯 Principios de diseño

### Variables CSS first
- Usa variables CSS en lugar de valores hardcoded
- Permite fácil personalización por aplicación
- Soporte nativo para modo claro/oscuro

### Fallbacks incluidos
```js
// Las fuentes siempre tienen fallbacks
fontFamily: {
  sans: ["Inter", "system-ui", "sans-serif"],  // Inter → system-ui → sans-serif
}
```

### Semantic naming
```js
// Nombres semánticos en lugar de específicos
colors: {
  primary: "...",      // ✅ Semántico
  destructive: "...",  // ✅ Basado en función
  // blue500: "...",   // ❌ Específico del color
}
```

## 📦 Apps que usan este preset

- **`website`**: Sitio web marketing (Next.js)
- **`web`**: Aplicación web (Vite)

Todas las apps heredan la misma configuración de tema, asegurando consistencia visual en todo el ecosistema.

## 🔗 Referencias

- [Tailwind CSS Configuration](https://tailwindcss.com/docs/configuration)
- [Presets](https://tailwindcss.com/docs/presets)
- [Using CSS variables](https://tailwindcss.com/docs/customizing-colors#using-css-variables)