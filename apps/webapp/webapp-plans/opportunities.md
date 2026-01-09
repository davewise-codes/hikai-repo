- refactor domains
- back-end security
  - debemos checkear siempre user-org-product
- settings navigation
  - title + back to product
  - botón descartar cambios en formularios
- issues
  - borrarme como miembro de una org en settings/seats no me ha pedido ninguna confirmación
  - he abandonado una org y sigo teniendo membresía a sus productos

- superadmin
  - un acceso independiente, sólo con lista de usuarios cerrada, imposibilidad de hacer signup
  - el flujo ideal para mi es que yo doy de alta un mail por DB y al acceder a la app por primera vez se pide una contraseña
  - app independiente en src/apps/adminapp que usa el package convex y el ui
  - utiliza la misma arquitectura que webapp (tanstack route, convex, i18n...)
  - aplican las mismas reglas de UI para los componentes de adminapp que a webapp: se usan los temas centralizados, las variables van tokenizadas
  - la bd de superadmin está en el mismo convex, utilizaremos un dominio propio admin.hikai.pro para accederla, de momento en su propio puerto de localhost, consideremos que levantamos webapp y superadmin a la vez
  - el ui de momento será, un menú de navegación, muy similar al que ya tenemos en apps/webapp/src/domains/shared/components/settings-nav
  - en el bottom damos visibilidad de quién está logado
  - con tres opciones: users, organizations y products
  - cada una de estas muestra una página con tablas con los users, organizations y products respectivamente
  - cada tabla permite:
    explorar usuarios, organizaciones, productos viendo: - cuando se creó - cuando se actualizó por última vez - ultima vez que accedió o fue accedido - quién es el owner de una org - quiénes son los admin de una org / producto - filtrar org / prod por tiempo en desuso - filtrar orgs y prods huérfanos - filtrar users por tiempo inactivos - filtrar users que no han activado su cuenta
    y borrar (acción en el row correspondiente, con modal de confirmación) de manera segura y aplicando reglas de negocio de estas entidades: - si borro un usuario: - sus org personales se borran - y se borran sus productos - y las membresías del producto y de la organización - las orgs pro de las que es owner - se transfieren al primer admin - se transfieren al primer usuario - o se borran - y se borran sus productos - y las membresías del producto y de la organización - se eliminan sus membresías de org y de producto - se limpian tablas de auth - si borro un producto - se borran sus membresías - si borro una org - se borran sus productos - se eliminan sus membresías de org y productos
    - eliminar prooductos también elimina rawEvents, interpretedEvents, agentRuns, aiInferenceLogs, aiUsage, ...
  - en términos de implementación, el órden que yo propondría es:
    - crear app, estructura de carpetas, etc
    - crear ui básica y queries, mutations
    - funcionalidad básica:
      - 1. filtros
      - 2. acciones
    - autenticación

- product content
  - context
  - sources
  - timeline
  - content (producing: inception + editing)
    - marketing
    - users
    - stakeholders
    - content publishing

- En apps/webapp/webapp-plans/Hikai_resumen_arquitectura.md puedes ver un resumen de la arquitectura técnica y de negocio objetivo de Hikai
- Ya tenemos unos primeros fundamentos implementados en cuanto a modelo de tenants y primeras estructuras organizativas
- también principios de UI para construir más app
- todo bastante documentado en:
  - Documentación funcional en apps/webapp/doc
  - Documentación técnica en los README de cada dominio (ej: apps/webapp/src/domains/organizations/README.md)
- Ahora queremos avanzar hasta cubrir las 4 primeras fases de ese plan resumen de arquitectura y tener un MVP que es capaz de publicar contenido a partir de la actividad de producto de los clientes
- Lo primero que quiero es diseñar los fundamentos técnicos necesarios en nuestro frontend (apps/webapp) y backend (packages/convex)
- Según se describe en el documento, es clave asentar los cimientos necesarios para facilitar futuros requerimientos sin refactors muy traumáticos, aunque en el corto plazo la prioridad sea la funcionalidad MVP de las fases más inmediatas
- En base a eso vamos a diseñar y documentar la arquitectura objetivo y un plan para implementarla en apps/webapp/webapp-plans/hikai-architecture.md
- En este paso espero definir aspectos como: cuáles son los dominios que tiene que tener la app y el modelo de datos.
- Quiero mantener principios de arquitectura hexagnonal e intentar que no haya acoplamiento entre dominios, quizás esto requiera refactorizar algo de lo que ya tenemos
- Validaremos la escalabilidad funcional del diseño de manera teórica, explicando como este modelo se extendería para cubrir los requerimientos de fases posteriores
- En el corto, el primer paso de implementación será: la navegación por el workspace de producto y la posibilidad de añadir fuentes, con una primera conexión con github
- El plan de implementación, de momento quedará a alto nivel, luego lanzaremos proyectos individuales dónde profundizaremos en cada uno.
- apps/webapp/webapp-plans/hikai-architecture.md y apps/webapp/webapp-plans/Hikai_resumen_arquitectura.md serán las guías clave de lo que queremos conseguir
- se conciso y trata de no profundizar demasiado aún para poder mantener una iteración fluida con un contexto manejable
- No hagas asunciones, compárteme dudas y las debatimos
- maxima capacidad de ultrathink

- antyes quiero probar las nuevas rutas y los componentes de product workspace. sugiero lo siguiente:
- en apps/webapp/src/domains/core/components/app-header.tsx tenemos el menú hamburguesa que nos valió para acceder a algunas secciones iniciales para montar la app
- ese menú y las secciones que accede deben desaparecer
- en su lugar propongo situar una cebcera al settings-nav con un botón que tenga back to product, habilitado siempre que haya producto y que lleve a una de las páginas navegables del productSlug en la que podamos ver el shell
- qué te parece? qué habría que hacer exactamente?

openssl pkcs8 -topk8 -inform PEM -in /Users/dperez/Downloads/hikai-connections-app.2025-12-09.private-key.pem -outform PEM -nocrypt -out github-app-pkcs8.pem

pnpm --filter @hikai/convex exec npx convex run connectors/github:syncGithubConnection --productId kd7ajcjwa9nyykv9nt3fxv1aj17wwya2 --connectionId kn7d4jgtyr3k3x1s1b4yzqjqr97wymty

---

- Cambiar modelo de datos para guardar historiales de contexto

---

limitaciones beta:

- una org, org profesional en plan beta
- no más orgs
- no más productos
- máx cadencia = semanal
- máx fuentes = 3
- foco: publish el timeline - Link público + script

new product flow:

- signup journey - max automation: your org, your sources, your product. three steps
- tras org ir a primer producto
- automaticamente conectar fuentes (quizás primer paso)?
- automaticamente lanzar primer contexto
- controlar que al recalcular contexto haya fuentes conectadas
- sync lanza interpretación
- sync se programa con cron ajustado a la cadencia.
