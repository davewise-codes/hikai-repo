# Configuración de Despliegue en Vercel para Monorepo

Este documento explica cómo configurar y desplegar ambas aplicaciones (`website` y `webapp`) del monorepo hikai-repo en Vercel.

## Estructura del Proyecto

```
hikai-repo/
├── apps/
│   ├── website/     # Next.js app
│   │   └── vercel.json
│   └── webapp/      # Vite app  
│       └── vercel.json
└── packages/        # Packages compartidos
```

## Configuración en Vercel Dashboard

### 1. Website (Next.js)

**Crear nuevo proyecto en Vercel:**
- Repository: `hikai-repo`
- Framework Preset: `Next.js`

**Configuración del proyecto:**
- **Root Directory**: `apps/website`
- **Build Command**: `cd ../.. && pnpm install && pnpm --filter website build`
- **Output Directory**: `.next` (automático para Next.js)
- **Install Command**: `pnpm install`

### 2. Webapp (Vite)

**Crear nuevo proyecto en Vercel:**
- Repository: `hikai-repo`
- Framework Preset: `Other`

**Configuración del proyecto:**
- **Root Directory**: `apps/webapp`
- **Build Command**: `cd ../.. && pnpm install && pnpm --filter @hikai/webapp build`
- **Output Directory**: `dist`
- **Install Command**: `pnpm install`

## Archivos vercel.json

### apps/website/vercel.json
```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter website build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/((?!_next|favicon.ico).*)",
      "destination": "/$1"
    }
  ]
}
```

### apps/webapp/vercel.json
```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter @hikai/webapp build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Pasos para Despliegue

### 1. Preparar el repositorio
```bash
# Asegúrate de que los archivos vercel.json están committeados
git add apps/website/vercel.json apps/webapp/vercel.json
git commit -m "add vercel configurations for monorepo deployment"
git push
```

### 2. Configurar Website en Vercel
1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Importa `hikai-repo`
4. En "Configure Project":
   - **Root Directory**: `apps/website`
   - **Framework**: Next.js (debe detectarse automáticamente)
5. Click "Deploy"

### 3. Configurar Webapp en Vercel
1. Crea otro "New Project"
2. Importa el mismo `hikai-repo` 
3. En "Configure Project":
   - **Root Directory**: `apps/webapp`
   - **Framework**: Other
   - **Build Command**: `cd ../.. && pnpm install && pnpm --filter @hikai/webapp build`
   - **Output Directory**: `dist`
4. Click "Deploy"

## Variables de Entorno

Si necesitas variables de entorno:

1. Ve a cada proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Añade las variables necesarias para cada proyecto por separado

## Troubleshooting

### Error: "Command failed"
- Verifica que el `buildCommand` esté correcto
- Asegúrate de que pnpm esté disponible en el entorno de build

### Error: "Package not found"
- Verifica que los filtros de pnpm coincidan con los nombres en package.json:
  - `website` para apps/website
  - `@hikai/webapp` para apps/webapp

### Error: "Build output not found"
- Verifica que el `outputDirectory` esté correcto:
  - `.next` para Next.js
  - `dist` para Vite

### Build exitoso pero página en blanco
- Para webapp (Vite/SPA): Verifica que las rewrites estén configuradas para SPA routing
- Para website (Next.js): Verifica que no falten variables de entorno requeridas

## Comandos Útiles

```bash
# Build local para testing
pnpm --filter website build
pnpm --filter @hikai/webapp build

# Build completo del monorepo
pnpm build

# Preview local
cd apps/website && pnpm start
cd apps/webapp && pnpm preview
```

## Notas Importantes

- Cada app debe tener su propio proyecto en Vercel
- Los `vercel.json` están configurados para trabajar desde el contexto del monorepo
- Los comandos de build instalan dependencias desde el root y luego buildan la app específica
- Las rewrites permiten el correcto funcionamiento de SPA routing (webapp) e i18n routing (website)