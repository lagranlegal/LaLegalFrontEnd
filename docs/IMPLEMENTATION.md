# Estado de implementación

> Registro vivo de qué existe en el código, cómo está armado y por qué se tomó cada decisión — para que cualquiera (humano o Claude Code) pueda retomar el proyecto sin releer todo el historial de commits. Se actualiza en cada paso del "Orden de implementación" de `CLAUDE.md`. No repite lo que ya está en `ARCHITECTURE.md`/`DESIGN_SYSTEM.md` (el qué-debería-ser); esto es el qué-hay-hoy y las decisiones concretas tomadas al construirlo.

## Paso 2 — Auth + shell (completo)

Login, refresh, callback de invitación, bootstrap real con `GET /me`, guards de ruta, `usePermission`/`<Can>`, `AppShell` responsive, pantalla de bloqueo por suscripción, logout por inactividad (6h). Probado de punta a punta en un navegador real (Playwright headless) contra el proyecto Supabase de dev y el backend dev — no solo `tsc`/build.

### Estructura nueva

```
src/
  app/
    router.tsx          # TanStack Router, code-based (no file-based) — ver nota abajo
    query-client.ts      # QueryClient central: retry policy + invalidación de ['me'] en PERMISSION_DENIED
    store.ts              # Zustand mínimo: sidebar colapsada, drawer mobile
    layouts/
      AuthLayout.tsx        # /auth/* — sin sidebar
    pages/
      SubscriptionBlockedPage.tsx   # /cuenta-bloqueada — bloqueo por SUBSCRIPTION_EXPIRED
      ErrorPage.tsx                  # errorComponent del root — red de seguridad para NetworkError etc.
      NotFoundPage.tsx                # notFoundComponent del root
  components/shared/
    AppShell.tsx           # sidebar+topbar+Outlet — CashSessionBanner llega en el paso 3
    Can.tsx                 # <Can permission="...">
  components/ui/
    dropdown-menu.tsx        # shadcn — menú del avatar
  features/
    auth/
      api.ts                  # useLogin, useSetPassword, useLogout
      pages/LoginPage.tsx, AuthCallbackPage.tsx
    dashboard/
      pages/DashboardPage.tsx  # placeholder — KPIs reales llegan en el paso 3
  lib/
    auth/
      me.ts                  # meQueryOptions/useMe — VIVE EN lib, no en features/auth (ver nota abajo)
      inactivity.ts            # useInactivityLogout, INACTIVITY_LOGOUT_MS = 6h
    permissions/
      usePermission.ts
```

### Decisiones y bugs reales encontrados probando en navegador

**`meQueryOptions`/`useMe` viven en `lib/auth/me.ts`, NO en `features/auth/api.ts`.** `/me` lo consumen `usePermission`, `AppShell`, el guard de suscripción del router y `lib/dates` (`setActiveTimezone`) — ninguno de esos es la feature de login. Ponerlo en `features/auth` habría violado la regla 3 (features aisladas, lib no depende de una feature) apenas un nivel más abajo. `features/auth/api.ts` solo tiene las acciones propias de esa feature: `useLogin`, `useSetPassword`, `useLogout`.

**Routing es code-based (`createRoute`/`createRouter`), no file-based.** La estructura de `CLAUDE.md` no lista un `src/routes/`; `app/` es explícitamente donde viven "rutas" según esa guía. Se usa `@tanstack/router-plugin` cero — todo el árbol se arma a mano en `app/router.tsx`.

**Gotcha real de TanStack Router: `id` en una ruta pathless NO es lo mismo que su `fullPath`.** Si una ruta layout se crea con `id: 'algo'` (sin `path`), su `fullPath` para matching de URL queda correctamente vacío/heredado del padre, PERO su `id` interno (usado por `from:` en `useSearch`/`useParams` tipados) SÍ incluye ese `'algo'` como segmento — así que `useSearch({from: '/auth/login'})` no compilaba porque el id real terminaba siendo `/auth-layout/auth/login`, no `/auth/login`. Se resolvió dándole a `authLayoutRoute` un `path: '/auth'` real (con hijos en paths relativos `'login'`/`'callback'`) en vez de un `id` pathless — así `id === fullPath` y no hay sorpresas. `appLayoutRoute` sí se dejó pathless vía `id: 'app-layout'` porque ninguno de sus hijos actuales necesita `useSearch`/`useParams` tipados por nombre — si алgún día lo necesitan, aplica la misma solución.

