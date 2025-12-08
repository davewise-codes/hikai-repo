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

## settings navigation

- quiero añadir un componente de navegación lateral que facilite saber todas las opciones que hay y en cual estoy
- aparece al acceder a un menú
- eliminamos los tabs en favor de puntos de menú
- mantenemos los accesos desde los menús dropdown de user, org, product.

el componente de navegación lateral está en shared, será reutilizable con:

- sections
- items
- subitems (no habrá en settings)
- en cada nivel posibilidad de actions (no habrá en settings)
- cada item y subitem podrá llevar su icono
- estilo linear
- ancho por defecto que es variable definible por el usuario arrastrando el borde

Las sections de la nvigation por settings serán

User

- profile,
- preferences,
- security and access (placeholder, coming soon)
- my organizations: recent vs all, cards: info, my role, quick actions (leave, transfer, delete). Create Org
- my products: recent vs all, cards, info, my role, quick actions: leave, transfer, delete
- connected accounts (other services, placeholder, coming soon)

organization - (current org, forAdmins)

- general information / danger zone, (unifica genral + settings)
- plan,
- seats (placeholder, coming soon)
- billing (placeholder, coming soon)
- org's products - cards, info, my role, quick actions (leave, transfer, delete). Create product
  - sin productos recientes (elimiinar)

product - (current product, forAdmins)

- general information / danger zone, (unifica genral + settings)
- team

- aprovechamos que separamos los tabs para dar a las páginas de org-seats y product-team su propio layout que puede cubrir todo elancho
- y al resto de páginas volver a darlas un ancho más estrecho, según se especificaba en apps/webapp/webapp-plans/shared-layouts.md

- genera el plan en forma de prompts por fases, igual que hemos hecho en otras oportunidades como apps/webapp/webapp-plans/shared-layouts.md
- el documento sobre el que trabajaremos será: apps/webapp/webapp-plans/settings-structure.md. la información del plan la tienes que detallar a continuación del contenido ya existente
- incluye, igual que en apps/webapp/webapp-plans/shared-layouts.md una sección para poder monitorizar el progreso en distintas conversaciones sin perder el contexto
- incluye un prompt para arrancar cada fase
- máxima capacidad de ultrathink

---

## El plan se incluye a partir de esta sección

---

# Plan de Implementación: Settings Navigation Structure

## Progreso

| Fase                            | Descripción                                                | Estado        |
| ------------------------------- | ---------------------------------------------------------- | ------------- |
| F0: SettingsNav Component       | Componente de navegación lateral reutilizable              | ✅ Completado |
| F1: Restructura de Rutas        | Separar tabs en rutas independientes con layout compartido | ✅ Completado |
| F2: User Settings Pages         | Profile, Preferences, My Organizations, My Products        | ✅ Completado |
| F3: Organization Settings Pages | General, Plan, Products                                    | ✅ Completado |
| F4: Product Settings Pages      | General, Team                                              | ⏳ Pendiente  |
| F5: Width Variants & Polish     | Anchos específicos por página, resize handle               | ⏳ Pendiente  |
| F6: Cleanup & Documentation     | Eliminar tabs, código muerto, documentar                   | ⏳ Pendiente  |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Prompt para arrancar cada fase

```
- En apps/webapp/webapp-plans/settings-structure.md puedes ver el plan de implementación de Settings Navigation
- Vamos a proceder con la fase siguiente pendiente de ejecutar
- Analiza el documento y el plan y toma el prompt de esa fase como instrucción para implementarla
- Cuando tengas un plan para ello compártelo conmigo para validarlo
- No hagas commit inmediatamente tras finalizar la implementación
- Indícame las pruebas a realizar y cuando yo te confirme que están ok, haces el commit y actualizas el progreso
- No hagas asunciones, compárteme dudas y las debatimos
- Máxima capacidad de ultrathink
```

---

## Arquitectura Objetivo

### Estructura de URLs

```
/settings                          → Redirect a /settings/preferences
/settings/profile                  → Perfil del usuario
/settings/preferences              → Tema, color, font size, idioma
/settings/security                 → (placeholder) Coming soon
/settings/organizations            → Mis organizaciones
/settings/products                 → Mis productos
/settings/accounts                 → (placeholder) Connected accounts

/settings/org/$slug                → Redirect a /settings/org/$slug/general
/settings/org/$slug/general        → Info general + danger zone
/settings/org/$slug/plan           → Plan actual
/settings/org/$slug/seats          → (placeholder) Coming soon
/settings/org/$slug/billing        → (placeholder) Coming soon
/settings/org/$slug/products       → Productos de la org

/settings/product/$slug            → Redirect a /settings/product/$slug/general
/settings/product/$slug/general    → Info general + danger zone
/settings/product/$slug/team       → Miembros del producto
```

### Layout de Settings

