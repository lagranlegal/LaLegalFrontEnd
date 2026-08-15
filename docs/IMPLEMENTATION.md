# Estado de implementación

> Registro vivo de qué existe en el código, cómo está armado y por qué se tomó cada decisión — para que cualquiera (humano o Claude Code) pueda retomar el proyecto sin releer todo el historial de commits. Se actualiza en cada paso del "Orden de implementación" de `CLAUDE.md`. No repite lo que ya está en `ARCHITECTURE.md`/`DESIGN_SYSTEM.md` (el qué-debería-ser); esto es el qué-hay-hoy y las decisiones concretas tomadas al construirlo.

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
