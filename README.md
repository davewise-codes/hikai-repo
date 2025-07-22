# Hikai Monorepo Starter

Este repositorio contiene una configuración base para proyectos web modernos basada en monorepo, ideal para escalar múltiples apps y packages compartidos.

## ✨ Stack principal

- [pnpm](https://pnpm.io/) como gestor de paquetes
- [Turborepo](https://turbo.build/) para tareas orquestadas por paquete
- [TypeScript](https://www.typescriptlang.org/) con configuración centralizada
- [Vite](https://vitejs.dev/) como bundler para apps
- [Tailwind CSS](https://tailwindcss.com/) + [ShadCN UI](https://ui.shadcn.dev/) para UI
- [i18next](https://www.i18next.com/) para internacionalización
- ESLint (Flat config) + Prettier

## 📁 Estructura

```
apps/
  admin/                # App de ejemplo (vite+react)
packages/
  ui/                   # Componentes compartidos (tailwind + shadcn)
  i18n/                 # Configuración y recursos i18n
  tailwind-config/      # Configuración central de Tailwind
  typescript-config/    # Configuración base de TypeScript
```

## 🚀 Comandos útiles

### Globales (desde la raíz)

```bash
pnpm install                 # Instala todas las dependencias del monorepo
pnpm dev                     # Inicia todas las apps en modo desarrollo
pnpm lint                    # Ejecuta el linter en todo el monorepo
pnpm turbo run build         # Compila todos los paquetes/apps
pnpm turbo run build --filter=@hikai/i18n   # Compila sólo un paquete
```

### Por package o app

```bash
cd packages/i18n
pnpm build                   # Compila ese package con tsc -b
```

> Los paquetes están configurados para compilar usando `tsc --build`, lo que permite builds incrementales.

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
import base from "@hikai/tailwind-config/tailwind.config"

export default {
  ...base,
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]
}
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

## ✅ Estado actual del repo

- ✅ Estructura de monorepo con pnpm + turbo
- ✅ App `admin` como entorno de prueba
- ✅ Paquetes: `ui`, `i18n`, `typescript-config`, `tailwind-config`
- ✅ Build por paquete con `tsc -b`
- ✅ Lint y formato unificados

## 🧪 Próximos pasos

- Configurar tests:
  - `Vitest` para tests unitarios
  - `Cypress` para E2E (en apps)
- Eliminar app `admin` si ya no es necesaria
- Añadir scripts de CI/CD si el repo se despliega

---

_Este monorepo está pensado como plantilla base reutilizable para cualquier proyecto web moderno._
