# Plan: Sistema de Tenants/Organizaciones - Hikai Webapp

## Progreso

| Fase                                | Estado        |
| ----------------------------------- | ------------- |
| F0: Schema + Seguridad              | ✅ Completado |
| F1: Orgs + OrgSwitcher + PlanLimits | ✅ Completado |
| F2: Products CRUD                   | ⏳ Pendiente  |
| F3: Trazabilidad                    | ⏳ Pendiente  |
| F4: Transfer Ownership              | ⏳ Pendiente  |

**Leyenda**: ⏳ Pendiente | 🔄 En progreso | ✅ Completado

## Prompt para arrancar cada fase

- En apps/webapp/webapp-plans/hikai-organization.md puedes ver el plan de implementación del modelo de tenants de Hikai
- Vamos a proceder con la fase siguiente fase pendiente de ejecutar
- Analiza el documento y el plan y toma el prompt de esa fase como instrucción para implementarla
- Cuando tengas un plan para ello compartelo conmigo para validarlo
- No hagas asunciones, comparteme dudas y las debatimos
- Este proyecto genera consideraciones de seguridad clave para la app, asegura que los ficheros CLAUDE.md y README.md incluyen estas consideraciones en sus instrucciones para tenerlas en cuenta en cualquier desarrollo.
- Máxima capacidad de ultrathink

---

## Resumen

Plan de implementación incremental para el modelo de tenants descrito. El enfoque es **schema-first**: definir todo el modelo de datos primero, luego implementar funcionalidad progresivamente.

---

## Modelo de Tenants

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

## Estado Inicial

### Backend (Convex)

- `users` - tabla de auth (automática)
- `organizations` - name, slug, description, ownerId, timestamps
- `organizationMembers` - role (owner/admin/member), joinedAt

### Frontend (Webapp)

- Domains: auth, core, organizations
- Store: theme, locale (localStorage)
- Componentes: OrganizationList, CreateOrganizationForm

### Producción

- Hikai actualmente NO ES PRODUCTIVO
- No es necesario considerar posibles regresiones al realizar cambios

### Lo que FALTA

| Tabla/Campo               | Estado                             |
| ------------------------- | ---------------------------------- |
| users.last\_\*\_access_at | No existe (se usa userPreferences) |
| organizations.plan        | No existe                          |
| organizations.isPersonal  | No existe                          |
| products                  | No existe                          |
| productMembers            | No existe                          |
| orgMembers.lastAccessAt   | No existe                          |

---

## Fases de Implementación

```
F0: Schema ──► F1: Orgs mejoradas + OrgSwitcher ──► F2: Products CRUD ──► F3: Trazabilidad ──► F4: Avanzado
     │                      │                              │                    │                   │
     └──────────────────────┴──────────────────────────────┴────────────────────┴───────────────────┘
                                  Cada fase incluye UI para validación funcional
```

**Principio**: Cada fase debe tener UI suficiente para pruebas manuales de validación.

---

## Instrucciones Generales (aplicar en TODAS las fases)

### Actualizar Progreso

- Al completar cada fase, actualizar la tabla de **Progreso** al inicio de este documento
- Marcar la fase completada con ✅
- Si hay notas relevantes de la implementación, añadirlas brevemente

### Reglas del Repo

- Asegurar cumplimiento de reglas y principios en `CLAUDE.md`
- Seguir patrones de arquitectura establecidos (dominios, hooks, stores)
- Asegurar el cumplimiento de los principios definidos en README.md
- Revisar que no hay errores de TS ni Lint en ningún fichero modificado

### Commits

- Un commit por fase completada
- **NO realizar commit** hasta que el usuario confirme que las pruebas funcionales son OK
- Formato: `feat(webapp): [F#] descripción breve`

### Documentación Funcional (para usuarios)

- Crear carpeta `apps/webapp/doc/` (si no existe)
- Por cada funcionalidad implementada, crear/actualizar doc en `apps/webapp/doc/`
- Formato: **MUY CONCISO y sintético**
- Enfoque: explicar a usuarios cómo funciona Hikai (no técnico)

### Documentación Técnica (para devs)

- Cada dominio debe tener `README.md` en su raíz
- Contenido **MUY CONCISO**:
  - Qué hace el dominio
  - Estructura de archivos
  - Variables de entorno requeridas
  - Settings necesarios
  - Procesos/servicios dependientes
- Actualizar `apps/webapp/README.md` con enlaces a READMEs de dominios

