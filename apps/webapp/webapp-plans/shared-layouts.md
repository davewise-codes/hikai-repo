## Shared layouts

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

## Prompt para arrancar cada fase

- En apps/webapp/webapp-plans/shared-layouts.md puedes ver el plan de implementación de Shared Layouts
- Vamos a proceder con la fase siguiente pendiente de ejecutar
- Analiza el documento y el plan y toma el prompt de esa fase como instrucción para implementarla
- Cuando tengas un plan para ello compártelo conmigo para validarlo
- No hagas asunciones, compárteme dudas y las debatimos
- Máxima capacidad de ultrathink

---

## Progreso

| Fase                              | Estado       |
| --------------------------------- | ------------ |
| F0: Utilities + Page Layout Base  | ✅ Completado |
| F1: SettingsSection + SettingsRow | ✅ Completado |
| F1b: Unificar detail pages con tabs | ✅ Completado |
| F2: MembersTable                  | ✅ Completado |
| F3: EntityForm                    | ✅ Completado |
| F4: ConfirmDeleteDialog           | ⏳ Pendiente |
| F5: Danger Actions (estilo Linear)| ⏳ Pendiente |
| F6: Migración y Cleanup           | ⏳ Pendiente |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Referencia Visual: Estilo Linear

Nuestra referencia de diseño es Linear. Características clave:

| Característica | Estilo Linear | Nuestro actual |
|----------------|---------------|----------------|
| Layout | Centrado, max-w-2xl | Container full-width |
| Secciones | Título simple + filas | Cards con bordes |
| Settings row | Label izq, control der | Vertical con labels arriba |
| Inputs | Discretos, inline | Con bordes visibles |
| Members list | Tabla con columnas | Cards individuales por miembro |
| Danger zone | Link rojo simple | Card con borde destructivo |
| Separadores | Líneas sutiles entre grupos | Cards separados |

---

## Datos Disponibles en Backend

**organizationMembers / productMembers tienen:**
- `joinedAt` (number, timestamp) ✅
- `lastAccessAt` (optional number, timestamp) ✅
- Las queries ya devuelven estos campos

---

## Análisis del Estado Actual

### Componentes con Duplicación Detectada

Se ha realizado un análisis exhaustivo de la webapp identificando patrones de duplicación significativos:

| Componentes | Líneas Totales | Similitud | Impacto |
|-------------|----------------|-----------|---------|
| org-members.tsx + product-members.tsx | 295 + 283 = 578 | ~90% | CRÍTICO |
| create-organization-form.tsx + create-product-form.tsx | 295 + 219 = 514 | ~85% | ALTO |
| org-settings route + product-settings route | 348 + 290 = 638 | ~88% | ALTO |
| delete-organization-dialog.tsx + delete-product-dialog.tsx | 141 + 132 = 273 | ~82% | MEDIO |
| org-detail route + product-detail route | 177 + 182 = 359 | ~85% | MEDIO |

**Total código potencialmente duplicado:** ~2,362 líneas
**Reducción estimada con componentes compartidos:** 50-60%

### Patrones de Duplicación Identificados

#### 1. Gestión de Miembros (org-members.tsx vs product-members.tsx)

**Código duplicado específico:**
- `getInitials()` function (idéntica en ambos)
- Layout de member row (idéntica)
- Role select (idéntica)
- Error Alert (idéntica)
- Loading state (idéntica)

**Diferencias clave:**
- Org: invita por email (Input), tiene role "owner"
- Product: selecciona de miembros org (Select), solo "admin" | "member"

#### 2. Formularios de Creación

**Código duplicado específico:**
- `generateSlug()` function (idéntica)
- `handleNameChange()` logic (idéntica)
- Form state pattern (idéntica)

**Diferencias clave:**
- Org: tiene selector de plan
- Product: tiene verificación de límites

#### 3. Páginas de Settings

**Estructura idéntica:**
- Header con back button
- Grid de campos editables
- Info readonly
- Danger zone

**Diferencias clave:**
- Org: transfer ownership + delete
- Product: solo delete

---

## Decisión de Arquitectura

### ¿Por qué `apps/webapp/src/domains/shared` y NO `packages/ui`?

**Razones para webapp/domains/shared:**

1. **Dependencias de dominio**: Los componentes usan hooks de webapp (useTranslation, stores)
2. **Lógica de negocio**: Contienen lógica específica de Hikai (roles, membership)
3. **i18n**: Dependen de traducciones específicas de la app
4. **Convex types**: Usan tipos de Id<"organizations">, etc.

