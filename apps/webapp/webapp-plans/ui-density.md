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
- Documentación de UI en el package UI: packages/ui

---

## Mejora UI Density

- Quiero introducir algunas mejoras en el sistema de UI para mejorar la estética.
- De momento centradas en la webapp.
- La idea es de tener un producto profesional, estilo Linear, dónde los componentes facilitan gran densidad de información en pantalla
- Pero es clave construirlo de manera escalable. Prefiero controlar tamaños, padding, etc. de manera centralizada. Este punto es crucial. hay que minimizar customizaciones
- Hay al menos los siguientes aspectos que quiero mejorar:
  1. Font Size
     - Aunque la webapp aún no es muy amplia, ya hay cierta heterogeneidad de fontSize
     - Quiero unificar todos los textos al mismo tamaño: fontSize-sm
     - Este será el tamaño estándar para el texto de la app
     - Este tamaño debe ser controlable después por el usuario por el parámetro de theme font size, que actualmente no se está aplicando en muchos textos
     - Hay que revisar que todos esten manejados por ese parámetro y poner mecanismos para asegurar que los nuevos que vengan también lo estarán
     - Sólo habrá las siguientes excepciones a este tamaño por ahora:
       - cabecera de los menús de configuración. Linear utiliza var(--font-size-title2) = 1.5rem; Nosotros deberíamos buscar un token similar. Utilizamos actualmente text-2xl, que es efectivamente el tamaño correcto 1.5 rem
       - título de cada grupo de settings en los menús de configuración. Linear utiliza var(--font-size-regular) = .9375rem; Nosotros deberíamos uscar un token similar. Utilizamos actualmente text-sm
       - subtítulo bajo cada setting. Linear utiliza --font-size-mini: .75rem;
     - Esta sería la referencia de tamnaños que usa linear:
       --font-size-micro: .6875rem;
       --font-size-microPlus: .6875rem;
       --font-size-mini: .75rem;
       --font-size-miniPlus: .75rem;
       --font-size-small: .8125rem;
       --font-size-smallPlus: .8125rem;
       --font-size-regular: .9375rem;
       --font-size-regularPlus: .9375rem;
       --font-size-large: 1.125rem;
       --font-size-largePlus: 1.125rem;
       --font-size-title1: 2.25rem;
       --font-size-title2: 1.5rem;
       --font-size-title3: 1.25rem;
       --font-weight-light: 300;
       --font-weight-normal: 450;
       --font-weight-medium: 500;
       --font-weight-semibold: 600;
       --font-weight-bold: 700;
  2. Padding en botones e items de settings-navigation
     - Actualmente deja mucho espacio entre items de navegación. Quiero que estén más juntos
     - Algunos botones quedan también muy grandes
     - Analizando las diferencias con linear veo que
       - padding-top y padding-bottom: 0.375 en los menús del navigation.
       - y también pasa eso en los item de los menús:

           <style>
           .py-1\.5 {
               padding-top: 0.375rem;
               padding-bottom: 0.375rem;
           }


       - linear no pone padding top y bottom

     - dejaríamos también nosotros los padding verticales a cero, tanto en este menú como en los botones que lo tengan
     - en el caso de los botones, sí veo que linear usa 2 padding horizontales, 8 (en los botones de acciones de la app, dónde hay muchos) y 14 (en los de settings). Nosotros por ahora sólo usaremos esta última variante (no tenemos aún otro botón que justifique la primera)
     - en línear el alto de cada item en el menú de navegaci´çon, son exactamente 28px.
     - habrá más menús de navegación que no sean el de sttings, este estilo tiene que ser consistente entre ellos

- genera el plan en forma de prompts por fases, igual que hemos hecho en otras oportunidades como apps/webapp/webapp-plans/settings-structure.md
- el documento sobre el que trabajaremos será: apps/webapp/webapp-plans/ui-density.md. la información del plan la tienes que detallar a continuación del contenido ya existente
- tengo muy poco know-how acerca de montar design systems, ayúdame a definir la mejor manera de implementar estos cambios para asegurar la escalabilidad de la app
- incluye, igual que en apps/webapp/webapp-plans/shared-layouts.md una sección para poder monitorizar el progreso en distintas conversaciones sin perder el contexto
- incluye un prompt para arrancar cada fase
- máxima capacidad de ultrathink

---

## El plan se incluye a partir de esta sección

---

# Plan de Implementación: UI Density System

## Progreso

| Fase | Descripción | Estado |
|------|-------------|--------|
| F0: Análisis y Definición de Tokens | Definir escala tipográfica y tokens de spacing | ✅ Completado |
| F1: Sistema de Typography Tokens | Crear variables CSS y clases utility para tipografía | ✅ Completado |
| F2: Sistema de Spacing Tokens | Crear tokens centralizados para nav items y botones | ✅ Completado |
| F3: Migración de Componentes UI | Aplicar tokens a Button, Badge, inputs en packages/ui | ✅ Completado |
| F4: Migración Settings Navigation | Aplicar tokens a settings-nav y componentes relacionados | ✅ Completado |
| F5: Migración Menus y Dropdowns | Aplicar tokens a user-menu, org-switcher, product-switcher | ✅ Completado |
| F5.1: Fix tailwind-merge | Extender tailwind-merge para clases text-fontSize-* | ✅ Completado |
| F6: Migración de Cards y Forms | Aplicar tokens a cards, formularios y resto de webapp | ⏳ Pendiente |
| F7: Cleanup y Documentación | Eliminar código obsoleto, documentar sistema | ⏳ Pendiente |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Prompt para arrancar cada fase

