# Estado de implementación

> Registro vivo de qué existe en el código, cómo está armado y por qué se tomó cada decisión — para que cualquiera (humano o Claude Code) pueda retomar el proyecto sin releer todo el historial de commits. Se actualiza en cada paso del "Orden de implementación" de `CLAUDE.md`. No repite lo que ya está en `ARCHITECTURE.md`/`DESIGN_SYSTEM.md` (el qué-debería-ser); esto es el qué-hay-hoy y las decisiones concretas tomadas al construirlo.

## Paso 4 — Customers + catalogs (completo)

CRUD de clientes con búsqueda `?q=`, árbol de categorías (3 niveles, armado en el cliente desde la lista plana) con CRUD, proveedores con CRUD. Primera aparición de `DataTable` (TanStack Table) y del helper central de errores de formulario. Probado en navegador real, incluyendo el caso de conflicto (409) exacto que describe `DESIGN_SYSTEM.md` §4.9.

### Estructura nueva

```
src/
  components/shared/
    DataTable.tsx           # LA tabla — TanStack Table headless, markup/estilo propio
    SearchInput.tsx           # debounce 300ms
    EmptyState.tsx
  lib/forms/
    applyServerErrors.ts       # VALIDATION_ERROR → setError por campo; CONFLICT → mensaje contextual
  features/
    customers/
      api.ts                    # useCustomersList (cursor + q), create/update
      components/CustomerFormDialog.tsx
      pages/CustomersPage.tsx
    catalogs/
      tree.ts                    # buildCategoryTree — pura, testeada (id/parent_id → árbol)
      api.ts                      # categorías (lista plana sin paginar) + proveedores (cursor)
      components/
        CategoryFormDialog.tsx
        CategoryTreeView.tsx
        SupplierFormDialog.tsx
      pages/CatalogsPage.tsx        # tabs: Categorías / Proveedores
```

### Decisiones y hallazgos

**`@tanstack/react-table` está fijado en `^8`, no la última (`9.x`).** `npm install @tanstack/react-table` instaló v9 por defecto, que rediseñó su sistema de tipos alrededor de un generic `TFeatures` — API distinta a la documentada/madura que se conoce. Se bajó a v8 (`8.21.3`) explícitamente: estable, bien documentada, sin cambios de comportamiento a mitad de paso. Reevaluar v9 cuando su ecosistema/documentación madure.

**Los formularios de creación/edición (`CustomerFormDialog`, `CategoryFormDialog`, `SupplierFormDialog`) NO usan `useEffect` para resetear el form al abrir.** El primer intento sí lo hacía (`useEffect(() => reset(...), [open, entity])`) pero `eslint-plugin-react-hooks@7` (las reglas nuevas, alineadas con React Compiler) lo marca como error: `react-hooks/set-state-in-effect` — llamar `setState`/`reset()` síncronamente dentro de un efecto puede encadenar renders. Se resolvió con el patrón que React recomienda: cada página consumidora mantiene un `dialogNonce` (contador) que incrementa en CADA apertura del diálogo (crear o editar) y se lo pasa como `key` al componente del formulario — React lo desmonta/remonta entero, así `useForm({ defaultValues })` arranca limpio sin sincronizar nada imperativamente. **Detalle real que se encontró probando en navegador:** con un `key` basado solo en `entity?.id ?? 'new'` (sin el nonce), abrir "+ Nuevo cliente", escribir, cerrar sin guardar, y volver a abrir "+ Nuevo cliente" heredaba el draft anterior (mismo `key='new'` → no remonta) — un campo con datos de un intento abandonado se puede enviar sin que el usuario lo note. El nonce por apertura (no solo por identidad de la entidad) es necesario para evitar esto.

**Mismo motivo, `SearchInput` cambió de "dos `useEffect`" a "ajustar estado durante el render".** Sincronizar `draft` (estado local del input) con `value` (prop externa) vía `useEffect(() => setDraft(value), [value])` es exactamente el antipatrón que la regla nueva marca. Se reemplazó por el patrón oficial de React para "ajustar estado cuando cambia una prop": comparar `value` contra un `prevValue` guardado en estado y llamar `setDraft`/`setPrevValue` directamente en el cuerpo del componente (no en un efecto) cuando difieren — React soporta esto sin loop porque re-renderiza inmediatamente antes de pintar.

