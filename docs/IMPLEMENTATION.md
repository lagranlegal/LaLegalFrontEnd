# Estado de implementación

> Registro vivo de qué existe en el código, cómo está armado y por qué se tomó cada decisión — para que cualquiera (humano o Claude Code) pueda retomar el proyecto sin releer todo el historial de commits. Se actualiza en cada paso del "Orden de implementación" de `CLAUDE.md`. No repite lo que ya está en `ARCHITECTURE.md`/`DESIGN_SYSTEM.md` (el qué-debería-ser); esto es el qué-hay-hoy y las decisiones concretas tomadas al construirlo.

## Paso 6 — Cashbox completo (completo)

Sesión diaria (abrir/cerrar/reabrir), gastos, cierre con vista previa del desglose módulo×concepto×medio desde `/report`, justificación obligatoria de descuadre sin tolerancia, histórico de cierres con rango de fechas, y acta imprimible. Primeros consumidores reales de `DatePicker`, `DateRangePicker` y `PrintLayout` (los tres documentados en `DESIGN_SYSTEM.md` desde el paso 1 pero nunca construidos hasta que hizo falta). Probado de punta a punta contra dev: abrir → gasto → cerrar con descuadre real → histórico → acta → imprimir → reabrir — cada paso con datos reales, no mockeados.

### Estructura nueva

```
src/
  components/
    ui/calendar.tsx, popover.tsx        # shadcn — base de DatePicker/DateRangePicker
    shared/
      DatePicker.tsx                      # calendario único, fecha simple
      DateRangePicker.tsx                    # variante de rango + presets (Hoy/Ayer/Esta semana/Este mes)
      PrintLayout.tsx                          # hoja carta imprimible — primer consumidor real
  lib/
    dates.ts                                    # sin cambios de superficie, ya tenía todo lo necesario
    money.ts                                      # + subtractMoney (diferencia de cierre, con signo)
    modules.ts                                      # MODULE_LABELS + CONCEPT_LABELS (nuevo)
  features/cashbox/
    api.ts                                            # sesión, gastos, cierre, reapertura, histórico
    components/
      ExpenseFormDialog.tsx                               # + categoría nueva inline
      SessionReportPanel.tsx                                # desglose — compartido entre cierre y acta
      CloseSessionDialog.tsx                                  # vista previa + contar + justificar
      ClosingActDialog.tsx                                      # acta on-screen + bloque imprimible hermano
    pages/CashboxPage.tsx                                         # /caja
```

### Decisiones y hallazgos

**Bug real de React encontrado en navegador: dos diálogos hermanos con la MISMA `key` literal.** `ExpenseFormDialog` y `CloseSessionDialog` están siempre montados en `CashboxPage` (patrón ya establecido: `key={nonce}` para forzar remount limpio en cada apertura, pasos 4/5). Cada uno tenía su propio `useState(0)` para el nonce — pero como **ambos empiezan en `0`** y son elementos hermanos dentro del mismo fragment retornado por `CashboxPage`, React los vio como dos hijos con `key={0}` compitiendo por la misma identidad y tiró "Encountered two children with the same key" en consola. No es un problema de Radix ni de `AppDialog` (se descartó con bisección real: deshabilitar cualquiera de los dos por separado hacía desaparecer el warning; con los tres diálogos de la página juntos — `OpenSessionDialog` sin key, `ExpenseFormDialog`, `CloseSessionDialog` — solo la combinación con AMBOS nonces en 0 lo disparaba). Arreglado con keys namespaced: `` key={`expense-${nonce}`} ``/`` key={`close-${nonce}`} ``. **Nunca antes había pasado** porque ninguna pantalla previa tenía dos diálogos-siempre-montados como hermanos directos a la vez (los dos de `CatalogsPage` viven en tabs distintas, solo una montada por vez). Revisar este patrón si una futura pantalla junta 2+ diálogos con nonce — usar SIEMPRE un prefijo por diálogo, nunca un contador pelado.

**Bug real de datos: `GET /cashbox/sessions?limit=1` no da la sesión más reciente — da la más VIEJA.** El endpoint pagina en orden ascendente (típico de paginación por cursor estable). El primer intento de "¿la caja de hoy ya se cerró, para ofrecer 'Reabrir'?" usaba exactamente ese `limit=1` asumiendo que traía la última — confirmado el bug en navegador (con dos sesiones ya cerradas, `items[0]` era la del día anterior, no la de hoy) antes de escribir nada más encima. Se reemplazó por `useTodayClosing()`, que reusa `GET /reports/closings` con `from_date=to_date=hoy` — no depende de ningún orden, solo filtra.

