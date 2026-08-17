# CLAUDE.md — Frontend Plataforma SaaS para Compraventas

Guía de implementación para Claude Code. Leer COMPLETO antes de escribir código.
Arquitectura técnica del front: `docs/ARCHITECTURE.md`. Sistema de diseño (referencia visual, tokens, componentes): `docs/DESIGN_SYSTEM.md`. Contrato de la API del backend: `docs/API_GUIDE.md` (copiado del repo backend — el shape exacto siempre sale de `/openapi.json`, ver abajo).

## Qué es este proyecto

Frontend (React SPA) de la plataforma SaaS **multi-tenant** para compraventas (casas de empeño + tienda). El backend (FastAPI en Fly.io + Supabase) **ya está terminado y desplegado en dev**: `https://compraventa-backend-dev.fly.dev`. Este repo consume esa API — no reimplementa ninguna regla de negocio: intereses, estados de contrato, stock, caja y códigos los calcula SIEMPRE el backend; el front muestra, guía y valida forma (no negocio).

- Stack: **Vite + React 18+ + TypeScript estricto**, Tailwind CSS + **shadcn/ui** (Radix), TanStack Query v5, TanStack Router, React Hook Form + Zod, Zustand (estado de UI), Recharts, `supabase-js` (SOLO auth y storage), `openapi-fetch` + tipos generados con `openapi-typescript`.
- Deploy: **Vercel** (SPA, rewrites a `index.html`, headers de seguridad en `vercel.json`).
- Idioma de la UI: **español (Colombia)**. Moneda: **COP con puntos de miles** (`$ 2.664.500`). Zona horaria: **America/Bogota SIEMPRE** (regla dura, ver abajo).

## Reglas de arquitectura (obligatorias)

1. **Tipos desde OpenAPI, nunca a mano:** `npm run gen:api` regenera `src/types/api.ts` desde el `/openapi.json` del backend. Todo request/response usa esos tipos vía `openapi-fetch`. Si un shape no cuadra, se regenera — jamás se "corrige" el tipo a mano.
2. **Una sola puerta a la API:** `src/lib/api/client.ts` es el único lugar que conoce `Authorization`, `Idempotency-Key`, el formato de error `{code, message, details}` y la paginación por cursor. Ninguna feature hace `fetch` directo.
3. **Features aisladas:** `src/features/<modulo>/` (espejo de los módulos del backend). Una feature NO importa internals de otra; lo compartido vive en `src/components/shared/` o `src/lib/`. Igual que la regla de `integration.py` del backend, pero en el front.
4. **Diseño 100% centralizado:** todo color, radio, sombra, espaciado y tipografía sale de `src/styles/tokens.css` (CSS variables) referenciadas por Tailwind. **Prohibido** un color hex, un `rounded-[13px]` o un `text-[#00B19E]` suelto en una feature. Cambiar la marca completa = editar UN archivo. Detalle en `docs/DESIGN_SYSTEM.md`.
5. **Dinero:** el backend manda y recibe strings decimales (`"1000000.00"`). En el front el dinero NUNCA pasa por `parseFloat` para aritmética — se muestra con `lib/money.ts` (`formatCOP`) y se captura con `<MoneyInput>` (máscara con puntos de miles). El front no suma intereses ni saldos: los pide al backend (`payment-options`).
6. **Fechas = zona horaria de la empresa (`/me.company.timezone`, default America/Bogota), sin excepciones:** toda fecha se muestra, interpreta y envía en la zona de la empresa vía `lib/dates.ts` (`todayBogota()`, `formatDate`, `formatDateTime`) — el mismo valor con el que el backend calcula "hoy". **Prohibido** `new Date().toISOString().slice(0,10)`, `toLocaleDateString()` sin tz explícita, o `dayjs()` pelado en una feature. El backend ya sufrió este bug (ventana de 5 horas diarias, 7pm–medianoche) — el front no lo repite.
7. **Permisos en la UI = ocultar, backend = autoridad:** los permisos efectivos vienen de **`GET /api/v1/me`** (llamarlo tras login y en cada recarga, ANTES de renderizar el shell — trae `permissions`, `company.timezone`, `role`, `subscription`, `plan`). `usePermission('modulo.accion')` / `<Can permission="...">` leen de ahí y ocultan botones y rutas, pero todo 403 del backend se maneja igual (la UI oculta, no protege; ante `PERMISSION_DENIED` se invalida `['me']`). Deny-by-default: una pantalla nueva sin gate de permiso es un bug de revisión.
8. **Idempotencia:** toda mutación de dinero (abonos, ventas, contratos) genera **un UUID por acción de usuario** (al abrir el formulario/confirmación, no por request); los reintentos de red reusan el mismo. Lo resuelve el helper `useMoneyMutation` — las features no manejan el header a mano. Botones de dinero: deshabilitados mientras la mutación está en vuelo (sin doble click posible).
9. **Errores por `code`, nunca por `message`:** mapa central en `lib/api/errors.ts` (ver tabla en `docs/ARCHITECTURE.md` §6): `CASH_SESSION_NOT_OPEN` → modal de abrir caja; `SUBSCRIPTION_EXPIRED` → pantalla de bloqueo; `VALIDATION_ERROR` → errores por campo en el form; `LAST_ADMIN_SAFEGUARD` → modal explicativo (no reintentar); 401 → refresh y si falla logout.
10. **Estados de UI completos:** toda vista con datos tiene loading (skeleton), vacío (empty state con CTA), error (con retry) y éxito. Nada de spinners de pantalla completa ni pantallas en blanco.
11. **Nada de optimistic updates en dinero ni stock.** Solo se permiten en UI trivial (renombrar, notas). Tras una mutación: invalidar queries afectadas (contrato + dashboard + caja, etc.).
12. **Seguridad:** ver `docs/ARCHITECTURE.md` §8. Nunca la `service_role` key en este repo (solo la publishable/anon). Sin `dangerouslySetInnerHTML`. CSP estricta en `vercel.json`. Fotos (cédulas, prendas, contratos firmados) SIEMPRE a buckets privados de Supabase Storage con URLs firmadas — nunca públicas (Habeas Data, Ley 1581).

