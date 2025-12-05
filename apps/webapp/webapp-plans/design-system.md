# Plan: Design System Refactor - Hikai

## Prompt genérico para implementar cada fase

- En apps/webapp/webapp-plans/design-system.md puedes ver el plan de implementación del design system de Hikai
- Vamos a proceder con la siguiente fase pendiente de ejecutar
- Analiza el documento y el plan y toma el prompt de esa fase como instrucción para implementarla

## Progreso

| Fase                                 | Estado        |
| ------------------------------------ | ------------- |
| F1: Token System Foundation          | ✅ Completado |
| F2: Missing Base Components (shadcn) | ✅ Completado |
| F3: Webapp Refactoring               | ⏳ Pendiente  |
| F4: Documentation                    | ⏳ Pendiente  |
| F5: Website Migration                | ⏳ Pendiente  |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

## Prompt para arrancar cada fase

- En apps/webapp/webapp-plans/design-system.md puedes ver el plan de implementación del design system de Hikai
- Vamos a proceder con la siguiente fase pendiente de ejecutar
- Analiza el documento y el plan y toma el prompt de esa fase como instrucción para implementarla
- Cuando tengas un plan para ello compártelo conmigo para validarlo
- No hagas asunciones, compárteme dudas y las debatimos
- Commit tras cada fase al comprobar que todo funciona como esperamos
- Máxima capacidad de ultrathink

---

## Resumen

Plan de implementación incremental para un design system coherente, escalable y centralizado en `packages/ui` (actualmente `@hikai/ui`). El enfoque es **tokens-first**: definir todos los tokens primero, luego añadir componentes y refactorizar incrementalmente.

---

## Decisiones Clave (Confirmadas)

| Decisión                | Elección                    | Justificación                                            |
| ----------------------- | --------------------------- | -------------------------------------------------------- |
| Compatibilidad de temas | **tweakcn.com prioritario** | Fácil intercambio de temas con variables 1:1             |
| Fuente de componentes   | **shadcn CLI**              | Usar `npx shadcn@latest add` para componentes mantenidos |
| Role badges             | **Variantes de Badge**      | Añadir owner/admin/member al Badge existente             |
| Estructura de tokens    | **Un único archivo CSS**    | `tokens.css` bien documentado con secciones              |

---

## Estado Inicial (Auditoría)

### Fortalezas Detectadas

- Monorepo bien estructurado (packages/ui, apps/webapp)
- 15 componentes base siguiendo patrones shadcn/ui con CVA + cn()
- Sistema semántico de colores con CSS variables (18 tokens)
- Soporte Light/Dark/High-contrast themes
- Sistema de iconos centralizado (230+ iconos de lucide-react)
- Todas las apps heredan del preset Tailwind compartido

### Problemas Críticos Encontrados

| Categoría     | Problema                                                             | Severidad |
| ------------- | -------------------------------------------------------------------- | --------- |
| Tokens        | Sin escala z-index (hardcoded z-10, z-50)                            | Alta      |
| Tokens        | Escala border radius incompleta (falta xs, xl, 2xl, 3xl)             | Media     |
| Tokens        | Sin escala tipográfica definida                                      | Media     |
| Tokens        | Redundancia de colores (secondary == muted, accent == secondary)     | Baja      |
| Componentes   | Falta Dialog/AlertDialog (impl custom en webapp)                     | Alta      |
| Componentes   | Falta componente Select (se usa HTML nativo)                         | Alta      |
| Componentes   | Faltan Checkbox, Radio, Switch                                       | Media     |
| Webapp        | Colores de role badge inconsistentes (3 implementaciones diferentes) | Alta      |
| Webapp        | Error alerts hardcodeados 6x en lugar de usar Alert                  | Media     |
| Webapp        | Modal custom en DeleteProductDialog                                  | Alta      |
| Accesibilidad | Bajo contraste en muted-foreground en dark mode                      | Media     |

---

## Fases de Implementación