### Estructura de Documentación

```
apps/webapp/
├── doc/                          # Documentación funcional (usuarios)
│   ├── organizations.md          # Cómo funcionan las organizaciones
│   └── products.md               # Cómo funcionan los productos
├── src/domains/
│   ├── auth/README.md            # Doc técnica auth
│   ├── core/README.md            # Doc técnica core
│   ├── organizations/README.md   # Doc técnica organizations
│   └── products/README.md        # Doc técnica products
└── README.md                     # Principal con enlaces a dominios
```

---

## FASE 0: Schema Completo + Helpers de Seguridad

**Objetivo**: Definir el schema que soporte todo el modelo + helpers centralizados de acceso para garantizar seguridad consistente.

### Archivos a modificar/crear

- `packages/convex/convex/schema.ts`
- `packages/convex/convex/lib/access.ts` (crear)

### Prompt

```
Actualiza el schema de Convex y crea helpers de seguridad centralizados.

PARTE 1: SCHEMA
ARCHIVO: packages/convex/convex/schema.ts

CAMBIOS:

1. AÑADIR tabla userPreferences:
   - userId: v.id("users")
   - lastOrgAccessAt: v.optional(v.number())
   - lastProductAccessAt: v.optional(v.number())
   - lastActiveOrgId: v.optional(v.id("organizations"))
   - lastActiveProductId: v.optional(v.id("products"))
   - Índice: by_user ["userId"]

2. MODIFICAR tabla organizations:
   AÑADIR campos:
   - plan: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise"))
   - isPersonal: v.boolean()
   AÑADIR índice:
   - by_owner_personal: ["ownerId", "isPersonal"]

3. MODIFICAR tabla organizationMembers:
   AÑADIR campo:
   - lastAccessAt: v.optional(v.number())

4. AÑADIR tabla products:
   - organizationId: v.id("organizations")
   - name: v.string()
   - slug: v.string()
   - description: v.optional(v.string())
   - createdAt: v.number()
   - updatedAt: v.number()
   Índices:
   - by_organization: ["organizationId"]
   - by_organization_slug: ["organizationId", "slug"]

5. AÑADIR tabla productMembers:
   - productId: v.id("products")
   - userId: v.id("users")
   - role: v.union(v.literal("admin"), v.literal("member"))
   - joinedAt: v.number()
   - lastAccessAt: v.optional(v.number())
   Índices:
   - by_product: ["productId"]
   - by_user: ["userId"]
   - by_product_user: ["productId", "userId"]

IMPORTANTE:
- Los campos plan e isPersonal son REQUERIDOS (no hay datos legacy)
- Si hay datos de prueba, borrarlos antes de migrar schema
- Mantener índices existentes

PARTE 2: HELPERS DE SEGURIDAD
CREAR: packages/convex/convex/lib/access.ts

Helpers centralizados para verificar acceso. CRÍTICO para seguridad.

1. assertOrgAccess(ctx, organizationId)
   - Obtener userId del contexto autenticado
   - Verificar que existe membership en organizationMembers
   - Si no es miembro: throw new Error("No tienes acceso a esta organización")
   - Retorna: { membership, organization }

2. assertProductAccess(ctx, productId)
   - Obtener userId del contexto autenticado
   - Verificar que existe membership en productMembers
   - Si no es miembro: throw new Error("No tienes acceso a este producto")
   - Retorna: { membership, product, organization }

3. getOrgMembership(ctx, organizationId)
   - Versión que retorna null en lugar de throw si no es miembro
   - Para casos donde queremos verificar sin error

4. getProductMembership(ctx, productId)
   - Versión que retorna null en lugar de throw

NOTA: Estos helpers se usarán en TODAS las queries/mutations que accedan
a datos de org o producto. Es la base de la seguridad multi-tenant.

APLICAR INSTRUCCIONES GENERALES:
- Commit: NO realizar hasta validación OK
- Doc técnica: No aplica (solo schema y lib)
```

### Validación F0

```
1. Ejecutar `pnpm --filter @hikai/convex dev` - debe compilar sin errores
2. Verificar en Convex Dashboard que aparecen las nuevas tablas vacías
3. Las queries existentes de organizations deben seguir funcionando
4. Verificar que lib/access.ts exporta los helpers correctamente
```

---

## FASE 1: Organizaciones Mejoradas + OrgSwitcher + Plan Limits

**Objetivo**: Añadir plan/isPersonal, crear org personal automáticamente al registro, UI para cambiar de org, sistema de límites por plan.

