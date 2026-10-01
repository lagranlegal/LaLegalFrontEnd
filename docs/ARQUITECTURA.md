# Arquitectura del frontend

> **Qué es.** Cómo está construido el front de Prendo y por qué. Lo canónico, sin bitácora: el porqué va en una o
> dos líneas; el relato largo vive en los mensajes de commit.
>
> Qué es Prendo, las piezas y el mapa de documentos: [`backend-starter/docs/README.md`](../../backend-starter/docs/README.md).
> Reglas de negocio: `backend-starter/docs/DOMINIO.md`. Endpoints y catálogo de errores:
> `backend-starter/docs/API_GUIDE.md` (§15). Despliegue y trampas del entorno: `backend-starter/docs/OPERACION.md`.
> Sistema de diseño: [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md). Reglas obligatorias para escribir código:
> [`../CLAUDE.md`](../CLAUDE.md).
>
> Las secciones §1–§11 conservan la numeración del antiguo `ARCHITECTURE.md` porque el código las cita por número.

## 1. Qué es

SPA en **Vite + React 19 + TypeScript estricto**, desplegada en **Vercel**, que consume la API REST del backend
FastAPI (`https://api-dev.prendo.com.co/api/v1` en dev) y usa **Supabase solo para dos cosas**: Auth (login,
refresh, canje de enlaces; el backend no tiene login propio) y Storage (fotos; el backend guarda solo la ruta).

**El backend es la autoridad.** Intereses, estados, stock, códigos, saldos y subtotales reales los calcula él; el
front muestra, guía y valida *forma*. Cuando el front repite una regla (el LTV en pantalla, los requisitos de una
plantilla) es para avisar antes, y el backend la vuelve a aplicar.

**Por qué SPA y no Next.js:** es un panel detrás de login, el servidor de reglas ya existe y SSR agregaría una
segunda capa de servidor sin beneficio. La única página pública de venta (la landing en `/`) es una ruta más: el
HTML servido trae `<title>`, description y `og:*` en `index.html`; si algún día necesita SEO de verdad, se
prerenderiza esa ruta, no se muda la app.

## 2. Estructura del repo

```
src/
  app/            router.tsx (rutas a mano, TanStack Router), query-client.ts, store.ts (Zustand: tema, UI),
                  layouts/ (AuthLayout, PlatformLayout), pages/ (bloqueo por suscripción, 404, error)
  components/
    ui/           shadcn/ui generado; se themea por tokens, no se edita el diseño componente por componente
    shared/       los compuestos de toda la app (DESIGN_SYSTEM.md §3) + charts/ + documentTemplate/ (editor Tiptap)
  features/       un directorio por módulo del backend: accounts, audit, auth, capital, cashbox, catalogs,
                  contracts, customers, dashboard, identity, inventory, landing, platform, reports, sales,
                  settings (empresa, plantillas, notificaciones, perfil), unsubscribe
  lib/            api/ (cliente, errores, paginación, idempotencia) · auth/ (supabase, /me, inactividad) ·
                  permissions/ · forms/ · documents/ (campos de plantilla, requisitos, cláusulas) · storage/ ·
                  export/ (Excel) · money.ts · dates.ts · y helpers por dominio (accounts, sales, inventory…)
  styles/         tokens.css (única fuente del diseño) y globals.css (mapeo a Tailwind y shadcn)
  types/api.ts    GENERADO por `npm run gen:api` (§13); no se edita
tests/            Vitest + Testing Library (jsdom); fixtures/ con respuestas reales del backend (§10)
scripts/          gen-api.mjs
docs/             este documento, DESIGN_SYSTEM.md y correo-invitacion.html / correo-recuperacion.html:
                  la fuente de las plantillas «Invite user» y «Reset password» de Supabase Auth. Se aplican
                  con un PATCH a la Management API (backend-starter/docs/PRODUCCION.md §1.8.4), nunca con
                  `supabase config push`; Supabase las cachea unos minutos. Los correos que manda el backend
                  por Resend copian su molde (app/modules/notifications/templates.py)
```

Dentro de una feature: `api.ts` (hooks de Query y mutaciones, query keys, invalidaciones) → `components/` →
`pages/`. **Una feature no importa los internals de otra**; lo compartido sube a `components/shared` o `lib/`. Sin
"services" que dupliquen al backend.

- `supabase-js` maneja la sesión y el refresh solo (`lib/auth/supabase.ts`); el cliente HTTP lee el token vigente
  de ahí en cada request.
- El front **nunca** escribe directo en Postgres/PostgREST, y hoy tampoco lee: todo pasa por la API.

## 3. Cliente HTTP y estado del servidor

**Una sola puerta a la API: `lib/api/client.ts`** (`openapi-fetch` tipado con `src/types/api.ts`). Es el único
lugar que conoce `Authorization`, el envelope de error y el reintento tras un 401; las features llaman a
`api.GET/POST/…` envuelto en `unwrap()`, que devuelve `data` o lanza `ApiError`/`NetworkError`.

- **401 → refresh y un reintento.** El middleware guarda una copia intacta de cada request *antes* de enviarlo
  (un `WeakMap`), porque `fetch` consume el cuerpo: clonarlo después tiraba `TypeError` en todo POST, y con el
  token vencido (la laptop dormida) el primer abono del día fallaba con un falso "no se pudo conectar". Si el
  refresh falla, o el backend sigue diciendo 401 con sesión renovada (usuario o empresa inactivos), cierra la
  sesión de Supabase de verdad; solo redirigir dejaba un bucle entre `/inicio` y el login.