```
F1: Tokens ──► F2: Componentes ──► F3: Refactor Webapp ──► F4: Docs ──► F5: Website
     │                │                     │                  │             │
     └────────────────┴─────────────────────┴──────────────────┴─────────────┘
                    Cada fase validable antes de avanzar
```

**Principio**: Cada fase debe ser testeable antes de la siguiente.

---

## Instrucciones Generales (aplicar en TODAS las fases)

### Actualizar Progreso

- Al completar cada fase, actualizar la tabla de **Progreso** al inicio de este documento
- Marcar la fase completada con ✅
- Si hay notas relevantes de la implementación, añadirlas brevemente

### Reglas del Repo

- Asegurar cumplimiento de reglas y principios en `CLAUDE.md`
- Seguir patrones de arquitectura establecidos
- Revisar que no hay errores de TS ni Lint en ningún fichero modificado

### Commits

- Un commit por fase completada
- **NO realizar commit** hasta que el usuario confirme que las pruebas funcionales son OK
- Formato: `feat(ui): [DS-F#] descripción breve`

### Testing

- Verificar que la webapp compila sin errores
- Verificar visualmente que los componentes se renderizan correctamente
- Probar en light y dark mode

---

## FASE 1: Token System Foundation ✅

**Objetivo**: Establecer un sistema de tokens completo y documentado como única fuente de verdad.

### Archivos creados/modificados

- `packages/ui/src/tokens/tokens.css` (creado)
- `packages/tailwind-config/index.js` (modificado)
- `packages/ui/src/styles/globals.css` (modificado)
- `packages/ui/src/styles/themes.css` (eliminado - consolidado en tokens.css)

### Prompt F1

```
Implementa el sistema de tokens del Design System de Hikai.

DECISIONES CLAVE:
- tweakcn.com compatibility es prioridad (nombres de variables deben coincidir exactamente)
- Tokens en UN ÚNICO archivo CSS bien documentado (no múltiples archivos)
- Usar shadcn CLI para componentes nuevos (Phase 2)
- Añadir variantes de rol al Badge (no crear RoleBadge separado)

PARTE 1: CREAR packages/ui/src/tokens/tokens.css

Un único archivo CSS con secciones documentadas:

/**
 * HIKAI DESIGN SYSTEM TOKENS
 * Compatible con tweakcn.com
 *
 * SECCIONES:
 * 1. Colors - Sistema semántico de colores
 * 2. Typography - Escala tipográfica
 * 3. Spacing - Escala de espaciado (referencia)
 * 4. Border Radius - Escala de redondeo
 * 5. Shadows - Sistema de elevación
 * 6. Z-Index - Jerarquía de capas
 * 7. Animations - Transiciones y timing
 */

Cada sección debe tener:
- Comentarios explicando el propósito
- Valores para :root (light), .dark y .high-contrast
- Ejemplos de uso

PARTE 2: EXTENDER packages/tailwind-config/index.js

Añadir:
- borderRadius: xs, sm, md, lg, xl, 2xl, 3xl (usando CSS vars)
- zIndex: base, dropdown, sticky, fixed, modal-backdrop, modal, popover, tooltip, notification
- boxShadow: sm, md, lg, xl (usando CSS vars)
- transitionDuration: fast, normal, slow, slower
- transitionTimingFunction: ease-in, ease-out, ease-in-out, bounce

PARTE 3: ACTUALIZAR packages/ui/src/styles/globals.css

- Importar tokens.css en lugar de tener variables inline
- Eliminar themes.css (consolidado en tokens.css)
- Mantener @tailwind directives y estilos base

PARTE 4: MEJORAR CONTRASTE WCAG AA

En dark mode, mejorar --muted-foreground de 64.9% a 70% para cumplir WCAG AA.

VALIDACIÓN F1:
1. pnpm --filter webapp dev debe compilar sin errores
2. La webapp debe verse igual en light y dark mode
3. Las variables CSS deben estar disponibles en DevTools
```

### Cambios Realizados en F1

