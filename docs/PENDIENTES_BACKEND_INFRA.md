# Pendientes para revisar con backend/arquitectura/infraestructura

> Documento de traspaso — no es una queja sobre el backend, es la lista concreta de huecos reales encontrados construyendo el front, para decidir en equipo qué se resuelve y en qué orden. Cada punto dice qué se verificó, cómo, y por qué importa para el negocio (no solo técnicamente). Última actualización: 19/08/2026 (segunda revisión — se suman los puntos 13 a 18: reportes, panel de plataforma, ajustes de usuario, paginación, edición de artículos de remate, resumen financiero).
>
> **Tercera revisión (backend, mismo día):** puntos 1, 3, 4, 17 y la mitad de 14 (`PlanOut.modules` + `CompanyOut` con plan/suscripción) ya resueltos — ver la nota "✅ Resuelto" en cada uno. Puntos 10 y 14 (auditoría) además tenían un diagnóstico distinto al reportado — corregido inline, no era el bug descrito originalmente.
>
> **Cuarta revisión (backend, mismo día):** se suma el punto 19 (`ContractItemOut.inventory_item_id`, reportado por el front después de la tercera revisión) — también resuelto.
>
> **Quinta revisión (front, mismo día):** puntos 8, 13 y 18 (Reportes/resumen financiero) resueltos del lado del front sin esperar backend nuevo — pantalla `/reportes` construida agregando `GET /reports/closings` + `GET /cashbox/sessions/{id}/report`, client-side, con tope de 90 días. Punto 20 (latencia de `GET /catalogs/categories`) sigue pendiente de backend. Punto 13 se mantiene abierto para rangos >90 días, cartera histórica y series largas.
>
> **Sexta revisión (auditoría de código, 19-20/08/2026):** revisión completa de ambos repos pedida por el cliente. Se encontró y cerró un hueco contable serio que no estaba en esta lista (las compras a proveedor nunca generaban movimiento de caja, punto 21) y se resolvieron los puntos 5 y 22 con un solo endpoint nuevo (`/company/settings`). Se agregan los puntos 21 a 24 con lo encontrado y lo que queda abierto.

---

## 21. ✅ Las compras a proveedor no generaban movimiento de caja (RESUELTO)

El enum `cash_concept` define `'purchase'` — *"compra a proveedor (out, store)"* — desde la migración 00007, el día uno. **Nunca se emitía:** `inventory/service.py` jamás llamaba a `cashbox.record_movement` (confirmado con grep sobre todo el backend: `purchase` solo aparecía como `EntryOriginType`).

**Por qué importaba para el negocio:** `expected_cash` = `opening_balance + movimientos en efectivo`. Comprar $3.000.000 de mercancía en efectivo dejaba al sistema esperando esos $3.000.000 en el cajón, y la política es *"sin tolerancia, justificación obligatoria"* — o sea que el operador quedaba obligado a justificar a mano un descuadre **que el propio sistema fabricaba**, todos los días en que se compró mercancía. Eso invalida el acta de cierre.

**✅ Resuelto (20/08/2026):** migraciones 00014-00016. `create_entry` exige sesión de caja abierta cuando `origin_type='purchase'`, pide `payment_method` y emite el movimiento en la misma transacción. Los ingresos `other` y los remates siguen sin tocar caja a propósito (un remate no mueve dinero: el capital ya salió como préstamo). De paso, `POST /inventory/entries` ahora exige `Idempotency-Key` — violaba la regla 4 del propio backend y un doble click duplicaba ingreso, stock y costo.

## 22. ✅ `GET/PATCH /company/settings` (RESUELTO) — cierra también el punto 5

Era el punto 5 de esta lista, arrastrado desde el paso 5. Las columnas `company.signature_url` y `logo_url` existían **desde la migración 00002** (`signature_url` incluso con el comentario *"firma empresarial insertada en los PDF de contratos"*), pero no había endpoint.

**✅ Resuelto (19/08/2026):** módulo `company` nuevo, permiso `company.configure`. Los textos de documentos viven en `company.settings->documents`. `GET /me` también expone firma, razón social, NIT, dirección, teléfono y los textos — **imprimir un contrato lo hace cualquier asesor**, que no tiene `company.configure` ni debería. Requirió la migración 00017: `public.company` tenía RLS forzado con una sola política de `SELECT`, así que el `UPDATE` afectaba cero filas y el endpoint respondía 200 con los datos viejos.

## 23. ✅ Búsqueda y filtros en `GET /inventory/items` (RESUELTO)

Aceptaba únicamente `status`. En el mostrador el vendedor tiene el código impreso en la etiqueta (`JAO0003R`) y no tenía dónde escribirlo.

**✅ Resuelto (20/08/2026):** `q` (código por prefijo case-insensitive + nombre full-text español), `cat1_id`/`cat2_id`/`cat3_id`, `supplier_id` y `origin`. Cuidado con `code`, que es NULL en borradores: `like` sobre NULL da NULL, no false, así que sin `coalesce` un borrador nunca aparecía al buscar por nombre.

Esto además quitó un techo duro real en el POS: `useAvailableItemsSearch` traía 100 artículos disponibles y filtraba en el navegador, así que **con más de 100 disponibles a la vez un artículo no se podía encontrar — ni vender**.

## 28. ✅ Cuentas: dónde está la plata (RESUELTO — back y front)

Punto 8 del cliente (*"¿qué posibilidad hay de agregar cuentas con las cuales hacer los desembolsos?"*), vuelto urgente porque **el cliente vende con Sistecrédito**: el comprador se lleva el artículo, Sistecrédito asume el riesgo y le paga a la compraventa después, menos comisión. Con solo `payment_method` eso caía en `Otro`, indistinguible de un cobro por Nequi — y no es plata que entró, es plata que **te deben**.