```
┌─────────────────────────────────────────────────────────────────────┐
│ AppShell (header ya existente)                                      │
├────────────────┬────────────────────────────────────────────────────┤
│                │                                                    │
│  SettingsNav   │              Content Area                          │
│  (240px-320px) │    (narrow: max-w-2xl | wide: full width)         │
│  [resizable]   │                                                    │
│                │                                                    │
│  ┌──────────┐  │    ┌─────────────────────────────────────────┐   │
│  │ User     │  │    │                                          │   │
│  │ ├ Profile│  │    │         Page Content                     │   │
│  │ ├ Prefs  │  │    │         (SettingsLayout)                 │   │
│  │ ├ Security│ │    │                                          │   │
│  │ ├ My Orgs│  │    └─────────────────────────────────────────┘   │
│  │ └ Prods  │  │                                                    │
│  │          │  │                                                    │
│  │ Org      │  │                                                    │
│  │ ├ General│  │                                                    │
│  │ ├ Plan   │  │                                                    │
│  │ └ Prods  │  │                                                    │
│  │          │  │                                                    │
│  │ Product  │  │                                                    │
│  │ ├ General│  │                                                    │
│  │ └ Team   │  │                                                    │
│  └──────────┘  │                                                    │
│                │                                                    │
└────────────────┴────────────────────────────────────────────────────┘
```

### Componente SettingsNav

**Props:**

```typescript
interface SettingsNavSection {
	id: string;
	title: string; // Título de la sección
	condition?: boolean; // Si se muestra (ej: isAdmin)
}

interface SettingsNavItem {
	id: string;
	sectionId: string;
	label: string;
	icon?: LucideIcon;
	href: string;
	isActive?: boolean;
	badge?: string; // Ej: "Coming soon"
	disabled?: boolean;
}

interface SettingsNavProps {
	sections: SettingsNavSection[];
	items: SettingsNavItem[];
	currentPath: string;
	defaultWidth?: number; // Default: 256 (16rem)
	minWidth?: number; // Default: 200
	maxWidth?: number; // Default: 320
	onWidthChange?: (width: number) => void;
}
```

**Características:**

- Estilo Linear: fondo sutil, items con hover/active states
- Agrupación por secciones con títulos pequeños
- Resize handle en el borde derecho
- Persistencia del ancho en localStorage
- Animación suave en hover/resize
- Scroll interno si hay muchos items

---

## FASE 0: SettingsNav Component

**Objetivo**: Crear el componente de navegación lateral reutilizable.

### Archivos a crear

- `apps/webapp/src/domains/shared/components/settings-nav/settings-nav.tsx`
- `apps/webapp/src/domains/shared/components/settings-nav/settings-nav-item.tsx`
- `apps/webapp/src/domains/shared/components/settings-nav/settings-nav-section.tsx`
- `apps/webapp/src/domains/shared/components/settings-nav/use-nav-width.ts`
- `apps/webapp/src/domains/shared/components/settings-nav/index.ts`

### Prompt

