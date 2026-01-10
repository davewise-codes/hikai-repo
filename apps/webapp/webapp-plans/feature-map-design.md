# Feature Map (Product) - Diseño

## Contexto

La interpretacion del timeline necesita un catalogo estable de features user-facing para mapear cambios a valor real y evitar ruido (marketing, infra, docs). Los keyFeatures actuales son demasiado generales y no garantizan continuidad. Se propone reemplazarlos por un **Feature Map** versionado junto al productContext.

## Objetivo

- Definir un Feature Map granular, user-facing y consistente en el tiempo.
- Usar el Feature Map como fuente unica para clasificar features/fixes/improvements.
- Integrar señales de fuentes (repos, docs, rutas) para construir y evolucionar el mapa.

## No objetivos

- Backfill o migracion de datos historicos.
- Deteccion perfecta de features sin evidencia.

## Decisiones clave

- **Feature Map reemplaza keyFeatures** en UI/contexto.
- **Versionado junto a productContextSnapshot**.
- Evidencias prioritarias: textos UI → docs → rutas → nombres de componentes.
- Continuidad: siempre comparar con el snapshot anterior; evitar renombrados.

## Esquema propuesto (productContextSnapshot)

```
featureMap: {
  features: [
    {
      id: "baseline-editor", // slug estable
      name: "Baseline editor",
      domain: "Narrative Layer", // productDomains
      description: "Edita la baseline del producto para anclar el contexto.",
      evidence: [
        { type: "ui_text", value: "Baseline editor", path: "apps/webapp/..." },
        { type: "route", value: "/settings/product/:id/context" }
      ],
      confidence: 0.72,
      visibilityHint: "public|internal",
      deprecated: false,
      lastSeenAt: 0
    }
  ],
  generatedAt: 0,
  sourcesUsed: ["github", "notion", "linear"]
}
```

## Agente: Feature Map Agent

**Inputs**
- baseline (productBaseline)
- productContext (sin keyFeatures)
- previousFeatureMap (del snapshot anterior)
- sourceContext (estructura de repos, fileSamples, clasificacion)
- señales de fuentes:
  - rutas detectadas
  - textos UI (copys, labels)
  - docs relevantes (README, Notion, doc/*.md)

**Output**
- featureMap con features user-facing y dominios asociados
- deprecated si ya no hay señales
- confidence por feature
- evidencia trazable

**Reglas de continuidad**
- Reusar `id` y `name` si hay alta similitud (>=70% señales).
- Solo renombrar si hay evidencia fuerte y mantiene la misma funcion.
- Si no hay señales nuevas, mantener feature pero bajar confidence.
- Si no hay señales por dos ciclos, marcar `deprecated: true`.

## Pipeline propuesto

1) Usuario introduce baseline.
2) Source Context Refresh (estructura + fileSamples por fuente).
3) Product Context Agent genera contexto base.
4) Feature Map Agent genera featureMap usando:
   - snapshot anterior (si existe)
   - señales actualizadas de fuentes
5) Timeline interpreter consume featureMap para clasificar.

## Uso en Timeline

- Solo se asignan features/fixes/improvements si están en featureMap.
- Si no mapea, se marca como internal/technical.
- Filtros: focus areas = domains del contexto + "internal/technical".
- Features se pueden filtrar por domain.

## UI/UX Impacto

- UI de contexto muestra Feature Map (no keyFeatures).
- Filtros del timeline separan:
  - Focus areas del contexto
  - Internal/Technical (cross-product)
- Feedback por feature (opcional futuro).

## Consideraciones por tipo de producto

- Webapp: rutas + UI text son señal primaria.
- API: endpoints + docs son señal primaria.
- Mobile: screens + navegación son señal primaria.

## Próximos pasos

- Definir schema exacto y migracion (sin backfill).
- Escribir prompt del Feature Map Agent.
- Implementar pipeline y actualizacion de UI.