### Archivos a modificar/crear

- `packages/convex/convex/lib/planLimits.ts` (crear)
- `packages/convex/convex/organizations.ts` (modificar)
- `packages/convex/convex/auth.ts` (modificar para hook post-registro)
- `apps/webapp/src/domains/core/store/core-slice.ts` (añadir currentOrgId)
- `apps/webapp/src/store/index.ts` (añadir persistencia currentOrgId)
- `apps/webapp/src/domains/organizations/hooks/use-current-org.ts` (crear)
- `apps/webapp/src/domains/organizations/components/org-switcher.tsx` (crear)
- `apps/webapp/src/domains/core/components/app-shell.tsx` (integrar OrgSwitcher)

### Prompt Backend

```
Mejora organizaciones con plan, isPersonal, org personal automática y sistema de límites.

PARTE 0: CREAR packages/convex/convex/lib/planLimits.ts

Sistema centralizado de límites por plan y verificación de features.

export const PLAN_LIMITS = {
  free: { maxOrganizations: 1, maxProductsPerOrg: 1, maxMembersPerOrg: 5 },
  pro: { maxOrganizations: 5, maxProductsPerOrg: 10, maxMembersPerOrg: 50 },
  enterprise: { maxOrganizations: Infinity, maxProductsPerOrg: Infinity, maxMembersPerOrg: Infinity },
};

export const PLAN_FEATURES = {
  free: ['basic_analytics'],
  pro: ['basic_analytics', 'advanced_analytics', 'team_collaboration', 'api_access'],
  enterprise: ['basic_analytics', 'advanced_analytics', 'team_collaboration', 'api_access', 'custom_integrations', 'sso'],
};

Helpers:
1. getPlanLimits(plan): retorna límites del plan
2. checkLimit(plan, resource, current): { allowed, limit, current, remaining }
3. canAccessFeature(plan, feature): boolean
4. getAvailableFeatures(plan): string[]

PARTE 1: MODIFICAR packages/convex/convex/organizations.ts

ACTUALIZAR createOrganization:
- Añadir args opcionales:
  - isPersonal: v.optional(v.boolean()) default false
  - plan: v.optional(v.union(...)) default "free"
- Nueva validación (solo si isPersonal=false):
  - Plan free: máx 1 org no-personal por usuario
  - Contar orgs del usuario donde isPersonal=false
  - Si ya tiene 1+, lanzar error

NUEVAS QUERIES:

1. getPersonalOrg
   - Sin args
   - Query índice by_owner_personal donde isPersonal=true
   - Retorna org o null

2. canCreateOrganization
   - Sin args
   - Cuenta orgs no-personales del usuario
   - Límites: free=1, pro=5, enterprise=unlimited
   - Retorna: { canCreate, reason?, currentCount, maxAllowed }

3. getUserOrganizationsWithDetails
   - Sin args
   - Retorna orgs con: ...data, role, isPersonal, plan, memberCount

PARTE 2: CREAR internal mutation createPersonalOrg

En packages/convex/convex/organizations.ts o archivo separado:

internalMutation createPersonalOrg:
- Args: { userId, email, name? }
- Verificar que no existe org personal
- Generar slug desde email (parte antes de @, sanitizado)
- Si slug existe, añadir sufijo numérico
- Crear org: name=name||email, isPersonal=true, plan="free"
- Crear membership como owner
- Retorna: organizationId

PARTE 3: INTEGRAR con auth

Convex Auth permite callbacks. En auth.ts, usar callback afterUserCreated
para llamar createPersonalOrg cuando se registra un nuevo usuario.

APLICAR INSTRUCCIONES GENERALES (ver sección arriba)
```

### Prompt Frontend

