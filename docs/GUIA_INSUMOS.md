> **Qué es esto.** Los insumos crudos para terminar `marca/GUIA_USUARIO.html` (partes 4 y 7), extraídos
> **leyendo el código**, no la documentación. Generado el 20/09/2026. Ver `PLAN_MARCA.md` §Fase 3.
>
> **No es la guía.** Es la materia prima: rutas, permisos, campos, errores y estados vacíos de las 13
> pantallas que faltan. La guía se escribe *a partir* de esto, en el tono del cliente.
>
> ⚠️ **Leé la sección «Qué NO pude verificar» del final antes de usarlo.** Hay pantallas y diálogos que
> quedaron sin leer, y están listados. Lo que no está verificado no se escribe en la guía.
>
> ⚠️ **La regla del proyecto «los campos salen del schema de Zod» solo aplica a la mitad de las pantallas.**
> Hay 13 schemas de Zod en todo `features/`; el resto valida a mano. Ver el hallazgo (b) abajo.

---

# Insumos verificados contra código para `marca/GUIA_USUARIO.html` §4 y §7

Rutas base que uso abreviadas abajo, pero **siempre cito ruta absoluta completa**:
- FE = `/Users/mateojaramillo/projects/compraventa_app/frontend-starter/src`
- BE = `/Users/mateojaramillo/projects/compraventa_app/backend-starter`

---

## 0 · TRES HALLAZGOS QUE AFECTAN LO QUE VAS A ESCRIBIR — leelos primero

**(a) Confirmado: el esquema de códigos vigente es producto + lote, NO `JOC0001I`.**
`/Users/mateojaramillo/projects/compraventa_app/backend-starter/app/modules/inventory/rules.py`
- líneas 11-22 → `build_code()` produce `JOC0001I` y el docstring dice literal: *"Esquema ANTERIOR a 00021… se conserva para no invalidar los códigos ya impresos"*. **Obsoleto.**
- líneas 25-36 → `build_product_code()`: SKU del producto = `[letra cat1][cat2][cat3][consecutivo 4 díg]` → **`JAO0007`**. Sin letra de proveedor (el proveedor pertenece al lote).
- líneas 39-49 → `build_lot_code()`: `{SKU}-{lote 2 díg}{letra proveedor | 'R' si remate}` → **`JAO0007-01I`**, `JAO0007-03M`, `JAO0007-01R`.
- La UI espeja esto: la pestaña se llama **"Productos"** y **"Lotes"** (`FE/features/inventory/pages/InventoryPage.tsx:735-736`), y el diálogo de lote titula `Lote {item.code}` (`FE/features/inventory/components/ItemEditDialog.tsx:202`).

**(b) La mitad de los formularios NO tiene schema de Zod.** Pediste los campos "sacados del schema de Zod"; para estas pantallas no existe schema y la validación es manual con `useState` + chequeos en el submit. Lo marco pantalla por pantalla. Los **únicos 13 schemas de Zod** de todo `features/` son (verificado con `grep -rn "z\.object" FE/features`):

| Archivo | Línea |
|---|---|
| `FE/features/customers/components/CustomerFormDialog.tsx` | 19 |
| `FE/features/settings/pages/SettingsPage.tsx` | 15 |
| `FE/features/identity/components/RoleFormDialog.tsx` | 13 |
| `FE/features/identity/components/InviteUserDialog.tsx` | 12 |
| `FE/features/cashbox/components/ExpenseFormDialog.tsx` | 19 |
| `FE/features/auth/pages/LoginPage.tsx` | 9 |
| `FE/features/contracts/contractItemSchema.ts` | 10 |
| `FE/features/contracts/pages/ContractFormPage.tsx` | 31 |
| `FE/features/contracts/components/ContractEditDialog.tsx` | 13 |
| `FE/features/platform/components/CompanyFormDialog.tsx` | 14 |
| `FE/features/inventory/pages/EntryFormPage.tsx` | 36 (`entryLineSchema`) y 58 (`entrySchema`) |
| `FE/features/catalogs/components/CategoryFormDialog.tsx` | 22 |
| `FE/features/catalogs/components/SupplierFormDialog.tsx` | 14 |

**(c) ~~Hay un desajuste real de códigos de error entre front y back~~ — RESUELTO el 23/09/2026** (F20-01, F20-02, F20-03). El catálogo del front tenía `ALREADY_CLOSED_TODAY` mientras el backend emite `CASH_SESSION_ALREADY_CLOSED_TODAY`, y le faltaban `IDEMPOTENCY_IN_PROGRESS` y `MULTIPLE_REGISTERS_NOT_SUPPORTED`. Los tres corregidos, con `tests/error-codes-contract.test.ts` vigilándolo. Se deja anotado porque el detalle de §7 al final describía el estado viejo.

---

## 1 · CAJA — `/caja`

**Ruta y permiso.** `/caja` → `CashboxPage`, guard `cashbox.view` (`FE/app/router.tsx:262-272`).

**Qué se ve** (`FE/features/cashbox/pages/CashboxPage.tsx`):
- `PageHeader`: **"Caja" / "Sesión diaria, gastos y cierre con desglose."** (línea 136).
- **Card del turno** (141-206): si hay sesión abierta muestra *"Caja abierta desde las {hora}"* + **Saldo inicial** (155-159). Si la sesión quedó abierta de otro día, ese texto se reemplaza por un aviso ámbar: *"Turno abierto desde el {fecha} a las {hora} — todo lo que registres hoy entra en ese turno"* (149-153; la condición es `session.session_date !== todayBogota()`, línea 83).
- **Tabla "Gastos de hoy"** (231-247). Columnas: Descripción · Categoría · Módulo · Medio · Monto · Comprobante (104-115).
- **"Histórico de cierres"** con `DateRangePicker` (249-269), **solo si tenés `cashbox.view_history`** (línea 42 y 249). Columnas: Fecha · Esperado · Contado · **Diferencia** (en rojo si ≠ 0) · Cerrado (117-131). Clic en una fila abre el **acta de cierre** (263).

**Qué se puede hacer (botón → permiso).**
| Botón | Permiso | Línea |
|---|---|---|
| **+ Nuevo gasto** | `cashbox.expense` | 167-177 |
| **Consignar efectivo** (abre TransferDialog con origen = cajón) | `accounts.transfer` | 182-192 |
| **Cerrar caja** | `cashbox.open_close` | 193-203 |
| **Abrir caja** (solo en el estado vacío) | `cashbox.open_close` | 220-224 |
| **Reabrir caja** (solo si la de hoy ya se cerró) | `cashbox.reopen` | 213-218 |

Reabrir **exige motivo obligatorio** en el diálogo de confirmación (`requireReason: true`, `reasonLabel: 'Motivo de la reapertura'`, 85-102); texto: *"Vuelve a dejar la caja de hoy en estado abierto — úsalo solo para corregir un cierre por error."*

**Estados vacíos.**
- Sin caja abierta: **"No hay caja abierta hoy"** / *"Ábrela para registrar gastos y poder cerrar el día."* (210-211).
- Si la de hoy ya se cerró: **"La caja de hoy ya se cerró"** / *"Si el cierre fue un error, puedes reabrirla."* (210-211).
- Sin el permiso correspondiente, el botón se reemplaza por texto: *"Pídele a un responsable que la abra."* / *"…que la reabra."* (214, 220).
- Gastos: **"Aún no hay gastos registrados hoy"** (241). Cierres: **"Aún no hay cierres registrados"** (262).

### Formulario: Nuevo gasto — **SÍ tiene Zod**
`FE/features/cashbox/components/ExpenseFormDialog.tsx:19-27`

| Campo (schema) | Etiqueta visible | Oblig./Opc. **según schema** | Validación |
|---|---|---|---|
| `category_id` (l. 20) | "Categoría" (l. 151) | **Obligatorio** | `min(1)` → *"Selecciona una categoría"*. El selector permite crear una nueva en línea ("+ Nueva categoría…", l. 80) |
| `description` (l. 21) | "Descripción" (l. 156) | **Obligatorio** | `min(1)` → *"La descripción es obligatoria"* |
| `amount` (l. 22) | "Monto" (l. 164) | **Obligatorio** | `refine(Number(v) > 0)` → *"El monto debe ser mayor a cero"* |
| `payment_method` (l. 23) | "Medio de pago" (l. 171) | **Obligatorio** (enum, default `cash`) | `'cash' \| 'transfer' \| 'other'` |
| `account_id` (l. 24) | "¿De dónde sale?" (l. 197) | **Opcional** (`nullable`, sin `min`) | Sin validación en el schema; el `AccountPicker` filtra por medio y `direction="out"` |
| `module` (l. 25) | "Módulo" (l. 215) | **Obligatorio** (enum, default `general`) | `'pawn' \| 'store' \| 'general'` |
| `receipt` (l. 26) | "Comprobante (opcional)" (l. 238) | **Obligatorio como array**, pero puede ir vacío | `z.array(z.string())`; `maxPhotos={1}` (l. 244) |

Nota útil para la guía: la etiqueta de `account_id` NO dice "(opcional)" aunque el schema lo permita null — y `receipt` sí dice "(opcional)" aunque el schema lo pida siempre (vacío cuenta). Son los dos casos donde etiqueta y schema no coinciden.

### Diálogo: Abrir caja — **SIN Zod**, validación manual
`FE/features/cashbox/components/OpenSessionDialog.tsx`
- **Ya no se digita el saldo de apertura** (docstring l. 11-29). La card muestra *"Efectivo registrado en el cajón"* calculado (`cashOnHand`, l. 37, 84).
- Enlace **"Contar el efectivo ahora"** (l. 98) despliega:
  - **"Efectivo contado"** (`counted`, l. 103) — opcional a propósito (docstring l. 26-28).
  - Si el conteo difiere: bloque ámbar **"Diferencia"** + campo **"Motivo de la diferencia"** (l. 116), placeholder *"Qué explica el faltante o el sobrante"*. **Sin tolerancia**: `faltaMotivo` deshabilita el botón (l. 41, 74).
- Error: *"No se pudo abrir la caja. Intenta de nuevo."* (l. 137).