### Estructura Propuesta

```
apps/webapp/src/domains/shared/
├── components/
│   ├── page-layout/             # Layout centrado estilo Linear
│   │   ├── centered-page.tsx    # max-w-2xl mx-auto
│   │   ├── page-header.tsx
│   │   └── index.ts
│   ├── settings-section/        # Grupo de settings estilo Linear
│   │   ├── settings-section.tsx # Contenedor de sección
│   │   ├── settings-row.tsx     # Fila label + control
│   │   └── index.ts
│   ├── members-table/           # Lista de miembros tipo tabla
│   │   ├── members-table.tsx
│   │   ├── member-row.tsx
│   │   └── index.ts
│   ├── entity-form/             # Formularios de creación
│   │   ├── entity-form-card.tsx
│   │   ├── entity-fields.tsx
│   │   └── index.ts
│   ├── confirm-delete-dialog/
│   │   └── confirm-delete-dialog.tsx
│   └── index.ts
├── utils/
│   ├── get-initials.ts
│   └── slug-utils.ts
└── index.ts
```

---

## Instrucciones Generales (aplicar en TODAS las fases)

### Actualizar Progreso

- Al completar cada fase, actualizar la tabla de **Progreso** al inicio
- Marcar la fase completada con ✅

### Reglas del Repo

- Asegurar cumplimiento de reglas y principios en `CLAUDE.md`
- Seguir patrones de arquitectura establecidos
- Revisar que no hay errores de TS ni Lint en ningún fichero modificado
- Los componentes compartidos NO exportan al exterior de webapp

### Commits

- Un commit por fase completada
- **NO realizar commit** hasta que el usuario confirme que las pruebas funcionales son OK
- Formato: `feat(webapp): [F#-SHARED] descripción breve`

### i18n

- Los componentes compartidos reciben traducciones como props cuando sea necesario
- NO crear nuevo namespace de traducciones para shared

### Compatibilidad con Font Size System

- Todos los componentes deben usar `text-fontSize-*` cuando sea apropiado
- Verificar que responden correctamente al cambio de font size

---

## FASE 0: Utilities + Page Layout Base

**Objetivo**: Crear estructura base, utilidades compartidas, y layout centrado estilo Linear.

### Archivos a crear

- `apps/webapp/src/domains/shared/utils/get-initials.ts`
- `apps/webapp/src/domains/shared/utils/slug-utils.ts`
- `apps/webapp/src/domains/shared/utils/index.ts`
- `apps/webapp/src/domains/shared/components/page-layout/centered-page.tsx`
- `apps/webapp/src/domains/shared/components/page-layout/page-header.tsx`
- `apps/webapp/src/domains/shared/components/page-layout/index.ts`
- `apps/webapp/src/domains/shared/components/index.ts`
- `apps/webapp/src/domains/shared/index.ts`

### Prompt

