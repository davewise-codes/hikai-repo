# Hikai Agents - Planteamiento

Arquitectura de agentes autónomos para trabajo de producto

## Contexto y punto de partida

Hikai nace como un hub de agregación de datos de producto.
Hoy ya somos capaces de conectar múltiples fuentes (GitHub, Linear, docs, feedback, etc.) y mapear cada fuente a distintas superficies de producto, entendiendo qué información aporta cada una y para qué tipo de análisis o decisión es relevante.

Este primer paso resuelve el input problem:

- tener los datos de producto accesibles, normalizados y contextualizados.

El siguiente paso —el crítico— es resolver el reasoning problem:
cómo convertir esos datos en conocimiento accionable de forma fiable, repetible y escalable.

Ahí es donde entra la arquitectura de agentes autónomos.

## Visión: agentes, no prompts

En lugar de pedirle a un modelo que “infiera cosas” en un único prompt, Hikai adopta un modelo de agentes autónomos inspirados en el repo de referencia que estamos tomando como base.

Un agente en Hikai no es:

- un prompt largo
- una llamada aislada a un modelo de chat

Un agente es un proceso autónomo que:

- recibe un objetivo claro
- descompone el problema en subtareas
- itera hasta cumplir criterios de aceptación
- usa herramientas explícitas
- puede invocar otros agentes especializados
- mantiene estado y memoria entre iteraciones

La autonomía no es “creatividad sin control”, sino capacidad de iterar y corregirse dentro de unos límites bien definidos.

## Principios de los agentes en Hikai

Todos los agentes de Hikai se regirán por los mismos principios:

1. Agent Loop

Cada agente funciona como un loop controlado:

- decide el siguiente paso
- ejecuta acciones (tools)
- evalúa resultados
- corrige o avanza
- termina solo cuando se cumplen criterios explícitos

No hay “respuesta final” sin verificación.

2. Tools como interfaz con la realidad

- Los agentes no inventan inputs.
- Interactúan con el sistema exclusivamente mediante tools bien definidas, por ejemplo:
  - leer datos de GitHub o Linear
  - escribir artefactos JSON
  - validar outputs
  - consultar estado previo

Las tools son deterministas, tipadas y trazables.

3. Skills como especialización

Cada agente opera bajo un skill:

- define su objetivo
- limita las tools que puede usar
- fija el formato de output esperado
- encapsula conocimiento experto reutilizable

Los skills son versionables y composables.

4. Descomposición autónoma

Ante tareas complejas, el agente:

- divide el problema en partes más pequeñas
- puede delegar subtareas en otros agentes
- coordina resultados parciales

Este patrón es clave para escalar complejidad sin aumentar fragilidad.

5. Verificación y reparación

Un agente no “cree” que ha terminado:
lo sabe porque sus outputs pasan validadores objetivos (schema, cobertura, trazabilidad, consistencia).

Si falla:

- recibe errores concretos
- repara el output
- vuelve a validar

Este ciclo es la base del determinismo.

## Observabilidad y trazabilidad de los agentes

Uno de los principios fundamentales de esta iniciativa es que los agentes de Hikai no operen como una “caja negra”.
La trazabilidad no es un añadido técnico, sino una propiedad inherente de cómo entendemos un agente autónomo.

En Hikai, un agente no solo entrega un resultado, sino que reporta de forma explícita y continua qué está haciendo, por qué lo hace y qué decisiones va tomando a lo largo del proceso.

### Qué queremos

Queremos agentes que:

- Expongan su progreso en tiempo real, permitiendo entender en qué punto del trabajo se encuentran.
- Reporten sus decisiones y acciones, incluyendo:
  - cómo descomponen una tarea compleja,
  - qué herramientas utilizan,
  - cuándo detectan que un resultado no es suficiente,
  - y por qué deciden iterar o corregir.
