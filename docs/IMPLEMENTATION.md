# Estado de implementación

> Registro vivo de qué existe en el código, cómo está armado y por qué se tomó cada decisión — para que cualquiera (humano o Claude Code) pueda retomar el proyecto sin releer todo el historial de commits. Se actualiza en cada paso del "Orden de implementación" de `CLAUDE.md`. No repite lo que ya está en `ARCHITECTURE.md`/`DESIGN_SYSTEM.md` (el qué-debería-ser); esto es el qué-hay-hoy y las decisiones concretas tomadas al construirlo.

## Reportes: conectado el frontend a `GET /reports/closings-breakdown` (28/08/2026)

Pendiente desde el 27/08 (el backend lo trajo ese día, el front seguía con el N+1 de siempre). Reemplaza `useRawSessions` (un `GET /cashbox/sessions/{id}/report` por CADA sesión de caja cerrada del rango, hasta 90 requests en un rango de 90 días — y el doble contando el período anterior de la comparación) por una sola consulta agregada por rango.

### Dos hooks, no uno — `closings-breakdown` no trae todo

`useClosingsBreakdown(range)` pide el desglose ya sumado por el backend (`{lines: ClosingsBreakdownLineOut[]}`, módulo×concepto×medio×cuenta×fecha de sesión). Pero el endpoint nuevo NO resuelve dos cosas que el front todavía necesita:
- Una sesión que cerró sin ningún movimiento no deja ninguna línea, así que `sessionCount` y el punto en `byDay` de esa fecha se perderían si solo se mirara `lines`.
- La categoría de gasto (`ExpenseOut.category_id`) no es una dimensión de `closings-breakdown` — sigue haciendo falta `GET /cashbox/expenses` por sesión para la card "Gastos por categoría".

Por eso `useClosingsInRange(range)` se mantiene aparte, envolviendo `fetchAllClosingsInRange` (una consulta paginada, NO N+1) — dos queries en paralelo por rango en vez de una cadena. `useExpensesByCategory` pasó de recibir `RawSession[]` (con el reporte completo ya resuelto) a recibir directamente la lista de cierres — sigue siendo un N+1 propio (`GET /cashbox/expenses?session_id=`), así que `MAX_RANGE_DAYS` (90 días) se mantiene como tope en AMBOS hooks, no porque `closings-breakdown` lo necesite (el backend no le pone límite), sino para no dispararlo sabiendo que la UI lo va a esconder de todos modos (`rangeTooWide`) y para seguir acotando el N+1 que sí queda.

### `aggregateFinancialSummary` cambió de firma, no de reglas de negocio

Antes: `(sessions: {sessionDate, report}[], moduleFilter?)`, iterando el `report.lines` de cada sesión. Ahora: `(lines: ClosingsBreakdownLine[], sessionDates: string[], moduleFilter?)` — recibe las líneas YA aplanadas de todas las sesiones del rango, más la lista completa de fechas de sesión aparte (para el caso "sesión sin movimientos" de arriba). La lógica de clasificación ingreso/gasto/capital/flujo (`addLine`, con todos sus comentarios sobre por qué un traslado o una cuenta por cobrar no son flujo) no se tocó — mismo cuerpo, solo cambió de dónde saca `sessionDate` (ahora viene en la propia línea, `line.session_date`, en vez de pasarse aparte por cada sesión).

Función pura, sin red — se pudo verificar con tests unitarios reales sin tocar la app corriendo. Encontrados y actualizados DOS archivos de test que usaban la firma vieja (`tests/reports-aggregate.test.ts` y `tests/accounts.test.ts`, este último con la cobertura más completa de traslados/cuentas por cobrar) — ninguno apareció en una búsqueda inicial por estar fuera de `src/features/reports/` (los tests de este proyecto NO están colocados junto al código, viven todos en `tests/` en la raíz). 135/135 en verde tras el ajuste, mismo número que antes (cobertura neta sin cambios, dos tests redundantes que se habían agregado de más se retiraron al notar que `accounts.test.ts` ya cubría esos casos).

### Qué NO se pudo probar en vivo, y por qué

CORS: el backend dev solo permite el origen de Vercel, así que `vite preview` local (`http://localhost:4321`) no puede pegarle a `https://compraventa-backend-dev.fly.dev` para probar antes de desplegar — confirmado al intentarlo (bloqueado por política CORS, sin `Access-Control-Allow-Origin`). La verificación en vivo con Playwright se hizo DESPUÉS de desplegar a `dev`/Vercel, no antes.

## Fix: "Imprimir" podía imprimir el documento de siempre en vez de la plantilla activa (28/08/2026)

Encontrado durante la verificación en navegador real de la tanda de plantillas (ver más abajo), no reportado por Mateo — probando el flujo completo de imprimir un contrato real de punta a punta.

### La causa: `ContractPrintView`/`SettlementPrintView` piden la plantilla activa por su cuenta, y `ContractDetailPage` no esperaba esa respuesta

`useActiveDocumentTemplate` se llama DENTRO de `ContractPrintView` — un componente `print:hidden` que igual vive montado en el DOM todo el tiempo (para que `window.print()`, sincrónico, tenga contenido que imprimir apenas se clickea). El botón "Imprimir" de `ContractDetailPage` nunca esperaba esa query: quedaba habilitado desde el primer render de la página, mientras `ContractPrintView` seguía mostrando su propio fallback (el JSX de siempre, `if (activeTemplate)` todavía falso) hasta que la respuesta llegara.

Medido en vivo con Playwright (`page.on('request'|'response')` + polling del DOM cada 150ms): en una visita fría a `/contratos/$id`, la página encadena `GET /me` (~1.7s) → `GET /contracts/{id}` + `payments` + `categories` + `cashbox/sessions/current` en paralelo (~1s más) → **recién ahí** dispara `GET /company/document-templates/active` y `GET /customers/{id}`. La plantilla activa no llegaba hasta **~t=3.8s**. Cualquier click en "Imprimir" antes de eso imprimía el documento sin personalizar — sin ningún aviso, ni para el usuario ni en ningún log.

No es un problema de latencia general (ya conocido, ver `ESTADO.md` sobre la región de Fly) — es que nada bloqueaba la acción de imprimir mientras el dato que decide QUÉ se imprime seguía en vuelo. Mismo principio ya aprendido con el router: si la app no muestra que está trabajando, para el usuario está rota — acá ni siquiera mostraba que estaba trabajando, dejaba clickear.

**Fix:** `useActiveDocumentTemplate` (`features/settings/documentTemplates/api.ts`) gana un `options?.enabled` (patrón ya usado en `lib/cashbox/closings.ts` y otros). `ContractDetailPage` llama el mismo hook (mismo `queryKey` que `ContractPrintView`/`SettlementPrintView` — TanStack Query dedupea, cero requests nuevos) solo para leer `isLoading`, y deshabilita "Imprimir"/"Imprimir paz y salvo" con el mismo patrón `isPending ? 'Cargando…' : 'Imprimir'` que ya usa el resto de la app (`DocumentTemplatesPage`, `DataTable`, etc.). La query de paz y salvo se pide con `enabled: isPaid` — no tiene sentido pedirla para un contrato que no puede tener paz y salvo todavía.

## Fix: no era claro que "Guardar" ≠ "Activar" (28/08/2026)

Reportado en vivo: Mateo creó una plantilla, la guardó, y al imprimir un contrato seguía saliendo el formato viejo — no era un bug (confirmado consultando `document_template` directo en la base: la plantilla existía con `is_active=false`, nunca le había dado clic a "Activar"), pero nada en pantalla avisaba que crear/guardar y activar son dos pasos separados a propósito (evita que un borrador a medias se vuelva lo que imprime la empresa por accidente). Se agregó un banner (`bg-warning-soft`, mismo patrón que la alerta de LTV en `ContractDetailPage`) en `DocumentTemplatesPage.tsx` — uno para una plantilla nueva sin guardar todavía, otro para una ya guardada pero inactiva — apuntando al botón Activar.

## Fix: insertar un campo dinámico borraba el anterior (28/08/2026)

Reportado en vivo por Mateo tras probar el editor: "difícil colocar campos porque se borra el último, el cursor desaparece... no hay forma de colocarlos al lado uno del otro". Los 4 síntomas eran la misma causa.

### La causa: un nodo atómico, insertado solo, deja una NodeSelection sin caret

`mergeField` es un nodo inline **atómico** (no editable por dentro). `editor.chain().focus().insertContent({ type: 'mergeField', ... }).run()` lo insertaba, pero la selección resultante quedaba como una **NodeSelection sobre el nodo recién insertado** — no un cursor de texto normal parado después. Una `NodeSelection` no muestra caret ("el cursor desaparece"), y si el siguiente `insertContent` se ejecuta con esa selección activa, **reemplaza** el nodo seleccionado en vez de insertar al lado — exactamente "se borra el último campo" y "no hay forma de ponerlos uno al lado del otro".

**Fix** (`TemplateEditor.tsx`): insertar `[{type:'mergeField', attrs:{key}}, {type:'text', text:' '}]` — el espacio de texto después del campo fuerza que la selección final sea un cursor colapsado DESPUÉS del campo, listo para seguir escribiendo o insertar el siguiente sin pisar el anterior.

**Bonus, mismo diagnóstico:** no había NINGÚN estilo para `.ProseMirror-selectednode` (la clase que ProseMirror agrega sola al hacer clic en un nodo atómico) — así que hacer clic en un campo no daba ninguna señal visual de que quedó seleccionado, y por lo tanto tampoco de que Supr/Backspace lo borra. Se agregó un contorno visible (`globals.css`) — aplica a los 3 nodos atómicos (campo, tabla de prendas, firma), no solo a los campos. También un `title` con el hint de borrado en el chip del campo.

## Formatos visuales de documentos — Clásico / Moderno / Compacto (28/08/2026)

Migración backend `00047_document_template_layout.sql`. Feedback de Mateo tras probar el editor de plantillas: el mecanismo de texto le gustó, pero pidió variar la PRESENTACIÓN — "se siente muy minimalista" — sin tener que reescribir el contenido.

### El hallazgo antes de construir nada: los estilos de texto enriquecido nunca estuvieron activos

`TemplateEditor.tsx` ya usaba clases `prose prose-sm` desde la tanda anterior, asumiendo el plugin `@tailwindcss/typography` — que **nunca se instaló** (no estaba en `package.json`, no había `tailwind.config.*` ni `@plugin` en `globals.css`). El preflight de Tailwind resetea `font-size`/`font-weight` de encabezados y quita el `list-style` de listas, así que un `<h2>` o una lista con viñetas de Tiptap se veían exactamente igual que un párrafo, en el editor Y en cualquier impresión — sin jerarquía visual alguna. Esto explicaba buena parte de "se siente plano", más allá de que solo existiera una presentación. Se instaló el paquete de verdad (`@plugin '@tailwindcss/typography';` en `globals.css`) antes de construir los 3 formatos — variedad sin esa base se seguiría viendo plana en los 3.

### `layout` es un atributo de cada plantilla, no una preferencia global

Igual que `name`/`body`: un campo más en `document_template` (`document_layout` enum: `classic | modern | compact`, default `classic`). No hizo falta ningún concepto nuevo — cada plantilla ya era autocontenida, y una empresa puede tener varias plantillas del mismo tipo con formatos distintos.

### `PrintLayout` se volvió el único lugar donde vive la identidad visual

Gana dos props: `layout` (tipografía/borde/barra de acento del encabezado, con `classic` reproduciendo EXACTO el look de siempre) y `screenPreview` (el mismo componente, visible en pantalla en vez de solo al imprimir). La vista previa de `/configuracion/documentos` dejó de ser un `<div className="bg-white p-6">` a mano y pasó a envolver `<PrintLayout screenPreview>` de verdad — así lo que el usuario ve al elegir un formato y lo que realmente sale impreso no pueden divergir, mismo principio que ya regía `TemplateEditor`/`TemplateRenderer` compartiendo los Node extensions de Tiptap.

Como el div raíz de `PrintLayout` alterna `display:none` (pantalla normal) / visible (imprimiendo o `screenPreview`), las clases de los elementos DE ADENTRO (encabezado, barra de acento) no necesitan el prefijo `print:` — son irrelevantes mientras el ancestro tiene `display:none`, y se activan solas cuando el ancestro se vuelve visible. Solo el contenedor raíz necesita la lógica condicional de clases.

### Las 3 identidades

- **Clásico** (default): serif, borde doble bajo el encabezado — el más parecido al look de siempre, es la garantía de cero regresión para una plantilla sin `layout` explícito o sin plantilla activa.
- **Moderno**: sans-serif (Inter, coherente con el resto de la marca), barra de acento en el color primario arriba de todo el documento, encabezado apilado a la izquierda en vez del bloque de dos columnas, títulos coloreados con `var(--brand-600)`.
- **Compacto**: tipografía más chica y espaciado reducido, pensado para contratos con tablas de prendas largas.

### Qué se tocó

Backend: `supabase/migrations/00047_document_template_layout.sql`, `app/modules/company/{schemas,repository,service}.py` (campo `layout` en los 3 schemas + columnas/SQL), extendido `test_company.py` (default `classic`, round-trip al crear/actualizar). 307/307 tests, mypy y ruff limpios. Desplegado a Fly y verificado en vivo contra `openapi.json`.

Frontend: `@tailwindcss/typography` instalado + `@plugin` en `globals.css`, `lib/documents/layouts.ts` (nuevo — catálogo de labels/clases por formato, mismo patrón que `mergeFields.ts`), `components/shared/PrintLayout.tsx` (gana `layout`/`screenPreview`), `components/shared/documentTemplate/TemplateRenderer.tsx` (gana `layout`, envuelve el contenido en las clases `prose` del catálogo), `ContractPrintView.tsx`/`SettlementPrintView.tsx` (pasan `activeTemplate.layout` a ambos), `DocumentTemplatesPage.tsx` (selector de 3 botones + vista previa ahora usa `PrintLayout` real). `tsc`, ESLint, Vitest (135/135, +2 nuevos) y `npm run build` en verde — bundle principal sin cambios (488KB gzip; el plugin de tipografía es CSS de build, no JS de runtime).

### Verificado en navegador real (28/08/2026)

Playwright SÍ está disponible en este entorno vía el caché de npx (`~/.npm/_npx/.../node_modules/playwright`, Chromium ya descargado) — corrige lo anotado el 28/08 de que no había forma de probar visualmente. Login real contra `https://la-legal-front-end.vercel.app` con la cuenta de Mateo, sobre su plantilla "prueba mateo 1" (activa) ya existente:
- Los 3 formatos se confirmaron visualmente distintos, tanto en el editor como en `PrintLayout`: Clásico (serif, línea divisoria bajo el encabezado), Moderno (barra de acento turquesa arriba, títulos coloreados), Compacto (sans-serif, espaciado reducido, sin línea divisoria).
- El fix de inserción de campos consecutivos se confirmó insertando dos campos (`Nombre del cliente` + `Fecha de hoy`) uno justo después del otro sin escribir nada en el medio: ambos quedaron uno al lado del otro (conteo de nodos `mergeField` subió de a uno por inserción, sin reemplazo), y la vista previa los renderizó juntos ("Cliente de ejemplo 28/08/2026").
- Ninguna de las dos pruebas se guardó (`Guardar` nunca se clickeó) — se releyó la plantilla al final y quedó bit a bit igual a como estaba antes (mismo conteo de campos, mismo formato).

### Segundo pase (28/08/2026, más tarde): flujo completo de impresión + el pixel-idéntico de Clásico

**El flujo completo de imprimir un contrato real (Contratos → contrato → Imprimir) reveló un bug real, ya arreglado y desplegado** — ver "Fix: 'Imprimir' podía imprimir el documento de siempre" más arriba. No estaba relacionado con el texto/formato en sí, sino con el timing de la query de la plantilla activa.

**El "pixel-idéntico" de Clásico NO es tal, y es medible:** `git diff` contra el commit previo a esta feature (`ff301e6`) muestra que `LAYOUT_HEADER_DIVIDER_CLASS.classic` (`lib/documents/layouts.ts`) quedó en `border-b-2 border-double border-black/30`, mientras el header de `PrintLayout` ANTES de esta feature era `border-b border-black/20`. Confirmado también con el estilo computado real en vivo (`getComputedStyle` sobre la vista previa en Clásico): `border-bottom: 2px double rgba(0,0,0,.3)`, no `1px solid rgba(0,0,0,.2)`. Es decir: **toda empresa que nunca active una plantilla — o cualquiera que active una en `classic` explícito — va a imprimir un encabezado con línea doble y algo más oscura que antes de esta tanda**, aunque el resto del documento (todo lo que sale del JSX de `ContractPrintView`, sin tocar) es idéntico carácter por carácter (confirmado por el mismo diff, cero cambios en ese bloque).

El comentario en `PrintLayout.tsx` prometía "tiene que verse IDÉNTICO... cero regresión"; la descripción de este mismo documento (línea de arriba, "Las 3 identidades") ya lo describía con más cuidado como "el más parecido al look de siempre", no idéntico. **Decisión de Mateo (28/08/2026): el borde doble se queda** — mejora estética aceptada, no una regresión a corregir. Se corrigió el comentario de `PrintLayout.tsx` para que ya no prometa algo que no es cierto.

## Plantillas de documentos editables — Contrato + Paz y salvo (27-28/08/2026)

Migración backend `00046_document_templates.sql`. Pedido de Mateo tras usar la app: poder editar "casi completamente" el texto del contrato imprimible (y de cualquier otro documento), manteniendo dinámicos los campos como nombre del cliente o número de contrato. Arrancó solo con Contrato para validar el mecanismo; Paz y salvo se sumó en la misma tanda como documento nuevo (se habilita cuando un contrato llega a `status='paid'`, antes no existía ningún documento imprimible para ese momento).

### La plantilla activa es siempre la actual, nunca versionada por contrato

Decisión explícita de Mateo: editar la plantilla activa aplica retroactivamente a contratos viejos también — no hace falta congelar una copia por contrato. La razón es que ya existe una copia histórica real: `signed_photo_url`, la foto del documento físico firmado por el cliente en su momento, que no cambia aunque la plantilla se edite después. Construir versionado de plantillas habría sido resolver un problema que el producto ya resuelve de otra forma.

### El swap transaccional de "una plantilla activa por tipo"

`document_template` tiene un índice único parcial `where is_active` — como máximo una plantilla activa por `(company_id, document_type)`. Activar una plantilla nueva no pide "desactiva la otra primero": el service hace `deactivate_active_template` y **después**, en la misma transacción, `activate_template(id)`. En ese orden el índice nunca se viola en ningún punto intermedio — invertir el orden (activar antes de desactivar) sí lo haría.

### El hallazgo crítico: el permiso de LECTURA no puede ser el mismo que el de escritura

`ContractDetailPage` (botón "Imprimir") está gateado por `contracts.view`, no por `company.configure` — cualquier asesor imprime un contrato hoy. Si `GET .../active` (la plantilla activa, la que de verdad se necesita para imprimir) exigiera `company.configure` como el resto del CRUD, un asesor sin ese permiso se quedaría sin poder imprimir en cuanto una empresa activara una plantilla — regresión real, no hipotética. Se separó: los 5 endpoints de escritura van con `company.configure`; `GET /company/document-templates/active` va con `contracts.view`. Mismo criterio que ya usan `header_note`/`legal_notice` (salen de `GET /me`, no de `GET /company/settings`).

### `body` es JSON estructurado (ProseMirror), nunca HTML

El editor es Tiptap (elegido por Mateo — rich text tipo Word: negrita, títulos, listas — sobre texto plano con inserción de campos). El documento se guarda como JSON de ProseMirror, no como string HTML: el renderer solo puede emitir las etiquetas que sus Node/Mark conocidos definen, así que no hay superficie de XSS aunque cualquier usuario con `company.configure` escriba lo que quiera en el editor.

### Tres Node extensions atómicos comparten los mismos dos componentes

`MergeFieldNode` (campo dinámico — chip en edición, valor resuelto en impresión; si la key no existe en el contexto muestra `[campo desconocido: x]`, nunca vacío en silencio), `ItemsTableBlockNode` (tabla de prendas, solo Contrato) y `SignatureBlockNode` (firma cliente/empresa, reusa `signature_url`). `TemplateEditor` (editable) y `TemplateRenderer` (`editable:false`) montan exactamente los mismos tres Node extensions — la vista previa del editor y lo que realmente imprime no pueden divergir porque es literalmente el mismo motor.

Catálogo único de campos por tipo de documento en `lib/documents/mergeFields.ts` (`MERGE_FIELDS`, `resolveMergeField`) — función pura, testeada con Vitest sin montar el editor. Un test propio (`las keys compartidas... usan el mismo label`) encontró una inconsistencia real: `contrato.fecha_inicio` y `contrato.capital` tenían labels distintos entre el catálogo de Contrato y el de Paz y salvo — corregido.

### Fallback de código, no una plantilla sembrada en la base de datos

`ContractPrintView`/`SettlementPrintView`: si hay una plantilla activa, renderizan `TemplateRenderer`; si no, cae al JSX hardcodeado de siempre (Contrato) o a un texto simple hardcodeado (Paz y salvo, documento nuevo sin JSX previo que replicar). Una empresa que nunca toque `/configuracion/documentos` imprime exactamente igual que antes — cero riesgo de regresión.

### El regression de bundle que el propio `npm run build` detectó

Tiptap (`@tiptap/react`+`core`+`starter-kit`+`pm`, ~134KB gzip) se había importado de forma estática en 5 archivos, violando la regla ya establecida en este repo para dependencias pesadas (mismo criterio que `xlsx`, item 8 de `PENDIENTES_FRONTEND.md`): el bundle principal subió de 482.59KB a 616.15KB gzip. Fix: `components/shared/documentTemplate/lazy.ts` centraliza `React.lazy()` para `TemplateEditor`/`TemplateRenderer` — los 3 consumidores (`DocumentTemplatesPage`, `ContractPrintView`, `SettlementPrintView`) importan de ahí, nunca de los archivos reales. Vuelta a ~488KB gzip en el bundle principal, Tiptap en su propio chunk (`SignatureBlockNode-*.js`, 126KB gzip) que solo se descarga cuando hace falta.

**Detalle no obvio con `window.print()`:** es síncrono/bloqueante — si el chunk de Tiptap no había terminado de cargar en el momento del click, `Suspense` mostraría su fallback y ESO es lo que se imprimiría. `ContractPrintView`/`SettlementPrintView` llaman `preloadTemplateRenderer()` (mismo módulo, mismo cache de `import()` que `LazyTemplateRenderer`) en un `useEffect` apenas se sabe que hay plantilla activa, dándole tiempo de sobra a la descarga antes de que el usuario llegue a hacer click en "Imprimir".

### `GET /contracts/{id}/settlement` — la fecha de cancelación se deriva

Mismo principio del proyecto ("los saldos se derivan, nunca se guardan"): no hay columna `settled_at`. El backend busca el `contract_payment` con `new_capital_balance=0` (el abono que saldó el crédito) y devuelve su fecha + `receipt_number`. Derivarlo en el front paginando pagos habría sido frágil (créditos con muchos abonos parciales); resuelto con una query de una fila en el backend. 404 si el contrato no está `status='paid'`.

### Qué se tocó

Backend: `supabase/migrations/00046_document_templates.sql`, `app/modules/company/{schemas,repository,service,router}.py` (6 endpoints de plantillas), `app/modules/contracts/{schemas,repository,service,router}.py` (`GET /{id}/settlement`), tests en `test_company.py`/`test_contracts.py`/`test_tenant_isolation.py`. 306/306 tests, mypy y ruff limpios. Desplegado a Fly y verificado en vivo contra `openapi.json`.

Frontend: `lib/documents/{mergeFields,startingTemplates}.ts`, `lib/documents/nodes/{MergeFieldNode,ItemsTableBlockNode,SignatureBlockNode}.tsx`, `components/shared/documentTemplate/{TemplateEditor,TemplateRenderer,lazy}.tsx`, `features/settings/documentTemplates/{api.ts,pages/DocumentTemplatesPage.tsx}`, `features/contracts/settlement.ts`, `features/contracts/components/SettlementPrintView.tsx` (nuevo), cambios en `ContractPrintView.tsx`/`ContractDetailPage.tsx`/`router.tsx`/`SettingsPage.tsx`. `tsc`, ESLint, Vitest (133/133) y `npm run build` en verde.

### Lo que falta, explícito

**No probado en navegador real todavía** — ni local ni contra dev desplegado. Falta: crear/editar/activar/eliminar una plantilla de punta a punta con Playwright y credenciales reales, confirmar que "Empezar desde la plantilla actual" precarga algo razonable, confirmar que una empresa SIN plantilla activa sigue imprimiendo el contrato exactamente igual que antes (la garantía central de este diseño), confirmar que el botón "Imprimir paz y salvo" solo aparece con `status='paid'`, y confirmar que un usuario con solo `contracts.view` puede imprimir pero no ve `/configuracion/documentos`. Migración `00046` aplicada en local y en la Supabase dev remota. Commit/push/deploy del frontend: pendiente.

## Devolución de cliente y nota crédito (25-26/08/2026)

Migraciones backend `00041`-`00045`. 00033 (agosto) ya había dejado escrito que esto quedaba afuera "a propósito" porque merecía su propio camino — es ese camino.

### La decisión de fondo: dos formas de liquidar, elegidas por transacción

En Colombia el derecho de retracto (Ley 1480/2011) solo aplica a ventas a distancia — una compra en tienda física **no tiene devolución por cambio de opinión como derecho legal**, es política comercial de cada negocio. Sin un estándar que imponga una respuesta, la abstracción correcta no es "cómo lo hace la mayoría" sino la que ya existía en el sistema para Sistecrédito: `account_id` desacopla "medio de pago" de "cuándo entra la plata". Una devolución reusa exactamente esa idea, espejada: **efectivo** (toca caja, requiere sesión abierta) o **nota crédito** (pasivo derivado — nunca una columna `balance` guardada, mismo patrón que cuentas por pagar a proveedor — redimible desde el día uno en una venta futura). Elegidas caso por caso, no configuradas por empresa.

### Los dos caminos de reapertura de lote

Como el ítem puede ser fraccionable (gramos), "¿la pieza sigue existiendo?" no es la pregunta correcta — lo es "¿qué le pasó al REMANENTE del lote entre la venta y la devolución?":

- **Camino A**: el lote sigue `sold`/`available` (nadie lo tocó) → se reabre el MISMO `inventory_item`, exactamente el mecanismo que ya usaba `sales.void_sale`. Se sintetiza en el kardex (quinto `union all`, mismo truco que `sale_void`).
- **Camino B**: el lote quedó `written_off` (su remanente se transformó, se dio de baja, etc. después de la venta) → no se reabre; se reingresa como lote NUEVO por el mecanismo real de `inventory_entry` (mismo patrón que los `produced` de una transformación), con el costo ya congelado en la línea de venta original y un cuarto puntero de origen (`source_return_id`) que emite la letra **`D`** al publicarlo. Este camino aparece gratis en el kardex vía el `entry` existente.

Reingresar mercancía es una decisión aparte de cómo se liquida (`restock` por línea, default `true`) — puede haber devolución puramente financiera.

### Guardrail que no estaba en el pedido original

`sales.repository.insert_sale` nunca escribía `sale.account_id` pese a que la columna existe desde `00024` — un hueco inofensivo hasta que esta feature necesitó saber si una devolución en efectivo estaba sacando plata de una venta cobrada por Sistecrédito y todavía sin liquidar (eso sería devolver dinero que el negocio nunca recibió). Se corrigió como prerrequisito, no es scope creep: la regla nueva (`SALE_ACCOUNT_NOT_SETTLED`) es literalmente irrealizable sin el dato.

### Plazo: advierte, no bloquea

`company.settings.return_window_days` (default 30, `0`=sin límite) — no hay un plazo legal fijo que justifique un bloqueo absoluto. Pasado el plazo se rechaza salvo que el actor tenga `sales.return_override_time_limit`; con el permiso, pasa y viaja `time_limit_warning=true` en la respuesta.

### Backend: qué se tocó

`app/modules/sales/{schemas,service,repository,router}.py` (endpoints nuevos bajo `/sales/{id}/returns` y router propio `/credit-notes`), `app/modules/inventory/{schemas,service,repository}.py` (letra `D`, kardex, `source_return_id`), `app/modules/accounts/integration.py` (nuevo — faltaba, necesario para el guardrail sin importar `accounts.service`), `app/modules/platform/{service,integration,repository}.py` (permiso excluido de Moderador, `return_window_days`), `app/modules/company/{schemas,service}.py`. Tests nuevos en `tests/integration/test_sale_returns.py` (8 casos: camino A con kardex, camino B con letra `D`, devolución parcial, `restock=false`, idempotencia, plazo con/sin permiso, nota crédito emitida+redimida en dos ventas, bloqueo de settlement no liquidada). 294/294 tests en verde.

### Frontend: qué se tocó

`lib/sales/returns.ts` y `lib/sales/creditNotes.ts` (nuevos — viven en `lib/` y no en `features/sales/api.ts` porque `SaleReceiptDialog`, que los consume, es compartido y no puede importar otra feature, mismo motivo por el que `useVoidSale` ya vivía ahí). `components/shared/ReturnFormDialog.tsx` (nuevo, mismo criterio de ubicación). `SaleReceiptDialog` (botón "Devolver" + lista de devoluciones previas), `SaleFormPage` (aplicar nota crédito del cliente elegido, separa "Nota crédito aplicada" de "A cobrar"), `CustomerDetailPage` (tabla de notas crédito + saldo total destacado en el encabezado). `KardexDialog` ganó el caso `sale_return` en su switch de títulos (el `tsc` lo marcó como no exhaustivo apenas se regeneraron los tipos — la prueba de que el tipado real sirve). `lib/money.ts` ganó `minMoney` (acotar el monto de nota crédito a aplicar). `tsc`, ESLint, Vitest (129/129) y `npm run build` en verde.

### Lo que falta, explícito

