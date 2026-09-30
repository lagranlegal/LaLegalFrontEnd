# CLAUDE.md — Frontend de Prendo

Reglas obligatorias para escribir código en este repo. Leer completo antes de tocar algo.

- **Qué es Prendo, las piezas y el mapa de documentos:** `../backend-starter/docs/README.md`. El estado del día:
  `../backend-starter/docs/ESTADO.md`.
- **Cómo está construido el front y por qué:** `docs/ARQUITECTURA.md`. **Sistema de diseño:** `docs/DESIGN_SYSTEM.md`.
- **Reglas de negocio:** `../backend-starter/docs/DOMINIO.md`. **Endpoints, permisos y catálogo de errores:**
  `../backend-starter/docs/API_GUIDE.md` (el shape exacto siempre sale de `/openapi.json`).
- **Desplegar y trampas del entorno:** `../backend-starter/docs/OPERACION.md`. **Método de QA y bugs abiertos:**
  `../backend-starter/docs/QA.md`.

## Qué es este repo

La SPA de **Prendo**, un SaaS multi-tenant para compraventas colombianas (empeño + tienda). Consume la API del
backend (FastAPI en Fly, `https://api-dev.prendo.com.co`) y usa Supabase solo para Auth y Storage. **No
reimplementa ninguna regla de negocio**: intereses, estados, stock, caja, códigos y saldos los calcula el backend;
el front muestra, guía y valida forma.

- Stack: Vite + React 19 + TypeScript estricto, Tailwind CSS v4 + shadcn/ui (Radix), TanStack Query v5 / Router /
  Table v8, React Hook Form + Zod, Zustand (solo UI), Recharts, Tiptap (plantillas), `supabase-js` (solo auth y
  storage), `openapi-fetch` + tipos generados con `openapi-typescript`.
- Deploy: Vercel, desde la rama `dev` (`dev.prendo.com.co`). Landing pública en `/`, la app en `/inicio`.
- UI en **español de Colombia**. Dinero en **COP con puntos de miles** (`$ 2.664.500`). Fechas en la **zona de la
  empresa** (America/Bogota).

## Reglas obligatorias

1. **Tipos desde OpenAPI, nunca a mano.** `npm run gen:api` regenera `src/types/api.ts`. Si un shape no cuadra, se
   regenera; jamás se corrige el tipo. Un tipo escrito desde la suposición es una mentira que el compilador
   defiende. Por defecto lee el backend de dev desplegado; para uno local sin desplegar, ARQUITECTURA §13.
2. **Una sola puerta a la API:** `src/lib/api/client.ts` (`api` + `unwrap`). Ninguna feature hace `fetch` directo.
3. **Features aisladas:** `src/features/<modulo>/` (`api.ts` → `components/` → `pages/`). Una feature no importa
   internals de otra; lo compartido sube a `src/components/shared/` o `src/lib/`.
4. **Diseño 100% centralizado:** todo color, radio, sombra, espaciado, tipografía y duración sale de
   `src/styles/tokens.css`. Prohibido un hex, un radio arbitrario o un color de paleta fija de Tailwind en una
   feature. **Relleno no es texto**: el color `primary` es el relleno del botón (oro claro); para texto y bordes en
   color de marca va el color `brand` (`--brand-700`). DESIGN_SYSTEM §1.
5. **Tailwind v4 escanea los `.md` y `.html` del repo**: una clase escrita en un documento se emite en el bundle
   (pasó con un ejemplo con el hex del teal viejo en este archivo). **En la documentación no se escribe la sintaxis
   real de una clase**; se nombra el token. En el código, las clases de estado van completas y estáticas, nunca
   interpoladas. ARQUITECTURA §16.
6. **Dinero** (`lib/money.ts`): la API usa strings decimales (`"1000000.00"`). Nunca `parseFloat` para hacer
   cuentas: aritmética de presentación en centavos enteros (`sumMoney`, `multiplyMoney` en `bigint`,
   `percentOfMoney`, nunca `multiplyMoney(x, pct / 100)`), `formatCOP` para mostrar y `<MoneyInput>` para capturar
   (`optional` si el campo puede quedar sin dato). Intereses y saldos los pide al backend (`payment-options`). La
   coma decimal se acepta (`normalizeDecimalInput`). ARQUITECTURA §7.
7. **Fechas en la zona de la empresa, sin excepciones:** `lib/dates.ts` (`todayBogota()`, `formatDate`,
   `formatDateTime`). Prohibido `new Date().toISOString().slice(0, 10)`, `toLocaleDateString()` sin zona o `dayjs()`
   pelado.
8. **Permisos: la UI oculta, el backend protege.** Salen de `GET /api/v1/me`. Toda ruta de módulo lleva guard
   (`beforeLoad` + `redirect` a `/inicio`) **y** su ítem de menú lleva `anyPermission`: las dos cosas. Botones con
   `usePermission`/`<Can>`. **Un 403 no es una falla**: nunca "no se pudo cargar" por un permiso faltante
   (`isPermissionError`). Una pantalla nueva sin gate es un bug de revisión.