### Diálogo: Cerrar caja — **SIN Zod**
`FE/features/cashbox/components/CloseSessionDialog.tsx`
- Descripción: *"Cuenta el efectivo físico y regístralo — el desglose de abajo es lo que el sistema espera encontrar."* (l. 53).
- Muestra el `SessionReportPanel` con el `expected_cash` (l. 71).
- **"Efectivo contado"** (l. 75) + botón **"Contar por denominación"** / "Ocultar conteo por denominación" (l. 78-80) que llena el mismo campo (`DenominationCounter`, l. 87).
- **Diferencia** calculada al instante, verde si 0 / roja si ≠ 0 (l. 93-98).
- Si hay diferencia: **"Justificación del descuadre"** (textarea, l. 102) — **obligatoria, bloquea el submit**: *"Obligatoria mientras haya diferencia, sin excepción."* (l. 106).
- Éxito: toast *"Caja cerrada — el acta queda disponible en el histórico"* (l. 41).

**Errores de negocio de esta pantalla:**
- `CASH_SESSION_ALREADY_OPEN` — *"Ya hay una sesión de caja abierta."* (`BE/app/modules/cashbox/service.py:115`). También al reabrir: `BE/.../service.py:428`.
- `CASH_SESSION_ALREADY_CLOSED_TODAY` — *"La caja de hoy ya se cerró; no se puede abrir otra el mismo día."* (`BE/.../service.py:117-119`).
- `CASH_SESSION_NOT_OPEN` al cerrar — *"La sesión ya está cerrada."* (`BE/.../service.py:349`).
- `CASH_OPENING_DIFFERENCE_UNJUSTIFIED` — *"El conteo de apertura no coincide con el efectivo registrado; toda diferencia exige justificación."* (`BE/.../service.py:130-136`). El diálogo lo previene antes de enviar.
- `ACCOUNT_CANNOT_FUND_PAYMENT` / `ACCOUNT_NOT_OPERATIONAL` al registrar un gasto contra la cuenta equivocada (`BE/app/modules/cashbox/integration.py:205-235`) — mensajes completos en §7.
- En el gasto, `CASH_SESSION_NOT_OPEN` **no muestra banner**: abre el modal "Caja cerrada" (`ExpenseFormDialog.tsx:123-126`).

---

## 2 · VENTAS — `/ventas` y `/ventas/nueva`

**Rutas y permisos.**
- `/ventas` → `SalesListPage`, guard **`sales.view`** (`FE/app/router.tsx:341-351`).
- `/ventas/nueva` → `SaleFormPage`, guard **`sales.create`** (`FE/app/router.tsx:353-363`).

### Lista (`FE/features/sales/pages/SalesListPage.tsx`)
- Columnas: Número · Fecha · Medio · Total · Estado (l. 52-58).
- Acciones: **Exportar a Excel** (sin permiso, l. 66-69 — exporta *todas* las ventas, no la página cargada, l. 30-50) y **+ Nueva venta** con `sales.create` (l. 70-74).
- Clic en fila → `SaleReceiptDialog` (l. 94).
- Vacío: **"Aún no tienes ventas"** / *"Registra la primera desde el punto de venta."* (l. 86-87).
- Dentro del comprobante (`FE/components/shared/SaleReceiptDialog.tsx`): **Imprimir comprobante** (sin permiso, l. 86), **Devolver** → `sales.return` (l. 92), **Anular venta** → `sales.void` (l. 99). Anular pide **motivo obligatorio** (l. 61-67): *"Los artículos vuelven a estar disponibles en inventario. Esta acción no se puede deshacer."*

### Nueva venta (`FE/features/sales/pages/SaleFormPage.tsx`) — **SIN schema de Zod**
Todo es `useState` (l. 39-49). Los campos y sus reglas reales:

| Campo (state) | Etiqueta visible | Oblig./Opc. | Regla, verificada en código |
|---|---|---|---|
| `cart` | buscador *"Buscar artículo por código o nombre… (Enter agrega)"* (l. 151) | **Obligatorio** | `if (cart.length === 0)` → *"Agrega al menos un artículo al carrito."* (l. 112-115) |
| cantidad por línea | `+` / `−`, o input numérico si la unidad admite fracciones | — | Tope = stock del lote; **mínimo 0.001 si la unidad admite fracciones, 1 si no** (l. 87-97, `allowsFractions`) |
| `customer` | **"Cliente (opcional)"** (l. 217) | Opcional | Sin cliente: *"Sin seleccionar: se vende a «Consumidor final»."* (l. 221) |
| `creditNoteId` / `creditNoteAmount` | **"Aplicar nota crédito"** + "Monto a aplicar" (l. 226, 254) | Opcional | La sección **solo aparece** si el cliente elegido tiene notas con saldo > 0 (l. 61, 224). Al elegirla, el monto se precarga con `min(saldo, total)` (l. 237) |
| `paymentMethod` | **"Medio de pago"** (l. 262) | Obligatorio (default `cash`) | — |
| `accountId` | **"¿A dónde entra?"** (l. 283) | — | `AccountPicker` filtrado por medio |
| `discountAmount` | **"Descuento (opcional)"** (l. 290) | Opcional | Todo el bloque va dentro de `<Can permission="sales.apply_discount">` (l. 288) |
| `discountReason` | **"Motivo del descuento"** (l. 295) | **Obligatorio si hay descuento** | `if (hasDiscount && !discountReason.trim())` → *"El descuento necesita un motivo."* (l. 116-119) |

- Panel de totales (l. 302-329): **Subtotal**, **Descuento**, **Total**, y si hay nota crédito: **Nota crédito aplicada** y **A cobrar**.
- Botón: **"Vender {total}"** / "Vendiendo…" (l. 333-338).
- Carrito vacío: *"El carrito está vacío — busca un artículo arriba."* (l. 156).
- **Protección de navegación**: si hay carrito armado y salís, aparece *"¿Descartar la venta?" / "Vas a perder el carrito que ya armaste."* con "Descartar cambios" / "Seguir editando" (l. 54-58, 343-359).

**Errores de negocio de Ventas:**
- `CASH_SESSION_NOT_OPEN` → abre el modal "Caja cerrada", no banner (l. 135-138).
- `CREDIT_NOTE_INSUFFICIENT_BALANCE` — *"La nota crédito no tiene saldo suficiente."* (`BE/app/modules/sales/service.py:193-196`).
- `PERMISSION_DENIED` con descuento sin permiso — *"Falta el permiso 'sales.apply_discount'."* (`BE/app/modules/sales/service.py:153-154`).
- `BAD_REQUEST` por carrera de stock — *"No hay suficiente cantidad disponible."* (`BE/app/core/errors.py:170-176`; traduce el `quantity_check` de la base cuando dos cajeros venden la última unidad a la vez).
- En **devolución** (`ReturnFormDialog`): `RETURN_TIME_LIMIT_EXCEEDED` (`BE/app/modules/sales/service.py:516-522`) y `SALE_ACCOUNT_NOT_SETTLED` (`BE/.../service.py:539-549`) — mensajes en §7.

---

## 3 · INVENTARIO — `/inventario` + 2 rutas hijas

**Rutas y permisos** (`FE/app/router.tsx`):
- `/inventario` → `InventoryPage`, guard **`inventory.view`** (l. 302-313). **Los filtros viven en la URL** vía `validateSearch` (schema `inventorySearchSchema`, l. 286-298): `tab, q, status, cat1, cat2, cat3, supplier, origin, stock, payment, exitType` — todos opcionales, así que una URL limpia = pantalla limpia. Útil para la guía: los filtros se pueden compartir por link y el botón "atrás" vuelve al filtro anterior.
- `/inventario/ingresos/nuevo` → `EntryFormPage`, guard **`inventory.create`** (l. 315-325).
- `/inventario/transformaciones/nueva` → `TransformationFormPage`, guard **`inventory.transform`** (l. 329-339).

**Cabecera** (`InventoryPage.tsx:672-694`): título "Inventario" / *"Artículos, ingresos y egresos."*; botones **Transformar** (`inventory.transform`, l. 679-683) y **+ Nuevo ingreso** (`inventory.create`, l. 684-688).

**Cinco pestañas** (l. 730-737): **Productos · Lotes · Ingresos · Egresos · Transformaciones**. Al cambiar de pestaña **se limpian todos los filtros** a propósito (l. 700-715).

### Pestaña Productos (l. 149-305)
- Buscador *"Buscar producto por código o nombre…"*; filtros en cascada **Toda categoría → Toda subcategoría → Todo tipo**, **Todo proveedor**, píldora **"Solo con stock"**, y **"Limpiar filtros"** cuando hay alguno (l. 189-232).
- Clic en un producto → `ProductPriceDialog`.
- Vacíos: con filtros **"Ningún producto coincide"** / *"Prueba con otros filtros."*; sin filtros **"Aún no tienes productos"** / *"Registra un ingreso para empezar."* (l. 268-271).
- Error de permiso (no reintentable): *"Tu rol no tiene permiso para ver el inventario. Pídele a un administrador que te lo habilite."* (l. 256-258).

**Diálogo "Editar producto"** (`FE/features/inventory/components/ProductPriceDialog.tsx`) — **SIN Zod**:
- Muestra **Precio actual** y **Costo más alto** (l. 82-91).
- **"Precio nuevo"** (l. 94) con aviso de margen calculado sobre el lote más caro; si el margen < 10% se pinta en ámbar: *"Margen sobre el lote más caro: N% — el costo subió y el precio se quedó corto."* (l. 47-48, 98-103).
- **"Unidad de medida"** (l. 107): editable **solo si el producto no tiene lotes** (`product.lot_count === 0`, l. 39). Textos exactos en l. 122-126.
- Botón: **"Aplicar a todos los lotes"**; nota fija: *"Se aplica a los N lotes de este producto. Las ventas ya registradas conservan el precio al que se vendieron."* (l. 129-133).