**Backend** (migraciones 00024–00027): catálogo `account` con tres tipos (`cash`/`bank`/`settlement`), `account_id` en las cinco tablas de dinero, saldo **derivado** (nunca almacenado), `POST /accounts/{id}/settle` para liquidar convenios con comisión derivada, y `account_id` ya obligatorio en `cash_movement`. Detalle en `backend-starter/docs/ARCHITECTURE.md` §12 y `API_GUIDE.md` §13.

**Front**: pantalla `/cuentas` (listado por tipo con saldo, alta/edición, liquidación) y `AccountPicker` en los cinco puntos de cobro. Ver `docs/IMPLEMENTATION.md`, bloque "Cuentas: dónde está la plata".

Dos cosas quedaron **fuera de alcance a propósito**:

- **Datáfono.** El cliente confirmó que hoy no usa. El tipo `settlement` ya lo modela cuando lo tenga (un datáfono es exactamente lo mismo: cobras hoy, el adquirente te consigna después menos comisión).
- **Conciliación bancaria** (importar extracto y casar movimientos). El saldo por cuenta es la base necesaria; el casado automático es otro proyecto.

## 29. ✅ Permisos: auditoría completa del catálogo (RESUELTO)

Salió de dos reportes seguidos: el módulo de cuentas no aparecía en la matriz de roles, y quitarle contratos a un rol dejaba el módulo visible igual. La revisión completa encontró cuatro cosas:

- **Cuentas sin permisos propios** (migración 00029). Reusaba `cashbox.view`/`company.configure`, así que no era parametrizable. Y `settle` —que MUEVE PLATA— colgaba de un permiso de lectura: quien pudiera mirar la caja podía liquidar Sistecrédito.
- **`sales` sin `sales.view`** (00030). Listar ventas exigía `sales.create`: imposible tener un rol que solo revisara.
- **`catalogs` sin `catalogs.view`, y sus cuatro GET sin ningún permiso** (00030). Violaba la regla 3 de `CLAUDE.md`.
- **Seis módulos del front sin gate de menú ni guard de ruta**: Contratos, Ventas, Inventario, Clientes, Caja y Catálogos — el comentario del propio `AppShell` ya lo reconocía como "pendiente sistemático".

Contratos, en cambio, **estaba bien por el backend** desde siempre: cada endpoint con su permiso.

**Regla que queda** (`backend-starter/docs/ARCHITECTURE.md` §12): un módulo nuevo trae sus propios permisos desde el día uno, con la separación mínima `view`/`manage` más un permiso aparte (`is_special`) por cada acción que mueva plata o sea irreversible. Al agregarlos a un módulo ya en producción, la migración debe otorgarlos a quien tuviera los equivalentes — salvo cuando el mapeo viejo *era* el error, que se documenta explícitamente.

## 30. Pendientes operativos para entregar a un cliente (ninguno es de código)

Detalle en `ESTADO.md`, en la raíz del workspace. En orden, y el primero desbloquea a los demás:

1. **Dominio propio.** Desbloquea el SMTP (Resend), quitar el candado de Vercel Deployment Protection —que hoy impide que un invitado externo abra siquiera la app— y dejar de mostrar una URL de preview a un cliente.
2. **Ambiente de producción**: proyecto Supabase de prod + `compraventa-backend-prod` en Fly + variables en Vercel. Sin tocar código.
3. **SMTP propio.** El correo incluido de Supabase limita los envíos y no sirve para producción. Mitigado mientras tanto por el botón "Generar enlace" al invitar, que no manda correo ni consume cuota.

## 24. Lo que sigue abierto después de esta auditoría

En orden de valor:

1. ~~**Costo de ventas / utilidad bruta por período.**~~ **✅ Resuelto (20/08/2026)** — migración 00019 (`sale_line.unit_cost`, congelado al vender) + `GET /reports/profit?from_date&to_date`. Ver punto 26. Queda pendiente la rentabilidad del **empeño** (intereses cobrados contra capital inmovilizado), que es una pregunta distinta: rendimiento sobre capital, no margen sobre costo.
2. **Agregación de caja por rango de fechas** (punto 13.1) — sigue siendo la mejor relación esfuerzo/valor: `GET /cashbox/sessions/{id}/report` ya calcula módulo×concepto×medio para UNA sesión; falta lo mismo sumando N sesiones. Quitaría el N+1 y el tope de 90 días del front.
3. **`?q=` en `GET /contracts`** (punto 2, sin resolver) — el buscador de contratos sigue siendo un parche client-side de 200 registros que nunca busca por nombre de cliente.
4. **`GET /platform/companies/{id}/audit-log`** (punto 14) — un super-admin no puede ver la auditoría de otra empresa por RLS. **El lado de suscripciones ya se resolvió** con la tabla `subscription_event` (migración 00018, ver punto 25): altas, renovaciones con monto y notas, suspensiones, reactivaciones y vencimientos. Lo que sigue faltando es la auditoría de SEGURIDAD de otra empresa (cambios de roles, remates, anulaciones) — son cosas distintas.
5. **Conteo por denominación en el cierre de caja** — hoy `counted_cash` es un solo número. Todo software de caja serio pide el conteo por billete y lo suma solo; reduce errores y hace el acta auditable.
6. **`PATCH /me`** (punto 15) — sigue sin existir; no hay pantalla de perfil.
7. **Latencia de `GET /catalogs/categories`** (punto 20) — ~4s consistentes en dev.
8. **`max_users` en `PlanOut`** (punto 14) — necesita columna nueva; el resto de `PlanOut` ya se resolvió.

## 25. ✅ Historial comercial de la suscripción (RESUELTO)

Cierra la mitad del punto 14. El `audit_log` **sí** registraba las extensiones, pero no servía como historial por dos razones distintas: es tenant-scoped por RLS (un super-admin nunca puede leer el de otra empresa, así que el rastro existía y era inalcanzable) y solo guarda `expires_at`, así que las `notes` de cada renovación se perdían — la fila de `subscription` también las sobrescribe, porque extender hace `UPDATE` sobre la única fila `active`.

