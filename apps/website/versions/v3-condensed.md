# Landing v3 - Condensed

> Status: Ready for implementation
> Focus: Estructura condensada, Timeline arriba, fusiones
> Date: February 2026

---

# PART 1: STRUCTURE & NAVIGATION

## Navigation

**Items (5):**
| ID | Label | Sections included |
|----|-------|-------------------|
| #problem | The Problem | Problem section |
| #product | The Product | Timeline + How It Works |
| #impact | Impact | Visibility Shift + Day One |
| #why | Why Hikai | Context + Audience |
| #roadmap | Roadmap | What's Coming |

**CTA:** Sign up (corto)

**Scroll spy behavior:**
- Subrayado animado que aparece bajo el link activo
- Transición suave al cambiar de sección
- El subrayado entra con animación (slide-in o fade)

**Specs:**
```
┌─────────────────────────────────────────────────────────────┐
│  Logo    The Problem  The Product  Impact  Why Hikai  Roadmap    [Sign up]
│                         ────────
│                         (underline activo con animación)
└─────────────────────────────────────────────────────────────┘
```

---

## Page Structure (8 sections → 5 nav groups)

```
1. HERO                          (no nav link, es el inicio)
2. THE PROBLEM                   → #problem
3. THE PRODUCT (Timeline)        → #product
4. HOW IT WORKS                  → #product (mismo grupo)
5. IMPACT (Visibility + Day One) → #impact
6. WHY HIKAI (Context + ICPs)    → #why
7. ROADMAP                       → #roadmap
8. FINAL CTA                     (no nav link, es el cierre)
```

---

# PART 2: MESSAGING (Copy-ready)

---

## Hero

**Badge:** your product story, told automatically

**Title:** Your development, narrated for the world.

**Tagline:** From commits to clarity.

**Subtitle:** Hikai captures what's happening in your codebase and translates it into a public timeline your audience can actually follow — automatically, continuously, without the grind.

**CTA:** Publish your timeline — free

---

## The Problem

**Badge:** the problem

**Title:** The bottleneck nobody talks about

**Body:**
Your product is evolving every day. Features ship. Bugs get fixed. The roadmap moves forward.

But outside of engineering, nobody knows.

And even when updates get shared, they're just a list — disconnected changes with no frame of reference. Nobody knows why they matter.

**Key insight:** The problem isn't writing — it's context. And no one outside your code has it.

---

## The Product (Timeline)

**Badge:** a timeline you can actually use

**Title:** Not just updates.

**Subtitle:** A navigable history of your product.

**Body:** Your timeline isn't a wall of text — it's a structured, browsable record of everything that's happened in your product.

**Features (clickeable, cada uno con imagen):**

1. **Browse by structure**
   Every change belongs somewhere: features, capabilities, product domains. Navigate your product the way it's built.

2. **Filter changes**
   By date, type (feature, fix, improvement), or product area. Show only what's relevant for your audience.

3. **Navigate freely**
   Your audience can explore your product's full history, not just the latest update.

4. **Automatic cataloging**
   Hikai organizes every change into a structured taxonomy. No manual tagging.

5. **Shareable anywhere**
   A public URL your team, investors, or users can follow.

**Closing:** A living logbook of your product. Always current. Always organized. Always shareable.

---

## How It Works

**Badge:** how it works

**Title:** Automatic.

**Subtitle:** Because you have better things to do.

**Body:** Hikai doesn't just "help" with communication — it handles it. Connect your repo. Hikai builds deep context about your product: what it does, how it's structured, why changes matter. Then it automatically narrates every meaningful update in language your audience understands.

**Benefits (columna derecha):**
- **Weekly updates** without weekly effort.
- **Persistent memory** that accumulates over time.
- **An asset that grows** while you focus on building.

**Closing:** This is bottleneck removal, not bottleneck shift.

**Steps (4, horizontal):**

1. **Connect your repository**
   Link your GitHub repo. Hikai starts learning your product immediately.

2. **Hikai builds context**
   Structure, domains, patterns — Hikai understands what your product is, not just what changed.

3. **Changes become narrative**
   Every meaningful update becomes narrative — automatically translated into business language.

4. **Your timeline goes live**
   A public page that updates itself. Share it, embed it, let the market follow along.

**CTA:** Publish your timeline — free

---

## Impact (Visibility Shift + Day One)

**Badge:** impact

**Title:** From invisible to present.

