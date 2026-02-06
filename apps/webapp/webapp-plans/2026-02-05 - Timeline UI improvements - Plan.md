# Timeline UI Evolution Plan

> **Objetivo**: Transformar el timeline de un changelog tradicional a una experiencia AI-native que cuente la historia de maduración del producto.

---

## Visión Final

El timeline de Hikai debe sentirse como **explorar un sistema vivo**, no como leer una lista de cambios. El usuario debe entender cómo evoluciona su producto sin necesidad de contexto técnico.

**Prueba del algodón**: Si alguien dice "qué dashboard tan bien hecho", fallamos. Si dice "ahora entiendo cómo ha crecido este producto", ganamos.

---

## Principios de Diseño

| Principio | En lugar de... | Hacer... |
|-----------|---------------|----------|
| **Estado > Lista** | "12 features, 8 fixes" | "Este dominio está madurando" |
| **Gesto > Control** | Filtros con botón "Apply" | Scrubber que transforma en tiempo real |
| **Contexto > Filtro** | Ocultar lo que no coincide | Atenuar lo no relevante, iluminar lo relacionado |
| **Narrativa > Métricas** | Contadores y badges | Frases interpretativas |
| **Transición > Corte** | Cambios instantáneos | Animaciones que comunican movimiento |

---

## Fase 0: Hero Bucket Experience

**Objetivo**: Transformar el timeline en una experiencia donde cada bucket "cuenta su historia" como protagonista.

### Concepto Central: Bucket Hero + Compresión

El bucket activo se expande como una **hero section en miniatura**, mientras los demás se comprimen mostrando solo lo esencial. Cambiar de bucket no es "mover el foco", es que **otro bucket ocupe el escenario**.

**Referencia visual**: Estética de la landing de Hikai (tipografía con peso, jerarquía clara, espaciado generoso).

---

### 0.1 Layout General

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Timeline                    ↓ Previous  ↑ Next  ⊤ Most recent                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Jan 19 → Jan 23  ○         ┌──────────────────────────────────────────────┐   │
│                             │ Domain-mapper & agent UX improvements        │   │
│                             │ ✨ 📈   [AI & Agents] [Products]             │   │
│                             └──────────────────────────────────────────────┘   │
│                                                                                 │
│                    ●        ┌──────────────────────────────────────────────────┐│
│                    │        │                                                  ││
│  Jan 16 → Jan 19   │        │  Improved agent experience                       ││
│                    │        │  and domain mapping.                             ││
│                    │        │                                                  ││
│                    │        │  More robust domain mapping and       AI & Agents││
│                    │        │  increased visibility of agents          ●       ││
│                    │        │  progress.                            Products   ││
│                    │        │                                          ●       ││
│                    │        │  │ ✨ 3 · 📈 2 · 🛡 1                  Timeline   ││
│                    │        │                                          ○       ││
│                    │        │                                       Marketing  ││
│                    │        │                                          ○       ││
│                    │        └──────────────────────────────────────────────────┘│
│                    │                                                            │
│  Jan 12 → Jan 16   ○        ┌──────────────────────────────────────────────┐   │
│                             │ Improvements to agent signal processing      │   │
│                             │ ✨ 📈   [AI & Agents] [Products]             │   │
│                             └──────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Elementos preservados**:
- Línea temporal vertical con dots de impacto (izquierda)
- Fechas junto a cada bucket
- Panel derecho de eventos con filtrado granular

---

### 0.2 Hero Bucket (expandido)

El bucket activo ocupa más espacio vertical y muestra contenido completo.

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  Improved agent experience                                         │
│  and domain mapping.                            AI & Agents  ●     │
│                                                 Products     ●     │
│  More robust domain mapping and increased       Timeline     ○     │
│  visibility of agents progress.                 Marketing    ○     │
│                                                                    │
│  │ ✨ 3 features · 📈 2 improvements · 🛡 1 fix                    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Estructura interna**:

| Elemento | Posición | Estilo |
|----------|----------|--------|
| **Título** | Izquierda, arriba | Grande, bold, sentence case, puede ser 2 líneas |
| **Descripción** | Izquierda, debajo del título | text-muted-foreground, una línea |
| **Categorías** | Izquierda, con borde accent | `│ ✨ 3 · 📈 2 · 🛡 1` (solo las que tienen count > 0) |
| **Dominios** | Derecha, lista vertical | Todos del domain map, ● activos / ○ inactivos |

**Dominios**:
- Source of truth: **Domain Map del producto**
- Se listan TODOS los dominios del producto
- Los impactados en este bucket: indicador activo (●, color, o fondo)
- Los no impactados: indicador inactivo (○, muted)
- Click en dominio → filtrar eventos por ese dominio

---

### 0.3 Bucket Comprimido

Los buckets no activos muestran información mínima.

```
┌──────────────────────────────────────────────────────────────────┐
│  Domain-mapper & agent UX improvements    ✨ 📈  [AI&Agents] [Products] │
└──────────────────────────────────────────────────────────────────┘
```

**Contenido**:
- Título (el `summary.title` actual)
- Iconos de categorías presentes (sin números, solo presencia visual)
- Badges de dominios impactados (como actualmente)

**Click** → Se expande como hero, el anterior se comprime.

---

### 0.4 Formato de Narrativa (para el agente)

El agente debe generar narrativas optimizadas para el formato hero:

| Campo | Formato | Ejemplo |
|-------|---------|---------|
| `title` | Acción + área, sentence case, conciso | "Improved agent experience and domain mapping." |
| `narrative` | Una línea que expande el beneficio | "More robust domain mapping and increased visibility of agents progress." |

**Guías para el prompt del agente**:
- Título: verbo en pasado + objeto (máx ~8-10 palabras)
- Narrativa: resultado o beneficio concreto (máx ~15 palabras)
- El título puede ser semi-técnico, la narrativa debe ser legible por no-técnicos
- Evitar repetir información entre título y narrativa
- El punto final en el título es intencional (estilo headline)

---

### 0.5 Transiciones

**Al cambiar de bucket** (click, prev/next, keyboard):

1. Bucket actual hero se comprime suavemente:
   - Altura reduce con ease-out
   - Descripción y dominios hacen fade-out
   - Queda solo título + iconos + badges

2. Nuevo bucket se expande:
   - Altura crece con ease-in
   - Descripción y dominios hacen fade-in
   - Dominios del domain map se actualizan (activos/inactivos)

3. Scroll ajusta para centrar el nuevo hero

4. Panel derecho actualiza eventos con stagger animation

**Duración sugerida**: 250-350ms total

---

### 0.6 Cambios Técnicos

**Componentes a modificar**:
- [ ] `TimelineList` → nuevo layout con hero/comprimido
- [ ] Nuevo componente `BucketHero` para el bucket expandido
- [ ] Nuevo componente `BucketCompact` para buckets comprimidos
- [ ] Componente `DomainList` para la lista vertical de dominios

**Datos necesarios**:
- [ ] Obtener domain map del producto (ya existe en `api.products.domains`)
- [ ] Calcular dominios impactados por bucket
- [ ] Contar eventos por categoría en cada bucket

**Animaciones**:
- [ ] Transiciones CSS o framer-motion para expand/collapse
- [ ] Fade transitions para contenido
- [ ] Stagger para lista de eventos

**Agente de narrativas**:
- [ ] Actualizar prompt para generar título + narrativa en formato hero
- [ ] Validar longitud y estilo de las narrativas generadas

---

## Fase 1: Scrubber Temporal como Eje Central

**Objetivo**: El tiempo deja de ser un filtro y se convierte en el eje principal de exploración.

### 1.1 Nuevo Componente TimeScrubber

**Estado actual**: Navegación prev/next con botones, filtro de fechas en dropdown.

**Propuesta**: Un scrubber horizontal que:
- Muestra todos los buckets como puntos en una línea
- Se puede arrastrar para "viajar" en el tiempo
- Snap suave a buckets
- El bucket activo se destaca visualmente