```
Crea el componente SettingsNav con estilo Linear para navegación lateral en settings.

ANÁLISIS PREVIO:
Revisar el estilo de Linear para navegación lateral:
- Fondo: bg-muted/30 o similar sutil
- Items: py-1.5 px-2, rounded-md, hover:bg-accent
- Active: bg-accent font-medium
- Secciones: título uppercase text-xs text-muted-foreground mb-1
- Iconos: w-4 h-4, mr-2
- Resize handle: borde derecho con cursor ew-resize

PARTE 1: CREAR use-nav-width.ts
ARCHIVO: apps/webapp/src/domains/shared/components/settings-nav/use-nav-width.ts

Hook para manejar el ancho del nav con resize y persistencia.

/**
 * Hook para manejar el ancho del nav con resize y persistencia en localStorage.
 */
export function useNavWidth(options: {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
}) {
  const [width, setWidth] = useState(() => {
    const stored = localStorage.getItem(options.storageKey);
    return stored ? parseInt(stored, 10) : options.defaultWidth;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Handlers para resize con mouse
  const handleMouseDown = useCallback(...);
  const handleMouseMove = useCallback(...);
  const handleMouseUp = useCallback(...);

  // Persistir en localStorage
  useEffect(() => {
    localStorage.setItem(options.storageKey, width.toString());
  }, [width, options.storageKey]);

  // Event listeners para resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  return { width, isResizing, handleMouseDown };
}

PARTE 2: CREAR settings-nav-section.tsx
ARCHIVO: apps/webapp/src/domains/shared/components/settings-nav/settings-nav-section.tsx

interface SettingsNavSectionProps {
  title: string;
  children: ReactNode;
}

export function SettingsNavSection({ title, children }: SettingsNavSectionProps) {
  return (
    <div className="space-y-1">
      <h3 className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}

PARTE 3: CREAR settings-nav-item.tsx
ARCHIVO: apps/webapp/src/domains/shared/components/settings-nav/settings-nav-item.tsx

interface SettingsNavItemProps {
  label: string;
  href: string;
  icon?: LucideIcon;
  isActive?: boolean;
  badge?: string;
  disabled?: boolean;
}

export function SettingsNavItem({
  label,
  href,
  icon: Icon,
  isActive,
  badge,
  disabled,
}: SettingsNavItemProps) {
  if (disabled) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-fontSize-sm text-muted-foreground cursor-not-allowed">
        {Icon && <Icon className="w-4 h-4" />}
        <span className="flex-1">{label}</span>
        {badge && (
          <Badge variant="outline" className="text-[10px] px-1.5">
            {badge}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-fontSize-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <Badge variant="outline" className="text-[10px] px-1.5">
          {badge}
        </Badge>
      )}
    </Link>
  );
}

PARTE 4: CREAR settings-nav.tsx
ARCHIVO: apps/webapp/src/domains/shared/components/settings-nav/settings-nav.tsx

interface SettingsNavProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
}

export function SettingsNav({
  children,
  defaultWidth = 256,
  minWidth = 200,
  maxWidth = 320,
  storageKey = 'settings-nav-width',
}: SettingsNavProps) {
  const { width, isResizing, handleMouseDown } = useNavWidth({
    storageKey,
    defaultWidth,
    minWidth,
    maxWidth,
  });

  return (
    <div
      className="relative flex-shrink-0 border-r bg-muted/30"
      style={{ width }}
    >
      {/* Content */}
      <nav className="h-full overflow-y-auto py-4 px-2 space-y-6">
        {children}
      </nav>

      {/* Resize handle */}
      <div
        className={cn(
          "absolute top-0 right-0 w-1 h-full cursor-ew-resize",
          "hover:bg-primary/20 transition-colors",
          isResizing && "bg-primary/30"
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}

PARTE 5: CREAR index.ts
ARCHIVO: apps/webapp/src/domains/shared/components/settings-nav/index.ts

export { SettingsNav } from "./settings-nav";
export { SettingsNavSection } from "./settings-nav-section";
export { SettingsNavItem } from "./settings-nav-item";

PARTE 6: ACTUALIZAR shared/components/index.ts
Añadir export * from "./settings-nav";

PARTE 7: CREAR DEMO PAGE (temporal)
Crear una ruta temporal /settings-demo para probar el componente antes de integrarlo.

VALIDACIÓN:
1. Ejecutar pnpm --filter @hikai/webapp tsc --noEmit
2. Verificar que el nav renderiza correctamente
3. Verificar resize funciona con persistencia
4. Verificar estilo Linear (sutil, profesional)
5. Verificar hover/active states
6. Verificar scroll interno con muchos items
```

### Validación F0

```
1. SettingsNav, SettingsNavSection, SettingsNavItem creados
2. useNavWidth hook funcional con persistencia
3. Resize handle funciona correctamente
4. Estilo Linear aplicado
5. No hay errores de TS
```

---

## FASE 1: Restructura de Rutas

**Objetivo**: Crear estructura de rutas para settings con layout compartido.

### Archivos a crear/modificar

- `apps/webapp/src/routes/settings.tsx` → Convertir en layout route
- `apps/webapp/src/routes/settings/index.tsx` → Redirect a preferences
- `apps/webapp/src/routes/settings/preferences.tsx`
- `apps/webapp/src/routes/settings/profile.tsx`
- `apps/webapp/src/routes/settings/organizations.tsx`
- `apps/webapp/src/routes/settings/products.tsx`
- `apps/webapp/src/routes/settings/org/$slug.tsx` → Layout route para org settings
- `apps/webapp/src/routes/settings/org/$slug/general.tsx`
- `apps/webapp/src/routes/settings/org/$slug/plan.tsx`
- `apps/webapp/src/routes/settings/org/$slug/products.tsx`
- `apps/webapp/src/routes/settings/product/$slug.tsx` → Layout route
- `apps/webapp/src/routes/settings/product/$slug/general.tsx`
- `apps/webapp/src/routes/settings/product/$slug/team.tsx`

### Prompt

