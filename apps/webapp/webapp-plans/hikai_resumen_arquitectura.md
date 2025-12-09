# Hikai — Resumen Conceptual, Arquitectura y Decisiones Tomadas

Este documento consolida la visión estratégica y la arquitectura funcional de **Hikai**, integrando todas las decisiones tomadas hasta este punto. Sirve como guía esencial del producto.

---

# 1. Propósito de Hikai
Hikai es una plataforma **product‑centric** diseñada para organizaciones que crean y evolucionan **productos digitales**. Su misión es automatizar la traducción entre:

- **La actividad real del producto** (desarrollo, diseño, documentación, decisiones)
- **El contenido que la organización necesita generar** para comunicar ese progreso interna y externamente

Hikai:
- Se conecta a las fuentes donde vive el producto digital
- Detecta y entiende automáticamente qué ha cambiado
- Construye un **timeline semántico**
- Genera contenido para áreas como Marketing, Customer Success, Dirección y Producto
- Proporciona editores especializados y herramientas de publicación multicanal

En esencia, Hikai es un sistema de **Product Signal Automation**.

---

# 2. Modelo de Organización y Productos Digitales
Una **Organización** en Hikai:
- Puede tener **múltiples productos digitales**
- Decide libremente qué constituye un producto digital (apps, líneas de negocio, documentación interna…)
- Tiene límites según plan (productos, fuentes conectadas, etc.)

Cada **Producto Digital** funciona como un workspace autónomo:

```
Producto Digital
 ├── Product Context
 ├── Connected Sources
 ├── Sync Engine
 ├── Timeline Inteligente
 ├── Módulos por Área (Marketing, CS, Product Team…)
 ├── Content Store
 └── Publishing Hub
```

Este aislamiento hace que cada producto sea un universo propio, similar a un repo de GitHub o un proyecto de Linear.

---

# 3. Pilares Funcionales de Hikai
Hikai se articula alrededor de seis pilares principales.

## 3.1 Product Context
Base estratégica utilizada por la IA para interpretar y generar contenido:
- Problema que resuelve el producto
- ICPs
- Propuesta de valor
- Audiencias
- Funcionalidades clave
- Mensajería y posicionamiento

## 3.2 Connected Sources
Fuentes conectadas mediante OAuth u otros mecanismos:
- GitHub / GitLab
- Linear / Jira
- Notion
- Miro
- Airtable
- APIs personalizadas

Cada fuente genera **Raw Events**, y su número puede ser limitado por plan.

## 3.3 Sync Engine
Proceso automático que:
1. Se conecta periódicamente a las fuentes
2. Obtiene cambios desde la última sincronización
3. Registra *Raw Events*
4. Activa el motor de interpretación semántica

## 3.4 Timeline Inteligente
Es el **núcleo conceptual** de Hikai.

Transforma datos dispersos en una narrativa comprensible:

```
Raw Events → Interpreted Events → Increments → Insights por Área
```

Permite:
- Visualizar qué ha pasado realmente en el producto
- Detectar hitos, mejoras, fixes, releases
- Alimentar la generación de contenido para cada área

## 3.5 Módulos por Área
Cada área trabaja sobre el timeline para producir contenido relevante.

Áreas iniciales:
- **Marketing**
- **Customer Success**
- **Product Team**

Áreas futuras:
- Comunicación interna
- Stakeholders / Dirección

Cada área tiene **su propio mini‑workspace**, con subtabs como:
```
Overview | Suggestions | Editors | History
```

## 3.6 Content Store
Repositorio centralizado de todo el contenido generado por cualquier área.
Incluye:
- Versionado
- Estados: draft → review → approved → scheduled → published
- Buscador y filtrado
- Referencias al timeline

No genera contenido: **lo almacena, organiza y prepara para publicar**.