```
       ●───○───○───●───○───●───○───●
      Jan    Feb    Mar    Apr    May
              ▲
         [bucket activo]
```

**Comportamiento**:
- Arrastrar = transicionar entre buckets
- Click en punto = saltar a ese bucket
- El jardín/lista responde en tiempo real mientras arrastras

**Cambios técnicos**:
- [ ] Nuevo componente `TimeScrubber`
- [ ] Renderizar buckets como puntos posicionados proporcionalmente
- [ ] Drag gesture con snap
- [ ] Callback `onBucketChange` durante drag (no solo al soltar)
- [ ] Indicador visual de bucket activo

### 1.2 Layout Reorganizado

**Propuesta de layout desktop**:

```
┌────────────────────────────────────────────────────┐
│  ⏳ Time Scrubber (protagonista, sticky)           │
├────────────────────┬───────────────────────────────┤
│                    │                               │
│  Bucket Card       │     Panel de Eventos          │
│  (estado actual)   │     (scroll interno)          │
│                    │                               │
│  ○ Dominios        │     ┌─────────────────────┐   │
│  ○ Narrativa       │     │ Evento 1            │   │
│  ○ Insight         │     │ Evento 2            │   │
│                    │     │ ...                 │   │
│                    │     └─────────────────────┘   │
└────────────────────┴───────────────────────────────┘
```

**Cambios vs actual**:
- Scrubber arriba, siempre visible
- Bucket card a la izquierda (uno solo, el activo)
- Lista de eventos a la derecha
- Sin lista vertical de todos los buckets (el scrubber la reemplaza)

### 1.3 Filtros como Modos

**Estado actual**: Dropdown con checkboxes que ocultan/muestran.

**Propuesta**: Los filtros cambian el "modo de lectura", no ocultan datos:
- **Sin filtro**: Todo visible con opacidad completa
- **Filtro por dominio**: Otros dominios se atenúan (opacity 0.3)
- **Filtro por capability**: Solo se iluminan eventos relacionados
- **Filtro por tipo**: Features destacadas, resto atenuado

**Cambios técnicos**:
- [ ] Cambiar lógica de filtrado de `filter()` a `map()` con flag `isHighlighted`
- [ ] Estilos condicionales por estado highlight
- [ ] Transición suave al cambiar filtro

---

## Fase 2: Canvas Visual de Dominios

**Objetivo**: Añadir una vista estructural del producto que responde al tiempo, permitiendo explorar tanto temporalmente (timeline) como funcionalmente (canvas).

---