**Bug real de consistencia: after cerrar/reabrir, `invalidateQueries(['cashbox','current'])` mostraba el estado VIEJO varios segundos.** El cierre respondía `200` pero el siguiente `GET /cashbox/sessions/current` (disparado por la invalidación) seguía devolviendo la sesión como abierta — un hueco de consistencia eventual en el backend de dev entre "la escritura ya respondió" y "la próxima lectura ya la refleja" (visto en navegador: cerrar caja, la tarjeta de sesión seguía mostrando "Caja abierta" con los botones de siempre, mientras el histórico — que sí llegó por otra vía — ya mostraba el cierre nuevo). Como la respuesta de `close`/`open`/`reopen` YA trae el estado correcto (o implica `null` para el caso de cierre), se dejó de confiar en el refetch para ese query puntual: `queryClient.setQueryData(['cashbox','current'], ...)` con el dato conocido, y la invalidación de `['cashbox','current']` se sacó a propósito de `invalidateAfterSessionChange` (si se dejara, el refetch de fondo podía pisar el valor recién puesto con uno desactualizado). El resto de queries (histórico, gastos, dashboard) sí se invalidan normal — su peor caso es tardar unos segundos en reflejar el cambio, no mostrar un estado contradictorio en la pantalla principal.

**Sin `Idempotency-Key` en ninguna mutación de cashbox** (abrir/cerrar/reabrir sesión, crear gasto) — confirmado en `src/types/api.ts`: ninguno de esos `operations[...]` acepta ese header (a diferencia de contratos/pagos/ventas). No es una omisión del front: literalmente no hay dónde mandarlo. `useMoneyMutation` no se usa acá por esta razón — mutaciones planas con `isPending` deshabilitando el botón, que es la única protección contra doble-submit que el front puede dar sin cooperación del backend.

**`ConfirmDialog`/`confirm()` con `requireReason: true` (construido en el paso 5) resultó ser exactamente lo que pedía "Reabrir caja"** — cero código nuevo de UI para el modal, solo pasar `reasonLabel: 'Motivo de la reapertura'`. Confirmado en navegador: el botón de confirmar queda deshabilitado hasta escribir el motivo.

**`subtractMoney` (`lib/money.ts`) es la primera función de dinero de este módulo que puede dar NEGATIVO** — `expected_cash` de una sesión con más desembolsos que ingresos en efectivo YA sale negativo del backend (visto en datos reales: `-$827.500`), y la diferencia (`counted - expected`) puede ir para cualquier lado. `toCents`/`centsToDecimal` se extendieron para preservar signo (antes `sumMoney` solo sumaba valores no-negativos, capital extra de abonos). `formatCOP` ya sabía mostrar negativos sin cambios (`Intl.NumberFormat` lo hace solo).

**`CONCEPT_LABELS` (`lib/modules.ts`) traduce `BreakdownLineOut.concept`** — el backend manda el nombre interno del evento (`interest_payment`, `loan_disbursed`, `expense`), no una frase para mostrar. Mapa parcial poblado solo con los valores vistos en pruebas reales contra dev (mismo criterio que `StatusBadge`): un valor no mapeado se muestra tal cual en vez de romper o inventar una traducción.

**El acta imprimible vive FUERA del `AppDialog`, como hermano, no anidada adentro.** `components/ui/dialog.tsx` gana `print:hidden` en `DialogOverlay`/`DialogContent` (regla nueva, aplica a TODOS los diálogos de la app — ningún modal debe aparecer en una hoja impresa). Si `PrintLayout` quedara anidado dentro del `AppDialog` de "Ver acta", el `print:hidden` del ancestro lo taparía también a él (un `display:none` en un ancestro esconde a los hijos sin importar su propio `display`) — confirmado con `page.emulateMedia({media:'print'})` en Playwright: la primera versión (anidada) imprimía una hoja en blanco; sacar `PrintLayout` a hermano del diálogo lo arregló. `AppShell` ya tenía `print:hidden` en sidebar/topbar/`CashSessionBanner` desde este mismo paso — es la primera vez que algo se imprime.