## 3.7 Publishing Hub
Capa final del flujo.
Permite publicar contenido en:
- Twitter/X, LinkedIn, Medium
- Blogs (WordPress, Ghost, Webflow)
- Slack/Discord
- Plataformas de email marketing
- Help Centers

Incluye:
- Validaciones
- Vista previa
- Programación
- Auditoría y logs

---

# 4. Arquitectura de Navegación (UX)
Hikai se divide en dos zonas principales.

## 4.1 Zona Funcional (Product Workspace)
Es el centro operativo y es **100% product‑centric**.

```
/app/org/:orgId/product/:productId
  ├── timeline
  ├── marketing
  ├── customer-success
  ├── product-team
  ├── content
  └── publishing
```

### Características clave:
- Al seleccionar un producto, el usuario entra en su workspace completo.
- Cada área tiene **su propia navegación interna** mediante subtabs.
- Timeline es el punto de verdad.

### Sidebar minimalista
El sidebar principal debe ser **solo iconos**, manteniendo:
- Timeline
- Áreas funcionales
- Content
- Publishing

La navegación detallada se despliega **dentro de cada área**.

## 4.2 Zona de Settings
Separada de la zona funcional, orientada solo a administración.

```
/settings
  ├── profile
  ├── org/:orgId
  │     ├── team
  │     ├── billing
  │     └── products/:productId
  │           ├── context
  │           ├── sources
  │           └── timeline
```

Aquí residen:
- Roles y equipo
- Billing
- Configuración profunda del producto
- Conexiones a fuentes

---

# 5. Flujo de Usuarios por Área
## 5.1 Marketing
1. Entra al producto y selecciona Marketing
2. Ve su **Overview**: insights, sugerencias y contenido pendiente
3. Pasa a **Suggestions** para explorar ideas generadas desde el timeline
4. Abre un **Editor** (tweet, blog, email…)
5. Refina contenido y lo envía a revisión
6. El contenido aparece en Content Store
7. Si tiene permisos, programa publicación en Publishing

## 5.2 Customer Success
1. Entra a su área y ve sugerencias relevantes para clientes
2. Crea help articles, emails o mensajes in‑app
3. Envía a revisión
4. Publishing gestiona el envío final

## 5.3 Product Team
1. Ve incrementos relevantes
2. Genera documentación técnica o changelogs
3. Envía a revisión
4. Publica internamente o hacia usuarios

Estos flujos validan la estructura Timeline → Área → Editor → Content → Publishing.

---

# 6. Decisiones Clave Tomadas
- ✔️ La aplicación es estrictamente **product‑centric**
- ✔️ Los settings se mantienen separados del trabajo operativo
- ✔️ Cada área tiene su propio mini‑workspace con subtabs
- ✔️ Content Store centraliza todos los outputs
- ✔️ Publishing es una capa independiente
- ✔️ El dashboard por producto es deseable pero no prioritario
- ✔️ Vista agregada por organización se deja para futuras iteraciones

---

# 7. Enfoque para el Futuro
Próximos pasos:
1. Definir en detalle el **schema del Timeline** (eventos, increments, metadatos)
2. Diseñar la experiencia **Timeline → Área → Editor**
3. Formalizar el **Product Context** y su integración con IA
4. Integrar outline y máquina de estados en los editores
5. Modelar permisos avanzados por área
6. Diseño final del sidebar minimalista y navegación interna por subtabs

---

# 8. Conclusión
Hikai cuenta con una arquitectura sólida:
- Estructura product‑centric
- Timeline como fuente de verdad
- Áreas funcionales con navegación propia
- Content Store como repositorio unificado
- Publishing como capa final del flujo

Este documento actúa como base estratégica para la definición del modelo de datos, la arquitectura del frontend y la integración del motor de IA.

---
# 9. MVP Funcional Inicial

El MVP funcional de Hikai se centra en la creación del **Timeline Inteligente**, base indispensable para los módulos posteriores (Marketing, Customer Success, Product Team, Content Store y Publishing). El objetivo es permitir que un producto conectado a una fuente real pueda generar actividad entendible por la IA.

