## Contexto funcional / negocio

- Hikai es una aplicación web que facilita a los equipos de producto llevar este al mercado
- Su funcionamiento general es:

1. Se conectan fuentes de datos dónde suceden los cambios reales del producto: git, linear, notion, etc..
2. De cada fuente, un agente de IA especializado se encarga de recuperar los cambios recientes.
   - Por ejemplo si configuramos que la conexión a github se actualizará semanalmente,
   - semalmente un agente de IA revisará la cuenat de github a la que se ha conectado hikai, obtendrá los cambios y los procesará
   - otro agente, cada cierto tiempo agregará esos cambios en un resumen de lo que ha sucedido
3. Esta información se presentará en un timeline ordenado, que permita a los equipos saber qué ha sucedido en su producto con facilidad
4. De estos resumenes de información, otros agentes extraerán nuevos casos de uso: documentación a usuarios, tweets, artículos de blog
5. Para cada caso de uso, Hikai contará con interfaces específicas que facilitarán a los usuarios participar en él, supervisando y enriqueciendo lo que hagan los agentes
6. Estos caso sde uso podrán sofisticarse hasta por ejemplo integrar hikai con otras herramientas para publicar ese contenido

## Contexto técnico

- El frontend de hikai se implementa en la app webapp del repo
- Para el back-end de momento (y hasta que nos encontremos alguna limitación insalvable), nos apoyaremos en convex.dev.
- En convex implementaremos servicios como autenticación, cron jobs, etc.
- En la medida de lo posible me gustaría abstraer webapp de convex. por ejemplo, webapp sabe que debe obtener una autenticación para un usuario, si se la da convez u otro servicio debería ser indiferente
- Pero tampoco quiero sobre complicar la arquitectura con capas adicionales. hay que buscar un equilibrio

## Estructura del repo

- Para facilitar el crecimiento de la app, voy a organizar la funcionalidad por dominios
- Existirá un dominio global con el estado global de la app (lenguaje, tema, localización, última sincronización, etc.), otro de settings para configurar, otro de fuentes dónde se configuran y administran las distintas fuentes, uno de timeline... y probablemente vayamos haciendo más por caso de uso. Tengo dudas en general en cómo plantear cuáles deben ser estos dominios.
- convex debería ir fuera de webapp (eventualmente una segunda aplicación podría usar estos servicios). dudo de si en packages o fuera de packages. en cualquier caso no tengo experiencia en hacer nada en convex, por lo que yo empezaría implementando un servicio (autenticación) a modo de POC y luego decidimos

## Arquitectura de estado global

- Quiero gestionar el estado con zustand e ir creando slices por dominio.
- Pueden existir cosas que sean compartidas (aunque ahora mismo no se me ocurren)
- hay que decidir cómo se gestionan estados que dependen de otros dominios. por ejemplo, settings puede ser el responsable de la localización, pero esa variable la necesitaría por ejemplo sources para mostrar la última actualización de una feunte en el uso horario correcto
- me gustaría explorar almacenar a local todo lo que venga del back-end (que no será mucho) y que la app lo cargue cuando se inicie. si hay cambios en el back-end la app se sincroniza en background. (esto en cualquier caso no es un requisito inicial, pero si podemos no nos limitemos demasiado para que esto sea complicado)
- habrá settings que haya que guardar en session storage para mantener estado en el navegador

## Estrategia de ruteo y navegación

- espero rutas por dominio.
  - ej.: app.hikai.pro/sources/[source-uuid]/config
  - ej.: app.hikai.pro/marketing-seo/content/[content-uuid]/edit
- la idea era utilizar react routes o tanstack router.
- no tengo mucho más criterio que este. habría que identificar qué más necesitamos aclarar para definir esta parte de la arquitectura

## Gestión de llamadas al API y Arquitectura de comunicación en tiempo real

- En las primeras etapas no habrá demasiada comunicación en tiempo real
- más adelante sí habrá colaboración y documentos compartidos
- mi expactativa en el corto es que convex.dev lo resuelva.
- complementaría convex con react query (tanstack query) para fetch de datos con caché, reintentos, etc.

## UI

- Seguimos las reglas del repo para utilizar los packages tailwind-confi y ui

## Plan de trabajo

- El objetivo es definir las líneas generales de la arquitectura de apps/webapp
- generar un pequeño scafolding
- y unos primeros componentes de la aplicación.
- concretamente una barra vertical navegación en el lado izquierdo. de ancho estrecho (sólo irán iconos), dónde incluiremos algunas de las secciones clave de la aplicación: abajo un avatar con los settings del usuario conectado, arriba un gestor de la organización/proyecto activo. y en medio acceso a otras secciones: sources, timeline y casos de uso.
- el primer caso de uso funcional que haremos después será la autenticación, basada en convex

---

## Arquitectura Definitiva

### Decisiones Técnicas Clave

1. **Estado Global**: Zustand con core-slice unificado, sin TanStack Query
2. **Backend**: Convex con hooks nativos (`useQuery`, `useMutation`)
3. **Ubicación Convex**: `packages/convex` estructurado por dominios
4. **Dominio Core Unificado**: Core contiene todo lo transversal (auth, navegación, settings, i18n, theme)
5. **Routing**: TanStack Router centralizado en `/routes`
6. **Persistencia**: localStorage con sincronización entre pestañas vía storage events
7. **Principio YAGNI**: Scaffolding minimal, evitar fragmentación en muchos archivos

### Estructura de Directorios Target

