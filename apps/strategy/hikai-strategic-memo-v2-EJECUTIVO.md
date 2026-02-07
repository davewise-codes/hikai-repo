# Hikai — Memo Ejecutivo (v2)

## Infraestructura Operativa para Productos Digitales

---

## Contexto de mercado y justificación de la oportunidad

La IA ha sobreacelerado la creación de productos digitales: hoy es posible construir y lanzar mucho más rápido. Esto tensiona al resto de funciones porque **sostener el producto (marketing, CS, ventas, coordinación) no se ha acelerado al mismo ritmo**. El resultado es una brecha estructural entre velocidad de producto y capacidad operativa.

Además, el presupuesto tecnológico está cambiando de categoría: **SaaS tradicional se estanca, infraestructura de IA crece 40–60% YoY**. Los CFOs buscan capacidad real, no más herramientas. El gasto se mueve de “software” a “infraestructura que ejecuta trabajo”.

Además, esta vertical, que conocemos bien, es la más preparada para operaciones autónomas: **el contexto del negocio ya está digitalizado**. Un SaaS, una app móvil o una plataforma web tienen su producto en código. Ese contexto es transferible a un modelo de forma directa—no hay que digitalizar nada, solo conectarlo.

**Oportunidad:** crear una infraestructura operativa que elimine el cuello de botella de sostener productos digitales, y capturar ese presupuesto emergente de IA.

---

## Hikai: tesis central e insights fundacionales

### El cuello de botella

En equipos de producto digital, el desarrollo ya no es el cuello de botella. Lo es **sostener el producto**: el equipo de marketing que no sabe qué lanzó engineering la semana pasada, el PM que mantiene changelogs a mano, el growth lead que pierde contexto entre sprints:

- **Product marketing**: cada release requiere actualizar landing, docs, changelogs, posts. El PM conoce el detalle, pero marketing lo traduce con delay y fricción.
- **Customer success**: el equipo de soporte no sabe qué bugs se corrigieron ni qué features cambiaron. Resuelven tickets con contexto desactualizado.
- **Content/SEO**: el blog técnico se actualiza cuando alguien tiene tiempo, no cuando el producto evoluciona.
- **Coordinación interna**: la información de producto vive en PRs, Slack y docs dispersos. Mantener alineado al equipo es trabajo manual constante.

Ahí la IA no falla por falta de inteligencia, sino por falta de **disciplina operativa.**

**Tesis central:** la mayoría de soluciones IA mueven el cuello de botella (del trabajo al prompting o a la coordinación). **Hikai no lo mueve: lo elimina.** El trabajo operativo sucede sin empuje humano, sin pérdida de contexto y con continuidad real.

**El problema real ya no es inteligencia, es disciplina operativa**
Hoy cualquier equipo de producto digital tiene acceso a modelos potentes. Lo difícil no es "saber qué hacer", sino **mantener un sistema que ejecute sin fricción**:

- Disciplina (ritmo sostenido sin empuje humano)
- Persistencia (memoria real, no chats aislados)
- Sistemática (procesos repetibles y auditables)
- Coordinación (handoffs claros entre tareas/agentes)

**Cómo resolvemos la oportunidad de mercado**

- Construimos un sistema que ejecuta funciones operativas completas con memoria persistente.
- Vendemos atribuciones claras con outputs medibles y frecuencia definida:
  - **Release communications**: changelogs, release notes, actualizaciones de docs sincronizadas con cada deploy.
  - **Product marketing**: landing pages actualizadas, feature announcements, comparativas competitivas.
  - **Technical content**: posts de blog alineados con el roadmap, documentación técnica, guías de migración.
  - **CS enablement**: bases de conocimiento actualizadas, respuestas tipo para nuevas features, alertas de breaking changes.
- La accountability permanece humana: el CPO/CMO/founder define estrategia y resultados; Hikai ejecuta el trabajo operativo y mantiene el ritmo.

**Por qué no basta una infraestructura genérica**
Este tipo de sistema exige **domain expertise**: entender cómo funciona un equipo de producto digital—sus ciclos de release, la relación entre engineering y go-to-market, los artefactos que producen (PRs, tickets, docs, changelogs). Una infraestructura genérica obliga al cliente a diseñar procesos, disciplinar el uso y reinyectar contexto. **Hikai elimina ese trabajo** con una arquitectura ya opinionada: sabe qué es un release, qué significa un breaking change, cómo se estructura un changelog, qué información necesita marketing de cada PR.

**Diferenciador frente a agentes IA genéricos**

- Los LLMs están democratizados; lo difícil es **la continuidad, la memoria estructurada y la orquestación**.
- Hikai es sistema, no agente: red de agentes coordinados con estado, trazabilidad y memoria acumulativa.
- Resultado: trabajo autónomo y sostenido, no respuestas ad-hoc.

**Breves pinceladas técnicas (solo lo esencial)**