```
Reestructura las rutas de settings usando TanStack Router layouts.

ANÁLISIS PREVIO:
Revisar cómo TanStack Router maneja layouts con rutas anidadas:
- _layout.tsx o route con Outlet para rutas hijas
- Revisar estructura actual en routes/

PARTE 1: CREAR SETTINGS LAYOUT ROUTE
ARCHIVO: apps/webapp/src/routes/settings.tsx

Este archivo se convierte en el layout padre para todas las rutas de settings.

import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AppShell } from "@/domains/core/components/app-shell";
import { SettingsNav, SettingsNavSection, SettingsNavItem } from "@/domains/shared";
import { useTranslation } from "react-i18next";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useCurrentProduct } from "@/domains/products/hooks";
import {
  User,
  Settings,
  Shield,
  Building2,
  Folder,
  Link2,
  CreditCard,
  Users,
  Receipt,
} from "@hikai/ui";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const { t } = useTranslation("settings");
  const location = useLocation();
  const { currentOrg } = useCurrentOrg();
  const { currentProduct } = useCurrentProduct();

  const isOrgAdmin = currentOrg?.userRole === "owner" || currentOrg?.userRole === "admin";
  const isProductAdmin = currentProduct?.userRole === "admin";

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-var(--header-height))]">
        <SettingsNav>
          {/* User Section */}
          <SettingsNavSection title={t("nav.user")}>
            <SettingsNavItem
              label={t("nav.profile")}
              href="/settings/profile"
              icon={User}
              isActive={location.pathname === "/settings/profile"}
            />
            <SettingsNavItem
              label={t("nav.preferences")}
              href="/settings/preferences"
              icon={Settings}
              isActive={location.pathname === "/settings/preferences"}
            />
            <SettingsNavItem
              label={t("nav.security")}
              href="/settings/security"
              icon={Shield}
              disabled
              badge={t("nav.comingSoon")}
            />
            <SettingsNavItem
              label={t("nav.myOrganizations")}
              href="/settings/organizations"
              icon={Building2}
              isActive={location.pathname === "/settings/organizations"}
            />
            <SettingsNavItem
              label={t("nav.myProducts")}
              href="/settings/products"
              icon={Folder}
              isActive={location.pathname === "/settings/products"}
            />
            <SettingsNavItem
              label={t("nav.connectedAccounts")}
              href="/settings/accounts"
              icon={Link2}
              disabled
              badge={t("nav.comingSoon")}
            />
          </SettingsNavSection>

          {/* Organization Section (if org selected and user is admin) */}
          {currentOrg && isOrgAdmin && (
            <SettingsNavSection title={currentOrg.name}>
              <SettingsNavItem
                label={t("nav.orgGeneral")}
                href={`/settings/org/${currentOrg.slug}/general`}
                icon={Settings}
                isActive={location.pathname.startsWith(`/settings/org/${currentOrg.slug}/general`)}
              />
              <SettingsNavItem
                label={t("nav.plan")}
                href={`/settings/org/${currentOrg.slug}/plan`}
                icon={CreditCard}
                isActive={location.pathname.startsWith(`/settings/org/${currentOrg.slug}/plan`)}
              />
              <SettingsNavItem
                label={t("nav.seats")}
                href={`/settings/org/${currentOrg.slug}/seats`}
                icon={Users}
                disabled
                badge={t("nav.comingSoon")}
              />
              <SettingsNavItem
                label={t("nav.billing")}
                href={`/settings/org/${currentOrg.slug}/billing`}
                icon={Receipt}
                disabled
                badge={t("nav.comingSoon")}
              />
              <SettingsNavItem
                label={t("nav.orgProducts")}
                href={`/settings/org/${currentOrg.slug}/products`}
                icon={Folder}
                isActive={location.pathname.startsWith(`/settings/org/${currentOrg.slug}/products`)}
              />
            </SettingsNavSection>
          )}

          {/* Product Section (if product selected and user is admin) */}
          {currentProduct && isProductAdmin && (
            <SettingsNavSection title={currentProduct.name}>
              <SettingsNavItem
                label={t("nav.productGeneral")}
                href={`/settings/product/${currentProduct.slug}/general`}
                icon={Settings}
                isActive={location.pathname.startsWith(`/settings/product/${currentProduct.slug}/general`)}
              />
              <SettingsNavItem
                label={t("nav.team")}
                href={`/settings/product/${currentProduct.slug}/team`}
                icon={Users}
                isActive={location.pathname.startsWith(`/settings/product/${currentProduct.slug}/team`)}
              />
            </SettingsNavSection>
          )}
        </SettingsNav>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </AppShell>
  );
}

PARTE 2: CREAR INDEX REDIRECT
ARCHIVO: apps/webapp/src/routes/settings/index.tsx

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/preferences" });
  },
});

PARTE 3: CREAR PREFERENCES PAGE
ARCHIVO: apps/webapp/src/routes/settings/preferences.tsx

Mover contenido de SettingsPage aquí (tema, color, font, idioma).

PARTE 4: CREAR PROFILE PAGE
ARCHIVO: apps/webapp/src/routes/settings/profile.tsx

Mover contenido de ProfilePage aquí.

PARTE 5: CREAR ORGANIZATIONS PAGE (placeholder inicial)
ARCHIVO: apps/webapp/src/routes/settings/organizations.tsx

Lista de "mis organizaciones" - se implementará contenido en F2.

PARTE 6: CREAR PRODUCTS PAGE (placeholder inicial)
ARCHIVO: apps/webapp/src/routes/settings/products.tsx

Lista de "mis productos" - se implementará contenido en F2.

PARTE 7: AÑADIR TRADUCCIONES
ARCHIVO: apps/webapp/src/i18n/locales/en/settings.json (nuevo)
ARCHIVO: apps/webapp/src/i18n/locales/es/settings.json (nuevo)

{
  "nav": {
    "user": "User",
    "profile": "Profile",
    "preferences": "Preferences",
    "security": "Security & Access",
    "myOrganizations": "My Organizations",
    "myProducts": "My Products",
    "connectedAccounts": "Connected Accounts",
    "comingSoon": "Coming soon",
    "orgGeneral": "General",
    "plan": "Plan",
    "seats": "Seats",
    "billing": "Billing",
    "orgProducts": "Products",
    "productGeneral": "General",
    "team": "Team"
  }
}

VALIDACIÓN:
1. pnpm --filter @hikai/webapp tsc --noEmit
2. /settings redirige a /settings/preferences
3. SettingsNav se muestra en todas las rutas de settings
4. Navegación entre páginas funciona
5. Active state se muestra correctamente
6. Secciones de org/product solo se muestran si hay contexto y permisos
```