### Pestaña Lotes (l. 307-492)
- Buscador *"Buscar por código o nombre…"*.
- Píldoras de estado: **Todos · Borrador · Disponible · Vendido · Dado de baja** (l. 36-42).
- Filtros: categorías en cascada, **Todo origen** (`Comprado a proveedor` / `Remate de contrato` / `Otro origen`, l. 48-52) y **Todo proveedor** — que **se oculta si el origen es "Remate"** porque un artículo de remate no tiene proveedor (l. 444-459).
- **Exportar a Excel** (l. 463-466): exporta *todos* los lotes que cumplen los filtros, no la página visible.
- Columnas: Código · Nombre · Costo · Precio · Cantidad · Estado (l. 455-462 del bloque de columnas, l. 456).
- Vacíos: **"Ningún artículo coincide"** / *"Prueba con otro código, nombre o categoría."*, o **"Aún no tienes artículos"** / *"Registra un ingreso para empezar."* (l. 479-480).
- Clic → `ItemEditDialog` (título `Lote {code}` o `{nombre} — borrador`): campo **"Precio de venta"**, **"Fotos"**, y botón **Publicar** habilitado solo si `precio > 0` y (si es pieza única) hay al menos una foto (`FE/features/inventory/components/ItemEditDialog.tsx:150`).

### Pestaña Ingresos (l. 500-624)
- Buscador *"Buscar por número de ingreso o factura del proveedor…"*.
- Píldoras: **Todos · Por pagar · Pagados** (l. 494-498).
- Filtros: **Todo origen**, **Todo proveedor**.
- **Banda ámbar de total por pagar** cuando el filtro es "Por pagar": *"N compra(s) por pagar"* + la suma (l. 599-606).
- Columnas: Número · Origen · Artículos · **Costo total** · **Entrada** (fecha de entrada de la mercancía, no la de digitación) · **Pago** (badge ámbar "Por pagar" / verde "Pagado"; "—" si no es compra) (l. 522-544).
- Vacíos: **"Ningún ingreso coincide"** / **"Aún no tienes ingresos registrados"** (l. 617-618).
- Dentro de `EntryDetailDialog` hay la acción de pagar la compra, gateada por **`inventory.pay_purchase`** (`FE/components/shared/EntryDetailDialog.tsx:78`); si la caja está cerrada dispara el modal de caja (l. 37).

### Pestaña Egresos (l. 626-670)
- Filtro **Todo tipo** + botón **+ Nuevo egreso** con permiso **`inventory.exit`** (l. 643-653).
- Columnas: Número · Tipo · Motivo · Fecha.
- Vacío: **"Aún no tienes egresos registrados"** (l. 665).

**Diálogo "Nuevo egreso"** (`FE/features/inventory/components/ExitFormDialog.tsx`) — **SIN Zod**:
- Descripción: *"Saca artículos disponibles del inventario — ajuste, daño, pérdida, devolución o uso interno."* (l. 77).
- **"Tipo de egreso"** (l. 87, default `adjustment`) · **"Motivo"** (textarea, l. 103) · **"Artículos"** (picker, l. 108).
- Validación manual: sin artículos → *"Agrega al menos un artículo."* (l. 52); sin motivo → *"El motivo es obligatorio."* (l. 56). Cantidad mínima 0.001 o 1 según unidad (l. 38).
- No toca caja: el comentario de l. 16 lo dice explícito — *"sin caja: no es dinero, es una salida de inventario"*.

### Formulario: Nuevo ingreso — **SÍ tiene Zod**
`FE/features/inventory/pages/EntryFormPage.tsx`

**Cabecera del ingreso** — `entrySchema`, líneas 58-92:
| Campo | Etiqueta visible | Oblig./Opc. **según schema** | Validación |
|---|---|---|---|
| `origin_type` (l. 60) | "Tipo" (l. 432) | Obligatorio (enum) | `SELECTABLE_ENTRY_ORIGINS` |
| `supplier_id` (l. 61) | "Proveedor" / "Proveedor (opcional)" según el tipo (l. 456-458) | **Opcional en el schema base**, pero **condicionalmente obligatorio** | `.refine` l. 75-78: si `origin_type === 'purchase'` exige proveedor → *"Un ingreso de tipo «Compra» necesita un proveedor"* |
| `supplier_invoice` (l. 62) | "Factura del proveedor (opcional)" (l. 484) | Opcional | — |
| `payment_method` (l. 65) | "Pago" (l. 509) | **Opcional** | Enum con `''` incluido = **pendiente de pago**, decisión explícita (comentario l. 63-64). El comentario l. 79-81 aclara: *"El medio de pago YA NO es obligatorio en una compra: dejarlo vacío la registra como pendiente de pago"* |
| `account_id` (l. 66) | "¿De dónde sale?" (l. 544) | Opcional (`nullable().optional()`) | — |
| `entry_date` (l. 67) | "Fecha de entrada" (l. 492) | **Obligatorio** | `min(1)` → *"Indica cuándo entró la mercancía"*; `.refine` l. 82-85: no puede ser futura → *"La mercancía no puede haber entrado en una fecha futura"* |
| `notes` (l. 68) | "Notas" / "Notas (opcional)" (l. 847-849) | **Opcional**, salvo con origen "Otro" | `.refine` l. 89-92: si `origin_type === 'other'` exige notas → *"Explica de dónde salió esta mercancía"* |
| `lines` (l. 69) | — | **Obligatorio** | `.min(1)` → *"Agrega al menos un artículo"* |

**Cada línea de artículo** — `entryLineSchema`, líneas 36-56:
| Campo | Etiqueta | Oblig./Opc. | Validación |
|---|---|---|---|
| `name` (l. 37) | "Nombre" (l. 650) | **Obligatorio** | `min(1)` → *"El nombre es obligatorio"* |
| `cat1_id` (l. 38) | "Categoría" (l. 655) | **Obligatorio** | *"Selecciona una categoría"* |
| `cat2_id` (l. 39) | "Subcategoría" (l. 684) | **Obligatorio** | *"Selecciona una subcategoría"* |
| `cat3_id` (l. 40) | "Categoría final" (l. 713) | **Obligatorio** | *"Selecciona la categoría final"* |
| `description` (l. 41) | "Descripción (opcional)" (l. 789) | Opcional | — |
| `unit_cost` (l. 42) | "Costo unitario" (l. 735) | **Obligatorio** | `> 0` → *"El costo debe ser mayor a cero"* |
| `quantity` (l. 46) | "Cantidad" (l. 744) | **Obligatorio** | `> 0` → *"La cantidad debe ser mayor a cero"*. Es **string, no número**, para admitir decimales (12,5 g) sin perder el valor a medio escribir (comentario l. 43-45) |
| `unit` (l. 47) | selector de unidad | Obligatorio (enum) | `unit \| gram \| kilogram \| meter \| liter` |
| `from_existing_product` (l. 50) | — (interno) | Opcional | Si la línea vino del buscador, la unidad del producto manda y el selector se bloquea |
| `sale_price` (l. 54) | "Precio de venta" (l. 804) | **Opcional** | Nota visible: *"Aplica a todos los lotes de este producto."* (l. 812) |
| `photos` (l. 55) | "Fotos (opcional)" (l. 815-816) | Opcional | `maxPhotos={3}` (l. 826) |

**Regla clave para la guía** (`lineIsReady`, l. 106-116): **solo el precio decide si el lote nace vendible o en borrador.** La foto dejó de ser obligatoria (solo lo es en piezas únicas, y un ingreso nunca crea piezas únicas — eso solo lo hace el remate). "Borrador" significa exactamente una cosa: *no se sabe en cuánto se vende*.

Y (l. 118-141, docstring de `ProductSearchAdd`): **buscar un producto conocido agrega una línea nueva, NO suma cantidad a un lote existente**, porque el sistema costea por identificación específica — cada lote conserva su costo real y nunca se promedia.

### Formulario: Transformación — **SIN Zod**
`FE/features/inventory/pages/TransformationFormPage.tsx` (todo `useState`, l. 80-87).
- Descripción: *"Fundir, despiezar o armar. Lo que costó lo que entra es lo que cuesta lo que sale — el costo no se pierde ni se inventa."* (l. 185).
- Secciones: **"Qué entra"** (l. 191) · **"Costo del proceso (opcional)"** con "Cuánto" / "Medio de pago" / "¿De dónde sale?" (l. 252-281) · **"Qué sale"** con Nombre, Categoría, Subcategoría, Categoría final, Cantidad, "Precio de venta (opcional)", "Valor estimado (para repartir el costo)" (l. 297-437) · **Motivo** (l. 465).
- **Confirmación irreversible con números a la vista** (l. 134-144): *"¿Confirmar la transformación?" — "Se consumen N artículo(s) y se crean M. El costo que viaja es $X. Esto no se puede deshacer."*, tono peligro, botón "Transformar".
- Bloqueo de navegación: *"Vas a perder los artículos y salidas que ya armaste."* (l. 507).
- `CASH_SESSION_NOT_OPEN` → modal de caja (l. 172).

---

## 4 · CLIENTES — `/clientes` y `/clientes/$customerId`

**Rutas y permisos.** Ambas con guard **`customers.view`** (`FE/app/router.tsx:149-174`).

**Lista** (`FE/features/customers/pages/CustomersPage.tsx`):
- Columnas: Nombre · Documento (formato `CC 12345678`, l. 15) · Teléfono · Estado (l. 13-18).
- Buscador *"Buscar por nombre o documento…"* (l. 49).
- Acción: **+ Nuevo cliente** → **`customers.create`** (l. 35-45).
- Clic en fila → ficha del cliente (l. 60).
- Vacíos: con búsqueda **"No encontramos clientes con ese nombre"**; sin búsqueda **"Aún no tienes clientes"** / *"Crea el primero para empezar a registrar contratos y ventas."* (l. 58-59).

**Ficha** (`FE/features/customers/pages/CustomerDetailPage.tsx`): tres bloques — **Contratos** (l. 181, vacío "Sin contratos"), **Compras** (l. 195, "Sin compras"), **Notas crédito** (l. 212, "Sin notas crédito"). Botón de editar gateado por `customers.create` (l. 116).

### Formulario: cliente — **SÍ tiene Zod**
`FE/features/customers/components/CustomerFormDialog.tsx:19-29`

