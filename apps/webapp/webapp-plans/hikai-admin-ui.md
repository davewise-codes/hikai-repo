## Admin UI

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

## Mejoras de UI para admin

- Implementaremos ciertas mejoras para administrar Hikai. A varios niveles:
- Aparece una sección menú superior horizontal dónde se gestiona el contexto del usuario (org+product+profile) veremos:
  - A la izquierda:
    - Avatar de organización actual + org switcher (dónde está actualmente)
    - Seguido un product switcher. Tendrá forma de botón (para que su ancho acoja el nombre del producto)
  - En el extremo derecho
    - User avatar (que ahora está en el siderbar abajo)
- User
  - Menú dropdown (el actual)
  - Accesible desde el avatar del usuario logado
  - Añadimos junto al nombre un icono de engranaje que permite acceder al formulario para modificar el profile. Esto es new. El profile permite cambiar el nombre, el mail, método de autenticación etc.
  - Seguidamente las preferences (dónde ya están)
  - Siguiente sección (new): Lista de products accedidos recientemente. Máx 5. Al final un botónde ir a 'Mis Productos'
  - La última sección es log-out (dónde está)
- Organization
  - similar a como está ahora y como ya funciona user, pulsar el avatar muestra un dropdown dónde:
    - se muestra la org actual. si eres admin o owner se puede acceder a los settings de la org actual desde un engranaje junto al nobre (no desde un botón debajo)
    - Se ven las últimas organizaciones accedidas. Al final un botónde ir a 'Mis Organizaciones'
    - Al final un botón de crear organización. Lleva directamente al formulario de crear organización
    - Crear organización es un formulario separado de 'mis organizaciones'
    - cambiar de una organización a otra lleva a la página de elegir producto de esa organización o al producto que la organización tenga si sólo hay uno
- Product
  - un botón de product switcher muestra el producto en el que estás.
  - el dopdown muestra el producto actual y un engranaje de settings para poder editarlo si eres owner
  - en un siguiente tramo otros productos elegidos de esta organización

---

## Progreso

| Fase | Estado |
|------|--------|
| F1: Core Infrastructure (currentProductId) | ✅ Completado |
| F2: Header + Sidebar Colapsable | ✅ Completado |
| F3: OrgSwitcher Mejorado | ✅ Completado |
| F4: ProductSwitcher (nuevo) | ⏳ Pendiente |
| F5: UserMenu Mejorado | ⏳ Pendiente |
| F6: Profile Page | ⏳ Pendiente |
| F7: Product Settings Page | ⏳ Pendiente |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

---

## Prompt para arrancar cada fase

- En apps/webapp/webapp-plans/hikai-admin-ui.md puedes ver el plan de implementación de mejoras de Admin UI
- Vamos a proceder con la fase siguiente pendiente de ejecutar
- Analiza el documento y el plan y toma el prompt de esa fase como instrucción para implementarla
- Cuando tengas un plan para ello compártelo conmigo para validarlo
- No hagas asunciones, compárteme dudas y las debatimos
- Máxima capacidad de ultrathink

---

## Decisiones Tomadas

1. **Layout**: Header horizontal superior + Sidebar colapsable (botón hamburguesa)
2. **Product Switcher**: Siempre visible, muestra "Seleccionar producto" cuando no hay activo
3. **Profile**: Página nueva en `/profile` (no dialog)
4. **Product Settings**: Incluido en este plan como `/products/$slug/settings`
5. **currentProductId**: Añadido al store global con persistencia
6. **Navegación**: Se mantiene en sidebar colapsable (no se mueve al header)

---

## Instrucciones Generales (aplicar en TODAS las fases)

### Actualizar Progreso
- Al completar cada fase, actualizar la tabla de **Progreso** al inicio
- Marcar la fase completada con ✅

### Reglas del Repo
- Asegurar cumplimiento de reglas y principios en `CLAUDE.md`
- Seguir patrones de arquitectura establecidos
- Revisar que no hay errores de TS ni Lint en ningún fichero modificado