**✅ Resuelto (20/08/2026):** migración 00018, tabla `subscription_event` + `GET /platform/companies/{id}/subscription/events`. Registra los cinco eventos (`created`, `extended`, `suspended`, `activated`, `expired`), con monto pagado y notas por renovación. `SubscriptionExtendIn` acepta `amount` opcional.

Son dos registros con propósitos distintos y se dejaron separados a propósito: `audit_log` es el registro de seguridad (responde a una auditoría), `subscription_event` es el comercial (responde a "¿esta empresa está al día y cuánto ha pagado?").

RLS habilitado y forzado **sin políticas**: solo `platform` lo toca, con sesión de bypass. Ningún tenant puede leerlo ni siquiera el suyo, porque incluye montos de la relación comercial con la plataforma. Si se decide mostrarle a una empresa su propio historial de pagos, se agrega una política de `SELECT` acotada — es decisión de producto, no un olvido.

---

## 1. Búsqueda de clientes: solo por nombre, no por documento

`GET /customers?q=` hace full-text search **solo sobre `full_name`** — confirmado contra el backend real: `?q=123456789` (número de cédula exacto de un cliente que sí existe) devuelve `items: []`, mientras que `?q=Juan`/`?q=Pérez`/`?q=juan perez` sí lo encuentra.

**Por qué importa para el negocio, no solo técnicamente:** en el mostrador de una compraventa, el cliente casi siempre entrega su cédula física — el operador tipea el número, no el nombre. Con el buscador actual, si no recuerda cómo está escrito el nombre exacto en el sistema, no puede encontrarlo por documento aunque lo tenga en la mano. Esto afecta directamente **crear contrato**, **venta con cliente registrado**, y cualquier flujo que use `CustomerPicker`.

**Sugerencia:** que `?q=` busque también por `doc_number` (coincidencia exacta o prefijo, no necesita ser full-text ahí — un documento se busca completo o casi completo, no por fragmentos como un nombre).

**✅ Resuelto (19/08/2026):** `?q=` en `GET /customers` ahora matchea `doc_number` (exacto o prefijo) además del full-text de `full_name`. Ver `docs/pending/API_GUIDE.md` §5.

**Del lado del front, ya resuelto (19/08/2026):** no había nada que cambiar en la búsqueda (ya mandaba `q` tal cual al backend) — solo se actualizó el placeholder de `CustomersPage`/`CustomerPicker` de "Buscar por nombre…" a "Buscar por nombre o documento…" para que la UI refleje la capacidad nueva.

## 2. `GET /contracts` sin `?q=` — buscador de contratos es un parche client-side

Confirmado: el único filtro es `?status=`. El front ya tiene un buscador (agregado en la revisión post-paso-10) pero es un parche: trae los primeros 200 contratos y filtra en el navegador por número o código anterior — **nunca por nombre del cliente**, porque `ContractOut` solo trae `customer_id`, no el nombre, y resolverlo fila por fila sería un request por cada uno.

**Sugerencia:** `?q=` en `GET /contracts` que busque por número de contrato, `legacy_code`, y — si es razonable del lado del backend — nombre/documento del cliente (un `JOIN` contra `customer`, que el front no puede hacer eficientemente).

**✅ Resuelto en parte (27/08/2026):** `GET /contracts` ya acepta `?customer_id=` (mismo patrón que `?customer_id=` de `GET /sales`, punto 3 abajo) — resuelve el historial de cliente, que era el consumidor real de este parche. `?q=` por número/`legacy_code`/nombre de cliente (búsqueda libre, no por id) sigue sin existir.

## 3. `GET /sales` no tiene NINGÚN filtro (ni siquiera `status`)

Confirmado en el schema: `{cursor?, limit?}` únicamente. Ni `customer_id`, ni `status`, ni fecha. Esto bloquea two cosas:
- El historial de cliente (`/clientes/$id`) trae hasta 200 ventas y filtra por `customer_id` en el navegador — mismo parche que el punto 2, con el mismo techo de 200.
- No hay forma de, por ejemplo, listar solo ventas anuladas, o ventas de un rango de fechas, sin traer todo y filtrar en el front.

**Sugerencia:** al menos `?customer_id=` y `?status=` en `GET /sales` — son los dos filtros que ya tiene `GET /contracts` y que la simetría entre ambos módulos sugiere que deberían coincidir.

**✅ Resuelto (19/08/2026):** `GET /sales` ya acepta `?customer_id=` y `?status=`. Ver `docs/pending/API_GUIDE.md` §10. `?q=` con número de contrato/`legacy_code`/cliente en `GET /contracts` (punto 2) y filtros de fecha en `GET /sales` (parte del punto 13) siguen pendientes.

**Del lado del front, ya resuelto (19/08/2026):** `useCustomerSales` (`features/customers/history.ts`) pasó del parche de traer 200 ventas y filtrar en cliente a `useCursorInfiniteQuery` con `?customer_id=` real — paginado de verdad en el historial de cliente. `useCustomerContracts` se dejó igual entonces porque `GET /contracts` (punto 2) no tenía `?customer_id=` — **ya resuelto también (27/08/2026):** `useCustomerContracts` ahora manda `?customer_id=` real al backend en vez de filtrar 200 contratos en el navegador (sigue sin paginar por cursor, a diferencia de `useCustomerSales`, porque la ficha de cliente no tiene "cargar más" para contratos todavía — mismo `limit=200` pero ya filtrado en el servidor, no en el cliente).

## 4. `CompanyOut` (panel de plataforma) no trae plan ni fecha de expiración de suscripción

Ya documentado en `docs/RECOMENDACIONES.md` §1.8 — se repite acá porque es exactamente el tipo de cosa que esta lista busca centralizar. Un super-admin puede extender una suscripción sin ver la fecha de expiración actual.

**✅ Resuelto (19/08/2026):** `CompanyOut` (creación, detalle y listado) trae `plan_code`/`plan_name`/`subscription_expires_at` de la suscripción `active` actual (LEFT JOIN — `null` si no hay ninguna, nunca desaparece la fila). Ver `docs/pending/API_GUIDE.md` §3.