**Bug real #1 — URL duplicada `/api/v1/api/v1/...` en TODAS las requests.** `client.ts` tenía `baseUrl: `${VITE_API_URL}/api/v1`\`, pero las claves de `paths` generadas por `gen:api` YA incluyen el prefijo `/api/v1` (así están en el `openapi.json` del backend: `"/api/v1/me"`, no `"/me"`). El `baseUrl` correcto es solo `VITE_API_URL`. Esto habría roto el 100% de las llamadas a la API — lo capturó la prueba en navegador real (`tsc`/build nunca lo iban a detectar, porque el path completo sigue siendo un `string` válido para TypeScript).

**Bug real #2 — sin `errorComponent` en el root, un `NetworkError` durante el bootstrap de `/me` mostraba la pantalla default (fea, sin estilo) de TanStack Router**, violando la regla 10 (toda vista con datos necesita estado de error). Se agregó `src/app/pages/ErrorPage.tsx` como `errorComponent` de `rootRoute` — pantalla estándar con botón "Reintentar" (`reset()` de TanStack Router).

**Bug real #3 — loop infinito entre `/` y `/auth/login` cuando el backend rechaza con 401 una sesión de Supabase técnicamente válida** (ej. un usuario creado a mano en el dashboard de Supabase sin la fila correspondiente en la base del backend — exactamente el caso de un usuario de prueba). Secuencia del bug: `/me` → 401 → `client.ts` refresca el token (éxito, la sesión de Supabase SÍ es válida) → reintenta `/me` → 401 otra vez → el router redirige a `/auth/login` → pero como la sesión de Supabase seguía viva, el guard de `authLayoutRoute` ("si ya hay sesión, redirige a `/`") rebotaba de vuelta → loop infinito, decenas de requests por segundo. Fix en `lib/api/client.ts`: si el 401 **persiste incluso después de un refresh exitoso**, es la señal de "sesión válida pero backend la rechaza" (§4.6: "si persiste → logout") — ahí sí se llama `supabase.auth.signOut()` de verdad, no solo se redirige. El router además pasa `reason=inactive` en el redirect para que `LoginPage` muestre el mensaje correspondiente.

**Bug real #4 (menor) — tormenta de reintentos.** Con la retry policy default de TanStack Query (3 reintentos) multiplicada por el reintento-de-401 propio de `client.ts`, un solo `/me` fallido generaba hasta ~8 requests. Fix en `app/query-client.ts`: `retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 2` — un `ApiError` es determinístico (401/403/409…), reintentar no cambia el resultado; solo vale la pena reintentar fallas de red transitorias (`NetworkError`).

**Cómo se probó de verdad:** se creó un usuario en el dashboard de Supabase (Authentication → Add user) para simular el flujo. Confirmó exactamente el caso límite esperado: el usuario se autentica bien contra Supabase, pero `/me` devuelve 401 porque el backend no tiene una fila para ese usuario (empresa/rol) — el mismo `code` que "usuario/empresa inactivos", a propósito, según ARCHITECTURE §4.6. Este es el comportamiento CORRECTO, no un bug — confirma que el mapeo de errores y el mensaje funcionan. **Sigue pendiente probar el happy path real (login exitoso → dashboard con datos → logout)**, que requiere un usuario con una fila real en la base de datos del backend (fuera del alcance del frontend — requiere sembrar una empresa+usuario del lado del backend).

**`AppShell` recorta variantes de la referencia visual que no tienen backend/pantalla real todavía:** sin buscador funcional (input deshabilitado, solo visual), sin íconos de ayuda/notificaciones/apps en el topbar, sin "Perfil"/"Cambiar contraseña" en el menú del avatar (solo "Cerrar sesión", que sí funciona) — evita UI decorativa que no hace nada. El menú lateral muestra los 10 módulos del orden aprobado, pero solo "Inicio" es un link real; el resto se renderiza deshabilitado (`aria-disabled`, sin `<Link>`) hasta que exista la pantalla. El filtrado por código de permiso (no solo por "¿existe la pantalla?") llega cuando exista el catálogo real de `GET /identity/permissions` (paso 8).

