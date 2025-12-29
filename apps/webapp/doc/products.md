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

En la configuración del producto (`/settings/product/$slug/team`):

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

## Configuración de Producto

Los administradores pueden acceder a `/settings/product/$slug/*`:
- Desde el **engranaje** en el dropdown del ProductSwitcher
- Desde el menú de acciones en las cards de producto

### Product Context
- Ver detalle en `apps/webapp/doc/product-context.md`

### Configuración General
- Editar nombre y descripción
- Ver slug (no editable)
- Ver número de miembros y fecha de creación
- Ver tu rol en el producto

### Zona de Peligro

#### Eliminar Producto
Solo administradores pueden eliminar un producto:
1. Clic en "Eliminar Producto"
2. Escribe el nombre del producto para confirmar
3. Se elimina el producto y todas sus membresías

**Atención**: Esta acción es irreversible.

## Cambiar de Producto

En el header hay un **ProductSwitcher** que muestra el producto actual:
- Clic para ver otros productos de la organización
- Selecciona otro producto para navegar a él
- Si no hay producto seleccionado, muestra "Seleccionar producto"

## Cambiar de Organización

Al cambiar de organización en el OrgSwitcher:
- Se actualiza la lista de productos disponibles
- Si estabas en un producto, volverás a la lista de productos

## Productos Recientes

La página de productos muestra una sección de productos accedidos recientemente:

1. **Sección "Recientes"**: Últimos 5 productos accedidos (de cualquier organización)
2. **Sección de productos**: Productos de la organización actual

### Cross-org

Los productos recientes pueden ser de diferentes organizaciones:
- Cada producto reciente muestra la organización a la que pertenece si es diferente a la actual
- Al hacer clic en un producto de otra organización, se cambia automáticamente la org activa y se navega al producto

Esto permite acceder rápidamente a los productos que usas con frecuencia, sin importar en qué organización estés actualmente.