### Validación F1

```
1. Layout route funciona con Outlet
2. Redirect /settings → /settings/preferences
3. SettingsNav visible en todas las páginas de settings
4. Navegación funciona
5. No hay errores de TS
```

---

## FASE 2: User Settings Pages

**Objetivo**: Implementar las páginas de settings del usuario.

### Archivos a crear/modificar

- `apps/webapp/src/routes/settings/preferences.tsx` (contenido de settings-page.tsx)
- `apps/webapp/src/routes/settings/profile.tsx` (contenido de profile-page.tsx)
- `apps/webapp/src/routes/settings/organizations.tsx` (mis orgs con cards)
- `apps/webapp/src/routes/settings/products.tsx` (mis productos con cards)
- `apps/webapp/src/domains/shared/components/entity-card/entity-card.tsx` (nuevo)

### Prompt

```
Implementa las páginas de user settings con diseño estilo Linear.

ANÁLISIS PREVIO:
Revisar:
- apps/webapp/src/domains/core/components/settings-page.tsx
- apps/webapp/src/domains/core/components/profile-page.tsx
- apps/webapp/src/domains/organizations/components/organization-list.tsx

PARTE 1: PREFERENCES PAGE
ARCHIVO: apps/webapp/src/routes/settings/preferences.tsx

Mover contenido de settings-page.tsx pero:
- Eliminar AppShell (ya está en layout)
- Eliminar back button (nav lateral reemplaza)
- Mantener SettingsLayout para centrado

function PreferencesPage() {
  return (
    <SettingsLayout>
      <SettingsHeader
        title={t("preferences.title")}
        subtitle={t("preferences.subtitle")}
      />
      {/* Resto igual que settings-page.tsx */}
    </SettingsLayout>
  );
}

PARTE 2: PROFILE PAGE
ARCHIVO: apps/webapp/src/routes/settings/profile.tsx

Mover contenido de profile-page.tsx:
- Avatar editable
- Nombre editable
- Email (readonly)

PARTE 3: CREAR EntityCard
ARCHIVO: apps/webapp/src/domains/shared/components/entity-card/entity-card.tsx

Card reutilizable para mostrar orgs/products con:
- Avatar/icono
- Nombre
- Descripción/info secundaria
- Badge de rol
- Quick actions dropdown

interface EntityCardProps {
  name: string;
  description?: string;
  avatar?: string;
  icon?: LucideIcon;
  badge?: { label: string; variant: string };
  info?: Array<{ label: string; value: string }>;
  actions?: Array<{
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: "default" | "destructive";
  }>;
  onClick?: () => void;
}

PARTE 4: MY ORGANIZATIONS PAGE
ARCHIVO: apps/webapp/src/routes/settings/organizations.tsx

Lista de organizaciones del usuario con:
- Tabs: Recent / All
- EntityCards para cada org
- Info: plan, members count, my role
- Actions: Go to org, Settings (if admin), Leave (if not owner), Transfer (if owner), Delete (if owner)
- Botón "Create Organization" arriba

function MyOrganizationsPage() {
  const { t } = useTranslation("settings");
  const [view, setView] = useState<"recent" | "all">("recent");
  const organizations = useUserOrganizations(); // hook que lista todas las orgs del user

  return (
    <SettingsLayout variant="wide">
      <SettingsHeader
        title={t("organizations.title")}
        subtitle={t("organizations.subtitle")}
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("organizations.create")}
          </Button>
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as "recent" | "all")}>
        <TabsList>
          <TabsTrigger value="recent">{t("organizations.recent")}</TabsTrigger>
          <TabsTrigger value="all">{t("organizations.all")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredOrgs.map((org) => (
          <EntityCard
            key={org._id}
            name={org.name}
            description={`/${org.slug}`}
            badge={{ label: t(`roles.${org.userRole}`), variant: org.userRole }}
            info={[
              { label: t("organizations.plan"), value: t(`plans.${org.plan}`) },
              { label: t("organizations.members"), value: org.memberCount.toString() },
            ]}
            actions={getOrgActions(org)}
            onClick={() => navigate({ to: "/organizations/$slug", params: { slug: org.slug } })}
          />
        ))}
      </div>

      <CreateOrganizationDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </SettingsLayout>
  );
}

PARTE 5: MY PRODUCTS PAGE
ARCHIVO: apps/webapp/src/routes/settings/products.tsx

Similar a organizations pero para productos:
- Tabs: Recent / All
- Info: organization, members count, my role
- Actions: Go to product, Settings (if admin), Leave

PARTE 6: ACTUALIZAR EXPORTS Y TRADUCCIONES

VALIDACIÓN:
1. pnpm --filter @hikai/webapp tsc --noEmit
2. Preferences page funciona con tema/color/font/idioma
3. Profile page permite editar nombre/avatar
4. Organizations page muestra todas las orgs con acciones
5. Products page muestra todos los productos con acciones
6. EntityCard es reutilizable y estilo consistente
```