| Campo | Etiqueta | Oblig./Opc. **según schema** | Validación |
|---|---|---|---|
| `full_name` (l. 20) | Nombre completo | **Obligatorio** | `min(1)` → *"El nombre es obligatorio"* |
| `doc_type` (l. 21) | Tipo de documento | Obligatorio (enum, default `cc`) | `cc \| ce \| passport \| nit` → etiquetas "Cédula de ciudadanía / Cédula de extranjería / Pasaporte / NIT" (l. 12-17) |
| `doc_number` (l. 22) | Documento | **Obligatorio** | `min(1)` → *"El documento es obligatorio"* |
| `doc_issue_place` (l. 23) | Lugar de expedición | **Opcional** | — |
| `address` (l. 24) | Dirección | **Opcional** | — |
| `phone` (l. 25) | Teléfono | **Obligatorio** | `min(1)` → *"El teléfono es obligatorio"* |
| `email` (l. 26) | Correo | **Opcional** | Si se llena debe ser email válido → *"Correo inválido"*; admite cadena vacía (`z.literal('')`) |
| `notes` (l. 27) | Notas | **Opcional** | — |
| `doc_photos` (l. 28) | Fotos del documento | Array obligatorio, puede ir vacío | — |

**Regla importante:** `doc_type` y `doc_number` **son inmutables tras la creación** — la API no los acepta en el update, y el formulario los excluye del payload al editar (docstring l. 53-54, código l. 92).

**Errores:** duplicado de documento (`CONFLICT`) se pinta **sobre el campo `doc_number`**, con mensaje **"Ya existe un cliente con ese documento."** (l. 97-100).

---

## 5 · INICIO (dashboard) — `/`

**Ruta y permiso.** `/` → `DashboardPage`, **sin guard de ruta** (`FE/app/router.tsx:143-147`). Pero el contenido **necesita `reports.view`**: el endpoint que lo alimenta lo exige, y la pantalla maneja ese caso explícitamente.

**Qué se ve** (`FE/features/dashboard/pages/DashboardPage.tsx`):
- Encabezado: **"Hola, {nombre}"** / *"Actualizado al {fecha}"* (l. 72).
- **6 KPIs** (l. 74-91): **Cartera activa** (rojo) · **Ventas de hoy** · **Ventas del mes** · **Contratos activos** · **Artículos disponibles** (cantidad + valor) · **Estado de caja** ("Abierta" en verde / "Cerrada" en rojo).
- **"Contratos por estado"** — gráfico con 5 series (l. 62-68): **Vigentes · En mora · Prórroga · Listos p/ remate · Rematados**.
- **"Listos para remate"** — lista de hasta 5 contratos (l. 99-131), cada uno con número, **"Prórroga vencida el {fecha}"** y saldo de capital. Ojo para la guía: lo que pone un contrato en esta lista es que **se le venció la prórroga** (`extension_ends_at`), NO la fecha de vencimiento del papel — el comentario l. 115-122 documenta que antes mostraba la fecha equivocada.

**Estados vacíos.**
- Sin remates pendientes: **"Nada pendiente de remate"** / *"Los contratos vencidos que agotan su prórroga aparecen aquí."* (l. 102).
- **Sin `reports.view`** (caso importante: `/` es adonde redirigen TODOS los guards, así que es lo que ve un rol restringido): **"Hola, {nombre}"** / *"Tu rol no incluye el resumen del inicio. Usa el menú de la izquierda para ir a lo que sí tienes habilitado, o pídele a un administrador el permiso «Dashboard y reportes»."* (l. 44-51).
- Error genérico: *"No se pudo cargar el dashboard."* + Reintentar (l. 52-59).

**Formularios:** ninguno.

---

## 6 · IDENTIDAD — `/identidad`

**Ruta y permiso.** Guard: necesita **`identity.manage_users` O `identity.manage_roles`** (`FE/app/router.tsx:369-379`). Cada pestaña se oculta por separado según cuál tengas (`FE/features/identity/pages/IdentityPage.tsx:193-215`).

**Cabecera:** "Identidad" / *"Usuarios, invitaciones, roles y matriz de permisos."* (l. 199).

### Pestaña Usuarios (l. 29-90)
- Columnas: Nombre · Correo · Rol · Estado · **"Invitado el"** (l. 21-27).
- Acción: **+ Invitar usuario** → `identity.manage_users` (l. 46-56).
- Vacío: **"Aún no tienes usuarios"** / *"Invita al primero para que pueda entrar a la plataforma."* (l. 66-67).
- Clic en fila → `UserDetailDialog`.

**Ficha del usuario** (`FE/features/identity/components/UserDetailDialog.tsx`):
- **Guardar rol** (solo aparece si cambiaste el rol, l. 121-125).
- **"Generar enlace de activación"** (si nunca entró) / **"Generar enlace para cambiar la contraseña"** (l. 153-169). Sirve para rescatar a quien olvidó su contraseña **sin depender del correo** (comentario l. 139-143).
- **Desactivar / Reactivar usuario**, con confirmación: *"{Nombre} no podrá iniciar sesión hasta que se reactive."* (l. 94-98).
- **Sobre uno mismo, el botón no existe**; en su lugar hay un aviso: *"No puedes desactivar tu propia cuenta. Si te vas de la empresa, pídele a otro administrador que lo haga."* (l. 166-168).

### Pestaña Roles (l. 115-190)
- Columnas: Nombre · Descripción · **Permisos** (si es 0, badge ámbar **"Sin permisos"** — l. 102-109) · Predeterminado · Activo · Acciones (lápiz "Editar rol", solo con `identity.manage_roles`, l. 125-148).
- Acción: **+ Rol** → `identity.manage_roles` (l. 153-164).
- Clic en fila → **matriz de permisos** (`PermissionsMatrixDialog`), agrupada por módulo con checkboxes (`FE/features/identity/components/PermissionsMatrixDialog.tsx:51-65`).
- Vacío: **"Aún no tienes roles"** / *"Crea el primero para poder invitar usuarios."* (l. 175-176).

### Formulario: Invitar usuario — **SÍ tiene Zod**
`FE/features/identity/components/InviteUserDialog.tsx:12-16`

| Campo | Etiqueta | Oblig./Opc. | Validación |
|---|---|---|---|
| `full_name` (l. 13) | "Nombre completo" (l. 141) | **Obligatorio** | `min(1)` → *"El nombre es obligatorio"* |
| `email` (l. 14) | "Correo" (l. 149) | **Obligatorio** | `min(1)` → *"El correo es obligatorio"* + `.email()` → *"Correo inválido"* |
| `role_id` (l. 15) | "Rol" (l. 157) | **Obligatorio** | `min(1)` → *"Elige un rol"* |

Detalle para la guía: hay **dos formas de invitar** en el mismo submit (`sendEmail`, l. 44-63) — por correo, o **generando un enlace para copiar**. Si elegís el enlace, **el diálogo no se cierra**, porque el enlace solo existe ahí y no se puede volver a pedir (comentario l. 55-58).

### Formulario: Rol — **SÍ tiene Zod**
`FE/features/identity/components/RoleFormDialog.tsx:13-17`

| Campo | Oblig./Opc. | Validación |
|---|---|---|
| `name` (l. 14) | **Obligatorio** | `min(1)` → *"El nombre es obligatorio"* |
| `description` (l. 15) | **Opcional** | — |
| `clone_from_role_id` (l. 16) | **Obligatorio como string**, valor centinela `'__none__'` = no clonar | Se traduce a `null` al enviar (l. 49) |

**Errores de negocio de Identidad** (todos con el mensaje del backend en el banner):
- `LAST_ADMIN_SAFEGUARD` — se intercepta con un panel explicativo aparte (`UserDetailDialog.tsx:81, 109`). Dos mensajes distintos:
  - al cambiar de rol: *"No se puede quitar el último administrador activo de la empresa."* (`BE/app/modules/identity/service.py:147-149`)
  - al desactivar: *"No se puede inactivar al último administrador activo de la empresa."* (`BE/.../service.py:194-196`)
  - al editar permisos de un rol: mismo código (`BE/.../service.py:336-338`)
- `CANNOT_DEACTIVATE_SELF` — *"No puedes desactivar tu propia cuenta. Si te vas de la empresa, pídele a otro administrador que lo haga."* (`BE/.../service.py:182-186`)
- `USER_ALREADY_INVITED` — *"Ya invitaste a esta persona y todavía no ha entrado. Para volver a darle acceso, abre su ficha en Usuarios y usa «Generar enlace de activación» — invitarla otra vez anularía el enlace anterior."* (`BE/.../service.py:95-99`)
- `USER_ALREADY_EXISTS` — dos variantes: *"Esta persona ya existe en la empresa pero está inactiva. Reactívala desde su ficha en Usuarios en vez de invitarla de nuevo."* (l. 100-105) y *"Ya hay un usuario activo con ese correo en esta empresa."* (l. 106-109)
- `EMAIL_ALREADY_REGISTERED` — *"Ese correo ya tiene una cuenta en la plataforma. Si la persona ya trabaja en esta empresa, genera el enlace desde su ficha en Usuarios; si no, invítala con otro correo."* (`BE/app/modules/identity/auth_admin.py:217-221`)
- `AUTH_ACCOUNT_MISSING` — *"Este usuario ya no tiene cuenta de acceso: aparece en la lista de la empresa pero fue eliminado del sistema de autenticación. Desactívalo e invita de nuevo a esa persona con su correo."* (`BE/.../auth_admin.py:286-290`)
- `INVITE_RATE_LIMITED` — *"Supabase limitó el envío de correos. Espera unos minutos e invita de nuevo."* (`BE/.../auth_admin.py:212-215`) — **no hay nada roto, hay que esperar.**
- `AUTH_ADMIN_ERROR` — *"No se pudo invitar al usuario en Supabase Auth."* / *"No se pudo generar el enlace de recuperación en Supabase Auth."* (`BE/.../auth_admin.py:224-227, 293-296`) — este SÍ es técnico.

---

## 7 · REPORTES — `/reportes`

**Ruta y permiso.** Guard **`reports.view`** (`FE/app/router.tsx:468-478`). **Pero además necesita `cashbox.view_history`** para la pestaña Período — el backend exige los dos (`BE/app/modules/reports/router.py:30-33, 55`).

**Cabecera:** "Reportes" / *"Cómo va el negocio: resultados del período y estado contable de hoy."* (`FE/features/reports/pages/ReportesPage.tsx:434`).

**Dos pestañas** (l. 444-445), y el porqué está documentado en el código (l. 436-442): **"Período"** resume un RANGO (por eso lleva selector de fechas); **"Contabilidad"** es una **foto de hoy** (cuánto debo, cuánto tengo en mercancía, qué no rota) — esas preguntas no tienen versión "en marzo".