**No se probó en un navegador real** — el `.env` de este repo apunta `VITE_SUPABASE_URL` al proyecto Supabase de dev remoto, así que un login real necesita credenciales que esta sesión no tiene, y armar un usuario de prueba contra el Auth local no estaba en el alcance. La cobertura real de la lógica de negocio (los 8 casos de `test_sale_returns.py`, contra Postgres real vía HTTP) es fuerte; lo que falta es la vuelta visual — clic a clic en el flujo completo (vender → devolver → ver el comprobante → aplicar la nota en una venta nueva → revisar la ficha del cliente) en la app corriendo de verdad. Migraciones `00041`-`00045` aplicadas y verificadas en **local únicamente** — faltan en la Supabase dev remota (recordatorio: `psql`, nunca `supabase db push`, y aplicar en el orden 00041→00045). Deploy del backend (`fly deploy -c fly.dev.toml`) tampoco se hizo todavía.

## Kardex por producto (23/08/2026)

Migración `00040_kardex_indexes.sql` (solo índices).

### El dato existía; la pregunta no

El movimiento de un producto vive en **tres tablas de líneas** —`inventory_entry_line`, `inventory_exit_line`, `sale_line`— y **nada las unía**. Las tres están indexadas por su documento porque siempre se consultaron **hacia adelante**: *dado un ingreso, qué artículos trajo*. La pregunta del kardex es la contraria —*dado un producto, qué documentos lo tocaron*— y no la respondía nadie.

`GET /inventory/products/{id}/kardex` la responde: la historia completa en una línea de tiempo, con saldo de unidades y de costo corriendo.

### El movimiento que no existe como fila

**Anular una venta repone el stock pero no escribe nada.** `void_sale` cambia el `status` de la venta y le devuelve la cantidad al lote — no hay línea inversa en ninguna tabla. O sea que ese movimiento existe en el stock y en ningún registro.

Hay que **sintetizarlo**. Sin eso el kardex mostraría una salida que nunca vuelve, y su saldo quedaría por debajo del real para siempre — que es exactamente la clase de error que hace que un libro auxiliar no sirva.

La fecha sale de `updated_at`, porque no hay columna `voided_at`. Es confiable **acá y solo acá**: se verificó que `void_sale` es el único `UPDATE` sobre `sale` en todo el backend, y un trigger mueve `updated_at`. Queda anotado en el SQL: si algún día la venta se pudiera editar por otro camino, esa fecha deja de significar "cuándo se anuló".

### La valoración es por lote, y por eso hay dos columnas de saldo

Las unidades dicen **cuánto hay**; el costo dice **cuánto vale lo que hay**. La segunda **no se deriva de la primera**: cada lote conserva su costo real (identificación específica, NIIF), así que tres unidades pueden valer 360.000 o 300.000 según de qué lote salgan.

El test lo fija con dos lotes del mismo producto a 100.000 y 160.000: al vender una del caro, el saldo baja a 360.000. Si se promediara diría 390.000.

Por eso cada línea muestra **de qué lote** salió el movimiento — sin eso, dos salidas del mismo producto a costos distintos parecerían un error de cálculo.

### Decisiones que se notan al usarlo

- **Sin filtro de fechas trae la historia entera**, al revés que el extracto de una cuenta (que arranca en los últimos 30 días). No es inconsistencia: en un extracto se busca conciliar el mes; en un kardex se busca **de dónde salió el saldo**. Un kardex que arrancara en cero al cambiar el filtro no sería un kardex, sería una lista de movimientos.
- **El saldo se acumula desde el primer movimiento.** Lo anterior al rango se comprime en `opening_quantity`/`opening_value`; por eso la consulta trae toda la historia hasta `to_date` y el corte lo hace el servicio.
- **Botón "Kardex" en la fila del producto**, no una tercera pestaña dentro del desplegable. Mismo criterio que "Extracto" en Cuentas: los dos son el libro de un mismo objeto y los dos necesitan más ancho del que da una fila.
- **Orden determinista con tres criterios** (`fecha`, `orden`, `item_id`). Todas las líneas de un ingreso comparten `created_at` —Postgres devuelve el instante de inicio de la transacción— así que sin el tercero el saldo corriente cambiaría entre consultas.

### El índice que faltaba desde 00006

`inventory_exit_line` no tenía **ningún** índice fuera de su clave primaria — ni siquiera por `exit_id`, que es como lo consulta el detalle de un egreso desde el día uno. Ingresos y ventas sí lo tenían. Pasó desapercibido porque los egresos son pocos.

### Verificación

```
pytest -q            # 285/285 (284 previos + 1 nuevo)
npm run typecheck && npm run lint && npm run test && npm run build   # 129/129
```

El test que justifica todo lo demás compara el saldo final del kardex contra la suma de los lotes — la otra forma, independiente, de responder cuánto hay.

---

## Trazabilidad de la transformación, y la navegación que no avisaba (22/08/2026)

Migración `00039_item_source_transformation.sql` (aditiva, con backfill).

### El hueco: el oro no sabía de dónde salió

`00037` construyó la transformación y dejó escrito que con ella *"la trazabilidad de una pieza rematada sobrevive: contrato → remate → artículo → transformación → lote de oro"*. Cierto — pero **solo en esa dirección**. Parado en el lote de oro no había forma de volver: el camino era `item → línea de ingreso → ingreso → transformación`, cuatro saltos y **ningún endpoint que los recorriera**.

Salió al explicarle a Mateo cómo funcionaban los códigos en una fundición. Es el segundo hueco que aparece **explicando** en vez de programando.

Para una compraventa importa por tres razones que no son técnicas:

- **Legal** — ese oro puede venir de la prenda de un cliente. Ante un reclamo, la cadena tiene que poder recorrerse hacia atrás desde lo que hay hoy en la vitrina.
- **Contable** — el costo de lo producido salió de repartir el de lo consumido. Un costo sin forma de auditar su origen es un número sin respaldo, y es el que determina la utilidad de la venta.
- **Operativa** — entraron 34 g de prendas y salieron 31,2 g de oro. Esa merma es información, y se perdía.

### `source_transformation_id`: el tercer puntero de origen

Junto a `supplier_id` y `source_contract_id`, y los tres **excluyentes**: dicen respectivamente que la mercancía se compró, se remató o se produjo acá. Ninguno de los tres = mercancía propia sin documento externo.

El documento pasó a insertarse **antes** de los lotes que produce (la FK lo exige). Efecto lateral bienvenido: el choque de `Idempotency-Key` ahora revienta **antes** de tocar stock.

### La letra `T`

Hasta acá, todo lo que no era proveedor ni remate caía en la `P` de "propio". O sea que una etiqueta **no distinguía oro fundido de mercancía que ya estaba el día uno** — dos cosas con costo, origen y respaldo documental completamente distintos bajo la misma letra.

Ahora: `R` remate · `P` propio · `T` transformado · o la letra del proveedor.

**Los códigos ya emitidos no se recalculan.** Un lote publicado como `P` antes de hoy se queda `P`: el código es inmutable y la etiqueta impresa que está pegada a la bolsa no se puede cambiar desde una migración. Lo que sí gana es el puntero, así que la app muestra su origen aunque la letra no lo diga.

### Letras reservadas — y una que ya estaba tomada

`R`, `P` y `T` **no estaban reservadas**: nada impedía crear un proveedor "Rodríguez" con letra `R` cuyos artículos quedaran indistinguibles de los rematados. En dev ya había un proveedor con `P`.

Se valida **solo al escribir**, no con un CHECK en la base: prohibirlas hacia atrás rompería el guardado de proveedores que ya las tienen, y sus códigos impresos son inmutables.

La reserva es **solo de proveedores**. Las letras de categoría forman el *prefijo* (`JOC0001`) y la de origen el *sufijo* (`-01R`): no comparten posición, así que "Relojes" conserva su inicial natural.

Dos cosas más en el camino:

- **Normalización a mayúscula y solo A-Z.** El índice de unicidad distingue mayúsculas, así que un proveedor `r` y otro `R` convivían como dos distintos, generando códigos que solo se diferencian por algo invisible en una etiqueta impresa. Nada de `Ñ` ni dígitos: el código termina escrito a mano en un buscador.
- **Un test flaky latente.** `test_list_suppliers` usaba `str(uuid4())[:1].upper()` como letra. La primera posición de un uuid es hexadecimal, así que **una de cada tres veces salía un dígito** — pasaba solo porque el único filtro era el largo.

### Historial de transformaciones

`GET /inventory/transformations` + pestaña en Inventario. **De la más reciente a la más vieja**, al revés que el resto de listados del módulo: acá lo último que se fundió es lo que se busca. El cursor sigue siendo el `id` y se traduce a su `number` en la misma consulta — `number` ordena cronológicamente, un `uuid4` no.

Cada fila trae el resumen de las dos puntas (qué entró, qué salió) para no tener que abrir el detalle solo para entender de qué se trató. **No** trae los `ItemOut` completos: son dos consultas por fila y en cincuenta transformaciones eso es un problema de rendimiento sin nada a cambio.

El detalle calcula la **merma**, pero solo cuando todo comparte una misma unidad: fundir gramos y sacar gramos es comparable; despiezar un celular (1 unidad) en tres piezas no lo es, y ahí *"salió más de lo que entró"* sería una lectura sin sentido.

Y desde el lote se llega de vuelta: `ItemEditDialog` gana *"Producido en la transformación #12"*, junto a las que ya existían para remate y proveedor.

Basta `inventory.view`: leer el historial no necesita `inventory.transform`.

### El bug de navegación: la app decía que no pasaba nada

Reportado como *"al crear la contraseña se queda cargando, luego deja de cargar permaneciendo en la misma pantalla y después de un rato lleva al inicio"*.

No era de esa pantalla. **Era de toda la app.**

`createRouter` no tenía `defaultPendingComponent`, y TanStack Router, mientras corre el `beforeLoad` de la ruta destino, **sigue mostrando la pantalla anterior**. El `beforeLoad` del layout espera dos cosas por red (`getSession()` y `GET /me`), así que cada navegación a una pantalla protegida tenía una ventana en la que la interfaz se veía **exactamente igual** que antes del clic.

Los tres momentos que describió Mateo eran: la contraseña guardándose, la contraseña ya guardada con el router trabajando en silencio, y el `/me` respondiendo. El del medio no tenía ningún indicador.

Dos arreglos:

- **`RouteTransitionBar`** en la ruta raíz — barra fija arriba mientras `router.state.status === 'pending'`. Va ahí y no como `defaultPendingComponent` porque un pending component **reemplaza** el contenido: un salto de pestaña de medio segundo parpadearía a blanco. Superpuesta, lo anterior sigue visible, que es lo correcto cuando la espera es corta.
- **`AuthCallbackPage`** gana un estado `entrando` propio. `setPassword.isPending` se apaga en cuanto Supabase responde, pero ahí todavía falta lo más lento — así que el botón volvía a decir "Guardar contraseña" mientras la pantalla se quedaba quieta. Ahora dice "Entrando…" y explica que la contraseña ya quedó guardada.

### Lo que NO se hizo

`P` sigue mezclando **inventario inicial** y **sobrante de conteo**. Son dos orígenes distintos bajo una letra, igual que antes lo eran tres. Se dejó así porque los dos son "mercancía propia sin documento externo" y la distinción no cambia ni el costeo ni la trazabilidad legal — a diferencia de la transformación, que sí tiene un documento detrás.

### Verificación

```
pytest -q            # 284/284 (280 previos + 4 nuevos)
npm run typecheck && npm run lint && npm run test && npm run build   # 129/129
```

Migración aplicada a local y a dev; backfill recuperó el lote de oro que ya existía de las pruebas.

---

## Extracto por cuenta y filtros en la URL (22/08/2026)

Los dos pendientes chicos de los diez frentes. Sin migración.

### Extracto por cuenta

Completa una idea que el proyecto ya tenía **escrita desde `00024`** y nunca construyó: *"solo las cuentas `cash` entran al arqueo — el resto lleva saldo corriente y se concilia aparte"*. El saldo ya se mostraba; el **"aparte"** no existía, así que la pantalla de Cuentas decía **cuánto** hay en el banco pero no **cómo** se llegó ahí. Y sin eso, una diferencia contra el banco no tiene dónde buscarse: si el banco dice 4.200.000 y el sistema 4.350.000, no hay nada que recorrer.

`GET /accounts/{id}/statement` devuelve saldo inicial, cada movimiento con su saldo corriente, y saldo final. **Del más viejo al más nuevo**: un extracto se lee hacia abajo acumulando, como el del banco.

**En efectivo no hay saldo corriente, y no es una carencia.** La base del cajón se vuelve a declarar en cada apertura y **no es un movimiento**, así que acumular el histórico daría un número sin significado —y negativo, porque los préstamos desembolsados superan lo cobrado—. Devolver un número igual sería **peor** que no devolverlo: alguien lo conciliaría contra el cajón y nunca cuadraría.

Así que `has_running_balance` viene en `false`, los saldos en `null`, y la UI **explica por qué** en vez de mostrar una columna vacía — la ausencia del saldo es una decisión, no un dato que falte. Los movimientos sí se listan: sirven para ver qué pasó por el cajón.

Solo exige `accounts.view`: es leer, no mover plata.

### Filtros en la URL

Los filtros de inventario vivían en `useState`: se perdían con un F5 y no se podían compartir. *"Mirá las compras por pagar de este proveedor"* era un link imposible de mandar.

Ahora viven en la dirección, y con ellos **la pestaña activa** — sin eso, un link a "compras por pagar" abriría en Productos con el filtro puesto en una pestaña que no se ve, que es peor que no compartirlo.

Al cambiar de pestaña **se limpian**: los filtros de Lotes no significan lo mismo en Egresos, y arrastrarlos daría una lista vacía sin explicación.

Dos detalles que se notan al usarlo:

- **`replace: true`.** Escribir cada tecla del buscador como entrada nueva del historial dejaría el botón «atrás» inservible: habría que pulsarlo una vez por letra para salir de la pantalla.
- **Los valores vacíos se borran**, no se guardan como `''`. Si no, la URL quedaría `?q=&status=&cat1=` al limpiar los filtros. `mergeSearch` se extrajo como función pura justamente para poder probar eso — es la única lógica del hook y equivocarse ahí se nota en **cada** URL de la app. Uno de sus tests fija que un `"0"` no se borre: filtrar con `!valor` es la trampa clásica.

Los `useState` que quedan son de diálogos, y ahí se quedan: que un modal esté abierto no es un filtro compartible.

### Verificación

```
pytest -q            # 280/280 (277 previos + 3 nuevos)
npm run typecheck && npm run lint && npm run test && npm run build   # 129/129
```

Ambos despliegues verificados con `vercel ls` y contra el `/openapi.json`.

---

## Estado de resultados — y el KPI que mentía (22/08/2026)

Sin migración.

### El bug

`/reportes` mostraba un KPI llamado **"Utilidad operativa"** que calculaba `ingresosOperativos − gastosOperativos` y **nunca restaba el costo de ventas**. Una cadena vendida en 500.000 que costó 300.000 contaba como **500.000 de utilidad**.

Y en la **misma pantalla** convivía con la tarjeta "Utilidad bruta de tienda", que sí lo restaba. Dos cifras contradiciéndose — y la que estaba más arriba era la que mentía.

Salió al explicar qué era el "estado de resultados unificado" que quedaba pendiente. No era una función faltante: era un número equivocado que alguien podía usar para decidir.

### El endpoint

`GET /reports/income-statement?from_date&to_date` da el resultado en orden:

```
  Ingresos          ventas netas + intereses cobrados
− Costo de ventas   costo congelado de lo vendido (solo tienda)
= Utilidad bruta
− Gastos            gastos operativos del período
= Utilidad
```

**No reimplementa ninguna regla:** reusa `profit_summary` (tienda) y `pawn_performance` (empeño), que ya definen cada número una sola vez con sus salvedades documentadas. Acá solo se suman y se ordenan.

**Sale de los DOCUMENTOS**, no de los movimientos de caja, por dos razones que importan las dos:

- El desglose de caja solo cubre sesiones **cerradas**: faltaría lo de hoy.
- Una venta con Sistecrédito **es ingreso** aunque no haya entrado plata — el ingreso se reconoce al vender, no al cobrar. Armado desde caja, ese ingreso aparecería tarde o no aparecería.

**Los movimientos de capital van aparte del resultado**, no dentro: prestar no es gasto, cobrar no es ganancia, y comprar inventario es convertir efectivo en activo — se vuelve gasto cuando se **vende**, momento en que ya está contado en el costo de ventas. Son los tres principios que este proyecto ya pagó caro. Se devuelven igual, para que nadie los busque en otra pantalla y concluya que faltan.

### En pantalla: el orden es el contenido

La tarjeta va en **cascada** y no como fila de KPIs sueltos. Cada línea se explica por la anterior, y **ver la resta** es lo que evita confundir ingreso con ganancia — un KPI aislado que diga "utilidad" es exactamente lo que estaba mal.

Los subtotales van **donde corresponden** (ingresos totales tras las dos fuentes, utilidad bruta justo después del costo de ventas), no todos al final: ver que la utilidad bruta sale de restar el costo es media explicación.

Al pie, lo que **no** es resultado, dicho explícitamente. Sin esa nota, alguien que compró mucho este mes buscaría esas compras en los gastos y concluiría que el reporte está roto.

### Se borró el campo, no solo su uso

`utilidadOperativa` se eliminó de `aggregateFinancialSummary`. Dejarlo sin usar era una trampa para el próximo que lo encontrara y pensara que era la utilidad. En su lugar quedó un comentario explicando por qué ese módulo **no** calcula la utilidad: agrega movimientos de caja para gráficas y desgloses, y una utilidad sin costo de ventas es una mentira.

### Verificación

```
pytest -q            # 277/277 (275 previos + 2 nuevos)
npm run typecheck && npm run lint && npm run test && npm run build   # 124/124
```

Los dos tests nuevos fijan lo que importa: que el costo de ventas se reste, y que capital y compras queden **fuera** del resultado.

---

## Transformación de inventario: fundir, despiezar, armar (22/08/2026)

`00037`. La operación que cierra el hilo que empezó con *"¿cómo paso un rematado a material?"*.

### Una función, no cuatro

Se pidió para fundir prendas rematadas y quedarse con el oro, pero **se generalizó a propósito** — corrección de Mateo: *"es una app para empresas de compraventas, cada una lo va a manejar distinto, la idea es generalizar"*.

| Uso | Entra | Sale |
|---|---|---|
| Fundir | 3 prendas rematadas | Oro 18k por gramos |
| Despiezar | Un celular dañado | Pantalla, batería, carcasa |
| Armar | Consola + 2 controles | "Kit gamer" |
| Reparar | Prenda + material | Prenda reparada |

Y **lo que pase después con lo que sale no es asunto de esta operación**: es inventario común y corriente — se vende al mostrador, se le vende a un mayorista, o se vuelve a transformar. Ese fue el hallazgo que simplificó todo: los tres escenarios que parecían caminos distintos eran el mismo hecho seguido de cosas que el sistema ya sabía hacer.

### El principio: el costo viaja

Lo que costó lo que entra es lo que cuesta lo que sale, más lo que cueste el proceso. **El costo de las salidas no se digita en ninguna parte.**

Sin esto, fundir tres cadenas de 575.000 obligaba a darlas de baja como pérdida (castiga 575.000 contra resultados, como si se hubieran evaporado) y meter el oro como sobrante de conteo (inventa 575.000 de la nada). Dos errores que se compensan en el saldo y **destrozan el estado de resultados**: aparece una pérdida enorme y después un regalo del mismo tamaño.

**La merma se absorbe sola.** Entran 34 g de prendas y salen 31,2 de oro: los 2,8 g son soldadura, impurezas, pérdida del proceso. No se registran como nada — el mismo costo se reparte entre menos gramos y el costo unitario sube. Es exactamente la verdad:

```
575.000 (prendas) + 25.000 (fundidor) = 600.000  ÷  31,2 g  =  19.230,77 /g
```

Y **ese número es el punto de toda la función**: contra el precio del oro del día dice si fundir convenía.

**Lo que cobra el fundidor se capitaliza.** El movimiento de caja va con concepto `purchase`, no `expense`: como gasto aparecería en el estado de resultados del mes, y no lo es — es parte de producir el activo, igual que el flete de una compra.

Con **varias salidas**, el costo se reparte proporcional al valor estimado de cada una, reusando `split_cost_by_appraisal` — el mismo mecanismo con que el remate reparte el saldo del contrato entre las prendas. En partes iguales, una carcasa "costaría" lo mismo que una pantalla.

### Cómo está implementado

**Reusa los caminos que ya existen** en vez de inventar uno paralelo: un `inventory_exit` con `exit_type='transformation'` por lo consumido, un `inventory_entry` con `origin_type='transformation'` por lo producido, y el documento que los vincula. Así el stock se mueve con las mismas validaciones de siempre y **la trazabilidad sobrevive**: contrato → remate → artículo → transformación → lote de oro.

El documento es **inmutable**: de una barra de oro no salen las tres cadenas otra vez. Permiso propio `inventory.transform` (especial), otorgado a quien ya podía hacer egresos.

### Una regla que corrigió un test

Había puesto que solo se transforma lo `available`. Pero un **borrador** también se funde — y de hecho es el caso más probable: una prenda que nunca se publicó porque ya se sabía que iba al crisol. Lo que no se transforma es lo vendido o dado de baja, porque su stock ya no existe.

Eso se reflejó en la UI: `ItemPicker` ganó `scope="transformable"`, porque con el picker normal esas piezas eran invisibles justo para la operación que más las necesita.

### La pantalla existe para una sola pregunta

**¿En cuánto queda cada unidad de lo que sale?** Registrar la operación es lo fácil; saber si convenía es lo que la hace útil. Por eso el costo unitario resultante está **en cada salida** y se recalcula en vivo mientras se escribe, no como resumen decorativo al pie.

El reparto se recalcula en el front para poder mostrarlo; el número que queda registrado es siempre el del backend.

Como es irreversible, la confirmación lleva **los números** —cuántos artículos, cuánto costo viaja— en vez de un "¿estás seguro?" genérico que nadie lee.

### Verificación

```
pytest -q            # 275/275 (272 previos + 3 nuevos)
ruff check . && mypy app
npm run typecheck && npm run lint && npm run test && npm run build   # 121/121
```

Despliegue verificado con `vercel ls la-legal-front-end` — no asumido.

---

## Unidad de medida y cantidad decimal (22/08/2026)

`00036`. Quita un límite que afectaba a **todos** los tenants, no solo al caso del oro.

### El límite

`quantity` era `int` en las **cuatro** tablas del flujo de mercancía (`inventory_item`, `inventory_entry_line`, `inventory_exit_line`, `sale_line`), así que 12,5 g no se podía ni representar. Salió diseñando la fundición, pero **no es una función de oro**: ninguna compraventa podía vender nada por peso ni por medida — oro por gramo, cable por metro, lo que fuera.

Curiosamente el lado de **empeño ya lo hacía bien** desde `00005`: `contract_item.weight_grams` es `numeric(10,2)`. Era el inventario el que se había quedado corto.

### Las dos piezas

- **`product.unit`** — enum (`unit`, `gram`, `kilogram`, `meter`, `liter`), no texto libre. Con texto libre terminan conviviendo "gr", "grs", "gramo" y "gramos" en la misma base y no hay forma de sumar ni de mostrar nada consistente. El backend expone también `unit_abbr` para que front, comprobantes y reportes digan todos lo mismo.
- **`quantity` → `numeric(14,3)`**. Al miligramo, y en la misma familia que el dinero para no meter floats en ningún lado.

### Tres reglas que esto habilita

**Un producto medido en `unit` rechaza fracciones.** Media cadena no existe: ahí una cantidad fraccionaria es un error de digitación —una coma donde iba un punto— y registrarlo deja stock imposible que nadie nota hasta que el conteo físico no cuadre. En una **venta** cuesta más caro todavía: descuenta stock imposible y cobra un total que no corresponde a nada.

**Reponer conserva la unidad del producto existente.** Si una compra nueva pudiera imponer la suya, bastaría dejar el selector en su valor por defecto para reinterpretar en silencio el stock anterior.

**La unidad no se cambia con lotes registrados.** Doce unidades no son doce gramos: cambiarla reinterpretaría stock, ventas y valorización sin que nada lo advierta. Mismo criterio que impide cambiar el **tipo** de una cuenta (`00024`) — un dato que da sentido a los hechos ya guardados no se toca después.

### El dinero

`subtotal` pasa ahora por `quantize`. Con cantidad decimal el producto puede arrastrar milésimas, y el redondeo a dos decimales tiene que ocurrir **antes** de sumar: si no, el total del recibo no cuadra con la suma de sus líneas.

### Un bug que destapó la migración

`AppError` llevaba un `Decimal` crudo en `details` al no haber stock para un egreso. Con `quantity` entero nunca se notó; al volverse `Decimal`, ese `400` reventaba al serializar y salía como **500 sin mensaje**.

### En la UI: contar y pesar son gestos distintos

Es la decisión de diseño que manda. En el carrito, un producto contable conserva los botones **+/−** —correcto para cadenas y anillos—; uno medido en gramos o metros muestra un **campo donde se escribe** la cantidad, porque sumar de a 1 g sería absurdo. La interacción la decide la unidad, no una preferencia.

El mínimo del carrito ya **no es 1**: en un producto fraccionable, forzar 1 impediría vender medio gramo de oro. Mismo arreglo en los egresos, donde además bloqueaba registrar una merma real.

La cantidad se captura como **texto**, no con `<input type=number>`: con `valueAsNumber`, "12," a medio escribir es `NaN` y el campo se vacía solo.

`formatQuantity` recorta los ceros de relleno de `numeric(14,3)` — el backend devuelve "2.000" para dos cadenas, y mostrarlo tal cual se lee como **dos mil**.

Se actualizaron todos los lugares que muestran cantidades, incluido el **recibo de venta**: un "12,5" sin unidad en el papel que se lleva el cliente no dice nada.

### Verificación

```
pytest -q            # 272/272 (266 previos + 6 nuevos)
ruff check . && mypy app
npm run typecheck && npm run lint && npm run test && npm run build   # 121/121
```

### Lo que esto desbloquea

La **transformación de inventario** (fundir, despiezar, armar) ya no tiene impedimento de modelo: entran N artículos, salen M, y el costo viaja. Sigue siendo lo próximo.

---

## El camino de alta de empresa, cerrado (22/08/2026)

Dos bugs y una función nueva, todos alrededor del primer contacto que tiene un cliente con el producto.

### 1. El bug que se escondió detrás de su propio arreglo

Reportado con el detalle que lo destrabó: *"la invitación funciona cuando un admin invita a alguien; el caso que te expongo es creando una empresa"*. Los dos caminos llaman a la **misma función**; lo único que cambia es `send_email`. Ahí estaba la trampa:

- `/admin/generate_link` **sí** lee `redirect_to` del body — por eso "Generar enlace" siempre funcionó y el bug parecía resuelto.
- `/invite` lo lee **solo del query string**. En el body lo ignora, en silencio, y manda al invitado al **Site URL** del proyecto, que es la raíz de la app: entra directo, con sesión, sin que nadie le pida contraseña. Y como queda sin contraseña, **tampoco puede volver a entrar después**.

Crear una empresa siempre manda correo, así que ese camino estaba **roto al 100%** mientras el otro se veía perfecto — por eso el síntoma parecía configuración de Supabase y no código. Confirmado contra el cliente oficial (`@supabase/auth-js`, `lib/fetch.js`): pone `redirect_to` en el query para **ambos** endpoints.

**Por qué no lo vieron los tests:** `tests/unit/test_auth_admin.py` se escribió justo para el bug anterior de esta misma línea (*"falta `redirect_to`"*), pero su cliente falso **no capturaba `params`** — ni siquiera aceptaba el argumento. Mirar solo el body era mirar donde el dato no estaba.

> **Efecto secundario a tener en cuenta:** los admins que ya entraron por ese camino **quedaron sin contraseña**. Funcionan mientras la sesión viva; al cerrarla no pueden volver. Se rescatan con el enlace de recuperación de abajo.

### 2. Enlace de recuperación, sin correo

Invitar ya no dependía del correo (`send_email=false` devuelve el enlace y no consume cuota). **Recuperar la contraseña sí**, y ahí no había alternativa: con el SMTP incluido de Supabase —unos pocos envíos por hora— un olvido dejaba a esa persona afuera y **nadie** podía ayudarla.

`POST /identity/users/{id}/recovery-link` usa el mismo mecanismo (`generate_link`, `type=recovery`). El admin lo pasa por WhatsApp, igual que la invitación — que para una compraventa suele ser mejor que el correo porque la persona está ahí mismo.

Es una **credencial de un solo uso**: quien la tenga puede cambiar esa contraseña y entrar como esa persona. Exige `identity.manage_users`, se audita quién lo generó y para quién, y **el enlace no se escribe en el `audit_log`** — que es consultable con `audit.view`. Un usuario inactivo no puede recibirlo: sería deshacer la desactivación por la puerta de atrás.

### 3. Test de la cadena completa

Existe por lo que costó encontrar el bug 1: cada pieza estaba probada por separado y **nada probaba la cadena**, que es justamente el camino que recorre todo cliente nuevo.

Cubre lo que sí es nuestro: empresa creada con sus roles semilla → admin en `invited` con rol Admin → su **primer request lo activa** (`invited → active`) → tiene todos los permisos → y desde ahí ya puede operar: invitar por enlace y rescatar por enlace. Lo de Supabase Auth (correo, token, contraseña) no se puede probar acá; la transición de estado y los permisos sí.

### Y una corrección al propio ESTADO.md

Decía que el dominio propio desbloqueaba tres cosas. **Dos son falsas**, y mandaba a resolver el problema equivocado:

- **El candado de Vercel** se apaga con un interruptor del proyecto (*Settings → Deployment Protection*). Un dominio propio **no** lo apaga: un proyecto protegido protege también su dominio.
- **El ambiente de producción** funciona sobre `.fly.dev` y la URL de producción de Vercel. El dominio solo cambia cómo se ve la dirección.
- **El correo** sí lo necesita para Resend — pero con invitar y recuperar por enlace, un piloto ya no depende de él.