**`DatePicker`/`DateRangePicker` (react-day-picker vía shadcn) se construyeron ahora, primer consumidor real.** Valor controlado siempre `"yyyy-MM-dd"` (o `{from,to}` de esos strings) — nunca `Date` fuera del propio componente. `dateOnlyToLocalDate`/`localDateToDateOnly` se exportan desde `DatePicker.tsx` para que `DateRangePicker` no las duplique. **Bug real de tooling, no de código:** al abrir el calendario por primera vez, React tiraba "Invalid hook call" dentro de `react-day-picker`— no eran copias duplicadas de React (`npm ls react` confirmó una sola, deduped), sino caché de pre-bundling de Vite (`node_modules/.vite`) desactualizada tras instalar el paquete a mitad de sesión. `rm -rf node_modules/.vite` + reiniciar `npm run dev` lo arregló — mismo síntoma y misma solución que un hallazgo parecido en el paso 5b con otra dependencia nueva.

**`cashbox.reopen` es un código de permiso PROPIO, distinto de `cashbox.open_close`** — ambos ya estaban confirmados en el catálogo real observado en el paso 5b, pero el primer intento gateaba "Reabrir caja" con `cashbox.open_close` (el mismo de "Abrir"/"Cerrar") sin darse cuenta de que existía uno más específico. Corregido: `<Can permission="cashbox.reopen">` solo para el botón de reapertura.

### Qué falta (fuera de alcance del paso 6)

- Filtrar el histórico de cierres por responsable — `RECOMENDACIONES.md` lo sugería, pero `GET /reports/closings` no tiene ese query param; solo `from_date`/`to_date`.
- Guard de ruta por permiso en `/caja` — igual que contratos/clientes/catálogos, ninguna ruta de "ver" tiene guard todavía (solo `/contratos/importar`, por ser Admin-only). Revisión sistemática pendiente.
- Reordenar/editar categorías de gasto tras crearlas — la API solo tiene `GET`/`POST` en `/cashbox/expense-categories`, sin `PATCH`.

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (51 tests)
npm run dev   # /caja: abrir, gasto, cerrar con desglose, histórico, acta, imprimir, reabrir
```

## Paso 5 — Contracts (completo)

Crear contrato (varias prendas, categorías nivel 3, snapshot calculado por el backend), detalle con estado y KPIs, abonos **solo** desde `payment-options` (botones con monto exacto, capital extra opcional), historial de abonos, listado con tabs de estado, y "Rematar" para contratos `ready_for_auction`. Primera feature de dinero real: estrena `useMoneyMutation` (idempotencia), `ConfirmDialog`/`confirm()`, `CashSessionRequiredDialog`, toasts (`sonner`) y el card "Listos para remate" del dashboard (diferido desde el paso 3). Probado en navegador real de punta a punta: contrato creado con datos reales (`Empresa Demo Front`), incluyendo un 400 real del backend por configuración incompleta de categoría (ver hallazgos) y su recuperación tras corregirla desde el front mismo.

### Estructura nueva

```
src/
  components/shared/
    ConfirmDialog.tsx / confirmStore.ts   # confirm() imperativo — host único montado en main.tsx
    CashSessionRequiredDialog.tsx           # CASH_SESSION_NOT_OPEN → modal con CTA a abrir caja
  components/ui/
    sonner.tsx                                # toasts — sin next-themes (un solo mecanismo de dark mode)
  lib/
    api/useMoneyMutation.ts                     # Idempotency-Key por acción de usuario (regla 8)
    catalogs/categories.ts                        # useCategories — movido de features/catalogs (ver hallazgos)
    paymentMethods.ts                                # PAYMENT_METHOD_LABELS — un solo mapa, 3 consumidores
    money.ts                                           # + sumMoney() (suma de presentación, centavos enteros)
  features/contracts/
    api.ts                # list/detail/create/update, payment-options, payments, auction, ready-for-auction
    components/
      CustomerPicker.tsx        # buscar-y-elegir cliente (no reusa features/customers — features aisladas)
      PaymentOptionsPanel.tsx     # botones de payment-options + capital extra + confirm()
      ContractEditDialog.tsx        # solo appraisal_value/notes (todo lo demás lo calcula el backend)
    pages/
      ContractsListPage.tsx           # tabs de estado + DataTable
      ContractFormPage.tsx              # página completa (no modal) — useFieldArray + useBlocker
      ContractDetailPage.tsx              # KPIs, prendas, abonos, historial, Rematar
