# Post Phases

## Contexto

- Tras implementar las fases iniciales para tener un MVP completo de Hikai se han ido identificando mejoras o puntos pendientes a resolver para aboradr más tarde
- Este documento las recoge para su posterior procesamiento

## Formato sugerido

- id
- Oportunidad pendiente
- Fase en la que se ha identificado
- Propuesta de implementación y valor esperado
- Fecha en la que se censa

---

## Oportunidades pendientess

- id: timeline-aggregation-and-ia-ready-interpretation
  - Oportunidad pendiente: Evolucionar la interpretación de eventos para soportar agregación temporal/múltiples interpreted por rawEvent y permitir reemplazar la heurística por IA sin perder trazabilidad.
  - Fase en la que se ha identificado: F2.2
  - Propuesta de implementación y valor esperado: Rediseñar la relación raw→interpreted para admitir 1:N o consolidación por bucket temporal, versionar el clasificador (`classifierVersion`), y permitir purgar raw manteniendo `rawPurged` y trazabilidad. Esto habilita IA futura y reporting agregado sin duplicados inconsistentes.
  - Fecha en la que se censa: 2024-07-09