Este MVP se diseña para funcionar inicialmente con **GitHub**, pero con una arquitectura completamente escalable para soportar múltiples proveedores de datos.

## 9.1 Objetivos del MVP
- Permitir definir el **Contexto del Producto** (mínimo viable).
- Conectar una o varias **fuentes GitHub** a un producto.
- Ejecutar una **sincronización manual** que obtiene eventos desde GitHub.
- Registrar y almacenar **Raw Events** provenientes de las fuentes.
- Procesar esos Raw Events mediante IA para generar **Interpreted Events**.
- Mostrar el resultado como un **Timeline funcional por producto**.

Este Timeline será la base para todos los flujos de creación de contenido posteriores.

---

# 9.2 Componentes del MVP

## A) Product Context (mínimo viable)
Información esencial del producto para que la IA pueda contextualizar los eventos:
- Descripción breve del producto
- Tipo (B2B, B2C…)
- Público objetivo / audiencia principal

No requiere aún configuraciones avanzadas ni modelos complejos.

## B) Conexión de Fuentes
En la sección de *Settings → Products → Sources*, cada producto podrá conectar una o varias fuentes GitHub.

Cada conexión se modela como un objeto genérico, escalable a futuros proveedores:

- `provider`: github
- `config`: owner, repo
- `status`: active / disabled
- `lastSyncedAt`

La arquitectura permite incorporar fácilmente Linear, Jira, Notion u otros.

## C) Sincronización Manual
Se incluye un botón **Sync now** en la vista de Timeline.

El proceso realiza:
1. Obtención de commits, PRs o eventos relevantes desde GitHub.
2. Registro en la tabla de **Raw Events**.
3. Activación del motor de IA para procesar esos eventos.
4. Creación de **Interpreted Events**.

El MVP no requiere sincronización automática todavía.

## D) Timeline Inteligente
El Timeline mostrará eventos ya interpretados:
- Título
- Resumen
- Categoría (feature, bugfix, chore, docs…)
- Relevancia
- Fecha
- Referencias al Raw Event

No se requieren filtros complejos ni agrupaciones avanzadas en este MVP, aunque la arquitectura las permite en el futuro.

---

# 9.3 Modelo Escalable de Fuentes
Aunque el MVP solo utiliza GitHub, la arquitectura se diseña para admitir múltiples proveedores mediante una interfaz común:

- Conectores (`SourceConnector`)
- Orquestador de sincronización por producto
- Tablas genéricas: `product_sources`, `timeline_raw_events`, `timeline_events`

Esto garantiza que añadir nuevas fuentes en el futuro no afecte al diseño actual.

---

# 9.4 Entregable del MVP
Al finalizar este MVP, Hikai será capaz de:

- Conectar un producto digital a repositorios GitHub reales
- Extraer cambios recientes
- Interpretarlos semánticamente
- Construir un Timeline inteligible y útil

Esto permitirá construir sobre él los módulos de Marketing, Customer Success, Product Team, Content Store y Publishing.

---

# 10. Modelos de Planes y Estrategia de Producto

Este apartado define los planes de suscripción de Hikai, comenzando por el **Plan Free**, que actúa como la puerta de entrada al producto. Estos planes sirven como guía para la priorización de funcionalidades, el diseño de límites técnicos y el roadmap general.

---

# 10.1 Plan Free — Definición Detallada
El objetivo del Plan Free es permitir que usuarios individuales exploren el valor nuclear de Hikai —el Timeline Inteligente— sin incurrir en costes elevados de infraestructura ni comprometer funcionalidades avanzadas.

## 10.1.1 Organización y Productos
- 1 **organización personal**.
- 1 **producto digital**.

Esto limita el uso sin afectar la experiencia de descubrimiento.