main.tsx                # + <Toaster/> y <ConfirmDialogHost/>
```

### Decisiones y hallazgos

**`useMoneyMutation` (`lib/api/useMoneyMutation.ts`) implementa la regla 8 de CLAUDE.md tal como se documentó como pendiente desde el paso 1.** Genera la `Idempotency-Key` una vez por MONTAJE del hook (no por request) vía `useIdempotencyKey`, y la resetea solo en `onSuccess` — los reintentos de red de una mutación fallida reusan la misma key. Encaja natural con el patrón de remount-por-`key` de los diálogos (paso 4): al reabrir un formulario de dinero con una `key` nueva, el hook se remonta y genera una key nueva automáticamente, sin coordinación explícita. Testeado (`tests/useMoneyMutation.test.tsx`): la key se mantiene entre un fallo y su reintento, y cambia después de un éxito.

**`ConfirmDialog`/`confirm()` es imperativo sobre un store de Zustand (`confirmStore.ts`), no un componente que cada feature monta.** `await confirm({title, tone:'danger', ...})` resuelve una promesa (`{confirmed, reason?}`) sin que el caller renderice ningún JSX de diálogo — un solo `<ConfirmDialogHost/>` vive en `main.tsx` (mismo patrón que `<Toaster/>`). Se necesitaba ya para "Rematar" (confirmación con consecuencia explícita, `DESIGN_SYSTEM.md` §4.4) y para registrar abonos; se construyó como lo describe `DESIGN_SYSTEM.md` §3, no una versión reducida.

**`sonner` se agregó vía `npx shadcn add sonner`, y se le quitó la dependencia a `next-themes` que trae por defecto.** El preset generado usa `useTheme()` de `next-themes` para decidir claro/oscuro: el proyecto ya decidió en el paso 1 tener **un solo mecanismo de dark mode** (`[data-theme='dark']`, sin toggle todavía) — agregar `next-themes` habría sido una segunda fuente de verdad conviviendo con la primera. Se dejó `theme="system"` en `<Toaster/>` (sigue `prefers-color-scheme` por su cuenta, sin JS) y se desinstaló el paquete.

**Categorías (`useCategories`) se movieron de `features/catalogs/api.ts` a `lib/catalogs/categories.ts`.** `contracts` necesita leer categorías (nivel 3, para clasificar prendas) y `features aisladas` (CLAUDE.md regla 3) prohíbe que una feature importe internals de otra — igual que `lib/auth/me.ts` no vive en `features/auth` porque más de un consumidor lo necesita. `catalogs/api.ts` conserva el CRUD (exclusivo de esa feature); la lectura compartida vive en `lib/`. `inventory` (paso 7) va a necesitar lo mismo.

**`useCustomerSearch`/`useCustomer` en `features/contracts/api.ts` NO reusan `features/customers/api.ts`** — mismo principio de aislamiento. Son 3-6 líneas sobre el `api` central cada uno, no lógica de negocio duplicada (la regla que prohíbe duplicar vive en el backend, esto es solo el hook de React Query).

**Bug real encontrado en navegador: `useCustomer(contract?.customer_id ?? '')` disparaba un request real a `/api/v1/customers/` (sin id) mientras `contract` todavía cargaba.** El backend redirige ese path (307) a la colección, y esa respuesta de redirect no trae `Access-Control-Allow-Origin` — el navegador la bloquea por CORS y aparece como error de consola. Se arregló con `enabled: customerId.length > 0` en el hook, evitando el request mientras no hay un id real. No era un problema del backend (nunca debió pedirse ese id vacío); confirmado corrigiendo y viendo la consola limpia después.

**Bug real de mobile encontrado en este paso, pero preexistente desde el paso 2: el drawer del sidebar en mobile no se cerraba al navegar.** Un `<Link>` dentro del drawer solo cambiaba de ruta; el overlay (`fixed inset-0 z-50`) seguía montado encima del contenido nuevo, bloqueando todo click hasta cerrarlo a mano. Se encontró porque la prueba de contratos en 360px se quedaba "atascada" tras navegar desde el menú. Arreglado con un `onNavigate` opcional en `SidebarContent` que cierra el drawer (`setMobileDrawerOpen(false)`) — pasado solo desde el render del drawer, sin efecto en el sidebar de escritorio.

**Hallazgo real de negocio, no un bug: el backend rechaza `POST /contracts` con `BAD_REQUEST` ("La categoría no tiene plazo/ventana de mora por defecto configurados.") si la categoría de una prenda no tiene `default_term_months`/`arrears_window_months`.** `CategoryFormDialog` (paso 4) no exponía esos campos — se agregaron ahí (`default_term_months`, `arrears_window_months`, `max_ltv_pct`, los tres opcionales, ya estaban en `CategoryCreateIn`/`CategoryUpdateIn` sin usar) porque sin ellos **ninguna categoría nivel 3 sirve para crear un contrato** — no es una mejora futura, es un gap real del formulario de catálogos que este paso necesitaba cerrar para poder probarse. Confirmado end-to-end: se editó "Anillos de oro" con esos 3 campos desde el front y el mismo contrato que había fallado con 400 se creó con 201 al reintentar.

**`ContractItemOut.status` trae valores que `StatusBadge` no conocía (`in_custody`, visto en la prenda de un contrato recién creado).** Se agregó al mapa central (`STATUS_LABELS`/`STATUS_CLASSES`) — "En custodia", tono `status-active`. Es la misma regla del paso 3: el mapa se completa según lo que la API realmente manda, no se adivina de antemano; otros valores de este campo que no se han visto todavía (ej. tras un remate o una devolución) se agregan cuando aparezcan.

**`PaymentOptionsPanel` no se pudo probar con opciones reales (abono efectivo) — un contrato recién creado no tiene meses adeudados todavía** (`interest_paid_until` = `start_date` = hoy), así que `payment-options` devuelve una lista vacía y el panel muestra correctamente "Este contrato no tiene abonos disponibles en este momento." (el estado vacío SÍ se probó). Probar un abono real requeriría un contrato con al menos un mes vencido, no fabricable rápido en dev. El código sigue el mismo patrón ya probado en esta sesión (`MoneyInput`, `Select`, `confirm()`, `useMoneyMutation`) — revisado pero no ejercitado con datos reales; queda anotado para la próxima vez que haya un contrato en mora real en dev.

**"Rematar" tampoco se probó con datos reales** por la misma razón (ningún contrato llega a `ready_for_auction` en minutos) — el botón, el gate por permiso (`contracts.auction`, el único código de este paso ya confirmado por `ARCHITECTURE.md` §5, a diferencia de `contracts.create`/`contracts.payment` que son inferidos por convención igual que en el paso 4) y el `confirm()` con tono `danger` están implementados pero sin ejercitar contra el backend.

**`ContractFormPage` es una página completa, no un `AppDialog`** — a diferencia de clientes/categorías/proveedores. `DESIGN_SYSTEM.md` §4.6 distingue "borradores largos (contrato, ingreso multi-línea)" como caso aparte que "avisan antes de descartar cambios"; un formulario con N prendas dinámicas no cabe cómodo en un modal `sm/md/lg`. Se usa `useBlocker` de TanStack Router (`shouldBlockFn` + `enableBeforeUnload`) en vez del patrón de confirmación del navegador nativo, con un `submittedRef` para no bloquear la navegación que dispara el propio submit exitoso.

**Rutas de contratos son hermanas directas de `appLayoutRoute`, no anidadas bajo `contractsRoute`.** El primer intento anidó `contractNewRoute`/`contractDetailRoute` como hijas de `contractsRoute` (`/contratos` → `/contratos/nuevo`, `/contratos/$contractId`) pensando en agrupar por prefijo de URL — pero TanStack Router exige un `<Outlet/>` en el componente padre para que los hijos rendericen, y `ContractsListPage` no tiene uno (ni debería: la lista y el detalle/formulario son pantallas independientes, no un layout compartido). Confirmado en navegador: con el anidamiento, `/contratos/nuevo` renderizaba el listado de contratos, no el formulario. Se corrigió poniendo las tres rutas como hermanas bajo `appLayoutRoute`, igual que `dashboardRoute`/`customersRoute`/`catalogsRoute`.

**`useParams` en `ContractDetailPage` usa `from: '/app-layout/contratos/$contractId'`, con el prefijo `app-layout`, mientras que `Link`/`navigate({to:...})` en el resto del feature usan `'/contratos/$contractId'` sin prefijo.** Mismo gotcha ya documentado en el paso 2 para `useSearch`: `appLayoutRoute` es pathless (`id: 'app-layout'`, no `path`) para no afectar la URL real — pero el `id` de sus rutas hijas para el sistema de tipos de TanStack SÍ hereda ese prefijo, mientras que el `fullPath` (lo que de verdad usa el navegador) no. `to`/`navigate` tipan contra `fullPath`; `from` en hooks como `useParams`/`useSearch` tipa contra `id`. Es la primera vez que una ruta hija de `appLayoutRoute` necesita `useParams`, así que es la primera vez que este detalle se vuelve visible en código (antes solo estaba anotado como riesgo).

### Qué falta (fuera de alcance del paso 5)

- Fotos de prendas (`ContractItemIn.photos`) — esperan a `PhotoUploader`, que llega con `inventory` (paso 7, mismo criterio que el resto de `components/shared`: se construye con su primer consumidor real).
- Probar "Rematar" contra un contrato real en `ready_for_auction` — no se pudo fabricar ese estado en minutos contra dev en su momento; sigue pendiente (ver paso 5b para lo que sí se resolvió: `PaymentOptionsPanel` con opciones reales).
- Acta/comprobante imprimible de contrato (`PrintLayout`) — mientras el backend no genere PDFs; no es parte del alcance textual del paso 5 en `CLAUDE.md`.

**Actualización del paso 5b (ver abajo):** `contracts.payment` (el código que este paso usaba para gatear `PaymentOptionsPanel`) resultó estar mal — el real es `payments.create`, confirmado y corregido en el paso 5b. `contracts.create`/`contracts.auction`/`contracts.edit` sí se confirmaron correctos contra el catálogo real observado.

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (41 tests)
npm run dev   # /contratos: listado con tabs, + Nuevo contrato, detalle con abonos/historial
```