```
Crea la estructura base del dominio shared con utilidades y layout centrado estilo Linear.

PARTE 1: CREAR ESTRUCTURA DE CARPETAS
Crear las siguientes carpetas:
- apps/webapp/src/domains/shared/
- apps/webapp/src/domains/shared/components/
- apps/webapp/src/domains/shared/components/page-layout/
- apps/webapp/src/domains/shared/utils/

PARTE 2: CREAR get-initials.ts
ARCHIVO: apps/webapp/src/domains/shared/utils/get-initials.ts

/**
 * Genera iniciales a partir de un nombre o email.
 * Usado para mostrar en avatares cuando no hay imagen.
 *
 * @example
 * getInitials("John Doe") // "JD"
 * getInitials(null, "john@example.com") // "JO"
 * getInitials(null, null) // "??"
 */
export function getInitials(
  name?: string | null,
  email?: string | null
): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.slice(0, 2).toUpperCase() || "??";
}

PARTE 3: CREAR slug-utils.ts
ARCHIVO: apps/webapp/src/domains/shared/utils/slug-utils.ts

/**
 * Genera un slug URL-friendly a partir de un nombre.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 50);
}

/**
 * Helper para manejar el auto-update del slug cuando cambia el nombre.
 */
export function shouldAutoUpdateSlug(
  currentSlug: string,
  previousName: string
): boolean {
  return currentSlug === generateSlug(previousName) || currentSlug === "";
}

PARTE 4: CREAR centered-page.tsx
ARCHIVO: apps/webapp/src/domains/shared/components/page-layout/centered-page.tsx

Layout centrado estilo Linear (max-w-2xl mx-auto).

Props:
interface CenteredPageProps {
  children: ReactNode;
  className?: string;
}

Estructura:
<div className={cn("mx-auto max-w-2xl px-4 py-8 space-y-8", className)}>
  {children}
</div>

PARTE 5: CREAR page-header.tsx
ARCHIVO: apps/webapp/src/domains/shared/components/page-layout/page-header.tsx

Header simple estilo Linear.

Props:
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backButton?: {
    onClick: () => void;
    label?: string;
  };
  actions?: ReactNode;
}

Estructura:
<div className="space-y-1">
  {backButton && (
    <Button variant="ghost" size="sm" onClick={backButton.onClick} className="mb-2">
      <ArrowLeft className="w-4 h-4 mr-2" />
      {backButton.label}
    </Button>
  )}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
    </div>
    {actions}
  </div>
</div>

PARTE 6: CREAR ÍNDICES

ARCHIVO: apps/webapp/src/domains/shared/utils/index.ts
export { getInitials } from "./get-initials";
export { generateSlug, shouldAutoUpdateSlug } from "./slug-utils";

ARCHIVO: apps/webapp/src/domains/shared/components/page-layout/index.ts
export { CenteredPage } from "./centered-page";
export { PageHeader } from "./page-header";

ARCHIVO: apps/webapp/src/domains/shared/components/index.ts
export * from "./page-layout";

ARCHIVO: apps/webapp/src/domains/shared/index.ts
export * from "./utils";
export * from "./components";

PARTE 7: ACTUALIZAR IMPORTS EN COMPONENTES EXISTENTES

ARCHIVO: apps/webapp/src/domains/organizations/components/org-members.tsx
- Eliminar función getInitials inline
- Añadir import: import { getInitials } from "@/domains/shared";

ARCHIVO: apps/webapp/src/domains/products/components/product-members.tsx
- Eliminar función getInitials inline
- Añadir import: import { getInitials } from "@/domains/shared";

ARCHIVO: apps/webapp/src/domains/organizations/components/create-organization-form.tsx
- Eliminar función generateSlug inline
- Añadir import: import { generateSlug, shouldAutoUpdateSlug } from "@/domains/shared";

ARCHIVO: apps/webapp/src/domains/products/components/create-product-form.tsx
- Eliminar función generateSlug inline
- Añadir import: import { generateSlug, shouldAutoUpdateSlug } from "@/domains/shared";

VALIDACIÓN:
1. Ejecutar pnpm --filter @hikai/webapp tsc --noEmit
2. Verificar que los formularios de creación siguen funcionando
3. Verificar que los avatares en listas de miembros muestran iniciales correctamente
4. No debe haber código duplicado de getInitials o generateSlug
```

### Validación F0

```
1. Carpeta domains/shared existe con estructura correcta
2. getInitials y generateSlug exportados desde @/domains/shared
3. CenteredPage y PageHeader creados
4. 4 archivos actualizados usando las nuevas utilidades
5. No hay funciones duplicadas en los componentes originales
6. No hay errores de TS
7. Funcionalidad existente no afectada
```

---

## FASE 1: SettingsSection + SettingsRow

**Objetivo**: Crear componentes para páginas de settings estilo Linear.

### Archivos a crear

- `apps/webapp/src/domains/shared/components/settings-section/settings-section.tsx`
- `apps/webapp/src/domains/shared/components/settings-section/settings-row.tsx`
- `apps/webapp/src/domains/shared/components/settings-section/index.ts`

### Prompt

