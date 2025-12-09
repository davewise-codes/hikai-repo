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
| `--success` | Estados de éxito, confirmaciones | `142 76% 36%` | `142 70% 45%` |
| `--warning` | Avisos, estados de atención | `38 92% 50%` | `38 92% 50%` |
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
<CheckCircle className="text-success" />
<AlertTriangle className="text-warning" />
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

## Sistema de Tipografía

Sistema de tipografía basado en Linear. Permite ajustar el tamaño de fuente de componentes UI específicos sin afectar el layout (heights, paddings, avatares permanecen constantes).

**Cómo funciona**: Se aplica una clase al `<html>` (`font-size-compact`, `font-size-normal`, `font-size-comfortable`) que define las variables CSS. Solo los elementos con clases `text-fontSize-*` escalan.

### Escala Tipográfica

Definida en `src/tokens/density.css`:

| Token | Compact | Normal | Comfortable | Uso |
|-------|---------|--------|-------------|-----|
| `--fontSize-xs` | 10px | **12px** | 13px | Hints, badges, captions |
| `--fontSize-sm` | 11px | **13px** | 14px | **UI estándar**: labels, menus, botones |
| `--fontSize-base` | 13px | **15px** | 16px | Body text, párrafos |
| `--fontSize-lg` | 16px | **18px** | 20px | Subtítulos |
| `--fontSize-title` | 20px | **24px** | 28px | Headers de página |

**Referencia Linear**:
- `--font-size-mini`: 12px → nuestro `--fontSize-xs`
- `--font-size-small`: 13px → nuestro `--fontSize-sm`
- `--font-size-regular`: 15px → nuestro `--fontSize-base`
- `--font-size-large`: 18px → nuestro `--fontSize-lg`
- `--font-size-title2`: 24px → nuestro `--fontSize-title`

### Font Weights

| Token | Valor | Uso |
|-------|-------|-----|
| `--fontWeight-normal` | 400 | Texto regular |
| `--fontWeight-medium` | 500 | Labels, énfasis suave |
| `--fontWeight-semibold` | 600 | Títulos, CTAs |

### Line Heights

| Token | Valor | Uso |
|-------|-------|-----|
| `--lineHeight-tight` | 1.25 | UI compacta, nav items |
| `--lineHeight-normal` | 1.5 | Body text, párrafos |

### Clases Utility

```css
/* Font sizes (responden a preferencia de density) */
.text-fontSize-xs     /* Hints, badges, captions */
.text-fontSize-sm     /* UI estándar: labels, menus, botones */
.text-fontSize-base   /* Body text */
.text-fontSize-lg     /* Subtítulos */
.text-fontSize-title  /* Headers de página */

/* Font weights */
.font-weight-normal
.font-weight-medium
.font-weight-semibold

/* Line heights */
.leading-ui-tight     /* Para UI densa */
.leading-ui-normal    /* Para body text */
```

### Uso en Componentes

Los componentes de UI (`Button`, `Input`, `DropdownMenu`) ya usan estas clases internamente. El texto responde a la preferencia del usuario, pero heights/paddings permanecen constantes.

```tsx
// ✅ Correcto: usar clases de tokens
<span className="text-fontSize-sm">Label</span>
<p className="text-fontSize-base">Body text</p>
<h1 className="text-fontSize-title font-weight-semibold">Header</h1>

// ❌ Incorrecto: clases hardcodeadas de Tailwind
<span className="text-sm">Label</span>
```

### Compatibilidad con tailwind-merge

Las clases `text-fontSize-*` están configuradas en `tailwind-merge` para que no sean eliminadas al usar `cn()`. La configuración extiende el grupo `font-size` para reconocer nuestras clases custom:

```ts
// packages/ui/src/lib/utils.ts
const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ 'text-fontSize': ['xs', 'sm', 'base', 'lg', 'title'] }]
    }
  }
})
```

Esto permite que `cn("text-fontSize-sm", "text-fontSize-lg")` resuelva correctamente a `"text-fontSize-lg"` (el último gana), igual que las clases nativas de Tailwind.

### Aplicar Preferencia

La clase se aplica al elemento `<html>`:

```tsx
<html className={`font-size-${level}`}>
```

Los valores válidos son: `font-size-compact`, `font-size-normal`, `font-size-comfortable`.

---

## Sistema de Spacing (UI Components)

Tokens para spacing de componentes UI (nav items, botones, menús). Basado en Linear para alta densidad de información.

Definido en `src/tokens/spacing.css`.

### Principios

- **Nav/Menu items**: altura FIJA (28px) para consistencia en listas
- **Botones**: altura NATURAL (py-0 + line-height), NO altura fija
- **Sin padding vertical** en nav/menu items
- **Los gaps NO varían** con density preference (solo tipografía escala)

### Component Heights

| Token | Valor | Uso |
|-------|-------|-----|
| `--height-nav-item` | 28px (1.75rem) | Navigation items |
| `--height-menu-item` | 28px (1.75rem) | Menu/dropdown items |

> ⚠️ **Botones NO usan altura fija**. Usan `py-0` + `line-height` para altura natural.

### Horizontal Padding

| Token | Valor | Uso |
|-------|-------|-----|
| `--spacing-btn-x` | 14px (0.875rem) | Botones (webapp/settings) |
| `--spacing-btn-x-compact` | 8px (0.5rem) | Futuro: website, acciones densas |
| `--spacing-nav-x` | 8px (0.5rem) | Navigation items |
| `--spacing-menu-x` | 8px (0.5rem) | Menu items |

### Gaps

| Token | Valor | Uso |
|-------|-------|-----|
| `--gap-nav-items` | 2px (0.125rem) | Entre items de navegación |
| `--gap-section` | 24px (1.5rem) | Entre secciones |
| `--gap-content` | 8px (0.5rem) | Entre elementos de contenido |

### Clases Utility

```css
/* Component heights (solo nav/menu, NO botones) */
.h-nav-item      /* 28px - para nav items */
.h-menu-item     /* 28px - para menu items */

/* Horizontal padding */
.px-btn          /* 14px - para botones */
.px-nav          /* 8px - para nav items */
.px-menu         /* 8px - para menu items */

/* Gaps */
.gap-nav         /* 2px - entre items de nav */
.gap-section     /* 24px - entre secciones */
.gap-content     /* 8px - entre elementos de contenido */
```

### Uso en Componentes

```tsx
// ✅ Nav item con altura fija
<div className="h-nav-item px-nav flex items-center">
  <span className="text-fontSize-sm">Menu Item</span>
</div>

// ✅ Botón con altura natural (sin h-*)
<button className="px-btn py-0 text-fontSize-sm">
  Action
</button>

// ❌ Incorrecto: padding vertical en nav items
<div className="px-2 py-1.5">Nav item</div>

// ❌ Incorrecto: altura fija en botones
<button className="h-9 px-4">Button</button>
```

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