### Commits
- Un commit por fase completada
- **NO realizar commit** hasta que el usuario confirme que las pruebas funcionales son OK
- Formato: `feat(webapp): [F#-ADMIN] descripción breve`

### i18n
- Todas las cadenas de texto deben usar react-i18next
- Añadir keys a los archivos correspondientes en `src/i18n/locales/`
- Namespaces: `common.json`, `organizations.json`, `products.json`, `profile.json` (nuevo)

---

## FASE 1: Core Infrastructure - currentProductId

**Objetivo**: Añadir `currentProductId` al estado global y crear hook `useCurrentProduct`.

### Archivos a modificar/crear

- `apps/webapp/src/domains/core/store/core-slice.ts` (modificar)
- `apps/webapp/src/store/index.ts` (modificar)
- `apps/webapp/src/domains/products/hooks/use-current-product.ts` (crear)
- `apps/webapp/src/domains/products/hooks/index.ts` (modificar)
- `apps/webapp/src/routes/products/$slug.tsx` (modificar)

### Prompt

```
Implementa currentProductId en el estado global y crea useCurrentProduct hook.

PARTE 1: MODIFICAR core-slice.ts
ARCHIVO: apps/webapp/src/domains/core/store/core-slice.ts

AÑADIR a CoreSlice interface:
- currentProductId: string | null
- setCurrentProductId: (id: string | null) => void

AÑADIR a createCoreSlice:
- currentProductId: null
- setCurrentProductId: (id) => set({ currentProductId: id })

PARTE 2: MODIFICAR store/index.ts
ARCHIVO: apps/webapp/src/store/index.ts

- Añadir currentProductId a partialize para persistencia
- Añadir al listener de storage sync para multi-pestaña

PARTE 3: CREAR use-current-product.ts
ARCHIVO: apps/webapp/src/domains/products/hooks/use-current-product.ts

Hook useCurrentProduct:
1. Lee currentProductId del store
2. Lee currentOrgId del store (para validar)
3. Fetch producto con useGetProduct(currentProductId) si existe
4. Auto-clear: si el producto no pertenece a currentOrg, llamar setCurrentProductId(null)
5. Retorna: { currentProduct, isLoading, setCurrentProduct }

Función setCurrentProduct:
- Recibe productId (o null para deseleccionar)
- Llama setCurrentProductId del store
- Si hay productId, llama updateLastProductAccess (sin bloquear UX)

PARTE 4: EXPORTAR hook
ARCHIVO: apps/webapp/src/domains/products/hooks/index.ts

Añadir: export { useCurrentProduct } from './use-current-product'

PARTE 5: MODIFICAR products/$slug.tsx
ARCHIVO: apps/webapp/src/routes/products/$slug.tsx

- En el componente, cuando se carga el producto, llamar setCurrentProduct(product._id)
- Esto asegura que al navegar a un producto, se establece como actual

PATRÓN: Ver use-current-org.ts como referencia
```

### Validación F1

```
1. Verificar que currentProductId se persiste en localStorage
2. Cambiar de org debe limpiar currentProductId si el producto no pertenece
3. Navegar a /products/$slug establece el producto como actual
4. Multi-pestaña: cambiar producto en una pestaña sincroniza con otras
5. No hay errores de TS
```

---

## FASE 2: Header + Sidebar Colapsable

**Objetivo**: Reemplazar layout vertical por header horizontal + sidebar colapsable.

### Archivos a crear/modificar

- `apps/webapp/src/domains/core/components/app-header.tsx` (crear)
- `apps/webapp/src/domains/core/components/sidebar.tsx` (crear)
- `apps/webapp/src/domains/core/components/app-shell.tsx` (modificar)
- `apps/webapp/src/domains/core/store/core-slice.ts` (modificar - añadir sidebarOpen)
- `apps/webapp/src/i18n/locales/en/common.json` (modificar)
- `apps/webapp/src/i18n/locales/es/common.json` (modificar)

### Prompt

