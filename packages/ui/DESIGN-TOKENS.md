# Hikai Design Tokens

Referencia rápida de tokens del sistema de diseño. Definidos en `src/tokens/tokens.css`.

## Compatibilidad

- **tweakcn.com**: Variables CSS 1:1 compatibles para importar temas
- **shadcn/ui**: Estructura estándar
- **Formato**: HSL sin wrapper (`240 10% 3.9%`)

---

## Colores

Tokens semánticos con soporte para light, dark y high-contrast.

| Token | Uso | Light | Dark |
|-------|-----|-------|------|
| `--background` | Fondo base | `0 0% 100%` | `240 10% 3.9%` |
| `--foreground` | Texto base | `240 10% 3.9%` | `0 0% 98%` |
| `--primary` | CTAs, acciones principales | `240 5.9% 10%` | `0 0% 98%` |
| `--secondary` | Acciones secundarias | `240 4.8% 95.9%` | `240 3.7% 15.9%` |
| `--muted` | Elementos de bajo énfasis | `240 4.8% 95.9%` | `240 3.7% 15.9%` |
| `--accent` | Hover states, destacados | `240 4.8% 95.9%` | `240 3.7% 15.9%` |
| `--destructive` | Errores, acciones destructivas | `0 84.2% 60.2%` | `0 62.8% 30.6%` |
| `--card` | Superficies elevadas | `0 0% 100%` | `240 10% 3.9%` |
| `--popover` | Elementos flotantes | `0 0% 100%` | `240 10% 3.9%` |
| `--border` | Bordes | `240 5.9% 90%` | `240 3.7% 15.9%` |
| `--input` | Campos de entrada | `240 5.9% 90%` | `240 3.7% 15.9%` |
| `--ring` | Focus ring | `240 10% 3.9%` | `240 4.9% 83.9%` |

**Uso en Tailwind:**
```tsx
<div className="bg-primary text-primary-foreground" />
<span className="text-muted-foreground" />
<div className="border-destructive" />
```

---

## Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-xs` | `0.125rem` (2px) | Elementos muy pequeños |
| `--radius-sm` | `calc(--radius - 4px)` | Chips, inputs pequeños |
| `--radius-md` | `calc(--radius - 2px)` | Inputs, botones |
| `--radius-lg` | `0.5rem` (8px) | Cards, modales |
| `--radius-xl` | `calc(--radius + 4px)` | Cards destacadas |
| `--radius-2xl` | `calc(--radius + 8px)` | Modales grandes |
| `--radius-3xl` | `calc(--radius + 16px)` | Hero sections |

**Uso en Tailwind:**
```tsx
<button className="rounded-md" />  // Botones
<div className="rounded-lg" />     // Cards
<img className="rounded-full" />   // Avatares
```

---

## Shadows (Elevación)

| Token | Uso |
|-------|-----|
| `--shadow-sm` | Inputs, buttons en reposo |
| `--shadow-md` | Cards en hover |
| `--shadow-lg` | Dropdowns, popovers |
| `--shadow-xl` | Modales |

**Uso en Tailwind:**
```tsx
<Card className="shadow-sm hover:shadow-md" />
<Dialog className="shadow-xl" />
```

---

## Z-Index

| Token | Valor | Uso |
|-------|-------|-----|
| `--z-base` | 0 | Contenido normal |
| `--z-dropdown` | 1000 | Menús desplegables |
| `--z-sticky` | 1020 | Headers sticky |
| `--z-fixed` | 1030 | Elementos fijos |
| `--z-modal-backdrop` | 1040 | Fondo oscuro de modal |
| `--z-modal` | 1050 | Contenido del modal |
| `--z-popover` | 1060 | Popovers sobre modales |
| `--z-tooltip` | 1070 | Tooltips |
| `--z-notification` | 1080 | Toasts |

**Uso en Tailwind:**
```tsx
<header className="z-sticky" />
<div className="z-modal" />
```

> ⚠️ **Nunca usar z-index arbitrarios** (`z-50`, `z-999`). Siempre usar tokens semánticos.

---

## Animaciones

### Duraciones

| Token | Valor | Uso |
|-------|-------|-----|
| `--duration-fast` | 75ms | Hover effects |
| `--duration-normal` | 150ms | Transiciones estándar |
| `--duration-slow` | 300ms | Animaciones complejas |
| `--duration-slower` | 500ms | Transiciones de página |

### Easing

| Token | Uso |
|-------|-----|
| `--ease-in` | Salida lenta |
| `--ease-out` | Entrada suave |
| `--ease-in-out` | Suave ambos extremos |
| `--ease-bounce` | Efecto rebote |

**Uso en Tailwind:**
```tsx
<button className="transition-colors duration-fast ease-out" />
```

---

## Tipografía

Escala estándar de Tailwind. Fuentes definidas en `fonts.css`.

| Clase | Tamaño | Uso recomendado |
|-------|--------|-----------------|
| `text-xs` | 12px | Texto auxiliar |
| `text-sm` | 14px | Labels |
| `text-base` | 16px | Texto cuerpo |
| `text-lg` | 18px | Subtítulos |
| `text-xl` | 20px | Títulos de sección |
| `text-2xl` | 24px | Títulos principales |

**Fuentes:**
- `font-sans`: Inter (UI)
- `font-serif`: Playfair Display (títulos elegantes)
- `font-mono`: JetBrains Mono (código)

---

## Importar Temas de tweakcn.com

1. Ir a [tweakcn.com](https://tweakcn.com)
2. Seleccionar/crear tema
3. Copiar variables CSS
4. Reemplazar valores en `tokens.css` (`:root` y `.dark`)
5. Mantener tokens adicionales (shadows, z-index, animations)

**Variables requeridas por tweakcn.com:**
```css
--background, --foreground
--card, --card-foreground
--popover, --popover-foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --destructive-foreground
--border, --input, --ring
--radius
```

---

## Extender Tokens

### Añadir nuevo color

1. Definir en `tokens.css`:
```css
:root {
  --success: 142 76% 36%;
  --success-foreground: 0 0% 100%;
}
.dark {
  --success: 142 70% 45%;
  --success-foreground: 0 0% 100%;
}
```

2. Mapear en `tailwind-config/index.js`:
```js
colors: {
  success: {
    DEFAULT: "hsl(var(--success))",
    foreground: "hsl(var(--success-foreground))",
  },
}
```

3. Usar: `bg-success text-success-foreground`