1. **tokens.css creado** con 7 secciones documentadas:
   - Colors: Sistema semántico compatible con tweakcn.com
   - Typography: Documentación de escala
   - Spacing: Referencia de escala Tailwind
   - Border Radius: Variables --radius-xs a --radius-3xl
   - Shadows: --shadow-sm a --shadow-xl con variantes dark
   - Z-Index: --z-dropdown a --z-notification
   - Animations: --duration-_ y --ease-_

2. **tailwind-config extendido** con tokens semánticos

3. **globals.css simplificado** importando tokens.css

4. **Contraste mejorado**: muted-foreground en dark mode de 64.9% → 70%

---

## FASE 2: Missing Base Components (shadcn CLI)

**Objetivo**: Añadir componentes faltantes usando shadcn CLI para código mantenido y consistente.

### Archivos a crear

- `packages/ui/components.json` (configuración shadcn)
- `packages/ui/src/components/ui/dialog.tsx`
- `packages/ui/src/components/ui/alert-dialog.tsx`
- `packages/ui/src/components/ui/select.tsx`
- `packages/ui/src/components/ui/checkbox.tsx`
- `packages/ui/src/components/ui/switch.tsx`
- `packages/ui/src/components/ui/radio-group.tsx`
- `packages/ui/src/components/ui/tooltip.tsx`
- `packages/ui/src/components/ui/sonner.tsx`

### Prompt F2

```
Añade los componentes faltantes al Design System usando shadcn CLI.

PARTE 1: INICIALIZAR shadcn CLI

cd packages/ui
npx shadcn@latest init

Configurar:
- TypeScript: Yes
- Style: Default
- Base color: Neutral
- CSS variables: Yes
- tailwind.config location: ./tailwind.config.js
- Components location: ./src/components/ui
- Utils location: ./src/lib/utils (ya existe)

PARTE 2: AÑADIR COMPONENTES VIA CLI

Ejecutar en orden:

npx shadcn@latest add dialog
npx shadcn@latest add alert-dialog
npx shadcn@latest add select
npx shadcn@latest add checkbox
npx shadcn@latest add switch
npx shadcn@latest add radio-group
npx shadcn@latest add tooltip
npx shadcn@latest add sonner

PARTE 3: ACTUALIZAR EXPORTS

En packages/ui/src/components/ui/index.ts añadir:

export * from "./dialog";
export * from "./alert-dialog";
export * from "./select";
export * from "./checkbox";
export * from "./switch";
export * from "./radio-group";
export * from "./tooltip";
export * from "./sonner";

PARTE 4: VERIFICAR TIPOS

pnpm --filter @hikai/ui tsc --noEmit

PARTE 5: TEST DE IMPORTACIÓN

En webapp, verificar que se pueden importar:
import { Dialog, AlertDialog, Select } from "@hikai/ui";

VALIDACIÓN F2:
1. Todos los componentes se exportan correctamente
2. No hay errores de TypeScript
3. Los componentes se pueden importar desde webapp
4. Las dependencias @radix-ui/* están instaladas
```

---

## FASE 3: Webapp Refactoring

**Objetivo**: Refactorizar componentes de webapp para usar el design system consistentemente.

### Archivos a modificar

- `packages/ui/src/components/ui/badge.tsx`
- `apps/webapp/src/domains/products/components/delete-product-dialog.tsx`
- `apps/webapp/src/domains/products/components/product-card.tsx`
- `apps/webapp/src/domains/organizations/components/organization-list.tsx`
- `apps/webapp/src/domains/organizations/components/org-members.tsx`
- `apps/webapp/src/domains/products/components/product-members.tsx`
- `apps/webapp/src/domains/products/components/create-product-form.tsx`
- `apps/webapp/src/domains/organizations/components/create-organization-form.tsx`

### Prompt F3