**Del lado del front, ya resuelto (19/08/2026):** columnas de Plan y Suscripción vence en `CompaniesPage` (la fecha en rojo si ya venció), y el bloque de info de `CompanyDetailDialog` ahora muestra las 4 celdas (Estado, Creada el, Plan, Suscripción vence) en vez de 2 — el texto de ayuda de "Extender suscripción" ya no dice que la fecha no se puede mostrar. Verificado en vivo contra las 2 empresas de prueba reales.

## 5. `GET/PATCH /company/settings` — bloquea dos cosas, no solo "Configuración"

Ya en el backlog original del backend (`docs/pending/API_GUIDE.md` §15) como pendiente de la pantalla "Configuración". La revisión post-paso-10 encontró que **también** bloquea la firma de la empresa en el documento imprimible del contrato — `docs/pending/CONTEXTO.md` §3 pedía explícitamente que la firma se insertara automáticamente en el PDF de todos los contratos nuevos, y hoy no hay dónde subirla ni de dónde leerla. El documento imprimible del front (`ContractPrintView.tsx`) deja dos líneas en blanco para firmar a mano en vez de eso. Detalle completo en `docs/RECOMENDACIONES.md` §1.9.

## 6. PDFs (contrato firmado, acta de cierre) — siguen sin generarse

Decisión ya tomada explícitamente (backend §15: "requieren Storage + una librería de PDF, fuera de alcance"). El front cubre ambos con vistas imprimibles (`PrintLayout`, `@media print`) mientras tanto — funcionan, pero no son un PDF descargable/archivable, son "imprime desde el navegador". Si en algún momento se prioriza un PDF real server-side, sería quien reemplace esto, no algo que el front necesite rehacer.

## 7. `GET /reports/series` — serie mensual para el dashboard

Ya en backlog aceptado (`docs/pending/API_GUIDE.md` §15). El dashboard hoy solo tiene KPIs de hoy/mes, sin gráfica de tendencia. Sin cambios desde la última revisión.

## 8. Definir con el cliente qué va en "Reportes" y "Configuración"

- **✅ "Reportes" resuelto (19/08/2026) — pantalla `/reportes` construida.** El cliente pidió explícitamente ir más allá de un listado de reportes: un centro de información financiera con rango de fechas (o un día específico), ingresos vs gastos separando lo operativo del movimiento de capital, intereses cobrados, capital abonado/desembolsado, ventas, cartera actual y el % de participación Empeño vs Tienda. Se pudo construir SIN backend nuevo agregando `GET /reports/closings?from_date&to_date` + `GET /cashbox/sessions/{id}/report` por cada sesión del rango (client-side, `sumMoney` decimal-safe, tope de 90 días — ver punto 13). Detalle completo en `docs/IMPLEMENTATION.md`.
- **"Configuración"** sigue bloqueada por el punto 5. Cuando exista el endpoint, falta decidir el alcance exacto: ¿solo logo/firma/timezone, o también parámetros de negocio (tasas por defecto, ventanas de mora) que hoy solo se editan por categoría?

## 9. Verificación en vivo pendiente por falta de una segunda cuenta de prueba

Dos caminos de código están implementados pero **nunca se dispararon de verdad** contra el backend, porque hacerlo hubiera arriesgado la única sesión de administrador activa usada para todas las pruebas de esta integración:
- `LAST_ADMIN_SAFEGUARD` (paso 8, identity) — el modal explicativo existe, pero nunca se forzó el rechazo real desde el backend.
- El camino negativo del guard de `/platform` (paso 10) — un usuario autenticado SIN el claim `app_metadata.platform_role=super_admin` debería rebotar a `/`; solo se verificó el camino "sin sesión en absoluto".

**Para desbloquear esto:** una segunda cuenta Admin activa en la empresa de pruebas (para el primero) y una cuenta cualquiera sin el claim de plataforma (para el segundo) — no es un cambio de backend, es un pendiente operativo de tener más cuentas de prueba disponibles.

## 10. Comportamiento de "meses completos" en el límite exacto — confirmar si es intencional

Al fabricar datos de prueba con `POST /contracts/import` se encontró un comportamiento consistente y repetible, no un error aislado: si `interest_paid_until` queda **exactamente** a N meses calendario de hoy (ej. hoy 19/08, `interest_paid_until` = 19/07 → exactamente 1 mes), `months_owed` cuenta **N-1**, no N — hace falta que `interest_paid_until` sea al menos un día más viejo (18/07) para que cuente como el mes completo. Se confirmó dos veces con datos distintos (1 mes y 3 meses de diferencia), mismo resultado ambas veces.

No se reporta como bug — probablemente es intencional (no se penaliza el día exacto del vencimiento, hay que estar realmente *pasado* del mes) y de hecho suena razonable para no ser injustos con el cliente. Se deja anotado para que quede confirmado explícitamente como comportamiento esperado, no algo que alguien "arregle" después sin saber que ya se decidió así.

**Diagnóstico corregido (backend, 19/08/2026):** corrí `months_between` con las fechas reales de `DEMO-MORA-1MES`/`DEMO-MORA-1MES-B` contra el "hoy" real de ahora mismo — los dos calculan `N` exacto, no `N-1`; no hay ningún corrimiento de límite. Lo que pasó: `DEMO-MORA-1MES` se creó (probablemente 08-18) cuando en ESE momento le faltaba un día para el mes completo (correcto, 0 meses adeudados en ese instante), y el `status` quedó grabado con esa foto — el sistema recalcula al leer (`GET /contracts/{id}`) o por el job nocturno, nunca solo, así que un registro sin releer desde entonces queda con el estado de cuando se creó (`CLAUDE.md`: "el estado del contrato solo lo calcula el servicio + job nocturno"). Confirmado en vivo: un `GET /contracts/{id}` sobre ese mismo contrato ahora lo corrige a `in_arrears` sin tocar nada más. No hay cambio de código que hacer.

## 11. Cómo probar como super-admin (no es un pendiente, es documentación que faltaba)