```
Implementa nuevo layout con header horizontal y sidebar colapsable.

PARTE 1: AÑADIR estado sidebar al store
ARCHIVO: apps/webapp/src/domains/core/store/core-slice.ts

AÑADIR:
- sidebarOpen: boolean (default false)
- setSidebarOpen: (open: boolean) => void
- toggleSidebar: () => void

NO persistir sidebarOpen (se cierra al recargar)

PARTE 2: CREAR app-header.tsx
ARCHIVO: apps/webapp/src/domains/core/components/app-header.tsx

Componente AppHeader:
- Posición: fixed top, full width, h-14, z-modal
- Background: bg-background con border-b
- Layout flex horizontal:
  - Izquierda:
    - Botón hamburguesa (Menu icon) para toggle sidebar
    - Logo "H" o texto "Hikai" (link a /)
    - OrgSwitcher (importar del dominio organizations)
    - ProductSwitcher (placeholder por ahora, se implementa en F4)
  - Derecha:
    - UserMenu (solo el avatar trigger, el dropdown sigue igual)

Usar componentes de @hikai/ui: Button, DropdownMenu
Iconos: Menu (hamburguesa), X (cerrar)

PARTE 3: CREAR sidebar.tsx
ARCHIVO: apps/webapp/src/domains/core/components/sidebar.tsx

Componente Sidebar:
- Tipo overlay (Sheet de @hikai/ui o div con fixed position)
- Ancho: w-64 cuando abierto
- Animación: slide desde izquierda
- Contenido:
  - Header con logo y botón X para cerrar
  - Navegación vertical con labels (no solo iconos):
    - Home (HomeIcon) → /
    - Organizations (Building) → /organizations
    - Products (Folder) → /products
    - Timeline (Clock) → disabled
  - Cada item: icono + label, hover state, active state

Control:
- Lee sidebarOpen del store
- Al click fuera o en item de nav, cierra sidebar
- Usar Sheet de @hikai/ui si disponible, o crear con Tailwind

PARTE 4: MODIFICAR app-shell.tsx
ARCHIVO: apps/webapp/src/domains/core/components/app-shell.tsx

REEMPLAZAR layout actual:
- Eliminar sidebar fijo de 64px
- Añadir AppHeader en top
- Añadir Sidebar (overlay)
- Main content: padding-top para compensar header fijo

Estructura:
<div className="min-h-screen bg-background">
  <AppHeader />
  <Sidebar />
  <main className="pt-14">
    {children}
  </main>
</div>

PARTE 5: i18n
ARCHIVOS: apps/webapp/src/i18n/locales/*/common.json

Añadir keys:
- nav.home: "Home" / "Inicio"
- nav.organizations: "Organizations" / "Organizaciones"
- nav.products: "Products" / "Productos"
- nav.timeline: "Timeline" / "Línea de tiempo"
- nav.comingSoon: "Coming soon" / "Próximamente"

PATRÓN: Ver Sheet de @hikai/ui para sidebar overlay
```

### Validación F2

```
1. Header visible en top con hamburguesa, logo, OrgSwitcher, UserMenu
2. Click hamburguesa abre sidebar con navegación
3. Click en item de nav navega y cierra sidebar
4. Click fuera del sidebar lo cierra
5. Layout responsive funciona correctamente
6. Main content tiene espacio para header fijo
```

---

## FASE 3: OrgSwitcher Mejorado

**Objetivo**: Mejorar dropdown con estructura clara y settings gear.

### Archivos a modificar

- `apps/webapp/src/domains/organizations/components/org-switcher.tsx`
- `apps/webapp/src/i18n/locales/en/organizations.json`
- `apps/webapp/src/i18n/locales/es/organizations.json`

### Prompt