Lo que el dominio sí resuelve, y nada más: la cara del producto.

### Verificación

```
pytest -q            # 266/266 (265 previos + 1 de cadena completa)
ruff check . && mypy app
npm run typecheck && npm run lint && npm run test && npm run build   # 115/115
```

---

## Herencia de categorías, permiso de pago y dos bugs de UI (22/08/2026)

Correcciones que salieron de revisar el modelo con Mateo. Una migración (`00035`).

### 1. Los parámetros de categoría no se heredaban — y eso rompía contratos

*"Si para crear un producto debo tener exactamente la última dependencia, ¿para qué necesito poner plazo, ventana y LTV en cada nivel?"*. Tenía razón: el contrato leía esos tres valores **solo de la categoría de nivel 3**, así que los mismos campos en los niveles 1 y 2 eran configuración muerta — el formulario los pedía y nada los leía.

Y había un efecto peor que el desperdicio: si a **una sola hoja** se le olvidaba el plazo, crear un contrato con esa prenda fallaba con *"la categoría no tiene plazo configurado"*. Con treinta hojas, era cuestión de tiempo.

`catalogs.resolve_category_params` sube por `parent_id` hasta el ancestro más cercano que defina **cada campo por separado**: una hoja puede heredar el plazo de su padre y el LTV de su abuelo. Con eso, *"toda la joyería en oro va a 4 meses"* se configura una vez arriba — que es lo que hace que tener un árbol de tres niveles valga la pena — y esa clase de falla desaparece.

**No hizo falta migración:** los campos ya existían en los tres niveles, solo que nadie leía los de arriba. Los contratos vivos no se ven afectados: el contrato congela estos valores en su snapshot al nacer.

En el front, `resolveInheritedParams` espeja la consulta y el formulario **muestra** lo heredado en el placeholder. El texto de ayuda cambia según lo que de verdad pasa —hay herencia disponible, esta categoría define para las de abajo, o nadie en la rama tiene plazo (en rojo, porque ahí ningún contrato va a poder crearse)—. El texto viejo decía *"obligatorios para categorías nivel 3"*, que dejó de ser cierto y encima nunca dijo de dónde salían.

### 2. `00035` — pagarle a un proveedor no es administrar inventario

`POST /entries/{id}/pay` exigía `inventory.create`, o sea que **quien maneja la bodega podía sacar plata de la caja** para pagarle al proveedor.

Son dos hechos contables distintos y separados en el tiempo, y el sistema ya los distingue por dentro (`entry_date` vs `paid_at`): la mercancía **entra** y cambia el inventario; la factura **se paga** y cambia el efectivo y la deuda, sin mover el inventario.

Mismo criterio que separó `accounts.settle` (00029) y `accounts.transfer` (00032): una acción que mueve plata lleva su propio permiso, aunque viva en la pantalla de otro módulo. Se otorga a todos los roles que hoy tienen `inventory.create` — nadie pierde lo que tenía.

### 3. Nadie se desactiva a sí mismo

Reportado probando: el único usuario de una empresa recién creada —su administrador— **veía el botón para desactivarse**.

El backend lo rechaza (`LAST_ADMIN_SAFEGUARD`), así que nunca hubo riesgo de dejar una empresa sin acceso. Pero ofrecer una acción que siempre falla invita a intentarla y enseña que los errores son normales.

Se oculta **para uno mismo** y no solo para "el último admin": el front no sabe quién es admin —depende de qué permisos tenga cada rol— pero sí sabe quién es uno. Y la regla es más simple de explicar: si alguien se va, lo desactiva otro.

### 4. Estados de carga que faltaban

El panel del producto mostraba una barra gris de una línea, que no se lee como "cargando" sino como "no hay nada". Se agregó `TableSkeleton`, con la misma forma que la tabla que va a llegar y arranques escalonados — todas las barras pulsando a la vez laten como un bloque y se leen como un error de render.

El formulario de ingreso era peor: se pintaba completo y "listo" mientras las categorías y los proveedores seguían viajando, así que los desplegables salían vacíos sin ninguna señal.

### Lo que quedó pendiente y por qué

**El flujo de invitación** (*"el admin entra sin configurar contraseña"*): el código está bien en las dos puntas — el backend manda `redirect_to={FRONTEND_URL}/auth/callback`, `FRONTEND_URL` está configurado en Fly, la ruta del callback no tiene guard y la pantalla pide contraseña. Si el invitado entra directo, es porque Supabase **descartó el redirect** y cayó en el Site URL, que es la raíz de la app. Eso pasa cuando la URL no está en la lista de *Redirect URLs* permitidas (Supabase la ignora **en silencio**, ver `DEPLOY.md`). No se pudo verificar la config viva del proyecto desde acá; el diagnóstico de 30 segundos es usar **"Generar enlace"** al invitar y mirar si la URL trae `redirect_to=…%2Fauth%2Fcallback`.

**Unidad de medida y cantidad decimal**, y **transformación de inventario** (fundir, despiezar, armar): decididos en diseño, no construidos. `quantity` es `int` en las cuatro tablas, así que hoy ninguna compraventa puede vender por peso o medida. Ver la conversación del 22/08 — el resumen es que la transformación es una sola operación genérica (entran N artículos, salen M, **el costo viaja**) y que lo que pase después con lo que sale es inventario común.

### Verificación

```
pytest -q            # 262/262 (260 previos + 2 nuevos)
ruff check . && mypy app
npm run typecheck && npm run lint && npm run test && npm run build   # 115/115
```

---

## Por qué la foto era obligatoria — y por qué dejó de serlo (22/08/2026)

Pregunta de Mateo: *"en el momento de crear un artículo, ¿por qué la foto es obligatoria para publicarlo?"*. **No había razón técnica.**

### De dónde venía

Del spec original — `CLAUDE.md`, sección *Remate asistido*: *"publish valida precio/fotos"*. Y ahí está la clave: **la frase estaba escrita pensando en el remate**, donde la exigencia sí tiene una razón fuerte:

- Un artículo rematado viene de una prenda que un cliente dejó en garantía. La foto es **evidencia de qué pieza era** — importa si el cliente aparece después reclamando.
- En joyería cada pieza es única: el cliente no compra "una cadena", compra *esa* cadena.

Pero la regla se implementó para **todo** artículo. Para mercancía fungible —cincuenta fundas de celular iguales, compradas por docenas— era fricción sin beneficio: obligaba a fotografiar en cada reposición algo que ya estaba fotografiado.

### La raíz era estructural

`00022` subió el nombre, la categoría, la descripción y el precio del lote al **producto**, y dejó las fotos abajo. Para una pieza única eso es correcto —cada pieza es distinta y merece su foto—. Para mercancía repetida está en el lugar equivocado.

O sea que "la foto es obligatoria" y "hay que re-fotografiar en cada compra" eran **el mismo problema visto desde dos lados**.

### Qué se hizo (`00034`)

- **`product.photos`**: cómo se ve el producto. Se toma una vez y todos sus lotes la heredan. Backfill desde el lote **más antiguo** de cada producto — el que se fotografió al darlo de alta, o sea la foto "de catálogo"; un lote posterior suele documentar algo puntual de esa compra, que es justo lo que no debe subir.
- **`inventory_item.photos` se conserva** como override del lote, para lo que sí es propio de una compra: una tara, el estado de una pieza. Se conserva en vez de contraerse porque **las piezas de remate ya tienen sus fotos ahí y son evidencia legal** — moverlas y borrar la columna sería jugar con lo único de este módulo que puede terminar en una discusión con un cliente.
- **`ItemOut.photos` son las efectivas**: las del lote si tiene, si no las del producto.
- **Publicar exige foto solo si `product.is_unique`** — que es exactamente el caso del remate.
- **Las fotos que se suben en una compra van al producto**, no al lote.
- **El remate escribe las fotos de la prenda en el producto** (1:1 con la pieza, porque siempre crea un producto único), así que sigue naciendo fotografiado y publicable sin subir nada.

### El efecto en el flujo de ingreso

La publicación automática ya no depende de la foto: **basta el precio**. Con eso el borrador pasa a significar una sola cosa —*no se sabe en cuánto se vende*— y eso sí tiene que bloquear: publicar con un precio inventado sería peor que esperar.

`LineReadiness` y el resumen del pie se simplificaron en consecuencia: ya no hay dos cosas que puedan faltar, hay una.

### Limitación conocida

`item.photos` son las efectivas y el diálogo del lote no puede distinguir las propias de las heredadas, porque la API expone solo el resultado. Si alguien agrega una foto propia a un lote que estaba heredando, se guardan también las heredadas y ese lote deja de seguir al producto. Es un caso de borde aceptable —el override existe justo para eso— y si llega a molestar, la solución es exponer `own_photos` aparte en `ItemOut`. Queda anotado en el propio componente.

### Verificación

```
pytest -q            # 260/260 (258 previos + 2 nuevos)
ruff check . && mypy app
npm run typecheck && npm run lint && npm run test && npm run build   # 111/111
```

Tres tests se actualizaron porque fijaban la regla vieja — incluido `test_publish_requires_photo`, que ahora es `test_publish_does_not_require_a_photo_for_regular_merchandise`. El caso del remate quedó cubierto aparte en `test_auction_unique_piece_still_requires_a_photo`.

---

## Tanda D de los diez frentes: los reportes que pediría un contador (22/08/2026)

Sin migraciones. Cierra las cuatro tandas de `docs/propuesta-diez-frentes.html`.

### 0. Otro bug que apareció construyendo

El reporte de mercancía sin rotación salía **vacío** con datos que debían aparecer. La causa: `00020` agregó `entry_date` al **ingreso** y nunca lo propagó al **lote**, que se quedaba con el `current_date` por defecto de `00006`.

O sea que una compra cargada con fecha de la semana pasada guardaba esa fecha en el ingreso y **"hoy" en cada uno de sus lotes**. La ficha del lote mostraba una fecha de entrada falsa, y cualquier medida de antigüedad de inventario contaba desde el día de la digitación en vez del día en que la mercancía llegó. Ya estaba mal desde `00020`; el reporte nuevo solo lo hizo visible.

Es el segundo bug que destapa escribir el reporte antes de confiar en el dato — el primero fue el inventario inicial que no se podía publicar (Tanda C).

### 1. Cuentas por pagar

`GET /reports/payables`, agrupado por proveedor y con antigüedad 0-30 / 31-60 / +60. El dato vivía en cada compra desde `00020` (`paid_at`) y **ninguna pantalla lo sumaba**: había que abrir los ingresos uno por uno para saber cuánto se debe.

Tres decisiones que valen la pena:

- **La antigüedad se mide desde `entry_date`**, no desde `created_at`. Es la fecha desde la que el proveedor cuenta el plazo — cargar hoy una factura de hace dos meses no la vuelve reciente.
- **Solo cuenta compras.** Los demás orígenes no le entregan plata a nadie, así que "sin pagar" no significa nada en ellos e inflaría la deuda.
- **El proveedor va por `LEFT JOIN`**: `supplier_id` es opcional en el esquema, y una deuda sin proveedor asignado tiene que seguir apareciendo. Esconderla sería el peor resultado posible en un reporte de deudas.

El test verifica algo que suena obvio y no lo es: **los tres tramos suman exactamente el total**. Un peso que no cae en ningún tramo es un peso que el reporte esconde.

### 2. Valorización del inventario

`GET /reports/inventory-valuation`. Al **costo**, que es lo correcto contablemente y lo que sale de la identificación específica. Solo cuenta `available`: un borrador no se puede vender —ni siquiera tiene precio— e incluirlo inflaría el activo con mercancía que todavía no lo es.

`retail_value` se expone aparte y **etiquetado como referencia**. Contar la utilidad antes de venderla es el error clásico, y poner esa cifra primero invitaría a cometerlo. La utilidad potencial puede salir **negativa** y se deja así: significa que hay mercancía por debajo del costo, y eso vale más verlo que taparlo con un `max(0)`.

### 3. Mercancía sin rotación

`GET /reports/stale-inventory`. Se mide sobre el lote **más antiguo todavía disponible**: si algo entró hace un año y se repuso ayer, lo congelado es la pieza vieja, y usar la fecha del lote nuevo la escondería justo cuando más importa verla.

El umbral es ajustable (60/90/180/365) porque "mucho tiempo" depende del negocio: una cadena de oro que lleva seis meses es normal, un celular que lleva tres es un problema. Fijarlo en el código habría hecho el reporte inútil para media vitrina.

### 4. La ficha del proveedor

`/proveedores/$supplierId`, espejo de la del cliente. El cliente tenía su ficha con historial cruzado desde el paso 4; el proveedor tenía un formulario de creación y nada más.

El KPI que manda es **lo pendiente**: es la única cifra sobre la que hay algo que hacer hoy. El total comprado es contexto — dice qué tan importante es este proveedor, no qué hacer con él.

La lista de proveedores ahora abre la **ficha** al hacer clic, no el formulario. Lo que uno quiere al tocar un proveedor casi siempre es "¿qué le compré y cuánto le debo?", no cambiarle el teléfono; editar quedó a un clic desde la ficha, igual que en clientes.

### 5. Compras por producto

`GET /inventory/products/{id}/purchases`, como pestaña junto a "Lotes". Responde **"¿cómo se movió el costo?"** y **"¿a quién le compro más barato?"**. La fila del producto ya insinuaba esto mostrando el rango `min_cost`/`max_cost`, pero no dejaba abrirlo: se veía que el costo se movió y no por qué ni con quién.

Marca el costo más barato y el más caro en vez de dejar la comparación al ojo — con seis compras a precios parecidos, la diferencia que importa es justamente la que no salta a la vista. Con una sola compra no marca nada: sería ruido con aire de información.

### Dónde quedó todo esto

`/reportes` pasó a tener **dos pestañas**, y no es cosmético: son dos preguntas con forma distinta. **"Período"** resume un rango y por eso lleva selector de fechas. **"Contabilidad"** es una foto de hoy — cuánto debo, cuánto tengo en mercancía, qué no rota — y esas no tienen versión "en marzo": o se debe hoy, o no se debe. Meterlas bajo el mismo selector habría prometido un filtro que no significa nada.

`KpiCard` ganó `hint`, una línea de contexto bajo la cifra para cuando el número solo se entiende con su denominador ("3 compras sin pagar"). Excluyente con `delta`: ocupan la misma línea y competir ahí sería ruido.

### Verificación

```
pytest -q            # 258/258 (252 previos + 6 nuevos)
ruff check . && mypy app
npm run typecheck && npm run lint && npm run test && npm run build   # 111/111
```

### Lo que queda de los diez puntos

- **Estado de resultados unificado** (ingresos − costo de ventas − gastos, con los dos módulos): hoy la utilidad de tienda y el rendimiento del empeño viven separados, correctamente, porque se miden distinto. Falta la vista de arriba.
- **Kardex por producto**: la línea de tiempo unificada de entradas, salidas, ventas y ajustes con saldo corriente. Los datos están en tres tablas; falta unirlos.
- **Extracto por cuenta**: movimientos de una cuenta con saldo corriente, para conciliar contra el banco.
- **Devolución de cliente** como tipo de ingreso (§10 de la propuesta) — es un tema de negocio, no solo un enum.
- **Estado de los filtros en la URL** (viene de la Tanda C).

---

## Tanda C de los diez frentes: la compra deja de nacer incompleta (21/08/2026)

Sin migraciones. Es la tanda que más se siente a diario.

### 0. Un bug que la Tanda B había dejado sembrado

Al publicar, el código se arma con la letra del proveedor (o `R` si es remate). Un ingreso **sin proveedor** no tenía ninguna de las dos: lanzaba `400` y la mercancía quedaba atrapada en borrador **para siempre**.

Con los tipos de 00033 eso pasó de rareza a callejón sin salida: `initial_stock` se creó justamente para cargar lo que la compraventa ya tiene en la vitrina, y **no servía para ponerlo en la vitrina**. Lo encontró una sonda escrita a propósito antes de empezar la tanda, no un usuario.

Ahora cae en **`P` de "propio"**, con la misma lógica que la `R`: la letra dice de dónde salió la pieza. Si el proveedor se conoce, su letra sigue mandando — `P` es respaldo, no reemplazo, y hay un test para cada caso.

### 1. Precio y fotos en el ingreso, y publicación automática

`EntryLineIn` gana `sale_price` (y ya tenía `photos`). Con precio y al menos una foto, **el lote se publica en el acto**: emite código y queda `available`.

Antes toda compra nacía en borrador sin importar qué tan completa viniera, y había que volver artículo por artículo desde otra pantalla. El borrador dejaba de significar *"le falta algo"* y pasaba a ser el estado normal — con el efecto perverso de que un artículo **realmente** incompleto se volvía invisible: no está en la vitrina y nadie se entera hasta que alguien lo busca para vender.

El precio puede venir en la línea **o ya estar en el producto**: reponer algo que ya se vendía no obliga a redigitarlo, y así se evita que alguien escriba otro y deje dos lotes del mismo producto a precios distintos en la misma vitrina.

**El estado se dice antes de guardar, no después.** Cada línea muestra si va a quedar lista o en borrador y qué le falta; el pie del formulario resume `N listos · M en borrador`; y el toast final reporta lo que **realmente** pasó, leyendo el `status` que devolvió el backend en vez de afirmar "N artículos en borrador" como hacía antes (que además ya era mentira).

### 2. El carrito de compra

Comprar varios artículos **siempre se pudo** — el backend recibe una lista desde el día uno. El problema era la forma: cada línea era un bloque enorme y el buscador de "¿ya lo compraste?" vivía **dentro de cada línea**, así que reponer diez productos conocidos obligaba a crear diez bloques y buscar diez veces.

Ahora hay **un** buscador arriba que agrega líneas ya llenas, las líneas resueltas se colapsan a una fila compacta (con subtotal y estado) y se expanden al tocarlas. Diez artículos caben en pantalla y la compra se puede revisar de un vistazo antes de confirmar.

**Busca productos, no lotes**, y el cambio no es cosmético: el producto trae el precio de venta, que es lo que permite que la línea entre completa. Un lote trae además su costo puntual —información de *esa* compra— y sugerirlo invitaba a repetir un costo de hace seis meses. El costo se escribe siempre, porque siempre cambia. Sigue creando una línea nueva y **nunca sumando cantidad** a un lote existente: el costeo es por identificación específica y fusionar dos compras obligaría a promediar.

### 3. Filtros

**Backend:** `/entries` gana `supplier_id`, `origin_type`, `payment_status`, `from_date`, `to_date` y `q` (número o factura); `/products` gana categorías, `supplier_id`, `in_stock` y `active`; `/exits` gana `exit_type` y fechas.

`payment_status=pending` es el que más falta hacía: **"¿qué compras tengo por pagar?"** no tenía respuesta en la app aunque el dato estuviera en cada fila desde 00020 y hasta con índice parcial. Solo cuenta compras — los demás orígenes no entregan plata, así que "sin pagar" no significa nada en ellos e inflaría la deuda con proveedores.

Dos detalles de SQL que valen la pena: el filtro de proveedor en `/products` va como `EXISTS` y no como `JOIN`, porque un join multiplicaría filas antes del `group by` y falsearía los agregados de lotes; y `in_stock` va en `HAVING`, porque "tengo algo para vender" es propiedad de la suma de los lotes, no de una fila.

**Front:** la pestaña Ingresos abre con las píldoras Todos / Por pagar / Pagados, y con "Por pagar" activo muestra el **total adeudado** — quien abre ese filtro no quiere la lista, quiere el número. Productos gana categorías, proveedor y "Solo con stock". Egresos gana el tipo.

Las etiquetas de tipos ganaron `entryOriginLabel`/`exitTypeLabel` con respaldo seguro, en vez de indexar el `Record` directo: con `noUncheckedIndexedAccess` eso devuelve `string | undefined`, y el fallback evita que un enum nuevo del backend se vea vacío. De paso apareció que `ExitFormDialog` tenía su unión de tipos escrita **a mano** y se había quedado sin `loss`: el selector lo ofrecía y TypeScript lo rechazaba al elegirlo. Ahora se tipa desde la lista compartida.

### Verificación

```
pytest -q            # 252/252 (243 previos + 9 nuevos)
ruff check . && mypy app
npm run typecheck && npm run lint && npm run test && npm run build   # 111/111
```

### Lo que queda

**Estado de los filtros en la URL** (search params del router) — que sobrevivan a un F5 y se puedan pasar por link. Es polish y quedó fuera a favor de exponer los filtros que responden preguntas reales.

**Precio sugerido al rematar:** el remate ya hereda las fotos (Tanda A) y conoce el costo, así que podría sugerir precio y publicar solo, igual que una compra. No se hizo para no tocar el flujo de remate sin un contrato real de por medio.

---

## Tanda B de los diez frentes: consignar, histórico de caja y tipos de ingreso (21/08/2026)

Tres migraciones (`00031`–`00033`), todas **aditivas**, aplicadas a la dev remota antes del deploy. Análisis completo en `docs/propuesta-diez-frentes.html`.

### 1. Consignar el efectivo — la operación que no existía

Al final del día se saca la plata del cajón y se lleva al banco. **Eso no se podía registrar.** El módulo de cuentas sabía *liquidar* un convenio pero no mover plata entre dos cuentas propias, así que quedaban dos salidas y las dos estaban mal: registrarlo como **gasto** (falsea la utilidad por casi toda la caja del día — el mismo error que el proyecto ya pagó con el capital de los contratos) o **no registrarlo** (el banco queda mintiendo y el esperado del día siguiente queda inflado, así que el arqueo descuadra sin culpa del cajero).

**Un traslado no es ingreso ni egreso: es la misma plata en otro bolsillo.**

- Tabla `account_transfer` como **documento**, no solo dos movimientos sueltos. CLAUDE.md regla 4: los movimientos de caja salen de documentos. El documento guarda fecha, motivo, autor y clave de idempotencia; sin él, un traslado sería el único movimiento de dinero del sistema sin nada que lo respalde. Inmutable, como el resto del libro.
- Conceptos **propios** `transfer_in`/`transfer_out`, **no `adjustment`**. Un ajuste significa "el sistema no cuadra con la realidad"; un traslado sí cuadra. Y los conceptos propios permiten excluirlos de los reportes sin ambigüedad.
- Si toca efectivo **exige caja abierta** y baja el esperado del cierre — que es el punto entero: se consignó, ya no está en el cajón. Va **antes** de cerrar; una sesión cerrada es inmutable y el diálogo lo dice explícitamente cuando aparece `CASH_SESSION_NOT_OPEN`.
- Permiso propio `accounts.transfer` (especial: mueve plata), excluido de Moderador por el mismo criterio que ya excluía `accounts.settle`.
- Botón en **dos** lugares: Cuentas (con el origen libre) y Caja (con el cajón preseleccionado). El segundo importa más — es donde el cajero está cuando consigna.

**Lo que casi se escapa:** `aggregateFinancialSummary` calcula `flujoEntradas`/`flujoSalidas` sumando *todos* los movimientos. Un traslado genera un `out` y un `in` por el mismo monto, así que consignar un millón habría inflado ambos lados en un millón sin que entrara ni saliera un peso del negocio. Se agregó `TRANSFER_CONCEPTS` para excluirlos del flujo — la misma eliminación que hace cualquier estado de flujo de efectivo con movimientos entre cuentas propias. De ingresos y gastos ya quedaban fuera solos, porque `REVENUE_CONCEPTS`/`EXPENSE_CONCEPTS` son listas de *permitidos* y no de excluidos; ese diseño previo salvó el caso.

Siguen visibles en el desglose del acta, con etiquetas propias ("Consignado / trasladado"): excluirlos de los totales no es esconderlos, y sin esa línea el arqueo del día no se explicaría.

### 2. Histórico de caja con permiso propio

`cashbox.view` abría todo: la sesión de hoy y el listado completo de cierres. Ahora el listado exige `cashbox.view_history`, y el detalle/reporte de **una** sesión lo exige solo si no es la de hoy (`assert_can_read_session`, con `has_permission` dentro del service).

**El corte es la fecha, no el estado.** Una sesión de hoy ya cerrada sigue siendo el turno de quien la cerró y necesita poder imprimir su acta; una abierta que quedó de ayer sigue siendo la sesión en curso.

**La puerta de atrás que había que cerrar:** `GET /reports/closings` expone el mismo dato desde otro módulo y solo pedía `reports.view`. Si se le quita el histórico al cajero por un lado y se le deja esa URL por el otro, el permiso es teatro. Ahora exige los dos.

**Y lo que eso destapó:** el front deducía *"¿ya cerré hoy?"* de `/reports/closings` — un rodeo que ya arrastraba un hallazgo previo (el listado de sesiones pagina ascendente, así que `limit=1` daba la más **vieja**). Con el permiso nuevo, un cajero habría necesitado ver los cierres de todo el negocio para saber si cerró su propio turno: el permiso le habría **roto la pantalla** en vez de acotarla. Se agregó `GET /cashbox/sessions/today` —la sesión de hoy, abierta o cerrada— bajo `cashbox.view`, y el rodeo desapareció.

En el front, `useRawSessions` y `useClosingsHistory` comprueban el permiso antes de disparar: sin eso, un rol sin histórico haría una ráfaga de 403 en cada carga de `/reportes` por algo que ya sabemos mirando sus permisos. Y `/reportes` muestra un mensaje que **nombra el permiso que falta**, en vez de un skeleton eterno o un "no se pudo cargar" que manda a buscar una falla inexistente.

### 3. Tipos de ingreso de mercancía

"Otro" era un cajón de sastre y hacía imposible responder de dónde salió el inventario. Se agregaron:

- **`initial_stock` — la urgente.** Cuando la compraventa arranque con el sistema ya tiene mercancía en la vitrina. Hoy solo podía cargarla como "otro" (que no dice nada) o como una **compra falsa**, que además le sacaría de la caja una plata que nunca salió. No toca caja y queda marcada para que no contamine el costo de mercancía comprada del período.
- **`adjustment_in`.** Existía el egreso por ajuste, así que el inventario físico solo podía **bajar**. Si al contar sobraba una pieza, no había cómo registrarla y el sistema quedaba mintiendo a sabiendas.
- **`loss`** (egreso). Un daño es mercancía que existe y ya no sirve; una pérdida es mercancía que no está. Contablemente no son lo mismo.

`other` se conserva pero **exige motivo** (backend y form): un cajón de sastre que obliga a explicarse al menos deja rastro.

Las etiquetas de tipos estaban duplicadas en **cuatro** pantallas — el camino exacto por el que un tipo nuevo aparece bien nombrado en una y como `initial_stock` en crudo en las otras tres. Se centralizaron en `lib/inventory/entryTypes.ts`, con la frase que explica cuándo usar cada uno (la duda real del usuario, no la definición).

### Verificación

```
pytest -q            # 243/243 (235 previos + 8 nuevos)
ruff check . && mypy app
npm run typecheck && npm run lint && npm run test   # 106/106
```

Migraciones aplicadas a la Supabase dev remota vía `psql` (no `db push`: el CLI de la máquina está autenticado con otra cuenta) y registradas en `supabase_migrations.schema_migrations` con la convención del proyecto. Backend desplegado en Fly antes de regenerar los tipos del front.

### Lo que queda de la Tanda B

El flujo de **"cerrar y consignar"** en un solo paso (dejar base fija en el cajón, consignar el resto) quedó fuera: hoy son dos acciones seguidas y el diálogo avisa del orden. Vale la pena hacerlo cuando haya un cierre real de por medio para probarlo.

---

## Tanda A de los diez frentes: tres bugs de dinero y de inventario (21/08/2026)

Primera tanda de la revisión de diez puntos (`docs/propuesta-diez-frentes.html`, que tiene el análisis completo y el orden propuesto). Son los arreglos **sin migraciones**: se despliegan solos.

### 1. El precio de venta se perdía de verdad

Reportado como *"toca volver a entrar para publicarlo y el valor a vender no se quedó guardado"*. No era percepción. `ItemEditDialog` mostraba un campo **"Precio de venta"** junto a un único botón **"Guardar fotos"**, y ese botón llamaba a `PATCH /inventory/items/{id}` mandando **solo `{photos}`** — porque `ItemUpdateIn` del backend solo acepta fotos: desde 00022 el precio es del **producto**, no del lote. El precio digitado nunca salía del navegador.

Encima, `canPublish` exigía `!hasUnsavedPhotos`, o sea que había que guardar las fotos **primero** y publicar **después**: dos actos para una sola intención, y tres pasos en total.

**La corrección no fue mandar el precio en el PATCH del lote** —ahí no pertenece, y meterlo habría reintroducido la divergencia entre lotes que 00022 vino a cerrar—. Fue que el diálogo haga las llamadas que hagan falta sin que el usuario tenga que saber en qué tabla vive cada dato: `handlePublish` guarda las fotos si cambiaron y luego publica (que ya fija el precio en el producto). Un botón, una intención.

`canPublish` mira ahora `photos` (lo que hay en pantalla) y no `item.photos` (lo guardado), así que subir una foto ya habilita publicar. "Guardar y seguir en borrador" queda como secundario, para dejar el trabajo a medias a propósito.

### 2. Los remates rehacían trabajo ya hecho — el hallazgo más grande

Al crear un contrato se suben las fotos de cada prenda y quedan en `contract_item.photos`. Al rematar, `AuctionItemInput` llevaba categoría, descripción y avalúo… **y no las fotos**. El `inventory_item` nacía con `photos=[]`.

Como publicar exige ≥1 foto, **toda pieza rematada nacía bloqueada** esperando que alguien volviera a fotografiar una prenda que ya estaba fotografiada desde que se firmó el contrato. Y en una compraventa los rematados son buena parte del inventario.

Ahora se heredan. Es casi una línea, y elimina de raíz el *"toca subir la imagen si no, no deja"* para todo el flujo de remate. Test: `test_auction_inherits_contract_item_photos` verifica además que el borrador ya se publica **sin subir nada**, que es lo que la corrección venía a desbloquear.