```
Implementa selector de organización y estado de org actual.

PARTE 1: ACTUALIZAR domains/core/store/core-slice.ts

Añadir:
- currentOrgId: string | null
- setCurrentOrgId: (id: string | null) => void

PARTE 2: ACTUALIZAR store/index.ts

- Añadir currentOrgId a partialize para persistencia
- Añadir al listener de storage sync

PARTE 3: CREAR domains/organizations/hooks/use-current-org.ts

Hook useCurrentOrg:
1. Lee currentOrgId del store
2. Fetch org data con useQuery(api.organizations.getUserOrganizationsWithDetails)
3. Si currentOrgId es null y hay orgs, usar la primera (personal)
4. Retorna: { currentOrg, isLoading, setCurrentOrg, organizations }

PARTE 4: CREAR domains/organizations/components/org-switcher.tsx

Componente para sidebar:
- Muestra org actual (nombre + badge plan si no es free)
- Dropdown con lista de orgs del usuario
- Cada org: nombre, rol, badge si personal
- Separador + "Crear organización" (si canCreate)
- Al seleccionar: llama setCurrentOrg

Usar: DropdownMenu de @hikai/ui, Badge, Building icon

PARTE 5: INTEGRAR en app-shell.tsx

Reemplazar logo "H" con OrgSwitcher en sección superior del sidebar.

PATRÓN: Ver user-menu.tsx para dropdown, use-theme.ts para hook con store

APLICAR INSTRUCCIONES GENERALES:
- Commit: NO realizar hasta validación OK
- Doc funcional: apps/webapp/doc/organizations.md (cómo funcionan las orgs)
- Doc técnica: apps/webapp/src/domains/organizations/README.md
- Actualizar: apps/webapp/README.md con enlace al README de organizations
```

### Validación F1

```
1. Registrar nuevo usuario → debe crearse org personal automáticamente
2. Login → OrgSwitcher muestra la org personal del usuario
3. Crear nueva org → aparece en OrgSwitcher, respetar límite plan free (1 org extra)
4. Cambiar de org en dropdown → el estado persiste (reload página)
5. Multi-pestaña: cambiar org en una pestaña actualiza las demás
```

---

## FASE 2: Products CRUD

**Objetivo**: Gestión completa de productos dentro de organizaciones.

### Archivos a crear

- `packages/convex/convex/products.ts`
- `apps/webapp/src/domains/products/` (estructura completa)
- `apps/webapp/src/routes/products.tsx`
- `apps/webapp/src/routes/products.$productId.tsx`

### Prompt Backend

```
Implementa CRUD de productos en Convex.

CREAR: packages/convex/convex/products.ts

QUERIES:

1. listProducts
   - Args: { organizationId }
   - Validación: usuario es miembro de org
   - Retorna: productos con memberCount

2. getProduct
   - Args: { productId }
   - Validación: usuario es miembro del producto
   - Retorna: producto con org info

3. getProductBySlug
   - Args: { organizationId, slug }
   - Retorna: producto o null

4. getUserProducts
   - Sin args
   - Retorna: productos donde usuario es miembro, con org info y role

5. canCreateProduct
   - Args: { organizationId }
   - Límites: free=1/org, pro=10, enterprise=unlimited
   - Retorna: { canCreate, reason?, currentCount, maxAllowed }

MUTATIONS:

1. createProduct
   - Args: { organizationId, name, slug, description? }
   - Validaciones: admin/owner de org, slug único, límite no excedido
   - Crear producto + membership admin para creador

2. updateProduct
   - Args: { productId, name?, description? }
   - Validación: admin del producto

3. deleteProduct
   - Args: { productId }
   - Eliminar productMembers + producto

4. addProductMember
   - Args: { productId, userId, role }
   - Validaciones: requester admin, target miembro de org padre, no duplicado

5. removeProductMember
   - Args: { productId, userId }
   - Validaciones: admin o self-removal, no último admin

6. updateProductMemberRole
   - Args: { productId, userId, role }
   - No degradar último admin

PATRÓN: Ver organizations.ts

APLICAR INSTRUCCIONES GENERALES (ver sección arriba)
```

### Prompt Frontend

```
Implementa dominio de productos en frontend.

PARTE 1: CREAR estructura domains/products/

domains/products/
├── components/
│   ├── index.ts
│   ├── product-list.tsx
│   ├── create-product-form.tsx
│   ├── product-card.tsx
│   └── product-members.tsx
├── hooks/
│   ├── index.ts
│   └── use-products.ts
└── index.ts

PARTE 2: HOOKS (use-products.ts)

Wrappers para queries/mutations:
- useListProducts(organizationId)
- useGetProduct(productId)
- useUserProducts()
- useCanCreateProduct(organizationId)
- useCreateProduct()
- useUpdateProduct()
- useDeleteProduct()
- useAddProductMember()
- useRemoveProductMember()

PARTE 3: COMPONENTES

product-list.tsx:
- Grid de ProductCard
- Botón "Crear producto" si canCreate
- Loading/empty states

create-product-form.tsx:
- Form: name, slug (auto), description
- Validación slug único

product-card.tsx:
- Nombre, slug, descripción truncada, memberCount
- Badge rol, click navega a detalle

product-members.tsx:
- Lista de miembros del producto
- Añadir/eliminar si es admin
- Cambiar roles

PARTE 4: RUTAS

routes/products.tsx:
- ProductList de org actual (useCurrentOrg)
- Wrapper AppShell

routes/products.$productId.tsx:
- Detalle producto con tabs: Overview, Members

PARTE 5: ACTUALIZAR app-shell.tsx

Añadir Products a navegación (icono Folder)

PATRÓN: Ver organization-list.tsx

APLICAR INSTRUCCIONES GENERALES:
- Commit: NO realizar hasta validación OK
- Doc funcional: apps/webapp/doc/products.md (cómo funcionan los productos)
- Doc técnica: apps/webapp/src/domains/products/README.md
- Actualizar: apps/webapp/README.md con enlace al README de products
```