## Paso 5b — Import de contratos preexistentes (completo)

Pantalla "Registrar contrato existente" (`POST /api/v1/contracts/import`) para migrar un contrato de empeño vivo del sistema anterior de la compraventa con su saldo real — la foto financiera al corte, no el historial de abonos. Gateada por `contracts.import` (confirmado por el backend, Admin-only), con guard de ruta además de ocultar el botón (primera ruta del front con permission-gate real). Sin paso de caja ni medio de pago: no desembolsa dinero. Documentado a fondo antes de construirse en `docs/RECOMENDACIONES.md` §1.6 (ver también ahí el porqué de negocio completo) — este es el registro de qué se construyó y qué se encontró al hacerlo.

### Estructura nueva

```
src/
  components/
    ui/calendar.tsx, popover.tsx          # shadcn — base de DatePicker (react-day-picker)
    shared/
      DatePicker.tsx                        # EL calendario único — primer consumidor real
      LegacyCodeBadge.tsx                     # pill neutra para legacy_code (no es un StatusBadge)
  lib/
    dates.ts                                  # + addMonthsToDateOnly (aritmética pura, sin Date)
  features/contracts/
    contractItemSchema.ts                       # schema/tipo/helpers de "prendas" — compartido
    api.ts                                        # + useImportContract
    components/ContractItemsFields.tsx              # sección "Prendas" — extraída, genérica sobre RHF
    pages/ContractImportPage.tsx                      # "Registrar contrato existente"
```

