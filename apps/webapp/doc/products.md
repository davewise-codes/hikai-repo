# Productos

## Concepto

Los productos son las unidades de trabajo dentro de una organización. Cada producto representa un proyecto, aplicación o iniciativa de marketing que gestionas con Hikai.

## Acceso a Productos

Para acceder a un producto necesitas:
1. Ser miembro de la organización que contiene el producto
2. Ser añadido como miembro del producto específico

## Crear un Producto

Desde la página de Productos (`/products`):
1. Clic en "Crear producto"
2. Introduce nombre y slug (identificador URL)
3. Opcionalmente añade una descripción
4. El producto se crea y tú eres el administrador inicial

### Límites por Plan

| Plan       | Productos por org |
|------------|------------------|
| Free       | 1                |
| Pro        | 10               |
| Enterprise | Ilimitado        |

## Gestionar Miembros

En la página de detalle del producto (tab "Miembros"):

### Añadir miembro
1. Clic en "Añadir Miembro"
2. Selecciona un usuario del dropdown (solo muestra miembros de la org)
3. Elige rol: Admin o Miembro
4. Confirma

### Cambiar rol
- Los admins pueden cambiar roles de otros miembros
- No se puede degradar al último admin

### Eliminar miembro
- Los admins pueden eliminar a cualquier miembro
- Cualquier miembro puede auto-eliminarse
- No se puede eliminar al último admin

## Roles

| Rol | Permisos |
|-----|----------|
| **Admin** | Control total: editar producto, gestionar miembros, eliminar |
| **Member** | Acceso de lectura y colaboración |

## Eliminar Producto

Solo administradores pueden eliminar un producto:
1. En la página de detalle, clic en "Eliminar"
2. Escribe el nombre del producto para confirmar
3. Se elimina el producto y todas sus membresías

**Atención**: Esta acción es irreversible.

## Cambiar de Organización

Al cambiar de organización en el OrgSwitcher mientras estás en `/products`:
- Se te redirige a la lista de productos de la nueva organización
- Si estabas viendo un producto específico, volverás a la lista
