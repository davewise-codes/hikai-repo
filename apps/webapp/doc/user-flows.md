# User Flows

Resumen de todos los flujos de usuario en Hikai.

---

## Auth

| Flujo | Descripción |
|-------|-------------|
| Signup | Email + password + verificación OTP → crea org personal |
| Login | Email/password o OAuth (Google, GitHub) |
| Reset password | Email → código OTP → nueva contraseña |
| Logout | Cierra sesión → `/login` |

→ **Detalle**: [auth.md](./auth.md)

---

## User

| Flujo | Descripción |
|-------|-------------|
| Ver perfil | `/profile` - nombre, email, métodos de auth |
| Editar nombre | Modificar nombre desde perfil |
| Cambiar tema | Light / Dark (persiste, sincroniza tabs) |
| Cambiar idioma | English / Español (persiste, sincroniza tabs) |
| Productos recientes | Acceso rápido desde UserMenu (cross-org) |

→ **Detalle**: [user.md](./user.md)

---

## Organizations

| Flujo | Descripción |
|-------|-------------|
| Crear org | Requiere seleccionar plan (Pro/Enterprise) |
| Cambiar org | OrgSwitcher en header (persiste, sincroniza tabs) |
| Ver detalle | `/organizations/$slug` |
| Editar settings | `/organizations/$slug/settings` (admin/owner) |
| Gestionar miembros | Añadir, cambiar rol, eliminar |
| Transferir ownership | Solo owner → otro miembro pasa a ser owner |
| Eliminar org | Solo owner de orgs no-personales |

→ **Detalle**: [organizations.md](./organizations.md)

---

## Products

| Flujo | Descripción |
|-------|-------------|
| Crear producto | Nombre + slug (límite según plan) |
| Cambiar producto | ProductSwitcher en header |
| Ver detalle | `/products/$slug` (Overview + Members) |
| Editar settings | `/products/$slug/settings` (admin) |
| Gestionar miembros | Añadir de org, cambiar rol, eliminar |
| Eliminar producto | Solo admins (confirmación con nombre) |

→ **Detalle**: [products.md](./products.md)

---

## Límites por Plan

| Plan | Productos/org | Miembros/org |
|------|---------------|--------------|
| Free | 1 | 5 |
| Pro | 10 | 50 |
| Enterprise | ∞ | ∞ |

---

## Roles

### Organización

| Rol | Permisos |
|-----|----------|
| Owner | Control total, transferir, eliminar |
| Admin | Gestionar miembros y productos |
| Member | Acceso a productos asignados |

### Producto

| Rol | Permisos |
|-----|----------|
| Admin | Control total, editar, eliminar, gestionar miembros |
| Member | Acceso y colaboración |