9. **Idempotencia:** toda mutación de dinero usa `useMoneyMutation` (una `Idempotency-Key` por acción del usuario,
   reusada en los reintentos; botón deshabilitado mientras vuela). Tras la mutación, invalidar lo afectado
   (documento, listado, `['dashboard']`, `['cashbox', 'current']` si movió caja). **Sin updates optimistas en dinero
   ni stock.**
10. **Errores por `code`, nunca por `message`.** Todo código nuevo del backend se agrega a `API_ERROR_CODES`
    (`lib/api/errors.ts`) copiado de la línea que lo emite, con su test de contrato. `CASH_SESSION_NOT_OPEN` abre el
    diálogo de caja, no un toast. ARQUITECTURA §6.
11. **Formularios:** Zod para la forma; `applyServerErrors(error, setError, { fields })` con la lista de los campos
    que el formulario **pinta** (lo demás cae al banner: un 422 nunca queda invisible); `revealFirstError` para
    llevar el error a la vista. **Todo `<form>` que mueve dinero lleva `onKeyDown={preventImplicitSubmit}`: Enter no
    registra plata.** ARQUITECTURA §12.
12. **Estados de UI completos:** carga (esqueleto con la forma del contenido), vacío (`EmptyState` con CTA), error
    (con reintento, salvo 403) y éxito. Un solo modal (`AppDialog`), un solo calendario (`DatePicker`), una sola
    tabla (`DataTable`).
13. **Seguridad:** solo la key anon/publishable de Supabase (nunca la `service_role`: todo `VITE_*` queda en el
    JavaScript público). Sin `dangerouslySetInnerHTML`. Fotos solo en el bucket privado por URL firmada, y se borran
    de Storage **al guardar**, no al quitarlas (ARQUITECTURA §15). Nunca datos de clientes reales en tests, capturas
    ni documentos (Ley 1581).
14. **Plantillas e impresos:** un campo nuevo de plantilla va en `lib/documents/mergeFields.ts` (catálogo único); si
    el backend cambia qué exige una plantilla activa, se cambia `templateRequirements.ts`. Lo que tiene que salir
    siempre en el papel (la leyenda de las dos fechas del recargo) va fuera de la plantilla. ARQUITECTURA §14.

## Autenticación

El backend no tiene login propio. `supabase-js` hace `signInWithPassword` y el refresh; el cliente HTTP pone el
`Bearer` y ante un 401 refresca y reintenta una vez. Alta **solo por invitación**: el enlace llega a
`/auth/callback` y se canjea con `verifyOtp` (POST) al tocar «Continuar», nunca al cargar (las vistas previas
queman los enlaces de un solo uso). Tras el login y en cada recarga, `GET /me` antes de pintar el shell. Super-admin =
claim `app_metadata.platform_role == "super_admin"` (rutas `/platform`). ARQUITECTURA §4.

## Estructura

```
src/app/                router, query client, store de UI, layouts, páginas de bloqueo/404/error
src/components/ui/      shadcn/ui generado (se themea por tokens)
src/components/shared/  los compartidos (DESIGN_SYSTEM §3), charts/, documentTemplate/
src/features/           accounts audit auth capital cashbox catalogs contracts customers dashboard identity
                        inventory landing platform reports sales settings unsubscribe
src/lib/                api/ auth/ permissions/ forms/ documents/ storage/ export/ money.ts dates.ts y helpers
src/styles/             tokens.css (única fuente del diseño) y globals.css
src/types/api.ts        GENERADO, no se edita
tests/                  Vitest + Testing Library; fixtures/ con respuestas reales del backend
```

## Definición de hecho

- `npm run lint` y `npm run typecheck` limpios; sin `any` nuevos; tipos regenerados si cambió la API (y el backend
  desplegado primero si el cambio toca los dos repos).
- Vista nueva: guard + ítem de menú con permiso, estados completos, verificada a 360 px y 1280 px.
- En el diff, buscar `toLocaleDateString|parseFloat|toISOString` como checklist.
- Tests: los de la lógica tocada, **vistos fallar sin el arreglo**; aserciones de error contra el `code`; fixtures
  **copiados de respuestas reales** del backend, nunca escritos de memoria (ARQUITECTURA §10).
- "Pusheado" no es "servido": lo que se entrega se verifica contra el bundle desplegado (OPERACION §4.1).
- Documentar en el mismo cambio: la regla de código en `docs/ARQUITECTURA.md`, lo visual en `docs/DESIGN_SYSTEM.md`,
  el estado en `../backend-starter/docs/ESTADO.md`. Sin bitácora: el porqué en una o dos líneas, el relato en el
  commit.

## Entorno y comandos

`.env` (copiar de `.env.example`): `VITE_API_URL=https://api-dev.prendo.com.co`, `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY` (la anon). Nunca las URLs viejas `*.fly.dev`: el CSP de la app servida las bloquea.

```bash
npm install --legacy-peer-deps   # un bug de npm con los peer-deps opcionales de vitest; la CI usa lo mismo
npm run dev
npm run gen:api                  # tipos desde $VITE_API_URL/openapi.json (o ./openapi.json si existe)
npm run lint && npm run typecheck
npm run test                     # Vitest (en el agente, con tope: perl -e 'alarm 280; exec @ARGV' npx vitest run …)
npm run build
```