```
- En apps/webapp/webapp-plans/ui-density.md puedes ver el plan de implementación de UI Density
- Vamos a proceder con la fase siguiente pendiente de ejecutar
- Analiza el documento y el plan y toma el prompt de esa fase como instrucción para implementarla
- Cuando tengas un plan para ello compártelo conmigo para validarlo
- No hagas commit inmediatamente tras finalizar la implementación
- Indícame las pruebas a realizar y cuando yo te confirme que están ok, haces el commit y actualizas el progreso
- No hagas asunciones, compárteme dudas y las debatimos
- Máxima capacidad de ultrathink
```

---

## Arquitectura del Design System

### Filosofía: Tokens Centralizados

La clave para un sistema escalable es **centralizar decisiones de diseño en tokens CSS**. Esto permite:

1. **Cambio único, efecto global**: Modificar un token actualiza toda la app
2. **Consistencia garantizada**: Los componentes consumen tokens, no valores hardcodeados
3. **Escalabilidad**: Añadir variantes es trivial
4. **Theming**: Los tokens pueden variar por tema/preferencia de usuario

### Principio "Linear-style"

Linear es nuestra referencia de diseño. Características clave:
- **Alta densidad de información**: Mucho contenido útil en poco espacio
- **Padding vertical mínimo**: Items de navegación a 28px de altura
- **Tipografía uniforme**: Un tamaño base para todo el UI
- **Jerarquía clara**: Títulos > Labels > Hints, sin variaciones intermedias

---

## Análisis del Estado Actual

### Heterogeneidad Detectada

| Área | Problema | Impacto |
|------|----------|---------|
| Font Size | Coexistencia de `text-sm` y `text-fontSize-sm` | 92 ocurrencias en 20 archivos |
| Padding Vertical | `py-1.5`, `py-2`, `py-4` sin estándar | 52 ocurrencias en 27 archivos |
| Nav Items | Altura inconsistente entre componentes | UX fragmentada |
| Botones | Padding variable según componente | Tamaños inconsistentes |

### Escala Tipográfica Linear (referencia)

```css
/* Tamaños de fuente Linear */
--font-size-micro: .6875rem;     /* 11px */
--font-size-mini: .75rem;        /* 12px */
--font-size-small: .8125rem;     /* 13px - ✅ Nuestro text-fontSize-sm */
--font-size-regular: .9375rem;   /* 15px - ✅ Nuestro text-fontSize-base */
--font-size-large: 1.125rem;     /* 18px */
--font-size-title3: 1.25rem;     /* 20px */
--font-size-title2: 1.5rem;      /* 24px - ✅ Nuestro text-2xl */
--font-size-title1: 2.25rem;     /* 36px */

/* Pesos de fuente Linear */
--font-weight-light: 300;
--font-weight-normal: 450;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Mapeo Propuesto: Linear → Hikai

| Linear | Valor | Hikai Token | Uso |
|--------|-------|-------------|-----|
| `--font-size-mini` | 12px | `--fontSize-xs` | Hints, captions, badges |
| `--font-size-small` | 13px | `--fontSize-sm` | **Texto estándar de toda la app** |
| `--font-size-regular` | 15px | `--fontSize-base` | Body text, párrafos |
| `--font-size-title2` | 24px | `--fontSize-title` | Headers de páginas |
| `--font-size-title3` | 20px | `--fontSize-subtitle` | Títulos de sección |

**Decisión clave**: `text-fontSize-sm` (13px) será el tamaño estándar para TODO el texto de la app (labels, menús, botones, inputs). Las únicas excepciones serán:
- Títulos de página: `text-2xl` (1.5rem = 24px)
- Títulos de sección: `text-base` o similar (15px)
- Hints/subtítulos: `text-fontSize-xs` (12px)

---

## Sistema de Tokens Propuesto

### 1. Typography Tokens (density.css ampliado)

```css
:root {
  /* === TYPOGRAPHY SCALE === */

  /* Base sizes (Normal - Linear equivalent) */
  --fontSize-xs: 0.75rem;        /* 12px - hints, captions */
  --fontSize-sm: 0.8125rem;      /* 13px - UI estándar */
  --fontSize-base: 0.9375rem;    /* 15px - body text */
  --fontSize-lg: 1.125rem;       /* 18px - subtítulos grandes */
  --fontSize-title: 1.5rem;      /* 24px - títulos de página */

  /* Font weights */
  --fontWeight-normal: 400;
  --fontWeight-medium: 500;
  --fontWeight-semibold: 600;

  /* Line heights (tight for UI density) */
  --lineHeight-tight: 1.25;
  --lineHeight-normal: 1.5;
}

/* Compact: Power users */
.font-size-compact {
  --fontSize-xs: 0.625rem;       /* 10px */
  --fontSize-sm: 0.6875rem;      /* 11px */
  --fontSize-base: 0.8125rem;    /* 13px */
  --fontSize-lg: 1rem;           /* 16px */
  --fontSize-title: 1.25rem;     /* 20px */
}