```
Refactoriza la webapp para usar el design system consistentemente.

PARTE 1: AÑADIR VARIANTES DE ROL AL BADGE

En packages/ui/src/components/ui/badge.tsx, añadir variantes:

const badgeVariants = cva(
  "...",
  {
    variants: {
      variant: {
        default: "...",
        secondary: "...",
        destructive: "...",
        outline: "...",
        // NUEVAS VARIANTES
        owner: "bg-primary text-primary-foreground",
        admin: "bg-accent text-accent-foreground border border-accent-foreground/20",
        member: "bg-muted text-muted-foreground",
      },
    },
  }
);

PARTE 2: REEMPLAZAR MODAL CUSTOM

En delete-product-dialog.tsx:
- Reemplazar el modal custom con AlertDialog de @hikai/ui
- Usar AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, etc.
- Mantener la misma funcionalidad

PARTE 3: REEMPLAZAR SELECT NATIVOS

En org-members.tsx y product-members.tsx:
- Reemplazar <select> nativo con Select de @hikai/ui
- Usar SelectTrigger, SelectContent, SelectItem
- Mantener la misma funcionalidad

PARTE 4: ESTANDARIZAR ERROR ALERTS

Buscar y reemplazar en 6 archivos:

// ANTES
<div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">

// DESPUÉS
<Alert variant="destructive">
  <AlertDescription>{error}</AlertDescription>
</Alert>

PARTE 5: ACTUALIZAR ROLE BADGES

En product-card.tsx, organization-list.tsx, org-members.tsx, product-members.tsx:
- Reemplazar colores hardcodeados con Badge variant
- <Badge variant="owner">, <Badge variant="admin">, <Badge variant="member">

PARTE 6: ELIMINAR COLORES HARDCODEADOS

Buscar y eliminar:
- bg-blue-*, bg-gray-*, bg-green-*, bg-red-* → usar tokens semánticos
- z-50 → usar z-modal

VALIDACIÓN F3:
1. Todos los role badges usan las nuevas variantes
2. DeleteProductDialog usa AlertDialog
3. Selects usan Select component
4. No hay colores hardcodeados en webapp
5. La funcionalidad sigue siendo la misma
```

---

## FASE 4: Documentation

**Objetivo**: Documentar el design system para desarrolladores y asistentes AI.

### Archivos a crear

- `packages/ui/DESIGN-TOKENS.md`
- `packages/ui/COMPONENT-GUIDELINES.md`
- Actualizar `/CLAUDE.md`

### Prompt F4

```
Documenta el Design System de Hikai.

PARTE 1: CREAR packages/ui/DESIGN-TOKENS.md

Contenido:
- Introducción al sistema de tokens
- Tabla completa de tokens por categoría
- Compatibilidad con tweakcn.com (cómo importar temas)
- Ejemplos de uso en Tailwind
- Cómo extender/personalizar

Formato conciso, con tablas y ejemplos de código.

PARTE 2: CREAR packages/ui/COMPONENT-GUIDELINES.md

Contenido:
- Anatomía de un componente (cva, cn, forwardRef)
- Convenciones de naming para variantes
- Convenciones de naming para sizes
- Requisitos de accesibilidad
- Patrones de composición
- Anti-patrones a evitar

PARTE 3: ACTUALIZAR /CLAUDE.md

Añadir sección "Design System" con:
- Cómo usar tokens (no hardcodear colores)
- Cómo importar componentes
- Cuándo crear vs extender componentes
- Patrones prohibidos (inline styles, colores hardcodeados)
- Referencia a DESIGN-TOKENS.md y COMPONENT-GUIDELINES.md

VALIDACIÓN F4:
1. DESIGN-TOKENS.md es completo y legible
2. COMPONENT-GUIDELINES.md cubre patrones clave
3. CLAUDE.md tiene sección de design system
```

---

## FASE 5: Website Migration (Futuro)

**Objetivo**: Aplicar los mismos estándares del design system a apps/website.

**Estado**: Diferido hasta completar webapp.

---

## Archivos Críticos