### 2.1 Layout: Timeline + Canvas lado a lado

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  Timeline                                     [Sync] [Regenerate] [History]   │
├────────────────────────────────┬──────────────────────────────────────────────┤
│                                │                                              │
│  Aug 8 → Aug 11  ○             │                                              │
│  [Bucket comprimido]           │         ┌───────────┐    ┌───────────┐       │
│                                │         │           │    │           │       │
│  Aug 4 → Aug 8   ●             │         │ Products  │    │ AI&Agents │       │
│  ┌────────────────────────┐    │         │     ●     │    │     ●     │       │
│  │ Initialized web app.   │    │         │           │    │           │       │
│  │                        │    │         └───────────┘    └───────────┘       │
│  │ Created minimal Vite   │    │                                              │
│  │ frontend...            │    │    ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │                        │    │    │  Auth   │  │Connectors│  │Timeline │     │
│  │ ⚙ 1 work  [Ver eventos]│    │    │    ○    │  │    ○    │  │    ○    │     │
│  └────────────────────────┘    │    └─────────┘  └─────────┘  └─────────┘     │
│                                │                                              │
│  Jul 21 → Jul 25  ○            │              CANVAS                          │
│  [Bucket comprimido]           │     (estado del producto en Aug 4-8)         │
│                                │                                              │
└────────────────────────────────┴──────────────────────────────────────────────┘
```

**Estructura**:
- **Izquierda**: Timeline con hero bucket (Fase 0)
- **Derecha**: Canvas de dominios (reemplaza panel de eventos)
- El panel de eventos se abre desde el hero bucket con un botón

---

### 2.2 Canvas: Representación de dominios

**Tamaño proporcional acumulado**:
- Cada dominio tiene tamaño proporcional a su energía acumulada **hasta ese bucket**
- La suma de todos los dominios = 100% del espacio (tamaño total estable)
- Un dominio no decrece en valor absoluto, pero puede decrecer proporcionalmente
- Ejemplo: Auth empieza grande (fundacional), pero se "comprime" relativamente a medida que otros crecen

**Estados visuales**:
- **Activo en bucket**: Iluminado/destacado (borde, brillo, o color intenso)
- **Inactivo en bucket**: Normal, sin destacar
- **Sin eventos históricos**: Muy atenuado o placeholder

**Lo que comunica**:
- Tamaño → Inversión histórica acumulada
- Brillo → Actividad en el bucket actual
- Proporción cambiante → Hacia dónde evoluciona el foco del producto

---

### 2.3 Interacción Canvas ↔ Timeline

**Al cambiar de bucket**:
1. Canvas recalcula proporciones (energía acumulada hasta nuevo bucket)
2. Dominios cambian de tamaño suavemente (transición animada)
3. Se actualizan los dominios iluminados (los que tienen actividad en ese bucket)

**Efecto "time-lapse"**:
- Moviéndose rápido entre buckets, el usuario ve dominios "crecer" o "comprimirse"
- Comunica la evolución del producto sin leer texto

---

### 2.4 Events Card (desde Timeline)

Se abre desde el hero bucket con botón "Ver eventos".

**Contenido**:
- Lista de eventos del bucket actual
- Filtros (categoría, dominio, visibility)
- Mismo contenido que el panel actual, pero en modal/sheet

**Implementación**: Sheet lateral o modal.

---

### 2.5 Capabilities Card (desde Canvas)

Se abre al hacer click en un dominio del canvas.

**Contenido**:
- Título del dominio
- Lista de **todas** las capabilities del dominio
- Capabilities con eventos hasta este bucket: normales
- Capabilities sin eventos: atenuadas
- Cada capability es expandible

**Al expandir una capability**:
- Lista de eventos históricos de esa capability hasta el bucket actual
- Ordenados cronológicamente (más reciente arriba o abajo, a definir)

```
┌─────────────────────────────────────────────────┐
│  Products                                   ✕   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ▼ Product Context Mapping          3 events   │
│    ┌─────────────────────────────────────────┐  │
│    │ ● Aug 4: Improved domain-map card       │  │
│    │ ● Jul 28: Added context signals         │  │
│    │ ● Jul 15: Initial context extraction    │  │
│    └─────────────────────────────────────────┘  │
│                                                 │
│  ▶ Product Surface Detection        2 events   │
│                                                 │
│  ▶ Feature Classification           1 event    │
│                                                 │
│  ▶ Domain Inference                 (ninguno)  │  ← atenuado
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### 2.6 Cambios Técnicos

**Nuevos componentes**:
- [ ] `DomainCanvas` — Renderiza dominios con tamaños proporcionales
- [ ] `CapabilitiesCard` — Sheet/modal con capabilities del dominio
- [ ] `EventsCard` — Sheet/modal con eventos del bucket (extraer del panel actual)

**Cálculos necesarios**:
- [ ] Energía acumulada por dominio hasta cada bucket
- [ ] Proporción de cada dominio (dominio / total)
- [ ] Eventos por capability hasta cada bucket

**Layout**:
- [ ] Reorganizar página: timeline izquierda, canvas derecha
- [ ] Eliminar panel de eventos fijo, convertir en card on-demand

**Animaciones**:
- [ ] Transición de tamaño de dominios al cambiar bucket
- [ ] Transición de iluminación (activo/inactivo)

**Representación visual del canvas**:
- [ ] Decidir: bubbles, treemap, voronoi, o custom layout
- [ ] Implementar con SVG, Canvas, o librería (d3, visx, etc.)