### Validación F2

```
1. Navegar a /products → lista vacía con botón "Crear producto"
2. Crear producto → aparece en lista, URL es /products/{id}
3. Plan free: solo 1 producto por org, botón deshabilitado si ya existe
4. Click en producto → página detalle con info + miembros
5. Añadir miembro (debe ser miembro de la org) → aparece en lista
6. Eliminar producto → desaparece de lista
7. Cambiar de org en OrgSwitcher → ProductList se actualiza
```

---

## FASE 3: Trazabilidad

**Objetivo**: Tracking de último acceso y queries de "recientes".

### Archivos a crear/modificar

- `packages/convex/convex/userPreferences.ts` (crear)
- `packages/convex/convex/organizations.ts` (añadir queries)
- `packages/convex/convex/products.ts` (añadir queries)
- `apps/webapp/src/domains/organizations/components/org-switcher.tsx` (modificar)
- `apps/webapp/src/domains/products/components/product-list.tsx` (modificar)

### Prompt Backend

```
Implementa trazabilidad y queries de recientes.

PARTE 1: CREAR packages/convex/convex/userPreferences.ts

MUTATIONS:

1. updateLastOrgAccess
   Args: { organizationId }
   Acciones:
   - Upsert userPreferences: lastOrgAccessAt=now, lastActiveOrgId=orgId
   - Update organizationMembers: lastAccessAt=now

2. updateLastProductAccess
   Args: { productId }
   Acciones:
   - Upsert userPreferences: lastProductAccessAt=now, lastActiveProductId=productId
   - Update productMembers: lastAccessAt=now

PARTE 2: AÑADIR a organizations.ts

QUERY getRecentOrganizations:
- Sin args
- Memberships del usuario con lastAccessAt != null
- Ordenar DESC por lastAccessAt
- Limitar a 5
- Retornar orgs con role y lastAccessAt

PARTE 3: AÑADIR a products.ts

QUERY getRecentProducts:
- Sin args
- ProductMembers del usuario con lastAccessAt != null
- Ordenar DESC por lastAccessAt
- Limitar a 5
- Retornar productos con org info y role

APLICAR INSTRUCCIONES GENERALES (ver sección arriba)
```

### Prompt Frontend

```
Integra trazabilidad en UI existente.

PARTE 1: ACTUALIZAR use-current-org.ts

- Al cambiar de org, llamar mutation updateLastOrgAccess

PARTE 2: ACTUALIZAR org-switcher.tsx

- Fetch getRecentOrganizations
- Si hay recientes, mostrar sección "Recientes" arriba
- Separador visual
- Sección "Todas las organizaciones" abajo

PARTE 3: CREAR hook useRecentProducts

- Wrapper de getRecentProducts query

PARTE 4: ACTUALIZAR product-list.tsx

- Si hay productos recientes, mostrar sección "Recientes" arriba
- Cuando se accede a un producto, llamar updateLastProductAccess

APLICAR INSTRUCCIONES GENERALES:
- Commit: NO realizar hasta validación OK
- Doc funcional: Actualizar apps/webapp/doc/organizations.md y products.md con sección "Recientes"
- Doc técnica: Actualizar READMEs de organizations y products
```

### Validación F3

```
1. Cambiar de org varias veces → las recientes aparecen primero en dropdown
2. Acceder a varios productos → aparecen en sección "Recientes"
3. Verificar en Convex Dashboard que lastAccessAt se actualiza
4. Multi-pestaña: acceder en una pestaña actualiza recientes en otra
```

---

## FASE 4: Transfer Ownership + Org Settings

**Objetivo**: Transferencia de propiedad de organización y página de configuración.