**State A — Before (faro apagado):**
- Visual: Lighthouse OFF in the dark
- Headline: Progress goes unnoticed.
- Body: Your product is moving forward. But the world can't see it.

**State B — After (faro encendido):**
- Visual: Lighthouse ON, beam of light
- Headline: Your product stays present.
- Punchy line: Connect once. Stay visible forever.
- Day One items:
  · A public page — live and shareable
  · Auto-updated entries — every meaningful change
  · Filters + structure — browse by product area

---

## Why Hikai (Context + Audience)

**Badge:** why hikai

**Title:** Not another AI that sounds human.

**Body:**
Everyone promises AI that writes like a person. Few deliver.

Here's the truth: the problem isn't the AI — it's the input. When you ask a copywriter (or an LLM) to write about your product, they're guessing. They don't know your architecture, your users, your roadmap.

Hikai is different. It lives inside your product context. It knows what AuthService does. It understands why that refactor matters. It sees the connection between last week's fix and next month's feature.

That's why Hikai doesn't sound like AI. It sounds like someone who actually knows your product — because it does.

**ICPs (3 cards con borde):**

1. **Founders building in public**
   Your commits are already telling a story. Hikai makes it readable. Share one link. Let people follow along.

2. **Product teams shipping fast**
   Stop translating. Start shipping. Let your work speak for itself.

3. **Anyone tired of "we should update the changelog"**
   You know that task that never gets done? It's done now.

**Closing:** Context is everything. And Hikai has yours.

**Companion hint (sutil, integrado):** Your product companion — always watching, always ready.

---

## Roadmap

**Badge:** what's coming

**Title:** What's coming

**Items (3 cards con borde):**

1. **Export as text**
   Copy your timeline for newsletters, docs, or anywhere else.

2. **Slack integration**
   Updates delivered where your team already works.

3. **Custom cadence**
   Control how often your timeline refreshes.

---

## Final CTA

**Title part 1:** Your product is already moving —

**Title part 2:** let the world follow.

**Subtitle:** Connect your repo and publish your timeline in minutes. Free.

**CTA:** Get started

---

# PART 3: UI SPECIFICATION

---

## Global Specs

**Content width:** max-w-6xl (mismo en todas las secciones)
**Badges:** minúsculas, tracking-wide, text-xs
**Quotes/Insights:** border-l-2 border-primary (línea naranja)
**Cards:** border border-border, rounded-xl, p-6

---

## 1. Navigation

```
┌─────────────────────────────────────────────────────────────┐
│  Logo    [links con scroll-spy]                    [Sign up]│
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Position: fixed top
- Height: 64px
- Background: bg-background/95 backdrop-blur
- Links: text-sm font-medium
- Active indicator: h-0.5 bg-primary, bottom-0, animación slide-in
- CTA: Button primary, size sm, "Sign up"

**Scroll spy implementation:**
```tsx
// Hook para detectar sección visible
const activeSection = useScrollSpy(['problem', 'product', 'impact', 'why', 'roadmap']);

// Underline con animación
<span className={cn(
  "absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300",
  isActive ? "w-full" : "w-0"
)} />
```

---

## 2. Hero

```
┌─────────────────────────────────────────────────────────────┐
│  Background: hero-starred-night.png + overlays              │
│                                                              │
│  [badge] your product story, told automatically             │
│                                                              │
│  Your development, narrated                                 │
│  for the world.                          ← 6xl-7xl, black   │
│                                                              │
│  From commits to clarity.                ← 3xl, serif it.   │
│                                                              │
│  ──────────────────────────────────────                     │
│                                                              │
│                   Hikai captures what's happening...        │
│                   (MAX 2 LÍNEAS)                            │
│                   [Publish your timeline — free]            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              [Timeline mockup]                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Fixes vs v2:**
- Subtitle: max 2 líneas (ajustar width o font-size)
- Badge: lowercase (no uppercase tracking)

---

## 3. The Problem