## 10.1.2 Fuentes y Sincronización
- Máximo **1 fuente conectada** (p. ej. GitHub).
- **Sincronización manual limitada a 1 vez por semana**.
  - Si el usuario intenta sincronizar antes del límite semanal, se muestra un mensaje de restricción.
- Evita consumo excesivo de IA y APIs externas.

## 10.1.3 Límite de IA
- Límite mensual de procesamiento: **~20.000 tokens/mes** (ajustable según costes reales).
- Si se supera, se dejan de interpretar nuevos Raw Events, pero pueden seguir viéndose.

## 10.1.4 Timeline
El Timeline está totalmente habilitado:
- Muestra Raw Events.
- Muestra Interpreted Events generados mientras haya tokens.
- Permite descubrir el valor clave del producto.

## 10.1.5 Áreas Funcionales
Las áreas avanzadas se restringen.

### Marketing
- **Habilitado** con capacidades limitadas.
- Solo **un tipo de editor**: "short update" (equivalente a tweet/nota corta).
- Editores disponen únicamente de funciones **no–AI**, como:
  - edición básica de texto
  - formato mínimo
  - duplicar, borrar, etc.

### Capacidades AI dentro del editor
Deshabilitadas en Plan Free:
- Reformulación estilo "hazlo más profesional"
- Hazlo más corto/largo
- Reescritura completa
- Variantes

Esto crea una progresión clara hacia planes superiores.

### Customer Success y Product Team
- **Deshabilitados** en Plan Free.

## 10.1.6 Content Store
- Máximo **5 documentos** almacenados.
- Para crear un sexto documento debe:
  - borrar uno
  - o actualizar al plan Pro.

Esto protege almacenamiento e incentiva upgrade.

## 10.1.7 Publishing
- Publicación automática **deshabilitada**.
- Solo disponible:
  - copiar contenido al portapapeles
  - exportación minima (texto/markdown)

## 10.1.8 Permisos y Usuarios
- Solo **1 usuario** por organización Free.

Este límite simplifica soporte y reduce costes.

---

# 10.2 Plan Pro — Organizaciones Pequeñas y Profesionales
El Plan Pro está diseñado para organizaciones pequeñas, startups tempranas, equipos unipersonales o profesionales independientes que desarrollan y comunican el progreso de uno o varios productos digitales. Permite adoptar una narrativa de producto más rica, sostenida y profesional, sin las restricciones del Plan Free.

## 10.2.1 Orientación del Plan
El plan está alineado con varios tipos de organizaciones y roles:
- Fundadores únicos / indie hackers
- Pequeñas startups o productos paralelos
- Consultores independientes
- Fractional professionals (Fractional CMO / Product / CTO)

El plan pertenece a la **organización**, no al usuario. Un usuario puede participar en varias organizaciones con planes diferentes.

---

## 10.2.2 Usuarios y Roles
El Plan Pro **no limita el número de usuarios** que puede invitar una organización.

Los roles disponibles son:
- **Admin**: gestiona configuración y fuentes, no necesariamente editor.
- **Editor**: único rol capaz de crear y modificar contenido. Puede usar IA.
- **Viewer**: solo lectura. Puede ver timeline y contenido, no editar.

Esto permite:
- Invitar a toda la empresa sin aumentar costes.
- Mantener control sobre quién usa funcionalidades costosas (IA / editores).
- Facilitar la adopción orgánica del producto.

---

## 10.2.3 Productos Digitales Incluidos
- Hasta **2 productos digitales** por organización.

Perfecto para:
- Un producto principal + side project
- Un startup con dos líneas de producto
- Un fractional professional con dos cuentas activas

---

## 10.2.4 Fuentes y Sincronización
- Hasta **3 fuentes conectadas** por producto.
- **Sincronización automática diaria**.
- **Sincronización manual ilimitada**.

Permite procesar información suficiente para generar historias de producto ricas y bien contextualizadas.