### Archivos a crear/modificar

- `packages/convex/convex/organizations.ts` (añadir mutation transferOwnership)
- `apps/webapp/src/domains/organizations/components/transfer-ownership-dialog.tsx` (crear)
- `apps/webapp/src/routes/organizations.$orgId.settings.tsx` (crear)

### Prompt

```
Implementa transferencia de ownership y página de settings de organización.

PARTE 1: NUEVA MUTATION transferOwnership

En packages/convex/convex/organizations.ts:

Args: { organizationId, newOwnerId }
Validaciones:
- Usar assertOrgAccess para verificar acceso
- Requester es owner actual (verificar role en membership)
- newOwner es miembro de org
- Org no es personal (isPersonal !== true)
Acciones:
- Patch org: ownerId = newOwnerId
- Patch membership owner actual: role = "admin"
- Patch membership nuevo owner: role = "owner"

PARTE 2: FRONTEND - TransferOwnershipDialog

Dialog con:
- Select de miembros elegibles (excluir current user)
- Warning explicando pérdida de ownership
- Botones: Transferir (destructive), Cancelar

PARTE 3: RUTA org settings

routes/organizations.$orgId.settings.tsx:
- Info general de la org (nombre, slug, plan, memberCount)
- Sección "Danger Zone" solo si owner y no personal
- Botón para abrir TransferOwnershipDialog

APLICAR INSTRUCCIONES GENERALES:
- Commit: NO realizar hasta validación OK
- Doc funcional: Actualizar apps/webapp/doc/organizations.md con sección "Transferir propiedad"
- Doc técnica: Actualizar README de organizations
```

### Validación F4

```
1. Ir a /organizations/{id}/settings como owner
2. Sección "Danger Zone" visible (no visible si no es owner o es personal)
3. Click transferir → dialog con lista de miembros
4. Transferir a otro usuario → owner actual pasa a admin
5. Verificar que nuevo owner tiene permisos de owner
```

---

## Archivos Críticos

| Archivo                                                 | Rol                                                |
| ------------------------------------------------------- | -------------------------------------------------- |
| `packages/convex/convex/schema.ts`                      | Schema base - define toda la estructura            |
| `packages/convex/convex/lib/access.ts`                  | Helpers seguridad - CRÍTICO para multi-tenant (F0) |
| `packages/convex/convex/lib/planLimits.ts`              | Límites y features por plan (F1)                   |
| `packages/convex/convex/organizations.ts`               | Lógica core de orgs a extender                     |
| `packages/convex/convex/products.ts`                    | Lógica de productos (crear F2)                     |
| `packages/convex/convex/userPreferences.ts`             | Trazabilidad (crear F3)                            |
| `apps/webapp/src/domains/core/store/core-slice.ts`      | Estado global - añadir currentOrgId                |
| `apps/webapp/src/domains/core/components/app-shell.tsx` | Layout - integrar OrgSwitcher                      |
| `apps/webapp/src/domains/organizations/hooks/`          | Patrón de hooks a seguir                           |

---

## Resumen de Fases

| Fase   | Backend                            | Frontend                  | Validación                                  |
| ------ | ---------------------------------- | ------------------------- | ------------------------------------------- |
| **F0** | Schema (5 tablas) + lib/access.ts  | -                         | Convex compila, helpers exportan            |
| **F1** | Orgs + org personal + planLimits   | OrgSwitcher, currentOrgId | Registro crea org, límites funcionan        |
| **F2** | Products CRUD (usa access helpers) | domain products/, rutas   | CRUD completo, seguridad verificada         |
| **F3** | Trazabilidad                       | Recientes en UI           | lastAccessAt actualiza, recientes ordenados |
| **F4** | Transfer ownership                 | Dialog, org settings      | Transfer funciona                           |

---

## Decisiones Tomadas

1. **Preferencias usuario**: Mantener en localStorage (no Convex)
2. **Alcance**: Backend + UI en cada fase para validación
3. **Org personal**: Automática al registro
4. **Orden**: Schema-first, luego incremental con UI testeable
5. **userPreferences**: Tabla separada para no modificar authTables
6. **Seguridad centralizada (F0)**: lib/access.ts con helpers assertOrgAccess/assertProductAccess
7. **Plan limits centralizado (F1)**: lib/planLimits.ts con checkLimit y canAccessFeature

---

## Próximo Paso

El plan está listo. Para ejecutar F0, usar el prompt correspondiente.