```
Crea componentes SettingsSection y SettingsRow con estilo Linear.

ANÁLISIS PREVIO:
Revisar los archivos:
- apps/webapp/src/routes/organizations/$slug_.settings.tsx
- apps/webapp/src/routes/products/$slug_.settings.tsx

PARTE 1: CREAR settings-section.tsx
ARCHIVO: apps/webapp/src/domains/shared/components/settings-section/settings-section.tsx

Contenedor de grupo de settings estilo Linear.

Props:
interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

Estructura:
<div className={cn("space-y-1", className)}>
  {title && (
    <h2 className="text-sm font-medium text-muted-foreground px-1">{title}</h2>
  )}
  {description && (
    <p className="text-sm text-muted-foreground px-1 mb-2">{description}</p>
  )}
  <div className="divide-y divide-border rounded-lg border bg-card">
    {children}
  </div>
</div>

PARTE 2: CREAR settings-row.tsx
ARCHIVO: apps/webapp/src/domains/shared/components/settings-section/settings-row.tsx

Fila individual de setting (label izquierda, control derecha).

Props:
interface SettingsRowProps {
  label: string;
  description?: string;
  control: ReactNode;
  className?: string;
}

// Variante para contenido complejo (sin control a la derecha)
interface SettingsRowContentProps {
  children: ReactNode;
  className?: string;
}

Estructura SettingsRow:
<div className={cn("flex items-center justify-between px-4 py-3", className)}>
  <div className="space-y-0.5">
    <div className="text-fontSize-sm font-medium">{label}</div>
    {description && (
      <div className="text-fontSize-xs text-muted-foreground">{description}</div>
    )}
  </div>
  <div className="flex items-center">{control}</div>
</div>

Estructura SettingsRowContent:
<div className={cn("px-4 py-3", className)}>
  {children}
</div>

PARTE 3: CREAR index.ts
ARCHIVO: apps/webapp/src/domains/shared/components/settings-section/index.ts

export { SettingsSection } from "./settings-section";
export { SettingsRow, SettingsRowContent } from "./settings-row";

PARTE 4: ACTUALIZAR components/index.ts
export * from "./page-layout";
export * from "./settings-section";

PARTE 5: REFACTORIZAR product-settings route
ARCHIVO: apps/webapp/src/routes/products/$slug_.settings.tsx

Usar CenteredPage, PageHeader, SettingsSection, SettingsRow.

import {
  CenteredPage,
  PageHeader,
  SettingsSection,
  SettingsRow,
  SettingsRowContent,
} from "@/domains/shared";

function ProductSettingsPage() {
  // ... state y hooks existentes ...

  return (
    <AppShell>
      <CenteredPage>
        <PageHeader
          title={t("settings.title")}
          subtitle={product.name}
          backButton={{
            onClick: () => navigate({ to: "/products/$slug", params: { slug } }),
          }}
        />

        {/* General Settings */}
        <SettingsSection title={t("settings.general.title")}>
          <SettingsRow
            label={t("settings.name")}
            control={
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
                className="w-64"
              />
            }
          />
          <SettingsRow
            label={t("settings.slug")}
            description={t("settings.slugReadonly")}
            control={
              <Input value={product.slug} disabled className="w-64 font-mono bg-muted" />
            }
          />
          <SettingsRowContent>
            <div className="space-y-2">
              <label className="text-fontSize-sm font-medium">
                {t("settings.description")}
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
                rows={3}
              />
            </div>
          </SettingsRowContent>
        </SettingsSection>

        {/* Info Section */}
        <SettingsSection title={t("settings.info")}>
          <SettingsRow
            label={t("settings.members")}
            control={<span className="text-fontSize-sm">{product.memberCount}</span>}
          />
          <SettingsRow
            label={t("settings.createdAt")}
            control={
              <span className="text-fontSize-sm">
                {new Date(product.createdAt).toLocaleDateString()}
              </span>
            }
          />
          <SettingsRow
            label={t("settings.yourRole")}
            control={
              <Badge variant={product.userRole}>{t(`roles.${product.userRole}`)}</Badge>
            }
          />
        </SettingsSection>

        {/* Save Button */}
        {hasChanges && (
          <div className="flex justify-end gap-2">
            {saveError && <p className="text-fontSize-sm text-destructive">{saveError}</p>}
            {saveSuccess && <p className="text-fontSize-sm text-success">{t("settings.saveSuccess")}</p>}
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? t("settings.saving") : t("settings.save")}
            </Button>
          </div>
        )}

        {/* Danger Zone */}
        <SettingsSection title={t("settings.dangerZone.title")}>
          <SettingsRow
            label={t("delete.title")}
            description={t("delete.warning")}
            control={
              <DeleteProductDialog productId={product._id} productName={product.name} onDeleted={handleDelete}>
                <Button variant="destructive" size="sm">
                  {t("delete.title")}
                </Button>
              </DeleteProductDialog>
            }
          />
        </SettingsSection>
      </CenteredPage>
    </AppShell>
  );
}

PARTE 6: REFACTORIZAR org-settings route
Similar refactorización pero con:
- Más SettingsRows para transfer ownership
- Condicional para isPersonal

PARTE 7: REFACTORIZAR settings-page.tsx (tema/font-size/idioma)
ARCHIVO: apps/webapp/src/domains/core/components/settings-page.tsx

Usar los nuevos componentes para la página de settings del usuario.

VALIDACIÓN:
1. Ejecutar pnpm --filter @hikai/webapp tsc --noEmit
2. Verificar product settings funciona correctamente
3. Verificar org settings funciona correctamente
4. Verificar user settings funciona correctamente
5. UI sigue estilo Linear (centrado, compacto)
6. Font size responde a cambios de density
```