```
Mejora el OrgSwitcher con nueva estructura de dropdown.

MODIFICAR: apps/webapp/src/domains/organizations/components/org-switcher.tsx

CAMBIOS EN TRIGGER:
- Antes: Solo avatar circular
- Ahora: Avatar + nombre de org + chevron down
- Usar Button variant="ghost" con flex layout
- Truncar nombre si muy largo (max-w-32 o similar)

CAMBIOS EN DROPDOWN:
Estructura nueva:

1. CURRENT ORG HEADER
   - Nombre completo de la org
   - Badge "Personal" si isPersonal
   - Settings gear icon (solo si userRole es admin/owner)
     - Click navega a /organizations/$slug/settings
   - Member count

2. SEPARATOR

3. RECENT ORGS (si hay)
   - Label: "Recientes"
   - Lista de orgs recientes (máx 5)
   - Cada item: avatar mini + nombre + badge plan
   - Al final de sección: Link "Mis Organizaciones" → /organizations

4. SEPARATOR (si hay recientes)

5. ALL OTHER ORGS
   - Label: "Todas las organizaciones" (solo si hay recientes arriba)
   - Orgs no mostradas en recientes
   - Mismo formato que recientes

6. SEPARATOR

7. CREATE NEW
   - Icono Plus + "Crear organización"
   - Navega a /organizations?create=true o abre form

i18n KEYS (organizations.json):
- switcher.settings: "Settings" / "Configuración"
- switcher.myOrganizations: "My Organizations" / "Mis Organizaciones"

PATRÓN: Mantener lógica existente de cambio de org y tracking
```

### Validación F3

```
1. Trigger muestra avatar + nombre + chevron
2. Settings gear visible solo para admin/owner
3. Settings gear navega a /organizations/$slug/settings
4. Recientes aparecen primero
5. Link "Mis Organizaciones" navega a /organizations
6. Crear organización funciona
```

---

## FASE 4: ProductSwitcher (nuevo)

**Objetivo**: Crear nuevo componente ProductSwitcher siempre visible en header.

### Archivos a crear/modificar

- `apps/webapp/src/domains/products/components/product-switcher.tsx` (crear)
- `apps/webapp/src/domains/products/components/index.ts` (modificar)
- `apps/webapp/src/domains/core/components/app-header.tsx` (modificar)
- `apps/webapp/src/i18n/locales/en/products.json` (modificar)
- `apps/webapp/src/i18n/locales/es/products.json` (modificar)

### Prompt

```
Crea ProductSwitcher y añádelo al header.

PARTE 1: CREAR product-switcher.tsx
ARCHIVO: apps/webapp/src/domains/products/components/product-switcher.tsx

Componente ProductSwitcher:

TRIGGER:
- Estilo botón (Button variant="ghost" o outline)
- Si hay producto actual: icono Folder + nombre del producto
- Si no hay producto: icono Folder + "Seleccionar producto"
- Chevron down al final
- Deshabilitado si no hay currentOrg

DROPDOWN:
1. CURRENT PRODUCT (si existe)
   - Nombre completo
   - Badge con rol (admin/member)
   - Settings gear (solo si admin) → /products/$slug/settings
   - Description truncada
   - Member count

2. SEPARATOR

3. OTHER PRODUCTS (de la org actual)
   - Label: "Otros productos"
   - Lista de productos de currentOrg (excluir actual)
   - Cada item: nombre + badge rol
   - Al final: Link "Mis Productos" → /products

4. SEPARATOR (si no hay productos en org)

5. EMPTY STATE
   - Si no hay productos en la org: "No hay productos. Crea uno."
   - Botón "Crear producto" → /products?create=true

HOOKS A USAR:
- useCurrentProduct() - producto actual
- useCurrentOrg() - org actual
- useListProducts(currentOrg._id) - productos de la org

Al seleccionar producto:
- Llamar setCurrentProduct(productId)
- Navegar a /products/$slug

PARTE 2: EXPORTAR
ARCHIVO: apps/webapp/src/domains/products/components/index.ts

Añadir: export { ProductSwitcher } from './product-switcher'

PARTE 3: INTEGRAR EN HEADER
ARCHIVO: apps/webapp/src/domains/core/components/app-header.tsx

- Importar ProductSwitcher de @/domains/products
- Añadir después de OrgSwitcher (con separador visual tipo /)
- El layout debe ser: [Hamburger] [Logo] [OrgSwitcher] / [ProductSwitcher] ... [UserMenu]

PARTE 4: i18n
ARCHIVOS: apps/webapp/src/i18n/locales/*/products.json

Añadir keys:
- switcher.title: "Product" / "Producto"
- switcher.select: "Select product" / "Seleccionar producto"
- switcher.other: "Other products" / "Otros productos"
- switcher.myProducts: "My Products" / "Mis Productos"
- switcher.empty: "No products yet" / "Sin productos aún"
- switcher.create: "Create product" / "Crear producto"
- switcher.settings: "Settings" / "Configuración"

PATRÓN: Ver org-switcher.tsx como referencia de estructura
```