**No se construyó un guard de ruta por permiso** (solo por sesión/suscripción) — no hay todavía ninguna ruta que lo necesite; se agrega junto con la primera pantalla permission-gated real (paso 4+), mismo criterio que `useMoneyMutation` en el paso 1.

### Qué falta (fuera de alcance del paso 2)

- Happy path de login sin probar end-to-end (ver arriba — depende de seeding del backend).
- Dashboard real con KPIs (`GET /reports/dashboard`) y `CashSessionBanner` — paso 3.
- Guard de ruta por permiso, catálogo de permisos, matriz de roles — paso 8 (identity).
- Claim `app_metadata.platform_role` / rutas `/platform` — paso 10.
- "Perfil" y "Cambiar contraseña" en el menú del avatar — cuando exista una pantalla de configuración real.

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde
# Prueba manual en navegador (requiere .env con Supabase real):
npm run dev   # http://localhost:5173 — /auth/login si no hay sesión
```

## Paso 1 — Fundaciones (completo)

Scaffold inicial: Vite + React 19 + TypeScript estricto, Tailwind v4 themeado con `tokens.css`, shadcn/ui, generación de tipos desde OpenAPI, cliente central de API, `money.ts`/`dates.ts` con tests, ESLint, CI. **Sin pantallas todavía** (a propósito — eso es el paso 2).

### Estructura creada

```
src/
  app/                  # vacío — bootstrap real (providers, router, layouts) llega en el paso 2
  components/
    ui/button.tsx        # generado por shadcn/ui (no editar a mano)
    shared/               # vacío — DataTable, AppDialog, Money, etc. llegan cuando una feature los necesite
  lib/
    api/
      client.ts          # única puerta a la API — ver detalle abajo
      errors.ts          # ApiError/NetworkError + parseApiError — mapa de códigos
      pagination.ts       # useCursorInfiniteQuery sobre {items, next_cursor}
      idempotency.ts       # useIdempotencyKey — primitiva de la regla 8, ver nota abajo
    auth/
      supabase.ts          # único cliente de Supabase (solo Auth + Storage)
    permissions/            # vacío — usePermission/<Can> llegan con el paso 2 (dependen de GET /me)
    money.ts                # formatCOP, maskMoneyInput, parseMoneyInput
    dates.ts                # BOGOTA_TZ, todayBogota, formatDate, formatDateTime, set/getActiveTimezone
    utils.ts                 # cn() — generado por shadcn/ui
  styles/
    tokens.css                # ÚNICA fuente de verdad del diseño (copiado literal de DESIGN_SYSTEM.md §2)
    globals.css                # @import tailwindcss + tokens.css, mapeo de variables shadcn → tokens
  types/
    api.ts                     # GENERADO por `npm run gen:api` — no editar a mano
  App.tsx                       # placeholder de fundaciones — se reemplaza en el paso 2
  main.tsx
  vite-env.d.ts                 # tipa import.meta.env (VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
tests/
  money.test.ts, dates.test.ts, setup.ts
scripts/
  gen-api.mjs                   # implementa `npm run gen:api` / `gen:api:check`