### 3. Sistecrédito se ofrecía para pagarle a proveedores

`AccountPicker` filtraba solo por medio de pago: con `other` ofrecía las cuentas `bank` **y** las `settlement`, sin mirar si la plata entraba o salía. Así se podía elegir "pagarle al proveedor con Sistecrédito" — una operación que no existe: una cuenta `settlement` es una cuenta **por cobrar**, plata que todavía te deben, no un saldo disponible.

Arreglado en las **dos capas**, porque la UI oculta pero no protege (CLAUDE.md regla 7):

- **Front:** `AccountPicker` recibe `direction: 'in' | 'out'`. Los cuatro puntos de pago la pasan (`EntryFormPage`, `EntryDetailDialog`, `ExpenseFormDialog`, `ContractFormPage`); venta y abono se quedan con el default `in`.
- **Backend:** `resolve_account_for_movement` rechaza una `settlement` como origen de una salida con código propio `ACCOUNT_CANNOT_FUND_PAYMENT`. La única salida legítima de una cuenta por cobrar es su **liquidación**, que tiene endpoint propio y no pasa por ahí.

El test cubre además la contraparte: **cobrar** hacia esa cuenta sigue funcionando. Si eso se rompiera, el arreglo habría inutilizado el módulo en vez de corregirlo.

### 4. Filtros que ya existían y nadie veía

`GET /inventory/items` aceptaba `supplier_id` y `origin` desde antes, y ninguna pantalla los ofrecía. Exponerlos no tocó backend. La barra de filtros de la pestaña **Lotes** los tiene ahora, con un cruce: elegir origen "Remate" apaga el selector de proveedor, porque un artículo de remate no tiene proveedor y esa combinación nunca devuelve nada.

`CategorySelect` se generalizó a `FilterSelect` sobre `{value,label}`: tres selectores idénticos con tres componentes distintos era la forma de que se fueran separando.

### 5. Las cuentas genéricas dejan de sembrarse

*"¿Para qué tenemos 'Otros medios' o 'Transferencias' si se supone que las debemos crear?"* — respuesta: eran un **artefacto de la migración 00024**, que tenía que mapear el enum viejo de medios de pago a cuentas reales para no perder el histórico de las empresas que ya existían. Ahí tenían todo el sentido.

Para una empresa **nueva** no lo tienen: no hay historia que mapear, y el módulo de cuentas existe justamente para responder **dónde está la plata** — cosa que un nombre como "Transferencias" no hace. Sembrar nombres genéricos invita a dejarlos así, que es volver al enum de tres valores con otro disfraz.

`insert_default_accounts` crea ahora **solo `Caja principal`**. Sin ella no se puede registrar un cobro. Las bancarias las crea el dueño con el nombre de su banco. La red de seguridad de `_default_account_for` (que crea una al vuelo si alguien registra una transferencia sin tener ninguna) se conserva: perder el registro de un movimiento de dinero sería peor que crear una cuenta implícita.

### Verificación

```
pytest -q            # 235/235 (233 previos + 2 nuevos)
ruff check . && mypy app
npm run typecheck && npm run lint && npm run test   # 104/104
```

Los dos tests nuevos: `test_auction_inherits_contract_item_photos` y `test_settlement_account_cannot_fund_a_payment`. `test_create_company_defaults_...` se actualizó — fijaba las tres cuentas viejas.

### Lo que NO se tocó, y por qué

El **renombrado de las cuentas existentes** quedó pendiente: las dos empresas de la dev (`Compraventa de Prueba QA` y `Empresa Demo Front`) son demo/QA, no un cliente real, así que ponerles el nombre de un banco de verdad no aplica todavía. La decisión operativa —qué hacer con las cuentas genéricas que ya existen— va cuando exista la empresa del cliente.

---

## Auditoría de permisos: el menú prometía módulos que el backend rechazaba (21/08/2026)

Reportado probando roles: *"al quitarle a un rol los permisos de contratos, me sigue apareciendo el módulo"*. Confirmado, y la auditoría completa encontró que el problema era más ancho que contratos y que había además dos huecos en el catálogo del backend.

### Contratos estaba bien… en el backend

`GET /contracts` → `contracts.view`, crear → `contracts.create`, editar → `contracts.edit`, abonar → `payments.create`, rematar → `contracts.auction`, importar → `contracts.import`. Cada endpoint con el suyo. **El hueco era del front.**

### El hueco real: seis módulos sin gate, y el comentario ya lo admitía

`AppShell` tenía `anyPermission` solo en Identidad, Reportes, Auditoría, Configuración y Cuentas. **Contratos, Ventas, Inventario, Clientes, Caja y Catálogos no tenían ninguno** — y un comentario en el propio archivo lo reconocía como "pendiente sistemático".

Peor: **ninguna de esas seis rutas tenía `beforeLoad`**, así que escribir la URL a mano entraba igual. Ocultar el ítem del menú nunca fue protección; la protección es el guard.

Ahora los catorce ítems llevan permiso, y las once rutas de módulo llevan guard. `Inicio` es la única excepción deliberada: es el destino al que redirigen todos los guards, así que gatearlo podría dejar a alguien sin ningún lugar a donde ir.

### Dos huecos en el catálogo del backend

**`sales` no tenía `sales.view`.** Listar ventas exigía `sales.create` — no se podía tener a alguien que solo revisara sin dejarlo además registrar. Es el error **inverso** al de `accounts.settle` (00029): allá una escritura colgaba de un permiso de lectura; acá una lectura colgaba de uno de escritura.

**`catalogs` no tenía `catalogs.view`, y sus cuatro GET no exigían NADA** (`Depends(get_current_user)` pelado). Viola la regla 3 de `CLAUDE.md` — *"endpoint sin permiso explícito = error de revisión"* — y dejaba categorías y proveedores legibles por cualquier usuario autenticado de la empresa.

`catalogs.view` se otorga a **todos** los roles existentes, a propósito: esos endpoints eran abiertos, así que restringirlos de golpe rompería a cualquier asesor (necesita leer las categorías para elegir la de la prenda al crear un contrato). Lo que se gana no es restringir hoy, sino que el permiso **exista** y se pueda quitar a conciencia mañana.

### El caso borde que abrió tener guards

Con los guards puestos, un rol muy restringido termina redirigido a `/` — que necesita `reports.view`. Sin él veía "No se pudo cargar el dashboard": otra vez un mensaje que dice "roto" cuando el problema es un permiso. Ahora lo saluda por su nombre y lo manda al menú, que sí muestra lo que puede hacer.

### Por qué el cambio de permisos tarda hasta un minuto en verse

`/me` tiene `staleTime` de 60s en el front y el backend cachea los permisos por rol otro tanto. Es deliberado (CLAUDE.md: "cache de permisos TTL 60s") y está alineado a propósito entre los dos lados. Al probar, contar hasta 60 o recargar — no es que el cambio no se haya guardado.

### Verificación

```
pytest -q            # 233/233
npm run typecheck    # limpio, tras regenerar tipos
npm run test         # 104/104
npm run build        # sin errores
```

Comprobado además con un script que recorre `router.tsx` y lista las rutas de `appLayoutRoute` sin `beforeLoad`: solo queda `/`, que es la excepción documentada.

## El módulo de cuentas no aparecía en la matriz de permisos (21/08/2026)

Reportado revisando los permisos: *"creaste el módulo de cuentas pero no le agregaste ningún tipo de permisos ni es parametrizable desde identidad"*. Correcto — y la revisión destapó algo más grave de lo reportado.

### Lo reportado

Las cuentas se construyeron reusando permisos de otros módulos: `cashbox.view` para leer y `company.configure` para administrar. Funciona, pero deja el módulo **fuera de la matriz de roles**: un admin no puede darle acceso a las cuentas a alguien sin darle además toda la caja, ni dejarlo administrarlas sin darle también logo, firma y textos de documentos. Un módulo que no aparece en la matriz es invisible para quien configura los roles.

### Lo que apareció al revisar

**`POST /accounts/{id}/settle` exigía `cashbox.view`.** Liquidar un convenio mueve plata —genera dos movimientos y baja el saldo por cobrar— pero colgaba de un permiso de **solo lectura**. Cualquiera que pudiera *mirar* la caja podía liquidar Sistecrédito.

Ese era el bug de verdad, y estaba escondido detrás del que se reportó.

### Migración 00029

Tres permisos propios, con la misma separación del resto del catálogo — ver / administrar / la acción sensible aparte (`is_special`, igual que `cashbox.reopen` o `contracts.auction`):

| Permiso | Qué habilita |
|---|---|
| `accounts.view` | Ver cuentas y saldos |
| `accounts.manage` | Crear y editar cuentas |
| `accounts.settle` | Liquidar cuentas por cobrar |

**Nadie pierde lo que ya tenía:** la migración otorga los nuevos a los roles que tuvieran los equivalentes. Si solo se insertaran los permisos, todos los roles existentes perderían el acceso de un día para otro sin que nadie tocara una regla de negocio.

**Con una excepción deliberada:** `accounts.settle` va a quien tiene `cashbox.open_close` (responsable de caja), **no** a quien tiene `cashbox.view`. Conservar el mapeo anterior sería conservar el agujero.

### En el front

Los gates pasaron a los permisos nuevos (ruta, ítem de menú, botones de crear/editar/liquidar). Y dos detalles de comportamiento:

- **La página de cuentas** distingue el 403 y no ofrece "Reintentar", que no puede funcionar.
- **El `AccountPicker` desaparece** sin `accounts.view`, y la operación sigue: el backend resuelve la cuenta predeterminada cuando no recibe `account_id`. Bloquear una venta porque el cajero no puede *leer* el catálogo de cuentas sería castigarlo por un permiso que no necesita para cobrar.

### La regla que queda

Quedó escrito en `backend-starter/docs/ARCHITECTURE.md` §12 y en el protocolo 8 de `DESIGN_SYSTEM.md`: **un módulo nuevo trae sus propios permisos desde el día uno**, aunque parezcan redundantes. Reusar el de otro módulo sale caro por tres lados — el módulo desaparece de la matriz, acopla cosas que no van juntas, y deja colar acciones sensibles detrás de permisos de lectura.

### Verificación

```
pytest -q            # 233/233 (dos tests nuevos: ver no alcanza para liquidar ni para crear)
npm run typecheck    # limpio, tras regenerar tipos
npm run test         # 104/104
npm run build        # sin errores
```

## "Caja cerrada" cuando la caja estaba abierta (21/08/2026)

Reportado probando con un usuario nuevo: el admin veía la caja abierta, pero el usuario recién invitado veía **"Caja cerrada — no se pueden registrar operaciones de dinero"**, y el inventario le fallaba al cargar.

### No era un bug de caja ni de inventario

El rol que se le asignó ("Cajero Temporal") se creó **sin marcar ningún permiso**: 0. Sin `cashbox.view` la consulta de la sesión responde 403, y sin `inventory.view` el listado también.

El problema real es que **la app tradujo los 403 a mensajes que afirmaban cosas falsas**:

- `CashSessionBanner` no tenía rama de error. Cualquier fallo dejaba `session` en `undefined` y caía en el mensaje de "Caja cerrada" — diciéndole al usuario exactamente lo contrario de la realidad.
- `DataTable` recibía `isError` como booleano, sin acceso al error, así que un 403 se veía igual que un backend caído: "No se pudo cargar la lista" y un botón de **Reintentar** que no podía funcionar nunca.

### Los tres arreglos

**1. `lib/api/isPermissionError.ts`** — distinguir "no tienes permiso" de "algo se rompió", en un solo lugar.

**2. Mensajes honestos.** El banner de caja **desaparece** sin `cashbox.view`: si no se puede saber el estado, no se afirma nada (y afirmar lo contrario era el bug). Otro tipo de fallo dice "No se pudo consultar el estado de la caja". `DataTable` acepta ahora el error real y, en un 403, dice qué pasa y a quién pedírselo — **sin botón de reintentar**, porque reintentar no cambia un permiso que no existe.

**3. La causa de raíz: un rol vacío era invisible.** En el listado de roles se veía idéntico a uno bien configurado. Ahora `RoleOut` trae `permission_count` y la tabla muestra un chip ámbar **"Sin permisos"**. Eso es lo que habría evitado el problema desde el principio.

### La lección

Los tres síntomas venían de tratar un 403 como si fuera una falla. Un permiso faltante es una **respuesta correcta del backend**, no un error — y decirle al usuario "esto está roto" cuando en realidad le falta un permiso lo manda a buscar un problema inexistente, además de esconder el arreglo real (que es de un minuto: marcar las casillas del rol).

### Verificación

```
pytest -q            # 231/231 (test nuevo: un rol recién creado reporta 0)
npm run typecheck    # limpio, tras regenerar tipos
npm run test         # 104/104
npm run build        # sin errores
```

## Invitar por enlace, sin depender del correo (21/08/2026)

El servicio de correo incluido de Supabase limita los envíos a unos pocos por hora, y probando el flujo de invitación se agotó la cuota: `429`. Sin dominio propio no hay SMTP externo que montar todavía (el remitente de prueba de Resend solo entrega a la dirección del dueño de la cuenta), así que hacía falta una salida.

### La observación que lo resolvió

**El correo nunca fue lo esencial: lo esencial es el enlace.** Supabase tiene `POST /auth/v1/admin/generate_link`, que devuelve exactamente el mismo enlace que iría en el correo, sin enviar nada — y por lo tanto sin tocar la cuota.

Y para una compraventa resulta ser *mejor* que el correo, no un parche: el empleado nuevo casi siempre está parado al lado del administrador. Copiar un enlace y mandarlo por WhatsApp es más directo que esperar un correo que además puede caer en spam.

### Cómo quedó

`POST /identity/invitations` acepta `send_email` (default `true`). Es un parámetro del mismo endpoint y no otro endpoint, porque **el usuario se crea igual en los dos casos** — lo único que cambia es quién entrega el enlace.

En el diálogo hay dos botones, y el segundo no está escondido detrás de un menú: **"Enviar por correo"** y **"Generar enlace"**.

### Detalles que importan

- **Con enlace, el diálogo NO se cierra solo.** El enlace existe únicamente en esa respuesta: no se puede volver a pedir. Cerrar dejaría al admin con un usuario creado y sin forma de que entre. La advertencia lo dice explícitamente ("guárdalo antes de cerrar").
- **El enlace es una credencial**, no una URL cualquiera: quien lo tenga se convierte en ese usuario. Por eso solo lo recibe quien ya tiene `identity.manage_users`, no se escribe en ningún log, y **no se devuelve cuando el correo sí salió** — si ya viajó por correo, no hay razón para que ande además en una respuesta HTTP.
- **El `audit_log` registra cómo se entregó** (`delivery: "email" | "link"`). Un enlace copiado a mano no deja rastro en ningún servidor de correo, así que la auditoría es el único lugar donde consta que esa invitación existió y quién la hizo.

### Un detalle de los tests

Los mocks de `invite_user` en tres archivos de test replican la firma real, así que cambiarla los rompió a todos de inmediato. Es la señal correcta: si hubieran aceptado `**kwargs`, el cambio habría pasado silencioso y los tests seguirían verificando la firma vieja.

### Verificación

```
pytest -q            # 230/230 (dos tests nuevos: con enlace y sin enlace)
ruff + mypy          # limpios
npm run typecheck    # limpio, tras regenerar tipos
npm run test         # 104/104
npm run build        # sin errores
```

## El invitado entraba sin contraseña (21/08/2026)

Encontrado probando el flujo de invitación de punta a punta: el usuario acepta, **queda dentro de la app sin que nadie le pida una contraseña**, y al cerrar sesión no puede volver a entrar nunca.

### La causa

`/auth/callback` es hijo de `authLayoutRoute`, que tenía un guard: *"si hay sesión, redirige a `/`"*. Perfectamente razonable para la pantalla de login — y letal para esta.

`detectSessionInUrl: true` procesa el link del correo y **crea la sesión al inicializar el cliente de Supabase**, antes de que corra cualquier `beforeLoad`. Así que el guard veía sesión y expulsaba al invitado a `/`: `AuthCallbackPage` —la pantalla de "Crea tu contraseña", que existía y estaba bien hecha— **no se renderizaba jamás**.

El guard pensado para que un usuario logueado no vea el formulario de login estaba bloqueando la única pantalla de auth cuya condición de funcionamiento **es** tener sesión.

**El arreglo es mover el guard de `authLayoutRoute` a `loginRoute`**, que es donde su intención tiene sentido. Queda un comentario en la ruta explicando por qué no puede volver al layout.

### Lo que el bug destapó: no había forma de volver a entrar

Al revisar, no existía **ningún** camino de recuperación: sin "¿olvidaste tu contraseña?", sin reenvío de invitación, y sin endpoint para que el admin ayude. Un usuario sin contraseña (o que la olvidara) quedaba bloqueado de forma permanente.

Se agregó recuperación por correo:

- **`useRequestPasswordReset`** → `supabase.auth.resetPasswordForEmail`.
- **Enlace en `LoginPage`**, que reusa el correo ya escrito arriba en vez de abrir otra pantalla a pedirlo: quien llega ahí es alguien que ya intentó entrar. Valida solo ese campo.
- **Mismo mensaje exista o no la cuenta.** Confirmar qué correos están registrados convertiría la pantalla de login en un detector de usuarios.
- **Redirige al MISMO `/auth/callback`.** Supabase crea la sesión desde el link en los dos flujos, así que la pantalla sirve para ambos: una ruta menos que mantener y una menos que registrar en la lista de Redirect URLs permitidas.

### Por qué el texto de la pantalla es neutro y no detecta el flujo

`AuthCallbackPage` ahora atiende invitación y recuperación. Detectar cuál es sería frágil: `detectSessionInUrl` **consume el fragmento de la URL** al inicializar el cliente, antes de que el componente monte, así que leer el hash no es confiable. Y equivocarse mostraría un mensaje que contradice el correo que la persona acaba de abrir.

El texto quedó correcto para los dos casos ("Con ella entrarás a tu cuenta de ahora en adelante") en vez de adivinar. El estado de link inválido también menciona las dos salidas.

### Verificación

```
npm run typecheck   # limpio
npm run lint        # 0 errores
npm run test        # 104/104
npm run build       # sin errores
```

La prueba real es de navegador y la hace el cliente: aceptar una invitación nueva debe mostrar "Crea tu contraseña" **antes** de entrar a la app.

## Movimiento como token + gráficas (20/08/2026)

Puntos 3 y 4 del cliente (*"mejorar todo el ui/ux animaciones en responsive"*, *"mejorar el diseño de gráficas y reportes"*). Pasada acotada y verificable, **no** un rediseño visual: eso es una decisión estética que hay que tomar con el cliente y referencias a la vista.

### El hueco real: no había tokens de movimiento

La regla 4 de `CLAUDE.md` dice que todo el diseño sale de `tokens.css` — color, radio, sombra, espaciado, tipografía. **El movimiento era la única dimensión sin tokens**, así que cada pantalla inventaba su duración y la app se sentía hecha por manos distintas.

Se agregaron una curva y tres duraciones (`--ease-out`, `--duration-fast/base/slow`), más la utilidad `enter-up`. Detalle y criterio: `docs/DESIGN_SYSTEM.md` §2.

`enter-up` se aplica **al contenedor**, no a cada hijo: animar cada KPI o cada fila por separado convierte un reporte en un espectáculo y retrasa la lectura. Hoy lo usan `KpiRow` (compartido: dashboard y reportes) y el `CardShell` de Reportes.

### `prefers-reduced-motion`, una vez para toda la app

Estaba resuelto pantalla por pantalla (`motion-reduce` en `RefreshingBar`), que es exactamente el patrón que garantiza que alguna se olvide. Ahora es una regla global en `globals.css`.

Dos detalles que no son obvios:

- **No se anulan las animaciones, se reducen a un salto instantáneo.** `animation: none` rompería las que dependen de su estado final: los diálogos de Radix quedarían **invisibles**, porque su estado de entrada es opacidad 0.
- **Recharts no lo respeta y no puede.** Anima desde JavaScript interpolando valores; ninguna regla de CSS lo alcanza. Se agregó `lib/usePrefersReducedMotion.ts` y los tres wrappers de `charts/` pasan `isAnimationActive={!prefersReducedMotion}`. El hook **escucha cambios** en vez de leer una vez: en macOS es un interruptor de accesibilidad que la gente prende justo cuando el movimiento le está molestando.

### Gráficas

- **Eje X de la tendencia diaria en `dd/MM`** (`formatDateShort`, nuevo en `lib/dates.ts`, con test). El año se repetía en cada punto siendo ruido: el rango ya está escrito arriba en el selector. Mismo tratamiento sin `Date` que `formatDate`, por el mismo motivo de corrimiento por UTC — y con test para el 1 de enero, que es donde ese bug aparece.
- **`minTickGap`**: con un rango de 90 días las fechas se encimaban. Ahora Recharts descarta etiquetas antes de solaparlas.
- **Sin puntos fijos por dato** (`dot={false}` + `activeDot`): en rangos largos los puntos convertían la línea en un collar. Al pasar el mouse el punto activo sigue apareciendo.

### Lo que NO se hizo, y por qué

El rediseño visual "parecido a Alegra" **no** se tocó. Es una decisión estética, subjetiva y de alcance grande — necesita referencias concretas del cliente (capturas de qué le gusta de Alegra) antes de invertir en ella. Cambiar la marca completa ya es barato por construcción (`tokens.css`, 6 líneas), así que no hay deuda técnica bloqueando esa conversación.

### Un falso positivo que vale la pena registrar

Los tooltips de Recharts traen `backgroundColor: '#fff'` **hardcodeado** en su estilo por defecto y ninguno de los wrappers lo sobrescribe — parecía un bug de modo oscuro. **No lo es**: el bloque `[data-theme='dark']` de `tokens.css` está vacío y no hay toggle en ninguna parte. Verificar eso antes de "arreglar" cualquier cosa que solo se rompa en oscuro.

### Verificación

```
npm run typecheck   # limpio
npm run lint        # 0 errores (7 warnings preexistentes del React Compiler)
npm run test        # 104/104
npm run build       # sin errores; .enter-up y la media query salen en el CSS compilado
```

## Cuentas: dónde está la plata (20/08/2026)

Punto 8 del cliente: *"¿qué posibilidad hay de agregar cuentas con las cuales hacer los desembolsos?"*, más el dato que lo volvió urgente: **el cliente usa Sistecrédito** para vender.

### El problema que resuelve

Hasta ahora la app solo sabía `payment_method` (`Efectivo` | `Transferencia` | `Otro`). Eso alcanza para decir "entró en efectivo", pero no para decir **a dónde** entró ni **cuánto hay** en cada lado.

Con Sistecrédito la insuficiencia se vuelve un agujero de plata: el cliente sale con el artículo, Sistecrédito asume el riesgo y le paga a la compraventa **después**, menos una comisión. Con `payment_method` solo, esa venta cae en `Otro` — indistinguible de un cobro por Nequi. Y no es plata que entró: es plata que **te deben**.

> **La cuenta es DÓNDE está la plata; el medio es CÓMO se cobró.** Los dos conviven a propósito — ver `backend-starter/docs/API_GUIDE.md` §13 y `backend-starter/docs/ARCHITECTURE.md` §12.

### Qué se construyó

**`/cuentas`** (`features/accounts/`) — listado agrupado **por tipo**, no una tabla plana:

- `Efectivo` — lo que debería haber en el cajón *ahora*.
- `Banco` — saldo acumulado, se concilia contra el extracto.
- `Por cobrar` — Sistecrédito y similares: plata que todavía no está.

Cada grupo lleva su **propio subtotal** y su propia explicación, y **no hay un total general en ninguna parte**. Es deliberado: sumar los tres mentiría, porque lo que Sistecrédito te debe no es plata que tengas. Es la misma trampa que el panel de métricas del contrato evita al no mostrar un "total cobrado" (bloque anterior).

**Liquidar un convenio** (`SettleAccountDialog`) — se piden **dos** cifras: cuánto de lo pendiente cubre el pago y cuánto entró realmente. **La comisión no se digita**: es la diferencia y la deriva el backend. Pedirla sería pedir el mismo dato dos veces y arriesgar que no cuadre; y una comisión configurada a mano queda desactualizada apenas cambie el contrato con el convenio. Va por `useMoneyMutation` (`Idempotency-Key`, CLAUDE.md regla 8) porque mueve plata real.

**`AccountPicker`** (`components/shared/`) — el que de verdad hace útil todo lo demás. Vive en `shared/` porque aparece en **todos** los puntos de cobro, que son features que no pueden importarse entre sí (regla 3):

| Dónde | Pregunta |
|---|---|
| Venta (POS) | ¿A dónde entra? |
| Abono a contrato (interés y capital) | ¿A dónde entra? |
| Desembolso de contrato | ¿De dónde sale? |
| Gasto de caja | ¿De dónde sale? |
| Compra a proveedor (al crear y al saldar) | ¿De dónde sale? |

Va **junto** al selector de medio de pago, nunca en su lugar, y filtra por el tipo que ese medio implica — elegir "Efectivo" y mandarlo a una cuenta bancaria descuadraría el arqueo. Con medio `Otro` ofrece bancos **y** cuentas por cobrar: ahí es donde el usuario decide si esa plata ya entró o si se la deben.

El hook de listado vive en `lib/accounts/list.ts` y no en la feature, justamente porque lo consume este componente compartido.

### Detalles no obvios

- **La preselección no es la regla.** Si el usuario no toca nada se propone la cuenta por defecto de ese tipo, que es exactamente lo que el backend hace cuando no recibe `account_id`. La correspondencia está en `lib/accounts/types.ts::defaultAccountTypeFor` y **tiene test**: si se desincroniza del backend, la UI mostraría un destino y la plata caería en otro.
- **Si cambia el medio de pago, la cuenta se reposiciona.** Pasar de efectivo a transferencia dejaría apuntando al cajón — el picker vuelve a la predeterminada del tipo nuevo en vez de quedar en un valor que el backend rechazaría.
- **En una compra "por pagar" no se pide cuenta.** Todavía no se movió plata; no hay de dónde salga.
- **El destino de una liquidación nunca es otra cuenta por cobrar** — eso sería mover una deuda a otra deuda, no cobrarla.
- **El tipo de cuenta no se puede editar**, y el formulario lo dice: cambiarlo reinterpretaría todos los movimientos históricos de esa cuenta.
- **El saldo inicial solo se pide al crear.** Editarlo después movería un saldo sin ningún movimiento que lo respalde.
- **Guard de ruta por `cashbox.view`, no por `company.configure`.** Un asesor que solo cobra necesita ver a qué cuenta manda la plata aunque no pueda administrar el catálogo; crear y editar sí van gateados por botón.

### Un cambio de tipos que el compilador destapó

Al regenerar `src/types/api.ts` aparecieron tres errores en `features/reports/aggregate.ts`: **`payment_method` pasó a ser opcional**. Es correcto — un movimiento entre cuentas (liquidar un convenio) no se cobró por ningún medio, solo cambió de contenedor.

Se agrupa bajo su propia etiqueta (`Entre cuentas`) en vez de caer en `Otro`, que ya significa otra cosa. `paymentMethodLabel` acepta ahora `string | null`. Con test.

> Las fixtures de `tests/` **no** pasan por `tsc` (`tsconfig.app.json` incluye solo `src`), así que un campo nuevo en un tipo de la API no rompe los tests aunque las fixtures queden incompletas. Por eso el caso nulo se cubrió con un test explícito y no se dio por probado.

### Verificación

```
npm run typecheck   # limpio
npm run lint        # 0 errores (7 warnings preexistentes del React Compiler)
npm run test        # 101/101
npm run build       # sin errores
```

Para el código nuevo se usó `useWatch` en vez de `watch()` de React Hook Form: este último devuelve una función que el React Compiler no puede memoizar (es la causa de los warnings preexistentes).

## Métricas en el detalle del contrato + indicador de refetch (20/08/2026)

Punto 13 del cliente: *"métricas dentro del detalle de un contrato, cuánto se ha pagado de interés, porcentajes, margen de ganancia, con gráficas"*. **Sin backend nuevo** — todo sale de datos que `GET /contracts/{id}` y `GET /contracts/{id}/payments` ya devuelven.

### La distinción que el panel existe para hacer visible

**Los intereses son ingreso; el capital recuperado no lo es.** Un contrato de $1.000.000 que devolvió todo el capital y pagó $150.000 de interés no generó $1.150.000 — generó **$150.000**. El resto solo volvió a casa.

Es el mismo error de modelado que ya se corrigió dos veces en `/reportes` (préstamos contados como gasto, capital abonado contado como ingreso). Acá se previene por diseño: cada número va rotulado por separado y **no existe un "total cobrado" grande** que invite a leerlo como ganancia. La dona lo refuerza mostrando el reparto entre interés y capital.

### Qué muestra

- **KPIs**: intereses cobrados, rendimiento (intereses ÷ capital prestado), capital pendiente, e interés del próximo mes — calculado sobre el **saldo actual**, no sobre el principal, que es la regla del contrato.
- **Capital devuelto**: barra de progreso con la aclaración de que devolver capital reduce deuda, no es ganancia.
- **Descuentos de interés**, cuando los hay: interés que se dejó de cobrar.
- **Evolución del saldo**: gráfica escalonada (`stepAfter`) a propósito — el saldo no baja de a poco, baja de golpe con cada abono a capital. Una curva suave mentiría sobre la forma del dato.

La gráfica usa `new_capital_balance`, el saldo que el **backend** calculó en cada abono, no uno reconstruido en el front. Así la curva no puede divergir de la verdad aunque cambie una regla de cálculo.

### Detalle de fechas que se evitó

`daysSinceStart` parsea la fecha a mano en vez de usar `new Date(string)`: el constructor interpreta `"2026-05-01"` como UTC y `"2026-05-01T00:00"` como hora local, así que en Bogotá (UTC-5) la cuenta salía con un día de menos. Es la misma trampa que `lib/dates.ts` evita en el resto de la app.

11 tests sobre las funciones puras, con números verificables a mano.