### Pestaña Período
- Controles: **Exportar a Excel** (l. 450-458, genera 3 hojas: Resumen / Desglose / Rankings, l. 424-428) + `DateRangePicker` + píldoras de módulo.
- KPIs: **Ingresos operativos** · **Intereses cobrados** · **Ventas** (l. 516-536, todos con delta contra el período anterior).
- Secciones: **"Movimiento de capital"** con *Capital desembolsado (préstamos nuevos)* y *Capital abonado (recuperado)* (l. 547-560) · **"Empeño vs Tienda — participación en ingresos operativos"** (l. 573) · **"Cartera actual" (Corte de hoy)** (l. 579) · **"Tendencia diaria — ingresos vs gastos operativos"** (l. 602) · **"Gastos por categoría"** (l. 608) · **"Medio de pago (ingresos)"** (l. 611) · **"Desglose por módulo, concepto y medio de pago"** (l. 616) · **"Últimos 12 meses — ventas, intereses y gastos"** (*Independiente del rango elegido arriba*, l. 651) · **"Lo más vendido del período"** con "Prendas más vendidas" y "Categorías más movidas" (l. 657-663).
- También hay **"Utilidad bruta de tienda"** (Ingreso por ventas / Costo de lo vendido / Utilidad bruta, l. 98-107), **"Rentabilidad del empeño"** (Intereses cobrados / Cartera al corte de hoy / Contratos abiertos, l. 150-167) y **"Estado de resultados"** (l. 235).

**Estados vacíos — son cuatro y cada uno dice algo distinto:**
1. Sin rango: **"Elige un rango de fechas"** / *"O un día específico — arriba a la derecha."* (l. 480)
2. Rango muy largo: **"Elige un rango de {MAX_RANGE_DAYS} días o menos"** / *"Los gastos por categoría todavía se piden sesión por sesión…"* (l. 484-487)
3. **Sin `cashbox.view_history`**: **"Necesitas permiso de histórico de caja"** / *"Este reporte se arma con los cierres de caja del período. Pídele a un administrador el permiso «Ver el histórico de cierres de caja»."* (l. 495-498). El comentario l. 490-493 explica por qué existe este estado: sin él el usuario veía un skeleton eterno.
4. Sin cierres en el rango: **"No hay cierres de caja en este rango"** / *"El reporte se arma a partir de las sesiones de caja ya cerradas."* (l. 511)
5. Error: *"No se pudo cargar el reporte de este rango."* + Reintentar (l. 503-507)

### Pestaña Contabilidad (`FE/features/reports/components/ContablesSection.tsx`)
- **"Cuentas por pagar"** (l. 293) con buckets **"0 a 30 días" (Al día)** / **"31 a 60 días" (Vigilar)** (l. 61-62). Vacío: **"No le debes nada a ningún proveedor"** / *"Todas las compras registradas están pagadas."* (l. 45).
- **"Valor del inventario"** (l. 301), incluye **"A precio de venta"** con el hint *"Referencia, no valorización"* (l. 147).
- **"Mercancía sin rotación"** (l. 311). Vacío: **"Nada lleva más de {N} días sin venderse"** / *"Todo el inventario disponible tiene rotación reciente."* (l. 234-236).

**Formularios:** ninguno.

---

## 8 · CATÁLOGOS — `/catalogos` (+ `/proveedores/$supplierId`)

**Rutas y permisos.** `/catalogos` guard **`catalogs.view`** (`FE/app/router.tsx:176-186`). `/proveedores/$supplierId` guard **`catalogs.view`** (l. 191-201; el comentario l. 188-190 advierte que la ficha además *necesita* `inventory.view` para cargar completa, porque sus números salen de las compras).

**Cabecera:** "Catálogos" / *"Árbol de categorías y proveedores."* (`FE/features/catalogs/pages/CatalogsPage.tsx:134`). Dos pestañas: **Categorías · Proveedores**.

### Pestaña Categorías
- Acción: **+ Categoría** → `catalogs.manage` (l. 50-54); dentro del árbol, **+ Subcategoría** y editar (`CategoryTreeView`).
- Error: *"No se pudo cargar el árbol de categorías."* + Reintentar (l. 67-70).

### Pestaña Proveedores
- Columnas: **Letra** · Nombre · Teléfono · Activo (l. 16-21).
- Acción: **+ Proveedor** → `catalogs.manage` (l. 93-104).
- Clic en fila → **ficha del proveedor**, no el formulario (comentario l. 116-119: *"lo que uno quiere al tocar un proveedor casi siempre es «¿qué le compré y cuánto le debo?»"*).
- Vacío: **"Aún no tienes proveedores"** / *"Crea el primero para registrar ingresos de mercancía comprada."* (l. 114-115).

### Formulario: Categoría — **SÍ tiene Zod**
`FE/features/catalogs/components/CategoryFormDialog.tsx:22-44`

| Campo | Oblig./Opc. **según schema** | Validación |
|---|---|---|
| `name` (l. 23) | **Obligatorio** | `min(1)` → *"El nombre es obligatorio"* |
| `code_letter` (l. 28-33) | **Obligatorio** | `min(1)` *"La letra es obligatoria"* · `max(3)` *"Máximo 3 letras"* · `regex(/^[A-Za-z]+$/)` *"Solo letras de la A a la Z"* · se transforma a **mayúsculas** automáticamente |
| `applies_to` (l. 34) | Obligatorio (enum) | `pawn \| store \| both` → "Empeño / Tienda / Ambos" (l. 14) |
| `default_term_months` (l. 39) | **Opcional** | — |
| `arrears_window_months` (l. 40) | **Opcional** | — |
| `max_ltv_pct` (l. 41) | **Opcional** | — |
| `active` (l. 42) | Obligatorio (boolean) | — |

**Matiz importante para la guía** (comentario l. 35-38): los tres parámetros opcionales *"solo importan de verdad en categorías nivel 3"* — el backend **rechaza `POST /contracts` con BAD_REQUEST si la categoría de la prenda no los tiene configurados**. Se piden en cualquier nivel porque el nivel lo calcula el backend a partir del padre.

### Formulario: Proveedor — **SÍ tiene Zod**
`FE/features/catalogs/components/SupplierFormDialog.tsx:14-36`

| Campo | Oblig./Opc. | Validación |
|---|---|---|
| `name` (l. 15) | **Obligatorio** | `min(1)` → *"El nombre es obligatorio"* |
| `code_letter` (l. 25-30) | **Obligatorio** | 1 a 3 letras A-Z, mayúsculas automáticas — mismos mensajes que categorías |
| `doc_type` (l. 31) | **Obligatorio como string** (centinela `'__none__'`) | `cc \| ce \| passport \| nit` (l. 11) |
| `doc_number` (l. 32) | **Opcional** | — |
| `phone` (l. 33) | **Opcional** | — |
| `email` (l. 34) | **Opcional** | Email válido o cadena vacía → *"Correo inválido"* |
| `address` (l. 35) | **Opcional** | — |
| `notes` (l. 36) | **Opcional** | — |

**Dato que vale la pena contar en la guía** (comentario l. 18-24): la letra del proveedor es **única por empresa**. Con una sola letra el techo eran 26 − 4 reservadas (**R** remate, **P** propio, **T** transformado, **D** devuelto) = **22 proveedores**. Con hasta 3 letras el techo pasa a 22 + 676 + 17.576.

---

## 9 · CUENTAS — `/cuentas`

**Ruta y permiso.** Guard **`accounts.view`** (permiso de LECTURA) (`FE/app/router.tsx:439-449`). El comentario l. 434-438 explica la decisión: *"un asesor que cobra necesita ver a qué cuenta manda la plata, aunque no administre el catálogo ni liquide convenios — esas dos se gatean por botón"*.

**Qué se ve** (`FE/features/accounts/pages/AccountsPage.tsx`):
- Cabecera: "Cuentas" / *"Dónde está la plata: el cajón, los bancos y lo que te deben."* (l. 106-107).
- Checkbox **"Mostrar cuentas inactivas"** (l. 134-137).
- **Agrupada por tipo** en este orden: `cash`, `bank`, `settlement` (l. 19), cada grupo con su etiqueta, su explicación y **su propio subtotal**.
- **NO hay total general, a propósito** (docstring l. 75-82): *"sumarlos todos en un total único mentiría — lo que Sistecrédito te debe no es plata que tengas"*.
- Cada tarjeta: nombre, badge **"Por defecto"** / **"Inactiva"**, referencia, saldo.

**Acciones (botón → permiso):**
| Botón | Permiso | Línea |
|---|---|---|
| **Trasladar** | `accounts.transfer` | 112-123 |
| **Nueva cuenta** | `accounts.manage` | 124-129 |
| **Extracto** (por cuenta) | **ninguno extra** — basta `accounts.view` | 55-57 (comentario l. 53-54) |
| **Liquidar** (solo en cuentas `settlement`) | `accounts.settle` | 58-64 |
| **Editar** (lápiz) | `accounts.manage` | 65-69 |

**Estados vacíos.**
- Sin permiso: **"No tienes permiso para ver las cuentas"** / *"Pídele a un administrador que te habilite el permiso «Ver cuentas y sus saldos»."* (l. 152-155).
- Error: **"No se pudieron cargar las cuentas"** / *"Revisa tu conexión e inténtalo otra vez."* + Reintentar (l. 157-165).
- Sin cuentas: **"No hay cuentas"** / *"Cada empresa nace con sus cuentas básicas. Si no ves ninguna, crea la primera."* (l. 169-178).

### Formularios de Cuentas — **NINGUNO tiene Zod**
`AccountFormDialog.tsx` (l. 39-44), `TransferDialog.tsx` (l. 82-86), `SettleAccountDialog.tsx` (l. 38-42): todos `useState` + validación manual.