### Validación F1

```
1. SettingsSection y SettingsRow creados
2. product-settings usa nuevos componentes
3. org-settings usa nuevos componentes
4. settings-page.tsx usa nuevos componentes
5. UI estilo Linear (centrado max-w-2xl, filas label-control)
6. No hay errores de TS
7. Font size responsivo
```

---

## FASE 2: MembersTable

**Objetivo**: Crear lista de miembros estilo tabla como Linear.

### Archivos a crear

- `apps/webapp/src/domains/shared/components/members-table/members-table.tsx`
- `apps/webapp/src/domains/shared/components/members-table/member-row.tsx`
- `apps/webapp/src/domains/shared/components/members-table/index.ts`

### Prompt

```
Crea componente MembersTable con estilo tabla como Linear.

ANÁLISIS PREVIO:
Revisar los archivos:
- apps/webapp/src/domains/organizations/components/org-members.tsx
- apps/webapp/src/domains/products/components/product-members.tsx

Datos disponibles en backend:
- joinedAt (timestamp)
- lastAccessAt (optional timestamp)

PARTE 1: CREAR member-row.tsx
ARCHIVO: apps/webapp/src/domains/shared/components/members-table/member-row.tsx

Fila de miembro estilo tabla.

Props:
interface MemberRowProps {
  member: {
    userId: string;
    role: string;
    joinedAt: number;
    lastAccessAt?: number;
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } | null;
  };
  canManage: boolean;
  isProtected?: boolean;
  roleOptions: Array<{ value: string; label: string }>;
  onRoleChange: (userId: string, newRole: string) => void;
  onRemove: (userId: string) => void;
  highlightIcon?: ReactNode;
  translations: {
    roleLabel: string;
    removeLabel: string;
    neverSeen: string;
  };
}

Estructura (grid con columnas):
<div className="grid grid-cols-[1fr,auto,auto,auto,auto,auto] gap-4 px-4 py-3 items-center hover:bg-muted/50 border-b last:border-b-0">
  {/* Name + Avatar */}
  <div className="flex items-center gap-3">
    <Avatar className="h-8 w-8">
      <AvatarImage src={member.user?.image || undefined} />
      <AvatarFallback>{getInitials(member.user?.name, member.user?.email)}</AvatarFallback>
    </Avatar>
    <div className="min-w-0">
      <div className="text-fontSize-sm font-medium truncate flex items-center gap-2">
        {member.user?.name || member.user?.email || "Unknown"}
        {highlightIcon}
      </div>
    </div>
  </div>

  {/* Email */}
  <div className="text-fontSize-xs text-muted-foreground">{member.user?.email}</div>

  {/* Role */}
  <div>
    {canManage && !isProtected ? (
      <Select value={member.role} onValueChange={(v) => onRoleChange(member.userId, v)}>
        <SelectTrigger className="w-24 h-7 text-fontSize-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roleOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <Badge variant={member.role}>{roleOptions.find(o => o.value === member.role)?.label}</Badge>
    )}
  </div>

  {/* Joined */}
  <div className="text-fontSize-xs text-muted-foreground">
    {formatRelativeDate(member.joinedAt)}
  </div>

  {/* Last seen */}
  <div className="text-fontSize-xs text-muted-foreground">
    {member.lastAccessAt ? formatRelativeDate(member.lastAccessAt) : translations.neverSeen}
  </div>

  {/* Actions */}
  <div>
    {canManage && !isProtected && (
      <Button variant="ghost" size="sm" onClick={() => onRemove(member.userId)}>
        <Trash2 className="w-4 h-4" />
      </Button>
    )}
  </div>
</div>

PARTE 2: CREAR members-table.tsx
ARCHIVO: apps/webapp/src/domains/shared/components/members-table/members-table.tsx

Props:
interface MembersTableProps<TRole extends string> {
  members: Array<MemberData> | undefined;
  canManage: boolean;

  // Añadir miembro
  addMemberMode: "email" | "select";
  onAddMember: (data: { email?: string; userId?: string; role: TRole }) => Promise<void>;
  availableMembers?: Array<{ userId: string; name?: string; email?: string }>;

  // Roles
  roleOptions: Array<{ value: TRole; label: string }>;
  defaultRole: TRole;
  protectedRoles?: TRole[];

  // Callbacks
  onRoleChange: (userId: string, newRole: TRole) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;

  // Highlight
  highlightRoles?: TRole[];
  highlightIcon?: ReactNode;

  // Translations
  translations: {
    title: string;
    count: string;
    addButton: string;
    searchPlaceholder: string;
    emailPlaceholder?: string;
    selectPlaceholder?: string;
    columnName: string;
    columnEmail: string;
    columnRole: string;
    columnJoined: string;
    columnLastSeen: string;
    neverSeen: string;
    empty: string;
    loading: string;
    addMemberLabel: string;
    roleLabel: string;
    cancelLabel: string;
    confirmLabel: string;
    noAvailable?: string;
  };

  // Error
  error: string | null;
  onErrorClear: () => void;
}

Estructura:
<div className="space-y-4">
  {/* Header */}
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-fontSize-base font-semibold">{translations.title}</h3>
      <p className="text-fontSize-xs text-muted-foreground">{translations.count}</p>
    </div>
    {canManage && (
      <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
        <UserPlus className="w-4 h-4 mr-2" />
        {translations.addButton}
      </Button>
    )}
  </div>

  {/* Add form (expandible) */}
  {isAdding && (
    <AddMemberForm ... />
  )}

  {/* Error */}
  {error && (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )}

  {/* Search */}
  <Input
    placeholder={translations.searchPlaceholder}
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="max-w-xs"
  />

  {/* Table */}
  <div className="rounded-lg border bg-card">
    {/* Table header */}
    <div className="grid grid-cols-[1fr,auto,auto,auto,auto,auto] gap-4 px-4 py-2 text-fontSize-xs text-muted-foreground border-b bg-muted/50">
      <div>{translations.columnName}</div>
      <div>{translations.columnEmail}</div>
      <div>{translations.columnRole}</div>
      <div>{translations.columnJoined}</div>
      <div>{translations.columnLastSeen}</div>
      <div></div>
    </div>

    {/* Rows */}
    {filteredMembers.map(member => (
      <MemberRow key={member._id} ... />
    ))}

    {/* Empty state */}
    {filteredMembers.length === 0 && (
      <div className="px-4 py-8 text-center text-muted-foreground">
        {translations.empty}
      </div>
    )}
  </div>
</div>

PARTE 3: CREAR index.ts
export { MembersTable } from "./members-table";

PARTE 4: ACTUALIZAR components/index.ts
export * from "./members-table";

PARTE 5: CREAR utils de fecha
ARCHIVO: apps/webapp/src/domains/shared/utils/date-utils.ts

export function formatRelativeDate(timestamp: number): string {
  // Usar Intl.RelativeTimeFormat o una implementación simple
  // "2 days ago", "Just now", "3 months ago", etc.
}

PARTE 6: REFACTORIZAR org-members.tsx
ARCHIVO: apps/webapp/src/domains/organizations/components/org-members.tsx

Reemplazar implementación por MembersTable con addMemberMode="email".

PARTE 7: REFACTORIZAR product-members.tsx
ARCHIVO: apps/webapp/src/domains/products/components/product-members.tsx

Reemplazar implementación por MembersTable con addMemberMode="select".

VALIDACIÓN:
1. Ejecutar pnpm --filter @hikai/webapp tsc --noEmit
2. Verificar org-members funciona (email mode)
3. Verificar product-members funciona (select mode)
4. Tabla muestra columnas: Name, Email, Role, Joined, Last seen
5. Búsqueda funciona
6. Roles editables (si canManage)
7. UI estilo Linear (tabla, no cards)
```

