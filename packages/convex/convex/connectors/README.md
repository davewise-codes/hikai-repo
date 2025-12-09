# Connectors (Convex)

Backend de connectors (sources). Incluye queries/mutations y el flujo GitHub App.

## Estructura

```
connectors/
├── connections.ts   # CRUD de conexiones + listConnectorTypes
├── github.ts        # Flujo GitHub App (install URL + callback)
└── index.ts         # Re-exports
```

## GitHub App (fuentes)

Usamos un GitHub App para limitar permisos y elegir repos al instalar. No se usa OAuth App ni token de usuario.

### Variables de entorno (Convex)

En Convex (`packages/convex/convex/.env.local.example`):

- `CONVEX_SITE_URL` — dominio Convex (incluye https://).
- `SITE_URL` — URL de la webapp (ej. `http://localhost:5173`) para el redirect final.
- `GITHUB_APP_ID` — ID numérico del GitHub App.
- `GITHUB_APP_SLUG` — slug del App (ej. `hikai-connections-app`).
- `GITHUB_APP_PRIVATE_KEY` — clave privada del App en **PKCS#8** (ver conversión abajo).

### Clave privada en PKCS#8

Si la clave descargada es `BEGIN RSA PRIVATE KEY`, conviértela:

```bash
openssl pkcs8 -topk8 -inform PEM -in github-app.pem -outform PEM -nocrypt -out github-app-pkcs8.pem
```

Pega el contenido completo de `github-app-pkcs8.pem` en `GITHUB_APP_PRIVATE_KEY` (multilínea o con `\n` escapados, sin comillas extra).

### Callback y URLs

- Callback de instalación en GitHub App: `https://<CONVEX_SITE_URL>/api/github/app/callback`
- Install URL generada: `https://github.com/apps/<GITHUB_APP_SLUG>/installations/new?state=<connectionId>`
- Redirect final tras éxito/error: `${SITE_URL}/oauth/success?provider=github`

### Permisos recomendados del App

Configura el App con permisos **read-only** para minimizar riesgo:
- Repository permissions: `Contents (Read-only)`, `Metadata (Read-only)`, `Pull requests (Read-only)` (ajusta según lo que vayamos a consumir).
- Webhooks opcional, no requerido ahora.

### Flujo

1. Frontend llama `getInstallUrl` con `productId` + `connectionId`.
2. Usuario instala el GitHub App y elige repos.
3. GitHub redirige a `/api/github/app/callback` con `installation_id` y `state`.
4. `githubAppCallback` firma un JWT del App, pide `installation access token` a GitHub, lo guarda en `credentials` (`accessToken`, `expiresAt`) y marca la conexión como `active`. `installationId` se almacena en `config`.
5. Si falla, la conexión pasa a `error` y `lastError` se rellena para debug.

### Troubleshooting

- **`Installation token failed`**: revisar que `GITHUB_APP_PRIVATE_KEY` está en PKCS#8 y bien pegada. Asegurar callback sin dobles `https://`.
- **Dropdown vacío en UI**: seedear `connectorTypes` con `convex run connectors/connections:seedConnectorTypes` (una sola vez).

