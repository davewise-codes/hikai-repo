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
| Ver perfil | `/settings/profile` - nombre, email, métodos de auth |
| Editar nombre | Modificar nombre desde perfil |
| Cambiar tema | Light / Dark (persiste, sincroniza tabs) |
| Cambiar idioma | English / Español (persiste, sincroniza tabs) |
| Ver mis orgs | `/settings/organizations` - cards con acciones |
| Ver mis productos | `/settings/products` - cards con acciones |
| Productos recientes | Acceso rápido desde UserMenu (cross-org) |

→ **Detalle**: [user.md](./user.md)

---

## Organizations

| Flujo | Descripción |
|-------|-------------|
| Crear org | Requiere seleccionar plan (Pro/Enterprise) |
| Cambiar org | OrgSwitcher en header (persiste, sincroniza tabs) |
| Ver mis orgs | `/settings/organizations` - cards con acciones |
| Editar settings | `/settings/org/$slug/general` (admin/owner) |
| Ver plan | `/settings/org/$slug/plan` |
| Ver productos | `/settings/org/$slug/products` |
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
| Ver mis productos | `/settings/products` - cards con acciones |
| Editar settings | `/settings/product/$slug/general` (admin) |
| Gestionar equipo | `/settings/product/$slug/team` (admin) |
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