- **Nueva/editar cuenta**: "Nombre" (placeholder *"Bancolombia ahorros"*, l. 117-125) · "Tipo" (l. 131) · "Referencia" (placeholder *"Últimos 4 dígitos, número de convenio…"*, l. 162-170) · "Saldo inicial" (solo al crear, l. 176) · checkbox de cuenta por defecto (l. 186-194). Única validación: *"El nombre es obligatorio."* (l. 67-68).
- **Traslado**: "De" / "A" (selectores, l. 163-182) · "Monto" (l. 194) · "Notas" (placeholder *"Consignación del día"*, l. 202-210). Validación: monto > 0 (l. 107); aviso si excede el saldo de origen (l. 99).
- **Liquidar**: "Monto liquidado" (precargado con el saldo, l. 38, 108) · "Monto recibido" (l. 118) · "Cuenta destino" (l. 132) · "Notas" (placeholder *"Corte del 15 al 30"*, l. 150-158). La diferencia entre liquidado y recibido **es la comisión del convenio**.

**Errores de negocio:**
- `CASH_ACCOUNT_ALREADY_EXISTS` al crear una segunda cuenta de efectivo — *"Ya existe una cuenta de efectivo. Con un solo cajón, el arqueo diario cuenta un solo cajón: dos cuentas de efectivo harían que el cierre pida un número que no corresponde a ninguna de las dos. Si lo que necesitas es más efectivo disponible, trasládalo desde otra cuenta; si es guardar plata fuera del cajón, crea una caja fuerte."* (`BE/app/modules/accounts/service.py:82-89`)
- `ACCOUNT_CANNOT_FUND_PAYMENT` al trasladar DESDE una cuenta por cobrar — *"Una cuenta por cobrar no puede ser el origen de un traslado. Para registrar lo que el convenio consignó usa la liquidación, que además calcula la comisión."* (`BE/.../service.py:376-382`)
- Traslado HACIA una cuenta por cobrar (sin código propio, cae a `BAD_REQUEST`) — *"No se puede trasladar plata HACIA una cuenta por cobrar: esa cuenta refleja lo que un convenio te debe, y eso lo genera vender, no consignar."* (`BE/.../service.py:383-388`)
- Fecha futura de traslado — *"`transfer_date` no puede ser una fecha futura."* (`BE/.../service.py:392-394`) ← **nota: este mensaje muestra el nombre técnico del campo al usuario; puede valer la pena reportarlo aparte.**
- `CASH_SESSION_NOT_OPEN` en el traslado se intercepta con mensaje propio (`TransferDialog.tsx:130-135`).

---

## 10 · CAPITAL — `/capital`

**Ruta y permiso.** Guard **`capital.view`** (`FE/app/router.tsx:455-465`). Los tres permisos (`capital.view`, `capital.contribute`, `capital.withdraw`) **son Admin-only de fábrica** — el comentario l. 451-454 lo dice y `BE/app/modules/platform/service.py:88-94` los excluye del rol Moderador: *"cuánto puso el dueño y cuánto se ha llevado no es dato de mostrador"*.

**Qué se ve** (`FE/features/capital/pages/CapitalPage.tsx`):
- Cabecera: **"Capital del dueño"** / *"Aportes al negocio y retiros. No son ingresos ni gastos: mueven el patrimonio, no la utilidad del período."* (l. 165-166).
- **Card "Dónde está el capital, hoy"** (l. 67) con 4 datos: **Disponible** (*Cajón, bóveda y bancos*) · **Prestado** (*Capital en contratos vivos*) · **Inventario** (***Al costo, no al precio***) · **Capital total** (*La suma de los tres*) (l. 69-72).
- Bloque **"En el período ({desde} — {hasta})"** (l. 76-77; el período es **desde el 1 de enero del año en curso hasta hoy**, l. 19-22): **Utilidad** (*Ingresos − costo − gastos*) · **Aportes del dueño** · **Retiros del dueño** · **Utilidad sin repartir** (*Lo que se puede retirar*) (l. 80-88).
- **Aviso ámbar** si los retiros superan la utilidad (l. 90-96): *"Los retiros del período superan la utilidad: lo que se está sacando ya no es ganancia, es capital del negocio. No está prohibido —el dueño puede retirar lo suyo— pero es plata que deja de prestarse y de comprar mercancía."*
- Tabla de movimientos: # · Fecha · **Movimiento** (Aporte ↙ verde / Retiro ↗ ámbar) · Cuenta · Motivo · Monto (l. 118-160).

**Acciones:** **Registrar aporte** → `capital.contribute` (l. 169-173) · **Registrar retiro** → `capital.withdraw` (l. 174-178).

**Vacío:** **"Todavía no hay aportes ni retiros"** / *"Cuando el dueño meta o saque plata del negocio, cada movimiento queda acá con su fecha, su cuenta y su motivo."* (l. 194-195).

### Diálogo de aporte/retiro — **SIN Zod**
`FE/features/capital/components/CapitalMovementDialog.tsx`

| Campo | Etiqueta | Oblig./Opc. | Regla real |
|---|---|---|---|
| `accountId` | **"De qué cuenta sale"** (retiro) / **"A qué cuenta entra"** (aporte) (l. 158-159) | **Obligatorio** | `puedeGuardar` lo exige (l. 65). **Excluye las cuentas `settlement` y las inactivas** (l. 60) |
| `amount` | "Monto" (l. 190) | **Obligatorio** | `Number(amount) > 0` (l. 63) |
| `notes` | **"Motivo"** en retiro, **"Motivo (opcional)"** en aporte (l. 197-198) | **Obligatorio solo en el retiro** | `motivoValido = !esRetiro \|\| notes.trim().length > 0` (l. 64). Hint visible: *"Obligatorio: es plata que sale del negocio, y dentro de seis meses alguien va a preguntar por qué."* (l. 208-211) |

**Dos avisos (NO bloqueos — el backend es la autoridad, comentario l. 67-69):**
- Excede el saldo: *"Esa cuenta tiene $X. No se puede retirar más de lo que hay."* (l. 215-220)
- Excede la utilidad: **"Esto no es utilidad: es capital del negocio."** / *"En el período queda $X de utilidad sin repartir. Retirar por encima de eso reduce el capital con el que se presta y se compra."* (l. 222-231)

**Toast de éxito** con la lección incorporada (l. 109-113): *"Retiro registrado — No cuenta como gasto: sale del patrimonio, no del resultado del período."* / *"Aporte registrado — No cuenta como ingreso…"*

**Errores:** `CASH_SESSION_NOT_OPEN` → modal de caja (l. 117-121). `ACCOUNT_CANNOT_FUND_PAYMENT` si llega una cuenta por cobrar — *"Una cuenta por cobrar no sirve para esto: representa plata que todavía te deben, no un saldo del que se pueda meter o sacar dinero. Elige la cuenta real."* (`BE/app/modules/capital/service.py:69-76`).

---

## 11 · AUDITORÍA — `/auditoria`

**Ruta y permiso.** Guard **`audit.view`** (`FE/app/router.tsx:383-393`).

**Qué se ve** (`FE/features/audit/pages/AuditPage.tsx`):
- Cabecera: "Auditoría" / *"Registro de acciones sensibles — quién hizo qué y cuándo."* (l. 47).
- **Tres filtros** (l. 49-91): **Módulo** ("Todos los módulos") · **Tipo de entidad** ("Todas las entidades") · **Usuario** ("Todos los usuarios").
- Columnas: Fecha · **Usuario** (si el `user_id` es nulo muestra **"Sistema"**, l. 33) · Módulo · Acción · Entidad (l. 37-43). Las etiquetas legibles vienen de `FE/features/audit/labels.ts`.
- Clic en fila → `AuditDetailDialog` con el antes/después.

**Vacío:** **"Sin registros de auditoría"** / *"No hay acciones que coincidan con estos filtros."* (l. 100-101).

**Formularios:** ninguno. **Errores de negocio propios:** ninguno; solo el genérico de la tabla.

---

## 12 · MI PERFIL — `/perfil`

**Ruta y permiso.** **SIN guard de permiso** — cualquier usuario logueado entra (`FE/app/router.tsx:428-432`). El comentario l. 425-427 lo justifica: *"Editarse el nombre y la foto no es configurar la empresa"*.

**Qué se ve** (`FE/features/settings/pages/ProfilePage.tsx`):
- `BackLink` a **Configuración** (l. 48) + cabecera "Mi perfil" / *"Tu nombre y tu foto — lo que ve el resto del equipo."* (l. 49).
- **Dos tarjetas separadas a propósito** (docstring l. 102-104: *"son dos guardados distintos, con dos consecuencias distintas"*).

**Tarjeta 1 — datos** (**SIN Zod**, `useState` l. 27-29):
| Campo | Etiqueta | Oblig./Opc. | Validación |
|---|---|---|---|
| `fullName` | "Nombre" (l. 53) | **Obligatorio** | `!fullName.trim()` → *"El nombre no puede quedar vacío."* (l. 31, 57) |
| `photos` | "Foto" (l. 61) | Opcional | `maxPhotos={1}` (l. 63) |

- **Solo lectura, con el porqué a la vista** (l. 69-80): **Correo** — *"Se cambia desde el correo de acceso, no desde acá."*; **Rol** — *"Lo asigna un administrador desde Identidad."*
- Botón **"Guardar cambios"**, deshabilitado si no hay cambios (`dirty`, l. 32, 85).

**Tarjeta 2 — "Cambiar mi contraseña"** (l. 106-173, **SIN Zod**):
- Subtítulo: *"Se te pide la actual para que nadie pueda cambiarla desde tu pantalla si la dejas abierta."* (l. 136-138).
- Campos: **"Contraseña actual"** (l. 142) · **"Contraseña nueva"** (l. 150) · **"Confirmar contraseña nueva"** (l. 157).
- Validación manual (l. 113-115): mínimo **8 caracteres** → *"Mínimo 8 caracteres."* (l. 154); deben coincidir → *"Las contraseñas no coinciden."* (l. 161).
- Éxito: *"Tu contraseña quedó cambiada."* (l. 126).
- Errores mapeados en `FE/features/auth/api.ts:31-41`: `same_password`, `weak_password`, `over_request_rate_limit` (429), `session_not_found`/`bad_jwt`.

---

## 13 · CONFIGURACIÓN — `/configuracion` (+ `/configuracion/documentos`)

**Rutas y permisos.** Ambas con guard **`company.configure`** (`FE/app/router.tsx:399-423`).