### Validación F4

```
1. ProductSwitcher visible en header junto a OrgSwitcher
2. Muestra "Seleccionar producto" cuando no hay activo
3. Muestra nombre del producto cuando hay uno activo
4. Dropdown lista productos de la org actual
5. Settings gear solo visible para admin
6. Cambiar de org actualiza lista de productos
7. Seleccionar producto navega a /products/$slug
```

---

## FASE 5: UserMenu Mejorado

**Objetivo**: Añadir settings gear para profile y sección de productos recientes.

### Archivos a modificar

- `apps/webapp/src/domains/core/components/user-menu.tsx`
- `apps/webapp/src/i18n/locales/en/common.json`
- `apps/webapp/src/i18n/locales/es/common.json`

### Prompt

```
Mejora UserMenu con profile link y productos recientes.

MODIFICAR: apps/webapp/src/domains/core/components/user-menu.tsx

NUEVA ESTRUCTURA DEL DROPDOWN:

1. USER INFO HEADER
   - Avatar grande
   - Nombre del usuario
   - Email del usuario
   - Settings gear icon → Link a /profile

2. SEPARATOR

3. PREFERENCES (existente)
   - Theme submenu (Light/Dark)
   - Language submenu (English/Spanish)

4. SEPARATOR

5. RECENT PRODUCTS (nuevo)
   - Label: "Productos recientes"
   - Lista de productos recientes (usar useRecentProducts)
   - Máximo 5 items
   - Cada item: nombre + org name (si es de otra org)
   - Click navega al producto (y cambia org si es necesario)
   - Al final: Link "Mis Productos" → /products

6. SEPARATOR

7. LOGOUT (existente)
   - Icono LogOut + "Cerrar sesión"

HOOKS A AÑADIR:
- useRecentProducts() - para productos recientes

LÓGICA DE NAVEGACIÓN A PRODUCTO RECIENTE:
1. Si producto es de org diferente, primero setCurrentOrg(org._id)
2. Luego setCurrentProduct(product._id)
3. Navegar a /products/$slug

i18n KEYS (common.json):
- userMenu.profile: "Profile" / "Perfil"
- userMenu.recentProducts: "Recent Products" / "Productos recientes"
- userMenu.myProducts: "My Products" / "Mis Productos"
- userMenu.noRecentProducts: "No recent products" / "Sin productos recientes"

PATRÓN: Mantener lógica existente de theme/language
```

### Validación F5

```
1. Settings gear junto al nombre navega a /profile (404 hasta F6)
2. Productos recientes aparecen en el dropdown
3. Click en producto reciente navega correctamente
4. Si producto es de otra org, cambia org primero
5. Link "Mis Productos" navega a /products
6. Theme y Language siguen funcionando
```

---

## FASE 6: Profile Page

**Objetivo**: Crear página de perfil de usuario.

### Archivos a crear/modificar

- `apps/webapp/src/routes/profile.tsx` (crear)
- `apps/webapp/src/domains/core/components/profile-page.tsx` (crear)
- `packages/convex/convex/users.ts` (crear - si no existe)
- `apps/webapp/src/i18n/locales/en/profile.json` (crear)
- `apps/webapp/src/i18n/locales/es/profile.json` (crear)
- `apps/webapp/src/i18n/config.ts` (modificar - añadir namespace)

### Prompt