**Hallazgo real, no relacionado con el código: el backend dev tiene latencia alta (10–30s) en escrituras (`POST`/`PATCH`), aparentemente cold-start de Fly.io/DB tras inactividad — las lecturas (`GET`) responden normal (&lt;1s).** Se descubrió porque las primeras pruebas de "crear categoría" parecían colgarse (el botón se quedaba en "Guardando…" y el test fallaba por timeout) — pero esperando más tiempo, la request SÍ completaba con 201. Ninguna de las categorías "fallidas" en las primeras pruebas en realidad falló — todas se crearon igual, solo tarde. Para pruebas manuales/futuras: dar por lo menos 30s a la primera escritura de una sesión de prueba, no asumir que un `POST` colgado es un bug del front sin antes esperar.

**Los códigos de permiso usados (`customers.create`, `catalogs.manage`) son inferidos por convención (`modulo.accion`, como `cashbox.open_close` que sí está documentado explícitamente en `ARCHITECTURE.md` §6), no confirmados contra un catálogo real.** `GET /identity/permissions` (paso 8) todavía no existe en el front — cuando exista, hay que verificar que estos strings coincidan exactamente o corregirlos. Mientras tanto el efecto de un código incorrecto es conservador (el botón no se muestra), nunca inseguro.

**`applyServerErrors` es la única función que traduce `VALIDATION_ERROR`/`CONFLICT` a estado de un form de RHF** — confirmado en navegador con un documento de cliente duplicado: el mensaje "Ya existe un cliente con ese documento." aparece exactamente bajo el campo `doc_number`, igual al ejemplo textual de `DESIGN_SYSTEM.md` §4.9. Los tres forms de este paso ya lo usan; los que vengan (contratos, ventas, identity) lo reusan tal cual.

**`CategoryUpdateIn` no acepta cambiar `parent_id`** (no está en el schema) — mover una categoría de rama en el árbol no es una operación soportada por la API hoy. `CategoryFormDialog` en modo edición no ofrece esa opción (consistente con el contrato, no una limitación inventada del front).

### Qué falta (fuera de alcance del paso 4)

- Confirmar los códigos de permiso reales contra `GET /identity/permissions` — paso 8.
- Reordenar/mover categorías en el árbol — no lo soporta la API.
- Vista de detalle de cliente (historial de contratos/ventas) — llega con esas features (pasos 5/7).

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (35 tests)
npm run dev   # /clientes y /catalogos ya con CRUD real
```

## Paso 3 — Dashboard + caja mínima (completo)

KPIs reales (`GET /reports/dashboard`), gráfica "Contratos por estado", `CashSessionBanner` funcionando de punta a punta (abrir caja incluido). Primeros componentes de dinero (`Money`, `MoneyInput`) y el modal único (`AppDialog`) — construidos con un consumidor real, no por adelantado. Probado en navegador real con datos reales de "Empresa Demo Front" (login → dashboard → abrir caja → banner se actualiza).

### Estructura nueva

```
src/
  components/shared/
    AppDialog.tsx           # EL modal de la app — sobre shadcn/ui Dialog (Radix)
    Money.tsx                 # formatCOP envuelto, tabular-nums
    MoneyInput.tsx              # enmascara mientras se escribe, emite decimal string
    KpiCard.tsx                  # KpiCard + KpiRow
    PageHeader.tsx
    StatusBadge.tsx                # ÚNICO lugar que traduce estado→texto (+ statusLabel() reutilizable)
    CashSessionBanner.tsx            # franja global bajo la topbar, en AppShell
    charts/
      ContractsStatusChart.tsx       # wrapper Recharts, colores por var(--status-*)
  components/ui/
    dialog.tsx                # shadcn — base de AppDialog
  features/
    dashboard/
      api.ts                    # useDashboard() → GET /reports/dashboard
      pages/DashboardPage.tsx     # real: KpiRow + chart, ya no placeholder
    cashbox/
      api.ts                      # useCashboxCurrent(), useOpenSession()
      components/OpenSessionDialog.tsx
