# Sistema de diseño — basado en la referencia visual aprobada, 100% centralizado

> Referencia visual y de componentes. La regla de oro: **ningún valor de diseño vive en una feature** — todo sale de `src/styles/tokens.css` y de los componentes de `components/shared`. Cambiar la marca completa (colores, radios, tipografía) = editar UN archivo. Reglas de arquitectura en `CLAUDE.md` §4.

## 1. Referencia visual (capturas aprobadas por el cliente)

El cliente aprobó como referencia de UI/UX las capturas de un software administrativo comercial (dashboard, POS, modales, mobile). El teal original nació como placeholder derivado de esa referencia (15/08/2026), con todo el color en tokens para que el rebranding fuera editar un archivo. Ese rebranding ocurrió: la marca es la paleta de oro de §1-bis.

### 1-bis. La marca — **Prendo** (nombre 12/09/2026 · paleta de oro y logo 20/09/2026 · **APLICADA al código**)

Plan completo de las fases que siguen (kit, guía, dominio, correo): **`PLAN_MARCA.md`**.
Kit con logo, mockups y ratios: **`../../marca/IDENTIDAD.html`** (en la raíz del proyecto, fuera de este
repo — ver `../../marca/README.md`), publicado en
<https://claude.ai/code/artifact/bdce6752-e078-41bd-b582-44fab3d2cd4e>.
**Los SVG están en `../../marca/logo/`**, y las copias servidas en `public/`.

| | |
|---|---|
| Nombre | **Prendo** — *prenda* en forma de verbo. Sin tilde ni eñe (a propósito: ver `00056`) |
| Dominio | `prendo.com.co`, comprado el 20/09/2026. Verificar siempre contra `whois -h whois.registry.co`, que es el único que responde de verdad (el `whois` del sistema cae a IANA y devuelve el TLD) |
| Logo | **Etiqueta**: rombo de esquinas redondeadas con perforación — un solo `path` con `fill-rule: evenodd`, sobre tile de radio 16/64. Es el objeto que la app imprime para cada lote, y en segunda lectura una gema. Reemplaza el monograma P del 12/09, que no distinguía |
| Tipografía de marca | **Archivo** SemiBold, tracking −0.035em (`--font-display`, `--tracking-display`; en código desde el 26/09 con la landing, §7). **La interfaz sigue en Inter** — eso no cambia (y desde el 26/09 de verdad: antes el token pedía una familia que no existía, ver §7) |

**Paleta "Oro Moderno".** Los valores viven en `tokens.css`; acá está solo lo que hay que saber para no
romperlos.

```
:root                          [data-theme='dark']
--brand-50:  #fbf4e4           --brand-50:  #2a2318
--brand-100: #f2e3be           --brand-100: #3d3221
--brand-500: #c99a3d           --brand-500: #d3ac5f
--brand-600: #b08531           --brand-600: #e5c56b
--brand-700: #7a5a1c           --brand-700: #f2d27a
--brand-contrast: #24211c      --brand-contrast: #24211c
```

> **La decisión no obvia: el texto sobre el oro es CARBÓN, no blanco.**
> Blanco sobre `#c99a3d` da **2.57:1** — peor que el teal 2.70 que esta app abandonó por no cumplir AA.
> Carbón sobre el mismo oro da **6.24:1** y conserva el hex de la paleta exacto. Es además como se resuelve
> el oro en las marcas premium: blanco sobre dorado siempre se ve lavado.
> Por eso `--brand-contrast` **no se invierte** entre temas: el carbón funciona sobre el oro en los dos.

> **La segunda trampa, un nivel más abajo: `bg-primary` ≠ `text-primary`.**
> Tailwind deriva las dos utilidades del mismo `--color-primary`. Con un primario claro eso rompe: el oro
> como **texto** sobre fondo claro da **2.42:1**, y ahí viven los enlaces y las cifras de dinero del
> `KpiCard` — justo lo que la paleta recomendaba pintar de dorado.
> Por eso existe `--color-brand: var(--brand-700)` en `globals.css`.
> **Regla: `bg-primary` para rellenos, `text-brand` / `border-brand` para texto y bordes.**
> Un `text-primary` nuevo en una feature es un bug de revisión.

**A diferencia del rebranding anterior, este no fueron 6 líneas.** La paleta de oro trae su propio mundo
cálido, así que también cambiaron los neutrales (`--bg-app` marfil, `--bg-muted` beige, `--text-strong`
carbón, `--text-muted` gris cálido, `--border` beige grisáceo) y el sidebar (`#24211c`). Sobre un fondo frío
el oro se ensucia y tira a mostaza. `--platform` **no se tocó**: sigue siendo navy frío a propósito, y ahora
que la app es cálida contrasta todavía más.

> **Medido, y al revés que con el esmeralda:** sobre el sidebar carbón `#24211c` el oro de marca da **6.24**,
> así que acá **sí** se puede usar el `--brand-500` directo como acento. El esmeralda daba 3.01 sobre el
> sidebar viejo y obligaba a una variante clara.

**Dónde vive cada marca.** Hay dos marcas conviviendo y el tenant no es Prendo:

| Superficie | Marca |
|---|---|
| Sidebar, topbar, contrato impreso, paz y salvo | **El tenant** (`me.company.name` + su `logo_url`); Prendo solo al pie del impreso, en gris |
| Login, `/auth/callback`, favicon, `<title>`, `AppFooter`, panel de super-admin, correos | **Prendo** |
| **La landing pública (`/`)** — 26/09/2026 | **Prendo, y solo Prendo**: es la cara de venta del producto. Ningún dato de un tenant; los ejemplos (contrato #128, etiqueta JOC0007-01R) son de muestra. Ver §7 |

Por eso el respaldo de `AppShell`/`AppFooter` cuando no hay empresa es **`'Mi empresa'`**, no `'Prendo'`:
poner la marca de la plataforma ahí diría que el inquilino se llama Prendo.

**`tests/token-contrast.test.ts` ya mide el relleno del botón primario** (`--brand-contrast` sobre
`--brand-500` y `--brand-600`, en los dos temas). Antes solo medía tokens de texto: por eso el 2.70 del teal
vivió meses sin que nada fallara. Verificado a la inversa el 20/09 — con `--brand-contrast: #ffffff` el test
falla con 2.57, que es para lo que existe.

Lo que define el look y hay que replicar:

- **Shell:** sidebar **carbón** fija a la izquierda (28/08/2026 — antes blanca, ver nota de contraste en §2; ítem activo con fondo sólido + barra de acento a la izquierda), topbar blanca con buscador global centrado, ayuda/notificaciones/apps y avatar del usuario a la derecha. Fondo general marfil (`--bg-app`), contenido en **cards blancas** con borde sutil y radio generoso. Pie de página de una línea, mismo fondo que las cards — ver `AppFooter` en §3 (30/08/2026: la primera versión, un bloque oscuro de 3 columnas, se sintió invasiva en el uso real).
- **Dashboard:** fila superior de **KPIs** separados por divisores (etiqueta pequeña gris + cifra grande — cifras en color según semántica: rojo cuentas por cobrar, oro ventas — con `text-brand`, no `text-primary`, ver §1-bis), debajo cards de gráficas: área/línea de ingresos vs gastos con toggle de pestañas ("Causado/Pagado" → nuestro equivalente: Empeño/Tienda), barras apiladas, dona de mejores clientes con leyenda.
- **Formularios y POS:** panel "Factura de venta" — selects arriba (lista de precio, numeración), cliente con botón "+ Nuevo" al lado, líneas con stepper − 1 +, resumen Subtotal/Descuento/IVA, **CTA grande de ancho completo en oro, con texto carbón y el total dentro del botón** ("Vender $419.170").
- **Modales:** centrados, blanco, radio grande (~24px), X arriba a la derecha, título grande centrado, subtítulo gris, campos con label arriba y bordes redondeados suaves, **botón primario tipo pastilla (pill) en oro, centrado**. TODOS los modales de la app siguen exactamente este patrón (requisito explícito).
- **Vacíos/onboarding:** cards con ilustración/ícono suave, texto "Aún no tienes…", CTA en oro directo. Checklists de bienvenida con pasos.
- **Mobile:** sidebar → drawer; KPIs apilados; tablas → cards; CTAs de ancho completo.

## 2. Tokens (`src/styles/tokens.css`) — única fuente de verdad

CSS variables consumidas por Tailwind (`@theme` en Tailwind v4). Las features usan clases semánticas (`bg-primary`, `text-danger`, `rounded-card`) — nunca el hex.

> **Los valores viven en `src/styles/tokens.css`, y este documento ya no los copia.**
> Hasta el 20/09/2026 acá había un duplicado del bloque completo. Se borró porque **había derivado**: decía
> `--success: #22A06B` cuando el archivo real tenía `#1b7e54`, y un sistema de diseño con dos verdades es
> peor que uno con una sola en otro archivo. Lo que sigue es el mapa de **roles** — para qué existe cada
> token. Para el valor, abrir `tokens.css`, que está comentado línea por línea.

| Grupo | Tokens | Para qué |
|---|---|---|
| Marca | `--brand-50` `-100` `-500` `-600` `-700` `--brand-contrast` | `500` es el **relleno** del primario y `--brand-contrast` el texto encima; `700` es la marca **como texto** sobre el fondo del tema (utilidad `text-brand`); `50`/`100` son fondos suaves, chips y bordes |
| Semánticos | `--success` `--warning` `--danger` `--info` + su `-soft` | Estado de una operación. Cada uno cumple AA sobre `--bg-app`, `--bg-surface` **y su propio `-soft`**, que es el caso más exigente por compartir tono con el texto |
| Neutrales | `--bg-app` `--bg-surface` `--bg-muted` `--border` `--text-strong` `--text-body` `--text-muted` | Superficies y texto. `--bg-muted` es distinto de `--bg-app` a propósito (28/08/2026): antes eran el mismo color y un botón "outline" desaparecía sobre el fondo de página |
| Papel | `--paper` `--paper-ink` `-ink-soft` `-muted` `-rule` `-accent` `-accent-ink` `-accent-soft` `-danger` `-danger-soft` | Documentos impresos y la vista previa de /configuracion/documentos (`PrintLayout`, `PrintBlocks`). **No se redefinen en oscuro**: son el hex del tema claro repetido a propósito, y `tests/paper-tokens.test.ts` exige que sigan siendo copia exacta de su token claro. Si cambia la marca, el test avisa que el papel también |
| Sidebar | `--sidebar-bg` `-hover` `-active-bg` `-fg` `-fg-strong` `-fg-muted` `-border` `--sidebar-success` | Superficie propia, **no** `--bg-surface`: antes el sidebar era el mismo blanco que cualquier card y no contrastaba con el shell. **También es el carbón de la landing** (§7): son los únicos tokens que siguen oscuros en los dos temas. `-fg-muted` es el tercer nivel de texto sobre carbón (no va sobre `-active-bg`); `--sidebar-success` es el «bien» sobre carbón, porque `--success` ahí da 2.4 |
| Estados de dominio | `--status-active` `-arrears` `-extension` `-auctioned` `-paid` `-neutral` | Badges. Casi todos son alias de un semántico; la prórroga tiene color propio |
| Gráficas | `--chart-1` … `--chart-5` | Recharts lee de acá (ver §5). `1` es la serie principal, `2` los egresos |
| Plataforma | `--platform` `--platform-foreground` | Banda del panel super-admin. Navy frío **a propósito**: ningún tenant lo ve nunca, y su razón de existir es que no se confunda con la marca |
| Forma | `--radius-input` `-card` `-modal` `-pill` `-panel` `--shadow-card` `--shadow-modal` `--shadow-float` `-float-sm` `--shadow-lift` | `--radius-panel` (tarjetas grandes de la landing) queda entre la card y el modal. `--shadow-float`/`-float-sm` son negras y densas porque sobre el carbón del hero `--shadow-modal` no se ve; `--shadow-lift` es el hover que sube una tarjeta |
| Luz de marca | `--brand-halo` `--hero-grid-line` | El oro como **luz**, no como relleno: brillo radial del hero y del CTA final, anillo del paso «Remate». La grilla sutil del hero. Solo landing |
| Movimiento | `--ease-out` `--duration-fast` `-base` `-slow` | |
| Tipografía y espacio | `--font-sans` `--font-display` `--font-mono` `--tracking-display` `--font-size-hero` `-closing` `-section` `-subsection` `--space-page` `--space-card` | `--font-sans`: la interfaz, con `font-feature: tnum` en las cifras. `--font-display` (Archivo) solo titulares de la marca; `--font-mono` (JetBrains Mono) solo códigos de etiqueta, porque deja ver cada carácter. La escala de titulares es fluida entre 390 y 1280 px (el valor chico es el del diseño de celular). Todas se instalan con `@fontsource-variable`, nunca de Google Fonts: el CSP solo permite `font-src 'self' data:` |

**El movimiento también es un token.** Sin estas cuatro líneas cada pantalla inventaba su propia duración y la app se sentía hecha por manos distintas. Tres duraciones y una sola curva — si algo pide una cuarta, casi siempre es que está animando de más.

Utilidad `enter-up` (definida en `globals.css`): el contenido cargado sube unos píxeles mientras aparece, en vez de saltar. Se aplica **al contenedor, no a cada hijo** — animar veinte filas por separado convierte una lista en un espectáculo y retrasa la lectura.

Dark mode: **implementado (27/08/2026)**, Claro/Oscuro/Sistema con toggle en el topbar (`ThemeToggle`, `src/app/store.ts`). `[data-theme='dark']` en `tokens.css` redefine ~25 variables — cero componentes tocados, porque nunca hubo hex sueltos fuera de `tokens.css`. Al agregar un color nuevo a `tokens.css`, revisar si necesita también su valor en `[data-theme='dark']` — la regla "nunca hex sueltos" sigue siendo lo que hace esto sostenible.

### `prefers-reduced-motion`

Se respeta **una sola vez y para toda la app**, en `globals.css`: confiar en que cada pantalla nueva se acuerde de `motion-reduce` garantiza que tarde o temprano alguna se olvide. La regla **no anula** las animaciones, las reduce a un salto instantáneo — poner `animation: none` rompería las que dependen de su estado final (los diálogos de Radix quedarían invisibles, porque su estado de entrada es opacidad 0).

**Excepción: Recharts.** Anima desde JavaScript interpolando valores, así que ninguna regla de CSS lo alcanza. Los wrappers de `charts/` preguntan la preferencia con `usePrefersReducedMotion()` y pasan `isAnimationActive={!prefersReducedMotion}`. Cualquier gráfica nueva debe hacer lo mismo.

## 3. Inventario de componentes compartidos (`components/shared`)

Construidos UNA vez sobre shadcn/ui + tokens; las features solo los componen. Si una feature necesita una variante, se agrega como prop/variante al compartido — no se clona.

| Componente | Qué es / reglas |
|---|---|
| `AppShell` | Sidebar (carbón — `--sidebar-*`, no `--bg-surface`, ver §2 —, colapsable a íconos; en mobile drawer con overlay y animación de entrada) + topbar (buscador global — hoy `disabled`, es un placeholder visual de la referencia, ninguna búsqueda unificada real todavía, ver RECOMENDACIONES §3; avatar con menú: hoy solo "Cerrar sesión" — "perfil"/"cambiar contraseña" siguen pendientes de `PATCH /me`, ver PENDIENTES_BACKEND_INFRA.md punto 15) + `CashSessionBanner` + contenido con `--space-page` + `AppFooter`. Orden real del menú (`AppShell.tsx`): Inicio, Contratos, Ventas, Inventario, Clientes, Caja, Catálogos, Identidad (usuarios + roles en una sola pantalla, filtrada por `identity.manage_users`/`identity.manage_roles`), Reportes, Auditoría, Configuración. **Solo "Configuración" se muestra sin `to:` (deshabilitado a propósito)** — bloqueado del lado del backend (RECOMENDACIONES §1 punto 5), visible para no esconder que existe pero sin ruta real todavía; "Reportes" sí tiene ruta (`/reportes`, construido — ver §5 y `docs/IMPLEMENTATION.md`). El resto de ítems se filtra por permiso. |
| `AppFooter` | Pie de página de una sola línea (`components/shared/AppFooter.tsx`; extraído de `AppShell.tsx` el 28/08, rediseñado el 30/08 tras sentirse invasivo como bloque oscuro de 3 columnas). `bg-card`, borde superior — copyright + nombre legal (+ NIT si existe) a la izquierda, teléfono de contacto o el tagline genérico a la derecha. Datos de `me.company` solo si existen, nada inventado. Sin links institucionales inventados (Términos, Ayuda) — no existen esas páginas todavía. |
| `RecordNumber` | El número de un documento (`#123`) con tratamiento tipográfico real — `#` en `text-muted-foreground`, número en `tnum font-semibold` (28/08/2026, antes texto plano `` `#${x}` `` repetido en ~15 lugares). Usado en listas/detalles de contratos, ventas, clientes, inventario. |
| `PageHeader` | Título + breadcrumb + acciones a la derecha (botón primario único). Toda página lo usa — consistencia de jerarquía. |
| `KpiCard` / `KpiRow` | Fila de KPIs del dashboard según la referencia (§1): label pequeña `--text-muted` + cifra grande `tnum`, color semántico opcional, divisores verticales, responsive a grid 2×N en mobile. `KpiCard` acepta un `delta?` opcional (`{pct, favorable}`) que agrega una segunda línea pequeña "▲/▼ N% vs período anterior" en verde/rojo — usado en Reportes (§5), la dirección "favorable" se decide por KPI (subir ingresos es verde, subir gastos es rojo), nunca se asume. |
| `DataTable` | Sobre TanStack Table: encabezado gris claro, hover de fila, celdas de dinero alineadas a la derecha con `formatCOP`, columna de acciones con menú `⋯`, estados loading (skeleton de filas)/vacío/error integrados, paginación por cursor ("Cargar más"). En mobile colapsa a cards (render alterno por fila). |
| `AppDialog` | EL modal (patrón de la referencia, §1): centrado, `--radius-modal`, X arriba derecha, título grande centrado, subtítulo, footer con primario pill centrado (o par cancelar/confirmar). Tamaños `sm/md/lg`. Sobre Radix Dialog: focus trap, ESC, scroll lock, accesible. **Prohibido crear otro modal**: todo diálogo de la app es `AppDialog`. |
| `ConfirmDialog` / `confirm()` | Confirmación imperativa (`await confirm({title, tone:'danger'})`) para acciones destructivas o de dinero (anular venta, rematar, reabrir caja). Variante `danger` usa `--danger`. Acciones que exigen motivo: prop `requireReason` con textarea obligatoria (anular, reabrir, descuadre, descuento). |
| `DatePicker` / `DateRangePicker` | EL calendario único (react-day-picker vía shadcn): locale `es`, semana inicia lunes, formato `dd/MM/yyyy`, "hoy" = `todayBogota()`, presets en rangos (Hoy, Ayer, Esta semana, Este mes). Cualquier fecha de la app se elige con este componente. |
| `Money` / `MoneyInput` | `Money` renderiza con `formatCOP` (+ variante coloreada in/out para movimientos). `MoneyInput` enmascara puntos de miles al escribir, `inputmode="numeric"`, emite string decimal para la API. Nadie formatea dinero fuera de estos dos. |
| `StatusBadge` | Pill de estado con mapa central estado→token→etiqueta ES: `active→Vigente`, `in_arrears→En mora`, `in_extension→Prórroga`, `auctioned→Rematado`, `paid→Pagado`, `draft→Borrador`, `available→Disponible`, `sold→Vendido`, `written_off→Dado de baja`, `invited→Invitado`, `open→Abierta`, `closed→Cerrada`, `in_custody→En custodia`… Único lugar donde se traducen estados de la API. |
| `LegacyCodeBadge` | Pill neutra (tono `status-neutral`, no un estado semántico) con el `legacy_code` de un contrato importado (RECOMENDACIONES §1.6) — ej. `C-1042`. En la fila de la lista de contratos y junto al número en el encabezado del detalle, SOLO si el contrato lo tiene. No confundir con `StatusBadge`: esto no es un estado, es una referencia externa fija. |
| `Callout` | Recuadro de ayuda (25/09/2026, `components/shared/Callout.tsx`): explica algo que el usuario no sabe y, si aplica, trae la acción para resolverlo ahí mismo. Tonos `info` / `success` / `warning` sobre el `-soft` del semántico; **el texto va en el color normal y solo el ícono lleva el semántico** (un párrafo entero en color de advertencia se lee peor). Título opcional, cuerpo, y `action` (un botón pill). Primer uso: la cláusula de autorización de avisos en el editor de plantillas de Contrato y en Configuración → Notificaciones. No reemplaza las notas de una línea que ya existen (fondo suave + texto semántico): esto es para cuando hay título, explicación y acción. |
| `EmptyState` | Ícono suave + título + descripción + CTA (patrón "Aún no tienes…" de la referencia). Toda lista vacía lo usa. |
| `PhotoUploader` | Comprime client-side, sube a Storage (bucket privado, path con `company_id`), preview con URL firmada, multi-foto con orden. Usado por prendas, artículos, cédulas, contrato firmado, comprobantes de gasto. |
| `CashSessionBanner` | Franja global bajo la topbar: caja abierta (verde suave: responsable + hora de apertura + link al cierre) o cerrada (ámbar: "Caja cerrada — no se pueden registrar operaciones de dinero" + CTA abrir si tiene permiso). El estado de caja es contexto operativo permanente. |
| `Can` | `<Can permission="sales.void">…</Can>` — envuelve toda acción sensible. |
| `SearchInput` | Búsqueda con debounce (300ms) conectada a `?q=` de la API. |
| `PrintLayout` | Documento imprimible (contrato, paz y salvo, comprobante de venta, acta de cierre) mientras el backend no genera PDFs: hoja carta (`@page` en `globals.css`), membrete del tenant (logo, razón social, NIT; a la derecha el nombre del documento, `number` y «Impreso el …»), pie con los textos de /configuracion. **Se monta en un portal** (hijo de `<body>`, `data-print-document`) y `globals.css` oculta todo lo demás al imprimir: ninguna página necesita `print:hidden` para que salga solo el documento (25/09/2026 — el comprobante salía debajo de la lista de Ventas). `screenPreview` lo muestra en su lugar, sin portal (vista previa de /configuracion/documentos). **Colores: solo tokens `--paper-*`** (utilidades `bg-paper`, `text-paper-ink`, `text-paper-accent-ink`, `border-paper-rule`…), que no cambian con el tema — el papel no tiene modo oscuro. Las piezas de adentro viven en `PrintBlocks.tsx`: `PrintSection` (título en versalitas con el oro de texto), `PrintField`, `PrintTable`/`PrintTh`/`PrintTd` (encabezado sobre el oro suave, filas que no se parten), `PrintContractItemsTable`, `PrintSignature` (espacio fijo, imagen `object-contain` + `mix-blend-multiply` para que una firma con fondo blanco no tape la línea). Un documento nuevo se arma con estas piezas, no con clases sueltas. |
| `charts/DonutChart` | Dona (Recharts `PieChart` + `innerRadius`) con leyenda lateral (% + monto). Colores `--chart-3/4/5` + `--brand-500`/`--text-muted` si hay más de 3 segmentos — nunca hex. Dos consumidores en Reportes (§5): gastos por categoría, medio de pago. Hermano de `charts/ContractsStatusChart` (dashboard) y `charts/DailyTrendChart` (área con degradado, Reportes) — mismo criterio de tokens los tres. |

## 4. Protocolos de UX (aplicar siempre)

1. **Jerarquía de acción:** UNA acción primaria (oro, pill o bloque) por pantalla/modal; el resto secundarias (outline) o terciarias (ghost). El CTA de dinero muestra el monto dentro del botón ("Vender $419.170", "Registrar abono $50.000").
2. **Dinero guiado, nunca libre:** abonos = botones generados desde `payment-options` (1 mes $X · 2 meses $Y · Al día + capital); el único campo libre es capital extra cuando `allows_capital`. Cierre de caja: `expected_cash` visible, `counted_cash` se digita, la diferencia se calcula y muestra al instante; si ≠ 0, el campo justificación aparece y bloquea el submit hasta llenarse.
3. **Feedback inmediato:** toda mutación → botón en loading (spinner + disabled) → toast de éxito con acción contextual ("Abono registrado — Ver recibo") o error mapeado (§6 de ARCHITECTURE). Nunca doble submit posible.
4. **Destructivo = fricción:** anular, rematar, reabrir, desactivar → `ConfirmDialog` con consecuencia explícita ("El cliente pierde las prendas; se crearán artículos de inventario") y motivo obligatorio cuando el backend lo audita.
5. **Skeletons, no spinners de página:** cada card/tabla carga su propio skeleton con la forma del contenido real. El shell nunca parpadea.
6. **Formularios:** label arriba, ayuda debajo, error bajo el campo en `--danger`; foco al primer error; `Cmd/Ctrl+Enter` envía en modales; borradores largos (contrato, ingreso multi-línea) avisan antes de descartar cambios.
7. **Tablas operativas:** fila entera clickeable al detalle, acciones en menú `⋯`, filtros como chips encima (estado, fechas con presets), búsqueda a la izquierda, botón primario a la derecha del `PageHeader`.
8. **Un 403 no es una falla — nunca decir "no se pudo cargar" cuando falta un permiso.** Un permiso faltante es una respuesta CORRECTA del backend. Tratarlo como error produce mensajes que afirman cosas falsas y mandan al usuario a buscar un problema inexistente: pasó de verdad con un rol sin permisos, que veía *"Caja cerrada"* con la caja abierta y *"no se pudieron cargar los productos"* con el inventario sano, más un botón de **Reintentar** que no podía funcionar nunca. Reglas: usar `lib/api/isPermissionError`; si la pantalla **afirma un estado** (el banner de caja) y no se puede saber, **no mostrar nada** en vez de afirmar lo contrario; si es una lista, decir qué falta y a quién pedírselo, **sin botón de reintentar**; y si el elemento es opcional para la operación (el `AccountPicker`), ocultarlo y dejar que la operación siga.
9. **Idioma y formatos:** todo en español; números SIEMPRE `es-CO` (puntos de miles, coma decimal); fechas `dd/MM/yyyy` en Bogotá; sin jerga técnica en errores (traducir `CONFLICT` a "Ya existe un cliente con ese documento").
10. **Accesibilidad (WCAG 2.1 AA):** contraste ≥4.5:1 — para **texto** en color de marca sobre fondo claro va `text-brand` (`--brand-700`), nunca `text-primary`: el oro del relleno da 2.42:1 como texto (ver §1-bis). `tests/token-contrast.test.ts` mide los dos casos, navegable 100% por teclado (Radix ayuda), `aria-label` en íconos solos, tamaños táctiles ≥44px en mobile.

    **Medido y corregido (09/09/2026, auditoría de QA — F6-02).** Un barrido de 12 pantallas × 2 temas encontró **12 combinaciones por debajo de AA en el tema claro y ninguna en el oscuro**: la regla estaba escrita acá desde el día 1 y nadie la medía. Los seis tokens semánticos de texto (`--text-muted`, `--success`, `--warning`, `--danger`, `--info`, `--status-extension`) se recalcularon **contra los tres fondos donde viven de verdad** —`--bg-app`, `--bg-surface` y su propio `-soft`, que es el caso más exigente por compartir tono— conservando el matiz. El tema oscuro no se tocó.

    **La marca no hizo falta cambiarla para el texto:** `--brand-700` (#00806f) da 4.53 sobre claro, que es exactamente lo que esta regla ya pedía. Queda **una excepción consciente**: el botón primario relleno (blanco sobre `--brand-500`) está en 2.70 y no cumple; oscurecerlo cambia la identidad visual, así que es decisión de producto y no de QA — anotado en `DECISIONES_PENDIENTES.md`.

    **Ahora hay un test que lo vigila:** `tests/token-contrast.test.ts` calcula los ratios de los tokens sobre los fondos de la app. La regla dejó de depender de que alguien se acuerde de medirla.
11. **Responsive real:** breakpoints 360 / 768 / 1024 / 1280. La operación diaria (abonos, ventas, consulta de contrato) debe ser 100% usable en un teléfono de gama media — el mostrador puede ser un celular.

    **Medido y corregido (09/09/2026 — F6-03).** Tres pantallas desbordaban a 360 px: `/caja` 59 px, `/cuentas` 15 y `/contratos` 14. `flex-wrap` + `min-w-0` en `PageHeader` **y en los tres contenedores reales** — porque los botones de `/caja` no viven en el header sino en una card propia, `/contratos` tenía otro `flex` anidado dentro de sus acciones y en `/cuentas` era la fila de cada cuenta. Hoy las 12 pantallas están en cero.

    **Al medir, distinguir dos cosas que se confunden:** que el **documento** desborde (`documentElement.scrollWidth > clientWidth`) es el bug; que un elemento sea más ancho que la ventana **dentro de un contenedor con `overflow-x: auto`** es el patrón correcto y no hay que "arreglarlo" — es lo que hacen la tabla de desglose de Reportes y las pestañas de Inventario.
12. **Dos puertas de entrada a un mismo recurso, cuando el permiso las separa:** "+ Nuevo contrato" (crea y desembolsa, CTA con el monto — regla 1) y "Registrar contrato existente" (importa un contrato migrado del sistema anterior, sin desembolso — RECOMENDACIONES §1.6) son acciones primarias DISTINTAS en `PageHeader`, no un toggle dentro del mismo formulario: campos, validaciones y hasta el texto del CTA difieren ("Crear contrato $X" vs. "Registrar"). La segunda es visible solo con `contracts.import` (Admin de fábrica) — si el rol no lo tiene, ese botón no existe, ni siquiera deshabilitado.

## 5. Gráficas (dashboard y Reportes)

Recharts con wrapper propio `components/shared/charts/` que lee colores de los tokens (`--chart-*`/`--status-*`) — nunca colores inline por gráfica. Piezas del dashboard (espejo del layout de referencia + datos de `GET /reports/dashboard`):

- `KpiRow`: Cartera activa (capital_outstanding, rojo suave), Ventas de hoy, Ventas del mes, Contratos activos, Artículos disponibles (+ valor), Estado de caja.
- Card "Contratos por estado": `ContractsStatusChart` — barras con `--status-*`.
- Card "Listos para remate": lista corta accionable (no gráfica) — es la alerta operativa más valiosa.
- Tooltips con `formatCOP`, leyenda con puntos de color, grid horizontal sutil `--border`.

**Reportes** (`/reportes`, construido — ver `docs/IMPLEMENTATION.md`) es el centro de información financiera de la app y la pantalla que usa el resto de los tokens de gráfica: `--chart-1`/`--chart-2` (reservados desde el día 1 para "ingresos"/"gastos") y `--chart-3/4/5` (reservados para "series secundarias, dona"), ambos sin consumidor hasta esta pantalla.

- `DateRangePicker` en `PageHeader.actions` — rango o un día específico (presets Hoy/Ayer/Esta semana/Este mes + calendario libre), tope de 90 días (el mecanismo agrega sesión por sesión, N+1 acotado — más ancho pide un endpoint de agregación al backend, ver `docs/PENDIENTES_BACKEND_INFRA.md` punto 13).
- **Tabs de módulo** (Todo / Empeño / Tienda) justo debajo del header, mismo patrón de pill-buttons que `InventoryPage` (`ITEM_STATUS_TABS`) — filtran TODA la pantalla de abajo. Cambiar de pestaña es instantáneo (la agregación es una función pura en memoria, no dispara ninguna request nueva). Con un módulo específico seleccionado, las cards "Empeño vs Tienda" y "Movimiento de capital" se ocultan (no aplican comparando un módulo contra sí mismo, o cartera de empeño bajo "Tienda").
- `KpiRow`: Ingresos operativos, Gastos operativos, Utilidad operativa, Intereses cobrados, Ventas — **excluye a propósito** el movimiento de capital (desembolsos/abonos), que vive en su propia card separada con una nota explícita ("no es ingreso ni gasto") — mezclar ambos daría una utilidad falsa (prestar dinero no es un gasto, recuperarlo no es ingreso). Cada KPI trae `delta` vs el período inmediatamente anterior de igual duración (`▲/▼ N%`, verde/rojo según si es favorable para ESE indicador específico).
- Card "Empeño vs Tienda" (solo con módulo "Todo"): `ModuleSplitBar` — barra de 2 segmentos en CSS puro (no Recharts) con el % de participación en ingresos operativos.
- Card "Cartera actual" (módulo "Todo"/"Empeño"): snapshot de HOY (`GET /reports/dashboard`, no depende del rango elegido — rotulado explícitamente para no confundir), reusa `ContractsStatusChart`.
- Card "Tendencia diaria": `DailyTrendChart` — área con relleno degradado (`type="monotone"`, curvas suaves), ingresos vs gastos operativos por día, `--chart-1`/`--chart-2`. Eje X en `dd/MM` (`formatDateShort`): el año se repite en cada punto y es ruido — el rango completo ya está escrito arriba, en el selector. `minTickGap` deja que Recharts descarte etiquetas antes de encimarlas (con 90 días no caben todas). Sin puntos fijos por dato: `activeDot` al pasar el mouse basta, y con rangos largos los puntos convertían la línea en un collar.
- Cards "Gastos por categoría" / "Medio de pago (ingresos)": `DonutChart` — dos donas lado a lado. "Medio de pago" muestra solo ingreso OPERATIVO (nunca capital recuperado, para que cuadre exactamente con el KPI de arriba).
- Card "Desglose por módulo, concepto y medio de pago": tabla, mismo shell que `SessionReportPanel` (Caja) pero agregada sobre TODO el rango.
- Sección "Histórico completo" (al final, visualmente separada, NO depende del rango elegido arriba — `GET /sales` no tiene filtro de fecha en el backend): "Prendas más vendidas" y "Categorías más movidas", listas rankeadas con barra de progreso relativa al primer puesto (mismo espíritu simple que `ModuleSplitBar`, no una gráfica nueva).

## 6. Flujo de theming en la práctica

1. shadcn/ui se instala apuntando sus variables (`--primary`, `--radius`…) a los tokens de §2 — un solo mapeo en `globals.css`.
2. Tailwind expone los tokens como utilidades semánticas (`bg-primary`, `border-default`, `text-muted`, `rounded-card`).
3. ESLint (regla custom o revisión de PR) rechaza hex/rgb en `features/` y `components/shared/`.
4. Rebranding futuro (otro tenant quiere su color): editar las 6 líneas de marca de `tokens.css`. Si algún día se quiere marca por empresa en runtime, las variables ya lo permiten (inyectar `<style>` con overrides al cargar la empresa) — no construirlo aún.

## 7. La landing pública (`/`, 26/09/2026)

La única superficie de la app que no es un panel: la página de venta de Prendo, en la raíz (el panel vive en
`/inicio` — por qué, en `IMPLEMENTATION.md` del 26/09). Código en `src/features/landing/`; diseño aprobado en un
lienzo de claude.ai (tipo Design, escritorio 1440 y celular 390, con notas de movimiento):
<https://claude.ai/artifact/MbHqXJJBoKf1zjVjqqmaX5>. No se hizo en Figma porque el entorno no tiene conector de
Figma.

**Es Prendo, no el tenant** (tabla de §1-bis). Las mismas reglas del resto de la app: todo sale de tokens, y los
tokens nuevos que pidió están en la tabla de §2.

### Tipografía

- **Titulares en `--font-display` (Archivo) con `--tracking-display`**, sobre la escala fluida
  `--font-size-hero` / `-closing` / `-section` / `-subsection`. Es la tipografía de marca del kit, que hasta acá
  solo vivía en el logo.
- **Códigos de etiqueta en `--font-mono` (JetBrains Mono)**, y nada más en mono.
- El cuerpo, en `--font-sans`, como la app.

### Superficies y contraste

- **Las secciones oscuras (hero, «Para quién», CTA final) usan `--sidebar-*`**, porque siguen oscuras en los dos
  temas. Con `--bg-*` se habrían vuelto claras en el tema claro y la composición del hero se desarma.
- **El oro como texto sobre carbón es `--brand-500`** (alias `--color-brand-on-dark` en `globals.css`): 6.24 en
  claro y 9.10 en oscuro. `--brand-600` en claro daba solo 4.77. Es la inversa de la regla de §1-bis: sobre claro,
  el texto de marca es `--brand-700`; sobre carbón, el relleno sí se lee.
- **El estado «bien» sobre carbón es `--sidebar-success`** (7.69): `--success` está pensado para fondo claro y
  sobre el carbón da 2.4.
- **Los numerales grandes «01 / 02 / 03» en oro sobre marfil son ornamento** (alias `--color-ornament`): dan 2.42,
  así que van con `aria-hidden` y nunca llevan información que haya que leer.
- `tests/token-contrast.test.ts` mide los pares que la landing usa de verdad, en los dos temas.

### Protocolo de movimiento

Todo en `src/features/landing/landing.css`. Sin tokens nuevos: `--ease-out` y las tres duraciones, y los retrasos de
las cascadas se derivan de ellas (60 ms entre palabras del titular = la mitad de `--duration-fast`).

1. **Estado final por defecto.** Lo que empieza escondido solo lo está bajo `[data-in='false']`, que pone
   `useInView` cuando hay IntersectionObserver y el sistema no pide movimiento reducido. Sin IntersectionObserver,
   todo está visible desde el principio.
2. **Cada sección entra una vez**: `Reveal` (`landing/components/primitives.tsx`) le pone `enter-up` al
   contenedor —no a cada hijo, como en el resto de la app— y `data-in` para que las piezas de adentro (la cadena,
   la curva del reporte) sepan cuándo arrancar. No vuelve a animarse al subir y bajar.
3. **La cadena de 7 pasos se dibuja en 6 tramos**, cada uno en `--duration-slow`, uno detrás del otro: el paso k se
   enciende cuando llega el tramo k−1. Con una sola línea en `--ease-out`, que hace casi todo el recorrido al
   principio, los cinco primeros pasos se encendían en 200 ms.
4. **El parallax del hero lo escribe `requestAnimationFrame` en variables CSS** (`--px`/`--py`), y cada capa se
   mueve según su `--depth`. Sin re-render de React en cada frame.
5. **`prefers-reduced-motion`:** la regla global de §2 reduce duraciones pero no toca los retrasos, y un elemento
   con 1,9 s de delay quedaba invisible 1,9 s y después saltaba. `landing.css` pone además los retrasos en cero y
   apaga el flote de las tarjetas.
6. **El hover que sube una tarjeta va solo bajo `(hover: hover)`**: en un celular, un toque no deja la tarjeta
   levantada.

### Cerrado (26/09/2026): la app nunca había cargado Inter

`--font-sans` pedía `'Inter'`, pero `@fontsource-variable/inter` registra la familia como `'Inter Variable'`. El
navegador no la encontraba y caía a `system-ui`, **sin ningún error**: toda la app se vio en la fuente del sistema
desde el día uno. Mateo decidió arreglarlo: el token nombra ahora `'Inter Variable'` primero. Medido en Chrome:
`document.fonts.check('16px "Inter Variable"')` da `true` y la familia figura cargada en `/` y `/auth/login`, sin
desborde a 360. **Regla:** al instalar una fuente de `@fontsource-variable/*`, el nombre de la familia lleva el
sufijo `Variable` — abrir su `index.css` y copiarlo de ahí, no suponerlo.
