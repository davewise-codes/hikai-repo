# Connectors Domain

UI para gestionar conexiones de fuentes (GitHub App).

## Estructura

```
connectors/
├── components/
│   ├── add-connection-dialog.tsx # Alta de conexión + flujo GitHub App
│   ├── connection-card.tsx       # Card con estado/acciones
│   ├── connection-list.tsx       # Lista + empty/skeleton
│   └── index.ts
├── hooks/
│   ├── use-connections.ts        # Queries/mutations + connectorTypes
│   └── index.ts
└── index.ts
```

## Hooks

- `useConnections(productId)` — lista conexiones de un producto.
- `useConnectorTypes(productId)` — lista de tipos disponibles (GitHub seeded).
- `useConnectionMutations()` — `createConnection`, `removeConnection`, `updateStatus`.

## Componentes

- `ConnectionList` — muestra conexiones, skeleton, empty state con CTA.
- `ConnectionCard` — estado (`active/pending/error/disconnected`), acciones desconectar/eliminar.
- `AddConnectionDialog` — selecciona tipo (GitHub), crea conexión en `pending` y abre instalación del GitHub App.

## Flujo GitHub App (UI)

1. Usuario abre `AddConnectionDialog`, elige “GitHub” y completa datos opcionales (owner/repo).
2. Al crear, se llama a Convex para crear la conexión y obtener `installUrl`.
3. Se abre la instalación del GitHub App (`https://github.com/apps/<slug>/installations/new?...`); el usuario elige repos.
4. GitHub redirige a `SITE_URL/oauth/success?provider=github` (pantalla incluida en rutas) y la conexión pasa a `active` si el backend obtuvo el `installation access token`.

### Página de éxito

`/oauth/success` cierra popup si aplica y muestra mensaje de confirmación.

## Configuración requerida

En Convex deben existir:
- `CONVEX_SITE_URL` y `SITE_URL` (ej. `http://localhost:5173`).
- `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_PRIVATE_KEY` (PKCS#8).
- Callback en GitHub App: `https://<CONVEX_SITE_URL>/api/github/app/callback`.

Si no aparecen tipos en el selector, seedear `connectorTypes` desde Convex:
`convex run connectors/connections:seedConnectorTypes`

## Rutas webapp que usan el dominio

- `settings/product/$slug/sources` — lista y alta de conexiones (AddConnectionDialog + ConnectionList).
- `/oauth/success` — landing de éxito tras instalación GitHub App.