La cuenta de pruebas que se ha usado durante toda la integración (`mateojaras@gmail.com`) **ya tiene** el claim `app_metadata.platform_role: "super_admin"` configurado en Supabase Auth — confirmado contra el JWT real. Entrar a `/platform` con esa misma sesión ya funciona hoy, sin nada que configurar. No hay flujo de auto-servicio para volverse super-admin (por diseño: `docs/pending/ARCHITECTURE.md` §5 — "se fija manualmente en Supabase Auth, una sola vez, fuera de la app") — para dar ese claim a otra cuenta hace falta entrar al dashboard de Supabase Auth de ese proyecto y editarlo a mano en `app_metadata`.

## 12. Datos de prueba generados para cubrir todos los estados de contrato

Para poder probar abonos/mora/prórroga/remate de verdad (pedido explícito), se usó `POST /contracts/import` para fabricar contratos con fechas ya vencidas en varios estados. Quedan en el ambiente de dev, con `legacy_code` autoexplicativo:

| # | legacy_code | Estado | Para qué sirve |
|---|---|---|---|
| 9 | `DEMO-MORA-1MES-B` | En mora (1 mes) | Probar el flujo normal de abono de 1 mes |
| 10 | `DEMO-MORA-2MESES` | En mora (2 meses) | Probar abono parcial (1 de 2) o completo |
| 11 | `DEMO-MORA-CON-ABONO` | En mora, con 1 abono ya registrado | Ver el historial de abonos con datos reales |
| 12 | `DEMO-PRORROGA` | Prórroga activa (NO vencida) | Confirmar que "Rematar" correctamente NO aparece todavía |
| 13 | `DEMO-LISTO-REMATE` | Prórroga vencida | Probar "Rematar" en vivo, sin auctionar (a diferencia del #5, que ya se rematō probando el bug de la revisión anterior) |
| 14 | `DEMO-PARA-PAGAR` | Pagado (capital + interés saldados) | Ver un contrato cerrado, con la prenda `returned` |
| 8 | `DEMO-MORA-1MES` | Quedó en `active`, no `in_arrears` como su nombre sugiere | Efecto colateral real del punto 10 de arriba (límite exacto de 1 mes) — se deja como evidencia del hallazgo, no se puede borrar (no hay `DELETE` de contratos) |

Todos con `Anillos de oro` como categoría (la única nivel 3 que existe hoy en la empresa de pruebas) y prendas/montos variados para que se vean distintos en las listas.

---

## 13. Reportes — qué falta para separar contabilidad de tienda y contratos con claridad

Pedido explícito: "qué necesitamos del backend para hacer los reportes de forma clara". Hoy existe `GET /reports/dashboard` (KPIs de hoy/mes), `GET /reports/closings` (histórico de cierres) y `GET /cashbox/sessions/{id}/report` (desglose módulo×concepto×medio, pero **solo de UNA sesión a la vez**).

**✅ Punto 1 resuelto del lado del front (19/08/2026), sin esperar backend nuevo — `/reportes`.** En vez de un endpoint de agregación por rango, el front trae `GET /reports/closings?from_date&to_date` (la lista de sesiones cerradas del rango) y llama `GET /cashbox/sessions/{id}/report` por cada una (`Promise.all`), agregando client-side con `sumMoney` (decimal-safe, sin negocio inventado — solo suma lo que el backend ya calculó por sesión). Con eso, `/reportes` ya muestra: ingresos/gastos operativos separados del movimiento de capital (ver nota de modelado abajo), intereses cobrados, capital abonado/desembolsado, ventas, % Empeño vs Tienda, tendencia diaria y desglose módulo×concepto×medio — para un rango de hasta 90 días (tope explícito: el mecanismo es N+1, una request por sesión de caja, ~1/día). Detalle completo en `docs/IMPLEMENTATION.md`.

**Hallazgo de modelado financiero, no solo de UI:** la primera versión sumaba TODO lo que entra como "ingresos" y TODO lo que sale como "gastos" — eso metía `capital_payment` (capital recuperado) dentro de ingresos y `loan_disbursed` (préstamo entregado) dentro de gastos, dando una "utilidad" falsa (prestar dinero no es un gasto, se convierte en cartera; recuperarlo no es ingreso, reduce esa cartera). Se corrigió antes de dar el trabajo por terminado: "Ingresos operativos"/"Gastos operativos"/"Utilidad operativa" ahora usan solo `interest_payment`+`sale` (ingreso) y `expense` (gasto); el movimiento de capital vive en su propia card, rotulada explícitamente "no es ingreso ni gasto".

Lo que SIGUE bloqueado por backend, en orden de prioridad:
1. **Rangos de más de 90 días.** El mecanismo N+1 del front no escala más allá de eso (cientos de requests). Para trimestres/años hace falta la agregación real en el backend — la extensión natural de `GET /cashbox/sessions/{id}/report` pero sumando N sesiones en el servidor, no en el navegador.
2. **`GET /reports/series?months=12`** — ya estaba en el backlog aceptado del backend (`docs/pending/API_GUIDE.md` §15) desde antes de este documento. Sin esto, la "tendencia diaria" de `/reportes` solo puede cubrir el mismo tope de 90 días del punto anterior.
3. **Filtros de fecha en `GET /sales`** — mismo punto 3 de la primera revisión de este documento. Los TOTALES de venta del rango sí salen de la agregación de caja (arriba), pero el detalle por factura individual dentro de un rango sigue sin poder listarse. **Actualización (19/08/2026):** también bloquea a "prendas más vendidas"/"categorías más movidas" (pedidas por el cliente en el rediseño v2) — se construyeron igual, pero como **histórico completo** (todas las ventas de siempre, no el rango elegido en el date picker), rotulado explícitamente así en la UI — decisión confirmada con el cliente en vez de fingir un filtro de fecha que el backend no soporta. Con este filtro, podrían acotarse al rango como el resto de la pantalla.
4. **Cartera histórica** (`capital_outstanding` en una fecha pasada, no solo "hoy"). `/reportes` muestra la cartera actual como snapshot rotulado "corte de hoy", separado a propósito del rango elegido — no hay forma de mostrar "cartera al 15/07" sin esto.

Menor prioridad, útiles pero no bloqueantes:
- Capital desglosado por estado en pesos (hoy el dashboard da el *conteo* de contratos por estado, no cuánto capital hay en mora vs. vigente vs. prórroga).
- Utilidad de ventas (costo del artículo vs. precio de venta — cruzar `item.cost` contra `sale_line.unit_price`, hoy no se agrega en ningún endpoint).
- Contratos rematados en un período + valor recuperado.
- Antigüedad/rotación de inventario (artículos `available` hace más de N días sin venderse).

## 14. Panel de plataforma — no se ve fecha de expiración, ni historial de cambios de suscripción

Al entrar como super-admin (punto 11), la lista y el detalle de empresas no muestran ni el plan ni la fecha de expiración — ya documentado como punto 4 de este archivo y en `docs/RECOMENDACIONES.md` §1.8. Verificando más a fondo para esta revisión, aparecieron dos problemas adicionales, uno de ellos más serio que el original:

- **`PlanOut` no trae lo que `docs/pending/CONTEXTO.md` §3 dice que un plan debería tener.** El documento describe planes con *"módulos habilitados, límite usuarios, precio"* — el schema real (`PlanOut`) solo trae `{id, name, code, price, active}`. No hay forma de que el front muestre "este plan permite hasta 5 usuarios" ni qué módulos habilita, aunque el concepto ya esté descrito en la arquitectura.
- **Extender o suspender una suscripción NO queda en la auditoría — confirmado en vivo, no es una suposición.** Se hizo `POST .../subscription/extend` y luego `POST .../suspend` + `POST .../activate` sobre una empresa de prueba real, y se revisó `GET /audit-log?module=platform` inmediatamente después: **solo aparece el `create_company` original** — ninguna de las tres acciones nuevas generó una entrada. Esto es distinto (y más importante) que "no veo cuánto se pagó": hoy, si dos personas del equipo de plataforma tienen acceso de super-admin, no hay ningún registro de quién extendió una suscripción, cuándo, ni con qué `notes` (el campo `notes` de `SubscriptionExtendIn` se manda pero no hay ningún lugar donde se pueda volver a leer — se pierde). Contradice la regla general del propio backend (`docs/pending/CLAUDE.md`: *"toda acción sensible... inserta en `audit_log` en la misma transacción"*) — suspender el acceso de una empresa entera y cambiar su fecha de vencimiento son acciones tan sensibles como cualquiera de las que sí se auditan.
- **Recomendación sobre "valores pagados"**: dado que el cobro es 100% manual y fuera del sistema (`docs/pending/CONTEXTO.md` §3: *"el cliente paga por fuera del sistema"*), hoy no hay NINGÚN registro financiero de lo pagado — ni siquiera el monto. Sugerencia concreta: agregar un campo opcional `amount`/`amount_paid` a `SubscriptionExtendIn`, y que quede auditado (con el punto anterior resuelto, esto ya alcanzaría para tener un historial básico de "quién pagó cuánto y cuándo" sin construir un módulo de facturación completo).

**✅ Resuelto en parte (19/08/2026):** `PlanOut.modules` ya se expone (la columna ya existía con datos reales, solo faltaba el schema — ver `docs/pending/API_GUIDE.md` §3); falta `max_users`/límite de usuarios, que sí necesita columna nueva. Sobre la auditoría: **diagnóstico corregido** — el insert de `extend_subscription`/`set_company_status` funciona bien, confirmado consultando `audit_log` directo sin RLS (las filas existen). El problema real es que `GET /audit-log` es tenant-scoped (RLS por `company_id` de quien pregunta) — un super-admin nunca puede ver auditoría de una empresa que no es la suya propia, sin importar el filtro `?module=`. Falta un endpoint tipo `GET /platform/companies/{id}/audit-log` con el mismo molde que el resto de `platform` (`require_super_admin` + sesión bypass sin RLS) — no es una pieza nueva de arquitectura, es aplicar el patrón que ya existe. Sigue pendiente (Tier 3), junto con `amount_paid`.

## 15. Ajustes/configuración de usuario — qué recomiendo incluir

No hay ninguna pantalla de "mi perfil" hoy — el pendiente ya estaba anotado desde el paso 2 ("Perfil"/"Cambiar contraseña" en el menú del avatar). Verificado qué hace falta de backend para cada pieza razonable:

| Función | ¿Necesita backend nuevo? | Detalle |
|---|---|---|
| Ver mi perfil (nombre, correo, rol, empresa) | No | Ya disponible completo vía `GET /me`, sería una pantalla de solo lectura. |
| Cambiar mi contraseña | No | Va directo contra Supabase Auth (`supabase.auth.updateUser({password})`), igual que ya hace el flujo de aceptar invitación — no pasa por este backend en absoluto. |
| Editar mi nombre (`full_name`) | **Sí** | No existe ningún `PATCH /me` ni endpoint de auto-edición — confirmado, `/api/v1/me` solo tiene `GET`. Los únicos `PATCH` de usuario que existen son de admin sobre OTROS usuarios (`PATCH /identity/users/{id}/role`). |
| Foto de perfil / avatar | **Sí** | No existe ningún campo `avatar_url` en `MeUserOut`/`UserOut` — si se quiere, habría que agregarlo (el Storage ya está listo desde el paso 7b, el front puede subir la foto solo; falta el campo para guardar el path). |
| Preferencias de notificaciones | No aplica todavía | Notificaciones son Fase 2 en el roadmap (`docs/pending/CONTEXTO.md` §5) — no tiene sentido un ajuste para algo que no existe. |

**Recomendación de alcance para una v1:** perfil de solo lectura + cambiar contraseña (cero backend nuevo, se puede construir ya) y dejar nombre/avatar editables para cuando exista `PATCH /me` — no vale la pena bloquear la pantalla completa por esos dos campos.

## 16. Paginación — confirmado que ya existe en todos lados, incluida auditoría

Se verificó específicamente `GET /audit-log` (la duda puntual) y de paso el resto de listados ya construidos: **todos** usan `{cursor?, limit?}` con el mismo patrón `CursorPage_*` — confirmado en el schema (`list_audit_log_api_v1_audit_log_get` sí tiene `cursor`/`limit`, igual que `contracts`, `customers`, `identity/users`, `platform/companies`, etc.). El default documentado es 50 (máximo 200) — cómodamente por encima del mínimo de 12 pedido. **No es un pendiente real, solo faltaba confirmarlo explícitamente** — queda anotado acá como verificación, no como cambio a pedir.

## 17. Artículos creados por remate: no se pueden corregir categoría antes de publicar

Reproducido en vivo de punta a punta: se rematou un contrato, el artículo quedó en `draft` con `origin: "auction"`, `supplier_id: null` y las categorías **heredadas tal cual de la prenda del contrato** (la categoría que se eligió al crear el contrato, pensada para clasificar una prenda en garantía, no necesariamente la más adecuada para vender en tienda). Se publicó igual para confirmar el código: salió `JAO0003R` — el sufijo `R` en vez de letra de proveedor **ya funciona correctamente del lado del backend**, sin ningún bug ahí.

El problema real es que **`ItemUpdateIn` (`PATCH /inventory/items/{id}`) solo acepta `{name?, description?, sale_price?, photos?}`** — no hay forma de corregir `cat1_id`/`cat2_id`/`cat3_id` antes de publicar, aunque el artículo siga en `draft` (mismo estado en el que sí se puede editar nombre/precio/fotos sin restricción). Si la categoría heredada del contrato no es la correcta para la tienda, hoy no hay forma de arreglarlo — ni desde el front (porque el backend lo rechazaría) ni manualmente.

**Sugerencia:** agregar `cat1_id?`/`cat2_id?`/`cat3_id?` a `ItemUpdateIn`, con la misma validación de árbol de 3 niveles que ya usa `POST /inventory/entries` — la restricción de que solo se pueda mientras `status='draft'` seguiría siendo válida (`409` una vez publicado, como ya pasa hoy). No hace falta ni debería agregarse un campo de proveedor: el diseño de `origin`+sufijo `R` para artículos de remate ya es correcto tal como está, el front solo necesita mostrarlo bien (ver siguiente punto).

**Del lado del front (sin esperar al backend):** hoy `ItemEditDialog` no muestra de dónde viene un artículo — ni "origen: remate", ni el link al contrato de donde salió (`source_contract_id` sí lo trae `ItemOut`, no se usa en pantalla). Se puede corregir esto ahora mismo sin depender del punto de arriba; lo dejo anotado para hacerlo en la próxima sesión de trabajo del front.

**✅ Resuelto (19/08/2026):** `ItemUpdateIn` (`PATCH /inventory/items/{id}`) ya acepta `cat1_id?/cat2_id?/cat3_id?` mientras `status='draft'` — todo-o-nada (los tres juntos o ninguno, `400` si viene parcial), misma validación de árbol que `POST /entries`. Ver `docs/pending/API_GUIDE.md` §9.

**Del lado del front, ya resuelto (19/08/2026):** `ItemEditDialog` gana 3 `<Select>` en cascada (mismo patrón que `EntryFormPage`) cuando el artículo está en `draft`; publicado, se muestra de solo lectura. El submit manda los tres campos juntos solo si `status === 'draft'`, nunca parcial. Probando esto en vivo salió un bug real ya corregido: los selects no mostraban la categoría actual al abrir el diálogo (Radix `SelectValue` solo resuelve texto de un `SelectItem` que ya se montó al menos una vez — un valor precargado sin abrir nunca el dropdown se veía vacío aunque el valor fuera correcto; se arregló pasando el nombre ya resuelto como children de `SelectValue`). De paso: `GET /catalogs/categories` tarda ~4s consistentemente en dev (medido con `curl -w %{time_total}` tres veces) — se agregó placeholder "Cargando categorías…" mientras carga.

## 18. Resumen financiero de contratos y ventas — recomendación de dónde ubicarlo

Pedido: un apartado con el resumen en dinero de contratos (abonos, desembolsos, cartera) y de ventas, en el lugar que mejor encaje con el diseño actual de la app.

**✅ Resuelto (19/08/2026) — quedó exactamente donde se recomendaba: dentro de "Reportes" (`/reportes`), no en las pantallas operativas de `/contratos` y `/ventas`.** Abonos e intereses (contratos), desembolsos/capital abonado (cartera), ventas y gastos, todo por rango de fechas — ver punto 13. La fila corta de KPIs sugerida como complemento liviano arriba de `ContractsListPage`/`SalesListPage` (cartera activa, ventas del día) sigue sin construirse — sigue siendo una mejora válida, no bloqueante, no se hizo en esta ronda.

**Lo que todavía necesita backend para el resumen COMPLETO** (rangos más largos, cartera histórica, utilidad de ventas) es lo mismo del punto 13 — ver ahí el detalle actualizado.

## 19. Trazabilidad contrato → artículo de inventario: falta el vínculo inverso

Pedido explícito: poder asociar un artículo rematado a su contrato de origen. La dirección **artículo → contrato** ya se resolvió del lado del front (punto 17: `ItemOut.source_contract_id` ya existía en la API, solo faltaba mostrarlo). La dirección **contrato → artículo** (desde la prenda del contrato, saber en qué artículo específico se convirtió) es la que sí necesita un cambio de backend:

- **`ContractItemOut` no trae `inventory_item_id`**, aunque `docs/pending/API_GUIDE.md` §7 describe explícitamente que existe la columna: *"`contract_item.inventory_item_id` guarda el vínculo"*. Confirmado contra el schema real (`npm run gen:api` sin diff, no es un tipo desactualizado): el campo simplemente no está en la respuesta de la API, aunque exista en la base de datos.
- El front no puede reconstruir esto de forma confiable por su cuenta: `GET /inventory/items` no tiene filtro por `source_contract_id`, y aunque lo tuviera, un contrato con **varias prendas** genera varios artículos — sin el vínculo por prenda específica, no hay forma de saber cuál artículo corresponde a cuál prenda (emparejar por nombre/descripción sería frágil, no una solución real).

**Sugerencia:** exponer `inventory_item_id` (nullable) en `ContractItemOut` — es literalmente el mismo dato que `ItemOut.source_contract_id` visto desde el otro lado, la columna ya existe según la propia documentación del backend, solo falta incluirla en el schema Pydantic de salida. Con eso, el detalle del contrato podría mostrar, junto a cada prenda ya rematada, un link directo al artículo específico en el que se convirtió (en vez de solo el estado "Rematado").

**✅ Resuelto (19/08/2026):** `ContractItemOut` ya trae `inventory_item_id` (`null` mientras la prenda no se remata). Cero migración — la columna y el `UPDATE` que la llena (`auction_contract` → `mark_item_auctioned`) ya existían; solo faltaba incluirla en el `SELECT` del repositorio y en el schema de salida. Ver `docs/pending/API_GUIDE.md` §7. Test de regresión en `tests/integration/test_auction.py` que compara el `inventory_item_id` de cada prenda en la respuesta de `POST /contracts/{id}/auction` contra el valor real en `contract_item` — no solo "no es null", sino que es exactamente el mismo id.

**Del lado del front, ya resuelto (19/08/2026):** con esto se cierra el lado que faltaba de la trazabilidad bidireccional (el lado artículo→contrato, `ItemOriginInfo`, ya existía desde la revisión anterior). `AuctionedItemLink` en `ContractDetailPage` muestra "Convertido en [código]" con link a `/inventario` bajo cada prenda ya rematada. Verificado en vivo contra un contrato real con artículo publicado (`JAO0003R`).

## 20. `GET /catalogs/categories` tarda ~4 segundos consistentemente en dev

Encontrado probando en vivo la edición de categoría de artículos (punto 17): al abrir `ItemEditDialog` para un artículo en borrador, los `<select>` de categoría se veían vacíos varios segundos. Medido directo contra el backend, sin nada del front de por medio: `curl -w '%{time_total}'` contra `GET /api/v1/catalogs/categories` tres veces seguidas dio 3.85s / 3.88s / 4.08s — no es una demora puntual (cold start de un solo request), es consistente.

**Por qué importa para el negocio, no solo técnicamente:** es un endpoint que se usa en el flujo de **crear contrato** (elegir categoría de cada prenda) y ahora también en editar artículos de remate — 4 segundos de espera silenciosa en un flujo de mostrador (cliente esperando) es perceptible. El front ya le puso un placeholder de carga ("Cargando categorías…") para que no se vea como una pantalla rota, pero no resuelve la demora real.

**Posible causa:** el catálogo de categorías es chico (12 filas en la empresa de prueba) y no debería tardar segundos — huele a N+1 o falta de índice en `parent_id`/`company_id`, no a volumen de datos. No se investigó más a fondo del lado del backend porque está fuera del alcance del front.

**Sugerencia:** perfilar la query de `GET /catalogs/categories` — con un catálogo de este tamaño (decenas de filas, no miles) debería responder en milisegundos.

## 26. ✅ Costo de ventas y utilidad bruta (RESUELTO)

Era el punto de mayor valor de §24. `inventory_item.cost` y `sale_line.unit_price` existían pero nada los cruzaba, así que la pregunta central del negocio —*"¿cuánto gané con lo que vendí?"*— no tenía respuesta.

**✅ Resuelto (20/08/2026):** migración 00019 agrega `sale_line.unit_cost`, copiado del artículo **al momento de vender** (snapshot, mismo criterio que los contratos). Leerlo del artículo al reportar habría hecho que un reporte de un período cerrado cambiara si alguien corrige un costo hoy. El backfill fue posible porque `inventory_item.cost` es inmutable en la práctica (ningún endpoint lo edita).

`GET /reports/profit?from_date&to_date` devuelve `gross_revenue`, `discounts`, `net_revenue`, `cost_of_goods_sold`, `gross_profit` y `margin_pct`. Es una sola consulta agregada, así que **no hereda el tope de 90 días** del resto de `/reportes`.

Decisiones de modelado: solo ventas `completed` (una anulada no generó ingreso ni consumió inventario); el descuento se resta del ingreso y no se trata como gasto; `margin_pct` es `null` —no 0— cuando no hubo ventas.

**Ojo con la UI:** `/reportes` ahora muestra DOS utilidades distintas. La "operativa" (ingresos − gastos) no descuenta el costo de la mercancía; la "bruta de tienda" descuenta el costo pero no los gastos. Están separadas y rotuladas a propósito.

## 27. ✅ Rentabilidad del empeño (RESUELTO, con una limitación conocida)

Complementa el punto 26 (costo de ventas, tienda). El empeño no tiene costo de ventas: se mide por rendimiento sobre el capital prestado.

**✅ Resuelto (20/08/2026):** `GET /reports/pawn-performance?from_date&to_date` — intereses cobrados, descuentos de interés otorgados, capital desembolsado y recuperado, cartera y contratos abiertos, y rendimiento. Sin migración: los datos ya estaban en `contract_payment` y `contract`.

Los intereses salen de `contract_payment` y no del desglose de caja, que solo cubre sesiones cerradas (un abono de hoy no aparecería) y no separa el descuento de interés.

**Limitación conocida, deliberada:** el rendimiento se calcula sobre la cartera de HOY, no sobre el promedio del período. `contract` no tiene `closed_at` ni hay histórico de saldos, así que no se puede saber con exactitud cuánta cartera había en una fecha pasada. Se prefirió rotularlo (`yield_on_current_portfolio_pct`) antes que fabricar una reconstrucción aproximada. **Para hacerlo exacto:** una columna `closed_at` en `contract`, o una tabla de saldos diarios de cartera.
