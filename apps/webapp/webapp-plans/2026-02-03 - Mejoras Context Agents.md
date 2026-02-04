algunas cosas que pienso y que quieri que me ayudes a definir si debemos mejorar o no. De momento estamos iterando y pensando al respecto. nada más

- los domains hay que asegurar que son completos, porque como se dejen por ahí un directorio fuera del mapa, nunca capturaremos los features en él. pienso en comprobar la cobertura de domains (que el propio agente lo haga para asegurar satisfacción con la salida)
- capabilities me ha devuelto la info en español. Hay que normalizar esto y usar una parametrización del usuario (tabla products campo languajePreference)
- contextSnapshots. No tengo claro su rol y cómo deben funcionar con respecto a surfaces, domains, features, capabilities. mis dudas: debemos versionar el contexto con cambios en estas propiedades? versionamos las propiedades? esto escala bien? qué aporta? quizás
  los eventos interpretados ya capturan esto. pensaba en poder visualizar en algún momento el producto como uyn mapa de dominios / capabilities, moviendo el scroll por el tiempo veríamos como ha crecido. Pero esto puede ser masivo en datos
- baseline. Hay info relevante aquí que ahora no estamos usando, pero no quiero que genere ancla (ya nos ha pasado). idealmente pensaba en esto como una manera de acercar aún más todo el contexto que han levantado los agentes al lenguaje de negocio
- timeline_interpreter. no estoy seguro de que sea un agente como el resto, con su loop, su autoverificación... creo que debería (es casoi más una intuición que una realidad). Si estoy más seguro de que debemos darle los buckets troceados o es fácil que exceda el
  límite de 600 ms de las funciones de convex

no hay que implementar todo, quiero iterar sobre esto para buscar qué mejoras tienen sentido. ahora que aún no somos productivos dar con el modelo de datos escalable podemos hacerklo iterando

⏺ Perfecto, vamos a iterar sobre estos puntos. Te doy mi análisis para cada uno:

---

1. Cobertura de domains

El problema: Si un directorio queda fuera de pathPatterns, sus features nunca se capturan.

Mi análisis: Esto es crítico. Tienes razón en que el agente debería auto-verificar cobertura.

Propuesta: Añadir un campo coverage en el output de repoContextAgent:

{
"domains": [...],
"coverage": {
"coveredPaths": ["apps/webapp/src/domains/**", "packages/convex/**"],
"uncoveredPaths": ["apps/webapp/src/components/**"], // paths de surfaceMapping no cubiertos
"coverageRatio": 0.85,
"warning": "apps/webapp/src/components not assigned to any domain"
}
}

El agente puede calcular esto comparando sus pathPatterns contra el surfaceMapping que recibió. Si coverageRatio < 1.0, debería iterar o al menos documentarlo en meta.limitations.

Coste: Bajo. Es validación interna del agente, no añade complejidad al modelo de datos.

---

2. Capabilities en español

El problema: Output del agente en idioma inconsistente.

Mi análisis: Fácil de resolver, pero la pregunta es dónde normalizar.

Opciones:
┌───────────────────────────────────────────────────────────┬──────────────────────────────────────────────┬──────────────────────────────────────────┐
│ Opción │ Pros │ Contras │
├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────┤
│ A) En el prompt del agente │ Simple, directo │ Cada agente debe leer languagePreference │
├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────┤
│ B) Post-proceso │ Agente trabaja en inglés, se traduce después │ Añade latencia, complejidad │
├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────┤
│ C) Normalizar slugs a inglés, labels a languagePreference │ Slugs estables, labels localizados │ Más campos │
└───────────────────────────────────────────────────────────┴──────────────────────────────────────────────┴──────────────────────────────────────────┘
Mi recomendación: Opción A con la convención de que:

- slug / id → siempre en inglés (estable, para código)
- name / description → en languagePreference (para UI)

Esto ya lo tienes en featureMapPrompt: "Use languagePreference for all text.". Solo falta propagarlo a los demás agentes.

---

3. contextSnapshots - Rol y versionado

El problema: ¿Qué versionamos? ¿Escala? ¿Qué aporta?

Mi análisis: Este es el punto más complejo. Déjame descomponerlo:

¿Qué es un snapshot hoy?

Un "momento en el tiempo" con: baseline, contextDetail (domains), features, capabilities.

¿Deberías versionar cada cambio?

