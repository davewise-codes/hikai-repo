# Email Verification Setup with Resend

Este documento describe cómo configurar el sistema de verificación por email usando Resend.

## Configuración de Resend

### 1. Crear cuenta en Resend

1. Ve a [resend.com](https://resend.com) y crea una cuenta
2. Verifica tu email si es necesario

### 2. Configurar dominio (recomendado para producción)

Para producción, debes configurar un dominio verificado:

1. En el dashboard de Resend, ve a "Domains"
2. Haz clic en "Add Domain"
3. Ingresa tu dominio (ej: `yourdomain.com`)
4. Sigue las instrucciones para agregar los registros DNS necesarios
5. Espera a que el dominio sea verificado

### 3. Obtener API Key

1. En el dashboard de Resend, ve a "API Keys"
2. Haz clic en "Create API Key"
3. Dale un nombre descriptivo (ej: "Hikai Development")
4. Selecciona los permisos necesarios:
   - `emails:send` - Requerido para enviar emails
5. Copia la API key generada

### 4. Configurar variables de entorno

Actualiza el archivo `packages/convex/.env.local`:

```env
# Email configuration (Resend)
AUTH_RESEND_KEY=re_tu_api_key_real_aqui
AUTH_EMAIL="Tu App <noreply@tudominio.com>"
```

**Importante**: 
- Si no tienes dominio verificado, usa `onboarding@resend.dev` como sender
- Para producción, SIEMPRE usa tu dominio verificado

### 5. Variables de entorno por ambiente

#### Desarrollo
```env
AUTH_RESEND_KEY=re_tu_dev_api_key
AUTH_EMAIL="Hikai Dev <onboarding@resend.dev>"
```

#### Producción
```env
AUTH_RESEND_KEY=re_tu_prod_api_key
AUTH_EMAIL="Hikai <noreply@tudominio.com>"
```

## Testing del Setup

### 1. Probar envío básico

Puedes probar que Resend funciona creando una cuenta de prueba:

1. Ve a tu app local
2. Intenta registrarte con tu email real
3. Revisa tu bandeja de entrada (y spam) por el código de verificación

### 2. Verificar logs

Si algo no funciona:

1. Revisa los logs de Convex durante el signup
2. Verifica que las variables de entorno estén cargadas correctamente
3. Revisa el dashboard de Resend para ver el estatus de los emails enviados

## Límites y Pricing

### Resend Free Plan
- 3,000 emails/mes
- 100 emails/día
- Solo dominios verificados en producción

### Recomendaciones
- Para desarrollo: usa el dominio `onboarding@resend.dev`
- Para producción: configura tu propio dominio
- Monitorea el uso en el dashboard de Resend

## Troubleshooting

### Error: "API key is invalid"
- Verifica que la API key esté correcta en `.env.local`
- Asegúrate de que la API key tenga permisos `emails:send`

### Error: "Domain not verified"
- Usa `onboarding@resend.dev` para testing
- Para producción, completa la verificación de dominio

### Emails no llegan
1. Revisa spam/junk folder
2. Verifica logs en dashboard de Resend
3. Confirma que el dominio sender esté verificado

### Timeout al enviar
- Puede ser un problema de red
- Revisa que Convex tenga acceso a internet
- Verifica status de Resend en su página de estado

## Personalización de Templates

Los templates de email están en:
- `packages/email/src/templates/verification-code.tsx`
- `packages/email/src/templates/welcome.tsx`

Para personalizar:
1. Modifica los archivos de templates
2. Actualiza texto, estilos y branding
3. Testa los cambios enviando emails de prueba

## Monitoreo

Recomendamos monitorear:
- Tasa de entrega de emails
- Emails que rebotan
- Tiempo de entrega
- Uso de límites de API

Todo esto está disponible en el dashboard de Resend.