---

### 2.7 Representación Visual: Voronoi

**Decisión**: Voronoi weighted con posiciones fijas.

```
┌─────────────────────────────────────────────┐
│                    ╱    ╲                   │
│      Products    ╱        ╲    AI & Agents  │
│        ●       ╱            ╲      ●        │
│              ╱                ╲              │
│            ╱                    ╲            │
│──────────╱────────────────────────╲─────────│
│         ╲        Auth        ╱              │
│           ╲        ○       ╱    Timeline    │
│             ╲            ╱        ○         │
│               ╲        ╱                    │
│                 ╲    ╱      Connectors      │
│                   ╲╱           ○            │
└─────────────────────────────────────────────┘
```

**Características**:
- Cada dominio = una región del Voronoi
- **Posición de semillas**: Fija por dominio (memoria espacial)
- **Tamaño de región**: Proporcional a energía acumulada (weighted Voronoi)
- **Bordes**: Rectos (Voronoi clásico, V1)
- **Evolución futura**: Bordes curvos/orgánicos con Perlin noise (V2)

**Estados visuales**:
- Dominio activo en bucket: región iluminada (borde accent, fondo con tint)
- Dominio inactivo: región normal
- Dominio sin eventos históricos: región muy atenuada

**Animación**:
- Al cambiar bucket: regiones se expanden/contraen suavemente
- Transición de pesos interpolada

**Implementación**:
- Librería: `d3-delaunay` + weighted Voronoi custom o `d3-voronoi-treemap`
- Renderizado: SVG (más fácil para interactividad)
- Click en región → abre Capabilities Card

### 2.8 Decisiones pendientes

- [ ] Ordenar eventos en capability: ¿más reciente arriba o abajo?
- [ ] ¿Mostrar label del dominio dentro de la región o solo en hover?
- [ ] ¿Mostrar count de eventos en cada región?

---

## Fase 3: Zoom Semántico

**Objetivo**: Profundizar en un dominio revela su estructura interna.

### 3.1 Drill-down en Dominio

Al hacer click prolongado o zoom gesture en un dominio:
- El canvas hace zoom suave
- El dominio seleccionado ocupa el canvas
- Aparece un sub-layout de capabilities dentro

### 3.2 Niveles de Lectura

| Nivel | Pregunta que responde | Representación |
|-------|----------------------|----------------|
| Jardín | ¿Cómo crece el producto? | Dominios como regiones |
| Dominio | ¿Qué sistema hay aquí? | Capabilities como sub-regiones |
| Capability | ¿Qué lo hace posible? | Relato temporal, layers |
| Feature | ¿Qué cambió para el usuario? | Cards de detalle |

---

## Fase 4: Mobile como Narrativa

**Objetivo**: Mobile no es desktop reducido, es otra experiencia.

### 4.1 Mobile Layout

```
┌─────────────────────┐
│  ⏳ Time Scrubber   │  ← Protagonista
├─────────────────────┤
│  Bucket Card        │  ← Estado del jardín
│  - Narrativa        │
│  - Dominios activos │
│  - Insight          │
├─────────────────────┤
│  Lista de eventos   │  ← Scroll vertical
│  (colapsable)       │
└─────────────────────┘
```

### 4.2 Sin Canvas, Misma Lógica

- El canvas no se renderiza en mobile
- Pero los datos y estados son los mismos
- Dominios como tags horizontales con indicador de estado
- Scrubber funciona igual

---

## Roadmap de Implementación