```

### Decisiones y hallazgos

**`CASH_SESSION_NOT_OPEN` no es un error de UI, es un dato.** `GET /cashbox/sessions/current` lo lanza (como `ApiError`, vía el envelope `{code,...}`) cuando no hay sesión abierta hoy — `cashboxCurrentQueryOptions` lo atrapa y normaliza a `null`, así `useCashboxCurrent()` se consume como cualquier query normal (`data: SessionOut | null`) en vez de que cada consumidor tenga que hacer `try/catch` de un `ApiError` específico. **Confirmado en runtime que ese código viaja en un HTTP 404**, no 409 como sugiere la tabla de `ARCHITECTURE.md` §6 — no importa: el código del front nunca mira el status HTTP para esto, solo `error.code`, exactamente por lo que la regla 9 pide "por code, nunca por message" (y, resultó, tampoco por status).

**`AppDialog` y `MoneyInput` se construyeron en este paso, no en el 1, a propósito.** En el paso 1 se documentó (ver abajo, Paso 1) que construir infraestructura sin un consumidor real es adivinar la forma. "Abrir caja" fue el primer flujo real que necesitaba capturar dinero dentro de un modal — se construyeron ahí, con un caso de uso concreto validándolos de inmediato (capturado en pantalla, funcionando).

**Clases de Tailwind para colores de estado son estáticas a propósito, nunca interpoladas.** `StatusBadge` usa un `Record<KnownStatus, string>` con la clase completa por estado (`'bg-status-active/15 text-status-active'`) en vez de construirla con template strings (`` `bg-${token}/15` ``) — Tailwind v4 escanea el código fuente buscando nombres de clase literales; una clase armada en runtime con interpolación no genera CSS y el badge queda sin estilo. Mismo motivo por el que `ContractsStatusChart` sí puede usar `fill="var(--status-active)"` directo (Recharts no pasa por el scanner de Tailwind — es un atributo SVG que el navegador resuelve como CSS normal).

**`recharts` necesitó `react-is` como dependencia directa** — sin instalarla a mano, `vite build` (Rolldown) fallaba con `Failed to resolve import "react-is"` (una dependencia transitiva de `recharts/es6/util/ReactUtils.js` que no se resolvía sola con `--legacy-peer-deps`). `npm run dev` no lo mostraba porque el pre-bundling de esbuild es más permisivo — el bug solo aparecía en build de producción. Se agregó explícitamente a `package.json`.

**Gotcha de dev server: la primera carga después de instalar `recharts` es lenta (varios segundos)** — Vite tiene que optimizar esa dependencia (pesada: trae d3-shape, d3-scale, etc.) la primera vez que algo la importa. Un test en navegador con timeout corto (3-6s) puede parecer que el login "se cuelga" cuando en realidad solo está esperando el bundle de recharts — hay que esperar con `waitForSelector` de un elemento del destino, nunca un `waitForTimeout` corto, exactamente lo que ya advertía la skill de `run`.

**Bundle sin code-splitting todavía:** el JS de producción ya pasa 1MB (recharts es pesado) — `ARCHITECTURE.md` §9 ya prevé `React.lazy` por ruta para esto, pero con 2 rutas reales (`/`, `/auth/login`) partir el bundle no rinde todavía. Se retoma cuando haya más features con peso real (gráficas, tablas) en rutas separadas.

**"Listos para remate" quedó como número en el KPI row, sin la card de lista accionable** que describe `DESIGN_SYSTEM.md` §5 ("lista corta accionable — la alerta operativa más valiosa") — `DashboardOut.contracts` solo trae el conteo (`ready_for_auction_count`), no los contratos individuales; una lista accionable de verdad necesita poder consultar contratos por estado, que es la feature `contracts` (paso 5). Se retoma ahí.

**Sidebar "Caja" sigue deshabilitada** — el `CashSessionBanner` cubre "abrir sesión" (lo único que pide el paso 3), pero no hay todavía una pantalla de caja (histórico, cierre, gastos) a la que ese link pueda apuntar — eso es "cashbox completo", paso 6.

### Qué falta (fuera de alcance del paso 3)

- Card de "Listos para remate" con lista accionable — paso 5 (contracts).
- Card de ventas con serie mensual — bloqueada en el backend (`GET /reports/series` no existe todavía, ver `docs/RECOMENDACIONES.md`).
- Pantalla de caja completa (cierre, gastos, reapertura, histórico, acta imprimible) — paso 6.
- Code-splitting por ruta — cuando el bundle lo justifique.

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde
npm run dev   # login real → dashboard con KPIs → banner de caja → abrir caja
```

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

**Gotcha real de TanStack Router: `id` en una ruta pathless NO es lo mismo que su `fullPath`.** Si una ruta layout se crea con `id: 'algo'` (sin `path`), su `fullPath` para matching de URL queda correctamente vacío/heredado del padre, PERO su `id` interno (usado por `from:` en `useSearch`/`useParams` tipados) SÍ incluye ese `'algo'` como segmento — así que `useSearch({from: '/auth/login'})` no compilaba porque el id real terminaba siendo `/auth-layout/auth/login`, no `/auth/login`. Se resolvió dándole a `authLayoutRoute` un `path: '/auth'` real (con hijos en paths relativos `'login'`/`'callback'`) en vez de un `id` pathless — así `id === fullPath` y no hay sorpresas. `appLayoutRoute` sí se dejó pathless vía `id: 'app-layout'` porque ninguno de sus hijos actuales necesita `useSearch`/`useParams` tipados por nombre — si algún día lo necesitan, aplica la misma solución.