---

## 10.2.5 Límite de IA
- Entre **100k y 150k tokens/mes** para interpretación de timeline y editores.
- Todas las capacidades IA dentro de los editores están habilitadas:
  - Reformulación
  - Extensión o acortamiento
  - Variaciones
  - Cambios de tono

---

## 10.2.6 Timeline
El timeline en Plan Pro está completamente habilitado, incluyendo:
- Raw Events
- Interpreted Events avanzados
- Insights automáticos
- Agrupaciones semanales
- Análisis semántico más profundo

Proporciona visibilidad profesional del progreso del producto.

---

## 10.2.7 Módulos Disponibles
### Marketing (Completo)
Incluye:
- Overview del área
- Sugerencias basadas en timeline
- Edición de short updates y contenido largo
- IA mejorada para generar narrativas ricas
- Plantillas de contenido

### Product Team (Básico)
Incluye:
- Changelogs sencillos
- Documentación interna mínima

### Customer Success
- **Deshabilitado** en Plan Pro.

---

## 10.2.8 Content Store
- Hasta **100 documentos** almacenados.
- Versionado habilitado.
- Estados de contenido: draft → review → approved.

El límite es suficiente para uso profesional sin convertirse en repositorio ilimitado.

---

## 10.2.9 Publishing
Habilitado para publicación en canales personales:
- X/Twitter
- LinkedIn
- Medium
- Blogs personales (WordPress, Ghost, Webflow)

Restricciones:
- Programación limitada (3–5 posts activos).
- No incluye canales corporativos (Slack, Discord → Business).

---

## 10.2.10 Permisos por Rol (Resumen)
- **Admin**: configura fuentes, producto, roles, settings.
- **Editor**: crea contenido y usa IA.
- **Viewer**: lectura del timeline y contenido.

Este modelo protege costes y permite adopción amplia en equipos pequeños.

---

# 10.3 Plan Business — Organizaciones Pequeñas y Medianas con Equipos Funcionales
El Plan Business está orientado a organizaciones más maduras que las del Plan Pro. Suelen ser startups pequeñas–medianas (5–40 personas), agencias de producto, o equipos que ya operan con roles funcionales diferenciados (Producto, Marketing, Customer Success) y necesitan gobernanza, colaboración y automatización parcial.

Este plan no solo amplía capacidades de contenido y colaboración, sino que introduce por primera vez **modo agente** en su versión básica, ideal para organizaciones con menos recursos y mayor necesidad de delegar trabajo repetitivo.

## 10.3.1 Usuarios y Roles
- **Usuarios ilimitados**.
- Roles avanzados:
  - **Admin**: configuración de organización y productos.
  - **Editor**: crea y modifica contenido; usa IA.
  - **Viewer**: solo lectura.
  - **Area Editor**: Editor con acceso solo a Marketing, CS o Product Team.
  - **Approver**: rol para validar contenido antes de publicar.

Permite gobernanza editorial real sin fricción en adopción.

## 10.3.2 Productos Digitales
- Hasta **5 productos digitales**.

Suficiente para:
- startups con varias líneas de producto,
- agencias con varios clientes,
- equipos con productos internos y externos.

## 10.3.3 Fuentes y Sincronización
- **5–10 fuentes por producto**.
- **Sincronización automática cada hora**.
- Sincronización manual ilimitada.

Pensado para stacks complejos: GitHub, Linear, Notion, Miro, Airtable, GitBook.

## 10.3.4 IA
- **200k–300k tokens/mes**.
- IA avanzada habilitada en todas las áreas.
- Insights más profundos en el timeline.

Incluye reformulación, ampliación, reducción, variantes, tono y generación contextual.

## 10.3.5 Áreas Funcionales Disponibles
### Marketing (completo)
- Contenido corto y largo.
- Newsletters.
- Sugerencias avanzadas.
- Workflows básicos.

