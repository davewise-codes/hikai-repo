# Organizations Domain

Gestión de organizaciones (tenants) en Hikai.

## Estructura

```
organizations/
├── components/
│   ├── org-switcher.tsx       # Selector de org en sidebar
│   ├── organization-list.tsx  # Lista de orgs
│   └── create-organization-form.tsx
├── hooks/
│   ├── use-current-org.ts     # Hook principal para org actual
│   ├── use-organizations.ts   # Hooks de queries/mutations
│   └── use-organizations-simple.ts
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

## Límites

Definidos en `packages/convex/convex/lib/planLimits.ts`:

- Free: 1 org, 1 producto/org, 5 miembros/org
- Pro: 5 orgs, 10 productos/org, 50 miembros/org
- Enterprise: Ilimitado
