# HIKAI — TIMELINE UI SPEC (v1.0)

Este documento define la interfaz base del Timeline de Hikai:  
Navigator → Timeline → Detail Card (Overview + Activity).

---

# 1. Layout General (Desktop)

```
 ---------------------------------------------------------------
| NAVIGATOR (left) | TIMELINE (middle)        | DETAIL CARD    |
| fixed, vertical  | scrollable-only timeline | fixed, tabs UI |
 ---------------------------------------------------------------
```

- Navigator + Timeline ≈ 55–60% del ancho.
- Detail Card ≈ 40–45%.
- Navigator y Detail Card **no hacen scroll**.
- El Timeline scrolla verticalmente dentro de su panel.

---

# 2. Componentes Principales

```
/components/timeline/
  TimeNavigator.tsx
  Timeline.tsx
  TimelineEvent.tsx
  TimelineDetailCard.tsx
  TimelineControls.tsx
```

---

# 3. Time Navigator (vertical)

### Función
- Mostrar densidad histórica de eventos.
- Permitir seleccionar una ventana temporal.
- Sincronizar la ventana seleccionada con el Timeline.

### Elementos
- Barra vertical de densidad.
- Ventana seleccionable (draggable + resizable).
- Botón “Hoy”.

### Props
```ts
interface TimeNavigatorProps {
  density: number[]; // densidad por unidad temporal
  windowStart: Date;
  windowEnd: Date;
  onWindowChange: (start: Date, end: Date) => void;
}
```

---

# 4. Timeline (zig-zag vertical)

### Función
- Mostrar eventos del rango seleccionado.
- Navegar mediante scroll o teclas.

### Estilo
- Tarjetas alternadas izquierda/derecha.
- Línea vertical central.
- Sensación “flotante” con sombras suaves.
- Gradientes arriba/abajo para desvanecer bordes.

### Props
```ts
interface TimelineProps {
  events: TimelineEvent[];
  onSelect: (id: string) => void;
}
```

### Evento base
```ts
interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  summary: string;
  type: "feature" | "bugfix" | "docs" | "infra" | "other";
  importance: number;  // 1–5
  rawCount: number;
  interpretedCount: number;
}
```

---

# 5. Detail Card (2 tabs)

El panel derecho muestra los detalles del evento seleccionado.

Si no hay selección → muestra un **Empty State**.

## Tabs:
1. **Overview**
2. **Activity**

---

## 5.1 Overview Tab

Contenido:
- Título del incremento.
- Fecha.
- Badges / categorías.
- Resumen semántico (IA).
- Highlights.
- Insights generados.
- Acciones:
  - Enviar a Marketing.
  - Enviar a Customer Success.
  - Enviar a Product Team.
  - Añadir al backlog del agente.

Props:
```ts
interface DetailOverviewProps {
  event: TimelineEvent;
  insights: string[];
  onSendToArea: (area: "marketing" | "cs" | "product") => void;
  onAddToAgent: () => void;
}
```

---

## 5.2 Activity Tab

Contenido:
- Lista de Interpreted Events (expandible).
- Lista de Raw Events (commits, PRs, issues).
- Enlaces externos.
- Metadatos (autoría, timestamps, intensidad, etc.).

Props:
```ts
interface DetailActivityProps {
  interpreted: InterpretedEvent[];
  raw: RawEvent[];
}
```

---

## 5.3 Empty State

```
#### No event selected
Selecciona un incremento en el timeline para ver más detalles.
```

---

# 6. Timeline Controls

Incluye:
- Filter (type)
- Importance
- Area
- Toggle “Only increments”
- Button “Today”

Props:
```ts
interface TimelineControlsProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  onToday: () => void;
}
```

---

# 7. Mobile Behavior

### Layout
- Navigator vertical fino en el lateral.
- Timeline ocupa toda la pantalla.
- DetailCard → modal fullscreen.

### Gestos
- Drag en navigator para mover ventana.
- Scroll vertical en timeline.
- Tap evento → abrir modal.
- Swipe down → cerrar modal.

---

# 8. Notas de Diseño Visual

- Timeline cards flotando con sombras suaves.
- Gradiente vertical para desvanecer límites.
- Animaciones ligeras (ease-in-out 120ms).
- Sólida separación visual entre Navigator, Timeline y Card.
- Estética limpia y minimalista acorde al diseño actual de Hikai.

---

# Fin del documento