### Validación F2

```
1. MembersTable creado con estilo tabla
2. org-members usa MembersTable (~65% menos código)
3. product-members usa MembersTable (~65% menos código)
4. Columnas: Name, Email, Role, Joined, Last seen
5. Búsqueda funciona
6. Ambos modos (email/select) funcionan
7. No hay errores de TS
8. Font size responsivo
```

---

## FASE 3: EntityForm

**Objetivo**: Crear formularios de creación de org/product.

### Archivos a crear

- `apps/webapp/src/domains/shared/components/entity-form/entity-form-card.tsx`
- `apps/webapp/src/domains/shared/components/entity-form/entity-fields.tsx`
- `apps/webapp/src/domains/shared/components/entity-form/index.ts`

### Prompt

```
Crea componentes para formularios de creación de entidades.

ANÁLISIS PREVIO:
Revisar los archivos:
- apps/webapp/src/domains/organizations/components/create-organization-form.tsx
- apps/webapp/src/domains/products/components/create-product-form.tsx

PARTE 1: CREAR entity-form-card.tsx
Card wrapper que maneja toggle open/closed.

Props:
interface EntityFormCardProps {
  isOpen: boolean;
  onToggle: () => void;
  collapsedContent: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

PARTE 2: CREAR entity-fields.tsx
Campos name, slug (auto), description.

Props:
interface EntityFieldsProps {
  name: string;
  slug: string;
  description: string;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  labels: {
    name: string;
    namePlaceholder: string;
    slug: string;
    slugPlaceholder: string;
    slugHint: string;
    description: string;
    descriptionPlaceholder: string;
  };
  isLoading?: boolean;
  idPrefix: string;
}

Usa generateSlug y shouldAutoUpdateSlug internamente.

PARTE 3: CREAR index.ts
export { EntityFormCard } from "./entity-form-card";
export { EntityFields } from "./entity-fields";

PARTE 4: REFACTORIZAR create-product-form.tsx
Usar EntityFormCard y EntityFields.

PARTE 5: REFACTORIZAR create-organization-form.tsx
Usar EntityFormCard y EntityFields (mantener plan selector inline).

VALIDACIÓN:
1. Ejecutar pnpm --filter @hikai/webapp tsc --noEmit
2. Crear producto funciona
3. Crear organización funciona
4. Auto-slug funciona
5. UI consistente
```

