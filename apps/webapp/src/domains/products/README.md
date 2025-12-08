# Products Domain

Gestión de productos dentro de organizaciones.

## Estructura

```
products/
├── components/
│   ├── product-list.tsx          # Lista de productos de org actual
│   ├── product-card.tsx          # Card individual con link a detalle
│   ├── create-product-form.tsx   # Formulario crear producto
│   ├── product-members.tsx       # Gestión de miembros
│   ├── delete-product-dialog.tsx # Confirmación tipo GitHub
│   └── product-switcher.tsx      # Selector de producto en header
├── hooks/
│   ├── use-products.ts           # Wrappers queries/mutations
│   └── use-current-product.ts    # Hook para producto actual
└── index.ts
```

## Hooks

### Queries

```tsx
// Lista productos de una org
const products = useListProducts(organizationId);

// Producto por ID
const product = useGetProduct(productId);

// Producto por slug (para rutas)
const product = useGetProductBySlug(organizationId, slug);

// Todos los productos del usuario
const products = useUserProducts();

// Verificar si puede crear
const canCreate = useCanCreateProduct(organizationId);

// Miembros del producto
const members = useProductMembers(productId);

// Miembros de org disponibles para añadir
const available = useAvailableOrgMembers(productId);

// Productos recientes (cross-org)
const recent = useRecentProducts();
```

### useCurrentProduct

Hook para gestionar el producto actualmente seleccionado:

```tsx
const { currentProduct, isLoading, setCurrentProduct } = useCurrentProduct();
```

- `currentProduct`: Producto seleccionado con detalles
- `isLoading`: Estado de carga
- `setCurrentProduct(productId)`: Cambiar producto actual (también trackea acceso)

El estado persiste en localStorage y sincroniza entre pestañas.

### Mutations

```tsx
const createProduct = useCreateProduct();
const updateProduct = useUpdateProduct();
const deleteProduct = useDeleteProduct();
const addMember = useAddProductMember();
const removeMember = useRemoveProductMember();
const updateRole = useUpdateProductMemberRole();
const updateLastAccess = useUpdateLastProductAccess();
```

## Backend

Convex queries/mutations en `packages/convex/convex/products/`:

### Queries
- `listProducts(organizationId)` - productos con memberCount
- `getProduct(productId)` - producto + org info + userRole
- `getProductBySlug(organizationId, slug)` - para rutas por slug
- `getUserProducts()` - productos donde es miembro
- `canCreateProduct(organizationId)` - validación límites
- `getProductMembers(productId)` - miembros con info de usuario
- `getAvailableOrgMembers(productId)` - miembros de org no en producto
- `getRecentProducts()` - últimos 5 productos accedidos (cross-org)

Tracking de acceso en `packages/convex/convex/userPreferences.ts`:
- `updateLastProductAccess(productId)` - registra acceso al producto

### Mutations
- `createProduct` - crea producto + membership admin
- `updateProduct` - editar nombre/descripción
- `deleteProduct` - eliminar producto + memberships
- `addProductMember` - añadir miembro (validar org membership)
- `removeProductMember` - eliminar (admin o self, no último admin)
- `updateProductMemberRole` - cambiar rol (no degradar último admin)

## Rutas

- `/products` - Lista de productos de org actual
- `/settings/products` - Mis productos (cards con acciones)
- `/settings/product/$slug/general` - Configuración general (solo admin)
- `/settings/product/$slug/team` - Gestión de equipo (solo admin)

## Seguridad

**CRÍTICO**: Todas las operaciones usan helpers de `lib/access.ts`:
- `assertOrgAccess` para operaciones a nivel org
- `assertProductAccess` para operaciones a nivel producto
- Membresía a producto requiere membresía previa a org
- Límites por plan en `lib/planLimits.ts`

## Límites

| Plan | Productos/Org |
|------|---------------|
| free | 1 |
| pro | 10 |
| enterprise | ∞ |