**Qué se ve** (`FE/features/settings/pages/SettingsPage.tsx`): un solo formulario con un solo botón de guardar, a propósito (docstring l. 73-76). Secciones:
1. **Datos de la empresa** — Nombre comercial · Razón social (*"Nombre legal, si es distinto del comercial."*) · NIT / documento · Teléfono · Correo de contacto · Dirección (l. 184-201).
2. **Imágenes** — **Logo** (*"Se muestra en el encabezado de los documentos impresos."*) y **Firma de la empresa** (l. 207-225).
3. **Documentos** — con botón/enlace a **`/configuracion/documentos`** (l. 259-263) y los campos Nota de encabezado · Pie de página · Aviso legal (l. 266-280).
- Error de carga: botón **Reintentar** (l. 168-170).
- Botón **Guardar**, deshabilitado si `!isDirty` (l. 308).

### Formulario: Configuración — **SÍ tiene Zod**
`FE/features/settings/pages/SettingsPage.tsx:15-27`

| Campo | Etiqueta visible | Oblig./Opc. **según schema** | Validación |
|---|---|---|---|
| `name` (l. 16) | "Nombre comercial" (l. 184) | **Obligatorio** | `min(1)` → *"El nombre es obligatorio"* |
| `legal_name` (l. 17) | "Razón social" (l. 187) | **Opcional** | — |
| `tax_id` (l. 18) | "NIT / documento" (l. 190) | **Opcional** | — |
| `contact_email` (l. 19) | "Correo de contacto" (l. 196) | **Opcional** | **Sin `.email()`** — no valida formato, a diferencia de clientes y proveedores |
| `contact_phone` (l. 20) | "Teléfono" (l. 193) | **Opcional** | — |
| `address` (l. 21) | "Dirección" (l. 199) | **Opcional** | — |
| `logo_url` (l. 22) | "Logo" (l. 207) | Nullable | — |
| `signature_url` (l. 23) | "Firma de la empresa" (l. 225) | Nullable | — |
| `header_note` (l. 24) | "Nota de encabezado" (l. 266) | **Opcional** | `max(200)` → *"Máximo 200 caracteres"* |
| `footer_note` (l. 25) | "Pie de página" (l. 273) | **Opcional** | `max(300)` → *"Máximo 300 caracteres"* |
| `legal_notice` (l. 26) | "Aviso legal" (l. 280) | **Opcional** | `max(1000)` → *"Máximo 1000 caracteres"* |

**`/configuracion/documentos`** (`FE/features/settings/documentTemplates/pages/DocumentTemplatesPage.tsx`, 301 líneas): **no verificado** — no alcancé a leerla. Sé que existe, que usa el mismo permiso `company.configure` y que se llega desde el botón de la sección Documentos.

---

# §7 · CATÁLOGO CENTRAL DE ERRORES

Fuente: `/Users/mateojaramillo/projects/compraventa_app/frontend-starter/src/lib/api/errors.ts`, líneas 11-85.

**Aclaración estructural que vas a necesitar:** `errors.ts` **NO contiene mensajes al usuario** — solo la lista de códigos (`API_ERROR_CODES`) y el tipo `ApiError`. El comentario de cabecera (l. 6-8) lo dice: *"El comportamiento por código vive en los componentes que consuman estos errores — este módulo solo detecta y tipa el código."* **El texto que ve el usuario viene del backend** en `{code, message, details}` (`BE/app/core/errors.py:121-133`). Por eso abajo pongo el mensaje real, citando dónde se emite.

## A · Los que un empleado de mostrador SÍ va a encontrar

| Código | Línea en `errors.ts` | Qué ve el usuario / qué significa |
|---|---|---|
| **`CASH_SESSION_NOT_OPEN`** | 17 | **El más frecuente.** No se muestra como banner: dispara un modal **"Caja cerrada"** / *"Esta operación necesita una sesión de caja abierta hoy."* con botón **Abrir caja** si tenés `cashbox.open_close`, o el texto *"No tienes permiso para abrir la caja. Pídele a un administrador o al responsable del turno que la abra y vuelve a intentarlo."* (`FE/components/shared/CashSessionRequiredDialog.tsx:24-40`). Lo interceptan 9 pantallas (venta, contrato, abono, ampliación, ingreso, transformación, gasto, traslado, capital, devolución). |
| **`CASH_SESSION_ALREADY_OPEN`** | 18 | *"Ya hay una sesión de caja abierta."* (`BE/app/modules/cashbox/service.py:115`). Típico de dos personas abriendo a la vez. |
| **`LAST_ADMIN_SAFEGUARD`** | 23 | *"No se puede quitar/inactivar al último administrador activo de la empresa."* (`BE/app/modules/identity/service.py:147-149, 194-196, 336-338`). Se muestra en un panel explicativo, no en el banner genérico. |
| **`CANNOT_DEACTIVATE_SELF`** | 60 | *"No puedes desactivar tu propia cuenta. Si te vas de la empresa, pídele a otro administrador que lo haga."* (`BE/.../identity/service.py:182-186`). |
| **`CASH_OPENING_DIFFERENCE_UNJUSTIFIED`** | 66 | *"El conteo de apertura no coincide con el efectivo registrado; toda diferencia exige justificación."* (`BE/.../cashbox/service.py:130-136`). El diálogo lo pide antes; solo llega si alguien pega contra la API directo. |
| **`ACCOUNT_CANNOT_FUND_PAYMENT`** | 45 | *"Una cuenta por cobrar no puede pagar: representa plata que todavía te deben, no un saldo disponible. Elige la cuenta de la que sale realmente el dinero."* (`BE/.../cashbox/integration.py:205-211`). Variantes en traslado (`accounts/service.py:376-382`) y capital (`capital/service.py:69-76`). |
| **`ACCOUNT_NOT_OPERATIONAL`** | 71 | *"Una caja fuerte no es un punto de cobro: la plata entra y sale de ella solo por traslado. Elige el cajón o la cuenta por la que realmente se movió el dinero."* (`BE/.../cashbox/integration.py:228-234`). |
| **`CASH_ACCOUNT_ALREADY_EXISTS`** | 76 | *"Ya existe una cuenta de efectivo… Si lo que necesitas es más efectivo disponible, trasládalo desde otra cuenta; si es guardar plata fuera del cajón, crea una caja fuerte."* (`BE/.../accounts/service.py:82-89`). |
| **`CONTRACT_CLOSED`** | 21 | *"El contrato ya está cerrado; no admite abonos."* (`BE/.../contracts/service.py:644`) / *"…no admite ampliaciones."* (l. 1069). |
| **`CONTRACT_NOT_READY_FOR_AUCTION`** | 22 | *"El contrato no está listo para rematar (debe estar en prórroga vencida)."* (`BE/.../contracts/service.py:877-879`). |
| **`PAYMENT_PARTIAL_INTEREST_REJECTED`** | 20 | 422. Abono parcial de interés rechazado; mensaje relacionado: *"Solo se adeudan N mes(es) de interés."* (`BE/.../contracts/service.py:659-663`). |
| **`EXTENSION_WINDOW_CLOSED`** | 82 | *"Pasó la ventana para ampliar este préstamo. Vencía el {fecha}."* (`BE/.../contracts/service.py:1071-1075`). El panel de ampliación ya lo muestra ANTES de dejar intentar (`blocked_reason`); como error solo aparece en una carrera. |
| **`CONTRACT_INTEREST_OVERDUE`** | 83 | *"Primero hay que ponerse al día con los intereses. Registra el abono y vuelve a intentarlo."* (`BE/.../contracts/service.py:1082-1085`). |
| **`CONTRACT_WITHOUT_APPRAISAL`** | 84 | *"Sin avalúo no se puede calcular cuánto puede retirar el cliente. Regístralo en Editar y vuelve a intentarlo."* (`BE/.../contracts/service.py:1087-1091`). |
| **`SALE_ACCOUNT_NOT_SETTLED`** | 49 | *"Esta venta se cobró por una cuenta por cobrar (Sistecrédito) que todavía tiene saldo pendiente de liquidar: devolver en efectivo sacaría plata que el negocio nunca recibió. Usa nota crédito, o liquida la cuenta primero."* (`BE/.../sales/service.py:539-549`). |
| **`RETURN_TIME_LIMIT_EXCEEDED`** | 50 | *"La venta fue hace N días; el plazo configurado es de M. Se necesita el permiso 'sales.return_override_time_limit' para registrar una devolución fuera de plazo."* (`BE/.../sales/service.py:516-522`). ⚠️ El mensaje **muestra el código técnico del permiso al usuario** — vale la pena mencionarlo en la guía traducido a *"Registrar una devolución fuera del plazo configurado por la empresa"*. |
| **`CREDIT_NOTE_INSUFFICIENT_BALANCE`** | 51 | *"La nota crédito no tiene saldo suficiente."* (`BE/.../sales/service.py:193-196`). |
| **`USER_ALREADY_INVITED`** | 56 | *"Ya invitaste a esta persona y todavía no ha entrado. Para volver a darle acceso, abre su ficha en Usuarios y usa «Generar enlace de activación» — invitarla otra vez anularía el enlace anterior."* |
| **`USER_ALREADY_EXISTS`** | 57 | *"Esta persona ya existe en la empresa pero está inactiva. Reactívala desde su ficha en Usuarios…"* / *"Ya hay un usuario activo con ese correo en esta empresa."* |
| **`EMAIL_ALREADY_REGISTERED`** | 58 | *"Ese correo ya tiene una cuenta en la plataforma. Si la persona ya trabaja en esta empresa, genera el enlace desde su ficha en Usuarios; si no, invítala con otro correo."* |
| **`INVITE_RATE_LIMITED`** | 39 | *"Supabase limitó el envío de correos. Espera unos minutos e invita de nuevo."* — **no hay nada roto, hay que esperar.** Es el caso que el propio código separó a propósito para que el admin no salga a buscar un problema inexistente (`BE/.../auth_admin.py:56-70`). |
| **`PERMISSION_DENIED`** | 13 | Permiso faltante. El front lo trata especial: invalida `['me']` para autocorregirse (`FE/app/query-client.ts:14-17`) y las listas muestran *"Tu rol no tiene permiso para ver esto. Pídele a un administrador que te lo habilite."* (`FE/components/shared/DataTable.tsx:83`). Varias pantallas tienen su propia versión con el nombre del permiso. |
| **`SUBSCRIPTION_EXPIRED`** | 14 | *"La suscripción de la empresa no está vigente."* (`BE/app/core/security.py:199`). **Redirige a `/cuenta-bloqueada`** (`FE/app/router.tsx:130-131`) — toda la app queda inaccesible. Es de mostrador en el sentido de que el cajero lo va a ver, pero no puede resolverlo. |
| **`UNAUTHORIZED`** | 12 | Sesión caída. Redirige a `/auth/login` con `reason: 'inactive'` (`FE/app/router.tsx:133-137`). |

