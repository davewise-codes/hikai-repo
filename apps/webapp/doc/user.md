# Usuario

## Perfil

Accesible desde `/profile` o desde el UserMenu (icono engranaje junto al nombre).

### Información Personal

- **Nombre**: Editable
- **Email**: Solo lectura (viene del método de autenticación)
- **Métodos de autenticación**: Lista de providers conectados (email, Google, GitHub)
- **Fecha de creación**: Cuándo se creó la cuenta

### Editar Perfil

1. Accede a `/profile`
2. Modifica el nombre
3. Clic en "Guardar cambios"

## Preferencias

Accesibles desde el UserMenu en el header.

### Tema

Opciones disponibles:
- **Light**: Tema claro
- **Dark**: Tema oscuro

El tema:
- Se aplica inmediatamente
- Persiste entre sesiones (localStorage)
- Sincroniza entre pestañas del navegador

### Idioma

Opciones disponibles:
- **English**
- **Español**

El idioma:
- Se aplica inmediatamente a toda la UI
- Persiste entre sesiones (localStorage)
- Sincroniza entre pestañas del navegador

## Navegación Rápida

### Productos Recientes

El UserMenu muestra los últimos 5 productos accedidos:
- Cross-org: pueden ser de diferentes organizaciones
- Clic para ir directamente al producto
- Si es de otra org, cambia la org automáticamente

### Links de Acceso

Desde el UserMenu:
- **Perfil**: Icono engranaje → `/profile`
- **Mis Productos**: Link al final de productos recientes → `/products`
- **Cerrar sesión**: Logout

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/profile` | Página de perfil del usuario |