```
┌─────────────────────────────────────────────────────────────┐
│  [badge] the problem                                         │
│                                                              │
│  ┌──────────────────┐  ┌────────────────────────────────┐  │
│  │                  │  │                                 │  │
│  │  The bottleneck  │  │  Your product is evolving...   │  │
│  │  nobody talks    │  │  But outside of engineering... │  │
│  │  about           │  │  And even when updates...      │  │
│  │                  │  │                                 │  │
│  │  (altura igual   │  │  (texto debe llenar altura     │  │
│  │   que el texto)  │  │   similar al título)           │  │
│  │                  │  │                                 │  │
│  └──────────────────┘  └────────────────────────────────┘  │
│                                                              │
│  ┃  "The problem isn't writing — it's context.              │
│  ┃   And no one outside your code has it."                  │
│     ↑ línea naranja (border-l-2 border-primary)             │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Badge: mb-8
- Grid: grid-cols-[40%_60%], items-start → items-stretch para igualar alturas
- O: añadir más body text para equilibrar
- Insight: mt-12, border-l-2 border-primary, pl-6, py-2

---

## 4. The Product (Timeline) — ESTILO FRONTIFY

```
┌─────────────────────────────────────────────────────────────┐
│  [badge] a timeline you can actually use                     │
│                                                              │
│  Not just updates.                       ← 5xl, black       │
│  A navigable history of your product.    ← 3xl, regular     │
│                                          (centrado)          │
│                                                              │
│  Your timeline isn't a wall of text...   ← lg, muted        │
│                                          (centrado)          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  ─────────────────────────                             │ │
│  │  Browse by structure        ← feature activo (bold)    │ │
│  │  ─────────────────────────                             │ │
│  │  Filter changes             ← feature inactivo         │ │
│  │                                                         │ │
│  │  Navigate freely                        ┌────────────┐ │ │
│  │                                         │            │ │ │
│  │  Automatic cataloging                   │  IMAGEN    │ │ │
│  │                                         │  PRODUCTO  │ │ │
│  │  Shareable anywhere                     │            │ │ │
│  │                                         └────────────┘ │ │
│  │                                                         │ │
│  │  Descripción del feature activo aparece aquí           │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┃  "A living logbook of your product..."                   │
│     ↑ línea naranja                                         │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Container: rounded-2xl, border, bg-muted/10
- Features list: izquierda, clickeable
- Feature activo: font-semibold, con línea encima
- Feature inactivo: text-muted-foreground
- Imagen: derecha, cambia según feature activo
- Descripción: debajo de la lista, solo del feature activo

---

## 5. How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  [badge] how it works                                        │
│                                                              │
│  ┌────────────────────────────┐  ┌────────────────────────┐ │
│  │                            │  │                         │ │
│  │  Automatic.     ← 5xl      │  │  · Weekly updates      │ │
│  │                            │  │    without weekly...   │ │
│  │  Because you have better   │  │                         │ │
│  │  things to do.  ← 2xl      │  │  · Persistent memory   │ │
│  │                            │  │    that accumulates... │ │
│  │  Hikai doesn't just        │  │                         │ │
│  │  "help"... it handles it.  │  │  · An asset that grows │ │
│  │                            │  │    while you focus...  │ │
│  │                            │  │                         │ │
│  └────────────────────────────┘  └────────────────────────┘ │
│                                                              │
│  ┃  "This is bottleneck removal, not bottleneck shift."     │
│     ↑ línea naranja                                         │
│                                                              │
│  ┌─────┐─────────┌─────┐─────────┌─────┐─────────┌─────┐   │
│  │  1  │─────────│  2  │─────────│  3  │─────────│  4  │   │
│  └─────┘         └─────┘         └─────┘         └─────┘   │
│  Connect       Hikai         Changes       Timeline         │
│  your repo     builds        become        goes             │
│               context       narrative      live             │
│                                                              │
│  [Publish your timeline — free]                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Grid superior: grid-cols-[55%_45%]
- Título "Automatic.": 5xl, font-black, NO italic (mismo estilo que otros títulos)
- Benefits derecha: space-y-4, cada uno con título bold + descripción muted
- Quote: border-l-2 border-primary
- Steps: flex horizontal, círculos con border-primary, línea conectora

---

## 6. Impact (Visibility + Day One)