### Validación F2

```
1. 4 páginas de user settings funcionando
2. EntityCard creado y reutilizable
3. Tabs Recent/All funcionan
4. Quick actions funcionan
5. Create dialogs funcionan
6. No hay errores de TS
```

---

## FASE 3: Organization Settings Pages

**Objetivo**: Implementar las páginas de settings de organización.

### Archivos a crear

- `apps/webapp/src/routes/settings/org/$slug.tsx` (layout)
- `apps/webapp/src/routes/settings/org/$slug/index.tsx` (redirect)
- `apps/webapp/src/routes/settings/org/$slug/general.tsx`
- `apps/webapp/src/routes/settings/org/$slug/plan.tsx`
- `apps/webapp/src/routes/settings/org/$slug/products.tsx`

### Prompt

```
Implementa las páginas de organization settings.

ANÁLISIS PREVIO:
Revisar:
- apps/webapp/src/routes/organizations/$slug.tsx (tabs de settings actual)
- apps/webapp/src/domains/organizations/components/org-members.tsx

PARTE 1: ORG SETTINGS LAYOUT
ARCHIVO: apps/webapp/src/routes/settings/org/$slug.tsx

Layout que valida acceso a org y provee contexto.

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useOrganizationBySlug } from "@/domains/organizations";

export const Route = createFileRoute("/settings/org/$slug")({
  component: OrgSettingsLayout,
});

function OrgSettingsLayout() {
  const { slug } = Route.useParams();
  const organization = useOrganizationBySlug(slug);

  // Loading
  if (organization === undefined) {
    return <LoadingState />;
  }

  // Not found or no access
  if (!organization) {
    return <NotFoundState />;
  }

  // Not admin
  const isAdminOrOwner = organization.userRole === "owner" || organization.userRole === "admin";
  if (!isAdminOrOwner) {
    throw redirect({ to: "/settings/organizations" });
  }

  // Proveer org via context o prop drilling
  return <Outlet />;
}

PARTE 2: ORG INDEX REDIRECT
ARCHIVO: apps/webapp/src/routes/settings/org/$slug/index.tsx

Redirect a general.

PARTE 3: ORG GENERAL PAGE
ARCHIVO: apps/webapp/src/routes/settings/org/$slug/general.tsx

Contenido del tab "settings" actual de org/$slug:
- Nombre editable
- Slug (readonly)
- Descripción editable
- Save button
- Danger zone: Transfer ownership, Delete

function OrgGeneralPage() {
  const { slug } = Route.useParams();
  const organization = useOrganizationBySlug(slug);
  // ... state y handlers

  return (
    <SettingsLayout>
      <SettingsHeader
        title={t("general.title")}
        subtitle={organization.name}
      />

      <SettingsSection title={t("general.info")}>
        <SettingsRow label={t("general.name")} control={<Input ... />} />
        <SettingsRow label={t("general.slug")} control={<Input disabled ... />} />
        <SettingsRowContent>
          <Textarea ... />
        </SettingsRowContent>
      </SettingsSection>

      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave}>{t("general.save")}</Button>
        </div>
      )}

      {/* Danger Zone */}
      {isOwner && !organization.isPersonal && (
        <SettingsSection title={t("dangerZone.title")}>
          <SettingsRow
            label={t("transfer.title")}
            description={t("transfer.description")}
            control={<Button variant="outline" onClick={() => setTransferOpen(true)}>...</Button>}
          />
          <SettingsRow
            label={t("delete.title")}
            description={t("delete.description")}
            control={<Button variant="ghost-destructive" onClick={() => setDeleteOpen(true)}>...</Button>}
          />
        </SettingsSection>
      )}
    </SettingsLayout>
  );
}

PARTE 4: ORG PLAN PAGE
ARCHIVO: apps/webapp/src/routes/settings/org/$slug/plan.tsx

Muestra plan actual y permite upgrade (placeholder para futuro billing):
- Plan actual badge
- Límites del plan (productos, miembros)
- Uso actual vs límites
- Botón upgrade (placeholder)

PARTE 5: ORG PRODUCTS PAGE
ARCHIVO: apps/webapp/src/routes/settings/org/$slug/products.tsx

Lista de productos de la org:
- Sin tabs Recent/All (mostrar todos)
- EntityCards para cada producto
- Info: members count, my role
- Actions: Go to product, Settings (if admin), Delete (if admin)
- Botón "Create Product" arriba

VALIDACIÓN:
1. pnpm --filter @hikai/webapp tsc --noEmit
2. /settings/org/$slug redirige a general
3. General page permite editar y tiene danger zone
4. Plan page muestra info y límites
5. Products page lista productos de la org
6. Acceso solo para admins/owners
```

