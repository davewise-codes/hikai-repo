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
- [Vitest](https://vitest.dev) para tests unitarios

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
- ✅ Tests unitarios funcionando con Vitest en `@hikai/ui`

## 🧪 Próximos pasos

- Añadir tests en `@hikai/i18n` u otros packages
- Configurar `Cypress` para E2E (en apps)
- Eliminar app `admin` si ya no es necesaria
- Añadir scripts de CI/CD si el repo se despliega

---

*Este monorepo está pensado como plantilla base reutilizable para cualquier proyecto web moderno.*