### Validación F3

```
1. EntityFormCard y EntityFields creados
2. create-product-form usa componentes compartidos (~40% menos)
3. create-organization-form usa componentes compartidos (~30% menos)
4. Auto-slug funciona
5. No hay errores de TS
```

---

## FASE 4: ConfirmDeleteDialog

**Objetivo**: Unificar diálogos de eliminación.

### Archivos a crear

- `apps/webapp/src/domains/shared/components/confirm-delete-dialog/confirm-delete-dialog.tsx`
- `apps/webapp/src/domains/shared/components/confirm-delete-dialog/index.ts`

### Prompt

```
Crea componente unificado de diálogo de eliminación.

ANÁLISIS PREVIO:
Revisar:
- apps/webapp/src/domains/organizations/components/delete-organization-dialog.tsx
- apps/webapp/src/domains/products/components/delete-product-dialog.tsx

DECISIÓN: Usar AlertDialog con trigger opcional.
- Si children: trigger interno
- Si open/onOpenChange: control externo

Props:
interface ConfirmDeleteDialogProps {
  entityName: string;
  title: string;
  description: string;
  warningMessage: string;
  consequencesMessage?: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onSuccess?: () => void;
  confirmButtonLabel: string;
  confirmingLabel: string;
  cancelLabel: string;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  errorTransform?: (error: Error) => string;
}

PARTE 1: CREAR confirm-delete-dialog.tsx
PARTE 2: CREAR index.ts
PARTE 3: REFACTORIZAR delete-product-dialog.tsx
PARTE 4: REFACTORIZAR delete-organization-dialog.tsx

VALIDACIÓN:
1. pnpm --filter @hikai/webapp tsc --noEmit
2. Eliminar producto funciona
3. Eliminar organización funciona
4. Error handling funciona
5. Ambos modos (trigger/control externo) funcionan
```

### Validación F4

```
1. ConfirmDeleteDialog creado
2. delete-product-dialog usa componente compartido (~70% menos)
3. delete-organization-dialog usa componente compartido (~65% menos)
4. Confirmación por nombre funciona
5. Error translation funciona
6. No hay errores de TS
```

---

## FASE 5: Danger Actions (estilo Linear)

**Objetivo**: Acciones peligrosas minimalistas como Linear.

### Prompt

```
Aplicar estilo Linear minimalista a las danger zones.

En lugar de Card con borde destructivo, usar SettingsSection normal con SettingsRow
y Button variant="link" o variant="ghost-destructive".

Estilo Linear:
<SettingsSection title="Danger zone">
  <SettingsRow
    label="Delete this product"
    description="Once deleted, it cannot be recovered"
    control={
      <Button variant="ghost-destructive" size="sm">
        Delete
      </Button>
    }
  />
</SettingsSection>

PARTE 1: ACTUALIZAR product-settings
Reemplazar DangerZoneCard por SettingsSection simple.

PARTE 2: ACTUALIZAR org-settings
Similar, con transfer ownership y delete en filas separadas.

VALIDACIÓN:
1. UI minimalista (sin card destructiva pesada)
2. Acciones funcionan correctamente
3. Dialogs siguen apareciendo
```

### Validación F5

```
1. Danger zones usan SettingsSection estándar
2. Estilo minimalista como Linear
3. Acciones funcionan
4. No hay errores de TS
```

---

## FASE 6: Migración y Cleanup

