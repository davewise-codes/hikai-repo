# Autenticación

## Concepto

Sistema de autenticación multi-provider que soporta email/password con verificación OTP y login social (Google, GitHub).

## Registro (Signup)

Flujo de registro con verificación por correo:

1. Accede a `/login` → pestaña "Sign Up"
2. Introduce email, contraseña y confirmación
3. Recibirás un código OTP por email (vía Resend)
4. Introduce el código para verificar tu cuenta
5. Al verificar: se crea tu **organización personal** automáticamente
6. Redirección a home

### Organización Personal

Al completar el registro:
- Se crea una organización personal con tu nombre
- Plan "free" permanente
- No se puede eliminar ni transferir
- Te permite explorar Hikai inmediatamente

## Login

### Email/Password

1. Accede a `/login`
2. Introduce email y contraseña
3. Redirección a home

### Login Social (OAuth)

Providers disponibles:
- **Google**: Clic en "Continuar con Google"
- **GitHub**: Clic en "Continuar con GitHub"

El flujo OAuth:
1. Clic en el botón del provider
2. Autoriza en la ventana del provider
3. Redirección automática a home

**Nota**: Si es tu primer login con OAuth, se crea tu cuenta y organización personal automáticamente.

## Recuperar Contraseña

Flujo de 3 pasos:

1. **Solicitar código**: Introduce tu email → recibes código OTP
2. **Verificar código**: Introduce el código recibido
3. **Nueva contraseña**: Establece tu nueva contraseña

Después de cambiar la contraseña, puedes hacer login normalmente.

## Logout

Desde el UserMenu (avatar en header):
1. Clic en tu avatar
2. Clic en "Cerrar sesión"
3. Redirección a `/login`

## Sesión

- La sesión persiste entre recargas de página
- El token JWT se almacena de forma segura
- La sesión se mantiene hasta hacer logout manualmente

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/login` | Formularios de login y signup |
| `/` | Home (requiere autenticación) |

## Protección de Rutas

Todas las rutas excepto `/login` requieren autenticación:
- Si no estás autenticado → redirección a `/login`
- Si estás autenticado en `/login` → redirección a home