/* Comfortable: Accessibility */
.font-size-comfortable {
  --fontSize-xs: 0.8125rem;      /* 13px */
  --fontSize-sm: 0.875rem;       /* 14px */
  --fontSize-base: 1rem;         /* 16px */
  --fontSize-lg: 1.25rem;        /* 20px */
  --fontSize-title: 1.75rem;     /* 28px */
}
```

### 2. Spacing Tokens (nuevo archivo)

```css
:root {
  /* === SPACING SCALE (UI Components) === */

  /* Navigation items (Linear: 28px height, 0 vertical padding) */
  --spacing-nav-x: 0.5rem;       /* px-2 = 8px */
  --height-nav-item: 1.75rem;    /* 28px - Linear standard */

  /* Buttons - SIN altura fija, altura natural por line-height */
  --spacing-btn-x: 0.875rem;     /* px-3.5 = 14px - Linear settings buttons */
  --spacing-btn-x-compact: 0.5rem; /* px-2 = 8px - para futuro (website), botones densos */

  /* Menu items */
  --spacing-menu-x: 0.5rem;      /* px-2 = 8px */
  --height-menu-item: 1.75rem;   /* 28px */

  /* Section spacing */
  --gap-section: 1.5rem;         /* 24px entre secciones */
  --gap-nav-items: 0.125rem;     /* 2px entre items de nav */
  --gap-content: 0.5rem;         /* 8px entre elementos de contenido */
}
```

**NOTA**: Los botones NO usan altura fija. Usan `py-0` + `line-height` para altura natural.

### 3. Utility Classes Adicionales (globals.css)

```css
@layer utilities {
  /* Typography */
  .text-fontSize-xs { font-size: var(--fontSize-xs); }
  .text-fontSize-sm { font-size: var(--fontSize-sm); }
  .text-fontSize-base { font-size: var(--fontSize-base); }
  .text-fontSize-lg { font-size: var(--fontSize-lg); }
  .text-fontSize-title { font-size: var(--fontSize-title); }

  /* UI Component heights (solo para nav/menu items, NO para botones) */
  .h-nav-item { height: var(--height-nav-item); }
  .h-menu-item { height: var(--height-menu-item); }

  /* Horizontal padding */
  .px-nav { padding-left: var(--spacing-nav-x); padding-right: var(--spacing-nav-x); }
  .px-btn { padding-left: var(--spacing-btn-x); padding-right: var(--spacing-btn-x); }
}
```

**NOTA**: NO hay `.h-btn` - los botones usan altura natural.

---

## Instrucciones Generales (aplicar en TODAS las fases)

### Actualizar Progreso
- Al completar cada fase, actualizar la tabla de **Progreso** al inicio
- Marcar la fase completada con ✅

### Reglas del Repo
- Asegurar cumplimiento de reglas y principios en `CLAUDE.md`
- Los tokens van en `packages/ui/src/tokens/`
- Las clases utility van en `packages/ui/src/styles/globals.css`
- Actualizar `packages/ui/DESIGN-TOKENS.md` con cambios
- Verificar que no hay errores de TS ni Lint

### Commits
- Un commit por fase completada
- **NO realizar commit** hasta que el usuario confirme pruebas OK
- Formato: `feat(ui): [F#-DENSITY] descripción breve`

### Compatibilidad
- Los tokens deben funcionar con las 3 preferencias: compact, normal, comfortable
- Los cambios deben ser retrocompatibles (no romper componentes existentes)

---

## FASE 0: Análisis y Definición de Tokens

**Objetivo**: Definir la escala tipográfica y spacing tokens finales basándose en Linear.

### Tareas

1. **Revisar componentes de Linear** para confirmar medidas exactas
2. **Definir escala tipográfica final** con los 5 niveles: xs, sm, base, lg, title
3. **Definir spacing tokens** para nav items, botones, menús
4. **Documentar decisiones** en este archivo

### Prompt

```
FASE 0: Análisis y Definición de Tokens

PARTE 1: CONFIRMAR ESCALA TIPOGRÁFICA

Basándose en la referencia de Linear y el estado actual, confirmar:

1. Escala de fuentes (5 niveles):
   - xs: 12px (hints, badges) → compact: 10px, comfortable: 13px
   - sm: 13px (UI estándar) → compact: 11px, comfortable: 14px
   - base: 15px (body) → compact: 13px, comfortable: 16px
   - lg: 18px (subtítulos) → compact: 16px, comfortable: 20px
   - title: 24px (headers) → compact: 20px, comfortable: 28px

2. Pesos de fuente:
   - normal: 400
   - medium: 500
   - semibold: 600

PARTE 2: CONFIRMAR SPACING TOKENS

1. Altura de nav items: 28px (h-7 en Tailwind)
2. Altura de botones default: 28px
3. Altura de botones sm: 24px
4. Padding horizontal nav: 8px (px-2)
5. Padding horizontal btn: 14px (px-3.5)
6. Vertical padding: 0 en ambos casos (altura fija)

PARTE 3: DOCUMENTAR DECISIONES

Actualizar apps/webapp/webapp-plans/ui-density.md con las decisiones finales.
Crear tabla de "antes vs después" para cada componente.

VALIDACIÓN:
1. Las medidas coinciden con Linear
2. La escala es coherente (cada nivel ~20% mayor que el anterior)
3. Hay suficientes niveles pero no demasiados
```

### Validación F0

```
1. Escala tipográfica definida y documentada
2. Spacing tokens definidos
3. Tabla de mapeo Linear → Hikai completada
4. Decisiones documentadas en ui-density.md
```

---

## FASE 1: Sistema de Typography Tokens

**Objetivo**: Implementar tokens CSS para tipografía con soporte para density levels.

### Archivos a modificar

- `packages/ui/src/tokens/density.css` - Ampliar con nuevos tokens
- `packages/ui/src/styles/globals.css` - Añadir utility classes
- `packages/ui/DESIGN-TOKENS.md` - Documentar nuevos tokens

### Prompt

```
FASE 1: Sistema de Typography Tokens

PARTE 1: AMPLIAR density.css
ARCHIVO: packages/ui/src/tokens/density.css

Añadir los nuevos tokens de tipografía manteniendo backward compatibility:

:root {
  /* Typography Scale - Normal (Linear-like) */
  --fontSize-xs: 0.75rem;        /* 12px */
  --fontSize-sm: 0.8125rem;      /* 13px */
  --fontSize-base: 0.9375rem;    /* 15px */
  --fontSize-lg: 1.125rem;       /* 18px */
  --fontSize-title: 1.5rem;      /* 24px */

  /* Font Weights */
  --fontWeight-normal: 400;
  --fontWeight-medium: 500;
  --fontWeight-semibold: 600;

  /* Line Heights */
  --lineHeight-tight: 1.25;
  --lineHeight-normal: 1.5;
}

.font-size-compact {
  --fontSize-xs: 0.625rem;       /* 10px */
  --fontSize-sm: 0.6875rem;      /* 11px */
  --fontSize-base: 0.8125rem;    /* 13px */
  --fontSize-lg: 1rem;           /* 16px */
  --fontSize-title: 1.25rem;     /* 20px */
}

.font-size-comfortable {
  --fontSize-xs: 0.8125rem;      /* 13px */
  --fontSize-sm: 0.875rem;       /* 14px */
  --fontSize-base: 1rem;         /* 16px */
  --fontSize-lg: 1.25rem;        /* 20px */
  --fontSize-title: 1.75rem;     /* 28px */
}

PARTE 2: ACTUALIZAR globals.css
ARCHIVO: packages/ui/src/styles/globals.css

Añadir nuevas utility classes:

@layer utilities {
  /* Existing */
  .text-fontSize-xs { font-size: var(--fontSize-xs); }
  .text-fontSize-sm { font-size: var(--fontSize-sm); }
  .text-fontSize-base { font-size: var(--fontSize-base); }

  /* New */
  .text-fontSize-lg { font-size: var(--fontSize-lg); }
  .text-fontSize-title { font-size: var(--fontSize-title); }

  /* Font weights */
  .font-weight-normal { font-weight: var(--fontWeight-normal); }
  .font-weight-medium { font-weight: var(--fontWeight-medium); }
  .font-weight-semibold { font-weight: var(--fontWeight-semibold); }

  /* Line heights */
  .leading-ui-tight { line-height: var(--lineHeight-tight); }
  .leading-ui-normal { line-height: var(--lineHeight-normal); }
}

PARTE 3: DOCUMENTAR EN DESIGN-TOKENS.md

Actualizar la sección de Typography con la nueva escala completa.

VALIDACIÓN:
1. pnpm --filter @hikai/ui tsc --noEmit
2. Los tokens se aplican correctamente en los 3 niveles de density
3. Backward compatibility mantenida
```

### Validación F1

```
1. density.css ampliado con 5 niveles de fontSize
2. globals.css tiene utility classes para lg y title
3. Los 3 niveles (compact/normal/comfortable) funcionan
4. DESIGN-TOKENS.md actualizado
5. No hay errores de TS
```

---

## FASE 2: Sistema de Spacing Tokens

**Objetivo**: Crear tokens centralizados para spacing de componentes UI.

### Archivos a crear/modificar

- `packages/ui/src/tokens/spacing.css` - Nuevo archivo
- `packages/ui/src/styles/globals.css` - Importar y añadir utilities
- `packages/tailwind-config/index.js` - Mapear tokens a Tailwind

### Prompt

```
FASE 2: Sistema de Spacing Tokens

PARTE 1: CREAR spacing.css
ARCHIVO: packages/ui/src/tokens/spacing.css

/**
 * UI Component Spacing Tokens
 *
 * Principios (según decisiones F0):
 * - Nav/Menu items: altura FIJA (28px) para consistencia en listas
 * - Botones: altura NATURAL (py-0 + line-height), NO altura fija
 * - Sin padding vertical en ningún caso
 */

:root {
  /* === COMPONENT HEIGHTS (solo nav/menu, NO botones) === */
  --height-nav-item: 1.75rem;    /* 28px - Linear standard */
  --height-menu-item: 1.75rem;   /* 28px */

  /* === HORIZONTAL PADDING === */
  --spacing-btn-x: 0.875rem;     /* 14px - Linear settings buttons (webapp) */
  --spacing-btn-x-compact: 0.5rem; /* 8px - futuro para website, acciones densas */
  --spacing-nav-x: 0.5rem;       /* 8px - navigation items */
  --spacing-menu-x: 0.5rem;      /* 8px - menu items */

  /* === GAPS (Between items) === */
  --gap-nav-items: 0.125rem;     /* 2px - very tight */
  --gap-section: 1.5rem;         /* 24px - between sections */
  --gap-content: 0.5rem;         /* 8px - between content elements */
}

PARTE 2: IMPORTAR EN globals.css

Añadir import al inicio de globals.css:
@import "../tokens/spacing.css";

Añadir utility classes:

@layer utilities {
  /* Component heights (solo nav/menu, NO botones) */
  .h-nav-item { height: var(--height-nav-item); }
  .h-menu-item { height: var(--height-menu-item); }

  /* Horizontal padding */
  .px-btn { padding-left: var(--spacing-btn-x); padding-right: var(--spacing-btn-x); }
  .px-nav { padding-left: var(--spacing-nav-x); padding-right: var(--spacing-nav-x); }
  .px-menu { padding-left: var(--spacing-menu-x); padding-right: var(--spacing-menu-x); }

  /* Gaps */
  .gap-nav { gap: var(--gap-nav-items); }
  .gap-section { gap: var(--gap-section); }
  .gap-content { gap: var(--gap-content); }
}

NOTA: NO crear .h-btn - los botones usan altura natural por line-height.

VALIDACIÓN:
1. pnpm --filter @hikai/ui tsc --noEmit
2. Las utility classes funcionan
3. Los valores son correctos (28px para nav items, etc.)
4. NO existen tokens de altura para botones
```

### Validación F2

```
1. spacing.css creado con tokens (sin --height-btn-*)
2. globals.css importa spacing.css
3. Utility classes disponibles (sin .h-btn-*)
4. No hay errores de TS
```

---

## FASE 3: Migración de Componentes UI (packages/ui)

**Objetivo**: Aplicar los nuevos tokens a Button, Input, y otros componentes base.

### Archivos a modificar

- `packages/ui/src/components/ui/button.tsx`
- `packages/ui/src/components/ui/input.tsx`
- `packages/ui/src/components/ui/badge.tsx`
- `packages/ui/src/components/ui/dropdown-menu.tsx`

### Prompt

```
FASE 3: Migración de Componentes UI

IMPORTANTE: Aplicar decisiones de F0:
- Botones: SIN altura fija, altura NATURAL por line-height (py-0 + px-3.5)
- Nav/Menu items: CON altura fija (h-7 = 28px)

PARTE 1: ACTUALIZAR button.tsx
ARCHIVO: packages/ui/src/components/ui/button.tsx

Cambiar las variantes de size para usar ALTURA NATURAL (sin h-*):

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-fontSize-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: { /* sin cambios */ },
      size: {
        // ANTES: h-9 px-4 py-2
        // DESPUÉS: SIN altura fija, padding horizontal, sin padding vertical
        default: "px-3.5 py-0",           // 14px horizontal, altura natural
        sm: "px-3 py-0 text-fontSize-xs", // 12px horizontal, font más pequeña
        lg: "px-3.5 py-0",                // igual que default (mismo padding)
        icon: "p-0 size-7",               // solo icon mantiene tamaño fijo 28x28
      },
    },
  }
);

NOTA: Solo `icon` usa tamaño fijo porque es un cuadrado.

PARTE 2: VERIFICAR input.tsx
ARCHIVO: packages/ui/src/components/ui/input.tsx

Verificar que usa text-fontSize-sm y altura apropiada:
- Altura: h-8 (32px) es correcto para inputs (mantener)
- Font: text-fontSize-sm
- Padding: px-3 (12px)

PARTE 3: VERIFICAR badge.tsx

Verificar que usa text-fontSize-xs para badges.

PARTE 4: ACTUALIZAR dropdown-menu.tsx

Los items de dropdown usan altura FIJA (son listas):
- DropdownMenuItem: h-7 (28px), px-2, text-fontSize-sm
- Eliminar py-1.5, usar altura fija en su lugar

VALIDACIÓN:
1. pnpm --filter @hikai/ui tsc --noEmit
2. Botones SIN altura fija (excepto icon)
3. Botones con py-0 y px-3.5
4. Dropdown items con h-7 (28px)
5. Todo el texto usa text-fontSize-sm o text-fontSize-xs
```

### Validación F3

```
1. Button usa altura NATURAL (sin h-*, excepto icon)
2. Botones con py-0 px-3.5
3. Dropdown items con h-7 (altura fija 28px)
4. Texto uniforme con text-fontSize-sm
5. No hay errores de TS
6. Visual consistente con Linear
```

---

## FASE 4: Migración Settings Navigation

**Objetivo**: Aplicar tokens a settings-nav y componentes relacionados.

### Archivos a modificar

- `apps/webapp/src/domains/shared/components/settings-nav/settings-nav-item.tsx`
- `apps/webapp/src/domains/shared/components/settings-nav/settings-nav-section.tsx`
- `apps/webapp/src/domains/shared/components/settings-nav/settings-nav.tsx`

### Prompt

```
FASE 4: Migración Settings Navigation

PARTE 1: ACTUALIZAR settings-nav-item.tsx

ANTES:
<div className="flex items-center gap-2 px-2 py-1.5 text-fontSize-sm ...">

DESPUÉS:
<div className="flex items-center gap-2 px-2 h-7 text-fontSize-sm ...">

Cambios clave:
- py-1.5 → ELIMINAR (usar altura fija)
- Añadir h-7 (28px) para altura fija
- Mantener px-2 para padding horizontal
- Mantener text-fontSize-sm

El item disabled también:
<div className="flex items-center gap-2 px-2 h-7 text-fontSize-sm text-muted-foreground/60 cursor-not-allowed">

PARTE 2: ACTUALIZAR settings-nav-section.tsx

Verificar spacing entre items:
- gap-0.5 o gap-1 máximo entre items de nav
- El título de sección puede mantener su estilo actual

PARTE 3: VERIFICAR settings-nav.tsx

El contenedor del nav debe usar:
- space-y-6 para gap entre secciones (mantener)
- py-4 para padding vertical del contenedor (mantener)

VALIDACIÓN:
1. pnpm --filter @hikai/webapp tsc --noEmit
2. Nav items tienen altura de 28px
3. Items más compactos, sin espacio vertical excesivo
4. Hover/active states funcionan correctamente
5. Comparar visualmente con Linear
```

### Validación F4

```
1. settings-nav-item usa h-7 sin py-*
2. Items de nav a 28px de altura
3. Espaciado más compacto
4. Visual similar a Linear
5. No hay errores de TS
```

---

## FASE 5: Migración Menus y Dropdowns

**Objetivo**: Aplicar tokens a user-menu, org-switcher, product-switcher.

### Archivos a modificar

- `apps/webapp/src/domains/core/components/user-menu.tsx`
- `apps/webapp/src/domains/organizations/components/org-switcher.tsx`
- `apps/webapp/src/domains/products/components/product-switcher.tsx`

### Prompt

```
FASE 5: Migración Menus y Dropdowns

PARTE 1: MIGRAR user-menu.tsx

1. Reemplazar todas las ocurrencias de text-sm por text-fontSize-sm
2. Reemplazar text-xs por text-fontSize-xs
3. Verificar que DropdownMenuItems usan clases consistentes
4. Ajustar padding si es necesario

ANTES:
<p className="text-sm font-medium leading-none truncate">

DESPUÉS:
<p className="text-fontSize-sm font-medium leading-none truncate">

PARTE 2: MIGRAR org-switcher.tsx

Mismo patrón:
1. text-sm → text-fontSize-sm
2. text-xs → text-fontSize-xs

PARTE 3: MIGRAR product-switcher.tsx

Mismo patrón:
1. text-sm → text-fontSize-sm
2. text-xs → text-fontSize-xs

PARTE 4: VERIFICAR CONSISTENCIA

Todos los menús deben tener:
- Items de menú a ~28px de altura (heredado de DropdownMenuItem)
- Texto con text-fontSize-sm
- Hints/subtítulos con text-fontSize-xs
- Sin padding vertical excesivo

VALIDACIÓN:
1. pnpm --filter @hikai/webapp tsc --noEmit
2. No hay ocurrencias de text-sm o text-xs en los 3 archivos
3. Los menús se ven consistentes entre sí
4. Comparar visualmente con Linear
```

### Validación F5

```
1. user-menu usa text-fontSize-*
2. org-switcher usa text-fontSize-*
3. product-switcher usa text-fontSize-*
4. Visual consistente entre los 3 menús
5. No hay errores de TS
```

---

## FASE 6: Migración de Cards y Forms

**Objetivo**: Aplicar tokens al resto de componentes de webapp.

### Archivos a modificar (20+ archivos identificados en análisis)

- Cards: `product-card.tsx`, `org-card.tsx`
- Forms: `create-organization-form.tsx`, `create-product-form.tsx`, `entity-fields.tsx`
- Auth: `signin-form.tsx`, `verification-code-form.tsx`, `auth-form.tsx`
- Shared: `settings-section.tsx`, `settings-header.tsx`
- Others: `home-page.tsx`, `product-list.tsx`, `sidebar.tsx`

### Prompt

```
FASE 6: Migración de Cards y Forms

PARTE 1: BUSCAR Y REEMPLAZAR EN BATCH

Usar grep/search para encontrar todas las ocurrencias de:
- text-sm → text-fontSize-sm
- text-xs → text-fontSize-xs

En los siguientes directorios:
- apps/webapp/src/domains/
- apps/webapp/src/components/
- apps/webapp/src/routes/

EXCEPCIÓN: Mantener text-2xl para títulos de página (es intencional).

PARTE 2: VERIFICAR CARDS

En product-card.tsx y org-card.tsx:
- Títulos: pueden usar text-fontSize-sm font-medium
- Descripciones: text-fontSize-xs text-muted-foreground
- Badges: heredan de componente Badge (ya migrado)

PARTE 3: VERIFICAR FORMS

En formularios de creación:
- Labels: text-fontSize-sm
- Hints: text-fontSize-xs
- Inputs: heredan de componente Input

PARTE 4: VERIFICAR AUTH COMPONENTS

- Textos informativos: text-fontSize-sm
- Hints: text-fontSize-xs
- Botones: heredan de Button

PARTE 5: SETTINGS COMPONENTS

settings-section.tsx y settings-header.tsx:
- Títulos de sección: text-fontSize-sm (o text-base si es título grande)
- Subtítulos/hints: text-fontSize-xs

VALIDACIÓN:
1. pnpm --filter @hikai/webapp tsc --noEmit
2. grep -r "text-sm" apps/webapp/src → mínimas ocurrencias (solo text-2xl o similares intencionales)
3. grep -r "text-xs" apps/webapp/src → solo dónde text-fontSize-xs no aplica
4. Visual consistente en toda la app
```

### Validación F6

```
1. Todas las cards usan text-fontSize-*
2. Todos los forms usan text-fontSize-*
3. Auth components migrados
4. Settings components migrados
5. <10 ocurrencias de text-sm/text-xs residuales (y justificadas)
6. No hay errores de TS
```

---

## FASE 7: Cleanup y Documentación

**Objetivo**: Eliminar código obsoleto, documentar el sistema completo.

### Archivos a modificar

- `packages/ui/DESIGN-TOKENS.md` - Documentación completa
- `apps/webapp/webapp-plans/ui-density.md` - Marcar completado
- Posible: crear `packages/ui/MIGRATION-GUIDE.md`

### Prompt

```
FASE 7: Cleanup y Documentación

PARTE 1: VERIFICAR MIGRACIÓN COMPLETA

Ejecutar búsquedas para confirmar:

1. grep -r "text-sm" apps/webapp/src --include="*.tsx" | grep -v "text-fontSize"
   → Debe estar vacío o tener solo casos intencionales (text-2xl no cuenta)

2. grep -r "text-xs" apps/webapp/src --include="*.tsx" | grep -v "text-fontSize"
   → Debe estar vacío

3. grep -r "py-1\.5\|py-2" apps/webapp/src --include="*.tsx"
   → Verificar que nav items y botones no tienen padding vertical

PARTE 2: ACTUALIZAR DESIGN-TOKENS.md

Añadir sección completa de UI Density:

## UI Density System

### Typography Scale

| Token | Compact | Normal | Comfortable | Uso |
|-------|---------|--------|-------------|-----|
| `--fontSize-xs` | 10px | 12px | 13px | Hints, badges |
| `--fontSize-sm` | 11px | 13px | 14px | UI estándar |
| `--fontSize-base` | 13px | 15px | 16px | Body text |
| `--fontSize-lg` | 16px | 18px | 20px | Subtítulos |
| `--fontSize-title` | 20px | 24px | 28px | Headers |

### Component Heights

| Token | Valor | Uso |
|-------|-------|-----|
| `--height-nav-item` | 28px | Navigation items |
| `--height-btn` | 28px | Buttons default |
| `--height-btn-sm` | 24px | Buttons small |
| `--height-menu-item` | 28px | Menu items |

### Uso en Componentes

```tsx
// ✅ Correcto: usar clases de tokens
<span className="text-fontSize-sm">Label</span>
<div className="h-7 px-2">Nav item</div>

// ❌ Incorrecto: valores hardcodeados
<span className="text-sm">Label</span>
<div className="h-7 px-2 py-1.5">Nav item con padding vertical</div>
```

PARTE 3: CLEANUP DE CÓDIGO

Eliminar cualquier:
- Comentarios obsoletos
- Variables CSS no usadas
- Clases duplicadas

PARTE 4: ACTUALIZAR PROGRESO

Marcar todas las fases como completadas en ui-density.md

VALIDACIÓN FINAL:
1. pnpm --filter @hikai/webapp tsc --noEmit
2. pnpm --filter @hikai/webapp lint
3. pnpm --filter @hikai/ui tsc --noEmit
4. Visual review: la app se ve consistente con Linear
5. Density preference funciona (compact/normal/comfortable)
6. Documentación completa
```

### Validación F7

```
1. Migración 100% completa
2. Sin ocurrencias de text-sm/text-xs no intencionales
3. Nav items y botones sin padding vertical
4. DESIGN-TOKENS.md actualizado
5. No hay errores de TS ni Lint
6. Density preference funciona
7. Visual consistente con Linear
```

---

## Resumen de Cambios por Fase

| Fase | Archivos Nuevos | Archivos Modificados | Tokens Nuevos |
|------|-----------------|----------------------|---------------|
| F0 | 0 | 1 (doc) | 0 |
| F1 | 0 | 2 (density.css, globals.css) | 5 typography |
| F2 | 1 (spacing.css) | 2 (globals.css, tailwind) | 10+ spacing |
| F3 | 0 | 4 (button, input, badge, dropdown) | 0 |
| F4 | 0 | 3 (settings-nav-*) | 0 |
| F5 | 0 | 3 (menus/switchers) | 0 |
| F6 | 0 | 20+ (cards, forms, auth) | 0 |
| F7 | 0 | 2 (docs) | 0 |

---

## Checklist Final de Migración

### Typography (text-fontSize-*)
- [ ] Button - text-fontSize-sm
- [ ] Input - text-fontSize-sm
- [ ] Badge - text-fontSize-xs
- [ ] DropdownMenuItem - text-fontSize-sm
- [ ] settings-nav-item - text-fontSize-sm
- [ ] user-menu - text-fontSize-sm/xs
- [ ] org-switcher - text-fontSize-sm/xs
- [ ] product-switcher - text-fontSize-sm/xs
- [ ] product-card - text-fontSize-sm/xs
- [ ] org-card - text-fontSize-sm/xs
- [ ] create-organization-form - text-fontSize-sm/xs
- [ ] create-product-form - text-fontSize-sm/xs
- [ ] signin-form - text-fontSize-sm/xs
- [ ] settings-section - text-fontSize-sm/xs
- [ ] settings-header - text-fontSize-sm

### Spacing
- [ ] Button default - py-0 px-3.5 (altura NATURAL, sin h-*)
- [ ] Button sm - py-0 px-3 (altura NATURAL, sin h-*)
- [ ] Button icon - size-7 (28x28, único con tamaño fijo)
- [ ] settings-nav-item - h-7 (altura FIJA 28px)
- [ ] DropdownMenuItem - h-7 (altura FIJA 28px)
- [ ] Menu items - h-7 (altura FIJA 28px)

---

## Dependencias entre Fases

```
F0 ──► F1 ──► F2 ──► F3 ──┬──► F4
                          │
                          ├──► F5
                          │
                          └──► F6 ──► F7
```

- F0-F2 son prerequisitos (tokens deben existir)
- F3 migra packages/ui (base para otros)
- F4, F5, F6 pueden hacerse en paralelo
- F7 es la última (cleanup)

---

## Próximo Paso

Ejecutar F1 para implementar los tokens de tipografía.

---

## Decisiones Finales F0 (Confirmadas)

### Escala Tipográfica Confirmada

| Token | Compact | Normal | Comfortable | Uso |
|-------|---------|--------|-------------|-----|
| `--fontSize-xs` | 10px (0.625rem) | **12px** (0.75rem) | 13px (0.8125rem) | Hints, badges, captions |
| `--fontSize-sm` | 11px (0.6875rem) | **13px** (0.8125rem) | 14px (0.875rem) | **UI estándar**: labels, menus, botones |
| `--fontSize-base` | 13px (0.8125rem) | **15px** (0.9375rem) | 16px (1rem) | Body text, párrafos |
| `--fontSize-lg` | 16px (1rem) | **18px** (1.125rem) | 20px (1.25rem) | Subtítulos |
| `--fontSize-title` | 20px (1.25rem) | **24px** (1.5rem) | 28px (1.75rem) | Headers de página |

**Cambio vs estado actual**: `--fontSize-xs` pasa de 11px a **12px** (alineado con Linear `--font-size-mini`).

### Spacing Tokens Confirmados

#### Botones (webapp - alta densidad)

| Propiedad | Valor | Notas |
|-----------|-------|-------|
| padding-y | **0** | Sin padding vertical |
| padding-x | **14px** (0.875rem) | `--spacing-btn-x` |
| padding-x (futuro compact) | 8px (0.5rem) | `--spacing-btn-x-compact` - para website/acciones densas |
| altura | **natural** | Controlada por line-height, NO altura fija |

#### Nav Items / Menu Items (altura fija para consistencia en listas)

| Propiedad | Valor | Notas |
|-----------|-------|-------|
| height | **28px** (1.75rem) | `h-7` en Tailwind |
| padding-y | **0** | Sin padding vertical |
| padding-x | **8px** (0.5rem) | `px-2` en Tailwind |

### Tabla Antes vs Después

#### Button (packages/ui)

| Propiedad | Antes | Después |
|-----------|-------|---------|
| size default | `h-9 px-4 py-2` | `px-3.5 py-0` |
| size sm | `h-8 px-3` | `px-3 py-0 text-fontSize-xs` |
| size lg | `h-10 px-8` | `px-3.5 py-0` |
| size icon | `h-9 w-9` | `h-7 w-7` |

#### DropdownMenuItem (packages/ui)

| Propiedad | Antes | Después |
|-----------|-------|---------|
| padding | `px-2 py-1.5` | `px-2 h-7` (altura fija, sin py) |

#### settings-nav-item (webapp)

| Propiedad | Antes | Después |
|-----------|-------|---------|
| padding | `px-2 py-1.5` | `px-2 h-7` (altura fija, sin py) |

### Arquitectura de Archivos

```
packages/ui/src/tokens/
├── density.css      # Typography tokens (existente, ampliar)
└── spacing.css      # Spacing tokens (NUEVO)

packages/ui/src/styles/
└── globals.css      # Utility classes (ampliar)
```

### Principios de Implementación

1. **Botones**: `py-0` + `px-3.5` → altura natural por line-height
2. **Nav/Menu items**: `h-7` + `py-0` + `px-2` → altura fija 28px para consistencia en listas
3. **Tipografía**: `text-fontSize-sm` como estándar universal de UI
4. **Preparación futuro**: Token `--spacing-btn-x-compact` (8px) listo para website

---

## F5.1: Fix tailwind-merge (Post-F5)

### Problema Detectado

Después de completar F5, las clases `text-fontSize-*` no se aplicaban correctamente porque `tailwind-merge` las eliminaba al no reconocerlas como clases válidas de font-size.

### Root Cause

`tailwind-merge` en `cn()` elimina clases que no reconoce. Nuestras clases custom `text-fontSize-{xs,sm,base,lg,title}` no estaban registradas.

### Solución Implementada

Extender `tailwind-merge` en `packages/ui/src/lib/utils.ts`:

```ts
import { extendTailwindMerge } from "tailwind-merge"

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ 'text-fontSize': ['xs', 'sm', 'base', 'lg', 'title'] }]
    }
  }
})

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs))
}
```

### Documentación Actualizada

- `packages/ui/DESIGN-TOKENS.md` - Sección "Compatibilidad con tailwind-merge"
- `packages/ui/COMPONENT-GUIDELINES.md` - Sección "Utilidad cn() y tailwind-merge"
- `packages/ui/README.md` - Sección "Utilidades"

### Lección Aprendida

Al crear clases CSS custom que puedan colisionar o necesiten merge inteligente, siempre registrarlas en `extendTailwindMerge` en `utils.ts`.