### Indicador de carga en refetch

Hueco encontrado probando la vista de productos: **`isPending` de React Query solo es `true` en la PRIMERA carga**. Al buscar, cambiar un filtro o refrescar tras guardar un precio, hay datos viejos en pantalla y `isPending` es `false` — la interfaz se quedaba idéntica mientras la request viajaba. Con el backend arrancando en frío eso son segundos en los que parece que el filtro no hizo nada.

`RefreshingBar` cubre exactamente ese caso. **No reemplaza al esqueleto**: el esqueleto es para cuando no hay nada que mostrar, esta barra es para cuando lo que se ve está a punto de cambiar. Vaciar la tabla en cada refetch habría sido peor — el contenido saltaría y se perdería el scroll. Se agregó también como prop opcional de `DataTable`, así que cualquier listado puede usarla, y respeta `prefers-reduced-motion`.

## Fase 3: se elimina la duplicación entre lote y producto (20/08/2026)

Cierra el cambio de modelo. `inventory_item` pierde `name`, `cat1/2/3_id`, `description` y `sale_price`: desde 00021 esos datos viven en `product` y estaban duplicados.

### Por qué no bastaba con dejarlo duplicado

Mientras hubo dos columnas con el mismo dato, alguien tenía que mantenerlas sincronizadas — **y falló**. `update_product` escribía el precio en el producto pero no en los lotes, así que la pantalla mostraba $250.000 y la caja seguía cobrando $200.000 (el POS arma la venta con `inventory_item.sale_price`). Se parcheó con `sync_lot_prices`, pero el arreglo real es que el dato exista una sola vez. Esa función se fue con esta migración.

Vale la pena registrar cómo se encontró: **no fue un test que fallara**, fue revisar de dónde saca el precio la venta. Ningún test cruzaba el `PATCH` del producto con lo que lee el POS. Ahora hay uno.

### Dos migraciones, no una

Contraer de un golpe rompía **en los dos órdenes posibles**:

| Orden | Qué se rompe |
|---|---|
| Migración → código | El código desplegado hace `SELECT name` sobre una columna que ya no existe |
| Código → migración | El `INSERT` nuevo no escribe `name`, que es `NOT NULL` |

Por eso `00022` relaja los `NOT NULL` (ahí conviven los dos códigos) y `00023` borra. Ambas idempotentes, verificadas reejecutándolas sobre una base ya contraída. `00022` además **repara** artículos huérfanos en vez de solo negarse — los hubo: 3 remates creados en la ventana entre fases.

> **Trampa operativa descubierta:** `supabase db push` aplica TODAS las migraciones pendientes de una vez, así que no respeta una secuencia de "aplicar → desplegar → aplicar". Dev quedó unos minutos con las columnas borradas y el código viejo. Para secuencias así hay que aplicar la primera con `psql` directo y dejar la segunda para después del deploy.

### Por qué el frontend no se rompió

`ItemOut` conserva su forma exacta —sigue exponiendo `name`, categoría y precio— pero salen del **JOIN** con `product`. Ningún consumidor tuvo que cambiar por la contracción.

Lo único que cambió es `ItemUpdateIn`, reducido a `photos`. `ItemEditDialog` se reescribió: muestra los datos del producto como lectura (con la explicación de dónde se editan) y edita solo fotos. El precio sigue apareciendo al publicar porque publicar el primer lote **es** el momento en que se le fija precio al producto.

El margen que muestra el diálogo es el de **ese lote**: costo propio contra precio común. Por eso puede variar entre lotes del mismo producto —el comprado más barato gana más— y eso es información real, no una inconsistencia.

### Estado final del modelo

```
producto   nombre · categoría · descripción · PRECIO · SKU
  lote     costo · proveedor · fecha de entrada · cantidad · estado · fotos · código
```

El costo nunca sube al producto (identificación específica, NIIF) y el precio nunca baja al lote. Cada dato existe una sola vez.

## Producto + lote: fases 1 y 2 (20/08/2026)

El cambio de modelo que documenta `docs/propuesta-productos-lotes.html`. El sistema no tenía el concepto de **producto**, solo artículos sueltos — y de ahí salían cuatro síntomas que parecían independientes: la lista no agrupaba, el precio se editaba lote por lote, reponer dependía de escribir el nombre idéntico, y no se podían comparar proveedores del mismo producto.

### Se hizo en fases, a propósito

Expandir → migrar → contraer. Es la disciplina que faltó en 00014 (donde el CHECK llegó antes que el deploy y rompió dev), aplicada esta vez desde el diseño:

| Fase | Qué | Estado |
|---|---|---|
| **1** expandir | `product` + `product_id` + `lot_number` + backfill | ✅ |
| **2** migrar | el modelo se usa; precio en el producto; UI agrupada | ✅ |
| **3** contraer | quitar de `inventory_item` lo que ya vive en `product` | pendiente |

La fase 1 fue **puramente aditiva**: los 202 tests pasaron sin tocar una línea de código de aplicación. Eso no fue suerte — era el criterio de aceptación.

### Códigos: nada se perdió, se ganó el producto

```
antes   JOC0001I                 (consecutivo por pieza)
ahora   JOC0001-01I              SKU + lote + proveedor
        └─────┘
        mismo producto
```

El SKU **no lleva letra de proveedor** porque el proveedor pertenece al lote: el mismo producto comprado a dos proveedores sigue siendo el mismo producto, que es justamente lo que el modelo viejo no podía expresar. El lote conserva la letra, así que la trazabilidad de quién vendió qué queda intacta.

El SKU se emite al publicar el **primer lote**, no al crear el producto: así un producto nacido en un borrador descartado no quema un consecutivo — misma razón por la que el código de pieza ya se emitía al publicar.

### Decisiones que costó tomar bien

**El match de producto ignora mayúsculas y espacios.** El nombre lo escribe una persona; tratar `"Cadena de oro"` y `"cadena de oro "` como productos distintos dispersaría el catálogo justo en el caso más común, que es lo que este cambio viene a evitar.

**Las piezas de remate son productos únicos de un solo lote** (`is_unique`), no un modelo aparte. Un anillo de un contrato no tiene "lote 2". Con `is_unique` la estructura queda uniforme (todo lote pertenece a un producto) y esas piezas nunca agrupan entre sí — ni siquiera con otra del mismo nombre. Se excluyen del listado agrupado por defecto: llenarían la lista de grupos de uno.

**El listado expone rango de costos, nunca promedio.** `min_cost`/`max_cost` son lectura informativa —una dispersión grande avisa que el precio de compra se movió y conviene revisar el de venta— pero el costo jamás sube al nivel de producto. Cada lote conserva el suyo (identificación específica, NIIF), que es lo que sostiene el costo de ventas de 00019.

### Frontend

`/inventario` gana la pestaña **Productos** (por defecto) junto a **Lotes** (la lista plana de siempre). Conviven a propósito: son dos preguntas distintas — *"¿cuánto tengo de esto?"* vs *"¿dónde está esta pieza?"*.

Los lotes se piden **solo al desplegar**, no con la lista: un inventario de 200 productos dispararía 200 requests para un detalle que casi nadie abre.

`ProductPriceDialog` cambia el precio de todos los lotes de una vez, y dice a cuántos aplica y que las ventas ya hechas no cambian — son las dos dudas que surgen al hacerlo por primera vez. Además calcula el margen **sobre el costo más alto**, que es el peor caso: si con el lote más caro la venta deja poco, el precio se quedó corto aunque con los lotes viejos parezca bueno. Es la alerta temprana del escenario de descapitalización que explica la guía del cliente.

### Orden de despliegue, invertido a propósito

Esta vez la **migración fue primero y el código después** — al revés que en 00014/00020. Porque 00021 es aditiva y el código nuevo la necesita; al revés habría roto dev por unos minutos. Backfill verificado en dev: 5 productos, 2 únicos (los remates), 0 artículos huérfanos.

### Comandos de verificación

```bash
.venv/bin/pytest -q   # 212 passed
npm run lint && npm run typecheck && npm run test && npm run build   # 84 tests
npm run dev   # /inventario → pestaña Productos → desplegar un producto, cambiar precio
```

## Reponer stock sin retipear — y por qué NO se suma cantidad (20/08/2026)

Punto 6 del cliente: *"comprar más artículos existentes no es posible; si tengo un artículo que existe y es del mismo proveedor debería dejar seleccionármelo"*.

### La implementación intuitiva habría roto el costeo

Lo que suena natural es sumarle cantidad al artículo existente. **No se hizo, y la razón es contable, no técnica.**

El sistema usa **identificación específica** (`CONTEXTO.md` §3, `CLAUDE.md` del backend): *"cada pieza/lote conserva su costo real de compra (estándar joyero, NIIF); nunca promediar"*. Fusionar dos compras a costos distintos obliga a promediar — y eso falsearía:

- la **utilidad bruta de cada venta** (`ItemMarginInfo`),
- el **costo de ventas del período** (`sale_line.unit_cost`, migración 00019),

que son justo las dos cosas que se construyeron horas antes. Un artículo comprado a $100.000 y otro a $150.000 no son el mismo artículo aunque se llamen igual.

Además, cada artículo publicado tiene un **código único e inmutable**: dos lotes comprados en fechas distintas no pueden compartir uno.

### Lo que sí resuelve el problema real

El problema real del cliente no era "quiero un solo registro", era **no retipear**. Así que `RestockPicker` busca entre los artículos ya comprados y **copia** nombre, categoría y descripción a la línea nueva — lo único que sí es idéntico entre dos lotes. Se crea un artículo NUEVO con su propio costo y su propio código.

El costo del artículo anterior se precarga **como sugerencia**, no como valor impuesto: el del lote nuevo casi nunca es el mismo, y es precisamente el dato que el usuario debe revisar.

### Dos detalles de la búsqueda

- **Incluye artículos vendidos**, al revés que `useAvailableItemsSearch` (que alimenta el carrito de venta y filtra `available`). El artículo que uno quiere volver a comprar es, típicamente, el que se **agotó** — filtrarlo por disponible haría inútil el buscador justo en el caso más común.
- **Se acota al proveedor** ya elegido en el ingreso, que es literalmente lo que pidió el cliente. Si no hay coincidencias con ese proveedor, lo dice explícitamente en vez de mostrar un vacío ambiguo.

Esto fue posible sin backend nuevo porque el `?q=` y el filtro `supplier_id` de `GET /inventory/items` ya existían desde el buscador de inventario.

## Compras: separar cuándo llegó la mercancía de cuándo salió la plata (20/08/2026)

Punto 10 del cliente: *"algunas veces los admin ingresan esa info de días anteriores o lo hacen a horas de la noche"*. Desde 00014 una compra exigía caja abierta y quedaba con fecha de hoy, así que ese flujo —que es el normal del negocio— no se podía registrar.

### La solución que se descartó, y por qué importa

La salida aparente era **backdatear el movimiento de caja** al día real de la compra. No sirve, y la razón es de diseño, no técnica: **una sesión de caja cerrada es inmutable** (00007; `get_open_session` solo devuelve sesiones `open`). El acta ya se imprimió y se cuadró contra el efectivo contado — insertarle un movimiento después invalidaría un documento firmado.

Conclusión que hay que tener presente: **una compra registrada tarde NO puede afectar la caja de aquel día.** Ninguna solución honesta puede prometer lo contrario.

### Lo que sí se hizo

Separar dos hechos que en contabilidad ya son distintos:

| Campo | Qué es | Para qué importa |
|---|---|---|
| `entry_date` | cuándo **entró la mercancía** | inventario y costo de ventas |
| `paid_at` | cuándo **salió la plata** | la caja |

Con eso, el medio de pago pasa a ser **opcional** en una compra: si viene, se paga en el acto (exige caja abierta, como antes); si no, la compra queda **pendiente** y no toca caja. `POST /inventory/entries/{id}/pay` la salda después, con idempotencia, y el egreso cae en la sesión de **hoy**.

El CHECK de 00014 se reemplazó: una compra puede nacer sin medio de pago, pero un ingreso que **no** es compra sigue sin poder tenerlo (un remate con medio de pago no tendría cómo interpretarse en el acta). Se sumó un CHECK de coherencia: `payment_method` y `paid_at` van juntos o ninguno.

### El caso sin solución perfecta

**Pagó en efectivo un día pasado y lo registra hoy.** Registrarlo como "pagado" hoy sacaría la plata de la caja de HOY — y como el efectivo ya salió aquel día, hoy le **sobraría** al contar. Se movería el descuadre de un día a otro en vez de arreglarlo.

Por eso la recomendación operativa es una regla, no una función: **las compras en efectivo se registran el mismo día, antes de cerrar caja.** La UI lo dice en el formulario. Para lo demás (crédito, transferencia) la separación funciona sin distorsión, porque una transferencia no está en el conteo físico del cajón.

### Frontend

- `EntryFormPage`: selector de **fecha de entrada** (tope hoy, `maxDate`) y el pago como un solo `Select` con "Pendiente de pago" primero. El texto de ayuda cambia según la opción, e incluye la advertencia sobre efectivo.
- `EntryDetailDialog`: bloque "Pendiente de pago" con medio de pago y botón de saldar, que dice explícitamente que el egreso queda en la caja de hoy — es la parte contraintuitiva.
- `InventoryPage`: columnas "Entrada" (la fecha real de la mercancía, no la de digitación) y "Pago" con chip "Por pagar".

Como efecto secundario útil, la lista de pendientes es **cuentas por pagar a proveedores**, que antes no existía.

### Un test que hubo que invertir

`test_purchase_without_payment_method_is_rejected`, escrito con 00014, afirmaba exactamente el comportamiento que este cambio invierte. Se reemplazó por el de la regla que sí sigue vigente (solo una compra puede llevar medio de pago).

### Comandos de verificación

```bash
.venv/bin/pytest -q   # 202 passed (6 nuevos)
npm run lint && npm run typecheck && npm run test && npm run build   # 84 tests
```

Desplegado a dev con la migración 00020. Guía para el cliente: `docs/GUIA_COMPRAS.md`.

## Rentabilidad del empeño — rendimiento sobre capital (20/08/2026)

Cierra la mitad que quedó abierta tras el costo de ventas. El empeño **no tiene costo de ventas**: su rentabilidad son los intereses cobrados sobre el capital prestado. Es una pregunta distinta —rendimiento sobre capital, no margen sobre costo— y por eso es un endpoint y una card aparte, no una columna más en la de tienda.

### Los intereses salen del documento, no de la caja

`/reportes` ya mostraba un KPI "Intereses cobrados", pero sale del desglose de sesiones de caja. Eso tiene dos límites que importan acá:

- **Solo cubre sesiones CERRADAS.** Un abono de hoy, con la caja todavía abierta, no aparece. Para "¿cuánto llevo cobrado este mes?" eso es un agujero justo en el dato más consultado.
- **No separa el descuento de interés.** El descuento es interés que se dejó de cobrar, erosiona el rendimiento y es una acción con permiso especial — merece verse.

`GET /reports/pawn-performance` lee `contract_payment` directamente. Los dos números pueden diferir del KPI de arriba, y es correcto que difieran.

### Lo que NO se inventó

El rendimiento ideal sería interés sobre el capital **promedio** del período. No se calcula, porque no se puede calcular bien: `contract` no tiene `closed_at` ni existe un histórico de saldos, así que no hay forma exacta de saber cuánta cartera había en una fecha pasada.

Se podía aproximar (reconstruir con la identidad `cartera_final = cartera_inicial + desembolsos − recuperado − rematado`), pero un número financiero aproximado presentado como exacto es peor que uno ausente — es justo el tipo de error que esta misma auditoría encontró dos veces (`loan_disbursed` como gasto, compras invisibles). Así que el campo se llama `yield_on_current_portfolio_pct`, se calcula sobre la cartera de HOY, y tanto la API como la UI lo rotulan explícitamente: *"el rendimiento se calcula sobre la cartera actual, no sobre la que había al inicio del rango"*.

Para el rango por defecto (este mes) la cartera actual ≈ la del final del período, así que el número es útil. Para rangos históricos, la referencia ya no es la de entonces y hay que leerlo con eso en mente.

**Para hacerlo exacto haría falta** una columna `closed_at` en `contract` o una tabla de saldos diarios. Anotado en `PENDIENTES_BACKEND_INFRA.md`.

`margin_pct` y `yield_...` son `null` —no 0— sin datos: un 0% afirma "presté y no rindió", distinto de "no hay capital contra el cual medir".

### Comandos de verificación

```bash
.venv/bin/pytest -q   # 193 passed (3 nuevos)
npm run lint && npm run typecheck && npm run test && npm run build   # 84 tests
npm run dev   # /reportes con filtro Todo o Empeño → card "Rentabilidad del empeño"
```

El test cuadra a mano: préstamo de 1.000.000 al 5%, abono de 1 mes (50.000 interés + 200.000 capital) → cartera 800.000 y rendimiento 50.000/800.000 = **6.25%**.

## Costo de ventas y utilidad bruta — "¿cuánto gané con lo que vendí?" (20/08/2026)

El punto de mayor valor de `PENDIENTES_BACKEND_INFRA.md` §24. `inventory_item.cost` guardaba el costo real por pieza (identificación específica, NIIF) y `sale_line.unit_price` el precio de venta, pero **nada los cruzaba** — un grep de `cost` en todo el módulo `sales` daba cero resultados. La pregunta central de una compraventa no tenía respuesta en la app.

### El costo se congela en la venta, no se lee al reportar

Migración 00019: `sale_line.unit_cost`, copiado desde el artículo **en el momento de vender**. Es el mismo criterio de snapshot legal que ya usan los contratos (que congelan tasa, plazo y ventana de mora al crearse).

La alternativa —leer `inventory_item.cost` al generar el reporte— tenía un defecto silencioso: **un reporte de un período ya cerrado cambiaría** si alguien corrige el costo de un artículo hoy. Los números de un mes contable no deben moverse.

El backfill sí se pudo hacer, a diferencia del `payment_method` de 00014: `inventory_item.cost` es inmutable en la práctica (se fija al ingresar o al rematar, y `ItemUpdateIn` acepta nombre, descripción, precio, fotos y categoría — nunca el costo), así que copiarlo reconstruye el histórico con el valor correcto.

### `GET /reports/profit?from_date&to_date`

Una sola consulta agregada en Postgres, así que **no hereda el tope de 90 días** del resto de `/reportes` (que agrega sesión por sesión con un N+1 acotado): un rango de un año no cuesta más que uno de un día. Tope propio de 366 días.

Tres decisiones de modelado que vale la pena dejar escritas:

- **Solo ventas `completed`.** Una anulada no generó ingreso ni consumió inventario (la anulación repone el stock); incluirla inflaría ambos lados y ensuciaría el margen.
- **El descuento se resta del ingreso, no se trata como gasto** — es un menor ingreso real. Vive en `sale`, no en la línea, así que se agrega en un subquery aparte: un join plano con las líneas repetiría el descuento por cada línea de la venta.
- **`margin_pct` es `null` y no 0 cuando no hubo ventas.** Un 0% afirma "vendí sin ganar", que es una afirmación distinta de "no hay datos".

Las fechas se comparan en la zona horaria de la **empresa**, no en UTC: `sold_at` es timestamptz y el día del negocio termina a medianoche de Bogotá.

### La distinción que la UI tenía que dejar clara

`/reportes` ya mostraba una "utilidad operativa" (ingresos − gastos). Ahora hay una segunda utilidad, y **no son lo mismo**:

| | Qué descuenta | Qué NO descuenta |
|---|---|---|
| **Utilidad operativa** (KPIs de arriba) | gastos: arriendo, nómina, servicios | el costo de la mercancía |
| **Utilidad bruta de tienda** (card nueva) | el costo de la mercancía vendida | los gastos operativos |

Presentar dos "utilidades" en la misma pantalla sin decir cuál es cuál sería peor que no tener la segunda. Por eso la card lleva su propia explicación (*"Ventas menos el costo de la mercancía vendida. No descuenta gastos operativos."*) y solo aparece bajo los filtros Todo/Tienda — el empeño no tiene costo de ventas, su rentabilidad son los intereses cobrados.

La card se pide aparte y no sale de `aggregateFinancialSummary` porque **el costo de ventas no es un movimiento de caja**: no pasa por ninguna sesión, vive en la línea de venta.

### Lo que sigue faltando

Esto responde la utilidad bruta de **tienda**. La rentabilidad del **empeño** (intereses cobrados contra el capital inmovilizado en cartera) sigue sin calcularse, y es una pregunta distinta: no es un margen sobre costo sino un rendimiento sobre capital prestado.

### Comandos de verificación

```bash
# backend
.venv/bin/ruff check app/ tests/ && .venv/bin/mypy app && .venv/bin/pytest -q   # 190 passed (3 nuevos)

# frontend
npm run lint && npm run typecheck && npm run test && npm run build   # 84 tests, 0 errores
npm run dev   # /reportes con filtro Todo o Tienda → card "Utilidad bruta de tienda"
```

Desplegado a dev (código primero, migración después) y verificado en el `/openapi.json` en vivo: `/api/v1/reports/profit` existe con sus 10 campos y `SaleLineOut` trae `unit_cost`.

## Historial de suscripciones en el panel de plataforma (20/08/2026)

Cierra el punto 8 del cliente (*"histórico de activaciones o suscripciones de empresas, así como las suspensiones o demás movimientos"*) y el punto 14 de `PENDIENTES_BACKEND_INFRA.md`.

### Por qué no bastaba con el `audit_log`

El rastro **ya se estaba escribiendo**: `extend_subscription` y `set_company_status` insertan en `audit_log` correctamente. Pero no servía como historial comercial por dos razones distintas:

1. **Es tenant-scoped por RLS.** Un super-admin de plataforma jamás puede leer el `audit_log` de una empresa que no es la suya, sin importar el filtro. O sea: el rastro existía y era **inalcanzable desde el panel**.
2. **Solo guarda `expires_at`.** Las `notes` de cada extensión —el campo donde el super-admin anota *"pagó por transferencia el 3 de marzo"*— no van en el `after` y se pierden. Y la fila de `subscription` tampoco las conserva: hay un índice único que permite una sola suscripción `active` por empresa, y extender hace `UPDATE` sobre ella, así que `expires_at`, `extended_by` y `notes` se **sobrescriben** en cada renovación. La única foto que quedaba era la última.

### La decisión: tabla propia, no reconstruir desde el audit

Migración 00018, tabla `subscription_event`. Son **dos registros con propósitos distintos y conviene no forzar a uno a hacer de otro**: `audit_log` es el registro de SEGURIDAD (quién tocó qué, inmutable, por empresa) y responde a una auditoría; `subscription_event` es el registro COMERCIAL de la relación con el cliente y responde a *"¿esta empresa está al día y cuánto ha pagado?"*.

Se registran los cinco eventos, no solo las renovaciones: `created` (alta), `extended`, `suspended`, `activated` y `expired` (el job nocturno). Sin el evento de alta, una empresa que nunca renovó tendría historial vacío y no se distinguiría de una a la que se le perdieron los eventos. Sin `expired`, el panel mostraría una empresa cortada sin ninguna línea que explique cuándo dejó de estar vigente.

Suspender y activar se guardan **sin fechas** (`previous_expires_at`/`new_expires_at` en NULL), porque no mueven el vencimiento — así el historial distingue de un vistazo "renovó hasta X" de "le cortaron el acceso".

`amount` es opcional a propósito: el cobro es 100% manual y fuera del sistema (CONTEXTO.md §3), así que registrarlo da trazabilidad básica de pagos sin construir un módulo de facturación. Una extensión sin monto sigue siendo válida y hay test para eso. En el front, `MoneyInput` deja `"0.00"` cuando el campo queda vacío, así que se manda `null` en vez de `0` — un monto de cero sería un dato falso, distinto de "no se registró".

**RLS habilitado y forzado SIN políticas.** Se escribe y se lee solo desde `platform`, que corre con sesión de bypass. Ningún tenant puede leer esta tabla ni siquiera la suya, porque incluye montos pagados y es información de la relación comercial entre la plataforma y sus clientes, no de la operación de la compraventa. Si más adelante se decide mostrarle a una empresa su propio historial de pagos, se agrega una política de `SELECT` acotada — queda anotado como decisión de producto, no como olvido.

### Frontend

`SubscriptionHistory` dentro de `CompanyDetailDialog`: lista paginada, más recientes primero, con chip de color por tipo de evento (renovar y cortar el acceso no se leen igual de un vistazo), la transición de fechas (`vencimiento: X → Y`), el monto y las notas. El formulario de extender gana el campo de monto.

`useCursorInfiniteQuery` ganó una opción `enabled`: el historial depende de un `companyId` que no existe hasta abrir el diálogo, y sin eso habría que llamar el hook con un id falso o duplicar `useInfiniteQuery`.

### Lo que sigue faltando del punto 14

`max_users` / límite de usuarios en `PlanOut` — necesita columna nueva. Y sigue sin existir `GET /platform/companies/{id}/audit-log`: el historial comercial cubre las suscripciones, pero un super-admin todavía no puede ver la auditoría de seguridad de otra empresa (cambios de roles, remates, anulaciones). Son cosas distintas y esta sesión resolvió solo la primera.

### Comandos de verificación

```bash
# backend
.venv/bin/ruff check app/ tests/ && .venv/bin/mypy app && .venv/bin/pytest -q   # 187 passed (6 nuevos)

# frontend
npm run lint && npm run typecheck && npm run test && npm run build   # 84 tests, 0 errores
npm run dev   # /platform → abrir una empresa → historial; extender con monto y notas → nueva línea
```

Desplegado a dev en el orden correcto (código primero, migración después). Verificado en el `/openapi.json` en vivo: el endpoint existe, `SubscriptionExtendIn` trae `amount` y `SubscriptionEventOut` sus 8 campos.

## Buscador de inventario — y el techo de 100 artículos del POS (20/08/2026)

Cierra el punto 2 del cliente (*"no hay buscador en inventario, por código, categorías, etc."*). No era un olvido del front: `GET /inventory/items` aceptaba **únicamente** `status`. Necesitaba backend.

### Backend: `?q=` + filtros

`GET /inventory/items` acepta ahora `q`, `cat1_id`, `cat2_id`, `cat3_id`, `supplier_id` y `origin`, combinables entre sí y con `status`. Mismo molde que el `?q=` de `GET /customers` resuelto antes:

- **Código: prefijo `ilike`.** Es la búsqueda del mostrador — el vendedor lee `JAO0003R` de la etiqueta de la vitrina y lo tipea completo o a medias. No necesita full-text, y sí necesita tolerar minúsculas.
- **Nombre: full-text español**, igual que `customer.full_name` (fragmentos, tildes, orden de palabras).

**El detalle que casi se escapa:** `code` es NULL hasta que el artículo se publica, y `like` sobre NULL da NULL, **no false** — sin un `coalesce(code, '')` la condición completa se anulaba y **un borrador nunca aparecía al buscar por nombre**. Hay un test dedicado (`test_search_finds_drafts_by_name_even_though_code_is_null`) porque es el tipo de bug que pasa desapercibido: los artículos publicados sí se encuentran, así que la búsqueda "funciona" hasta que alguien busca un borrador.

El trim del término se hace en el servicio, no en el repositorio: un `?q=` con solo espacios (al borrar el texto del buscador) armaría un `plainto_tsquery('')` que no matchea nada, y el usuario vería "sin resultados" justo al limpiar el filtro. Test para eso también.

### El bug real que apareció de paso: el POS tenía techo de 100 artículos

`useAvailableItemsSearch` (el buscador del carrito de venta y de egresos) traía **la primera página de 100 disponibles y filtraba en el navegador**. Estaba documentado como "hueco conocido" desde que se construyó, pero vale nombrar lo que significaba en la práctica: **con más de 100 artículos disponibles a la vez, un artículo fuera de esa página no se podía encontrar — o sea, no se podía vender.** Para una compraventa en crecimiento eso es una pérdida de venta silenciosa, no una molestia de UX.

Ahora el filtro lo hace Postgres sobre todo el inventario y se piden 8 resultados en vez de 100 registros para descartar 92. `ItemPicker` no necesitó ningún cambio: el hook conservó su forma.

### Frontend

`InventoryPage` gana buscador (ancho completo, primero — es la operación más frecuente) y filtro de categoría en cascada de 3 niveles. Solo se manda al backend la categoría **más específica** elegida: el filtro es por columna exacta, así que `cat3` ya implica su rama y mandar `cat1 + cat3` sería redundante.

Los filtros van dentro de la `queryKey`, así que cada combinación es su propia lista paginada en cache y cambiar un filtro reinicia la paginación en vez de mezclar páginas de dos búsquedas distintas.

`CategorySelect` (local a la página) usa `__all__` como centinela porque Radix `Select` no admite `value=""` en un `SelectItem` — mismo truco que `EntryFormPage` con `__none__`. Y repite el `SelectValue` con children resueltos por el hallazgo ya conocido: Radix solo resuelve el texto desde un item ya montado.

El estado vacío distingue "no coincide nada" de "no tienes artículos", con CTA distinto para cada caso.

### Comandos de verificación

```bash
# backend
.venv/bin/ruff check app/ tests/ && .venv/bin/mypy app && .venv/bin/pytest -q   # 181 passed (6 nuevos)

# frontend
npm run gen:api    # q, cat1_id, cat2_id, cat3_id, supplier_id, origin en GET /inventory/items
npm run lint && npm run typecheck && npm run test && npm run build   # 84 tests, 0 errores
```

Desplegado a dev (sin migración — solo query params nuevos, compatible hacia atrás con el front viejo). Verificado en el `/openapi.json` en vivo: los 6 filtros aparecen.

## Las compras aparecen en Reportes — como inversión, no como gasto (20/08/2026)

Cierra el punto 4 del cliente (*"¿cómo hago para que los valores pagados a un proveedor aparezcan en los reportes?"*) y, de paso, dos cabos sueltos que había dejado el trabajo anterior: las compras ya generaban movimiento de caja, pero **nada en el front sabía qué era el concepto `purchase`**.

### El cabo suelto que ya era visible

