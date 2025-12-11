# Guía de Componentes

Patrones y convenciones para componentes del design system de Hikai.

---

## Utilidad `cn()` y tailwind-merge

La función `cn()` combina `clsx` con `tailwind-merge` para manejar clases CSS de forma inteligente:

```tsx
import { cn } from "../../lib/utils";

// Combina clases y resuelve conflictos
cn("px-4 py-2", "px-6") // → "py-2 px-6" (px-6 gana)
cn("text-fontSize-sm", className) // → preserva text-fontSize-* correctamente
```

### Clases custom soportadas

`tailwind-merge` está extendido para reconocer nuestras clases custom de tipografía:

| Grupo | Clases reconocidas |
|-------|-------------------|
| `font-size` | `text-fontSize-{xs,sm,base,lg,title}` |

Esto significa que `cn("text-fontSize-sm", "text-fontSize-lg")` resuelve correctamente a `"text-fontSize-lg"`.

> ⚠️ **Importante**: Si añades nuevas clases custom que necesiten merging inteligente, debes registrarlas en `extendTailwindMerge` en `src/lib/utils.ts`.

---

## Anatomía de un Componente

Estructura estándar usando `cva`, `cn` y `forwardRef`:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

// 1. Definir variantes con CVA
const buttonVariants = cva(
  // Clases base (siempre aplicadas)
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-fontSize-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "min-h-btn min-w-btn px-btn py-0",
        sm: "min-h-btn min-w-btn px-3 py-0 rounded-md text-fontSize-sm",
        lg: "min-h-btn min-w-btn px-btn py-0 rounded-md",
        compact: "min-h-btn-compact min-w-btn-compact px-btn-compact py-0 rounded-md text-fontSize-sm",
        ultra: "min-h-btn-ultra min-w-btn-ultra px-btn-ultra py-0 rounded-md text-fontSize-sm gap-1.5",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// 2. Definir interface extendiendo VariantProps
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// 3. Usar forwardRef para refs
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// 4. Exportar componente y variantes
export { Button, buttonVariants };
```

---

## Convenciones de Naming

### Variantes de Estilo

| Nombre | Uso |
|--------|-----|
| `default` | Variante principal, acción primaria |
| `secondary` | Acciones secundarias |
| `destructive` | Acciones destructivas (eliminar, cancelar) |
| `outline` | Estilo con borde, menos énfasis |
| `ghost` | Sin fondo, solo hover |
| `link` | Estilo de enlace |

### Variantes de Rol (Badge)

| Nombre | Uso |
|--------|-----|
| `owner` | Propietario de recurso |
| `admin` | Administrador |
| `member` | Miembro regular |

### Tamaños

| Nombre | Uso |
|--------|-----|
| `ultra` | Ultra compacto (24px), barras densas |
| `compact` | Controles densos (28px) |
| `sm` | Compacto estándar (32px) |
| `default` | Tamaño estándar |
| `lg` | Destacado, CTAs principales |
| `icon` | Solo icono, cuadrado |

---

## Accesibilidad

### Focus Ring

Todos los elementos interactivos deben tener focus visible:

```tsx
// Patrón estándar
"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

// Con offset
"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

### Estados Deshabilitados

```tsx
"disabled:pointer-events-none disabled:opacity-50"
```

### Aria Labels

```tsx
// Botones de icono
<Button variant="ghost" size="icon" aria-label="Cerrar">
  <X />
</Button>

// Controles de formulario
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" aria-describedby="email-error" />
<p id="email-error" className="text-destructive">Error message</p>
```

---

## Patrones de Composición

### Compound Components

Para componentes complejos, usar patrón de composición:

```tsx
// Uso
<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
      <DialogDescription>Descripción</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### asChild Pattern

Permite renderizar como otro elemento:

```tsx
// Renderiza Button como <a>
<Button asChild>
  <a href="/page">Enlace</a>
</Button>

// Renderiza como Link de router
<Button asChild>
  <Link to="/page">Navegar</Link>
</Button>
```

---

## Anti-patrones

### ❌ Colores Hardcodeados

```tsx
// MAL
<div className="bg-blue-500 text-gray-600" />

// BIEN
<div className="bg-primary text-muted-foreground" />
```

### ❌ Z-Index Arbitrarios

```tsx
// MAL
<div className="z-50" />
<div className="z-[9999]" />

// BIEN
<div className="z-modal" />
<div className="z-tooltip" />
```

### ❌ Inline Styles

```tsx
// MAL
<div style={{ backgroundColor: '#3b82f6', padding: '16px' }} />

// BIEN
<div className="bg-primary p-4" />
```

### ❌ Duplicar Componentes

```tsx
// MAL: Crear RoleBadge separado
<RoleBadge role="admin" />

// BIEN: Usar variante del Badge existente
<Badge variant="admin">Admin</Badge>
```

### ❌ Estilos de Error Manuales

```tsx
// MAL
<div className="text-red-600 bg-red-50 p-3 rounded">Error</div>

// BIEN
<Alert variant="destructive">
  <AlertDescription>Error</AlertDescription>
</Alert>
```

---

## Componentes Disponibles

| Componente | Descripción |
|------------|-------------|
| `Button` | Botones con variantes y tamaños |
| `Badge` | Etiquetas, incluye variantes de rol |
| `Alert` | Mensajes de alerta/error |
| `Card` | Contenedores elevados |
| `Dialog` | Modales genéricos |
| `AlertDialog` | Diálogos de confirmación |
| `Select` | Dropdowns estilizados |
| `Input` | Campos de texto |
| `Textarea` | Campos de texto multilínea |
| `Label` | Etiquetas de formulario |
| `Checkbox` | Casillas de verificación |
| `Switch` | Toggles on/off |
| `RadioGroup` | Grupos de radio buttons |
| `Tabs` | Navegación por pestañas |
| `Accordion` | Contenido colapsable |
| `DropdownMenu` | Menús contextuales |
| `Sheet` | Paneles laterales |
| `Tooltip` | Tooltips |
| `Toaster` | Notificaciones toast (sonner) |
| `Avatar` | Imágenes de perfil |
| `Separator` | Líneas divisorias |
| `NavigationMenu` | Navegación principal |
| `Form` | Integración con react-hook-form |

---

## Añadir Nuevo Componente

1. **Crear archivo** en `packages/ui/src/components/ui/nuevo.tsx`
2. **Seguir anatomía** estándar (cva, cn, forwardRef)
3. **Exportar** en `packages/ui/src/components/ui/index.ts`
4. **Usar tokens** semánticos (nunca colores hardcodeados)

```bash
# Preferir shadcn CLI cuando esté disponible
npx shadcn@latest add [componente]
```