```
hikai-repo/
├── packages/
│   ├── convex/                    # Backend Convex
│   │   ├── convex/
│   │   │   ├── _generated/        # Auto-generado
│   │   │   ├── auth/              # Dominio autenticación
│   │   │   │   ├── config.ts      # Configuración auth
│   │   │   │   ├── users.ts       # CRUD usuarios
│   │   │   │   └── schema.ts      # Esquema auth/users
│   │   │   ├── organizations/     # Dominio organizaciones
│   │   │   │   ├── orgs.ts        # CRUD organizaciones
│   │   │   │   ├── projects.ts    # Gestión proyectos
│   │   │   │   └── schema.ts      # Esquema orgs
│   │   │   ├── sources/           # Dominio sources (futuro)
│   │   │   │   ├── sources.ts
│   │   │   │   ├── sync.ts
│   │   │   │   └── schema.ts
│   │   │   ├── schema.ts          # Schema principal
│   │   │   └── _utils/            # Utilidades compartidas
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── [packages existentes: ui, tailwind-config, typescript-config]
│
└── apps/
    └── webapp/
        ├── src/
        │   ├── domains/                    # Dominios de negocio
        │   │   └── core/                   # Todo lo transversal y compartido
        │   │       ├── components/
        │   │       │   ├── app-shell.tsx   # Layout con sidebar navegación
        │   │       │   ├── settings-page.tsx # Página configuración
        │   │       │   ├── theme-switcher.tsx # Componente cambiar tema
        │   │       │   └── language-selector.tsx # Componente cambiar idioma
        │   │       ├── hooks/
        │   │       │   ├── index.ts        # Exports públicos
        │   │       │   ├── use-theme.ts    # Hook gestión tema
        │   │       │   └── use-i18n.ts     # Hook gestión idioma
        │   │       ├── store/
        │   │       │   └── core-slice.ts   # Estado completo: theme, locale, auth, etc.
        │   │       └── index.ts            # API pública del dominio
        │   │
        │   ├── routes/                     # TanStack Router (centralizado)
        │   │   ├── __root.tsx             # Root con providers
        │   │   ├── index.tsx              # Home page  
        │   │   ├── settings.tsx           # Settings page
        │   │   └── [futuras rutas por dominio]
        │   │
        │   ├── lib/                       # Utilidades compartidas
        │   │   ├── convex.ts             # Cliente Convex configurado
        │   │   ├── utils.ts              # Helpers generales
        │   │   └── constants.ts          # Constantes aplicación
        │   │
        │   ├── store/                     # Store global Zustand
        │   │   └── index.ts              # Store unificado con core-slice + sync pestañas
        │   │
        │   ├── components/                # Componentes no vinculados a dominio
        │   │   └── home-page.tsx         # Página home simplificada
        │   │
        │   └── providers/                 # Providers existentes
        │       ├── theme-provider.tsx    # Provider tema (usa core hooks)
        │       ├── i18n-provider.tsx     # Provider i18n (usa core hooks)  
        │       └── font-provider.tsx     # Provider fuentes
        │
        └── [archivos existentes: package.json, etc.]
```

### Implementación Actual

#### Store Unificado
```typescript
// store/index.ts
export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...args) => ({
        ...createCoreSlice(...args),
        // Futuros dominios se añadirán aquí
      }),
      {
        name: 'hikai-store',
        partialize: (state) => ({
          theme: state.theme,
          locale: state.locale,
        }),
      }
    )
  )
);

// Sincronización entre pestañas con storage events
window.addEventListener('storage', (e) => {
  if (e.key === 'hikai-store' && e.newValue) {
    const newData = JSON.parse(e.newValue);
    useStore.setState({
      theme: newData.state.theme,
      locale: newData.state.locale,
    });
  }
});
```

#### Core Slice
```typescript
// domains/core/store/core-slice.ts
export interface CoreSlice {
  theme: Theme;
  setTheme: (newTheme: Theme) => void;
  locale: Locale;
  setLocale: (newLocale: Locale) => void;
  // Futuro: auth, currentOrg, etc.
}
```

#### Hooks de Dominio
```typescript
// domains/core/hooks/use-theme.ts
export function useTheme() {
  const theme = useStore(state => state.theme);
  const setTheme = useStore(state => state.setTheme);
  return { theme, setTheme };
}

// domains/core/hooks/use-i18n.ts  
export function useI18n() {
  const locale = useStore(state => state.locale);
  const setLocale = useStore(state => state.setLocale);
  return { locale, setLocale };
}
```

### Flujo de Datos

```
Usuario → Componente → Hook Core → Store Zustand → localStorage
                                      ↓
                              Storage Event → Otras pestañas
```

### Mapeo webapp ↔ convex (futuro)

- `webapp/domains/core/` → `convex/auth/` + `convex/organizations/`
- Futuros dominios → Sus respectivas carpetas en convex

### Principios de Implementación

1. **Core Unificado**: Todo lo transversal va en el dominio core
2. **Hooks Globales en carpetas**: Hooks específicos junto a componentes
3. **Sin StoreProvider**: Zustand directo, añadir provider solo si necesario para testing
4. **Routes Centralizadas**: TanStack Router en `/routes`, no por dominio  
5. **Persistencia Multi-pestaña**: localStorage + storage events automático
6. **Consolidación**: Preferir archivos más grandes que fragmentación excesiva
7. **YAGNI**: No crear abstracciones hasta necesitarlas
8. **Type-safe**: Aprovechar generación automática de tipos de Convex

### Estado Actual del Scaffolding

✅ **Completado:**
- Dominio core con theme y i18n
- Store Zustand con persistencia
- Sincronización entre pestañas  
- AppShell con sidebar navegable
- Settings page funcional
- TanStack Router configurado
- Linter y TypeScript sin errores

🔄 **Próximos pasos:**
- Implementar Convex para autenticación
- Añadir dominios sources y timeline
- Expandir core slice con auth y org state