### Validación F3

```
1. 3 páginas de org settings funcionando
2. Validación de acceso (solo admin/owner)
3. Edición de org funciona
4. Danger zone funciona
5. Plan page muestra límites
6. Products page muestra productos de la org
7. No hay errores de TS
```

---

## FASE 4: Product Settings Pages

**Objetivo**: Implementar las páginas de settings de producto.

### Archivos a crear

- `apps/webapp/src/routes/settings/product/$slug.tsx` (layout)
- `apps/webapp/src/routes/settings/product/$slug/index.tsx` (redirect)
- `apps/webapp/src/routes/settings/product/$slug/general.tsx`
- `apps/webapp/src/routes/settings/product/$slug/team.tsx`

### Prompt

```
Implementa las páginas de product settings.

ANÁLISIS PREVIO:
Revisar:
- apps/webapp/src/routes/products/$slug.tsx (tabs de settings actual)
- apps/webapp/src/domains/products/components/product-members.tsx

PARTE 1: PRODUCT SETTINGS LAYOUT
ARCHIVO: apps/webapp/src/routes/settings/product/$slug.tsx

Similar a org layout pero para producto.

PARTE 2: PRODUCT INDEX REDIRECT
ARCHIVO: apps/webapp/src/routes/settings/product/$slug/index.tsx

PARTE 3: PRODUCT GENERAL PAGE
ARCHIVO: apps/webapp/src/routes/settings/product/$slug/general.tsx

Contenido del tab "settings" actual de product/$slug:
- Nombre editable
- Slug (readonly)
- Descripción editable
- Save button
- Danger zone: Delete

PARTE 4: PRODUCT TEAM PAGE
ARCHIVO: apps/webapp/src/routes/settings/product/$slug/team.tsx

**IMPORTANTE**: Esta página usa layout wide para la tabla de miembros.

function ProductTeamPage() {
  // ...

  return (
    <SettingsLayout variant="wide">
      <SettingsHeader
        title={t("team.title")}
        subtitle={product.name}
      />

      <ProductMembers productId={product._id} userRole={product.userRole} />
    </SettingsLayout>
  );
}

VALIDACIÓN:
1. pnpm --filter @hikai/webapp tsc --noEmit
2. /settings/product/$slug redirige a general
3. General page permite editar y tiene danger zone
4. Team page muestra MembersTable con ancho completo
5. Acceso solo para admins
```

### Validación F4

```
1. 2 páginas de product settings funcionando
2. Validación de acceso (solo admin)
3. Edición de producto funciona
4. Danger zone funciona
5. Team page usa layout wide
6. No hay errores de TS
```

---

## FASE 5: Width Variants & Polish

**Objetivo**: Ajustar anchos por página y pulir UX.

### Prompt

```
Ajusta anchos de página y pulir la experiencia.

PARTE 1: DEFINIR ANCHOS POR PÁGINA

Páginas con layout "narrow" (max-w-2xl):
- /settings/profile
- /settings/preferences
- /settings/org/$slug/general
- /settings/org/$slug/plan
- /settings/product/$slug/general

Páginas con layout "wide" (max-w-5xl o full):
- /settings/organizations (grid de cards)
- /settings/products (grid de cards)
- /settings/org/$slug/products (grid de cards)
- /settings/product/$slug/team (tabla de miembros)

PARTE 2: PULIR SETTINGSNAV

- Añadir indicador visual de sección actual (línea vertical)
- Mejorar transiciones de hover
- Añadir keyboard navigation (arrow up/down)
- Colapsar a iconos en pantallas pequeñas (opcional)

PARTE 3: MEJORAR ENTITYCARD

- Añadir skeleton loading state
- Mejorar hover state
- Añadir keyboard accessibility

PARTE 4: ACTUALIZAR DROPDOWNS DE HEADER

Actualizar UserMenu, OrgSwitcher, ProductSwitcher para que los links a settings apunten a las nuevas rutas:

UserMenu:
- "All Settings" → /settings/preferences
- Profile icon → /settings/profile

OrgSwitcher:
- Settings gear → /settings/org/$slug/general

ProductSwitcher:
- Settings gear → /settings/product/$slug/general

PARTE 5: RESPONSIVE BEHAVIOR

En mobile (< 768px):
- SettingsNav se convierte en drawer/sheet
- Botón hamburger para abrir nav en settings

VALIDACIÓN:
1. Anchos correctos por página
2. Nav polish aplicado
3. Dropdowns actualizados
4. Mobile responsive
```