- **Idempotency-Key con `useMoneyMutation`** (`lib/api/useMoneyMutation.ts` sobre `idempotency.ts`): toda
  mutación de dinero genera **un UUID por acción del usuario**, al montar el formulario (los diálogos se
  remontan con `key` para que abrirlos de nuevo sea una acción nueva); los reintentos reusan la misma clave hasta
  el éxito, y ahí se renueva. `isPending` deshabilita el botón: sin doble envío. `useMoneyMutation` es un
  mecanismo de idempotencia, **no** un sinónimo de "mueve caja": el import de contratos lo usa solo por la clave y
  no invalida la caja.
- **Query keys e invalidaciones** viven en el `api.ts` de cada feature. Una mutación de dinero invalida su
  documento, su listado, `['dashboard']` y `['cashbox', 'current']`. **Nada de updates optimistas en dinero ni
  stock.**
- `QueryClient` (`app/query-client.ts`): `refetchOnWindowFocus` encendido (app operativa, varios usuarios),
  `staleTime` 15 s (con 0, cada alt-tab recargaba todo lo montado) y **sin reintentos para `ApiError`**: un
  401/403/409 es determinístico; solo se reintenta la red. Un `PERMISSION_DENIED` en cualquier query invalida
  `['me']` desde el `QueryCache`: los permisos cambiaron por debajo y la UI se corrige sola.
- Formularios con React Hook Form + Zod (§12); estado de UI global mínimo en Zustand (tema, sidebar).

## 4. Autenticación y sesión

1. **Login** con `signInWithPassword`; supabase-js guarda y refresca la sesión. Signups públicos cerrados: el alta
   es solo por invitación.
2. Cada request lleva `Authorization: Bearer <access_token>` (§3).
3. **Enlaces de invitación y recuperación**: llegan a `/auth/callback?token_hash=…&type=invite|recovery`. El
   token se canjea con `verifyOtp` (un POST) **solo cuando la persona toca «Continuar»**, nunca al cargar: las
   vistas previas de WhatsApp y los escáneres de correo abren los GET y quemarían un enlace de un solo uso. Después
   crea su contraseña (`updateUser`) y entra con ella; el backend la pasa de `invited` a `active` con esa primera
   sesión de contraseña. Enlaces viejos con `#access_token=…` los procesa `detectSessionInUrl`. Detalle en el
   comentario de `AuthCallbackPage.tsx`; diagnóstico de "no pude poner la contraseña" en
   `backend-starter/docs/OPERACION.md` §6.
4. **Claims del JWT** (`company_id`, `role_id`): el front solo los usa para saber si es super-admin
   (`app_metadata.platform_role`). Permisos y datos de empresa salen de `/me`.
5. **Bootstrap: `GET /api/v1/me`** en el `beforeLoad` del layout de la app, tras el login y en cada recarga, antes
   de pintar el shell. Trae `user`, `company` (con `timezone`, logo, firma), `role`, `permissions` (el set exacto
   que acepta el backend), `subscription` y `plan`. Query key `['me']`, `staleTime` ~60 s como el caché de
   permisos del backend. Fija la zona horaria activa de `lib/dates.ts`.
6. **401** con sesión aparentemente válida: refresh y un reintento (§3); si persiste, logout con el aviso
   "tu usuario o tu empresa están inactivos" (el backend responde igual en los dos casos, a propósito).
7. **402 `SUBSCRIPTION_EXPIRED`** al cargar `/me`: redirige a `/cuenta-bloqueada`, pantalla completa, no un toast.

Logout por inactividad a las **6 horas** (`INACTIVITY_LOGOUT_MS` en `lib/auth/inactivity.ts`, decidido con el
primer cliente); al cerrar sesión, `queryClient.clear()` para no dejar datos de una empresa en memoria.

## 5. Permisos en la UI

RBAC dinámico por empresa: se evalúa por **código de permiso** (`contracts.create`), nunca por nombre de rol. La
lista de los 43 permisos vive en `backend-starter/docs/DOMINIO.md` §11.

- `usePermission(code)` y `<Can permission="…">` (`lib/permissions`) leen `me.permissions` y ocultan acciones.
- **Toda ruta de módulo lleva `beforeLoad` con `redirect({ to: '/inicio' })` y todo ítem de menú lleva
  `anyPermission`. Las dos cosas, siempre**: ocultar el enlace no impide escribir la URL, y un guard sin ocultar
  el ítem promete un módulo que rebota. Seis módulos estuvieron sin ninguna de las dos hasta el 21/08/2026.
- El guard usa el permiso de **lectura** (`/cuentas` con `accounts.view`, no `accounts.manage`): quien solo cobra
  necesita ver a qué cuenta va la plata. Crear y editar se gatean por botón.
- La UI oculta; **el backend protege**. Ocultar un botón no protege nada.
- **Un 403 no es una falla.** Es una respuesta correcta del backend, y tratarla como error produce mensajes que
  mienten: un rol sin permisos veía "Caja cerrada" con la caja abierta y "no se pudieron cargar los productos" con
  el inventario sano, más un "Reintentar" que no podía funcionar nunca. Por eso existe
  `lib/api/isPermissionError`: si la pantalla **afirma un estado** y no lo puede saber, no muestra nada; si es una
  lista, dice qué permiso falta y a quién pedirlo, sin reintentar; si el elemento es opcional (el selector de
  cuenta), se oculta y la operación sigue (el backend usa la cuenta por defecto).
