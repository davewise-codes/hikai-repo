# Organizaciones

## Concepto

Las organizaciones son los **tenants** de Hikai. La organización es la entidad que paga, no el usuario. Todo usuario pertenece al menos a una organización.

## Tipos de Organización

### Organización Personal

Al registrarte, se crea automáticamente una **organización personal**:
- Nombre derivado de tu perfil de usuario
- Plan siempre "free" (no se puede cambiar)
- Permite explorar Hikai sin crear una org profesional
- **No se puede transferir ni eliminar**

### Organización Profesional

Organizaciones creadas manualmente por los usuarios:
- Requiere seleccionar un plan: **Pro** o **Enterprise**
- Permite colaboración con equipos más grandes
- Se puede transferir y eliminar

## Crear Organización

Desde el dropdown del OrgSwitcher:
1. Clic en "Crear organización"
2. **Selecciona un plan** (Pro o Enterprise)
3. Completa el formulario con nombre y slug
4. La nueva org aparecerá en el dropdown

**Nota:** Crear una organización profesional = contratar un plan. La integración de facturación llegará próximamente (beta gratuita).

## Cambiar de Organización

En el sidebar (esquina superior izquierda):
1. Clic en el icono de la organización actual
2. Selecciona otra organización del dropdown
3. El cambio persiste entre sesiones y pestañas

### Límites por Plan

| Plan       | Productos/org | Miembros/org | Tipo de org |
|------------|---------------|--------------|-------------|
| Free       | 1             | 5            | Solo personal |
| Pro        | 10            | 50           | Profesionales |
| Enterprise | Ilimitado     | Ilimitado    | Profesionales |

**Nota:** Ya no existe límite de organizaciones por usuario. Cada organización profesional tiene su propio plan y límites.

## Roles

- **Owner**: Control total, puede transferir ownership
- **Admin**: Gestión de miembros y productos
- **Member**: Acceso a productos asignados

## Organizaciones Recientes

El dropdown del OrgSwitcher muestra las organizaciones que has accedido recientemente:

1. **Sección "Recientes"**: Últimas 5 organizaciones accedidas
2. **Sección "Todas las organizaciones"**: El resto de tus organizaciones

El acceso se registra automáticamente cuando cambias de organización, permitiendo:
- Acceso rápido a las orgs que usas frecuentemente
- Sincronización entre dispositivos (se guarda en el servidor)

## Configuración de Organización

Los administradores y owners pueden acceder a la configuración desde el botón "Configuración" en la página de detalle de la organización.

### Configuración General
- Editar nombre y descripción de la organización
- Ver plan actual y número de miembros

### Zona de Peligro (solo owners de orgs no-personales)

#### Transferir Propiedad
Permite transferir el control de la organización a otro miembro:
1. El owner actual pasa a ser admin
2. El nuevo owner obtiene control total
3. Esta acción es irreversible

#### Eliminar Organización
Elimina permanentemente la organización y todos sus datos:
- Todos los productos se eliminan
- Todos los miembros pierden acceso
- Los datos no se pueden recuperar

**Nota:** Las organizaciones personales no se pueden transferir ni eliminar.
