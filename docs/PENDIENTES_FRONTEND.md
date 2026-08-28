# Pendientes de frontend — auditoría de UX en vivo (27/08/2026)

> Documento de traspaso, mismo criterio que `PENDIENTES_BACKEND_INFRA.md`: no es una queja, es la lista concreta de 11 puntos que Mateo reportó tras usar la app en vivo, cada uno con archivo/línea real y diagnóstico verificado — no suposiciones. Investigado con tres agentes de exploración en paralelo (loading/overflow, navegación, tema/export/rendimiento), sin tocar código.
>
> **Resueltos los 11 puntos** (27/08/2026, mismo día) — 1, 1b, 2, 3, 4, 5, 6, 7, 8, 9, 10 son 11 puntos en 10 números porque el 1 se dividió en dos hallazgos. **11 (rendimiento) parcialmente resuelto**, que de paso cerró también el hueco de `?customer_id=` en `GET /contracts` (`docs/PENDIENTES_BACKEND_INFRA.md` #2) — ver abajo. **8 (Excel) resuelto por completo:** Inventario, Contratos, Ventas y Reportes.

---

## 1-5. Loading states — dos causas raíz explicaban cinco síntomas

**✅ Resuelto en su mayoría (27/08/2026).** Lo que parecían cinco problemas sueltos (modal de Transformación, Kardex, Cuentas, Reportes/Contabilidad) tenían una sola causa: `globals.css` define `--color-muted: var(--bg-app)` — **la misma variable que `--color-background`**. Cualquier skeleton pintado con `bg-muted` (con cualquier opacidad) queda del mismo color que el fondo sobre el que se dibuja: no está ausente, está invisible. Confirmado con `grep`: 20 sitios en todo el repo tenían este patrón, no solo los 4 que Mateo alcanzó a notar. Incluso `TableSkeleton` —el componente construido específicamente para este problema, según su propio comentario— tenía el mismo bug adentro.

**Por qué no se tocó el token global:** `bg-muted` se usa en 33 sitios más para cosas legítimas y ya visibles a propósito (inputs deshabilitados, badges, hover de botones outline/ghost, resaltado de rango del calendario, paneles de resumen). Cambiar `--color-muted` habría sido un cambio visual mucho más grande y riesgoso que el pedido. El fix real: en cada uno de los ~20 sitios donde el skeleton usa `bg-muted`, reemplazarlo por `bg-border` — el mismo gris que ya usaban los tres skeletons que sí se veían bien (`CustomerDetailSkeleton`, `DataTable`'s skeleton, el resumen de arriba de `ReportesPage`).

Archivos tocados: `TableSkeleton.tsx`, `AccountsPage.tsx`, `AccountStatementDialog.tsx`, `CompanyDetailDialog.tsx`, `ClosingActDialog.tsx`, `KardexDialog.tsx`, `TransformationDetailDialog.tsx`, `EntryFormPage.tsx`, `InventoryPage.tsx`, `ContablesSection.tsx`, `ReportesPage.tsx` (×3), `SettingsPage.tsx`, `AccountPicker.tsx`.

De paso, `TransformationDetailDialog` y `KardexDialog` pasaron del bloque plano de altura fija a `TableSkeleton` (con forma de tabla) — el contenido real de ambos es una tabla, y un bloque sin forma no comunica qué va a llegar.

### 1b. ✅ Resuelto (27/08/2026) — el formulario de Transformación no tenía NINGÚN estado de carga

`TransformationFormPage.tsx` (`/inventario/transformaciones/nueva`) pedía categorías con `useCategories()` pero nunca leía `isPending`/`isLoading` — no era un problema de color, el estado de carga **no existía**: los tres `Select` de categoría se renderizaban de inmediato, con apariencia interactiva normal, pero vacíos por dentro hasta que la data llegaba. El primer `Select` ("Categoría") ahora se deshabilita con placeholder "Cargando…" mientras `categoriesPending` es verdadero — los otros dos ya dependían de éste (`disabled={!cat1_id}`), así que quedan cubiertos en cascada.

---

## 6. Modal que hace overflow y no se ve correctamente

**✅ Resuelto (27/08/2026).** `DialogContent` (`src/components/ui/dialog.tsx`, la base de los 33 modales de la app vía `AppDialog`) solo limitaba el **ancho** — la altura era 100% la del contenido, y como el modal se centra con `top-1/2 -translate-y-1/2`, contenido que crecía más que el viewport empujaba el título y los botones fuera de la pantalla, sin ninguna barra de scroll. Un solo modal en todo el repo (`PermissionsMatrixDialog`) lo resolvía por su cuenta con `max-h-[55vh] overflow-y-auto` en su propio contenido.

Candidatos que hoy podían desbordar: `CompanyDetailDialog` (historial de suscripción con "Ver más"), `KardexDialog`/`TransformationDetailDialog`/`AccountStatementDialog` (tablas de largo variable), `ExitFormDialog`/`ReturnFormDialog` (líneas que crecen con la interacción).

**Fix aplicado en la base, no en cada modal:** `DialogContent` ahora trae `max-h-[90vh] overflow-y-auto` — todo diálogo de la app queda automáticamente contenido dentro del viewport con scroll disponible. Nota de diseño: como el contenido (header + cuerpo + footer) scrollea como un solo bloque, el botón X puede quedar fuera de vista si se scrollea mucho hacia abajo — se puede seguir cerrando con Esc o clic afuera. Una versión más pulida (header/footer fijos, solo el cuerpo con scroll) es posible más adelante si hace falta, pero no era necesaria para resolver el bug reportado (contenido/botones inalcanzables).

**Segundo hallazgo, reportado en vivo el mismo día — "el modal de Kardex se ve raro, necesita scroll horizontal":** el bug real no era falta de scroll horizontal (`KardexDialog` ya lo tenía, `overflow-x-auto` en el wrapper de la tabla desde que se construyó) — era que `AppDialog` solo ofrecía hasta `size="lg"` (`sm:max-w-lg`, **512px**), y una tabla de 7 columnas (fecha, movimiento, lote, cantidad, costo unitario, saldo, costo del saldo) con montos y fechas no entra ahí ni de cerca: el scroll horizontal estaba siempre activo, mostrando 2-3 columnas a la vez en vez de ser el respiradero para pantallas angostas que debería ser. Mismo problema, en menor grado, en cualquier otro diálogo con tabla que también usa `size="lg"` (`TransformationDetailDialog`, `AccountStatementDialog`, `EntryDetailDialog`). **Fix:** `AppDialog` gana `size="xl"` (`sm:max-w-3xl`, 768px) — `KardexDialog` es el único que lo usa por ahora (era el caso reportado y el de más columnas); los otros tres quedan en `lg` porque su contenido cabe razonablemente ahí, pero el tamaño ya existe si hace falta.

---

## 2. ✅ Resuelto (27/08/2026) — Historial de proveedores no llevaba al detalle de la compra

El obstáculo era de arquitectura, no técnico: `catalogs` no puede importar internals de `inventory` (CLAUDE.md regla 3). `EntryDetailDialog` vivía en `features/inventory/components/`, y `useEntry`/`usePayEntry` en `features/inventory/api.ts` sin usarse desde ningún lado (código muerto).

**Fix, mismo movimiento que ya se hizo una vez con `SaleReceiptDialog`:** `EntryDetailDialog` promovido a `components/shared/`, `useEntry`/`usePayEntry` promovidos a `lib/inventory/entries.ts`. `SupplierDetailPage.tsx` ahora pide el ingreso por id al hacer clic en una fila del historial y abre el mismo diálogo que usa Inventario.

**Bonus incluido en el mismo fix:** la pestaña "Compras" de cada producto (`ProductRow.tsx`) tenía el mismo hueco (sin `onRowClick`) — se conectó al mismo `useEntry`/`EntryDetailDialog` compartido.

**Segundo hallazgo, reportado en vivo el mismo día — "se queda cargando, y al rato se abre el modal":** `SupplierDetailPage`/`ProductRow` esperaban a que `useEntry(id)` resolviera ANTES de renderizar `EntryDetailDialog` (`{viewingEntry && (...)}`) — entre el click y la respuesta no había ningún indicio visual de que algo estaba pasando, así que el click se sentía como que no había hecho nada. `InventoryPage` no tenía este bug porque ahí el `Entry` completo ya viene embebido en la fila del listado (sin fetch aparte). Mismo principio ya aprendido antes con el router (ver "Principios que se ganaron a los golpes" en `ESTADO.md`): si la app no muestra que está trabajando, para el usuario está rota. **Fix:** `EntryDetailDialog` ahora acepta `entry: Entry | undefined` + `isPending`/`isError`/`onRetry` opcionales y maneja su propio skeleton (mismo patrón que `KardexDialog`) — el diálogo abre AL INSTANTE del click (`open={!!viewingEntryId}`, ya no `open={!!viewingEntry}`) y muestra su propio loading mientras el dato llega. `InventoryPage` no necesitó cambios (su `Entry` siempre está listo).

---

## 9. ✅ Resuelto (27/08/2026) — faltaba una forma consistente de "volver"

Solo 3 de 13 pantallas de detalle tenían link de volver (cliente, contrato, proveedor), y ni siquiera consistente entre ellas (proveedor usaba `Button+navigate`, las otras dos `Link`). Los 5 formularios de creación de página completa (nuevo contrato, registrar contrato existente, nuevo ingreso, nueva transformación, nueva venta) no tenían ni back-link ni botón visible para salir.

**Fix:** `BackLink` nuevo en `components/shared/` — reemplaza las 3 implementaciones a mano y se agregó a los 5 formularios que no tenían nada.

---

## 10. ✅ Resuelto (27/08/2026) — faltaba un botón "Cancelar"

El patrón bueno (`AccountFormDialog`/`SettleAccountDialog`/`TransferDialog`, `features/accounts/`) ya existía en un solo módulo. Se replicó en los siete diálogos de creación que no lo tenían: cliente, proveedor, categoría, gasto, abrir caja, invitar usuario, rol.

**`SaleFormPage` y `TransformationFormPage`** (los dos sin ningún resguardo, ni siquiera indirecto) ganaron `useBlocker` + el mismo diálogo de confirmación "¿Descartar…?" que ya tenían `ContractFormPage`/`ContractImportPage`/`EntryFormPage` — como `BackLink` es una navegación normal, el blocker la intercepta igual que al sidebar o "atrás", así que no hizo falta un botón "Cancelar" aparte en esos 5: la salida ya pide confirmar si hay algo sin guardar.

---

## 7. ✅ Resuelto (27/08/2026) — Tema oscuro/claro

**Patrón estándar: Claro / Oscuro / Sistema, por dispositivo (no por cuenta).** Es lo que hacen Linear/GitHub/Notion/Vercel — una preferencia de PANTALLA, no un dato de negocio, así que vive en `localStorage` del navegador, no en el backend (tampoco existe `PATCH /me` todavía para guardar algo así por cuenta). Default: "Sistema" — respeta `prefers-color-scheme` del SO desde el primer arranque, sin que el usuario tenga que elegir nada.

**Sin parpadeo (FOUC):** `index.html` aplica el atributo `data-theme="dark"` al `<html>` con un script inline SINCRÓNICO, antes de que React monte y antes del primer pintado — la misma lógica se repite en `src/app/store.ts::applyThemeToDocument` para cuando el usuario cambia el tema o el SO cambia de preferencia con la app ya abierta (listener de `matchMedia`, solo activo mientras la preferencia sea "Sistema").

**Bug real encontrado y corregido en el camino:** la CSP de producción (`vite.config.ts::cspPlugin`, `script-src 'self'` sin `unsafe-inline` a propósito) bloqueaba ese script inline EN SILENCIO — sin error de JS, solo un log de CSP en la consola del navegador. Confirmado en vivo: `localStorage` guardaba `'dark'` correctamente pero `data-theme` nunca se aplicaba al recargar, porque el script que lo hace nunca llegaba a ejecutarse. No se veía en `npm run dev` porque `cspPlugin` es `apply: 'build'` — solo corre en el build real, así que el bug era invisible en local y solo aparecía en Vercel. Fix: `cspPlugin` calcula el hash SHA-256 exacto del contenido del script y lo agrega a `script-src` (no `'unsafe-inline'`, que habilitaría cualquier inline, no solo el nuestro) — si el script cambia, el hash se recalcula solo en el próximo build.

**Piezas:**
- `src/styles/tokens.css` — bloque `[data-theme='dark']` (antes vacío) con ~25 variables redefinidas: superficies invertidas (`--bg-surface` un punto más claro que `--bg-app`, patrón "superficie elevada"), pares soft+fuerte con roles invertidos (`--brand-50`/`--brand-700`, `--success`/`--success-soft`, etc.), `--platform` más oscura que `--bg-app` a propósito (sigue siendo "otro lugar" para el panel super-admin), sombras con más opacidad (una sombra oscura sobre fondo oscuro es invisible). Cero componentes tocados — todo lo que ya usaba `bg-background`/`text-muted-foreground`/`var(--chart-N)` se adaptó solo.
- `src/app/store.ts` — `theme: 'light'|'dark'|'system'` en el store de Zustand ya existente (mismo criterio que `sidebarCollapsed`), `resolveTheme()` exportado para saber qué color se ve AHORA aunque la preferencia sea "Sistema".
- `src/components/shared/ThemeToggle.tsx` — nuevo, en el topbar de `AppShell` junto al menú de usuario. Ícono del botón = color resuelto (sol/luna); el menú desplegable marca con un check la preferencia elegida (que puede ser "Sistema" aunque ahora se vea oscuro).
- jsdom (tests) no implementa `matchMedia` — se agregó un guard defensivo en `store.ts` (no explota si falta) y un mock en `tests/setup.ts` (para poder testear tema/`usePrefersReducedMotion` en el futuro).

**Verificado en vivo** (Playwright contra dev real, `mateojaras@gmail.com`): Inicio y Reportes completos (KPIs, tabla de desglose, donas, área, barras) en oscuro con buen contraste; persiste tras recargar (`localStorage`); vuelve a claro sin dejar el atributo.

---

## 8. ✅ Resuelto (27/08/2026) — Exportar a Excel

**Pestaña "Lotes" de Inventario, con los filtros activos aplicados.** Botón "Exportar a Excel" nuevo junto a "Limpiar filtros": trae TODOS los artículos que matchean los filtros actuales (`fetchAllItems`, mismo query que arma `useItemsList`, vía `fetchAllPages`) — no solo la página ya cargada en pantalla — y genera un `.xlsx` real (`xlsx`/SheetJS, `lib/export/xlsx.ts`) con Código, Nombre, Categoría, Proveedor, Costo, Precio de venta, Cantidad, Unidad, Estado y Fecha de entrada. Categoría y Proveedor se resuelven a nombre (no se exportan ids sueltos). Verificado en vivo contra dev real: 16 filas, valores correctos.

**`xlsx` no está en npm actualizado** (SheetJS dejó de publicar ahí; la versión de npm tiene 2 CVEs sin parche — prototype pollution y ReDoS, ambos en el lector). Se instaló desde el CDN oficial (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, pineado en `package.json`), 0 vulnerabilidades. Solo se usa el lado de ESCRITURA (`json_to_sheet`/`writeFile`), que no toca el código de parsing donde viven esos CVEs — pero mejor la versión parcheada de todas formas.

**Cargada con `import()` dinámico**, no en el bundle principal: pesa 330KB sin comprimir (108KB gzip) y solo quien exporta lo descarga — el bundle principal (item #11.5, code-splitting por ruta, sigue sin tocarse) no creció ni un byte por esta feature.

**Contratos, agregado el mismo día.** Botón junto a las pestañas de estado en `ContractsListPage`: exporta la pestaña de estado ACTIVA completa (`fetchAllContracts(status)`), con Número, Código anterior, Cliente, Documento, Capital, Saldo, Tasa mensual, Inicio, Vencimiento y Estado (mismo texto que `StatusBadge`, vía `STATUS_LABELS` — ya exportado del componente, no se duplicó el mapa como sí hizo falta para Inventario). "Listos para remate" exporta la lista de `GET /contracts/ready-for-auction` tal cual (no es un `status` real, no pasa por `fetchAllContracts`). El buscador libre de arriba (parche client-side de 200) queda fuera del export a propósito — no es un filtro real del backend, exportarlo daría una falsa sensación de completitud.

**Cliente resuelto a nombre sin `?ids=` en `GET /customers`** (ese filtro no existe todavía, a diferencia de `GET /inventory/items` y ahora `GET /contracts`): `fetchAllCustomers()` (`features/customers/api.ts`) trae TODOS los clientes en una sola tanda de requests — razonable para el tamaño de clientela de una compraventa, pero si la base de clientes crece mucho, un `?ids=` sería más preciso que el mismo movimiento que ya se hizo para artículos.

**Ventas, agregado el mismo día.** Sin filtros en pantalla (`useSalesList()` no acepta ninguno todavía), así que `fetchAllSales()` exporta el universo completo, sin acotar. Columnas: Número, Fecha, Cliente (resuelto vía el mismo `fetchAllCustomers()` de Contratos), Medio de pago, Descuento, Nota crédito redimida, Total, Estado, Motivo de anulación. El estado usa `statusLabel()` (exportado de `StatusBadge`, no una copia) — y con eso se notó que `completed`/`voided` de venta NUNCA estuvieron en `STATUS_LABELS`: hoy en pantalla el badge de una venta ya muestra el código crudo en inglés, no una traducción. No es un bug introducido por el export — ya estaba así — pero quedó documentado como hallazgo, no arreglado (fuera de alcance de "exportar a Excel").

**Reportes, agregado el mismo día — el más distinto de los cuatro.** No es "una fila por registro": es un dashboard agregado, así que no hay nada que pedir con `fetchAllPages` — todo lo que se exporta (`summary`, `incomeStatement`, `ranking`) ya está en memoria, calculado para pintar la pantalla. Por eso el export es sincrónico sobre datos ya cargados, no un fetch nuevo. Genera un `.xlsx` de TRES hojas (`exportSheetsToExcel`, nuevo en `lib/export/xlsx.ts` — `exportRowsToExcel` de una sola hoja ahora es un wrapper de éste): "Resumen" (el Estado de resultados: Ventas, Intereses, Ingresos totales, Costo de mercancía, Utilidad bruta, Gastos operativos, Utilidad), "Desglose" (Módulo × Concepto × Medio × Dirección × Total, mismas filas que la tabla en pantalla) y "Rankings" (Prendas más vendidas + Categorías más movidas en una sola hoja, con columna "Tipo"). Botón junto al `DateRangePicker`, deshabilitado sin rango elegido o sin cierres de caja en el rango — exporta el período y módulo (Todo/Empeño/Tienda) que estén elegidos en ese momento en pantalla.

**Ojo con el tope de `fetchAllPages`** (`maxPages=50` × `limit≤200` = 10.000 filas, corta en silencio) para Contratos/Ventas/`fetchAllCustomers` si el histórico crece mucho — no aplica a Reportes (no usa `fetchAllPages`, todo sale de lo ya cargado en pantalla).

---

## 11. Velocidad de respuesta lenta

**5 causas concretas identificadas; 3 de las 5 ya resueltas (27/08/2026, segunda y tercera ronda).**

1. **✅ Resuelto — requests N+1**, en 3 componentes: `SaleReceiptDialog`, `ReturnFormDialog` (uno por línea de venta/devolución) y `ContractDetailPage` (uno por prenda rematada). Una venta de 8 líneas disparaba 8 requests en paralelo solo para abrir el comprobante. Backend: `GET /inventory/items?ids=` nuevo (aditivo, mismo endpoint/permiso/`ItemOut`, repetible — `?ids=a&ids=b`). Frontend: `useItemsByIds()` (`lib/inventory/items.ts`) reemplaza los `useItem` por línea con una sola consulta que devuelve un `Map`.
2. **✅ Resuelto en parte — historial de contratos del cliente.** `GET /contracts` ya acepta `?customer_id=` (backend, sin migración — mismo patrón que `?customer_id=` de `GET /sales`, resuelto 19/08). `useCustomerContracts` (`features/customers/history.ts`) ya no trae 200 contratos para filtrar client-side. Reportes queda abierto: `fetchAllPages` sobre ventas + artículos, hasta 5.000 de cada uno, es un problema distinto (agregación completa para KPIs, no un filtro por id).
3. **Abierto, menor.** Cascada: `ContractDetailPage` pide el contrato y recién cuando ese responde pide el cliente (`enabled: !!contract?.customer_id`) — inherente a la forma del dato (no se puede saber el cliente sin conocer antes el contrato), así que no es tan barato de evitar como parece; impacto bajo (un salto adicional, no N).
4. **✅ Resuelto — sin `staleTime` global.** `QueryClient` tenía el default de TanStack Query (`0`: todo obsoleto al instante), así que `refetchOnWindowFocus: true` (a propósito, "app operativa") reejecutaba TODO lo montado en cada alt-tab. Ahora `staleTime: 15_000` — sigue siendo "casi al instante" para una app operativa (ya se acepta hasta 60s de desfase en permisos vía `/me`), y absorbe el caso real: revisar un mensaje y volver a la pestaña.
5. **Abierto — el más grande.** Bundle de 1.7MB en un solo archivo, cero code-splitting por ruta (`router.tsx` tiene 38 imports estáticos, ningún `.lazy.tsx`, sin `manualChunks` en `vite.config.ts`). Las 12 features completas se descargan de una sola vez en el primer load. Deliberadamente no se tocó hoy: requiere reestructurar cómo se definen las rutas (TanStack Router código-based, no file-based) y agregar `Suspense`/fallbacks consistentes con el patrón de `RouteTransitionBar` ya existente — el riesgo de reintroducir pantallas en blanco a medio terminar es real, mejor como su propia tanda de trabajo.