No necesariamente. Hay dos enfoques:
┌───────────────────┬──────────────────────────┬──────────────────────────┐
│ Enfoque │ Descripción │ Cuándo usar │
├───────────────────┼──────────────────────────┼──────────────────────────┤
│ Snapshot completo │ Foto del estado completo │ Para rollback, auditoría │
├───────────────────┼──────────────────────────┼──────────────────────────┤
│ Event sourcing │ Solo deltas (cambios) │ Para timeline, analytics │
└───────────────────┴──────────────────────────┴──────────────────────────┘
Mi intuición

El timeline ya captura cambios reales del producto (commits, PRs, deploys). Los snapshots de contexto son interpretaciones de esos cambios.

Propuesta híbrida:

1. Un snapshot "current" siempre actualizado (el estado actual)
2. Snapshots históricos solo en momentos clave:


    - Cuando el usuario lo pida (manual)
    - Antes de cambios grandes (nueva fuente conectada)
    - Periódico (semanal?) para productos activos

3. Para la visualización temporal del mapa de dominios: No necesitas N snapshots completos. Puedes reconstruir el estado en cualquier punto desde el timeline:
   timeline(t=0..T) → features activas en T → dominios en T

Esto escala mucho mejor que guardar snapshots completos.

---

4. Baseline - Evitar ancla

El problema: El baseline tiene info valiosa pero puede sesgar a los agentes.

Mi análisis: El ancla ocurre cuando el agente confirma lo que le dices en lugar de validar con evidencia.

Cómo usarlo sin ancla:
┌──────────────────────────────────────────┬──────────────────────────────────────────────────────────┐
│ Uso actual (ancla) │ Uso mejorado (validación) │
├──────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ "El producto hace X" → agente confirma X │ "El producto dice hacer X" → agente busca evidencia de X │
├──────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ Baseline como verdad │ Baseline como hipótesis a verificar │
└──────────────────────────────────────────┴──────────────────────────────────────────────────────────┘
Propuesta: En los prompts, presentar el baseline como "claims del usuario" que el agente debe validar:

## BASELINE (hipótesis del usuario - VALIDAR con evidencia)

El usuario describe su producto así:

- valueProposition: "..."
- targetMarket: "..."

Tu trabajo: verificar si el código soporta estas afirmaciones.
Si hay discrepancia, documéntala en meta.discrepancies.

Esto convierte el baseline en input útil sin crear ancla.

---

5. Timeline interpreter - ¿Agente con loop?

El problema: ¿Debería tener loop/autoverificación? Límite de 600ms de Convex.

Mi análisis:

¿Por qué sería agente con loop?

- Interpretación compleja que puede fallar
- Validación del output
- Reintentos con feedback

¿Por qué NO loop?

- 600ms de Convex actions es muy poco para un loop
- La interpretación es más "transformación" que "exploración"
- No tiene tools (no explora, solo interpreta)

Mi recomendación

No es un agente con loop, es un pipeline de transformación:

┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Raw events │ ──► │ Chunker │ ──► │ Interpreter │ ──► Interpreted
│ (batch) │ │ (N buckets) │ │ (per chunk)│ events
└─────────────┘ └─────────────┘ └─────────────┘

Donde:

1. Chunker: Divide eventos en buckets manejables (sync, no LLM)
2. Interpreter: Un LLM call por chunk, sin loop, con timeout corto
3. Si falla un chunk, lo marca y sigue (no bloquea el resto)

Para el límite de 600ms:

- Usa ctx.scheduler.runAfter(0, ...) para encadenar chunks
- O procesa en background con action que hace multiple mutations

---

Resumen: ¿Qué priorizar?
┌──────────────────────┬─────────┬──────────┬─────────────────────────────────────┐
│ Mejora │ Impacto │ Esfuerzo │ Mi recomendación │
├──────────────────────┼─────────┼──────────┼─────────────────────────────────────┤
│ Cobertura de domains │ Alto │ Bajo │ Hacer ahora - crítico para features │
├──────────────────────┼─────────┼──────────┼─────────────────────────────────────┤
│ languagePreference │ Medio │ Bajo │ Hacer ahora - fácil, mejora UX │
├──────────────────────┼─────────┼──────────┼─────────────────────────────────────┤
│ Snapshots híbridos │ Alto │ Medio │ Definir modelo antes de escalar │
├──────────────────────┼─────────┼──────────┼─────────────────────────────────────┤
│ Baseline sin ancla │ Medio │ Bajo │ Ajustar prompts cuando iteres │
├──────────────────────┼─────────┼──────────┼─────────────────────────────────────┤
│ Timeline chunking │ Alto │ Medio │ Hacer cuando llegues a producción │
└──────────────────────┴─────────┴──────────┴─────────────────────────────────────┘
