# Pendientes de frontend — auditoría de UX en vivo (27/08/2026)

> Documento de traspaso, mismo criterio que `PENDIENTES_BACKEND_INFRA.md`: no es una queja, es la lista concreta de 11 puntos que Mateo reportó tras usar la app en vivo, cada uno con archivo/línea real y diagnóstico verificado — no suposiciones. Investigado con tres agentes de exploración en paralelo (loading/overflow, navegación, tema/export/rendimiento), sin tocar código.
>
> **Resueltos el mismo día (9 de 11):** 1, 1b, 2, 3, 4, 5, 6, 9, 10 — son 9 puntos en 8 números porque el 1 se dividió en dos hallazgos. **11 (rendimiento) parcialmente resuelto** el mismo día en una segunda ronda, que de paso cerró también el hueco de `?customer_id=` en `GET /contracts` (`docs/PENDIENTES_BACKEND_INFRA.md` #2) — ver abajo. Quedan abiertos: 7 (tema oscuro), 8 (exportar a Excel).

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

---

## 2. ✅ Resuelto (27/08/2026) — Historial de proveedores no llevaba al detalle de la compra

El obstáculo era de arquitectura, no técnico: `catalogs` no puede importar internals de `inventory` (CLAUDE.md regla 3). `EntryDetailDialog` vivía en `features/inventory/components/`, y `useEntry`/`usePayEntry` en `features/inventory/api.ts` sin usarse desde ningún lado (código muerto).

**Fix, mismo movimiento que ya se hizo una vez con `SaleReceiptDialog`:** `EntryDetailDialog` promovido a `components/shared/`, `useEntry`/`usePayEntry` promovidos a `lib/inventory/entries.ts`. `SupplierDetailPage.tsx` ahora pide el ingreso por id al hacer clic en una fila del historial y abre el mismo diálogo que usa Inventario.

**Bonus incluido en el mismo fix:** la pestaña "Compras" de cada producto (`ProductRow.tsx`) tenía el mismo hueco (sin `onRowClick`) — se conectó al mismo `useEntry`/`EntryDetailDialog` compartido.

---

## 9. ✅ Resuelto (27/08/2026) — faltaba una forma consistente de "volver"

Solo 3 de 13 pantallas de detalle tenían link de volver (cliente, contrato, proveedor), y ni siquiera consistente entre ellas (proveedor usaba `Button+navigate`, las otras dos `Link`). Los 5 formularios de creación de página completa (nuevo contrato, registrar contrato existente, nuevo ingreso, nueva transformación, nueva venta) no tenían ni back-link ni botón visible para salir.

**Fix:** `BackLink` nuevo en `components/shared/` — reemplaza las 3 implementaciones a mano y se agregó a los 5 formularios que no tenían nada.

---

## 10. ✅ Resuelto (27/08/2026) — faltaba un botón "Cancelar"

El patrón bueno (`AccountFormDialog`/`SettleAccountDialog`/`TransferDialog`, `features/accounts/`) ya existía en un solo módulo. Se replicó en los siete diálogos de creación que no lo tenían: cliente, proveedor, categoría, gasto, abrir caja, invitar usuario, rol.

**`SaleFormPage` y `TransformationFormPage`** (los dos sin ningún resguardo, ni siquiera indirecto) ganaron `useBlocker` + el mismo diálogo de confirmación "¿Descartar…?" que ya tenían `ContractFormPage`/`ContractImportPage`/`EntryFormPage` — como `BackLink` es una navegación normal, el blocker la intercepta igual que al sidebar o "atrás", así que no hizo falta un botón "Cancelar" aparte en esos 5: la salida ya pide confirmar si hay algo sin guardar.

---

## 7. Tema oscuro/claro

**Abierto — es una feature nueva, no un ajuste.** El terreno está preparado a propósito (`tokens.css:82-85`: bloque `[data-theme='dark'] {}` vacío, con el comentario "la estructura ya lo permite... no es requisito hoy"; Tailwind ya tiene el variant `dark:` cableado en `globals.css:8`; varios componentes shadcn ya traen clases `dark:*` de fábrica sin usar) pero no hay ni una sola variable redefinida, ni `ThemeProvider`, ni toggle, ni persistencia en `localStorage`. `docs/DESIGN_SYSTEM.md:80` ya lo advierte explícitamente.

**Tamaño real:** ~20-25 de las 46 variables de `tokens.css` son candidatas de color a redefinir (la parte chica). Lo que falta de verdad es la infraestructura completa: el estado del tema, el toggle, la persistencia — cero de eso existe hoy. Positivo: no hay hex sueltos fuera de `tokens.css` en `features`/`components/shared` (la regla 4 de CLAUDE.md se cumple), así que activar un tema oscuro no se rompe por sorpresas fuera del sistema de diseño.

---

## 8. Exportar inventario (y otros listados) a Excel

**Abierto — feature nueva desde cero.** Cero mecanismo de exportación en todo el repo, cero librería (`xlsx`/`papaparse`/similar) en `package.json`. Lo que sí ayuda: `fetchAllPages()` (`lib/api/pagination.ts:48-58`) ya resuelve la parte difícil — traer un listado completo de una sola vez en vez de por páginas — y ya se usa así en Reportes. Falta: agregar una librería y el botón por pantalla que dispare `fetchAllPages` sobre el `queryFn` que ya existe.

**Ojo con el tope:** `fetchAllPages` corta en `maxPages=50` × `limit≤200` = 10.000 filas, en silencio. Para inventario debería alcanzar en la mayoría de los casos, pero si una empresa tiene un histórico más grande, el export se cortaría sin avisar — vale la pena decidir si eso amerita un aviso o subir el tope antes de lanzarlo.

---

## 11. Velocidad de respuesta lenta

**5 causas concretas identificadas; 3 de las 5 ya resueltas (27/08/2026, segunda y tercera ronda).**

1. **✅ Resuelto — requests N+1**, en 3 componentes: `SaleReceiptDialog`, `ReturnFormDialog` (uno por línea de venta/devolución) y `ContractDetailPage` (uno por prenda rematada). Una venta de 8 líneas disparaba 8 requests en paralelo solo para abrir el comprobante. Backend: `GET /inventory/items?ids=` nuevo (aditivo, mismo endpoint/permiso/`ItemOut`, repetible — `?ids=a&ids=b`). Frontend: `useItemsByIds()` (`lib/inventory/items.ts`) reemplaza los `useItem` por línea con una sola consulta que devuelve un `Map`.
2. **✅ Resuelto en parte — historial de contratos del cliente.** `GET /contracts` ya acepta `?customer_id=` (backend, sin migración — mismo patrón que `?customer_id=` de `GET /sales`, resuelto 19/08). `useCustomerContracts` (`features/customers/history.ts`) ya no trae 200 contratos para filtrar client-side. Reportes queda abierto: `fetchAllPages` sobre ventas + artículos, hasta 5.000 de cada uno, es un problema distinto (agregación completa para KPIs, no un filtro por id).
3. **Abierto, menor.** Cascada: `ContractDetailPage` pide el contrato y recién cuando ese responde pide el cliente (`enabled: !!contract?.customer_id`) — inherente a la forma del dato (no se puede saber el cliente sin conocer antes el contrato), así que no es tan barato de evitar como parece; impacto bajo (un salto adicional, no N).
4. **✅ Resuelto — sin `staleTime` global.** `QueryClient` tenía el default de TanStack Query (`0`: todo obsoleto al instante), así que `refetchOnWindowFocus: true` (a propósito, "app operativa") reejecutaba TODO lo montado en cada alt-tab. Ahora `staleTime: 15_000` — sigue siendo "casi al instante" para una app operativa (ya se acepta hasta 60s de desfase en permisos vía `/me`), y absorbe el caso real: revisar un mensaje y volver a la pestaña.
5. **Abierto — el más grande.** Bundle de 1.7MB en un solo archivo, cero code-splitting por ruta (`router.tsx` tiene 38 imports estáticos, ningún `.lazy.tsx`, sin `manualChunks` en `vite.config.ts`). Las 12 features completas se descargan de una sola vez en el primer load. Deliberadamente no se tocó hoy: requiere reestructurar cómo se definen las rutas (TanStack Router código-based, no file-based) y agregar `Suspense`/fallbacks consistentes con el patrón de `RouteTransitionBar` ya existente — el riesgo de reintroducir pantallas en blanco a medio terminar es real, mejor como su propia tanda de trabajo.