### Product Team (completo)
- Changelogs.
- Documentación.
- Informes de incrementos.

### Customer Success (completo)
Incluye:
- Artículos de ayuda.
- Comunicaciones de cambios.
- Publicación a herramientas estándar.
- Edición IA avanzada.

### Internal Comms (básico)
- Resúmenes internos y comunicación a stakeholders.

## 10.3.6 Modo Agente (versión Business)
El Plan Business introduce el **modo agente básico**, pensado para organizaciones con pocos recursos que necesitan delegar trabajo repetitivo.

### Capacidades del agente en Business:
- **Generación proactiva de borradores**.
- Detección automática de increments relevantes.
- Agrupación semanal/mensual de novedades.
- Backlog inteligente de sugerencias.
- Resúmenes automáticos del progreso (en draft).
- Limitado por tokens específicos.
- Siempre requiere supervisión humana (Editor/Approver).

### Limitaciones en Business:
- No publica automáticamente.
- No recibe instrucciones programáticas.
- No integra MCP.
- No orquesta múltiples productos.

Es un **copiloto autónomo**, no un sistema autoejecutable.

## 10.3.7 Content Store
- Hasta **500 documentos**.
- Workflow editorial completo: draft → review → approved → published.
- Versionado.
- Comentarios internos.

## 10.3.8 Publishing
- Publicación a canales personales y corporativos:
  - X/Twitter
  - LinkedIn
  - Medium / blogs
  - Slack
  - Microsoft Teams
  - Email providers (Mailchimp, Brevo)
- Programación completa.

## 10.3.9 Integraciones
### Incluidas en Business (estándar, no personalizadas):
- Intercom
- GitBook
- Zendesk
- Notion
- HubSpot (básico)

### API / Webhooks
- API de lectura limitada (timeline y contenido aprobado).
- Webhooks básicos (nuevo contenido aprobado, publicado, nuevo interpreted event).

### No incluidas en Business (Enterprise únicamente):
- Integraciones ad-hoc.
- API de escritura.
- Integración via MCP.
- Pipelines internos.
- Workflows avanzados.
- Orquestación multi-producto.

## 10.3.10 Seguridad
- Permisos granulares por área.
- Audit log básico.

---

# 10.4 Visión Enterprise — Eje Programático y Modo Agente Avanzado
El Plan Enterprise representa la visión futura de Hikai como **infraestructura narrativa corporativa**. No es solo un generador de contenido: es un **CMS programático centralizado**, conectado al timeline y capaz de integrarse con sistemas internos mediante APIs, SDKs y agentes.

Esta sección no define especificaciones técnicas finales, pero sí los **principios estratégicos** que guían la arquitectura.

## 10.4.1 Explotación Programática del Contenido
Enterprise convierte el Content Store en:
- un dataset estructurado,
- accesible vía API/SDK,
- utilizable por equipos internos,
- integrable con plataformas externas.

Ejemplos de usos futuros:
- alimentar CMS internos,
- generar newsletters automáticas,
- sincronizar documentación técnica,
- dashboards de progreso,
- entrenamiento de agentes internos.

Esto **solo** puede existir en Enterprise por:
- seguridad,
- sensibilidad del contenido,
- coste operativo,
- sofisticación del equipo técnico requerido.

## 10.4.2 Modo Agente Avanzado
El agente empresarial supera el modelo reactivo del plan Business.

Incluye:
- autonomía real bajo reglas,
- publicación automática con políticas,
- integración MCP para instrucciones programáticas,
- acceso a sistemas internos,
- workflows aprobables avanzados,
- orquestación multi-producto,
- auditoría completa.

Es un "motor narrativo corporativo".

## 10.4.3 Integraciones Enterprise
- API completa (lectura y escritura limitada).
- SDK oficial.
- Integraciones ad-hoc.
- Webhooks avanzados.
- Conexión con pipelines internos (Airflow, Dagster, dbt…).