**Bug real #1 — URL duplicada `/api/v1/api/v1/...` en TODAS las requests.** `client.ts` tenía `baseUrl: `${VITE_API_URL}/api/v1`\`, pero las claves de `paths` generadas por `gen:api` YA incluyen el prefijo `/api/v1` (así están en el `openapi.json` del backend: `"/api/v1/me"`, no `"/me"`). El `baseUrl` correcto es solo `VITE_API_URL`. Esto habría roto el 100% de las llamadas a la API — lo capturó la prueba en navegador real (`tsc`/build nunca lo iban a detectar, porque el path completo sigue siendo un `string` válido para TypeScript).

**Bug real #2 — sin `errorComponent` en el root, un `NetworkError` durante el bootstrap de `/me` mostraba la pantalla default (fea, sin estilo) de TanStack Router**, violando la regla 10 (toda vista con datos necesita estado de error). Se agregó `src/app/pages/ErrorPage.tsx` como `errorComponent` de `rootRoute` — pantalla estándar con botón "Reintentar" (`reset()` de TanStack Router).

**Bug real #3 — loop infinito entre `/` y `/auth/login` cuando el backend rechaza con 401 una sesión de Supabase técnicamente válida** (ej. un usuario creado a mano en el dashboard de Supabase sin la fila correspondiente en la base del backend — exactamente el caso de un usuario de prueba). Secuencia del bug: `/me` → 401 → `client.ts` refresca el token (éxito, la sesión de Supabase SÍ es válida) → reintenta `/me` → 401 otra vez → el router redirige a `/auth/login` → pero como la sesión de Supabase seguía viva, el guard de `authLayoutRoute` ("si ya hay sesión, redirige a `/`") rebotaba de vuelta → loop infinito, decenas de requests por segundo. Fix en `lib/api/client.ts`: si el 401 **persiste incluso después de un refresh exitoso**, es la señal de "sesión válida pero backend la rechaza" (§4.6: "si persiste → logout") — ahí sí se llama `supabase.auth.signOut()` de verdad, no solo se redirige. El router además pasa `reason=inactive` en el redirect para que `LoginPage` muestre el mensaje correspondiente.

**Bug real #4 (menor) — tormenta de reintentos.** Con la retry policy default de TanStack Query (3 reintentos) multiplicada por el reintento-de-401 propio de `client.ts`, un solo `/me` fallido generaba hasta ~8 requests. Fix en `app/query-client.ts`: `retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 2` — un `ApiError` es determinístico (401/403/409…), reintentar no cambia el resultado; solo vale la pena reintentar fallas de red transitorias (`NetworkError`).

**Cómo se probó de verdad:** primero con un usuario creado a mano en el dashboard de Supabase (Authentication → Add user), sin fila en el backend — confirmó exactamente el caso límite esperado (`/me` → 401 → mensaje "usuario/empresa inactivos", a propósito según ARCHITECTURE §4.6; comportamiento correcto, no un bug). Después, con una empresa+usuario+rol sembrados del lado del backend (`Empresa Demo Front`, rol Admin, permisos completos, suscripción activa), se confirmó el **happy path completo end-to-end**: login → `GET /me` 200 → dashboard renderiza con los datos reales (`Hola, Mateo Jaramillo` / `Empresa Demo Front · Admin · plan Completo`) → sidebar con nombre de empresa real, item activo resaltado, módulos sin pantalla deshabilitados → drawer mobile con overlay → menú de avatar con nombre/correo/rol → logout limpio de vuelta a `/auth/login` con el form vacío (sin datos de la sesión anterior colgando). Cero errores de consola en todo el flujo.

**`AppShell` recorta variantes de la referencia visual que no tienen backend/pantalla real todavía:** sin buscador funcional (input deshabilitado, solo visual), sin íconos de ayuda/notificaciones/apps en el topbar, sin "Perfil"/"Cambiar contraseña" en el menú del avatar (solo "Cerrar sesión", que sí funciona) — evita UI decorativa que no hace nada. El menú lateral muestra los 10 módulos del orden aprobado, pero solo "Inicio" es un link real; el resto se renderiza deshabilitado (`aria-disabled`, sin `<Link>`) hasta que exista la pantalla. El filtrado por código de permiso (no solo por "¿existe la pantalla?") llega cuando exista el catálogo real de `GET /identity/permissions` (paso 8).

**No se construyó un guard de ruta por permiso** (solo por sesión/suscripción) — no hay todavía ninguna ruta que lo necesite; se agrega junto con la primera pantalla permission-gated real (paso 4+), mismo criterio que `useMoneyMutation` en el paso 1.

### Qué falta (fuera de alcance del paso 2)

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
