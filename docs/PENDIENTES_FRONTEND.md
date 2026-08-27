# Pendientes de frontend — auditoría de UX en vivo (27/08/2026)

> Documento de traspaso, mismo criterio que `PENDIENTES_BACKEND_INFRA.md`: no es una queja, es la lista concreta de 11 puntos que Mateo reportó tras usar la app en vivo, cada uno con archivo/línea real y diagnóstico verificado — no suposiciones. Investigado con tres agentes de exploración en paralelo (loading/overflow, navegación, tema/export/rendimiento), sin tocar código.
>
> **Resueltos el mismo día (7 de 11):** 1, 1b, 3, 4, 5, 6, 9, 10 — son 8 puntos en 7 números porque el 1 se dividió en dos hallazgos. Quedan abiertos: 2 (proveedor → detalle de compra), 7 (tema oscuro), 8 (exportar a Excel), 11 (rendimiento).

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

## 2. Historial de proveedores → no lleva al detalle de la compra

**Abierto, con la solución ya identificada.** La fila de "Historial de compras" en `SupplierDetailPage.tsx` (líneas 131-145) no tiene `onRowClick` — el clic literalmente no hace nada (compárese con la tabla de "Contratos" en `CustomerDetailPage.tsx:171`, que sí lo tiene). El detalle real de una compra (`EntryDetailDialog`) vive en `features/inventory/components/`, con su fetch por id ya escrito (`useEntry(entryId)`, `features/inventory/api.ts:42-48`) — la pieza técnica que falta ya existe, solo no está conectada desde `catalogs`.

**El obstáculo es de arquitectura, no técnico:** `catalogs` no puede importar internals de `inventory` (CLAUDE.md regla 3). La solución es el mismo movimiento que ya se hizo una vez para este problema exacto — cuando `SaleReceiptDialog` pasó de `features/sales/` a `components/shared/` porque `customers` también lo necesitaba (documentado en el propio comentario del componente). Acá: promover `EntryDetailDialog` + `useEntry` a `components/shared/`/`lib/inventory/`, y conectar `onRowClick` en `SupplierDetailPage`.

**Bonus, mismo hueco en un segundo lugar:** la pestaña "Compras" de cada producto (`ProductRow.tsx`) tampoco tiene `onRowClick` en sus filas — no es solo un problema de `catalogs`, es un patrón que quedó sin terminar de conectar en más de un sitio.

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

**Abierto — 5 causas concretas, no una percepción vaga:**

1. **Requests N+1 real, en 3 componentes distintos** (no solo el ya conocido): `SaleReceiptDialog` (`useItem` por línea de venta, **×2** porque también se monta la versión de impresión oculta), `ReturnFormDialog` (mismo patrón, por línea a devolver) y `ContractDetailPage` (`useItem` por cada prenda rematada del contrato). Una venta de 8 líneas dispara 16 requests solo para abrir el comprobante.
2. **Listados completos traídos para filtrar en el cliente:** historial de contratos de un cliente (`limit=200`, porque `GET /contracts` no filtra por `customer_id` en el backend) y Reportes (`fetchAllPages` sobre ventas + artículos, hasta 5.000 de cada uno).
3. **Cascada innecesaria:** `ContractDetailPage` pide el contrato y recién cuando ese responde pide el cliente (`enabled: !!contract?.customer_id`) — podrían pedirse en paralelo.
4. **Sin `staleTime` global**, y `refetchOnWindowFocus: true` puesto a propósito ("app operativa multi-usuario") — combinado con el punto 1, volver a la pestaña del navegador con un comprobante abierto reejecuta todos esos requests de golpe.
5. **Bundle de 1.7MB en un solo archivo**, cero code-splitting por ruta (`router.tsx` tiene 38 imports estáticos, ningún `.lazy.tsx`, sin `manualChunks` en `vite.config.ts`). Las 12 features completas se descargan de una sola vez en el primer load.

**Recomendación de orden:** el punto 1 (N+1) es el más barato de arreglar y el que más se siente en las pantallas que más se usan (venta, devolución, contrato) — candidato a resolverse primero, posiblemente agregando un endpoint de "traer varios artículos por lista de ids" en el backend en vez de seguir pidiendo uno por uno.