.github/workflows/ci.yml         # lint + typecheck + test + build, y job aparte de drift de API
vercel.json                       # CSP + headers de seguridad + rewrite SPA
components.json                    # config de shadcn/ui (style: radix-nova, alias @/*)
```

### Decisiones y detalles que no son obvios leyendo el código

**TypeScript pineado a `~5.9.3`, no 6.x.** El scaffold de `npm create vite@latest` (versión de este momento) trae TypeScript 6 por defecto, pero `openapi-typescript@7.x` (la herramienta de `gen:api`) declara peer dependency `^5.x` y no resuelve con `--legacy-peer-deps` sin fricción. Se bajó a 5.9 explícitamente. Si en el futuro se actualiza `openapi-typescript` a una versión que soporte TS 6, se puede volver a subir.

**La instalación necesita `--legacy-peer-deps`.** Hay un bug conocido de npm (`Cannot read properties of null (reading 'edgesOut')`) al resolver el árbol de peer-deps opcionales de `vitest@4` + `msw`/`@vitest/browser` en este entorno (Node v23, fuera del rango soportado por varios paquetes: `^20.19 || ^22.12 || >=24`). `npm install`/`npm ci` fallan sin la flag. **CI usa Node 22** (dentro del rango soportado) y de todas formas corre con `--legacy-peer-deps` por consistencia con local. Si se sube el Node local a 22/24 LTS, vale la pena reintentar sin la flag.

**shadcn/ui se inicializó con el preset "Nova"** (`npx shadcn@latest init -t vite -b radix -p nova -y`) y **se sobreescribió por completo la paleta que trae por defecto** (grises OKLCH) en `src/styles/globals.css`: el bloque `@theme inline` mapea cada variable que shadcn/Tailwind esperan (`--color-primary`, `--color-border`, `--color-sidebar-*`, `--radius-*`…) a las variables de `tokens.css` (`--brand-500`, `--border`, `--radius-card`…). Rebranding = seguir editando solo `tokens.css`, nunca `globals.css` ni los componentes de `components/ui`. También se reemplazó la fuente Geist (que trae el preset) por Inter vía `@fontsource-variable/inter`, self-hosted (no hay `<link>` a Google Fonts — la CSP de `vercel.json` es `default-src 'self'`, no permite fuentes externas).

**El CLI de shadcn no resolvió el alias `@/*` de Vite** y escribió los archivos generados en una carpeta literal `./@/...` en vez de `./src/...`. Se movieron a mano (`src/components/ui/button.tsx`, `src/lib/utils.ts`) y se borró la carpeta `@/`. Si se corre `npx shadcn add <componente>` en el futuro y aparece esto de nuevo, es el mismo bug — mover el archivo a mano a `src/` es la solución.

**Un solo mecanismo de dark mode**, no dos: `tokens.css` reserva el selector `[data-theme='dark']` (vacío hoy, no es requisito). `globals.css` define `@custom-variant dark (&:is([data-theme='dark'] *))` para que el `dark:` de Tailwind use ese mismo atributo — se descartó el `.dark` (clase) que trae shadcn por defecto para no tener dos convenciones compitiendo.

**`Intl.NumberFormat('es-CO', {style:'currency', currency:'COP'})` separa el símbolo del monto con NBSP (` `), no un espacio ASCII normal** — se ve idéntico a `"$ 2.664.500"` en cualquier editor/terminal pero es un carácter distinto. `formatCOP` no lo toca (es el comportamiento correcto de ICU, evita que el símbolo quede separado del monto en un salto de línea). Si se comparan strings a mano en un test nuevo, hay que copiar el carácter real (o construirlo con el helper `cop()` que ya existe en `tests/money.test.ts`), no escribir un espacio normal — si no, el test falla con un diff que se ve idéntico visualmente.

**`lib/api/client.ts` no lanza en el middleware `onResponse` de openapi-fetch** — en vez de eso, expone `unwrap(promise)`, que espera el `{data, error, response}` que devuelve cualquier llamada `api.GET(...)`/`api.POST(...)` y lanza `ApiError` (parseado con `parseApiError`) o `NetworkError` si el `fetch` ni siquiera respondió. Se eligió así (en vez de que el middleware lance) porque encaja mejor con TanStack Query: cada `queryFn`/`mutationFn` de `features/<modulo>/api.ts` hace `unwrap(api.GET(...))` y deja que React Query capture el error lanzado — sin este helper, cada feature tendría que repetir el chequeo de `error` a mano.

**El envelope de error `{code, message, details}` (ARCHITECTURE.md §6) no está tipado en el OpenAPI generado.** El `openapi.json` del backend solo documenta el `HTTPValidationError` nativo de FastAPI (422) como schema; los códigos custom (`PERMISSION_DENIED`, `CASH_SESSION_NOT_OPEN`, etc.) no aparecen como schema por-endpoint — son un contrato transversal documentado en prosa, no en el spec. Por eso `parseApiError` en `lib/api/errors.ts` trata el body del error como `unknown` y lo valida en runtime (`isErrorEnvelope`), en vez de confiar en el tipo que infiere `openapi-fetch`. Esto no viola la regla "tipos desde OpenAPI, nunca a mano" — esa regla es sobre los DTOs de request/response documentados, no sobre este envelope transversal.

**Se construyó la primitiva `useIdempotencyKey` (`lib/api/idempotency.ts`) pero NO el helper `useMoneyMutation`** que menciona CLAUDE.md regla 8. `useMoneyMutation` necesita decidir su forma exacta (cómo envuelve `useMutation` de TanStack Query, cómo deshabilita el botón, qué invalidaciones dispara) y eso se define mejor cuando exista el primer consumidor real (abonos, paso 5) — construirlo ahora sin un caso de uso concreto es adivinar la abstracción. `useIdempotencyKey` sí es una primitiva estable y sin ambigüedad (genera/retiene un UUID, `reset()` para la siguiente acción) así que se construyó de una vez.

**`lib/dates.ts` tiene `setActiveTimezone`/`getActiveTimezone` con estado a nivel de módulo**, no un Context de React. `activeTimezone` arranca en `BOGOTA_TZ` (fallback documentado en ARCHITECTURE §7) y el bootstrap de sesión del paso 2 (`GET /me`) debe llamar `setActiveTimezone(me.company.timezone)` una vez cargue. Se eligió estado de módulo (no Context/Zustand) porque `formatDate`/`formatDateTime`/`todayBogota` se usan fuera de componentes React también (formateo en columnas de `DataTable`, validaciones de Zod, etc.) — un Context no estaría disponible ahí.

**`formatDate` es estrictamente para fechas-sin-hora** (`"yyyy-MM-dd"`, ej. `session_date`, vencimientos) y reformatea el string directamente con regex, sin crear nunca un objeto `Date` — así se evita el corrimiento de un día que causó el bug del backend (ver test fijo en `tests/dates.test.ts`, caso "ventana 7pm–medianoche"). **`formatDateTime` es para timestamps con hora** (`created_at`, etc.) y sí convierte con `@date-fns/tz` a la zona activa. Pasarle a `formatDate` un timestamp completo, o a `formatDateTime` una fecha-sin-hora, es un uso incorrecto — cada uno tiene un contrato de entrada distinto a propósito.

**`gen-api.mjs` prioriza un `openapi.json` local** (si existe en la raíz, gitignoreado) **sobre la red**, para poder generar tipos sin depender de que el backend dev esté arriba. Sin ese archivo, descarga de `${VITE_API_URL}/openapi.json` (default `https://compraventa-backend-dev.fly.dev` si no hay `.env`). `--check` regenera en memoria y compara contra `src/types/api.ts` commiteado — así CI detecta drift de la API antes del deploy (regla del `Definición de Hecho`).

**ESLint bloquea hex/rgb sueltos**, pero solo dentro de `src/features/**` y `src/components/shared/**` (regla `no-restricted-syntax` en `eslint.config.js`) — no en `src/components/ui/**` porque esos son generados por shadcn y pueden traer sus propios valores internos (ej. `color-mix(in oklch, ...)`) que no son "un color a mano" en el sentido que prohíbe DESIGN_SYSTEM.md §6.

### Qué falta (explícitamente fuera de alcance del paso 1)

Nada de esto está construido todavía — es el paso 2 ("Auth + shell") en adelante, per `CLAUDE.md`:

- Login, refresh, callback de invitación, bootstrap real con `GET /me`.
- `AppShell`, guards de ruta, `usePermission`/`<Can>` (dependen de `/me`).
- TanStack Router no está instalado — se agrega cuando se construyan las rutas reales.
- React Hook Form + Zod, Zustand, Recharts, y el resto de `components/shared` (DataTable, AppDialog, MoneyInput, DatePicker, StatusBadge, etc.) — se agregan cuando la primera feature que los necesita se construya, no antes.
- `docs/API_GUIDE.md` todavía no se copió del repo backend (pendiente, ver `README.md`).

### Comandos de verificación (todos en verde al cerrar el paso 1)

```bash
npm run lint        # eslint . — limpio
npm run typecheck    # tsc -b --noEmit — limpio, estricto (strict + noUncheckedIndexedAccess)
npm run test          # vitest run — 25/25 tests (money.ts, dates.ts)
npm run gen:api:check   # src/types/api.ts al día con /openapi.json del backend dev
npm run build            # tsc -b && vite build — build de producción sin errores
```