### Decisiones y hallazgos

**`DatePicker` (react-day-picker vía shadcn) se construyó ahora porque es su primer consumidor real** (`start_date` del import) — mismo criterio que todo `components/shared` en este proyecto. Valor controlado siempre `"yyyy-MM-dd"` (nunca `Date` fuera del componente), locale `es`, semana empieza lunes — verificado en navegador ("agosto 2026", "lu ma mi ju vi sá do"). **Bug real encontrado y arreglado:** al abrirlo por primera vez, React tiraba "Invalid hook call" dentro de `react-day-picker`/`useMemo` — no era un problema de versiones duplicadas de React (`npm ls react` confirmó una sola copia, 19.2.8, deduped en todo el árbol), sino caché de pre-bundling de Vite desactualizada tras instalar `react-day-picker` a mitad de sesión. Se resolvió borrando `node_modules/.vite` y reiniciando `npm run dev` — si vuelve a pasar después de instalar una dependencia nueva, ese es el primer paso, no perseguir un bug de código que no existe.

**`interest_paid_until` NO se pide con un segundo date picker — se deriva de "meses de interés ya cubiertos" + `addMonthsToDateOnly`.** El backend puede rechazar la combinación con `422 IMPORT_DATES_MISALIGNED` si no cae en un múltiplo entero de meses desde `start_date`; en vez de validar eso después del submit, el form hace la combinación inválida imposible de construir (sugerencia textual del propio documento de la nota técnica, `docs/RECOMENDACIONES.md` §1.6). `addMonthsToDateOnly` (`lib/dates.ts`) hace aritmética pura de año/mes/día — nunca pasa por `Date`, mismo cuidado que `formatDate`, con recorte al último día válido del mes de destino (31 ene + 1 mes → 28/29 feb, no marzo). Testeado (`tests/dates.test.ts`): cruce de año, recorte de fin de mes, año bisiesto.