## Autenticación (el backend NO tiene login propio)

`supabase-js` habla directo con Supabase Auth: `signInWithPassword`, refresh automático, `onAuthStateChange`. El `access_token` resultante va como `Bearer` al backend en cada request (lo inyecta el client central). Justo después del login (y en cada recarga): **`GET /api/v1/me`** para hidratar permisos, empresa, timezone, rol y suscripción antes de renderizar (regla 7). Signups públicos desactivados — el alta es SOLO por invitación (correo de Supabase → el usuario crea contraseña → login normal). El JWT trae `company_id` y `role_id` como claims. Super-admin de plataforma = claim `app_metadata.platform_role == "super_admin"` (rutas `/platform` separadas del resto). Flujo completo: `docs/API_GUIDE.md` §2.

## Estructura del proyecto (crear así)

```
src/
  app/                # bootstrap: providers (Query, Router, Auth, Theme), rutas, layouts (AppShell, AuthLayout, PlatformLayout)
  components/
    ui/               # shadcn/ui generado — se themea vía tokens, no se edita el diseño a mano por componente
    shared/           # compuestos reutilizables: DataTable, Money, MoneyInput, DatePicker,
                      # AppDialog + ConfirmDialog, PageHeader, KpiCard, EmptyState, StatusBadge,
                      # PhotoUploader (Storage + compresión), Can, CashSessionBanner
  features/
    auth/             # login, recuperar contraseña, callback de invitación
    dashboard/        # KPIs de /reports/dashboard (pantalla de inicio)
    customers/
    catalogs/         # árbol de categorías (3 niveles) + proveedores
    contracts/        # crear contrato, detalle, abonos vía payment-options, listos para remate, rematar
    cashbox/          # sesión diaria, gastos, cierre con desglose, reapertura, histórico
    inventory/        # ingresos, borradores, publicar (emite código), egresos
    sales/            # venta tipo POS, listado, anulación
    identity/         # usuarios, invitaciones, roles, matriz de permisos
    audit/
    reports/          # histórico de cierres (dashboard vive en features/dashboard)
    platform/         # panel super-admin: empresas, suscripciones, planes
  lib/
    api/              # client.ts (openapi-fetch + auth + errores), errors.ts, pagination.ts, idempotency.ts
    auth/             # supabase client, sesión, claims, guards
    permissions/      # usePermission, catálogo de códigos de permiso
    money.ts          # formatCOP, parseMoneyInput → string decimal para la API
    dates.ts          # BOGOTA_TZ, todayBogota, formatDate, formatDateTime
  styles/
    tokens.css        # ÚNICA fuente de verdad del diseño (ver DESIGN_SYSTEM.md)
    globals.css
  types/
    api.ts            # GENERADO — no editar a mano
tests/  (Vitest + Testing Library + MSW; e2e Playwright aparte)
```

Dentro de cada feature: `api.ts` (hooks de Query/mutations de ese módulo) → `components/` → `pages/`. Sin `services` duplicando al backend: la regla vive allá.

## Orden de implementación (no saltarse pasos)