## 10.4.4 Seguridad y Compliance
- SAML/SSO.
- SCIM.
- Auditoría avanzada.
- DLP y retención configurable.

---

# 11. Roadmap por Fases — Prioridades, Pospuestos y Fundamentos Arquitectónicos
Esta tabla resume en qué deberíamos centrarnos en cada fase, qué debe posponerse y qué fundamentos arquitectónicos deben quedar bien establecidos desde el inicio para evitar refactors futuros. Es una guía estratégica, no un compromiso fijo.

| Fase | Enfoque Principal | Qué Posponer | Fundamentos a Establecer Desde el Inicio |
|------|-------------------|--------------|-------------------------------------------|
| **Fase 0 — Core Técnico / Setup** | - Base del frontend y backend<br>- Modelo de organizaciones / productos<br>- Autenticación y roles básicos<br>- UI base del Product Workspace | - Cualquier funcionalidad de agente<br>- Integraciones externas<br>- API pública/SaaS avanzado | - Arquitectura product-centric<br>- Roles escalables (Admin/Editor/Viewer)<br>- Modelo de producto aislado<br>- Navegación basada en producto<br>- Estructura del Content Store aunque esté vacío |
| **Fase 1 — MVP Timeline** | - Conectar fuentes (GitHub)<br>- Raw Events → Interpreted Events<br>- Motor de sincronización manual<br>- Timeline básico visible | - Insights avanzados<br>- Agrupaciones temporales<br>- Múltiples fuentes | - Modelo de eventos bien diseñado<br>- Pipeline Raw → Interpreted modular<br>- Diseño escalable del Timeline<br>- Preparar arquitectura para añadir nuevas fuentes |
| **Fase 2 — MVP Marketing** | - Editor básico de contenido<br>- IA fundamental (reformular, resumir)<br>- Short updates<br>- Content Store funcional | - Contenido largo avanzado<br>- Plantillas complejas<br>- Publishing automatizado | - Estructura del Content Store (versiones, estados)<br>- Sistema editorial básico<br>- Permisos por rol (solo editores generan contenido) |
| **Fase 3 — Publishing Inicial** | - Publicación manual y previsualización<br>- Conexión a X/Twitter y LinkedIn (mínimo) | - Calendarios avanzados<br>- Integraciones corporativas (Slack, Teams)<br>- Programación múltiple | - Diseño del Publishing Hub<br>- Modelo extensible de canales |
| **Fase 4 — Áreas Funcionales (Marketing/ProdTeam)** | - Marketing completo (contenido largo, newsletters)<br>- Product Team (changelogs, documentación)<br>- Mejoras en Timeline-Driven Content | - Customer Success<br>- Internal Comms<br>- Integraciones externas | - Diseño extendible por áreas<br>- Motor de insights por área |
| **Fase 5 — Plan Business** | - Customer Success completo<br>- Roles avanzados (Area Editor, Approver)<br>- Integraciones estándar (Intercom, GitBook) | - API de lectura avanzada<br>- Webhooks sofisticados | - Permisos por área<br>- Workflow editorial completo<br>- Estructura para modo agente básico |
| **Fase 6 — Modo Agente (Business)** | - Agente reactivo y proactivo limitado<br>- Resúmenes automáticos semanales<br>- Backlog inteligente | - Publicación autónoma<br>- MCP<br>- Orquestación multi-producto | - Infraestructura modular de agente<br>- Sistema de límites por tokens del agente |
| **Fase 7 — Enterprise** | - API/SDK programático completo<br>- Integraciones ad-hoc<br>- Agente avanzado autónomo<br>- Publishing automático corporativo | - Todo lo relacionado con self-hosting o compliance extremo (si aplica) | - Arquitectura API-first<br>- MCP-ready<br>- Audit logs avanzados<br>- Seguridad enterprise (SSO, SCIM) |

---

Fin del resumen actualizado.