`CONCEPT_LABELS` (`lib/modules.ts`) no tenía `purchase`, así que en el desglose del acta de cierre la línea salía con el string crudo `purchase` en vez de "Compra a proveedor". El fallback de `conceptLabel` evitó que reventara, pero era un cambio a medio terminar en pantalla.

### La decisión contable, y por qué NO va en gastos

`aggregateFinancialSummary` clasifica ahora `purchase` como **movimiento de capital**, junto a `loan_disbursed` — no como gasto operativo. Comprar mercancía no empobrece al negocio: convierte efectivo en un activo. El costo se vuelve gasto (costo de ventas) **cuando el artículo se vende**, no cuando se compra.

Ponerlo en gastos habría sido el error fácil y silencioso: un mes de reposición fuerte de inventario se vería como un mes de pérdida. Es exactamente el mismo error de modelado que ya se había cometido y corregido con `loan_disbursed` en la primera versión de `/reportes` — hay tests de regresión para ambos ahora (`una compra a proveedor es inversión en inventario, NO un gasto operativo` verifica que con ventas de $300.000, compra de $2.000.000 y gasto de $50.000, la utilidad da **+$250.000** y no −$1.750.000).

### Una sola card, no dos

Préstamos (empeño) y compras (tienda) viven en módulos distintos pero son **la misma idea contable**. En vez de agregar una card suelta de "Inversión en inventario", se generalizó la existente: "Movimiento de capital" con una sola explicación (*"prestar, recuperar o comprar mercancía convierte efectivo en un activo, no cambia la utilidad"*) y las filas que aplican según el filtro Todo/Empeño/Tienda. Antes la card se ocultaba entera bajo "Tienda" (`moduleFilter !== 'store'`) porque solo hablaba de cartera de empeño; ahora bajo "Tienda" muestra las compras.

`EntryDetailDialog` también cierra el círculo: muestra el medio de pago y explica dónde se refleja ("egreso de caja del módulo Tienda → cierre del día → Reportes como inversión en inventario"), para que el operador no tenga que deducirlo.

### Lo que sigue faltando: utilidad bruta real

Esto responde *"cuánto pagué a proveedores en el período"*, que era lo preguntado. **No** responde *"cuánto gané realmente sobre lo vendido"* — para eso hace falta cruzar `inventory_item.cost` contra `sale_line.unit_price` en el momento de la venta (costo de ventas), y ningún endpoint agrega eso hoy. Sigue anotado en `PENDIENTES_BACKEND_INFRA.md` §13. El detalle por pieza sí existe desde el trabajo anterior (`ItemMarginInfo`: costo, utilidad y margen %).

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # 84 tests (3 nuevos), 0 errores
npm run dev   # /reportes: pestaña Tienda → card "Movimiento de capital" con Compras a proveedor;
              # /inventario → abrir un ingreso de compra → medio de pago + nota;
              # /caja → acta de cierre → la línea dice "Compra a proveedor", no "purchase"
```

## Configuración de empresa: firma, documentos y footer (19/08/2026)

Un solo endpoint (`GET/PATCH /api/v1/company/settings`, permiso `company.configure`) cerró tres pendientes que parecían independientes: la firma empresarial (§5 de `PENDIENTES_BACKEND_INFRA.md`, arrastrado desde el paso 5), los textos de los documentos impresos, y el footer de la app.

### Backend: módulo `company` nuevo

Las columnas ya existían **desde la migración 00002** — `company.signature_url` incluso con el comentario *"firma empresarial insertada en los PDF de contratos"*. Nunca hubo endpoint. `logo_url` se leía en `GET /me` pero no había forma de escribirlo.

- Módulo `app/modules/company/` (router/service/repository/schemas), separado de `platform` a propósito: `platform` es el super-admin operando sobre CUALQUIER empresa con sesión de bypass; esto es una empresa editándose a SÍ MISMA con RLS activo. Mezclarlos habría hecho ambigua la autorización.
- Los textos de documentos viven en `company.settings->documents` (jsonb), no en columnas: son texto de presentación, no datos que alguien vaya a consultar o agregar.
- **La fusión del jsonb es explícita, no `||`.** `settings` guarda `timezone`, `currency` y `grace_days` junto a los textos; escribir el objeto completo a ciegas al guardar un pie de página habría borrado la zona horaria — que decide el "hoy" de mora, prórrogas y cierres. Hay un test dedicado a eso (`test_patch_does_not_clobber_unsent_settings_keys`).
- Auditado (regla 6): cambiar la firma altera documentos legales. Se registran los CAMPOS que cambiaron, no su contenido — un `legal_notice` de 1000 caracteres en el log lo vuelve ilegible.

### Bug real encontrado por un test: el UPDATE afectaba cero filas, en silencio

`public.company` tenía RLS **forzado** con una sola política: `company_read_own`, solo `SELECT`. Tenía sentido cuando la única forma de modificar una empresa era `platform` (bypass sin RLS). Al abrirlo al tenant, el `UPDATE` no fallaba — RLS simplemente no encontraba la fila, así que el endpoint **respondía 200 con los datos viejos**. Se encontró porque el test guardaba y volvía a leer; una prueba manual "¿respondió 200? listo" no lo habría detectado. Migración `00017_company_update_policy.sql`.

Qué columnas son editables lo decide `EDITABLE_COLUMNS` (lista blanca) en el repositorio, no la policy — Postgres no restringe columnas desde RLS. `status` queda fuera: suspender o activar una empresa es del super-admin. Test: manda `{"status": "suspended"}` y verifica que sigue `active`.

### `GET /me` también trae la firma, y no es un capricho

`GET /company/settings` exige `company.configure`. Pero **imprimir un contrato lo hace cualquier asesor**, que no tiene ese permiso ni debería. Así que los datos de presentación (firma, razón social, NIT, dirección, teléfono y los tres textos) viajan también en `MeCompanyOut`. Sin esto, `PrintLayout` habría necesitado un permiso de configuración para pintar un encabezado.

### Frontend

- `/configuracion` (guard `company.configure`, mismo patrón que `/auditoria`) — un formulario, un botón de guardar. Reusa `PhotoUploader` con `maxPhotos={1}` para logo y firma en vez de un componente nuevo.
- Zona horaria y moneda quedan **de solo lectura**, con la explicación de por qué: cambiar la zona horaria afecta contratos ya en curso. No es un ajuste de presentación y no debería vivir junto al logo.
- `PrintLayout` ahora pinta logo, razón social, NIT, nota de encabezado, pie y aviso legal. `ContractPrintView` **estampa la firma de la empresa** sobre la línea — con degradación limpia: sin firma cargada queda el espacio en blanco de siempre, así que el documento nunca sale peor que antes.
- **Footer de la app** (`AppFooter` en `AppShell`), genérico porque la plataforma no tiene marca propia: "Sistema de gestión para compraventas" + `me.company.name` + año.
- **Se quitó el buscador del encabezado.** Era un `<input type="search" disabled>` que nunca estuvo conectado. Un buscador que no busca comunica "a medio hacer" peor que no tener ninguno. La búsqueda global real necesita `?q=` en contratos e inventario, que el backend todavía no expone.

### Bug de flakiness encontrado de paso (y era real, no del test)

Al correr la suite completa empezó a fallar `test_reports` — pero solo si `test_company` corría antes. Causa: `list_items_for_entry` ordenaba por `created_at`, y **en Postgres `now()` devuelve el instante de inicio de la TRANSACCIÓN**, así que todos los ítems de un mismo ingreso comparten timestamp exacto (verificado: `count(distinct ts) = 1`). Con el empate, el orden quedaba a merced del plan de ejecución: `POST /inventory/entries` podía devolver los artículos en distinto orden entre dos llamadas idénticas. Se agregó desempate por `id` y se hizo el test independiente del orden (identifica los ítems por su costo). No da el orden en que el usuario escribió las líneas — para eso haría falta una columna de posición en `inventory_entry_line`; anotado, hoy ninguna pantalla depende de eso.

También se arregló `test_platform::test_get_and_list_companies_include_plan_and_subscription`, que llevaba tiempo fallando y se había dado por "preexistente": hacía `next(...)` sobre la PRIMERA página del listado asumiendo que la empresa recién creada estaría ahí. Con 282 empresas acumuladas en la BD de pruebas y orden por UUID, casi nunca lo estaba. Ahora pagina hasta encontrarla. **La suite quedó en 175/175.**

> **Higiene pendiente:** el Postgres local tiene ~282 empresas huérfanas de corridas cuyo cleanup falló. No rompe nada hoy (los tests ya no dependen del orden) pero conviene un `supabase db reset` local en algún momento.

### Comandos de verificación

```bash
# backend
.venv/bin/ruff check app/ tests/ && .venv/bin/ruff format --check app/ tests/
.venv/bin/mypy app && .venv/bin/pytest -q      # 175 passed

# frontend
npm run lint && npm run typecheck && npm run test && npm run build   # 81 tests, 0 errores
```

Desplegado a dev en el orden correcto esta vez (**código primero, migración después**: al revés, `PATCH` habría respondido 200 sin escribir). Verificado en el `/openapi.json` en vivo: `/api/v1/company/settings` existe y `MeCompanyOut` trae los 10 campos.

## La compra a proveedor pasa por caja + costo/margen en el detalle de artículo (19/08/2026)

Auditoría del código de ambos repos (pedida explícitamente: "¿la arquitectura no se ha roto? ¿qué se puede mejorar?"). El resultado de arquitectura fue bueno — **cero** violaciones de la regla 4 (tokens: ni un hex suelto en 16.837 líneas) y **cero** de la regla 6 (fechas) — pero apareció un hueco contable real, no estético.

### El hallazgo: las compras a proveedor nunca tocaban la caja

El enum `cash_concept` define `'purchase'` — *"compra a proveedor (out, store)"* — desde la migración 00007, el día uno. **Nunca se emitía**: `inventory/service.py` jamás llamaba a `cashbox.record_movement` (confirmado con grep de `purchase` sobre todo el backend — solo aparecía como `EntryOriginType`, nunca como concepto de caja).

Consecuencia, que es de negocio y no de código: `expected_cash` se calcula como `opening_balance + movimientos en efectivo` (`cashbox/service.py:120-130`). Comprar $3.000.000 en mercancía pagando efectivo dejaba al sistema esperando esos $3.000.000 en el cajón. Y la política es *"sin tolerancia, justificación obligatoria"* — o sea que **el operador quedaba obligado a justificar a mano un descuadre que el propio sistema fabricaba**, todos los días en que se compró mercancía. Eso invalida el acta de cierre, que es el documento que la app existe para producir.

De paso, `POST /inventory/entries` tampoco exigía `Idempotency-Key`, violando la regla 4 del backend (*"obligatorio en operaciones de dinero"*): un doble click con red inestable duplicaba ingreso, stock y costo, sin `DELETE` con el cual deshacerlo. El comentario que había en `useCreateEntry` documentaba la premisa equivocada que causó ambas cosas: *"No mueve dinero: crea artículos en borrador"*.

### Qué se construyó

**Backend** (migración `00014_inventory_purchase_cash.sql`, dos columnas, sin migración de datos):
- `inventory_entry.payment_method` — NULLABLE con un CHECK que amarra `origin_type='purchase' ⟺ payment_method not null`. El CHECK va `NOT VALID` a propósito: las compras anteriores tienen NULL y no se pueden backfillear (nadie sabe hoy con qué se pagó cada una), así que la regla aplica hacia adelante sin inventar datos del pasado.
- `inventory_entry.idempotency_key` + UNIQUE `(company_id, idempotency_key)`, NULLABLE por la misma razón que en 00009.
- `create_entry` ahora exige sesión de caja abierta y emite `record_movement(module='store', direction='out', concept='purchase')` en la MISMA transacción, y reproduce el ingreso existente ante una key repetida (mismo patrón que `sales.find_by_idempotency_key`).

**Los ingresos que NO son compra siguen sin tocar caja, a propósito.** Un `origin_type='other'` (ajuste, sobrante) no entrega plata a nadie. Y el remate tampoco: ahí el capital ya salió como préstamo en su momento y el artículo entra como conversión de un activo, no como compra nueva — por eso `inventory/integration.py` (camino de `contracts.auction`) quedó intacto. Hay un test que fija exactamente eso.

**Frontend:**
- `useCreateEntry` pasó de `useMutation` pelado a `useMoneyMutation` (regla 8) e invalida también `['cashbox']`, porque el egreso entra al desglose del cierre.
- `EntryFormPage`: selector de medio de pago (condicional a "Compra", con validación Zod del mismo tipo que la de proveedor), nota explicando que la compra baja el efectivo esperado del cierre, y manejo de `CASH_SESSION_NOT_OPEN` con `CashSessionRequiredDialog` — mismo patrón que `SaleFormPage`, no uno nuevo.

**`ItemMarginInfo` en `ItemEditDialog`** — el costo ya venía en `ItemOut` y la tabla del listado ya lo mostraba, pero el detalle no, así que *"¿cuánto me gano con esta pieza?"* no tenía respuesta en ninguna pantalla. Muestra costo, utilidad y margen % (sobre el precio de venta, como se lee un margen comercial), en rojo si da pérdida, recalculando mientras se escribe el precio. Aritmética con `subtractMoney` — el dinero no pasa por `parseFloat` (regla 5).

### Nota de infraestructura: el `.venv` del backend se rompió al unificar los repos

`.venv/bin/*` tenía hardcodeado `/Users/mateojaramillo/projects/backend-starter/...`, la ruta anterior a mover los proyectos dentro de `compraventa_app/`. `ruff` corría (instalado aparte) pero `mypy` fallaba con `bad interpreter`. Se recreó el venv. Vale saberlo por si alguna otra herramienta con shebang absoluto aparece rota.

### Comandos de verificación

```bash
# backend
.venv/bin/ruff check app/ tests/ && .venv/bin/mypy app && .venv/bin/pytest -q
# 168 passed (13 en test_inventory.py, 6 de ellos nuevos).
# test_platform.py::test_get_and_list_companies_include_plan_and_subscription
# falla ANTES y DESPUÉS de este cambio — preexistente, verificado con git stash.

# frontend
npm run gen:api    # payment_method aparece en EntryCreateIn y EntryOut, nada más
npm run lint && npm run typecheck && npm run test && npm run build   # 81 tests, 0 errores
```

### Desplegado en dev — y por qué terminaron siendo tres migraciones

**El ambiente de trabajo es dev, no local** (aclaración del cliente): el front apunta a `compraventa-backend-dev.fly.dev` y la BD es el Supabase remoto. `.env` del backend apunta ahí también — ojo, porque cualquier script ad-hoc que importe `app.core.db` va a **dev**, mientras que los tests usan el Postgres local (`tests/conftest.py` hace `setdefault` de otro `DATABASE_URL`). Esa asimetría es fácil de no ver.

CI (`ci.yml`) **no despliega**: solo corre lint y tests. `supabase db push` y `fly deploy` son manuales.

El cambio se aplicó a dev en este orden, y quedó registrado en tres migraciones porque el deploy falló a mitad:

| # | Qué hace | Por qué |
|---|---|---|
| `00014` | columnas `payment_method` + `idempotency_key` + CHECK | el cambio real |
| `00015` | **quita** el CHECK | `fly deploy` falló con 401 contra `registry.fly.io`, y dev quedó con esquema nuevo + código viejo: el CHECK rechazaba TODA compra porque el backend viejo no manda `payment_method` |
| `00016` | **restituye** el CHECK | ya con el código nuevo desplegado y verificado en vivo |

El 401 se resolvió con `fly auth login` (`fly auth docker` y `--remote-only` NO alcanzaron — el token servía para la API pero no para el registry).

**La lección, para la próxima migración que cambie un contrato existente:** este es el patrón estándar de despliegue sin downtime y conviene plantearlo así desde el principio, no como recuperación de un deploy fallido — primero las columnas nullable (compatibles con el código viejo), después el deploy, y solo entonces el constraint que las vuelve obligatorias. Si 00014 hubiera nacido partida en dos, no habría existido ninguna ventana con dev roto.

Verificado en vivo tras el deploy: `GET /openapi.json` de dev muestra `payment_method` en `EntryCreateIn` y `EntryOut`, e `Idempotency-Key` como header requerido de `POST /inventory/entries`. El CHECK quedó `convalidated=false` (NOT VALID) como se diseñó, confirmado consultando `pg_constraint` en dev y en local.

**Falta probar el flujo de punta a punta contra dev** (registrar una compra real y ver el egreso en el cierre): requiere credenciales de una cuenta de la empresa de pruebas, que no se usaron en esta sesión. El comportamiento sí está cubierto por los 6 tests de integración nuevos contra Postgres local.

## Reportes v2 — filtro por módulo, comparación de período, gastos por categoría, rankings históricos (19/08/2026)

El cliente probó `/reportes` (v1, sección siguiente) y pidió, con una captura de referencia de un software de contabilidad: estética más moderna, un filtro para ver solo Tienda o solo Empeño, más índices (gastos por categoría, prendas más vendidas, categorías más movidas), y "un análisis financiero como un profesional contable" (comparación contra el período anterior).

**Filtro por módulo, instantáneo.** Se separó la capa de red de la capa de agregación: `useRawSessions(range)` (renombre de `useFinancialSummary` v1) solo trae datos crudos; `aggregateFinancialSummary(sessions, moduleFilter?)` (pura) hace la suma. La página guarda el filtro en estado y llama la función pura vía `useMemo` — cambiar entre Todo/Empeño/Tienda no dispara ninguna request nueva, verificado en vivo (0 requests de red al cambiar de pestaña, confirmado contando requests en el `page.on('request')` de la prueba Playwright).

**Comparación vs período anterior.** `previousRangeFor(range)` calcula el rango inmediatamente anterior de igual duración; se pide con el mismo `useRawSessions` una segunda vez y se agrega igual. `computeDelta(current, previous, direction)` da el % de cambio — `direction: 'up'|'down'` decide qué significa "favorable" por KPI (ingresos subiendo = verde, gastos subiendo = rojo, nunca "arriba siempre es bueno"). `KpiCard` ganó una prop `delta` opcional para mostrarlo.

**Gastos por categoría.** `BreakdownLineOut` (usado en v1) no trae `category_id` — hace falta `GET /cashbox/expenses?session_id=` por cada sesión ya resuelta (mismo N+1 acotado por el tope de 90 días, ahora ~2 requests/sesión). `useExpensesByCategory` recibe las sesiones YA resueltas por `useRawSessions` como argumento, para no duplicar el fetch de `GET /reports/closings`.

**Prendas más vendidas / categorías más movidas — histórico completo, no el rango elegido.** `GET /sales` y `GET /contracts` no tienen filtro de fecha — **se le preguntó explícitamente al cliente** cómo prefería resolver esto (opciones: solo histórico completo rotulado como tal / best-effort acotado al rango con aviso de que puede estar incompleto / no construirlo). Eligió histórico completo. `useAllTimeItemSales` trae TODAS las páginas de `GET /sales` y `GET /inventory/items` (tope defensivo de 50 páginas cada uno vía el nuevo `fetchAllPages` genérico, `lib/api/pagination.ts` — promovido ahí porque ya era el tercer "traer todo" del código, además de `fetchAllClosingsInRange`). `aggregateItemRanking` arma un mapa `item_id → {nombre, categoría}` desde el catálogo completo y lo resuelve contra TODAS las líneas de venta sin N+1 por artículo (el catálogo de artículos es mucho más chico que el volumen histórico de ventas).

### Bug real encontrado y corregido probando en vivo: dos cards no respetaban el filtro de módulo

Al cambiar a "Empeño" en el navegador real: la card "Gastos por categoría" seguía mostrando los MISMOS gastos que en "Todo" (no se filtraba en absoluto — `useExpensesByCategory` nunca recibía el `moduleFilter`), y la card "Medio de pago (ingresos)" mostraba $495.000 cuando el KPI "Ingresos operativos" de la misma pantalla decía $110.000 — la donut sumaba TODO lo que entra (`direction: 'in'`), incluyendo `capital_payment`, el mismo error de modelado ya corregido una vez en v1 pero reintroducido en un lugar nuevo. Se corrigió antes de dar el trabajo por terminado:
- `filteredExpenses` en la página filtra por `expense.module === moduleFilter` antes de agregar.
- `aggregateFinancialSummary` ahora calcula `ingresosOperativosByPaymentMethod` (solo `interest_payment`+`sale`, igual que `ingresosOperativos`) como campo propio, en vez de que la página derive el desglose por medio de pago sumando `totalsByConcept` a mano sin filtrar por concepto.

Verificado en vivo, dos veces (antes y después del fix), captura de pantalla en las 3 pestañas (Todo/Empeño/Tienda): bajo "Tienda", el desglose de medio de pago ($450.000) cuadra exactamente con "Ventas" e "Ingresos operativos"; bajo "Empeño", "Gastos por categoría" muestra correctamente "Sin datos en este rango todavía" (los gastos reales de la empresa demo son `module: 'general'`, no `pawn`).

### Rediseño visual

- `DailyTrendChart`: `BarChart` → `AreaChart` con relleno degradado (`<linearGradient>`, `type="monotone"`) — mismo dato, curvas suaves en vez de barras.
- `DonutChart` (nuevo, `components/shared/charts/`): wrapper de Recharts `PieChart`/`Pie` con `innerRadius`, colores `--chart-3/4/5` (reservados en `tokens.css` desde el día 1 como "series secundarias, dona", sin ningún consumidor hasta ahora) + `--brand-500`/`--text-muted` si hay más de 3 segmentos. Dos consumidores reales: gastos por categoría, medio de pago.
- Tabs de módulo con el mismo patrón de pill-buttons ya usado en `InventoryPage.tsx` (`ITEM_STATUS_TABS`), no un componente nuevo.

### Estructura nueva

```
src/lib/api/pagination.ts            # + fetchAllPages<T> genérico (3er consumidor real: closings, ventas, artículos)
src/features/reports/
  aggregate.ts                        # + moduleFilter, computeDelta, previousRangeFor, aggregateExpensesByCategory, ingresosOperativosByPaymentMethod
  rankings.ts                         # NUEVO — aggregateItemRanking (pura)
  api.ts                              # useRawSessions (renombre), + useExpensesByCategory, + useAllTimeItemSales
  pages/ReportesPage.tsx              # tabs de módulo, deltas, donas, sección de histórico
src/components/shared/
  KpiCard.tsx                         # + prop opcional `delta`
  charts/DailyTrendChart.tsx          # BarChart → AreaChart con gradiente
  charts/DonutChart.tsx               # NUEVO
tests/reports-aggregate.test.ts       # + moduleFilter, computeDelta, previousRangeFor, aggregateExpensesByCategory, ingresosOperativosByPaymentMethod
tests/reports-rankings.test.ts        # NUEVO
```

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (81 tests)
npm run dev   # /reportes: cambiar Todo/Empeño/Tienda (0 requests nuevas), confirmar que
              # Medio de pago y Gastos por categoría cuadran con los KPIs bajo cada filtro
```

## Reportes — centro de información financiera (19/08/2026)

El cliente pidió explícitamente ir más allá de "reportes" sueltos: información financiera **centralizada e interactiva** por rango de fechas (o un día específico) — intereses cobrados, ingresos vs gastos, capital abonado, ventas, cartera actual, separación Empeño/Tienda con su % de participación. "Reportes" era hasta ahora un ítem de sidebar deshabilitado (se asumía bloqueado por backend, ver `docs/PENDIENTES_BACKEND_INFRA.md` puntos 8/13/18 previos a esta revisión).

**Se pudo construir sin backend nuevo.** `GET /reports/closings?from_date&to_date` (ya en uso por el histórico de cierres de Caja) da las sesiones cerradas del rango; `GET /cashbox/sessions/{id}/report` (ya en uso por la vista previa de cierre) da el desglose módulo(`pawn|store|general`)×dirección(`in|out`)×concepto(`interest_payment`,`capital_payment`,`loan_disbursed`,`sale`,`expense`)×medio de cada sesión. Agregando ambas cosas client-side con `sumMoney` (decimal-safe, CLAUDE.md regla 5 — suma de PRESENTACIÓN sobre montos que YA calculó el backend, no negocio inventado) se cubre casi todo lo pedido.

**Tope de 90 días, a propósito.** El mecanismo es N+1 acotado: una request por sesión de caja del rango (~1/día, ciclo diario único del negocio), en paralelo (`Promise.all`). Los presets del `DateRangePicker` (Hoy/Ayer/Esta semana/Este mes) siempre caen dentro del tope; si el usuario arma un rango manual más ancho, la página NO dispara la query — muestra un estado explicativo en vez de cientos de requests silenciosos. Probado en vivo: un rango de 19 días con 3 sesiones cerradas reales disparó exactamente 3 requests a `/cashbox/sessions/*/report`, cero de más.

### Hallazgo real de modelado financiero (no solo de código)

La primera versión sumaba TODO lo que entra como "Ingresos" y TODO lo que sale como "Gastos" — con datos reales de dev eso dio "Gastos: $5.360.000" porque metía `loan_disbursed` (préstamo entregado, $4.300.000) junto con `expense` real ($1.060.000). Un préstamo entregado **no es un gasto** — se convierte en cartera (un activo); el capital recuperado (`capital_payment`) tampoco es ingreso, solo reduce esa cartera. Mezclarlos con intereses/ventas/gastos reales da una "utilidad" que en realidad solo mide cuánto se prestó ese período, no si el negocio ganó o perdió plata — el tipo de error que un dueño podría no notar hasta que le cuadra mal la caja mental de "¿estamos ganando?".

Se corrigió antes de dar el trabajo por terminado (`features/reports/aggregate.ts`):
- **Ingresos operativos** = `interest_payment` + `sale` (dirección `in`) — ingreso real.
- **Gastos operativos** = `expense` (dirección `out`) — costo real.
- **Utilidad operativa** = ingresos − gastos operativos (tono rojo si da negativo).
- **Movimiento de capital** — `capitalDesembolsado`/`capitalAbonado` — card SEPARADA, con la nota explícita "no es ingreso ni gasto — prestar o recuperar capital no cambia la utilidad".
- El % Empeño vs Tienda (`ModuleSplitBar`) también se corrigió para basarse en ingreso OPERATIVO por módulo (intereses del empeño vs ventas de tienda), no en todo el efectivo entrante — antes daba 52%/48%, con datos reales corregidos da 20%/80% (la tienda genera 4× más ingreso real que los intereses en el período probado).

Verificado en vivo dos veces contra datos reales de dev (antes y después del fix), captura de pantalla confirmando que la corrección se refleja correctamente en la UI.

### Estructura nueva

```
src/lib/cashbox/closings.ts          # useClosingsHistory (promovido de features/cashbox) + fetchAllClosingsInRange
src/features/reports/
  aggregate.ts                        # aggregateFinancialSummary (función pura, testeada) + daysBetweenDateOnly
  api.ts                              # useFinancialSummary (tope 90 días), useCarteraActual (duplicado de useDashboard)
  components/ModuleSplitBar.tsx       # % Empeño/Tienda, barra CSS, sin Recharts
  pages/ReportesPage.tsx
src/components/shared/charts/DailyTrendChart.tsx   # generalizado de ContractsStatusChart, usa --chart-1/--chart-2 (tokens.css, sin consumidor hasta ahora)
tests/reports-aggregate.test.ts
```

`useClosingsHistory` se promovió de `features/cashbox/api.ts` a `lib/cashbox/closings.ts` (mismo patrón ya usado 3 veces esta sesión: `lib/contracts/reference.ts`, `lib/customers/search.ts`, `lib/sales/void.ts`) — `features/reports` es el segundo consumidor real; `CashboxPage.tsx` actualizó su import. `useCarteraActual` es un duplicado deliberado de 3 líneas de `dashboardQueryOptions`/`useDashboard` (mismo criterio que `useReadyForAuction`, ya existente en `features/dashboard/api.ts`: hook trivial, misma `queryKey: ['dashboard']` a propósito para compartir cache/invalidaciones, sin que una feature importe internals de otra).

Ruta `/reportes` con guard de permiso `reports.view` (mismo código que ya gatea `GET /reports/dashboard`/`GET /reports/closings`) — mismo patrón que `/auditoria`. Ítem de sidebar "Reportes" (ya existía, deshabilitado) completado con `to`/`anyPermission`.

### Qué sigue bloqueado por backend

Documentado con detalle en `docs/PENDIENTES_BACKEND_INFRA.md` punto 13 (actualizado): rangos de más de 90 días (necesita agregación real en el servidor), `GET /reports/series` para tendencias largas, filtro de fecha en `GET /sales` para detalle por factura, y cartera histórica (`capital_outstanding` en una fecha pasada — hoy `/reportes` solo puede mostrar el corte de HOY, rotulado explícitamente para no confundir con el rango elegido).

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (64 tests)
npm run dev   # /reportes: cambiar el rango (Este mes por defecto) → confirmar KPIs, split
              # Empeño/Tienda, tendencia diaria, cartera actual y desglose contra datos reales de dev
```

## Revisión — puntos resueltos por backend (tercera/cuarta revisión, 19/08/2026)

El cliente reemplazó `docs/PENDIENTES_BACKEND_INFRA.md` con la versión que backend fue actualizando el mismo día (puntos 1, 3, 4, 17, mitad del 14, y 19 marcados "✅ Resuelto"). Antes de tocar código se regeneró `src/types/api.ts` (`npm run gen:api`) y se verificó con `git diff` que el schema real cambió exactamente como backend documentó — cero discrepancias entre lo escrito y la API real. Cinco cambios de front desbloqueados:

- **Plan y vencimiento de suscripción visibles en `/platform`** (`CompanyOut.plan_code/plan_name/subscription_expires_at`, punto 4): columnas nuevas en `CompaniesPage` y bloque de 4 celdas en `CompanyDetailDialog` (antes 2), con el vencimiento en rojo si ya pasó (`todayBogota()`). El texto de ayuda de "Extender suscripción" ya no dice que la fecha no se puede mostrar — muestra la fecha real. Verificado en vivo contra las 2 empresas de prueba reales (`Empresa Demo Front`: plan Completo, vence 01/01/2027; `Compraventa de Prueba QA`: plan Completo, vence 01/06/2027 — coincide con la extensión hecha en una revisión anterior).
- **Historial de ventas del cliente usa el filtro real** (`GET /sales?customer_id=`, punto 3): `useCustomerSales` en `features/customers/history.ts` pasó de traer 200 ventas y filtrar en cliente a usar `useCursorInfiniteQuery` con el filtro del backend — paginado de verdad, ya no un límite arbitrario de 200. `useCustomerContracts` se dejó **sin cambios** (sigue filtrando en cliente) porque `GET /contracts` todavía no acepta `customer_id`.
- **Búsqueda de clientes por documento** (`?q=` en `GET /customers`, punto 1): sin cambio de lógica (la búsqueda ya pasaba el término tal cual) — solo se actualizó el placeholder en `CustomersPage` y `CustomerPicker` de "Buscar por nombre…" a "Buscar por nombre o documento…" para que la UI refleje la capacidad nueva.
- **Editar la categoría de un artículo en borrador** (`ItemUpdateIn.cat1_id/cat2_id/cat3_id`, todo-o-nada mientras `status='draft'`, punto 17): `ItemEditDialog` gana 3 `<Select>` en cascada (mismo patrón que `EntryFormPage`) cuando el artículo está en borrador; publicado, se muestra de solo lectura ("no se puede cambiar después de publicar"). El `onSubmit` solo manda los tres campos juntos si `item.status === 'draft'` (nunca parcial, evita el 400 documentado).
- **Link contrato → artículo rematado** (`ContractItemOut.inventory_item_id`, punto 19): con esto se cierra el lado que faltaba de la trazabilidad bidireccional (el lado artículo→contrato ya existía, ver revisión anterior más abajo). `AuctionedItemLink` en `ContractDetailPage` muestra "Convertido en [código]" con link a `/inventario` bajo cada prenda ya rematada.

### Bug real encontrado y corregido probando lo anterior en vivo: `ItemEditDialog` no precargaba la categoría actual

Al probar la edición de categoría contra un artículo real (uno nuevo, fabricado con `POST /contracts/import` + `/contracts/{id}/auction` para no gastar el fixture `DEMO-LISTO-REMATE` reservado para el cliente), los 3 `<Select>` se veían completamente vacíos al abrir el diálogo — pese a que `defaultValues` sí traía `item.cat1_id/cat2_id/cat3_id` correctos. **Causa real:** Radix `Select` solo resuelve el texto que muestra `SelectValue` a partir de un `SelectItem` que ya se montó al menos una vez (se abrió el dropdown) — un valor precargado por `defaultValues` sin que el usuario haya abierto nunca el desplegable se queda sin texto que mostrar, aunque el valor internamente sea correcto. Se arregló pasando el nombre ya resuelto como children de `SelectValue` (`{level1Options.find((c) => c.id === field.value)?.name}`), que no depende de que el item se haya montado.

De paso se encontró que `GET /catalogs/categories` tarda **~4 segundos consistentemente** en dev (confirmado con `curl -w %{time_total}` tres veces seguidas: 3.85s/3.88s/4.08s) — no es una demora puntual. Sin feedback visual, el `<Select>` de categoría se veía vacío y confuso durante esos 4 segundos. Se agregó placeholder "Cargando categorías…" + `disabled` mientras `!categories`. Este tiempo de respuesta vale la pena reportarlo a backend si no está ya cubierto por algún punto de `PENDIENTES_BACKEND_INFRA.md`.

Probado en vivo de punta a punta contra un artículo real: categoría precargada visible (`tecnologia/Celulares/Smartphones`, de una prueba anterior en la misma sesión) → cambiada a `Joyería/Anillos/Anillos de oro` → `Guardar cambios` → `PATCH /inventory/items/{id}` responde `200` con los tres campos actualizados juntos.

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde
npm run dev   # /platform (plan+vencimiento), /clientes/$id (historial de ventas paginado),
              # /inventario → editar borrador (categoría precargada + cascada), /contratos/$id de un remate (link al artículo)
```

## Revisión — trazabilidad de artículos rematados (19/08/2026)

`ItemOut.source_contract_id` ya existía en la API desde siempre (mismo patrón que los huecos de fotos de la revisión post-paso-10: el dato estaba, nadie lo mostraba). Se agregó `ItemOriginInfo` en `ItemEditDialog.tsx` — para artículos `origin: "auction"` muestra "Viene del remate del contrato #N" con link directo al contrato (y, de paso, "Comprado a [proveedor]" para `origin: "supplier"`, mismo criterio simétrico). Probado en vivo contra un artículo real ya publicado (`JAO0003R`): el link navega correctamente al contrato de origen, cero errores de consola.

`useContract`/`contractQueryOptions` se promovieron de `features/contracts/api.ts` a `lib/contracts/reference.ts` — `inventory` es el segundo consumidor real (mismo criterio de aislamiento de features que `lib/customers/search.ts`/`lib/sales/void.ts`); `ContractDetailPage` ahora importa directo de `lib/`, no a través de la feature de contratos.

**La dirección contraria (contrato → qué artículo se generó por cada prenda) SÍ necesita backend** — `ContractItemOut` no expone `inventory_item_id`, aunque la documentación del propio backend dice que la columna existe. Documentado como punto 19 de `docs/PENDIENTES_BACKEND_INFRA.md`.

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (54 tests)
npm run dev   # /inventario: abrir un artículo con origin=auction, click en el link del contrato
```

## Revisión — segunda ronda de requisitos para backend (19/08/2026)

Sin cambios de código — el cliente pidió analizar 5 temas nuevos (reportes claros, panel de plataforma, ajustes de usuario, paginación, edición de artículos de remate, resumen financiero) y volcarlos en `docs/PENDIENTES_BACKEND_INFRA.md` (puntos 13-18) para llevarlos a backend. Todo se verificó contra la API real antes de escribirlo, no se documentó por sospecha:

- **Extender/suspender una suscripción no queda en auditoría** — probado en vivo (extender + suspender + reactivar una empresa real, revisar `GET /audit-log?module=platform` inmediatamente después): solo aparece el `create_company` original. Es más serio que "no se ve cuánto se pagó" — contradice la propia regla del backend de auditar toda acción sensible.
- **El código de remate (sufijo `R`) ya funciona bien** — se rematou un contrato, se publicó el artículo resultante, y el código salió `JAO0003R` como se esperaba. El problema real es que `ItemUpdateIn` no deja corregir la categoría heredada del contrato antes de publicar (solo `name`/`description`/`sale_price`/`photos`) — ni el front ni un humano pueden arreglarlo hoy si la categoría de la prenda no es la correcta para la tienda.
- `PATCH /me` no existe (solo `GET`) — confirma que "editar mi nombre" necesita backend nuevo, pero "cambiar contraseña" no (va directo contra Supabase Auth, ya establecido desde el paso 2).
- Paginación: se confirmó que `audit-log` y el resto de listados ya usan cursor consistentemente — no era un hueco real, solo faltaba confirmarlo.

Detalle completo, con qué se verificó y las recomendaciones de dónde ubicar cada cosa en la UI, en `docs/PENDIENTES_BACKEND_INFRA.md`.

## Revisión — feedback directo del cliente (19/08/2026)

El cliente probó la app después de la revisión post-paso-10 y reportó 5 puntos. Uno resultó ser un bug real y fixeable (abono a capital), dos eran huecos reales del backend explicados y documentados aparte, uno era documentación faltante (cómo entrar como super-admin), y uno era un pedido de datos de prueba.

### 2) Bug real corregido: no se podía abonar a capital si el contrato ya estaba al día

`PaymentOptionsPanel` mostraba "Este contrato no tiene abonos disponibles en este momento" para cualquier contrato con `months_owed === 0` — porque `GET /contracts/{id}/payment-options` responde `options: []` cuando no hay ningún mes de interés que elegir, y el campo de capital vivía DENTRO de una opción seleccionada (nunca había opción que seleccionar). **Verificado contra el backend antes de tocar el front:** `POST /contracts/{id}/payments` con `{months_covered: 0, capital_amount: "50000.00"}` sobre un contrato al día respondió `201` y descontó el capital correctamente — la regla real (`docs/pending/CONTEXTO.md` §3: *"el capital solo se abona cuando los intereses quedan al día, en el mismo pago que los salda **o después**"*) sí lo permite; el hueco era 100% del front, no del backend. Se agregó `CapitalOnlyPaymentForm` dentro de `PaymentOptionsPanel.tsx`: cuando `months_owed === 0`, muestra directo el campo de abono a capital (sin pasar por una opción de interés) en vez del mensaje de "no disponible". Probado en vivo de punta a punta: `201`, saldo reducido correctamente, aparece bien en el historial de abonos (`months: 0`).

### 4) Explicado, no era un bug: buscar cliente por documento no encuentra nada

Reproducido en vivo: buscar "Juan" o "Pérez" en el `CustomerPicker` de "Nuevo contrato" SÍ encuentra a Juan Pérez correctamente. Buscar por el número de documento (`123456789`) da "Sin resultados". Confirmado contra el backend directo: `GET /customers?q=123456789` responde `items: []` mientras que `?q=Juan` responde el cliente completo — `?q=` en `/customers` es full-text **solo sobre el nombre**, nunca tocó el documento. No es algo que el front pueda arreglar por su cuenta (necesitaría que el backend busque también por `doc_number`) — documentado como punto 1 de `docs/PENDIENTES_BACKEND_INFRA.md`, el nuevo archivo pedido explícitamente para llevar estos temas a discutir con backend/arquitectura/infraestructura.

### 1) Cómo entrar como super-admin — ya funciona, faltaba decirlo

La cuenta de pruebas (`mateojaras@gmail.com`) ya tiene el claim `app_metadata.platform_role: "super_admin"` en Supabase Auth desde antes del paso 10 — confirmado contra el JWT real. `/platform` ya es accesible hoy con esa misma sesión, sin nada que configurar. No hay (ni debería haber, por diseño) un flujo de auto-servicio para volverse super-admin — se fija a mano en el dashboard de Supabase Auth, una sola vez por cuenta.

### 3) Datos de prueba para cubrir todos los estados de contrato

Se fabricaron 6 contratos nuevos con `POST /contracts/import` (fechas viejas a propósito, mismo mecanismo ya usado para probar Rematar en la revisión anterior): en mora (1 y 2 meses), en mora con un abono ya registrado, en prórroga sin vencer, listo para remate (sin auctionar, para que el cliente lo pruebe él mismo), y uno pagado por completo. Tabla completa con el `legacy_code` de cada uno en `docs/PENDIENTES_BACKEND_INFRA.md` punto 12 — incluye un hallazgo real de paso: fabricar el de "1 mes en mora" con fechas exactas (ni un día más viejo) lo dejó en `active` en vez de `in_arrears`, lo que reveló el comportamiento documentado en el punto 10 del mismo archivo (un mes se cuenta como adeudado solo pasado el día exacto del vencimiento, no ese mismo día).

### 5) Explicado: dónde ver la parte contable de tienda y contratos

No es un hueco — el desglose ya existe, solo no es obvio dónde está. Se le mostró al cliente en vivo: `SessionReportPanel` (dentro de Caja, en "Cerrar caja" o en el acta de cualquier cierre ya hecho) desglosa cada movimiento por módulo (Empeño/Tienda/General) × concepto × medio de pago — es exactamente la separación contable que pide `docs/pending/CONTEXTO.md` §3. Falta una pantalla de "Reportes" que junte esto con el dashboard sin tener que pasar por un cierre — mismo pendiente de producto ya anotado (punto 8 de `docs/PENDIENTES_BACKEND_INFRA.md`), no se construyó nada nuevo hasta no definir el alcance con el cliente.

### Nuevo documento: `docs/PENDIENTES_BACKEND_INFRA.md`

Pedido explícito del cliente: un archivo aparte (no mezclado con `IMPLEMENTATION.md`) con todo lo que necesita revisión de backend/arquitectura/infraestructura — reúne los puntos 1 y 4 de arriba más los pendientes ya conocidos de revisiones anteriores (`CompanyOut` sin suscripción, `company/settings`, PDFs, `reports/series`, verificación de `LAST_ADMIN_SAFEGUARD`/guard de plataforma) en un solo lugar, con qué se verificó y por qué importa para el negocio, no solo técnicamente.

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (54 tests)
npm run dev   # /contratos/$id de un contrato "al día": Registrar abono → directo a capital
```

## Revisión post-paso-10 — huecos reales contra `docs/pending/` (completo)

El cliente agregó `docs/pending/` (`CONTEXTO.md`, `CLAUDE.md` y `ARCHITECTURE.md` del BACKEND, `API_GUIDE.md` real) y señaló 10 puntos que sentía faltantes. Comparar contra esos documentos (no solo contra el `CLAUDE.md` del front, que resultó estar incompleto en varios puntos) encontró: 5 campos de foto reales en la API nunca conectados, un documento imprimible de contrato que `DESIGN_SYSTEM.md` ya pedía desde el paso 1 y nunca se construyó, una ficha de cliente que se quedó pendiente desde el paso 4, un buscador de contratos que nunca se hizo, y — el hallazgo más serio — **"Rematar" estaba roto de verdad, no solo sin probar**: la condición dependía de un valor de `status` que el backend nunca manda.

### Metodología

Se leyeron los 4 documentos completos de `docs/pending/` y se verificó cada punto contra el código real (`grep` de los campos en `src/types/api.ts`, no solo contra lo que el front asumía) antes de tocar nada — mismo criterio que el resto de la sesión: nunca asumir, siempre confirmar contra la fuente.

### Hallazgos y qué se hizo

**1) Bug real, no solo sin probar: "Rematar" nunca podía aparecer.** `ContractOut.status` solo persiste `active|in_arrears|in_extension|auctioned|paid` (confirmado en `docs/pending/API_GUIDE.md` §7 y en el propio `src/types/api.ts`, donde `status` es un `string` sin enum). `"ready_for_auction"` NO es un valor real — es un estado DERIVADO (`in_extension` + `extension_ends_at` ya vencido) que se consulta con el endpoint dedicado `GET /contracts/ready-for-auction`. Tanto `ContractDetailPage` (`contract.status === 'ready_for_auction'`, condición del botón) como `ContractsListPage` (tab "Listos para remate" mandaba `status=ready_for_auction` a `GET /contracts`, que solo entiende los 5 valores reales) asumían ese valor como si existiera — como TypeScript tipa `status` como `string` pelado, nunca lo iba a atrapar. Se agregó `features/contracts/contractStatus.ts` (`isReadyForAuction`/`effectiveContractStatus`, deriva el estado visual correcto) y se corrigieron los dos consumidores. **Verificado en vivo, no solo corregido a ciegas:** se importó un contrato de prueba con fechas viejas (`POST /contracts/import`, ventana de mora corta) para forzar `in_extension` + vencido de verdad, se confirmó que aparecía en la pestaña y que el botón "Rematar" ahora sí se mostraba, y se ejecutó el remate completo — el contrato pasó a `auctioned` y el artículo de inventario en borrador apareció en `/inventario` con el costo correcto (capital + intereses pendientes), exactamente como describe `docs/pending/API_GUIDE.md` §7.

**2) Abonos SÍ existen — malentendido, no hueco.** `PaymentOptionsPanel`/`useCreatePayment` (paso 5, probado con un abono real en el paso 5b) viven en el detalle del contrato, no en Caja — así lo especifica `docs/pending/CONTEXTO.md` §3: *"Manual en caja: solo gastos y ajustes... nada se digita dos veces"*. Un abono genera su `cash_movement` automático; no se registra desde Caja directamente. Sin cambios de código — se explicó.

**3-4) Cinco campos de foto reales en la API, nunca conectados desde que se construyeron sus formularios.** Todos estaban en `src/types/api.ts` desde el principio (confirmado: no son campos nuevos del backend, `npm run gen:api` no trajo diff) — simplemente ningún formulario los usaba:
   - `ContractItemIn.photos` (prenda en garantía) — `ContractItemsFields.tsx` no tenía ningún campo de foto.
   - `CustomerCreateIn.doc_photo_url` — `CustomerFormDialog.tsx` no lo pedía.
   - `ContractUpdateIn.signed_photo_url` — el propio comentario en `ContractEditDialog.tsx` decía *"espera a PhotoUploader, todavía sin construir"* (paso 5) y nunca se volvió a esa nota después de construirlo en el paso 7b.
   - `ExpenseCreateIn.receipt_url` — quinto consumidor que `docs/DESIGN_SYSTEM.md` §3 ya prometía para `PhotoUploader` ("comprobantes de gasto") y que ni siquiera el usuario mencionó — se encontró auditando el schema completo, no solo los 10 puntos señalados.

   Los cinco se conectaron reusando `PhotoUploader` tal cual (sin cambios al componente): con `maxPhotos={1}` para los de una sola foto (documento de cliente, contrato firmado, comprobante), sin límite para prendas (multi-foto). Para el folder de Storage de algo que TODAVÍA no tiene id (crear cliente, crear prenda dentro de un contrato nuevo, crear gasto), se usa un id temporal estable por apertura del formulario (`crypto.randomUUID()` o el `field.id` de `useFieldArray` para prendas) — mismo trade-off de huérfanos ya aceptado en el paso 7b si se cierra sin guardar. Nuevo componente de sólo-lectura `components/shared/PhotoThumbnail.tsx` (distinto del thumbnail editable interno de `PhotoUploader`) para MOSTRAR una foto ya guardada — usado en el detalle de contrato (prendas + documento firmado), ficha de cliente, y la columna "Comprobante" de la tabla de gastos en Caja. **Probado en vivo, los cinco de punta a punta:** subir cada foto real, confirmar el path guardado en la respuesta del backend, recargar y confirmar que el thumbnail persiste — sin ningún error de consola.

**1) Documento de contrato imprimible — `docs/DESIGN_SYSTEM.md` §3 lo pedía desde el paso 1 ("`PrintLayout`... para contrato Y acta de cierre") y solo se construyó el del acta (paso 6).** Nuevo `ContractPrintView.tsx`, mismo patrón ya establecido (`PrintLayout` como hermano del contenido on-screen, nunca anidado — página completa esta vez, no un diálogo, así que el contenido on-screen se envolvió en `print:hidden` igual que ya hacía `CashboxPage`). **No incluye la firma/sello de la empresa** — `docs/pending/API_GUIDE.md` §15 confirma que `GET/PATCH /company/settings` (donde viviría esa imagen) no existe todavía; deja dos líneas de firma en blanco para firmar a mano sobre el impreso, coherente con `docs/pending/CONTEXTO.md`: *"Cliente firma el impreso (fase 1)"*. El flujo completo queda: Imprimir → firma física → subir foto del documento firmado (punto 3-4 arriba).

**5) Ficha de cliente con historial — pendiente desde el paso 4, nunca se retomó.** Nueva `CustomerDetailPage.tsx` (`/clientes/$customerId`) con datos de contacto + foto de documento + tablas de contratos y compras. **Ni `GET /contracts` ni `GET /sales` tienen filtro por `customer_id`** (confirmado en `docs/pending/API_GUIDE.md` §7/§10 — ninguno de los dos lo tiene, ni siquiera el segundo tiene otros filtros) — mismo criterio ya usado para artículos de inventario: se trae la página más grande posible (200) y se filtra client-side, documentado como hueco conocido. `SaleReceiptDialog` se movió a `components/shared/` (segundo consumidor real: esta ficha, además de `SalesListPage`) — `useVoidSale`/`Sale` se promovieron con él a `lib/sales/void.ts`, mismo criterio de aislamiento de features que el resto del proyecto.

**6) Buscador de contratos.** `GET /contracts` no tiene `?q=` (confirmado, solo `status`/`cursor`/`limit`) — mismo patrón: se trae una página de 200 y se filtra client-side por número de contrato o `legacy_code`, **no por nombre del cliente** (`ContractOut` solo trae `customer_id`, resolver el nombre de cada fila para filtrar sería N+1 requests — límite honesto, no oculto).

**7) "Finanzas"/"Configuración" — no se tocaron.** Ninguno de los dos existe como pantalla propia (`Reportes`/`Configuración` siguen deshabilitados en el sidebar) — decisión deliberada de NO construir nada ahí todavía porque falta definir con el cliente qué va exactamente en cada uno (`Reportes` ya tiene contenido real disperso — dashboard + histórico de cierres — pero no una pantalla unificada; `Configuración` sigue bloqueada por la falta de `GET/PATCH /company/settings`, confirmado sin cambios en `docs/pending/API_GUIDE.md` §15).

**9) Separación empeño/tienda — ya existe y ya se ve, se explicó dónde.** `SessionReportPanel` (paso 6) desglosa cada movimiento de caja por módulo (Empeño/Tienda/General) × concepto × medio de pago — visible en "Cerrar caja" (vista previa) y en el acta de cualquier cierre ya hecho. Coincide exactamente con `docs/pending/CONTEXTO.md` §3: *"desglose contable por módulo en el acta (sección EMPEÑO, sección TIENDA, gastos, otros medios)"*. Sin cambios de código — se confirmó que la arquitectura pedida ya está implementada correctamente.

### Qué falta (fuera de alcance de esta revisión)

- Firma/sello de la empresa en el documento imprimible del contrato — bloqueado por la falta de `GET/PATCH /company/settings` en el backend (`docs/RECOMENDACIONES.md` §1.9).
- Definir con el cliente qué va exactamente en "Reportes" y "Configuración" antes de construirlos — decisión de producto, no técnica.
- `CompanyOut` sin plan/fecha de expiración (paso 10, ya documentado) sigue igual.

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (54 tests)
npm run dev   # /contratos/$id: imprimir, editar → subir firma; /clientes/$id: historial; Rematar con un contrato real vencido
```

## Paso 10 — Platform (completo)

Panel super-admin: empresas (crear, suspender/reactivar, extender suscripción), layout propio (`PlatformLayout`) — NUNCA `AppShell`, ni pasa por `GET /me`. Último paso del "Orden de implementación" de `CLAUDE.md` — con esto quedan completos los 10 pasos (más 7b, el desbloqueo de Storage).

### Estructura nueva

```
src/
  styles/tokens.css, globals.css   # + --platform/--platform-foreground (banda distintiva)
  app/layouts/PlatformLayout.tsx     # banda oscura + Outlet, sin sidebar
  lib/auth/platform.ts                 # isSuperAdmin() — lee el claim del JWT, nada más
  features/platform/
    api.ts                               # empresas + planes — sin Idempotency-Key
    components/
      CompanyStatusBadge.tsx               # estado de EMPRESA, badge propio (ver hallazgos)
      CompanyFormDialog.tsx                  # crear
      CompanyDetailDialog.tsx                  # suspender/reactivar + extender suscripción
    pages/CompaniesPage.tsx                    # única pantalla real (CLAUDE.md no pide más)
```

### Decisiones y hallazgos

**`/platform` es un árbol de rutas completamente separado de `appLayoutRoute` — no pasa por `GET /me` en ningún momento.** Un super-admin de plataforma no necesariamente pertenece a la empresa que está operando (docs/ARCHITECTURE.md §4: los claims del JWT se decodifican "SOLO para routing básico... no infiere permisos ni datos de empresa de los claims — para eso está `/me`"). `platformLayoutRoute.beforeLoad` verifica sesión + el claim `app_metadata.platform_role === 'super_admin'` directo de `supabase.auth.getSession()` (ya viene decodificado por `supabase-js`, sin librería de JWT-decode) y redirige a `/` si falta cualquiera de las dos cosas — nunca intenta cargar `/me`.

**Bug real de TanStack Router, encontrado al primer intento de correr la app: "Route cannot have both an 'id' and a 'path' option."** Se copió el patrón de `appLayoutRoute` (que usa `id: 'app-layout'` porque no tiene `path` propio — está montada en la raíz `/`) pero se le agregó TAMBIÉN `path: '/platform'` sin quitar el `id`. La combinación no es válida. Arreglado quitando el `id` — `platformLayoutRoute` no lo necesita porque sí tiene un `path` real (`/platform`) que ya la identifica.

**Banda superior deliberadamente distinta de la marca — tokens nuevos, no un color suelto.** CLAUDE.md/ARCHITECTURE.md piden que un super-admin "nunca confunda contexto" con un tenant normal. Se agregaron `--platform`/`--platform-foreground` a `tokens.css` (azul-marino oscuro `#0f172a` + blanco) y su mapeo en `globals.css` (`--color-platform`) para poder usar `bg-platform`/`text-platform-foreground` como cualquier otro token — cumple la regla 4 (todo color sale de `tokens.css`, nunca hex suelto en una feature) sin excepción para este caso especial.

**Segundo caso de un badge de estado con nombre propio, no el `StatusBadge` compartido — mismo motivo que `UserStatusBadge` (paso 8).** `CompanyOut.status` usa `"active"`, que en `StatusBadge` ya significa "Vigente" (estado de contrato). Verificado en navegador contra datos reales (crear una empresa, suspenderla, reactivarla): los dos valores reales son `active`/`suspended` — `CompanyStatusBadge` los traduce a "Activa"/"Suspendida" con su propio mapa, mismo criterio de fallback-al-valor-crudo que el resto.

**Hallazgo real para backend, documentado en `docs/RECOMENDACIONES.md` §1.8: `CompanyOut` no trae ni plan ni fecha de expiración de la suscripción — solo `{id, name, status, created_at}`.** Confirmado contra el `/openapi.json` real (se corrió `npm run gen:api` de nuevo antes de concluirlo, sin diff — no era un tipo viejo). `POST .../subscription/extend` funciona perfecto (probado en vivo, `204`), pero el super-admin no tiene forma de ver la fecha ACTUAL antes de decidir la nueva — el front no lo oculta ni lo inventa: el formulario de extensión dice explícitamente "Esta vista no muestra la fecha de expiración actual" en vez de aparentar que sí la tiene.

**Bug real de UX encontrado en pruebas: `CompanyDetailDialog` no se cerraba solo tras suspender/reactivar.** A diferencia de `UserDetailDialog` (paso 8), el primer intento de `handleToggleStatus` no llamaba `onOpenChange(false)` tras el éxito — el diálogo se quedaba abierto mostrando el `company` del momento en que se abrió (prop cerrado, no se actualiza solo con la invalidación de la query de fondo), con el badge y el botón viejos ("Suspender empresa" seguía visible después de ya haber suspendido). Se descubrió de inmediato al encadenar dos acciones seguidas en la misma prueba de navegador — un segundo script que reabría el diálogo fallaba porque el modal anterior seguía tapando la tabla. Arreglado agregando `onOpenChange(false)` al final de `handleToggleStatus`, igual que `UserDetailDialog`.

**`LAST_ADMIN_SAFEGUARD`-equivalente para plataforma: no existe, no se buscó.** A diferencia de identity (paso 8), no hay ningún mecanismo documentado de "no te quedes sin ningún super-admin" — suspender/activar empresas no toca cuentas de plataforma. No aplica acá.

**No se pudo probar en navegador el camino negativo (usuario autenticado SIN el claim `super_admin` intentando `/platform`)** — la única cuenta de prueba disponible con sesión activa y contraseña conocida (`mateojaras@gmail.com`) SÍ tiene el claim (confirmado por eso mismo se pudo probar todo lo demás). Sí se verificó el camino de "sin sesión en absoluto" (`/platform` → redirige a `/auth/login?redirect=/platform`, confirmado). El código del guard (`!(await isSuperAdmin()) → redirect a '/'`) es simétrico al de `identityRoute`/`auditRoute` (mismo patrón ya probado ahí con permisos de empresa), pero la rama específica "autenticado, sin el claim" queda sin verificación en vivo — mismo tipo de hueco honesto que `LAST_ADMIN_SAFEGUARD` en el paso 8.

### Qué falta (fuera de alcance del paso 10)

- Ver/editar planes (`GET /platform/plans` ya se usa para el select de "Nueva empresa", pero no hay pantalla de gestión de planes — CLAUDE.md paso 10 no la pide, solo "crear empresa, suspender, extender suscripción").
- Mostrar plan/fecha de expiración actual de cada empresa — bloqueado por el gap de `CompanyOut` documentado arriba.
- Verificar en vivo el camino negativo del guard de `/platform` (ver hallazgo arriba) — necesita una segunda cuenta real sin el claim `super_admin`.

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (54 tests)
npm run dev   # /platform: crear empresa, suspender, reactivar, extender suscripción
```

## Paso 9 — Audit (completo — "histórico de cierres" ya estaba hecho desde el paso 6)

`CLAUDE.md` paso 9 pide dos cosas: "log con filtros combinables" y "histórico de cierres con rango de fechas". Lo segundo YA existía — se construyó dentro de `CashboxPage` en el paso 6 (`useClosingsHistory` + `DateRangePicker`, ver esa sección), no en `features/reports/` como sugería la estructura original del proyecto; se dejó ahí a propósito (mismo permiso `cashbox.view`, misma pantalla donde ya se abre/cierra caja — moverlo a un módulo separado solo por seguir la estructura al pie de la letra hubiera sido churn sin beneficio real). Este paso construyó lo que faltaba: el log de auditoría.

### Estructura nueva

```
src/
  lib/
    businessModules.ts     # BUSINESS_MODULE_LABELS — PROMOVIDO desde identity (ver hallazgos)
    identity/users.ts        # useUsersFlat() — lista plana para el filtro por usuario
  features/audit/
    api.ts                     # useAuditLog(filters) — cursor + module/entity_type/user_id combinables
    labels.ts                    # AUDIT_ACTION_LABELS / AUDIT_ENTITY_TYPE_LABELS (mapa parcial, mismo criterio que CONCEPT_LABELS)
    components/AuditDetailDialog.tsx  # ver antes/después como JSON crudo
    pages/AuditPage.tsx            # filtros + tabla