- **Un 404 tampoco se reintenta.** `lib/api/isNotFoundError` (`NOT_FOUND`): un detalle que no existe o no es de la
  empresa dice eso y ofrece volver a la lista (`DetailLoadError`, F9-58), nunca «No se pudo cargar… Reintentar».
- **Una consulta cuyo permiso ya se sabe que falta no sale** (`enabled` con `usePermission`): el Inicio del Asesor
  pedía el resumen, el remate y la caja en cada carga para recibir tres 403 (issue #9). `useCashboxCurrent` lo hace
  adentro porque la franja de caja está en todas las pantallas; deshabilitada queda en `isPending`, así que quien
  la consuma sin el permiso no afirma nada. El 403 se sigue atendiendo por si `/me` quedó viejo.
- **Sin permiso, la ruta vuelve al Inicio con un aviso** (`forbidden(preload)` en `router.tsx`, F9-59): la
  redirección muda dejaba sin explicación a quien abría un enlace compartido. En una precarga no avisa.

## 6. Errores: por `code`, nunca por `message`

El backend responde `{code, message, details}` en todo error. `lib/api/errors.ts` tipa el código
(`API_ERROR_CODES`: un código que no está ahí cae a `UNKNOWN` y ninguna rama de la UI puede reaccionar) y
`userMessage(error)` da el texto a mostrar. El catálogo completo, con qué significa cada código, es
`backend-starter/docs/API_GUIDE.md` §15. **Un código es un contrato entre dos capas que nadie compila**: se
nombra copiado de la línea del backend que lo emite y se prueba (§10). `CASH_SESSION_ALREADY_CLOSED_TODAY` estuvo
mal escrito meses y su rama era código muerto; un `NOT_FOUND` donde se esperaba `CASH_SESSION_NOT_OPEN` dejó a una
empresa once días sin operar.

Lo que el front hace distinto del banner genérico:

| `code` | Comportamiento |
|---|---|
| `UNAUTHORIZED` (401) | refresh + reintento; si persiste, logout con aviso (§4.6) |
| `PERMISSION_DENIED` (403) | mensaje de permiso, sin reintentar, e invalidar `['me']` (§5) |
| `SUBSCRIPTION_EXPIRED` (402) | pantalla de bloqueo (§4.7) |
| `NOT_FOUND` (404) | estado "no encontrado" (puede ser de otra empresa: no se distingue a propósito) |
| `VALIDATION_ERROR` (422) | cada error junto a su campo con `applyServerErrors`; lo que no se pinta, al banner (§12) |
| `CASH_SESSION_NOT_OPEN` (409) | **diálogo central de abrir caja** (`CashSessionRequiredDialog`) con el botón si el rol puede, o a quién pedírselo. También al anular una venta. Nunca un toast seco. Consultar el estado no es este caso: `sessions/current` va con `allow_empty=true` (`200 null`, sin 404 en la consola) y el 404 viejo se sigue leyendo como «cerrada» |
| `CASH_SESSION_ALREADY_OPEN`, `…_ALREADY_CLOSED_TODAY`, `…_NOT_CLOSED` | no se arreglan reintentando: el diálogo dice qué hacer (`openSessionErrorMessage`) e invalida `['cashbox']` |
| `IDEMPOTENCY_IN_PROGRESS` (409) | el doble clic: la primera petición va a terminar bien. Banner con el mensaje del backend, sin reintentar |
| `EXTENSION_*`, `CONTRACT_INTEREST_OVERDUE` | el panel de ampliar los muestra **antes** (`GET /extension-options` → `blocked_reason`); como error solo llegan en una carrera, y se recarga el contrato |
| `*_NAME_TAKEN` (409) | al campo `name` del formulario |
| `TEMPLATE_IS_EMPTY`, `TEMPLATE_MISSING_REQUIRED_FIELDS` | el editor ya avisa antes; el mensaje nombra lo que falta con las palabras del editor (§14) |
| `INVITE_RATE_LIMITED` (429) | **único código con texto propio del front** (`FRONT_MESSAGES`): el del backend nombra a Supabase, que el administrador de una compraventa no tiene por qué conocer. Ofrece esperar o "Generar enlace" |
| red / 5xx | toast con reintento; una mutación de dinero reintenta con la **misma** `Idempotency-Key` |

## 7. Dinero, fechas y paginación

### Dinero (`lib/money.ts`)

La API manda y recibe **strings decimales** (`"1000000.00"`). En el front el dinero nunca pasa por `parseFloat`
para hacer cuentas: se muestra con `formatCOP` (`es-CO`, puntos de miles: `$ 2.664.500`) y se captura con
`<MoneyInput>`. Los montos con reglas (intereses, saldos, `expected_cash`, el subtotal real) los calcula el backend
(`payment-options`, `extension-options`, `/report`). Lo que el front calcula es **de presentación**: lo que se ve
antes de confirmar. Y tiene que dar lo mismo que el backend.

- **Aritmética en centavos enteros.** `toCents` (privada) convierte el string a centavos; `sumMoney`,
  `subtractMoney`, `minMoney` y `compareMoney` operan sobre eso. `compareMoney` existe para no comparar con
  `Number(a) > Number(b)` ni comparar strings (`"1000000"` y `"1000000.00"` son el mismo monto).
- **`multiplyMoney(precio, cantidad)` en `bigint`.** Desde que hay cantidades fraccionarias (gramos, metros), la
  versión en centavos *float* daba `"1101.10.000000000014552"` para 1.001 × 1,1 y `formatCOP` tumbaba la pantalla
  de venta entera. Ahora la cantidad se escala a entero, se multiplica en `bigint` (un precio de nueve cifras por
  mil gramos pasa de 2^53) y se redondea con **la misma regla del backend**: `ROUND_HALF_UP`, el empate lejos de
  cero. Si redondeara distinto, el subtotal que ve el cajero no sería el que cobra el recibo.
- **`percentOfMoney(valor, pct)`, nunca `multiplyMoney(valor, pct / 100)`**: `0.4` no es exacto en binario y el
  residuo corrompía el monto impreso. Va en puntos básicos enteros. Sirve para mostrar el cupo del LTV; quien
  decide si el préstamo se pasa es el backend.
- **La coma decimal se acepta.** En Colombia "10,5" gramos es lo natural y el teclado numérico del celular ofrece
  coma; el backend (`Decimal`) solo acepta punto y respondía 422. `normalizeDecimalInput` traduce la coma en los
  campos decimales libres (pesos, cantidades). Rechazarla nunca fue una decisión: era un descuido que, sumado a un
  422 invisible, hacía que "Crear contrato" no hiciera nada.
- **`<MoneyInput>`** enmascara con puntos de miles mientras se escribe y emite siempre el string canónico. Guarda
  distinto de lo que muestra (`"1000000.00"` vs `1.000.000`). Tres reglas que salieron de errores reales:
  - **Lo pegado se lee entero con `parseMoneyText`**: el último separador seguido de 1 o 2 dígitos es decimal
    (`$ 1.234.567,00` y `$1,234,567.00` dan lo mismo) y los centavos se redondean al peso. Antes, quitar todo lo
    que no fuera dígito convertía el formato en que Excel y la banca copian una cifra en un monto cien veces
    mayor. Tope de 12 dígitos (`MAX_MONEY_DIGITS`): más no es un monto, es un error de pegado. Lo tecleado sigue
    siendo solo dígitos (borrar el último de «1.234» deja «1.23», que no es un decimal).
  - **Cero inicial vacío**: un campo obligatorio en cero se muestra vacío con placeholder «0», y enfocar
    selecciona todo. Con el «0» escrito, el cursor antes del cero convertía 500.000 en 5.000.000.
  - **`optional`**: el campo que puede quedar sin dato emite `''` al borrarse (el llamador manda `null`), no
    `"0.00"`. Tocar y borrar el avalúo decía que la prenda valía cero; el conteo de apertura, que se contaron $0.
    En un opcional, «0» escrito a propósito sigue siendo un dato.

### Fechas (`lib/dates.ts`)

Toda fecha se muestra, interpreta y envía en la **zona de la empresa** (`me.company.timezone`, por defecto
`America/Bogota`), la misma con la que el backend calcula "hoy". `todayBogota()` para toda lógica de "hoy";
`formatDate` / `formatDateTime` («30/09/2026», «30/09/2026 1:31 p. m.») para los timestamps; las fechas sin hora
(vencimientos, `session_date`) se muestran tal cual, sin pasar por `Date`, para no correrse un día por UTC.
**La hora se escribe como en Colombia** («1:31 p. m.», `formatTime` = `formatClock`; una hora de reloj sin fecha,
como una franja de contacto, con `formatHourOfDay`): el `h:mm a` de date-fns sin locale daba «1:31 PM» (issue #16).
Los porcentajes, con `formatPercent` (`lib/percent.ts`: «5,00 %»; `'auto'` sin ceros de relleno). Nadie formatea a
mano: `tests/formatos-es-co.test.ts` barre `src/` y falla con un «%» pegado o una hora en inglés.
Prohibido `new Date().toISOString().slice(0, 10)`, `toLocaleDateString()` sin zona o `dayjs()` pelado: el backend
ya sufrió una ventana de cinco horas diarias (7 p. m.–medianoche) con "hoy" = mañana.

### Cuenta y medio de pago

El **medio** dice cómo se cobró; la **cuenta**, dónde quedó la plata (modelo en `backend-starter/docs/DOMINIO.md`
§4.1). Los dos selectores van juntos en cada punto de cobro. `AccountPicker` filtra por el tipo que implica el
medio y preselecciona la cuenta que el backend elegiría si no se mandara `account_id`; esa correspondencia vive
en `lib/accounts/types.ts` con test, porque si se desincroniza la pantalla muestra un destino y la plata cae en
otro. Sin `accounts.view` el selector no se muestra y la operación sigue.

### Paginación

Las listas usan `{items, next_cursor}`: `useCursorInfiniteQuery` + `<DataTable>` con "Cargar más". No hay
paginación por número de página: no inventarla. `fetchAllPages` trae todo para agregaciones y exportaciones, con
un tope defensivo de páginas. **Nunca corta en silencio** (issue #11): si al tope todavía hay `next_cursor`, lanza
`PageLimitError` (`isPageLimitError`), y quien la llama lo dice («hay más de N registros, acorta el rango») en vez
de mostrar un total parcial como completo: Reportes en la sección y en el Excel, los exportes en un toast.

**Un listado con orden elegible lleva el orden en la llave de la consulta** (`useContractsList(status, sort)`): el
cursor del backend codifica el orden, y uno emitido con otro `sort` da 400. Con el orden en la llave, cambiarlo es
otra consulta que arranca sin cursor; reusar las páginas cargadas mandaría el cursor ajeno.

## 8. Seguridad

- **Claves**: solo la anon/publishable de Supabase vive en el front (es pública por diseño; lo que protege es RLS
  y el backend). La `service_role` jamás: todo lo que empieza con `VITE_` queda embebido en el JavaScript público.
- **XSS**: CSP estricta, cero `dangerouslySetInnerHTML`, React escapa por defecto. Los tokens de sesión los guarda
  supabase-js en `localStorage`.
- **CSP partido en dos** (`vite.config.ts`): `vercel.json` es estático y Vercel lo lee antes del build, así que no
  puede interpolar la URL del backend de cada ambiente. El plugin `inject-csp` arma en el build un `<meta>` con
  `connect-src`/`img-src` desde `VITE_API_URL` y `VITE_SUPABASE_URL` (**el build falla a propósito si faltan**);
  `vercel.json` conserva lo que solo vale como header (`frame-ancestors`, `base-uri`, `form-action`), más HSTS,
  `nosniff`, `Referrer-Policy` y `Permissions-Policy`. El header no declara `default-src`: si lo hiciera, bloquearía
  el backend a pesar del meta. El único script en línea (el anti-parpadeo del tema en `index.html`) va por su hash
  SHA-256, calculado en cada build: editarlo cambia el hash solo, pero su fallo no deja error de JS.
- **Fuentes** con `@fontsource-variable`, nunca de Google Fonts: el CSP solo permite `font-src 'self' data:`.
- **Habeas Data (Ley 1581)**: fotos de cédulas, prendas y contratos firmados, solo en el bucket privado y solo por
  URL firmada de vida corta (§15). Nunca datos de clientes reales en tests, capturas ni documentos.

## 9. Rutas y layouts

Rutas declaradas a mano en `src/app/router.tsx` (TanStack Router, sin file-based routing). URLs en español.

| Ruta | Qué es |
|---|---|
| `/` | **la landing pública de venta** (`features/landing`): sin `beforeLoad` ni AppShell, la ve cualquiera. Por eso **nada de la app manda a `/`**: la entrada es `/inicio`. La raíz de un producto que se vende le muestra a cualquiera qué es, incluido el dueño que lo presenta con la sesión abierta |
| `/auth/login`, `/auth/callback` | AuthLayout, sin sidebar. El layout **no** tiene guard de sesión: `/auth/callback` necesita la sesión que crea el enlace; el guard ("ya entraste") está solo en el login |
| `/cuenta-bloqueada` | suscripción vencida (§4.7) |
| `/baja/$token` | pública, sin sesión: baja de los avisos al cliente por enlace firmado |
| layout `app-layout` | AppShell (sidebar, topbar, `CashSessionBanner`), exige sesión y carga `/me` (§4.5) |
| `/inicio` | dashboard. **La única ruta del shell sin guard de permiso**: es el destino de todos los `redirect`, y gatearla dejaría a alguien sin a dónde ir. Maneja el caso de no tener `reports.view` |
| `/contratos` (+ `/nuevo`, `/importar`, `/$contractId`), `/clientes` (+ `/$customerId`), `/catalogos`, `/proveedores/$supplierId`, `/inventario` (+ `/ingresos/nuevo`, `/transformaciones/nueva`), `/ventas` (+ `/nueva`), `/caja`, `/cuentas`, `/capital`, `/identidad`, `/auditoria`, `/reportes`, `/configuracion` (+ `/documentos`, `/notificaciones`), `/perfil` | módulos, cada uno con su guard (§5) |
| `/platform` | PlatformLayout, solo super-admin; banda superior de otro color para no confundir el contexto |

- **Después del login, `postLoginTarget`** (`features/auth/postLoginTarget.ts`) decide el destino: el `redirect`
  del search si es una ruta interna; `/inicio` si no hay, si es la raíz o si apunta afuera (`//otro-sitio`: el
  search lo escribe cualquiera). El callback de invitación va directo a `APP_HOME` (`/inicio`).
- Los filtros de inventario viven en la URL (schema Zod en el router): sobreviven a F5, se pueden compartir y
  «atrás» vuelve al filtro anterior.
- **Code-splitting por ruta** (issue #7): cada pantalla de la app entra con `lazyRouteComponent`; en el bundle
  inicial quedan solo las de entrada (landing, login, callback, baja) y el shell. El JS inicial bajó de 1.950 kB
  (538 gzip) a 928 kB (277 gzip), medido con `npm run build`. Una pantalla nueva se declara igual. Con
  `defaultPreload: 'intent'` el chunk baja al pasar por el enlace, y si tras un deploy ya no existe (pestaña vieja),
  `lazyRouteComponent` recarga la página una vez. El editor de plantillas (Tiptap) y `xlsx` van aparte desde antes.

## 10. Tests

Vitest + Testing Library sobre jsdom (`tests/setup.ts` simula `matchMedia`). Las llamadas a la API se simulan con
`vi.mock` de los módulos de `api.ts` o del cliente; no hay MSW. Cifras de la suite: `backend-starter/docs/ESTADO.md`.

- **Unidad**: `money.ts`, `dates.ts` (con el instante del bug de las 7 p. m. como caso fijo), reglas de
  formularios, agregaciones de reportes, árbol de categorías, requisitos de plantillas, contraste de tokens.
- **Contrato de códigos de error** (`tests/error-codes-*.test.ts`): cada sobre está **copiado de la línea del
  backend que lo emite**, con la cita al lado, y se afirma sobre el `code`, nunca sobre el status: un test que mira
  el status no cubre nada de lo que aquí se rompe. `void-sale-cash-session.test.tsx` cubre la otra mitad: que la UI
  reaccione al código (diálogo de caja, no toast).
- **Fixtures de respuestas reales** (`tests/fixtures/backend-*.json`): capturadas envolviendo el `TestClient` de los
  tests de integración del backend, con el commit y la fecha en `_origen`. **No se editan a mano**: se regeneran.
  Un fixture escrito de memoria no falla, bendice: confirma el bug en vez de encontrarlo (`max_ltv_pct` llega como
  `"30.00"`, no como número). Y un fixture al que le falta un permiso deja un invariante sin probar.
- **Un test no prueba nada hasta verlo fallar sin el arreglo.**
- **Componentes**: los flujos que mueven plata (abono, cierre con descuadre, venta POS, Enter que no cobra, pegar
  montos, caja cerrada).
- **Sin E2E versionada.** Lo que se entrega se verifica en vivo, contra el bundle servido, con Playwright y el
  Chrome del sistema (`channel: 'chrome'`); los scripts viven en `backend-starter/scripts/qa/ui_*.js`.
- **CI** (`.github/workflows/ci.yml`, en cada push a `dev`/`main` y en cada PR): `npm ci --legacy-peer-deps`, lint,
  typecheck, tests y build; y un job aparte, `gen:api:check`, que falla si `src/types/api.ts` no coincide con el
  `/openapi.json` del backend (detecta un cambio de contrato antes del deploy).
- **Los tests no leen el `.env`**: `vite.config.ts` fija `test.env` (`VITE_API_URL`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`) a dominios `.invalid`. En CI no hay `.env`: sin esto `src/lib/auth/supabase.ts`
  revienta al importarse ("supabaseUrl is required") y 27 archivos de test fallaban al cargar, mientras en local
  pasaban solo porque el `.env` apunta a dev (la CI estuvo roja por eso hasta el 30/09/2026).
- El **build** de la CI necesita `VITE_API_URL` y `VITE_SUPABASE_URL` (el plugin del CSP aborta sin ellas): toma
  `vars.VITE_*` del repo si existen y, si no, el API de dev y un Supabase de relleno. Solo verifica que compila; lo
  servido lo construye Vercel con sus variables.
- `tests/label-catalogs.test.ts` compara contra el código de `../backend-starter/`; en CI ese repo no está y sus 5
  casos se saltan. Corren en local.
- El job de drift descarga de `vars.VITE_API_URL` o, si no está definida, de `https://api-dev.prendo.com.co`.
  Compara contra el backend de dev **desplegado**: tras desplegar un cambio de contrato en el backend, el siguiente
  push del front falla hasta regenerar y commitear `api.ts` — es su trabajo.

## 11. Entornos y despliegue

- **Vercel deduce el ambiente de la rama.** La Production Branch del proyecto de dev es **`dev`**: cada push a `dev`
  actualiza `dev.prendo.com.co`. `vercel.json` (`git.deploymentEnabled`) solo deja desplegar `dev` y `main`; otra
  rama no genera builds.
- **Las `VITE_*` se hornean en el build** (`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`): cambiar
  una en el dashboard sin redesplegar no hace nada, y el dashboard muestra el valor nuevo. El CSP sale de las
  mismas variables (§8).
- SPA fallback: `vercel.json` reescribe toda ruta a `/index.html` salvo los assets.
- **Caché**: `/assets/*` (todo con hash en el nombre) va con caché de un año e `immutable`; el `index.html` no, así
  que un deploy se ve en la siguiente carga. Las cabeceras de seguridad aplican a todas las rutas, assets incluidos
  (Vercel suma todas las reglas que coinciden).
- **Nunca** poner las URLs viejas (`*.fly.dev`, `*.vercel.app`) en un `.env`: el CSP de la app servida bloquea la
  API vieja.
- Cómo se despliega, cómo se reemplaza una `VITE_*` sin dejar un hueco, cómo verificar el bundle servido, Site URL
  y Redirect URLs de Supabase, HSTS y dominios: `backend-starter/docs/OPERACION.md` §2 y §4. Montar el front de
  producción (proyecto de Vercel separado, Production Branch `main`): `backend-starter/docs/PRODUCCION.md` §4.
- **Si el cambio toca los dos repos, el backend se despliega primero**: el front genera sus tipos del backend
  desplegado.

## 12. Formularios

- **React Hook Form + Zod para la forma** (requeridos, rangos, formato); la validación de **negocio** es del
  backend y llega como `VALIDATION_ERROR` o un código propio. Las reglas de forma que el backend exige con 422
  (monto mayor que cero, máximo de decimales, textos no vacíos) están una sola vez en `lib/forms/rules.ts`, para
  que el error aparezca junto al campo antes de enviar sin tener seis versiones de "mayor a cero". No todos los
  formularios tienen schema de Zod: varios diálogos validan a mano; al escribir sobre un formulario, leer cuál es.
- **`applyServerErrors(error, setError, { fields })`** pinta un 422 junto a cada campo. **`fields` es
  obligatorio**: la lista de campos que ese formulario *pinta* (con `*` por índice de lista, `items.*.weight_grams`).
  Todo lo que el servidor señale fuera de esa lista va al banner. Devolver `null` es prometer "el usuario ya lo está
  viendo", y se rompió dos veces: primero leía `details.errors` como objeto cuando el backend manda una lista, y
  **todo 422 de la app era invisible**; después marcaba campos que el formulario no dibujaba. Si un formulario deja
  de pintar un campo y nadie actualiza la lista, el error sale duplicado en el banner, nunca desaparece. Traduce el
  `msg` de Pydantic por `type`, que es estable (`decimal_parsing` → "Escribe un número…").
- **`revealFirstError`** lleva a la vista el error que impide enviar (el más arriba en el documento): con el
  botón al final de un formulario largo, el único mensaje quedaba 800 px arriba y "el botón no hacía nada". Es
  **el único que mueve el foco**: el formulario que lo usa crea `useForm` con `shouldFocusError: false`, porque
  React Hook Form enfoca su propio primer error después de `onInvalid` y lo pisaba (issue #5: «Nuevo contrato»
  vacío enfocaba la tasa y no el cliente). Encuentra el campo por `id`, por `name` o, en un select de Radix (un
  botón sin `name`), por `data-field` con el nombre del campo de RHF; al trigger se le pasa además `field.ref`.
- **`preventImplicitSubmit` en el `<form>` de todo formulario de dinero: Enter no registra plata.** HTML envía el
  formulario con Enter en cualquier input; en el punto de venta, buscar un código y pulsar Enter cobró el carrito
  armado (y un lector de código de barras manda Enter tras cada lectura). Una operación de dinero se registra solo
  con su botón explícito. Va en el `<form>` y no en cada campo porque el eslabón débil es el campo que alguien
  agregue mañana. No toca `<textarea>` ni botones, y un campo que ya decidió qué hace Enter (el buscador agrega el
  artículo) lo resuelve antes.
- **Un campo nuevo es `Input`/`Textarea` con `FieldError`** (`components/ui/input.tsx`), no otra copia de
  `inputClass`: el enlace del error con `aria-describedby` y el `label` por `id` salen de ahí (DESIGN_SYSTEM §4.10).
  Ya no queda ninguna copia en `features/` ni en `components/shared/` (`input-shared.test.tsx` lo vigila). Los
  campos compuestos siguen la misma regla con su prop `invalid` y su `id`: `MoneyInput`, `SearchInput`, `DatePicker`
  y, en un `SelectTrigger` de Radix, `invalidFieldProps(id, invalid)`. Un buscador compuesto sin input propio
  (`CustomerPicker`, `ItemPicker`, `AccountPicker`) recibe el `id` para que su `label` lo nombre.
- Los CTA de dinero muestran el monto dentro del botón (`DESIGN_SYSTEM.md` §4).

## 13. Tipos desde OpenAPI

`src/types/api.ts` se genera con `npm run gen:api` (`scripts/gen-api.mjs`, `openapi-typescript`) desde el
`/openapi.json` del backend. **Un tipo escrito a mano desde la suposición es una mentira que el compilador
defiende**: si un shape no cuadra, se regenera; jamás se corrige el tipo. Los comentarios que trae `api.ts` son los
docstrings del backend: pueden citar documentos retirados, y se corrigen allá, no aquí.

- **De dónde lee**: si existe `./openapi.json` en la raíz del repo (está en `.gitignore`), usa ese; si no, descarga
  `$VITE_API_URL/openapi.json` (`.env` se carga solo). O sea, por defecto **el backend de dev desplegado**, que puede
  no tener todavía lo que acabas de escribir en el backend.
- **Contra el backend local sin desplegar**: en `backend-starter/`,
  `PYTHONPATH=. .venv/bin/python scripts/export_openapi.py ../frontend-starter/openapi.json` (no levanta
  servidor ni toca la base), y después `npm run gen:api` aquí. Borrar ese
  `openapi.json` al terminar: mientras exista, `gen:api` y `gen:api:check` lo prefieren al de dev.
- `npm run gen:api:check` compara sin escribir; es el job de drift de la CI.

## 14. Impresión y plantillas

El backend no genera PDFs (decisión: `backend-starter/docs/DOMINIO.md` §13). Contrato, paz y salvo, comprobante de
venta y acta de caja se imprimen desde el navegador, en hoja carta, con `PrintLayout` y las piezas de
`PrintBlocks` (`DESIGN_SYSTEM.md` §3). `PrintLayout` se monta en un portal y `globals.css` oculta todo lo demás al
imprimir. El papel usa solo los tokens `--paper-*`: no tiene modo oscuro.

**Plantillas por empresa** (`/configuracion/documentos`, editor Tiptap en `components/shared/documentTemplate`,
cargado aparte): cada empresa puede escribir su contrato y su paz y salvo.

- **`lib/documents/mergeFields.ts`** es el catálogo único de campos por tipo de documento: lo que se puede insertar
  en el editor y lo que se sabe resolver son la misma lista, así que no pueden divergir. Incluye
  `contrato.fecha_original`, `contrato.fecha_recargo` y `contrato.monto_recargo` para los contratos que nacen de
  un recargo.
- **`lib/documents/templateRequirements.ts`** espeja la regla del backend para que una plantilla pueda quedar
  activa: no vacía y, en un contrato, con nombre del cliente, tabla de prendas y firma del cliente (el paz y salvo
  solo pide no estar vacío). El editor avisa **antes** con las palabras del editor; el backend rechaza igual
  (`TEMPLATE_IS_EMPTY`, `TEMPLATE_MISSING_REQUIRED_FIELDS`, con las claves en `details.missing`). Si el backend
  cambia la regla, se cambia aquí.
- **Los bloques atómicos se insertan con `insertBlock`** (`lib/documents/insertBlock.ts`): deja el cursor en un
  párrafo después del bloque. Con `insertContent` a secas el bloque queda seleccionado como nodo y el siguiente que
  se inserte lo reemplaza (la firma borraba la tabla de prendas recién puesta).
- **Formato de fábrica como respaldo**: sin plantilla activa, o con una activa que no imprimiría nada, el contrato
  sale con el JSX de siempre (`ContractPrintView`), que es código y no una fila sembrada en la base. La firma de la
  empresa, si está cargada, se estampa sola. El formato de fábrica y la plantilla de arranque del editor
  (`startingTemplates.ts`) traen la **cláusula de autorización de avisos** antes de las firmas.
- **Medir la paginación, no suponerla.** Lo que se parte entre hojas solo se ve en un PDF real: se renderiza el
  documento (el DOM que produce `TemplateRenderer`, volcado desde un test) con el CSS del build, Chrome lo imprime
  (Playwright, `page.pdf`) y PDFKit de macOS lista el texto de cada hoja. Así se revisó la issue #13 (01/10/2026):
  con plantillas de 3 a 5 hojas, en los tres formatos, con y sin tabla de prendas, la firma quedó siempre después
  del párrafo que la precede, y solo pasó a la hoja siguiente cuando no cabía (necesita ≈ 145 pt: margen, espacio
  de firma y rótulo). No se reprodujo; no se cambió el CSS.
- **Leyenda de las dos fechas**: un contrato que nace de un recargo conserva la fecha del original (el ciclo de
  interés no se mueve) y se firma el día del recargo. Sin explicarlo, el papel queda antedatado: es un problema
  legal. Por eso `ExtensionDatesNotice` se imprime **fuera de la plantilla**, en los dos caminos: una plantilla
  propia no la puede quitar.

## 15. Storage y fotos

- **Un bucket privado, `company-files`**, con RLS por empresa: el primer segmento de la ruta es el `company_id`
  (`{company_id}/{carpeta}/{uuid}.webp`); lo demás organiza por entidad. Toda lectura por **URL firmada de 5
  minutos** (`useSignedPhotoUrl`), nunca una URL pública. `PhotoUploader` comprime en el navegador a WebP antes de
  subir, lo que además quita el EXIF (con el GPS).
- **Se borra al guardar, no al tocar la X** (`lib/storage/detachedPhotos.ts`). Borrar al quitar la foto dejaba,
  tras un Cancelar, la ficha apuntando a un archivo inexistente: foto rota en la ficha y en el impreso, y la
  evidencia (una cédula) perdida. El registro guardado es el único que sabe si una foto dejó de usarse. Y se borra
  solo lo que vive en la carpeta de **esa** entidad: el remate copia a inventario las fotos del contrato, la
  ampliación las copia al contrato sucesor y un lote muestra las de su producto; quitarla de uno solo la
  desvincula. El borrado es best-effort: si falla, queda un huérfano que no rompe nada.
- **Foto de perfil en `perfil/{user_id}/`**: cada usuario escribe solo su carpeta (política de Storage del
  backend, migración 00065); la ruta vieja sin el id la política nueva la rechaza con 403.
- Qué carpeta puede tocar cada permiso lo decide la RLS del bucket: `backend-starter/docs/ARQUITECTURA.md` §8.

## 16. Tailwind y los documentos del repo

**Tailwind v4 escanea todo el repo, incluidos los `.md` y los `.html` de `docs/`** (no hay `@source` que lo acote en
`globals.css`). Un nombre de clase escrito en un documento **se emite de verdad en el CSS del bundle**: el ejemplo
con el hex del teal viejo que había en `CLAUDE.md` vivía como CSS muerto en el bundle desplegado del 20/09/2026.
Regla: **en la documentación no se escribe la sintaxis real de una clase de Tailwind** (y menos una con valor
arbitrario); se nombra el token (`--brand-700`) o el color semántico (`brand`, `primary`) en prosa.

En el código: **las clases de estado son estáticas, nunca interpoladas.** El escáner busca nombres de clase
literales; una clase armada en runtime con un template string no genera CSS y el badge sale sin estilo. Por eso
`StatusBadge` tiene un mapa estado → clase completa. Recharts sí puede recibir `var(--status-active)` como
atributo SVG: no pasa por el escáner. Y que el código referencie un plugin no significa que esté instalado:
comprobarlo en `package.json`.