| Archivo                                  | Rol                                           |
| ---------------------------------------- | --------------------------------------------- |
| `packages/ui/src/tokens/tokens.css`      | Tokens centralizados - única fuente de verdad |
| `packages/tailwind-config/index.js`      | Configuración Tailwind con tokens             |
| `packages/ui/src/styles/globals.css`     | Estilos base que importan tokens              |
| `packages/ui/src/components/ui/`         | Componentes del design system                 |
| `packages/ui/src/components/ui/index.ts` | Exports centralizados                         |

---

## Resumen de Fases

| Fase   | Scope       | Entregables                               | Validación                                |
| ------ | ----------- | ----------------------------------------- | ----------------------------------------- |
| **F1** | Tokens      | tokens.css, tailwind-config extendido     | CSS vars en DevTools, webapp compila      |
| **F2** | Componentes | Dialog, Select, Checkbox, Switch, etc.    | Imports funcionan, tipos OK               |
| **F3** | Refactor    | Badge variants, modals, selects, alerts   | No colores hardcodeados, funcionalidad OK |
| **F4** | Docs        | DESIGN-TOKENS.md, COMPONENT-GUIDELINES.md | Docs completos y referenciados            |
| **F5** | Website     | Aplicar DS a website                      | Todo consistente                          |

---

## Log de Cambios

### 2024-12-05 - F1 Completada

**Cambios realizados:**

1. Creado `packages/ui/src/tokens/tokens.css` con:
   - 7 secciones documentadas (Colors, Typography, Spacing, Radius, Shadows, Z-Index, Animations)
   - Soporte para :root, .dark y .high-contrast
   - Variables CSS para border radius (--radius-xs a --radius-3xl)
   - Variables CSS para shadows (--shadow-sm a --shadow-xl)
   - Variables CSS para z-index (--z-dropdown a --z-notification)
   - Variables CSS para animations (--duration-_, --ease-_)

2. Extendido `packages/tailwind-config/index.js` con:
   - borderRadius: xs, sm, md, lg, xl, 2xl, 3xl
   - zIndex: base, dropdown, sticky, fixed, modal-backdrop, modal, popover, tooltip, notification
   - boxShadow: sm, md, lg, xl
   - transitionDuration: fast, normal, slow, slower
   - transitionTimingFunction: ease-in, ease-out, ease-in-out, bounce

3. Simplificado `packages/ui/src/styles/globals.css`:
   - Ahora importa tokens.css en lugar de definir variables inline
   - Eliminado themes.css (consolidado en tokens.css)

4. Mejorado contraste WCAG AA:
   - --muted-foreground en dark mode: 64.9% → 70%

**Archivos modificados:**

- `packages/ui/src/tokens/tokens.css` (nuevo)
- `packages/tailwind-config/index.js`
- `packages/ui/src/styles/globals.css`
- `packages/ui/src/styles/themes.css` (eliminado)

### 2025-12-05 - F2 Completada

**Cambios realizados:**

1. Añadidos 8 componentes via shadcn CLI:
   - `dialog.tsx` - Modales genéricos
   - `alert-dialog.tsx` - Diálogos de confirmación
   - `select.tsx` - Dropdowns estilizados
   - `checkbox.tsx` - Checkboxes accesibles
   - `switch.tsx` - Toggles
   - `radio-group.tsx` - Grupos de radio buttons
   - `tooltip.tsx` - Tooltips
   - `sonner.tsx` - Toast notifications

2. Dependencias @radix-ui/* añadidas:
   - @radix-ui/react-alert-dialog
   - @radix-ui/react-checkbox
   - @radix-ui/react-radio-group
   - @radix-ui/react-select
   - @radix-ui/react-switch
   - @radix-ui/react-tooltip
   - sonner

3. Actualizado `packages/ui/src/components/ui/index.ts` con nuevos exports

**Archivos modificados:**

- `packages/ui/package.json`
- `packages/ui/src/components/ui/index.ts`
- `packages/ui/src/components/ui/*.tsx` (8 nuevos componentes)
- `pnpm-lock.yaml`