1. **Fundaciones:** scaffold Vite+TS estricto, Tailwind + `tokens.css` + shadcn init con el tema (DESIGN_SYSTEM.md aplicado desde el día 1), `gen:api`, client central + manejo de errores, CI (lint, `tsc --noEmit`, tests, `gen:api --check` de drift).
2. **Auth + shell:** login, refresh, callback de invitación, bootstrap con `GET /me` (permisos + timezone + empresa), guards de ruta, `usePermission`, AppShell responsive (sidebar colapsable → drawer en mobile), pantalla de bloqueo por suscripción. Con esto, cualquier feature siguiente ya nace protegida.
3. **Dashboard + caja mínima:** `/reports/dashboard` con KPIs + `CashSessionBanner` global (estado de caja visible en toda la app) + abrir sesión. La caja va temprano porque contratos y ventas dependen de ella.
4. **customers + catalogs:** CRUD, búsqueda `?q=`, árbol de categorías (armar desde lista plana con `id`/`parent_id`), letras de código con sus validaciones de 409.
5. **contracts:** crear (varias prendas, categorías nivel 3, snapshot), detalle con estado, **abonos SOLO desde `payment-options`** (botones con montos exactos — jamás un campo libre de interés), historial, listos-para-remate y acción Rematar (lleva a los borradores de inventario creados).
   - **5b. Import de contratos preexistentes** (`POST /contracts/import`, permiso `contracts.import`, confirmado — no inferido): pantalla separada "Registrar contrato existente" para migrar un contrato vivo del sistema anterior de la compraventa con su saldo real (foto financiera al corte, no el historial de abonos). A diferencia de crear un contrato: NO exige caja abierta ni genera movimiento de caja (el préstamo ya se entregó afuera), y tasa/plazo/ventana de mora/prórroga se digitan a mano en vez de salir de la categoría del artículo. Badge de `legacy_code` en lista y detalle de contratos. Contrato de API completo, catálogo de errores (`CONTRACT_LEGACY_CODE_EXISTS`, `IMPORT_CAPITAL_EXCEEDS_PRINCIPAL`, `IMPORT_DATES_MISALIGNED`) y detalle de implementación: `docs/RECOMENDACIONES.md` §1.6. **Ya desplegado en dev y tipado** (`ContractImportIn` sale en `src/types/api.ts` desde el 17/08/2026, confirmado con `gen:api`) — listo para implementarse. Puede hacerse en cualquier momento después del paso 5 sin afectar el orden de los pasos 6-10.
6. **cashbox completo:** gastos, cierre con desglose módulo×concepto×medio (vista previa desde `/report`), justificación obligatoria de descuadre (sin tolerancia), reapertura con motivo, histórico, **acta imprimible (print CSS)** mientras el backend no genera PDFs.
7. **inventory + sales:** ingresos multi-línea, editar borrador, publicar (precio + ≥1 foto, muestra el código emitido), egresos; venta tipo POS (buscar artículo → carrito → medio de pago → vender), anulación con motivo, comprobante imprimible.
8. **identity:** usuarios, invitar, cambiar rol, des/reactivar, roles + matriz de permisos (checkboxes desde `GET /identity/permissions`), manejo explícito de `LAST_ADMIN_SAFEGUARD`.
9. **audit + reports:** log con filtros combinables, histórico de cierres con rango de fechas.
10. **platform:** panel super-admin (crear empresa, suspender, extender suscripción) bajo `require super_admin`, layout propio.

## Definición de Hecho por PR

- `tsc --noEmit` y ESLint limpios; sin `any` nuevos en código de features; tipos regenerados si cambió la API.
- Toda vista nueva: gate de permiso + estados loading/vacío/error + responsive verificado (360px y 1280px).
- Todo dinero formateado con `formatCOP` y toda fecha con `lib/dates.ts` — grep de `toLocaleDateString|parseFloat|toISOString` en el diff como checklist.
- Mutaciones de dinero con `useMoneyMutation` (idempotencia + botón deshabilitado) y sus invalidaciones de Query.
- Componentes nuevos usan tokens (cero hex sueltos) y los compartidos de `components/shared` (un solo modal, un solo calendario, una sola tabla).
- Tests: unidad para `money.ts`/`dates.ts`/mapeo de errores; componente para flujos críticos (abono, cierre, venta) con MSW.

## Variables de entorno (`.env.example` — crearlo)

```
VITE_API_URL=https://compraventa-backend-dev.fly.dev
VITE_SUPABASE_URL=            # proyecto Supabase dev
VITE_SUPABASE_ANON_KEY=       # publishable/anon — la ÚNICA key que existe en este repo
```

## Comandos

```bash
npm run dev                    # Vite dev server
npm run gen:api                # regenera src/types/api.ts desde $VITE_API_URL/openapi.json (o openapi.json local)
npm run lint && npm run typecheck
npm run test                   # Vitest
npm run build && npm run preview
```