- Modelo de datos opinado para producto digital y funciones de negocio.
- Orquestación de agentes especializados con handoffs explícitos.
- Memoria persistente con histórico y trazabilidad.
- Outputs confiables y auditables, diseñados para operar como un equipo humano.
- Timeline automático como “agencia de contexto” que alimenta todo el sistema.

---

## El negocio

### El buyer en producto digital

El buyer típico es un C-Level o directivo empoderado de un área de negocio de un SaaS, app o plataforma en crecimiento (5-30 personas). Buscar a agilizar y eficientar su función para alcanzar a a la nueva ingeniería asistida por IA. No busca otra herramienta—ya tiene Linear, Notion, Slack, GitHub. Busca **continuidad operativa**: que el trabajo de sostener el producto suceda sin empuje constante.

Su dolor concreto: el equipo puede shipear features cada semana, pero el changelog se actualiza cada mes. La documentación está desactualizada. El blog técnico lleva trimestres sin posts. Customer success no sabe qué respondió engineering sobre aquel bug. El contexto se pierde entre herramientas y personas.

**Cómo contrata un cliente**
Un cliente llega cuando ya tiene producto en crecimiento y las funciones de go-to-market no escalan al ritmo de engineering. Ejemplos de triggers:

- Acaban de cerrar ronda y van a acelerar desarrollo, pero marketing sigue siendo 1-2 personas.
- Lanzan features semanalmente pero los changelogs se acumulan sin publicar.
- El equipo de soporte escala tickets porque no tienen visibilidad de qué cambió en producto.
- El founder dedica horas a "traducir" lo que hizo engineering para que marketing lo comunique.

Su racional es claro: **delegar ejecución operativa sin perder control estratégico**. Espera obtener **reducción de costes** con continuidad real, menos coordinación y trazabilidad del trabajo.

Qué espera obtener en la práctica:

- Changelogs y release notes publicados automáticamente con cada deploy
- Documentación técnica sincronizada con el código
- Content pipeline alineado con el roadmap de producto
- Base de conocimiento de CS actualizada sin intervención manual
- Accountability humana intacta (la estrategia sigue siendo suya)

**Diferenciadores en el modelo**

- No vendemos outcomes ni seats; vendemos **atribuciones ejecutadas con continuidad**.
- Pricing separado en **workforce fee** (atribuciones) e **infrastructure fee** (uso real de LLM/compute).
- Es un modelo de infraestructura operativa, no SaaS tradicional.
- Ejemplo concreto: "Release communications" = changelogs + release notes + docs updates por cada release, con frecuencia definida y calidad auditable.

**Captura de AI budget**

- El gasto en IA crece mientras SaaS se estanca.
- Hikai se compra como infraestructura AI (misma línea presupuestaria que créditos LLM, Cursor, etc.).
- El buyer de producto digital ya está pagando por Cursor, GitHub Copilot, créditos de API. Entiende el modelo.
- Comparación real del buyer: "¿lo construimos nosotros con Claude API + n8n + Notion?" vs "lo compramos ya integrado con contexto de producto".

**Unit economics (alto nivel)**

- Margen objetivo ~80% sobre workforce fee.
- Infra pagada por el cliente, sin riesgo de quemar caja.
- Escalabilidad lineal por atribuciones activas.

---

## Roadmap (super high level)

**Ahora (0–6 meses)**

- Timeline automático gratuito como “agencia de contexto”.
- Validar arquitectura core: Hikai es capaz realmente de entender el contexto de negocio de un repo durante su evolución
- Ganar tracción y primer posicionamiento
- Milestone: 100 signups con uso recurrente.

**Siguiente (6–18 meses)**

- Primeros clientes pagando por infra+workforces.
- Validar WTP, calidad sostenida y unit economics.
- Milestone: 10–20 clientes activos renovando.

**Más adelante (18+ meses)**

- Expandir a organizaciones más grandes (hasta 30 pax).
- Más atribuciones, mayor autonomía, integraciones enterprise básicas.
- Milestone: 50–100 clientes activos.

---

## Cierre: Por qué ahora, por qué producto digital

Tres tendencias convergen:

1. **Crear productos digitales es 10x más fácil.** Cursor, v0, Replit AI—el ciclo de desarrollo se ha comprimido. Equipos de 5 personas shipean como equipos de 20.
2. **Sostenerlos sigue siendo doloroso y no escala.** Marketing, CS, docs, comunicación de releases—todo eso sigue siendo trabajo manual que no se benefició de la aceleración.
3. **Los presupuestos están pivotando hacia infraestructura AI.** El buyer de producto digital ya lo entiende: está pagando por Copilot, por Cursor, por créditos de API. Sabe comprar capacidad, no solo herramientas.

**Por qué producto digital primero:** es la vertical donde el contexto ya está digitalizado. No hay que convencer al cliente de estructurar su información—ya la tiene en GitHub, Linear, Notion. Hikai solo la conecta y opera sobre ella.

**El presupuesto está ahí. La necesidad también. El timing es ahora.**
