# @hikai/convex

Backend con Convex: base de datos, autenticación y funciones serverless.

## 🚀 Configuración inicial

### 1. Primera vez - Crear proyecto Convex

```bash
cd packages/convex
pnpm dev
```

Esto te pedirá:
1. Iniciar sesión en Convex (o crear cuenta)
2. Crear un nuevo proyecto o conectar uno existente
3. Generará automáticamente `convex/.env.local` con:
   - `CONVEX_DEPLOYMENT` - nombre de tu deployment
   - `CONVEX_URL` - URL del backend (ejemplo: `https://tu-deployment.convex.cloud`)

### 2. Configurar variables de entorno

Después de que Convex genere el `.env.local`, copia el ejemplo y completa los valores:

```bash
cp convex/.env.local.example convex/.env.local
```

Edita `convex/.env.local` con tus credenciales:

```bash
# Ya configurado por Convex
CONVEX_DEPLOYMENT=your-deployment-name
CONVEX_URL=https://your-deployment.convex.cloud

# Configurar para auth
AUTH_SECRET=$(openssl rand -base64 32)
SITE_URL=http://localhost:3004

# Email (Resend) - Opcional
AUTH_RESEND_KEY=re_your_key
AUTH_EMAIL="Your App <noreply@yourdomain.com>"

# OAuth GitHub - Opcional
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret

# OAuth Google - Opcional
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
```

### 3. Copiar CONVEX_URL a la webapp

La webapp necesita conocer la URL de Convex:

```bash
# Desde packages/convex
cd ../../apps/webapp
echo "VITE_CONVEX_URL=https://your-deployment.convex.cloud" > .env.local
```

> 💡 Reemplaza `your-deployment.convex.cloud` con la URL real de tu dashboard.

## 🏗️ Estructura

```
convex/
├── _generated/         - Código generado por Convex (no editar)
├── auth/              - Funciones de autenticación
│   ├── GitHub.ts      - Provider de GitHub
│   ├── Google.ts      - Provider de Google
│   └── Resend.ts      - Provider de email (OTP)
├── organizations/     - Gestión de organizaciones
├── auth.ts           - Configuración de Convex Auth
├── schema.ts         - Schema de la base de datos
├── users.ts          - Funciones de usuarios
└── http.ts           - Endpoints HTTP
```

## 🔐 Sistema de autenticación

El proyecto usa [@convex-dev/auth](https://labs.convex.dev/auth) con múltiples providers:

### Email OTP (Resend)
- Login sin contraseña
- Código de verificación por email
- Requiere cuenta en [Resend](https://resend.com)

### GitHub OAuth
- Login con cuenta de GitHub
- Requiere crear [GitHub OAuth App](https://github.com/settings/applications/new)
- Callback URL: `http://localhost:3004` (dev) o tu URL de producción

### Google OAuth
- Login con cuenta de Google
- Requiere crear proyecto en [Google Cloud Console](https://console.cloud.google.com)
- Configurar OAuth consent screen y credenciales

## 📦 Comandos

```bash
pnpm dev        # Inicia Convex en modo desarrollo
pnpm deploy     # Deploy a producción
pnpm codegen    # Regenera tipos de TypeScript
```

## 🔗 Uso desde la webapp

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

// Query
const users = useQuery(api.users.list);

// Mutation
const createUser = useMutation(api.users.create);
```

## 🌐 Dashboard

Accede a tu dashboard de Convex para:
- Ver datos en tiempo real
- Monitorear funciones
- Configurar variables de entorno de producción
- Ver logs

🔗 [dashboard.convex.dev](https://dashboard.convex.dev)

## 📚 Recursos

- [Convex Docs](https://docs.convex.dev)
- [Convex Auth Docs](https://labs.convex.dev/auth)
- [Resend Docs](https://resend.com/docs)