```
Crea la página de perfil de usuario.

PARTE 1: CREAR ruta
ARCHIVO: apps/webapp/src/routes/profile.tsx

Route component:
- Path: /profile
- Usa AppShell wrapper
- Renderiza ProfilePage component

PARTE 2: CREAR ProfilePage component
ARCHIVO: apps/webapp/src/domains/core/components/profile-page.tsx

Layout:
- Container centrado (max-w-2xl)
- Header con título "Profile" y back button opcional

Card "Información Personal":
- Avatar grande editable (futuro)
- Campo nombre (editable)
- Campo email (read-only, viene de auth)
- Botón guardar (si hay cambios)

Card "Métodos de Autenticación" (read-only por ahora):
- Lista de providers conectados (email, google, etc.)
- Info de cuándo se creó la cuenta
- Placeholder para futuras acciones (añadir provider, etc.)

Estados:
- Loading mientras carga user data
- Error state si falla
- Success toast al guardar

HOOKS:
- useAuth() - para datos del usuario actual
- useMutation - si hay que actualizar perfil

PARTE 3: BACKEND (si necesario)
ARCHIVO: packages/convex/convex/users.ts

Crear si no existe. Añadir:

query getCurrentUser:
- Retorna datos del usuario autenticado
- Name, email, createdAt, authMethods (si disponible)

mutation updateUserProfile:
- Args: { name?: string }
- Valida que usuario está autenticado
- Actualiza name si provided

NOTA: Convex Auth puede tener limitaciones sobre qué campos se pueden
actualizar. Verificar documentación de @convex-dev/auth.

PARTE 4: i18n
CREAR: apps/webapp/src/i18n/locales/en/profile.json
{
  "title": "Profile",
  "subtitle": "Manage your account settings",
  "personalInfo": "Personal Information",
  "name": "Name",
  "email": "Email",
  "emailReadonly": "Email cannot be changed",
  "save": "Save changes",
  "saving": "Saving...",
  "saveSuccess": "Profile updated successfully",
  "authMethods": "Authentication Methods",
  "authMethodsInfo": "Ways you can sign in to your account",
  "createdAt": "Account created",
  "backToHome": "Back to home"
}

CREAR: apps/webapp/src/i18n/locales/es/profile.json
{
  "title": "Perfil",
  "subtitle": "Gestiona la configuración de tu cuenta",
  "personalInfo": "Información Personal",
  "name": "Nombre",
  "email": "Correo electrónico",
  "emailReadonly": "El correo no se puede cambiar",
  "save": "Guardar cambios",
  "saving": "Guardando...",
  "saveSuccess": "Perfil actualizado correctamente",
  "authMethods": "Métodos de Autenticación",
  "authMethodsInfo": "Formas en que puedes iniciar sesión",
  "createdAt": "Cuenta creada",
  "backToHome": "Volver al inicio"
}

PARTE 5: REGISTRAR namespace
ARCHIVO: apps/webapp/src/i18n/config.ts

Añadir 'profile' al array de namespaces

PATRÓN: Ver organizations settings page como referencia de layout
```

### Validación F6

```
1. Navegar a /profile muestra la página
2. Datos del usuario se cargan correctamente
3. Nombre es editable
4. Email es read-only
5. Guardar actualiza el nombre (si backend implementado)
6. Toast de éxito al guardar
7. i18n funciona en ambos idiomas
```

---

## FASE 7: Product Settings Page

**Objetivo**: Crear página de settings de producto similar a org settings.

### Archivos a crear/modificar

- `apps/webapp/src/routes/products/$slug_.settings.tsx` (crear)
- `apps/webapp/src/domains/products/components/delete-product-dialog.tsx` (verificar existe)
- `apps/webapp/src/i18n/locales/en/products.json` (modificar)
- `apps/webapp/src/i18n/locales/es/products.json` (modificar)

### Prompt