### Validación F5

```
1. Anchos correctos por tipo de página
2. Nav con mejor UX
3. Dropdowns apuntan a nuevas rutas
4. Mobile funciona
5. No hay errores de TS
```

---

## FASE 6: Cleanup & Documentation

**Objetivo**: Eliminar código obsoleto, documentar.

### Prompt

```
Limpieza final y documentación.

PARTE 1: ELIMINAR CÓDIGO OBSOLETO

- apps/webapp/src/routes/settings.tsx antiguo (ya reemplazado)
- Tabs en routes/organizations/$slug.tsx → Convertir en página de overview simple
- Tabs en routes/products/$slug.tsx → Convertir en página de overview simple
- apps/webapp/src/domains/core/components/settings-page.tsx (movido a route)
- apps/webapp/src/domains/core/components/profile-page.tsx (movido a route)

NOTA: Las rutas /organizations/$slug y /products/$slug se mantienen como páginas de "overview" públicas (accesibles para todos los miembros), pero sin tabs. Los settings se acceden desde /settings/org/$slug y /settings/product/$slug.

PARTE 2: ACTUALIZAR EXPORTS

Revisar que todos los componentes obsoletos se eliminan de exports.

PARTE 3: ACTUALIZAR README

ARCHIVO: apps/webapp/src/domains/shared/README.md

Añadir documentación de:
- SettingsNav component
- EntityCard component
- Estructura de rutas de settings

PARTE 4: ACTUALIZAR DOCUMENTACIÓN DE WEBAPP

ARCHIVO: apps/webapp/doc/settings.md (nuevo)

Documentar:
- Arquitectura de settings
- Estructura de rutas
- Permisos por página
- Cómo añadir nuevas páginas de settings

VALIDACIÓN FINAL:
1. pnpm --filter @hikai/webapp tsc --noEmit
2. pnpm --filter @hikai/webapp lint
3. No hay código muerto
4. Todas las rutas funcionan
5. Documentación actualizada
```

### Validación F6

```
1. Código obsoleto eliminado
2. No hay imports rotos
3. Todas las funcionalidades operativas
4. Documentación completa
5. No hay errores de TS ni Lint
```

---

## Resumen de Cambios por Fase

| Fase | Archivos Nuevos     | Archivos Modificados           | Archivos Eliminados |
| ---- | ------------------- | ------------------------------ | ------------------- |
| F0   | 5 (SettingsNav)     | 1 (index.ts)                   | 0                   |
| F1   | 8+ (rutas)          | 2 (settings.tsx, traducciones) | 0                   |
| F2   | 5 (páginas user)    | 0                              | 0                   |
| F3   | 5 (páginas org)     | 0                              | 0                   |
| F4   | 4 (páginas product) | 0                              | 0                   |
| F5   | 0                   | 5+ (polish)                    | 0                   |
| F6   | 1 (doc)             | 3 (cleanup)                    | 2-3 (obsoletos)     |

---

## Archivos Críticos a Modificar

| Archivo                                     | Fase | Cambio                              |
| ------------------------------------------- | ---- | ----------------------------------- |
| `routes/settings.tsx`                       | F1   | Convertir en layout con SettingsNav |
| `routes/organizations/$slug.tsx`            | F6   | Eliminar tabs, dejar overview       |
| `routes/products/$slug.tsx`                 | F6   | Eliminar tabs, dejar overview       |
| `core/components/user-menu.tsx`             | F5   | Actualizar links a settings         |
| `organizations/components/org-switcher.tsx` | F5   | Actualizar link a settings          |
| `products/components/product-switcher.tsx`  | F5   | Actualizar link a settings          |

---

## Dependencias entre Fases

```
F0 ──► F1 ──► F2
         │
         └──► F3 ──► F4 ──► F5 ──► F6
```

- F0 es prerequisito de F1 (SettingsNav necesario para layout)
- F1 es prerequisito de F2, F3, F4 (estructura de rutas)
- F5 depende de F2-F4 (polish después de contenido)
- F6 es la última (cleanup después de todo)
