# Hikai Monorepo

Monorepo con arquitectura **packages → apps** donde las aplicaciones consumen packages compartidos para UI, configuración y utilidades.

## 🏗️ Arquitectura

```
packages/ (código compartido)
├── ui/                 - Sistema de diseño y componentes React
├── tailwind-config/    - Configuración centralizada de Tailwind
├── typescript-config/  - Configuraciones de TypeScript
└── convex/            - Backend con Convex (auth, DB, funciones)

apps/ (aplicaciones)
├── website/           - Sitio web marketing (Next.js + i18n) :3003
└── webapp/            - Aplicación web (Vite + TanStack Router) :3004
```

### 🎯 Principios clave
- **UI centralizada**: Todo el styling y componentes definidos en `packages/ui`
- **Tema consistente**: Colores, fuentes y tokens de diseño compartidos
- **Sin duplicación**: Las apps nunca implementan UI independientemente
- **Seguridad multi-tenant**: Validación obligatoria de acceso en todas las operaciones

> 📖 Ver [CLAUDE.md](./CLAUDE.md) para directivas detalladas de desarrollo y **seguridad multi-tenant**

## ✨ Stack tecnológico

- [pnpm](https://pnpm.io/) - Gestor de paquetes
- [Turborepo](https://turbo.build/) - Orquestación de tareas
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.dev/) - Sistema de diseño
- [Convex](https://convex.dev/) - Backend, database y auth
- [Convex Auth](https://labs.convex.dev/auth) - Sistema de autenticación
- [Next.js](https://nextjs.org/) + [next-intl](https://next-intl-docs.vercel.app/) - Website con i18n
- [Vite](https://vitejs.dev/) - Build tool para apps
- [TanStack Router](https://tanstack.com/router) - Router para webapp
- [Zustand](https://zustand-demo.pmnd.rs/) - State management en webapp
- IA inference con Convex Agents + telemetría: ver
  - Backend: `packages/convex/doc/ai-inference.md`
  - Front (panel ai-test): `apps/webapp/doc/ai-inference.md`
- ESLint + Prettier - Linting y formateo
- [Vitest](https://vitest.dev) - Testing

## 🚀 Inicio rápido

### Primera vez (configuración inicial)

1. **Instalar dependencias:**
```bash
pnpm install
```

2. **Configurar Convex (backend):**
```bash
cd packages/convex
pnpm dev
# Sigue las instrucciones para crear/conectar tu proyecto Convex
# Esto generará el archivo .env.local con CONVEX_DEPLOYMENT y CONVEX_URL
```

3. **Copiar la URL de Convex a la webapp:**
```bash
# Después de configurar Convex, copia CONVEX_URL a apps/webapp/.env.local
cd ../../apps/webapp
echo "VITE_CONVEX_URL=<tu-url-de-convex>" > .env.local
# Reemplaza <tu-url-de-convex> con la URL de tu dashboard de Convex
```

4. **Iniciar todas las aplicaciones:**
```bash
cd ../..
pnpm dev
```

Esto iniciará:
- **Website** (marketing): http://localhost:3003
- **Webapp** (app): http://localhost:3004
- **Convex** (backend): en modo dev

### Comandos útiles

```bash
pnpm install                 # Instala todas las dependencias del monorepo
pnpm dev                     # Inicia todas las apps en modo desarrollo
pnpm lint                    # Ejecuta el linter en todo el monorepo
pnpm turbo run build         # Compila todos los paquetes/apps
pnpm turbo run build --filter=@hikai/ui     # Compila sólo un paquete
```

### Por package o app

```bash
cd packages/ui
pnpm test                    # Ejecuta los tests unitarios con Vitest
```

> Los paquetes están configurados para compilar usando `tsc --build`, lo que permite builds incrementales.

## 🧪 Tests con Vitest

Los paquetes pueden incluir tests unitarios usando [Vitest](https://vitest.dev).

```bash
cd packages/ui
pnpm test                    # Ejecuta los tests en modo watch
```

Cada paquete puede definir su propio `vitest.config.ts`. El archivo de setup global (`setup.ts`) puede importar matchers como `@testing-library/jest-dom`.

## 🧱 Crear una nueva app

```bash
cd apps
pnpm create vite@latest my-app -- --template react-ts
```

Luego actualiza su `tsconfig.json`:

```json
{
	"extends": "@hikai/typescript-config/base",
	"compilerOptions": {
		"outDir": "dist"
	},
	"include": ["src"]
}
```

Y añade su `tailwind.config.ts`:

```ts
import base from "@hikai/tailwind-config/tailwind.config";

export default {
	...base,
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
};
```

## 🧱 Crear un nuevo package

```bash
mkdir -p packages/mi-paquete/src
```

`packages/mi-paquete/package.json`:

```json
{
	"name": "@hikai/mi-paquete",
	"version": "0.0.0",
	"private": true,
	"main": "dist/index.js",
	"scripts": {
		"build": "tsc -b"
	}
}
```

`packages/mi-paquete/tsconfig.json`:

```json
{
	"extends": "@hikai/typescript-config/base",
	"compilerOptions": {
		"composite": true,
		"noEmit": false,
		"outDir": "dist"
	},
	"include": ["src"]
}
```

## 🌐 Deploy

Ambas aplicaciones están desplegadas en Vercel:

- **Website** (Next.js): 🔗 [www.hikai.pro](https://www.hikai.pro)
- **Webapp** (Vite): 🔗 [app.hikai.pro](https://app.hikai.pro)

### Configuración de Vercel para Monorepo

Cada app tiene su propio `vercel.json` configurado para trabajar desde el contexto del monorepo:

#### Website (Next.js)
```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter website build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

#### Webapp (Vite)
```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter @hikai/webapp build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install",
  "framework": null
}
```

### Pasos para nuevo despliegue:

1. **En Vercel Dashboard**, crear proyecto separado para cada app
2. **Root Directory**: 
   - `apps/website` para la website
   - `apps/webapp` para la webapp
3. **Los archivos vercel.json manejan automáticamente** los comandos de build

### Deploy manual local:
```bash
cd apps/website && pnpm dlx vercel --prod
cd apps/webapp && pnpm dlx vercel --prod

## ✅ Estado actual del repo

- ✅ Estructura de monorepo con pnpm + turbo
- ✅ Apps: `website` (Next.js) y `webapp` (Vite + TanStack Router)
- ✅ Paquetes: `ui`, `typescript-config`, `tailwind-config`, `convex`
- ✅ Backend con Convex + Auth (email OTP, GitHub, Google)
- ✅ Sistema de themes centralizado con providers per-app
- ✅ Sistema de fuentes centralizado (Google Fonts CDN)
- ✅ State management con Zustand en webapp
- ✅ Build por paquete con `tsc -b`
- ✅ Lint y formato unificados
- ✅ Tests unitarios funcionando con Vitest en `@hikai/ui`

## 🧪 Próximos pasos

- Añadir tests en otros packages si es necesario
- Configurar `Cypress` para E2E (en apps)
- Eliminar app `admin` si ya no es necesaria
- Añadir scripts de CI/CD si el repo se despliega

---

_Este monorepo está pensado como plantilla base reutilizable para cualquier proyecto web moderno._
```