```
Crea la página de settings de producto.

PARTE 1: CREAR ruta
ARCHIVO: apps/webapp/src/routes/products/$slug_.settings.tsx

ESTRUCTURA (similar a organizations/$slug_.settings.tsx):

Route component:
- Path: /products/$slug/settings
- Usa AppShell wrapper
- Obtiene producto por slug con useGetProductBySlug

Access Control:
- Solo admins del producto pueden ver esta página
- Redirect a /products/$slug si no es admin

Layout:
- Header con back button + icono Settings + "Product Settings"
- Subtítulo con nombre del producto

Card "General Settings":
- Campo nombre (editable)
- Campo slug (read-only, font-mono)
- Campo descripción (textarea editable)
- Info: member count, created at
- Tu rol en el producto
- Botón guardar cambios

Card "Danger Zone" (solo para admins):
- Delete Product section
- Botón destructive que abre DeleteProductDialog

Estados:
- Loading
- Not found (producto no existe o sin acceso)
- Redirect si no es admin

HOOKS:
- useGetProductBySlug(currentOrg._id, slug)
- useUpdateProduct()
- useCurrentOrg()

PARTE 2: VERIFICAR DeleteProductDialog
ARCHIVO: apps/webapp/src/domains/products/components/delete-product-dialog.tsx

Verificar que existe y funciona. Debe:
- Pedir confirmación escribiendo el nombre del producto
- Llamar deleteProduct mutation
- Navegar a /products después de eliminar

PARTE 3: i18n
ARCHIVOS: apps/webapp/src/i18n/locales/*/products.json

Añadir keys:
- settings.title: "Product Settings" / "Configuración del Producto"
- settings.general.title: "General" / "General"
- settings.general.description: "Basic product information" / "Información básica del producto"
- settings.name: "Name" / "Nombre"
- settings.slug: "Slug" / "Slug"
- settings.slugReadonly: "Slug cannot be changed" / "El slug no se puede cambiar"
- settings.description: "Description" / "Descripción"
- settings.members: "Members" / "Miembros"
- settings.createdAt: "Created" / "Creado"
- settings.yourRole: "Your role" / "Tu rol"
- settings.save: "Save changes" / "Guardar cambios"
- settings.saveSuccess: "Product updated successfully" / "Producto actualizado correctamente"
- settings.dangerZone.title: "Danger Zone" / "Zona de Peligro"
- settings.dangerZone.description: "Irreversible actions" / "Acciones irreversibles"
- delete.title: "Delete Product" / "Eliminar Producto"
- delete.description: "Once deleted, all data will be permanently removed" / "Una vez eliminado, todos los datos se perderán permanentemente"

PATRÓN: Usar organizations/$slug_.settings.tsx como referencia directa
```

### Validación F7

```
1. Navegar a /products/$slug/settings muestra la página
2. Solo admins pueden acceder (redirect para otros)
3. Nombre y descripción son editables
4. Slug es read-only
5. Guardar actualiza el producto
6. Danger Zone visible solo para admins
7. Delete product funciona con confirmación
```

---

## Archivos Críticos

| Archivo | Rol |
|---------|-----|
| `apps/webapp/src/domains/core/store/core-slice.ts` | Estado global - añadir currentProductId, sidebarOpen |
| `apps/webapp/src/domains/core/components/app-shell.tsx` | Layout principal - transformación completa |
| `apps/webapp/src/domains/core/components/app-header.tsx` | Nuevo header horizontal (crear) |
| `apps/webapp/src/domains/core/components/sidebar.tsx` | Sidebar colapsable (crear) |
| `apps/webapp/src/domains/organizations/components/org-switcher.tsx` | Mejorar dropdown |
| `apps/webapp/src/domains/products/components/product-switcher.tsx` | Nuevo componente (crear) |
| `apps/webapp/src/domains/core/components/user-menu.tsx` | Añadir profile + recientes |
| `apps/webapp/src/routes/profile.tsx` | Nueva ruta (crear) |
| `apps/webapp/src/routes/products/$slug_.settings.tsx` | Nueva ruta (crear) |

---

## Resumen de Fases

| Fase | Backend | Frontend | Validación |
|------|---------|----------|------------|
| F1 | - | store + hook | currentProductId persiste y sincroniza |
| F2 | - | header + sidebar | Layout funciona, nav operativa |
| F3 | - | org-switcher mejorado | Settings gear, recientes |
| F4 | - | product-switcher | Siempre visible, funcional |
| F5 | - | user-menu mejorado | Profile link, productos recientes |
| F6 | users.ts (opcional) | profile page | Formulario funciona |
| F7 | - | product settings | CRUD producto completo |

---

## Próximo Paso

Ejecutar F1 con el prompt correspondiente.
