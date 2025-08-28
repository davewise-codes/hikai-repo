● 🔐 Flujo de Autenticación Completo

1. Arquitectura de Autenticación

El sistema usa Convex Auth que es una solución de autenticación basada en tokens JWT:

Cliente (React) ←→ Convex Auth Provider ←→ Convex Backend

2. Flujo de Signup Paso a Paso

📝 Paso 1: Usuario llena el formulario

- Usuario entra a /login
- Cambia a la pestaña "Sign Up"
- Ingresa email, password y confirmación

🚀 Paso 2: Envío del formulario

// En login.tsx
handleSignUp() → signUp() → convexSignIn("password", { flow: "signUp" })

🔑 Paso 3: Convex Backend procesa

- Convex Auth (packages/convex/convex/auth/auth.config.ts) recibe la petición
- Crea el usuario en la base de datos
- Genera un JWT token
- Devuelve el token al cliente

💾 Paso 4: Cliente recibe el token

// En use-auth.ts
const token = useAuthToken(); // Hook de Convex que obtiene el token
const isAuthenticated = !!token; // true si hay token

🔄 Paso 5: Redirección automática

// En login.tsx
useEffect(() => {
if (isAuthenticated && !isLoading) {
setTimeout(() => navigate({ to: '/' }), 100);
}
}, [isAuthenticated, isLoading]);

🛡️ Paso 6: AuthGuard protege rutas

// En index.tsx (ruta home)
<AuthGuard>
<AppShell>
<HomePage />
</AppShell>
</AuthGuard>

3. Estados del Sistema

// Estados posibles durante el flujo:
token = undefined → isLoading (verificando auth)
token = null → No autenticado
token = "string" → Autenticado

4. Componentes Clave

🔐 ConvexAuthProvider

- Envuelve toda la app en \_\_root.tsx
- Proporciona contexto de autenticación
- Maneja la persistencia del token

🪝 useAuth Hook

export function useAuth() {
const token = useAuthToken(); // Token de Convex
const isAuthenticated = !!token; // Estado de auth
const isLoading = token === undefined; // Cargando

    return {
      isAuthenticated,
      isLoading,
      signIn,   // Función para login
      signUp,   // Función para registro
      signOut   // Función para logout
    };

}

🛡️ AuthGuard Component

- Protege rutas que requieren autenticación
- Redirige a /login si no está autenticado
- Muestra loading mientras verifica

5. Flujo de Login (Sign In)

Similar al signup pero con flow: "signIn":

1. Usuario ingresa credenciales
2. signIn() → convexSignIn("password", { flow: "signIn" })
3. Convex valida credenciales
4. Devuelve token si son correctas
5. Redirección automática a home

6. Problema del Bucle (Resuelto)

Antes:

- Usábamos window.location.href (recarga completa)
- No había delay para propagación del token
- AuthGuard y LoginPage peleaban por redirigir

Ahora:

- Usamos navegación SPA con useNavigate()
- Delay de 100ms asegura propagación
- Condiciones precisas: isAuthenticated && !isLoading

7. Persistencia de Sesión

- El token JWT se guarda en localStorage/cookies (manejado por Convex)
- Al recargar la página, ConvexAuthProvider recupera el token
- Si el token es válido, mantiene la sesión activa

8. Logout

signOut() → convexSignOut() → token = null → AuthGuard redirige a /login

9. Diagrama de Flujo Completo

Usuario no autenticado
↓
/login (LoginPage)
↓
Signup Form
↓
signUp() → Convex Auth
↓
Token generado
↓
isAuthenticated = true
↓
navigate({ to: '/' })
↓
AuthGuard verifica
↓
✅ Acceso permitido