**`ContractItemsFields` se extrajo de `ContractFormPage`** (antes tenía la sección "Prendas" inline) **porque `ContractImportPage` necesitaba exactamente lo mismo** — mismo array `ContractItemIn`, misma UI. Genérico sobre `TFieldValues extends FieldValues & { items: ContractItemFormValue[] }`; el único obstáculo real fue tipar `useFieldArray({ name: 'items' })` — `FieldPath<TFieldValues>` no alcanza, hace falta `ArrayPath<TFieldValues>` específicamente (son tipos distintos en `react-hook-form`, el error de TS apuntaba a esto pero con un mensaje larguísimo de tipos condicionales). El resto de los `name` (`items.${index}.campo`) sí funcionan con `FieldPath` normal.

**`useImportContract` usa `useMoneyMutation` solo por la `Idempotency-Key`, con `invalidateKeys: [['contracts'], ['dashboard']]` — sin `['cashbox','current']`,** tal como quedó anotado en `ARCHITECTURE.md` §3 antes de escribir código: este endpoint no desembolsa, no mueve caja. No hace falta manejar `CASH_SESSION_NOT_OPEN` en este formulario (nunca debería llegar).

**Verificado en navegador de punta a punta contra dev, con hallazgos reales más allá del propio import:**
- Un contrato importado con `start_date`/`interest_paid_until` que ya implican mora salió con `status: "in_arrears"` calculado por el backend desde la primera respuesta, exactamente como documenta `RECOMENDACIONES.md` §1.6 — sin que el front infiriera nada.
- **Esto permitió probar por primera vez `PaymentOptionsPanel` con opciones reales** (quedó pendiente en el paso 5 por no poder fabricar un contrato en mora en minutos): se registró un abono real de punta a punta (botón → confirm() → `useCreatePayment` → recibo #1 → `interest_paid_until` avanzado un mes → opciones de pago recalculadas). Todo el código de abonos escrito en el paso 5 funciona correctamente.
- **Bug real de permisos encontrado gracias a que esta prueba expuso por primera vez el catálogo real de `/me.permissions`:** `PaymentOptionsPanel` gateaba con `contracts.payment` (inferido por convención en el paso 5) — el código real es `payments.create`. Corregido. De paso se confirmó que `contracts.create`/`contracts.auction` sí estaban bien, y se descubrió `contracts.edit` (no usado hasta ahora) — ahora gatea el botón "Editar" del detalle de contrato, que en el paso 5 había quedado sin gate. Detalle completo del catálogo observado: `ARCHITECTURE.md` §5.
- Reintentar el mismo `legacy_code` devuelve `409 CONTRACT_LEGACY_CODE_EXISTS` tal como documenta la nota técnica; el front lo mapea al campo `legacy_code` del form (`"Ya existe un contrato con ese código."`), no a un banner genérico.

### Qué falta (fuera de alcance del paso 5b)

- Búsqueda por `legacy_code` en el listado de contratos — bloqueado en el backend: `GET /contracts` solo filtra por `status`/`cursor`/`limit`, sin `q`. Documentado como dependencia en `RECOMENDACIONES.md` §1.6.
- Guard de ruta por `contracts.view`/`customers.view` en el resto de rutas de contratos/clientes — existen en el catálogo real pero ninguna ruta los usa todavía; es una revisión sistemática de permission-gating, no específica de este paso.
- `DateRangePicker` (variante de rango de `DatePicker`) — este paso solo necesitó fecha única; el rango llega con el histórico de cierres de caja (paso 6).

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (47 tests)
npm run dev   # /contratos/importar — gateado por contracts.import
```

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