**Además, un caso sin código propio que SÍ es de mostrador y que conviene documentar:** venta de la última unidad en simultáneo → `BAD_REQUEST` con *"No hay suficiente cantidad disponible."* (`BE/app/core/errors.py:170-176`). El docstring l. 145-150 explica que antes esto devolvía un 500 y *"de cinco ventas simultáneas de la última unidad, cuatro respondían 500"*.

## B · Técnicos / de administración (no de mostrador)

| Código | Línea | Por qué no es de mostrador |
|---|---|---|
| `NOT_FOUND` | 15 | Genérico de recurso inexistente. |
| `VALIDATION_ERROR` | 16 | 422 de Pydantic. **Nunca debería verse como banner**: `applyServerErrors` lo reparte campo por campo (`FE/lib/forms/applyServerErrors.ts:88-102`). Solo cae a banner si no pudo señalar ningún campo. |
| `CONFLICT` | 25 | Genérico. En clientes se traduce a *"Ya existe un cliente con ese documento."* (`CustomerFormDialog.tsx:99`). |
| `BAD_REQUEST` | 26 | Genérico de 400. |
| `IDEMPOTENCY_KEY_REQUIRED` | 24 | *"Falta el header Idempotency-Key, obligatorio en operaciones de dinero."* (`BE/app/common/idempotency.py:15-17`). **Puramente técnico** — el front siempre la manda; si aparece, es un bug. |
| `AUTH_ADMIN_ERROR` | 35 | 502 envolviendo fallos de Supabase Auth Admin. *"No se pudo invitar al usuario en Supabase Auth."* / *"No se pudo generar el enlace de recuperación en Supabase Auth."* Solo un admin lo ve. |
| `AUTH_ACCOUNT_MISSING` | 59 | *"Este usuario ya no tiene cuenta de acceso: aparece en la lista de la empresa pero fue eliminado del sistema de autenticación…"* — dato descuadrado, de admin. |
| `CASH_SESSION_ALREADY_CLOSED_TODAY` | 27 | Era `ALREADY_CLOSED_TODAY`, un **código muerto** que nunca coincidió con nada. Corregido el 23/09/2026 (F20-01) — ver abajo. |
| `CONTRACT_LEGACY_CODE_EXISTS` | 28 | *"Ya existe un contrato con ese legacy_code en esta empresa."* (`BE/.../contracts/service.py:356-358`). Solo en la **importación de contratos del sistema anterior**, que es Admin-only (`contracts.import`). Migración, no mostrador. |
| `IMPORT_CAPITAL_EXCEEDS_PRINCIPAL` | 29 | Idem — solo en la importación (`BE/.../contracts/service.py:371`). |
| `IMPORT_DATES_MISALIGNED` | 30 | Idem (`BE/.../contracts/service.py:377`). |

## C · Tres desajustes reales entre el catálogo del front y lo que emite el backend

> ### ✅ Los tres corregidos el 23/09/2026 (F20-01, F20-02, F20-03)
>
> Se deja el diagnóstico original abajo porque explica **cómo** se encontraron y **por qué** ninguno se veía
> roto en pantalla, que es lo que los mantuvo vivos tanto tiempo. Pero el estado que describe **ya no es el
> actual**: `errors.ts` cataloga hoy `CASH_SESSION_ALREADY_CLOSED_TODAY`, `IDEMPOTENCY_IN_PROGRESS` y
> `MULTIPLE_REGISTERS_NOT_SUPPORTED`, y `tests/error-codes-contract.test.ts` falla si alguno vuelve a
> desalinearse. El punto 1 resultó tapar además a **F21-03**: con el código sin tipar, cualquier rama de UI
> que preguntara por «la caja de hoy ya se cerró» era **inalcanzable**.
>
> *Un documento de diagnóstico envejece igual que un comentario: lo que afirma del código de hoy hay que
> fecharlo.*

Esto lo encontré comparando ambos lados; conviene que lo sepas aunque no vaya en la guía de usuario.

1. **`ALREADY_CLOSED_TODAY` (`FE/lib/api/errors.ts:19`) nunca coincide.** El backend emite **`CASH_SESSION_ALREADY_CLOSED_TODAY`** (`BE/app/modules/cashbox/service.py:117-119`). Como `parseApiError` solo tipa los códigos que están en `KNOWN_CODES` (`errors.ts:89, 165`), este cae a `'UNKNOWN'`. El mensaje del backend igual llega y se muestra (*"La caja de hoy ya se cerró; no se puede abrir otra el mismo día."*), así que **el usuario no ve nada roto** — pero ninguna rama de UI puede reaccionar por código.
2. **`IDEMPOTENCY_IN_PROGRESS` no está en el catálogo del front.** El backend lo emite (`BE/app/core/errors.py:162-168`) con un mensaje muy orientado al usuario: *"Esta misma operación ya se está registrando. No la repitas: consulta el resultado en unos segundos."* Es **claramente de mostrador** (doble clic en "Vender"), pero como no está tipado cae a `UNKNOWN` y solo se ve el texto crudo.
3. **`MULTIPLE_REGISTERS_NOT_SUPPORTED` tampoco está** (`BE/app/core/errors.py:76`). Es técnico y el propio docstring dice que hoy no se puede llegar ahí por la API, así que es menos grave.

---

# Apéndice · Catálogo de permisos con su etiqueta oficial

Sacado de `/Users/mateojaramillo/projects/compraventa_app/backend-starter/supabase/seed.sql:15-78` y `/Users/mateojaramillo/projects/compraventa_app/backend-starter/supabase/migrations/00054_owner_capital.sql:153-159`. Te sirve para escribir *"pedile a un administrador el permiso «X»"* con el nombre exacto que el admin ve en la matriz.

**Contratos:** `contracts.auction` "Rematar contrato (crea artículo en inventario)" · `contracts.import` "Importar contratos del sistema anterior"
**Abonos:** `payments.create` "Registrar abonos y pagos" · `payments.apply_discount` "Aplicar descuento sobre intereses"
**Clientes:** `customers.view` "Ver clientes e historial cruzado" · `customers.create` "Crear y editar clientes"
**Catálogos:** `catalogs.view` "Ver categorías y proveedores" · `catalogs.manage` "Gestionar categorías y proveedores"
**Inventario:** `inventory.view` "Ver artículos y stock" · `inventory.create` "Crear artículos e ingresos de mercancía" · `inventory.exit` "Egresos de inventario (ajuste, daño, devolución)" · `inventory.pay_purchase` "Pagar compras pendientes a proveedores (saca plata de la caja)" · `inventory.transform` "Transformar inventario: fundir, despiezar o armar"
**Ventas:** `sales.view` "Ver ventas y su detalle" · `sales.create` "Registrar ventas" · `sales.void` "Anular venta (repone stock)" · `sales.apply_discount` "Aplicar descuento en venta" · `sales.return` "Registrar devolución de cliente" · `sales.return_override_time_limit` "Registrar una devolución fuera del plazo configurado por la empresa"
**Caja:** `cashbox.view` "Ver movimientos del día" · `cashbox.view_history` "Ver el histórico de cierres de caja (turnos de días anteriores)" · `cashbox.open_close` "Abrir y cerrar la caja diaria" · `cashbox.reopen` "Reabrir un cierre (excepcional, auditado)" · `cashbox.expense` "Registrar gastos"
**Cuentas:** `accounts.view` "Ver cuentas y sus saldos" · `accounts.manage` "Crear y editar cuentas" · `accounts.settle` "Liquidar cuentas por cobrar (Sistecrédito)" · `accounts.transfer` "Trasladar plata entre cuentas propias (consignar el efectivo)"
**Identidad:** `identity.manage_users` "Invitar, editar e inactivar usuarios" · `identity.manage_roles` "Crear roles y editar permisos"
**Capital:** `capital.view` "Ver los aportes de capital y los retiros del dueño" · `capital.contribute` "Registrar un aporte de capital del dueño al negocio" · `capital.withdraw` "Registrar un retiro de utilidades o de capital hacia el dueño"
**Otros:** `reports.view` "Dashboard y reportes" · `audit.view` "Consultar auditoría" · `company.configure` "Configurar empresa (logo, firma, parámetros)"

**Roles semilla** (`BE/app/modules/platform/service.py:96-103`): **Admin** = todos · **Moderador** = todos menos la lista de `_MODERADOR_EXCLUDED_CODES` (l. 53-93: no crea inventario, no abre/cierra caja, no aplica descuentos, no mueve plata entre cuentas, no ve auditoría ni capital) · **Asesor** = `_ASESOR_CODES` (l. 28-42: contratos, abonos, clientes, ver inventario, ventas, ver catálogos, ver caja, ver cuentas) · **Bodega** = `_BODEGA_CODES` (l. 44-50: ver y crear inventario, gestionar catálogos, ver clientes).

---

## Qué NO pude verificar (no lo supongas)

- `/configuracion/documentos` (`DocumentTemplatesPage.tsx`, 301 líneas) — **no verificado**, no la leí.
- `/proveedores/$supplierId` (`SupplierDetailPage.tsx`, 172 líneas) — solo verifiqué su ruta y permiso, no su contenido.
- El detalle completo de `ReturnFormDialog.tsx` (devolución de venta) — verifiqué solo que intercepta `CASH_SESSION_NOT_OPEN` (l. 137) y los tres errores de negocio del backend.
- Los KPIs exactos de la pestaña "Período" de Reportes entre las líneas 180-420 de `ReportesPage.tsx` — listé los que aparecen en el grep, pero no leí el archivo completo (676 líneas).
- `KardexDialog.tsx` y `TransformationDetailDialog.tsx` (inventario) — no leídos.
- El contenido de `FE/features/audit/labels.ts` (traducciones de acciones y entidades) — sé que existe y dónde está, no lo listé.

**No modifiqué ningún archivo.**