```

### Decisiones y hallazgos

**`GET /audit-log` no tiene rango de fechas — solo `module`/`entity_type`/`user_id`/`cursor`/`limit` (confirmado en `src/types/api.ts`).** A diferencia de `/reports/closings` (que sí tiene `from_date`/`to_date`, usado en el histórico de cierres del paso 6), acá no se inventó un filtro que el backend no soporta — los tres selects combinables son exactamente los tres query params reales.

**`module` de `AuditLogOut` usa la MISMA taxonomía que `PermissionOut.module` (paso 8) — confirmado contra datos reales, no asumido.** Se trajeron ~19 registros reales del audit log de dev y sus valores de `module` (`cashbox`, `contracts`, `identity`, `inventory`, `platform`) son un subconjunto exacto del catálogo de módulos ya visto en la matriz de permisos, más `platform` (el dominio del panel super-admin, paso 10, que no aparece en el catálogo de permisos de una empresa normal). Con esa confirmación, `PERMISSION_MODULE_LABELS` (que vivía solo dentro de `PermissionsMatrixDialog.tsx`) se promovió a `lib/businessModules.ts` — segundo consumidor real, mismo criterio de promoción que `lib/customers/search.ts` en el paso 7. Sigue siendo un dominio DISTINTO de `lib/modules.ts` (`pawn|store|general`, el módulo de negocio de gastos/cierre de caja) — no se fusionaron, son catálogos del backend sin relación aunque compartan la palabra "módulo".

**`entity_type`/`action` no tienen catálogo formal en el schema (`string` pelado, sin enum) — mismo criterio que `CONCEPT_LABELS` (paso 6): mapa parcial poblado solo con los valores vistos en el audit log real de dev, con fallback al valor crudo para lo no mapeado.** A diferencia de `module` (que sí tiene un catálogo más amplio y confiable vía `GET /identity/permissions`), acá no había otra fuente que empíricamente mirar los registros reales — se trajeron ~8 páginas (50 por página) para maximizar la cobertura de valores distintos antes de escribir el mapa.

**Hallazgo real, no bug: dos registros del audit log tienen `user_id: null` (se muestran como "Sistema").** Verificado que corresponden EXACTAMENTE a los dos eventos del aprovisionamiento inicial de la empresa (`create_company` e `invite_user` del primer usuario Admin), ambos con el mismo `created_at` — no es un patrón que se repita en acciones normales de un usuario ya autenticado (confirmado: una segunda invitación real, hecha en el paso 8 con sesión de un usuario real, sí trae su `user_id`). El front no distingue "sistema" de "usuario borrado" — ambos casos hoy son indistinguibles con lo que manda el backend (`user_id: null`), documentado como comportamiento observado, no como regla garantizada.

**`AuditDetailDialog` muestra `before`/`after` como JSON crudo pretty-printed, sin intentar un diff visual campo por campo.** La forma de esos objetos varía completamente según la acción (`{role_id}` para cambiar rol, `{permission_codes: string[]}` para permisos, `{name, clone_from_role_id}` para crear un rol…) — construir una vista "amigable" por tipo de acción hubiera significado un mapeo ad-hoc por cada `action` existente y futura, mucho esfuerzo para un panel que ya cumple su propósito (mostrar exactamente qué cambió) mostrando el JSON tal cual en un `<pre>`.

**`useUsersFlat` (`lib/identity/users.ts`) es la lista de usuarios para el filtro, no paginada** — mismo patrón que `lib/catalogs/suppliers.ts` (paso 7): un `<select>` no necesita "cargar más", a diferencia de la tabla de `IdentityPage` (paso 8), que sí pagina por cursor con `useUsersList`. Con el tamaño real de esta empresa (2-4 usuarios) una sola página (límite 100) cubre cualquier caso real.

**Falso positivo de un script de prueba: un `page.screenshot({fullPage: true})` con el `<Select>` de módulo recién abierto hizo que el siguiente click a una opción fallara por timeout** — el select se cerraba antes de que el click llegara. Confirmado NO es un bug de la app: sin el screenshot de por medio (y verificando directo por la respuesta de red, `GET /audit-log?module=identity` → 9 items, los 9 con `module: "identity"`, 9 filas renderizadas), el filtro funciona perfecto. Mismo tipo de falso positivo que el de los selects encadenados de categoría en el paso 7 — un `fullPage` screenshot puede interferir con overlays de Radix posicionados por portal; evitarlo cuando se necesite interactuar con un popover justo después de abrirlo.

### Qué falta (fuera de alcance del paso 9)

- Filtro por rango de fechas en el log de auditoría — no existe en el backend hoy (`GET /audit-log` no tiene `from_date`/`to_date`). Si se agrega del lado del backend, el front solo necesita sumar un `DateRangePicker` más (ya construido, reutilizable) a los filtros existentes.
- Resolver `user_id: null` a algo más específico que "Sistema" — el backend no distingue "acción del sistema" de "usuario borrado"; no hay nada que el front pueda inferir sin ese dato.
- Guard de ruta por permiso en `/auditoria` — SÍ tiene guard (`audit.view`, igual que `/identidad`), a diferencia del pendiente sistemático que arrastran `/contratos`, `/clientes`, etc. desde el paso 4.

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (54 tests)
npm run dev   # /auditoria: filtrar por módulo/entidad/usuario combinados, ver detalle con antes/después
```

## Paso 7b — PhotoUploader y desbloqueo de "Publicar" (completo)

Backend/infra resolvió el bloqueo de Storage documentado en el paso 7 (`docs/STORAGE_PENDIENTE.md`): bucket `company-files` creado, privado, 8 MB máx, `image/jpeg|png|webp`, RLS por `company_id`. Con eso se construyó `PhotoUploader` de verdad y se desbloqueó "Publicar" en inventario — cerrando el único pendiente real que había quedado del paso 7.

### Estructura nueva

```
src/
  lib/storage/
    compressImage.ts    # canvas + createImageBitmap, sin librería externa
    photos.ts            # upload/sign/delete contra el bucket + useSignedPhotoUrl
  components/shared/
    PhotoUploader.tsx    # controlado sobre string[] de PATHS, no URLs — grid + reorder + subir/quitar
  features/inventory/components/ItemEditDialog.tsx   # placeholder reemplazado por PhotoUploader real
```

### Decisiones y hallazgos

**Antes de construir nada, se repitió en código la misma verificación que backend/infra reportó — no se dio por hecho un "ya quedó".** Con el token real de un usuario autenticado: subir un PNG real a `company-files/{company_id}/...` (200), generar una URL firmada (200), descargarla y comparar el MD5 contra el original (idénticos), borrar el archivo de prueba (200), e intentar subir a la carpeta de una empresa inventada (`403 AccessDenied` explícito de RLS, no un genérico) — y un intento con `text/plain` en vez de imagen (`400 InvalidMimeType`, confirma el filtro de tipo). Mismo criterio que el resto de la sesión: un reporte de "ya está resuelto" se confirma con una llamada real antes de construir encima.

**`PhotoUploader` es controlado sobre un arreglo de PATHS de Storage, no de URLs.** El backend nunca valida ni conoce el contenido de `ItemUpdateIn.photos: string[]` — el front decide el path y lo guarda tal cual; la URL para MOSTRAR una foto se pide aparte, bajo demanda, con `useSignedPhotoUrl(path)` por cada thumbnail (`staleTime` de 4 min porque el token firmado vence a los 5 en el backend). Nunca se guarda ni cachea una URL firmada — coherente con CLAUDE.md regla 12 (nunca URLs públicas, siempre de vida corta).

**Compresión sin librería nueva:** `createImageBitmap` + `<canvas>` reencodando a WebP (mejor tamaño que JPEG/PNG a calidad equivalente, y está en la lista de tipos que acepta el bucket) — redimensiona al lado más largo (1600px por defecto) antes de subir. El build ya tenía una advertencia de bundle grande (paso 1); sumar una librería de compresión solo para esto no se justificaba cuando el navegador ya trae las piezas.

**La subida al Storage ocurre al instante que se elige el archivo, no se difiere al "Guardar cambios" del formulario.** No hay forma de diferir el byte-upload en sí (solo la asociación del path con el artículo, que sí es lo que hace "Guardar cambios" vía `PATCH .../items/{id}` con `photos`). Si el usuario cierra el diálogo sin guardar, el archivo queda huérfano en el bucket sin que ningún artículo lo referencie — se aceptó el trade-off (mismo que la mayoría de uploaders de este estilo) en vez de complicar el flujo con una subida diferida; no hay job de limpieza en el front, quedaría del lado de backend/infra si algún día importa.

**Bug evitado, no bug encontrado: "Publicar" debía leer el estado YA guardado del artículo, no el estado sin guardar del formulario.** `publishItem` (`POST .../publish`) no manda `photos` en su body — solo valida contra lo que el artículo YA tiene guardado en el backend. Si el botón "Publicar" se hubiera habilitado apenas se subiera una foto (antes de "Guardar cambios"), publicar habría llamado al backend con el artículo todavía sin fotos asociadas y habría fallado (o peor, publicado sin fotos si el backend no repite esa validación en esa ruta). Se resolvió comparando `JSON.stringify(watch('photos'))` contra `item.photos` (el prop, la última versión confirmada por el servidor): si difieren, "Publicar" queda deshabilitado con un aviso ("Guarda los cambios para poder publicar"), forzando el orden correcto: subir → guardar → publicar.

**Probado en navegador de punta a punta contra dev, cerrando los dos huecos que el paso 7 había dejado documentados como "no se pudo probar":** subir 2 fotos reales a un artículo en borrador → guardar → reabrir el diálogo y confirmar que persistieron → "Publicar" (código real emitido, `JAO0001P`) → el artículo pasa a "Disponible" → buscarlo en `/ventas/nueva`, agregarlo al carrito y completar una venta real (`POST /sales` 201, con el número de venta y las líneas correctas) → el artículo baja de cantidad pero sigue "Disponible" (no pasa a "Vendido" hasta agotar cantidad — confirmado, no asumido) → un egreso real con el mismo artículo (`POST /inventory/exits` 201). Cero errores de consola en todo el recorrido, incluyendo mobile 360px.

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (54 tests)
npm run dev   # /inventario: editar un borrador → Fotos → agregar, reordenar, quitar → Publicar
```

## Paso 8 — Identity (completo)

Usuarios (listar, invitar, cambiar rol, des/reactivar) y roles (listar, crear con clonado opcional de permisos, renombrar, matriz de permisos por checkboxes). Primer consumidor real de `GET /identity/permissions` — hasta este paso el catálogo de permisos solo se conocía indirectamente vía `/me.permissions` (paso 5b). Primer módulo cuyas mutaciones tocan potencialmente los permisos de la sesión activa (cambiar el propio rol, editar los permisos del propio rol) y primer consumidor real de `LAST_ADMIN_SAFEGUARD`.

### Estructura nueva

```
src/
  components/ui/checkbox.tsx              # shadcn — primer consumidor: matriz de permisos
  features/identity/
    api.ts                                  # usuarios, invitaciones, roles, permisos — sin Idempotency-Key
    components/
      UserStatusBadge.tsx                     # estado de CUENTA, separado de StatusBadge (ver hallazgos)
      InviteUserDialog.tsx
      UserDetailDialog.tsx                    # cambiar rol + des/reactivar + explica LAST_ADMIN_SAFEGUARD
      RoleFormDialog.tsx                      # crear (+ clonar permisos) / renombrar
      PermissionsMatrixDialog.tsx             # checkboxes agrupados por módulo, textos del backend
    pages/IdentityPage.tsx                    # tabs Usuarios/Roles, cada uno gateado por su propio permiso
```

### Decisiones y hallazgos

**`UserStatusBadge` es un componente NUEVO y separado de `StatusBadge`, a propósito — no una reutilización.** `"active"` ya es un estado de CONTRATO en el mapa compartido (`STATUS_LABELS.active = 'Vigente'`); reusarlo para un usuario activo mostraría "Vigente", que no tiene sentido en español para una cuenta. Se verificaron los tres valores reales de `UserOut.status` contra el backend (`invited` → `active` → `inactive`, confirmado en navegador invitando, reactivando y desactivando un usuario real): con eso se armó un mapa local `invited: 'Invitado', active: 'Activo', inactive: 'Inactivo'`, mismo criterio de fallback-al-valor-crudo que `StatusBadge`/`CONCEPT_LABELS` si apareciera un cuarto valor no visto.

**`PermissionsMatrixDialog` usa `PermissionOut.description` tal cual del backend, sin mapa de traducción a mano.** A diferencia de `CONCEPT_LABELS`/`STATUS_LABELS` (que sí necesitan mapa porque el backend manda códigos internos como `interest_payment`), `GET /identity/permissions` ya trae una descripción en español lista para mostrar (`"Abrir y cerrar la caja diaria"`, `"Reabrir un cierre (excepcional, auditado)"`) — usarla directo evita duplicar contenido que puede cambiar del lado del backend sin que el front se entere. Sí hizo falta un mapa local para `PermissionOut.module` (`PERMISSION_MODULE_LABELS`, ej. `contracts` → "Contratos") porque esos códigos de módulo no traen descripción propia — mismo criterio de mapa-parcial-con-fallback. **Este `module` es un dominio DISTINTO de `lib/modules.ts`** (`MODULE_LABELS: pawn|store|general`, el módulo de negocio de gastos/cierre de caja) — mismo nombre de concepto, dos catálogos del backend que no se relacionan; se mantuvieron en mapas separados a propósito en vez de compartir uno.

**La casilla `is_special` de `PermissionOut` se muestra como una etiqueta "Permiso especial" bajo la descripción, sin restringir nada en la UI.** No hay regla documentada de qué hace especial a un permiso (ejemplos vistos: abrir/cerrar caja, reabrir cierre) — se decidió mostrarlo como información, no usarlo para deshabilitar el checkbox, porque inventar una restricción no pedida violaría la regla 7 (la UI oculta lo que el backend ya decidió ocultar, no decide ella misma qué es peligroso).

**El `Checkbox` de shadcn se instaló con `npx shadcn add checkbox` (primera vez en el proyecto) — el CLI escribió el archivo en `./@/components/ui/checkbox.tsx` en vez de `src/components/ui/`, literalmente una carpeta `@` en la raíz del repo.** El alias `@` de `components.json` no lo resolvió al generar la ruta de salida (bug/limitación del propio CLI en este entorno, no algo del proyecto). Se movió el archivo a mano a su ruta correcta y se borró la carpeta `@` espuria — el contenido generado en sí (basado en `radix-ui`, mismo import que `select.tsx`/`dialog.tsx`) no necesitó ningún cambio. Si se agregan más componentes de shadcn en pasos futuros, verificar dónde quedó escrito el archivo antes de darlo por hecho.

**`PermissionsMatrixDialog` NO usa RHF** (a diferencia de casi todos los formularios del proyecto) — es un `Set<string>` local de códigos marcados. Para sembrarlo sin `useEffect` sincronizando estado (la regla no escrita de este proyecto desde `SupplierFormDialog`, paso 4), se partió el diálogo en dos: el de afuera (`PermissionsMatrixDialog`) hace ambos fetches (catálogo + permisos actuales del rol) y solo monta el hijo (`PermissionsChecklist`) cuando YA llegaron los dos; el hijo siembra `useState(() => new Set(initialCodes))` en su primer render, que ya tiene los datos reales — nunca hay un estado "vacío" que después se corrige con un efecto.

**Verificado en navegador, con waits explícitos sobre la respuesta de red (no `waitForTimeout`): cambiar el rol de un usuario, y des/reactivarlo, NO tienen el hueco de consistencia eventual que sí tenía cashbox en el paso 6.** Una primera pasada de pruebas con esperas fijas de 1200ms hizo sospechar el mismo bug (el diálogo mostraba el rol viejo tras reabrir) — se confirmó con `page.waitForResponse` sobre el `PATCH` y el `GET` de invalidación que en realidad el dato SÍ estaba correcto en ambas respuestas; el diálogo anterior mostraba el rol viejo por una carrera del propio script de prueba (un `waitForSelector` con texto ambiguo que coincidía con el label de un botón ya visible, resolviendo antes de tiempo), no por un bug de la app. Se descarta: `useUpdateUserRole`/`useDeactivateUser`/`useReactivateUser` se quedan con `invalidateQueries` simple, sin el `setQueryData` defensivo que sí hizo falta en cashbox — no hace falta duplicar ese patrón donde no hay evidencia real del problema.

**Hallazgo real, no bug: invitar un correo ya invitado NO devuelve `CONFLICT` — el backend intenta reenviar la invitación vía Supabase Auth Admin, y en pruebas devolvió `502 AUTH_ADMIN_ERROR` porque el límite de envío de correos de Supabase (`over_email_send_rate_limit`, 429) ya estaba alcanzado por las propias pruebas de esta sesión.** `AUTH_ADMIN_ERROR` no estaba en el catálogo de códigos conocidos (`lib/api/errors.ts`) — se agregó (mismo criterio que los códigos de import de contratos en el paso 5b: todo código real observado se registra, aunque no dispare un modal especial). No hizo falta comportamiento dedicado: cae al banner genérico de `applyServerErrors` con `error.message`, que YA trae el texto en español del backend ("No se pudo invitar al usuario en Supabase Auth.") — verificado que el formulario se queda usable (no se pierde lo escrito, el botón se reactiva). El `conflictMessage` que sí se le pasó a `applyServerErrors` en `InviteUserDialog` (para un eventual 409 real) queda sin verificar en la práctica — no se pudo forzar un duplicado limpio porque el rate limit de Supabase se disparó primero.

**`LAST_ADMIN_SAFEGUARD` se implementó (catch de `ApiError`, modal explicativo de un solo botón "Entendido", sin reintentar — regla 9) pero NO se verificó disparándolo de verdad.** Hacerlo hubiera requerido desactivar o cambiar de rol la única cuenta Admin activa real de la sesión (`mateojaras@gmail.com`, la que está usando estas pruebas) — un riesgo real de perder la sesión sin otra forma de volver a entrar, ya que la única otra cuenta (`Admin Demo`) no tenía contraseña creada al momento de esta prueba. Mismo criterio que el bloqueo de Storage del paso 7: verificar honestamente lo que SÍ se pudo probar, dejar constancia explícita de lo que no, en vez de asumir que funciona.

**`IdentityPage` gatea cada tab por su propio permiso** (`identity.manage_users` / `identity.manage_roles`) — un usuario con uno solo de los dos ve solo esa pestaña, no ambas deshabilitadas. La ruta `/identidad` reusa el patrón de guard de `contractImportRoute` (paso 5b): sin ninguno de los dos permisos, redirige a `/`. Es la primera vez que ese patrón de guard se reutiliza fuera de contratos.

**Primer ítem de la barra lateral filtrado por permiso.** `NAV_ITEMS` tenía un comentario desde el paso 6 anticipando esto ("el filtrado por permiso llega cuando exista el catálogo real, paso 8") — se agregó un campo opcional `anyPermission?: string[]` a `NavItem` y un filtro en `SidebarContent` contra `useMe().permissions`; el resto de ítems con pantalla (`Contratos`, `Ventas`, etc.) se queda sin filtrar, deliberadamente — es el mismo pendiente sistemático de guard-por-ruta que arrastra el proyecto desde el paso 4, no algo que este paso debía resolver para todos los módulos.

**Datos reales que quedaron en el ambiente de dev tras las pruebas** (mismo criterio que pasos anteriores: no se revierte lo que sirve como evidencia real, sí se revirtió lo que era puro residuo de prueba): el rol `Cajero Temporal` creado durante las pruebas queda (no hay `DELETE /identity/roles/{id}` en la API); `Admin Demo` pasó de `invited` a `active` como efecto secundario de probar reactivar (no hay forma de volver a `invited`); un usuario nuevo `mateojaras+paso8test@gmail.com` (rol Bodega) quedó invitado de verdad. Sí se revirtió: el permiso `audit.view` que se había marcado de más en el rol `Asesor` durante la prueba de guardado de la matriz.

### Qué falta (fuera de alcance del paso 8)

- Verificar `LAST_ADMIN_SAFEGUARD` disparándolo de verdad — necesita una segunda cuenta Admin activa en el ambiente de pruebas (ver hallazgo arriba).
- Guard de ruta por permiso en `/identidad/*` sub-rutas específicas — hoy es un único guard a nivel de la ruta completa; no aplica porque no hay sub-rutas (todo vive en diálogos), pero queda anotado por si eso cambia.
- `RoleOut.active` se muestra en la tabla pero no hay ninguna acción para desactivar un rol — la API no tiene endpoint para eso (solo listar/crear/renombrar/permisos).

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (54 tests)
npm run dev   # /identidad: invitar, cambiar rol, des/reactivar, crear rol, matriz de permisos
```

## Paso 7 — Inventory + sales (completo, con un bloqueo externo documentado)

Ingresos multi-línea (con validación real de negocio: "Compra" exige proveedor), edición de borrador, publicar (bloqueado hoy por falta de Storage — ver `STORAGE_PENDIENTE.md`), egresos con motivo; venta tipo POS (buscar artículo → carrito → medio de pago → descuento opcional → vender), recibo con impresión y anulación. Segundo módulo (después de contratos) que promueve helpers a `lib/` por tener 2+ consumidores reales: búsqueda de clientes ahora la usan tanto contratos como ventas.

### Estructura nueva

```
src/
  lib/
    money.ts                              # + multiplyMoney (subtotal de línea: precio × cantidad)
    inventory/items.ts                      # useItem, useAvailableItemsSearch — filtrado client-side
    catalogs/suppliers.ts                     # useSuppliers() plano, para selects (distinto del paginado de CatalogsPage)
    customers/search.ts                         # useCustomerSearch/useCustomer — PROMOVIDO desde features/contracts
  components/shared/
    CustomerPicker.tsx                            # MOVIDO desde features/contracts/components/
    ItemPicker.tsx                                  # nuevo — buscar y agregar (no buscar y fijar, a diferencia de CustomerPicker)
  features/inventory/
    api.ts                                            # Entry, Exit, Item + hooks — sin Idempotency-Key (no aplica)
    pages/EntryFormPage.tsx, InventoryPage.tsx          # ingresos multi-línea; tabs Artículos/Ingresos/Egresos
    components/ItemEditDialog.tsx,                        # editar borrador + publicar (bloqueado, ver abajo)
      ExitFormDialog.tsx, EntryDetailDialog.tsx
  features/sales/
    api.ts                                            # Sale + hooks — create_sale SÍ acepta Idempotency-Key
    pages/SaleFormPage.tsx, SalesListPage.tsx           # POS: carrito local (useState, no RHF)
    components/SaleReceiptDialog.tsx                      # ver/imprimir/anular
```

### Decisiones y hallazgos

**Regla de negocio real, no documentada en el schema de OpenAPI: un ingreso `origin_type: "purchase"` exige `supplier_id`.** El schema generado marca `supplier_id` como opcional sin condición — la exigencia solo existe en la validación del backend. Se descubrió enviando una "Compra" real sin proveedor: `400 BAD_REQUEST` — `"Un ingreso de compra requiere \`supplier_id\`."`. Dos arreglos: (1) el catch de `onSubmit` en `EntryFormPage` tenía un mensaje genérico hardcodeado que se tragaba el mensaje real del backend — cambiado a `applyServerErrors(error, setError)` (el helper central ya establecido) para que cualquier error de negocio futuro se muestre tal cual, no solo este caso; (2) además se agregó validación Zod proactiva (`.refine` condicional sobre `origin_type`/`supplier_id`) para que el estado inválido ya no se pueda ni enviar — el error de servidor queda como red de seguridad, no como el único mecanismo.

**Confirmado con una llamada directa al backend (no solo inferido de la UI): publicar un artículo exige ≥1 foto, y el backend lo hace cumplir, no solo el front.** `POST /inventory/items/{id}/publish` con `photos: []` devuelve `400 {"code":"BAD_REQUEST","message":"El artículo necesita al menos una foto para publicarse."}`. Esto confirma que el botón "Publicar" de `ItemEditDialog` (deshabilitado hoy porque `photos` nunca puede ser no-vacío sin `PhotoUploader`) está gateado correctamente y no es una limitación artificial del front — es un reflejo exacto de una regla real del servidor. Ver `docs/STORAGE_PENDIENTE.md` para el detalle completo del bloqueo de Storage.

**Sin Storage no hay forma de que un artículo llegue a `available`**, así que egresos y "agregar al carrito de venta" nunca se probaron en navegador contra un artículo real disponible — solo contra el estado vacío de búsqueda (`Sin resultados.`), que sí se confirmó que renderiza bien. El flujo completo de venta (buscar artículo → aparece en resultados → agregar → carrito con subtotal correcto) queda sin verificar end-to-end hasta que exista al menos un artículo publicado; el código en sí (`ItemPicker`, cálculo de `multiplyMoney`/`sumMoney` para el carrito) sí tiene cobertura de unit tests para la aritmética.

**`lib/customers/search.ts` — segunda promoción de una feature a `lib/` (después de categorías/proveedores/búsqueda de artículos, todas en pasos previos).** `useCustomerSearch`/`useCustomer` vivían en `features/contracts/api.ts`; ventas los necesitaba igual de intacto (mismo picker, mismo endpoint). Se movieron a `lib/customers/search.ts` y los tres consumidores de contratos (`ContractFormPage`, `ContractImportPage`, `ContractDetailPage`) se actualizaron para importar desde ahí en vez de a través de `features/contracts/api.ts`. Regla del proyecto (CLAUDE.md §3): compartido vive en `lib/`, ninguna feature importa internals de otra — acá se aplicó apenas hubo un segundo consumidor real, no antes.

**`CustomerPicker` se movió junto con la promoción** (`features/contracts/components/` → `components/shared/`) y de paso se limpió su contrato: `onChange` pasó de `(customer: Customer) => void` con un cast interno feo (`null as unknown as Customer` para representar "se limpió la selección") a `(customer: Customer | null) => void`, que es lo que realmente pasa. Ambos consumidores (contratos y ventas) se actualizaron al tipo correcto.

**`ItemPicker` es un componente nuevo, distinto de `CustomerPicker` a propósito: "buscar y agregar" vs. "buscar y fijar un valor".** `CustomerPicker` mantiene un cliente seleccionado (o ninguno) como su valor controlado. `ItemPicker` no tiene "valor" propio — cada resultado tiene un botón que dispara `onSelect` y limpia la búsqueda, porque tanto egresos como el carrito de venta agregan líneas repetidamente sin que el picker "recuerde" la última selección. Intentar forzarlo al mismo contrato que `CustomerPicker` hubiera significado un estado fantasma sin usar.

**`useAvailableItemsSearch`/`useSuppliers` filtran del lado del cliente sobre los primeros 100 resultados** — mismo patrón y misma limitación que `legacy_code` en contratos (paso 5b): `GET /inventory/items` no tiene parámetro `q`. Documentado como gap conocido, no un bug — si el catálogo de artículos disponibles crece más allá de 100, la búsqueda dejará de ser exhaustiva y habrá que pedirle al backend un `q` real.

**El carrito de venta es `useState<CartLine[]>` local, no React Hook Form** — a diferencia de `EntryFormPage` (que sí usa `useFieldArray` porque las líneas se escriben directamente en inputs del formulario), el carrito de venta se arma por selección desde `ItemPicker` (agregar por click, no por typing), así que RHF no aportaba nada; el total (`sumMoney` de `multiplyMoney` por línea, menos descuento con `subtractMoney` si aplica) se recalcula en cada render a partir del array, sin estado derivado adicional.

**Ningún endpoint de inventario acepta `Idempotency-Key`** (confirmado en `src/types/api.ts`, mismo patrón que cashbox en el paso 6) — mutaciones planas con `isPending`. **`create_sale` SÍ lo acepta** (a diferencia del resto de este paso) — usa `useMoneyMutation`, con invalidación de `['sales']`, `['dashboard']`, `['cashbox','current']` e `['inventory']` (una venta mueve caja y stock a la vez).

**Recibo de venta reusa el patrón de "imprimible como hermano del diálogo"** establecido en el paso 6 para el acta de cierre (`PrintLayout` fuera de `AppDialog`, nunca anidado) — mismo bug clase evitado sin tener que redescubrirlo.

**Falso positivo de un script de prueba, no un bug de la app:** un intento inicial de verificar los selects encadenados de categoría (nivel 1 → 2 → 3) en el formulario de ingreso mostró cero opciones. La causa fue el script interactuando antes de que llegara la respuesta de `GET /catalogs/categories` (que en este backend de dev tarda unos segundos) — no la lógica de cascada. Confirmado correcto reescribiendo el script con `page.waitForResponse(...)` explícito: Joyería/Tecnología (nivel 1) → Anillos (nivel 2) → Anillos de oro (nivel 3) resolvieron bien.

### Qué falta (fuera de alcance del paso 7)

- **Publicar artículos, y por extensión probar en navegador el camino completo de egresos y venta con un artículo real** — bloqueado por Storage no configurado en el proyecto Supabase de dev. Detalle completo, qué falta configurar y a quién le toca en `docs/STORAGE_PENDIENTE.md`.
- Búsqueda de artículos con `q` real en el backend (hoy: filtro client-side sobre 100 resultados, ver arriba).
- Guard de ruta por permiso en `/inventario`, `/ventas` y sus subrutas — mismo pendiente sistemático que arrastra el proyecto desde el paso 4 (solo `/contratos/importar` tiene guard, por ser Admin-only).
- Editar/anular un ingreso ya creado — la API solo tiene creación y lectura de `entries`.

### Comandos de verificación

```bash
npm run lint && npm run typecheck && npm run test && npm run build   # todo en verde (54 tests)
npm run dev   # /inventario: ingreso multi-línea, editar borrador, egreso; /ventas: POS, recibo, imprimir, anular
```

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
- `docs/pending/API_GUIDE.md` todavía no se copió del repo backend (pendiente, ver `README.md`).

### Comandos de verificación (todos en verde al cerrar el paso 1)

```bash
npm run lint        # eslint . — limpio
npm run typecheck    # tsc -b --noEmit — limpio, estricto (strict + noUncheckedIndexedAccess)
npm run test          # vitest run — 25/25 tests (money.ts, dates.ts)
npm run gen:api:check   # src/types/api.ts al día con /openapi.json del backend dev
npm run build            # tsc -b && vite build — build de producción sin errores
```
