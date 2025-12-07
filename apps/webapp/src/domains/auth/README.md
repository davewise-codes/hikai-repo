# Auth Domain

Sistema de autenticación usando Convex Auth con múltiples providers.

## Providers Soportados

- **Email/Password**: Con verificación OTP via Resend
- **Google OAuth**: Login social con Google
- **GitHub OAuth**: Login social con GitHub

## Estructura

```
auth/
├── components/
│   ├── auth-form.tsx              # Contenedor principal (tabs signin/signup)
│   ├── signin-form.tsx            # Formulario de login
│   ├── signup-form.tsx            # Formulario de registro
│   ├── signup-with-verification.tsx  # Flujo signup + verificación OTP
│   ├── verification-code-form.tsx    # Input código OTP
│   ├── password-reset-flow.tsx       # Flujo reset password (3 pasos)
│   └── social-login-buttons.tsx      # Botones OAuth (Google, GitHub)
├── hooks/
│   └── use-auth.ts                # Hook principal con toda la lógica
└── index.ts
```

## Arquitectura

```
Cliente (React) ←→ Convex Auth Provider ←→ Convex Backend
```

El sistema usa Convex Auth, una solución de autenticación basada en tokens JWT.

## Hooks

### useAuth

Hook principal que expone toda la funcionalidad de autenticación:

```tsx
const { isAuthenticated, isLoading, signIn, signUp, signOut } = useAuth();
```

- `isAuthenticated`: `true` si hay token válido
- `isLoading`: `true` mientras verifica estado de auth
- `signIn(email, password)`: Login con credenciales
- `signUp(email, password)`: Registro con verificación
- `signOut()`: Cierra sesión

## Flujos

### Signup (Registro)

1. Usuario llena formulario (email, password, confirmación)
2. `signUp()` → Convex Auth crea usuario
3. Se envía código OTP por email (via Resend)
4. Usuario ingresa código de verificación
5. Token JWT generado → `isAuthenticated = true`
6. Redirección automática a home

### Login (Sign In)

1. Usuario ingresa credenciales
2. `signIn()` → Convex Auth valida
3. Token JWT generado → `isAuthenticated = true`
4. Redirección automática a home

### OAuth (Google/GitHub)

1. Clic en botón del provider
2. Redirección a página del provider
3. Usuario autoriza
4. Callback → Token JWT generado
5. Redirección automática a home

### Password Reset

Flujo de 3 pasos en `password-reset-flow.tsx`:

1. **Solicitar código**: Email → código OTP enviado
2. **Verificar código**: Ingresar código recibido
3. **Nueva contraseña**: Establecer nueva password

### Logout

```
signOut() → token = null → redirección a /login
```

## Estados del Sistema

```typescript
token = undefined  // isLoading (verificando auth)
token = null       // No autenticado
token = "string"   // Autenticado
```

## Componentes Clave

### ConvexAuthProvider

- Envuelve la app en `__root.tsx`
- Proporciona contexto de autenticación
- Maneja persistencia del token (localStorage/cookies)

### AuthGuard

- Protege rutas que requieren autenticación
- Redirige a `/login` si no está autenticado
- Muestra loading mientras verifica

## Persistencia

- Token JWT guardado en localStorage/cookies (manejado por Convex)
- Al recargar, ConvexAuthProvider recupera el token
- Sesión activa hasta logout manual

## Backend

Configuración en `packages/convex/convex/auth.ts`:
- Providers: Password (con email), Google, GitHub
- Callbacks para crear organización personal al registro