| Fase | Items | Descripción | Prioridad |
|------|-------|-------------|-----------|
| 0.1 | Layout hero/comprimido | Estructura visual con bucket expandido y comprimidos | P0 |
| 0.2 | Componente BucketHero | Título, narrativa, categorías, dominios | P0 |
| 0.3 | Componente BucketCompact | Versión comprimida con título, iconos, badges | P0 |
| 0.4 | DomainList con domain map | Lista de dominios del producto, activos/inactivos | P0 |
| 0.5 | Transiciones expand/collapse | Animaciones suaves al cambiar bucket | P0 |
| 0.6 | Prompt del agente | Actualizar para generar narrativas formato hero | P1 |
| 1.1 | TimeScrubber component | Scrubber horizontal con drag y snap | P1 |
| 1.2 | Layout con scrubber | Reorganizar layout para scrubber protagonista | P1 |
| 1.3 | Filtros como modos | Atenuar en lugar de ocultar | P2 |
| 2.1 | Layout timeline + canvas | Reorganizar: timeline izquierda, canvas derecha | P1 |
| 2.2 | DomainCanvas component | Renderizar dominios con tamaño proporcional | P1 |
| 2.3 | Interacción canvas ↔ bucket | Cambiar bucket actualiza canvas (tamaño, iluminación) | P1 |
| 2.4 | EventsCard | Extraer panel de eventos a sheet/modal on-demand | P1 |
| 2.5 | CapabilitiesCard | Sheet con capabilities del dominio + eventos expandibles | P1 |
| 2.6 | Cálculo energía proporcional | Calcular tamaño de dominios por bucket | P1 |
| 3.x | Zoom semántico | Drill-down en dominios | P3 |
| 4.x | Mobile experience | Experiencia mobile adaptada | P3 |

---

## Métricas de Éxito

**Cualitativas**:
- [ ] Usuario entiende evolución sin leer texto técnico
- [ ] Sensación de "explorar", no de "usar herramienta"
- [ ] Diferenciación clara vs Linear/Jira/GitHub

**Cuantitativas**:
- [ ] Tiempo en página (engagement)
- [ ] Uso del scrubber vs navegación tradicional
- [ ] Clics en dominios/capabilities (exploración)

---

## Notas de Iteración

_Esta sección se actualizará con decisiones tomadas durante la implementación._

### 2026-02-05 - Kickoff
- Plan inicial creado basado en sesión de brainstorming
- Foco inicial en Fase 0 (quick wins) y Fase 1 (scrubber)

### 2026-02-05 - Iteración Fase 0: Hero Bucket
- **Decisión**: Bucket activo como hero section, resto comprimidos
- **Decisión**: Mantener línea temporal vertical con dots de impacto
- **Decisión**: Mantener panel derecho de eventos con filtrado
- **Decisión**: Dominios del domain map del producto (source of truth)
- **Decisión**: Todos los dominios visibles en hero, activos/inactivos diferenciados
- **Decisión**: Iconos de categoría presentes tanto en hero como en comprimidos
- **Decisión**: Tamaño del hero NO varía por impacto (evitar caos visual)
- **Referencia visual**: Estética landing Hikai (tipografía bold, jerarquía clara)
- **Formato narrativa**: Título sentence case + descripción corta (actualizar agente)

### 2026-02-06 - Iteración Fase 2: Canvas de Dominios
- **Decisión**: Layout lado a lado (timeline izquierda, canvas derecha)
- **Decisión**: Canvas reemplaza panel de eventos; eventos se abren como card on-demand
- **Decisión**: Tamaño de dominios = proporción de energía acumulada hasta el bucket (∑ = 100%)
- **Decisión**: Dominios no decrecen en absoluto, pero sí proporcionalmente vs otros
- **Decisión**: Click en dominio abre Capabilities Card con todas las capabilities
- **Decisión**: Capabilities sin eventos hasta ese bucket aparecen atenuadas
- **Decisión**: Al expandir capability, se muestra histórico acumulado de eventos hasta el bucket
- **Decisión**: Para ver estado actual del producto, ir al bucket más reciente
- **Objetivo**: Página pública con punch visual que une exploración temporal y funcional

### 2026-02-06 - Iteración Fase 2: Voronoi
- **Decisión**: Representación visual = Voronoi weighted
- **Decisión**: Posición de semillas = fija por dominio (memoria espacial)
- **Decisión**: Bordes = rectos (V1), evolucionar a curvos/orgánicos (V2)
- **Decisión**: Empezar con implementación básica e iterar
