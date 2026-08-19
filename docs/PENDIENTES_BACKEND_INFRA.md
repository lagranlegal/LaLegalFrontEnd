# Pendientes para revisar con backend/arquitectura/infraestructura

> Documento de traspaso — no es una queja sobre el backend, es la lista concreta de huecos reales encontrados construyendo el front, para decidir en equipo qué se resuelve y en qué orden. Cada punto dice qué se verificó, cómo, y por qué importa para el negocio (no solo técnicamente). Última actualización: 19/08/2026.

## 1. Búsqueda de clientes: solo por nombre, no por documento

`GET /customers?q=` hace full-text search **solo sobre `full_name`** — confirmado contra el backend real: `?q=123456789` (número de cédula exacto de un cliente que sí existe) devuelve `items: []`, mientras que `?q=Juan`/`?q=Pérez`/`?q=juan perez` sí lo encuentra.

**Por qué importa para el negocio, no solo técnicamente:** en el mostrador de una compraventa, el cliente casi siempre entrega su cédula física — el operador tipea el número, no el nombre. Con el buscador actual, si no recuerda cómo está escrito el nombre exacto en el sistema, no puede encontrarlo por documento aunque lo tenga en la mano. Esto afecta directamente **crear contrato**, **venta con cliente registrado**, y cualquier flujo que use `CustomerPicker`.

**Sugerencia:** que `?q=` busque también por `doc_number` (coincidencia exacta o prefijo, no necesita ser full-text ahí — un documento se busca completo o casi completo, no por fragmentos como un nombre).

## 2. `GET /contracts` sin `?q=` — buscador de contratos es un parche client-side

Confirmado: el único filtro es `?status=`. El front ya tiene un buscador (agregado en la revisión post-paso-10) pero es un parche: trae los primeros 200 contratos y filtra en el navegador por número o código anterior — **nunca por nombre del cliente**, porque `ContractOut` solo trae `customer_id`, no el nombre, y resolverlo fila por fila sería un request por cada uno.

**Sugerencia:** `?q=` en `GET /contracts` que busque por número de contrato, `legacy_code`, y — si es razonable del lado del backend — nombre/documento del cliente (un `JOIN` contra `customer`, que el front no puede hacer eficientemente).

## 3. `GET /sales` no tiene NINGÚN filtro (ni siquiera `status`)

Confirmado en el schema: `{cursor?, limit?}` únicamente. Ni `customer_id`, ni `status`, ni fecha. Esto bloquea two cosas:
- El historial de cliente (`/clientes/$id`) trae hasta 200 ventas y filtra por `customer_id` en el navegador — mismo parche que el punto 2, con el mismo techo de 200.
- No hay forma de, por ejemplo, listar solo ventas anuladas, o ventas de un rango de fechas, sin traer todo y filtrar en el front.

**Sugerencia:** al menos `?customer_id=` y `?status=` en `GET /sales` — son los dos filtros que ya tiene `GET /contracts` y que la simetría entre ambos módulos sugiere que deberían coincidir.

## 4. `CompanyOut` (panel de plataforma) no trae plan ni fecha de expiración de suscripción

Ya documentado en `docs/RECOMENDACIONES.md` §1.8 — se repite acá porque es exactamente el tipo de cosa que esta lista busca centralizar. Un super-admin puede extender una suscripción sin ver la fecha de expiración actual.

## 5. `GET/PATCH /company/settings` — bloquea dos cosas, no solo "Configuración"

Ya en el backlog original del backend (`docs/pending/API_GUIDE.md` §15) como pendiente de la pantalla "Configuración". La revisión post-paso-10 encontró que **también** bloquea la firma de la empresa en el documento imprimible del contrato — `docs/pending/CONTEXTO.md` §3 pedía explícitamente que la firma se insertara automáticamente en el PDF de todos los contratos nuevos, y hoy no hay dónde subirla ni de dónde leerla. El documento imprimible del front (`ContractPrintView.tsx`) deja dos líneas en blanco para firmar a mano en vez de eso. Detalle completo en `docs/RECOMENDACIONES.md` §1.9.

## 6. PDFs (contrato firmado, acta de cierre) — siguen sin generarse

Decisión ya tomada explícitamente (backend §15: "requieren Storage + una librería de PDF, fuera de alcance"). El front cubre ambos con vistas imprimibles (`PrintLayout`, `@media print`) mientras tanto — funcionan, pero no son un PDF descargable/archivable, son "imprime desde el navegador". Si en algún momento se prioriza un PDF real server-side, sería quien reemplace esto, no algo que el front necesite rehacer.

## 7. `GET /reports/series` — serie mensual para el dashboard

Ya en backlog aceptado (`docs/pending/API_GUIDE.md` §15). El dashboard hoy solo tiene KPIs de hoy/mes, sin gráfica de tendencia. Sin cambios desde la última revisión.

## 8. Definir con el cliente qué va en "Reportes" y "Configuración"

No es un pendiente técnico — es una decisión de producto que todavía no se tomó. Hoy:
- **"Reportes"** no tiene pantalla propia. Su contenido real ya existe pero está repartido: KPIs en el dashboard (`/`), histórico de cierres dentro de Caja (`/caja`). Falta decidir si eso se consolida en una pantalla `/reportes` (y qué más iría ahí — ¿reporte de cartera de contratos? ¿ventas por período? ¿algo de inventario?) o si se deja como está.
- **"Configuración"** bloqueada por el punto 5. Cuando exista el endpoint, falta decidir el alcance exacto: ¿solo logo/firma/timezone, o también parámetros de negocio (tasas por defecto, ventanas de mora) que hoy solo se editan por categoría?

## 9. Verificación en vivo pendiente por falta de una segunda cuenta de prueba

Dos caminos de código están implementados pero **nunca se dispararon de verdad** contra el backend, porque hacerlo hubiera arriesgado la única sesión de administrador activa usada para todas las pruebas de esta integración:
- `LAST_ADMIN_SAFEGUARD` (paso 8, identity) — el modal explicativo existe, pero nunca se forzó el rechazo real desde el backend.
- El camino negativo del guard de `/platform` (paso 10) — un usuario autenticado SIN el claim `app_metadata.platform_role=super_admin` debería rebotar a `/`; solo se verificó el camino "sin sesión en absoluto".

**Para desbloquear esto:** una segunda cuenta Admin activa en la empresa de pruebas (para el primero) y una cuenta cualquiera sin el claim de plataforma (para el segundo) — no es un cambio de backend, es un pendiente operativo de tener más cuentas de prueba disponibles.

## 10. Comportamiento de "meses completos" en el límite exacto — confirmar si es intencional

Al fabricar datos de prueba con `POST /contracts/import` se encontró un comportamiento consistente y repetible, no un error aislado: si `interest_paid_until` queda **exactamente** a N meses calendario de hoy (ej. hoy 19/08, `interest_paid_until` = 19/07 → exactamente 1 mes), `months_owed` cuenta **N-1**, no N — hace falta que `interest_paid_until` sea al menos un día más viejo (18/07) para que cuente como el mes completo. Se confirmó dos veces con datos distintos (1 mes y 3 meses de diferencia), mismo resultado ambas veces.

No se reporta como bug — probablemente es intencional (no se penaliza el día exacto del vencimiento, hay que estar realmente *pasado* del mes) y de hecho suena razonable para no ser injustos con el cliente. Se deja anotado para que quede confirmado explícitamente como comportamiento esperado, no algo que alguien "arregle" después sin saber que ya se decidió así.

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