- Sean auditables y reproducibles, de modo que podamos analizar ejecuciones pasadas, detectar patrones de error y mejorar los skills de forma sistemática.
- Generen confianza, tanto a nivel interno como de cara al usuario, al hacer visible el proceso que conduce a un resultado.
- Permitan intervención y control, como pausar, cancelar o inspeccionar agentes mientras están en ejecución.

La trazabilidad es, por tanto, una salida de primer nivel del agente, no un log técnico ni un efecto colateral del sistema.

### Qué no queremos

Explícitamente no buscamos:

- Exponer el razonamiento interno del modelo o su chain-of-thought.
- La trazabilidad no consiste en “mostrar cómo piensa el modelo”, sino en reportar acciones y decisiones operativas.
- Agentes que solo devuelvan un resultado final sin contexto sobre cómo se ha llegado a él.
- Logs técnicos difíciles de interpretar que solo sirvan para debugging.
- Sistemas donde el comportamiento del agente sea imposible de explicar, comparar o mejorar de forma estructurada.
- “Magia opaca” que funcione a veces bien y a veces mal sin una forma clara de entender por qué.

### Por qué es clave para Hikai

Este enfoque es especialmente relevante porque Hikai trabaja sobre datos reales de producto y genera artefactos que influyen en decisiones estratégicas.

La trazabilidad permite:

- Validar no solo el resultado, sino el proceso.
- Construir agentes más autónomos sin perder control.
- Evolucionar de forma incremental hacia tareas más complejas sin aumentar el riesgo.
- Diferenciar Hikai de enfoques basados únicamente en prompts o respuestas aisladas de IA.
- En Hikai, un agente fiable no es el que “acierta”, sino el que puede explicar qué ha hecho y demostrar que ha cumplido los criterios definidos.

## Primer agente: Product Domain Map

La primera tarea que implementamos bajo este modelo es la generación de un Mapa de Dominios de Producto.

### Objetivo

Construir un mapa estructurado que represente:

los dominios reales del producto
sus capacidades principales
su trazabilidad a datos reales (GitHub, Linear)
en el lenguaje que utiliza la organización dueña de ese producto

No es un ejercicio teórico, sino un reflejo de:

“qué está pasando realmente en el producto”.

### Output

Un JSON estructurado, simple y accionable, que pueda:

- alimentar visualizaciones
- servir como base para decisiones de producto
- evolucionar hacia análisis más avanzados (roadmap, ownership, gaps)

## Propuesta de arquitectura técnica (alto nivel)

Componentes principales

1. Convex (backend central)

Source of truth

Persistencia de:

- ejecuciones de agentes
- estado y memoria
- artefactos generados (JSON)

Orquestación de iteraciones (tick-based)

2. Hub de conectores (gestionado en convex, como hasta ahora)

Integraciones con GitHub, Linear, etc.

- Normalización de datos en “Product Facts”
- Aislamiento del ruido de las fuentes

3. Agent Runtime (server-side)

Implementado como loops iterativos

- Ejecuta decisiones del agente
- Invoca tools
- Valida outputs
- Persiste progreso

No dependemos de filesystem persistente:
el estado vive en Convex; el loop vive en el servidor.

## Por qué este enfoque

Este modelo responde a problemas reales que ya hemos visto:

❌ Inferencias inconsistentes
❌ Resultados “a veces buenos, a veces no”
❌ Dificultad para aumentar determinismo sin perder calidad

La arquitectura de agentes permite:

- aumentar fiabilidad sin rigidizar el sistema
- iterar hasta calidad aceptable
- convertir razonamiento en proceso, no en suerte
- escalar a tareas más complejas sin rehacer la base

## Qué desbloquea a futuro

Una vez establecido este patrón:

- nuevos agentes reutilizan la misma arquitectura
- los skills se convierten en activos de producto
- los agentes pueden encadenarse (mapa de dominios → gaps → roadmap → ownership)

el sistema aprende a trabajar con producto, no solo a describirlo

Hikai no es “IA que responde”.
Es una plataforma donde agentes trabajan.

---

# Hikai Agents - Consideraciones
