# Product Context

## Taxonomia de producto

La taxonomia define los campos canonicos que usamos para describir un producto.
Se divide en dos bloques:

### Identidad y baseline (aportado por usuario)

Cada propiedad incluye que es y que aporta en Hikai.

- productName: Nombre canonico del producto; ancla la narrativa y titulos en outputs.
- description: Resumen corto del producto; aporta contexto general a todos los artefactos.
- valueProposition: Promesa principal de valor; guía el tono y los mensajes clave.
- problemSolved: Problema que resuelve; enfoca contenido en dolores reales del usuario.
- targetMarket: Contexto de mercado (B2B/B2C/etc.); adapta lenguaje y prioridades.
- productCategory: Categoria macro (CRM, Analytics, etc.); ayuda a posicionamiento.
- productType: Tipo de entrega (web app, API, etc.); ajusta expectativas de uso.
- businessModel: Modelo de negocio (SaaS, usage, etc.); define enfoque comercial.
- stage: Etapa de madurez; condiciona riesgos, tono y prioridades del contenido.
- industries: Sectores objetivo; refina ejemplos y casos de uso.
- audiences: Audiencias principales; adapta mensajes por rol o area.
- productVision: Vision a medio/largo plazo; alinea narrativa y estrategia.
- strategicPillars: Pilares estrategicos; estructura recomendaciones y foco.
- metricsOfInterest: Metricas clave; sugiere KPIs y lenguaje de impacto.
- personas: Perfiles de usuario; define voz, preocupaciones y escenarios.
- platforms: Canales donde vive el producto; orienta formatos y claims.
- releaseCadence: Frecuencia de releases; influye en cadencia de comunicacion.
- languagePreference: Idioma objetivo; normaliza toda la salida del agente.

### Enriquecimiento (inferido por IA con evidencia)

Cada propiedad incluye que es y que aporta en Hikai.

- integrationEcosystem: Integraciones relevantes; agrega credibilidad y alcance.
- technicalStack: Tecnologias principales; evita errores tecnicos y aporta precision.
- audienceSegments: Segmentos dentro de la audiencia; personaliza mensajes.
- toneGuidelines: Lineamientos de tono; mantiene consistencia comunicacional.
- keyFeatures: Funcionalidades de alto valor; define diferenciadores.
- competition: Competidores relevantes; ayuda a posicionamiento diferencial.
- maturity: Madurez inferida; corrige coherencia con etapa y señales.
- risks: Riesgos percibidos; alerta sobre gaps o areas fragiles.
- recommendedFocus: Enfoques sugeridos; orienta roadmap narrativo.
- notableEvents: Eventos destacados; ancla contenido en hechos reales.
- confidence: Confianza del agente; indica calidad de evidencia.
- qualityScore: Score de calidad post-proceso; alerta sobre falta de baseline o señales.

## Que aporta el usuario vs. que inferimos

### Aportado por usuario (baseline)
- Informacion canonica que el agente debe respetar.
- Se usa como fuente primaria y no se infiere si falta (se deja vacio).
- Vive en el baseline del producto y se puede editar en settings.

### Inferido por IA
- Se genera a partir del baseline + fuentes conectadas.
- Fuentes actuales: eventos de GitHub y package.json (para stack tecnico).
- Si no hay evidencia suficiente, el agente baja la confianza y deja campos vacios.

## User flow

### 1) Creacion de producto
- En el wizard de creacion, el usuario completa un baseline minimo.
- El baseline inicial se guarda junto con el producto.

### 2) Edicion de baseline
- En settings del producto, el usuario edita el baseline completo.
- Guardar el baseline dispara regeneracion automatica del contexto.

### 3) Generar y revisar contexto
- En settings del producto > Context, el usuario genera o regenera el contexto.
- Se muestran resumen, fuentes usadas, modelo, calidad y el historial de versiones.
- El usuario puede dar feedback con thumbs up/down al contexto actual.
