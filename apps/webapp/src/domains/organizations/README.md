# Organizations Domain

Gestión de organizaciones (tenants) en Hikai.

## Estructura

```
organizations/
├── components/
│   ├── org-switcher.tsx              # Selector de org en header
│   ├── org-members.tsx               # Gestión de miembros
│   ├── organization-list.tsx         # Lista de orgs
│   ├── create-organization-form.tsx  # Formulario de creación
│   ├── transfer-ownership-dialog.tsx # Dialog para transferir propiedad
│   └── delete-organization-dialog.tsx # Dialog para eliminar org
├── hooks/
│   ├── use-current-org.ts            # Hook principal para org actual
│   └── use-organizations-simple.ts   # Hooks de queries/mutations
└── index.ts
```

## Hooks

### useCurrentOrg

Hook principal para gestionar la organización actual:

```tsx
const { currentOrg, organizations, isLoading, setCurrentOrg } = useCurrentOrg();
```

- `currentOrg`: Organización seleccionada con detalles
- `organizations`: Lista de orgs del usuario
- `isLoading`: Estado de carga
- `setCurrentOrg(orgId)`: Cambiar org actual

El estado persiste en localStorage y sincroniza entre pestañas.

## Backend

Convex queries/mutations en `packages/convex/convex/organizations/`:

- `getUserOrganizationsWithDetails`: Orgs del usuario con memberCount
- `getPersonalOrg`: Obtiene org personal
- `canCreateOrganization`: Verifica límites del plan
- `createOrganization`: Crea org (valida límites)
- `createPersonalOrg`: Internal mutation para org personal automática
- `getRecentOrganizations`: Últimas 5 orgs accedidas
- `transferOwnership`: Transfiere propiedad a otro miembro
- `deleteOrganization`: Elimina org (solo owner, no personal)

Tracking de acceso en `packages/convex/convex/userPreferences.ts`:
- `updateLastOrgAccess`: Registra acceso a una org

## Rutas

- `/organizations` - Lista de organizaciones del usuario
- `/organizations/$slug` - Detalle de organización
- `/organizations/$slug/settings` - Configuración (solo admin/owner)

## Límites

Definidos en `packages/convex/convex/lib/planLimits.ts`.

**Nota**: Ya no hay límite de organizaciones por usuario. Cada org tiene su propio plan.

| Plan | Productos/org | Miembros/org | Tipo |
|------|---------------|--------------|------|
| Free | 1 | 5 | Solo org personal |
| Pro | 10 | 50 | Orgs profesionales |
| Enterprise | ∞ | ∞ | Orgs profesionales |