```
┌─────────────────────────────────────────────────────────────┐
│  [badge] impact                                              │
│                                                              │
│  From invisible to present.              ← 5xl, centrado    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │  [Faro APAGADO]                                  │   │ │
│  │  │                                                   │   │ │
│  │  │  Progress goes unnoticed.                        │   │ │
│  │  │  Your product is moving forward.                 │   │ │
│  │  │  But the world can't see it.                     │   │ │
│  │  │                                                   │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  │                                                         │ │
│  │  ─────────────────────────────────────────────────────  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │  [Faro ENCENDIDO]                                │   │ │
│  │  │                                                   │   │ │
│  │  │  Your product stays present.                     │   │ │
│  │  │                                                   │   │ │
│  │  │  Connect once. Stay visible forever.   ← punchy  │   │ │
│  │  │                                                   │   │ │
│  │  │  ○ A public page — live and shareable           │   │ │
│  │  │  ○ Auto-updated entries — every change          │   │ │
│  │  │  ○ Filters + structure — browse by area         │   │ │
│  │  │                                                   │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Container: rounded-3xl, border, overflow-hidden
- State A: overlay más oscuro, texto mínimo
- State B: overlay más claro (luz del faro), Day One items integrados
- Punchy line: font-semibold, text-white
- Day One items: con círculo (○) evocando logo, text-white/90

---

## 7. Why Hikai (Context + ICPs)

```
┌─────────────────────────────────────────────────────────────┐
│  Background: why-hikai-bg-v2.png + overlay                   │
│                                                              │
│  [badge] why hikai                                           │
│                                                              │
│  Not another AI that sounds human.       ← 5xl, white       │
│                                                              │
│  Everyone promises AI that writes...     ← lg, white/80     │
│  [body condensado]                                           │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │              │ │              │ │              │        │
│  │  Founders    │ │  Product     │ │  Anyone      │        │
│  │  building    │ │  teams       │ │  tired of    │        │
│  │  in public   │ │  shipping    │ │  "we should  │        │
│  │              │ │  fast        │ │  update..."  │        │
│  │  Your        │ │              │ │              │        │
│  │  commits...  │ │  Stop        │ │  You know    │        │
│  │              │ │  translat... │ │  that task...│        │
│  │              │ │              │ │              │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  (3 cards con border-white/20, bg-white/5)                  │
│                                                              │
│  ┃  "Context is everything. And Hikai has yours."           │
│     ↑ línea blanca/naranja                                  │
│                                                              │
│  Your product companion — always watching, always ready.    │
│                                   ← sutil, text-white/60    │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Background: imagen + overlay
- Cards: border-white/20, bg-white/5, backdrop-blur
- Quote: border-l-2 border-primary (o border-white/40)
- Companion hint: text-sm, text-white/60, mt-8

---

## 8. Roadmap

```
┌─────────────────────────────────────────────────────────────┐
│  [badge] what's coming                                       │
│                                                              │
│  What's coming                           ← 4xl, centrado    │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │              │ │              │ │              │        │
│  │  Export as   │ │  Slack       │ │  Custom      │        │
│  │  text        │ │  integration │ │  cadence     │        │
│  │              │ │              │ │              │        │
│  │  Copy your   │ │  Updates     │ │  Control how │        │
│  │  timeline... │ │  delivered...│ │  often...    │        │
│  │              │ │              │ │              │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  (3 cards con border, mismo estilo que Solution cards)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Cards: border-border, rounded-xl, p-6
- Título en card: font-semibold
- Descripción: text-muted-foreground

---

## 9. Final CTA

(Sin cambios respecto a v2)

---

# PART 4: IMAGES

## Assets necesarios por sección

| Section | Image | Notes |
|---------|-------|-------|
| Hero | hero-starred-night.png | Background atmosférico |
| Hero | Timeline mockup | Placeholder o screenshot |
| Timeline | 5 imágenes de producto | Una por feature |
| Impact | visibility-state-1.png | Faro apagado |
| Impact | visibility-state-2.png | Faro encendido |
| Why Hikai | why-hikai-bg-v2.png | Background flor |

---

# PART 5: SPANISH VERSION

(Actualizar mensajes en es.json siguiendo la misma estructura)

---

# IMPLEMENTATION CHECKLIST

- [ ] Navigation con scroll-spy y underline animado
- [ ] Hero: badge lowercase, subtitle max 2 líneas
- [ ] Problem: badge, equilibrar alturas, quote con línea
- [ ] Timeline: estilo Frontify con features clickeables
- [ ] How It Works: layout 2 cols, título no italic, steps horizontal
- [ ] Impact: fusión faro + day one, punchy line
- [ ] Why Hikai: fusión context + ICPs en cards, companion hint
- [ ] Roadmap: título + 3 cards
- [ ] Todos los quotes con border-l-2 border-primary
- [ ] Mismo ancho (max-w-6xl) en todas las secciones