**Objetivo**: Verificar migración completa, eliminar código muerto, documentar.

### Prompt

```
Completa la migración y realiza cleanup final.

PARTE 1: VERIFICAR MIGRACIÓN
Checklist:
- [ ] org-members.tsx → MembersTable
- [ ] product-members.tsx → MembersTable
- [ ] create-organization-form.tsx → EntityFormCard, EntityFields
- [ ] create-product-form.tsx → EntityFormCard, EntityFields
- [ ] org-settings route → CenteredPage, SettingsSection/Row
- [ ] product-settings route → CenteredPage, SettingsSection/Row
- [ ] settings-page.tsx → CenteredPage, SettingsSection/Row
- [ ] delete-organization-dialog.tsx → ConfirmDeleteDialog
- [ ] delete-product-dialog.tsx → ConfirmDeleteDialog

PARTE 2: ELIMINAR CÓDIGO DUPLICADO
- [ ] getInitials solo en shared/utils
- [ ] generateSlug solo en shared/utils

PARTE 3: CREAR README
ARCHIVO: apps/webapp/src/domains/shared/README.md

# Shared Domain

Componentes y utilidades compartidos entre dominios de webapp.
Siguen el estilo visual de Linear (centrado, compacto, profesional).

## Estructura

shared/
├── components/
│   ├── page-layout/           # CenteredPage, PageHeader
│   ├── settings-section/      # SettingsSection, SettingsRow
│   ├── members-table/         # MembersTable (estilo tabla)
│   ├── entity-form/           # EntityFormCard, EntityFields
│   └── confirm-delete-dialog/ # ConfirmDeleteDialog
└── utils/
    ├── get-initials.ts
    ├── slug-utils.ts
    └── date-utils.ts

## Principios

1. **Estilo Linear**: Layouts centrados, max-w-2xl, filas label-control
2. **i18n via props**: Labels y mensajes como props traducidas
3. **Composición flexible**: Slots para contenido personalizado
4. **Font size compatible**: Usan text-fontSize-* donde corresponde

VALIDACIÓN FINAL:
1. pnpm --filter @hikai/webapp tsc --noEmit
2. pnpm --filter @hikai/webapp lint
3. Todas las funcionalidades operativas
4. UI estilo Linear consistente
5. Reducción de código ~50-60%
```

### Validación F6

```
1. Migración 100% completa
2. Sin código duplicado
3. Sin errores de TS ni Lint
4. README documentado
5. Todas las funcionalidades operativas
6. Reducción de código confirmada (~50-60%)
```

---

## Archivos Críticos a Modificar

| Archivo | Cambio |
|---------|--------|
| `routes/organizations/$slug_.settings.tsx` | CenteredPage + SettingsSection |
| `routes/products/$slug_.settings.tsx` | CenteredPage + SettingsSection |
| `domains/organizations/components/org-members.tsx` | MembersTable |
| `domains/products/components/product-members.tsx` | MembersTable |
| `domains/core/components/settings-page.tsx` | CenteredPage + SettingsSection |
| `domains/organizations/components/create-organization-form.tsx` | EntityForm |
| `domains/products/components/create-product-form.tsx` | EntityForm |
| `domains/organizations/components/delete-organization-dialog.tsx` | ConfirmDeleteDialog |
| `domains/products/components/delete-product-dialog.tsx` | ConfirmDeleteDialog |

---

## Reducción de Código Estimada

| Área | Líneas actuales | Estimado después | Reducción |
|------|-----------------|------------------|-----------|
| Members (org + product) | ~580 | ~200 | ~65% |
| Settings pages | ~640 | ~250 | ~60% |
| Create forms | ~510 | ~300 | ~40% |
| Delete dialogs | ~270 | ~100 | ~63% |
| **Total** | ~2000 | ~850 | **~57%** |

---

## Resumen de Fases

| Fase | Componentes | Archivos Afectados | Estilo |
|------|-------------|--------------------|----|
| F0 | Utilities + CenteredPage + PageHeader | 4+ archivos | Linear base |
| F1 | SettingsSection + SettingsRow | settings routes | Linear filas |
| F2 | MembersTable | org/product members | Linear tabla |
| F3 | EntityFormCard + EntityFields | create forms | - |
| F4 | ConfirmDeleteDialog | delete dialogs | - |
| F5 | Danger Actions refactor | settings routes | Linear minimal |
| F6 | Cleanup | - | - |

---

## Próximo Paso

Ejecutar F0 con el prompt correspondiente para crear la estructura base, utilidades, y layout centrado estilo Linear.
