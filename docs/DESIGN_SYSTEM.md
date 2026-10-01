# Sistema de diseño

> **La regla de oro: ningún valor de diseño vive en una feature.** Todo color, radio, sombra, espaciado,
> tipografía y duración sale de `src/styles/tokens.css`, y toda pieza repetida, de `components/shared`. Cambiar la
> marca = editar un archivo. Arquitectura del front: [`ARQUITECTURA.md`](ARQUITECTURA.md). Reglas obligatorias:
> [`../CLAUDE.md`](../CLAUDE.md).
>
> **Este documento no escribe clases de Tailwind con su sintaxis real**: Tailwind v4 escanea los `.md` del repo y
> emitiría cada ejemplo en el CSS del bundle ([`ARQUITECTURA.md`](ARQUITECTURA.md) §16). Se nombran los tokens
> (`--brand-700`) o los colores semánticos que `globals.css` expone (`primary`, `brand`, `paper-ink`) en prosa.

## 1. La marca

**Prendo** — *prenda* en forma de verbo, sin tilde ni eñe a propósito. Dominio `prendo.com.co`. El kit de
identidad (logo, paleta medida, reglas de uso) es un `.html` fuera de los repos: `marca/IDENTIDAD.html` en la raíz
del workspace, con su `README.md`; los SVG servidos por la app están en `public/`.

| | |
|---|---|
| Logo | **La etiqueta**: rombo de esquinas redondeadas con una perforación, un solo `path` con `fill-rule: evenodd`. Es el objeto que la app imprime para cada lote y, en segunda lectura, una gema. Legible a 16 px (el favicon) |
| Wordmark y titulares de marca | **Archivo** SemiBold, tracking −0.035em (`--font-display`, `--tracking-display`) |
| Interfaz | **Inter** (`--font-sans`) |
| Paleta | **Oro Moderno**: oro sobre un mundo cálido (marfil, beige, carbón, gris cálido). Los valores, en `tokens.css` |

### El texto sobre el oro es carbón, no blanco

Blanco sobre el oro del botón primario (`--brand-500`) da **2.57:1** y no cumple AA; carbón (`--brand-contrast`)
da **6.24:1** y conserva el oro exacto. Es además como se resuelve el oro en las marcas premium: blanco sobre dorado
se ve lavado. Por eso `--brand-contrast` **no se invierte** entre temas.

### Relleno no es texto: el color `primary` y el color `brand`

Tailwind deriva el fondo y el texto del mismo `--color-primary`. Con un primario claro eso rompe: el oro como
**texto** sobre fondo claro da **2.42:1**, y ahí viven los enlaces y las cifras de dinero. Por eso `globals.css`
define `--color-brand` = `--brand-700` (5.98:1 sobre marfil). **Regla: el color `primary` es para rellenos; para
texto y bordes en color de marca va el color `brand`.** Un texto en `primary` en una feature es un bug de revisión.
Sobre el carbón del sidebar y de la landing es al revés: ahí el oro de relleno (`--brand-500`) sí se lee como texto
(6.24 en claro).

### Dos marcas en la misma app

El inquilino no es Prendo:

| Superficie | Marca |
|---|---|
| Sidebar, topbar, contrato impreso, paz y salvo | **La empresa** (`me.company.name` y su logo); Prendo solo al pie del impreso, en gris |
| Login, `/auth/callback`, favicon, `<title>`, pie de página, panel de super-admin, correos | **Prendo** |
| La landing pública (`/`) | **Solo Prendo**: ningún dato de una empresa; los ejemplos son de muestra (§7) |

Por eso, sin empresa, el respaldo de `AppShell` y `AppFooter` es **«Mi empresa»**, no «Prendo»: poner la
plataforma ahí diría que el inquilino se llama Prendo.

### El look

- **Shell**: sidebar **carbón** fija a la izquierda, colapsable (drawer en celular), ítem activo con fondo sólido y
  barra de acento; topbar clara con tema, ayuda y avatar (objetivos de 44 px); fondo marfil (`--bg-app`) y el
  contenido en tarjetas blancas **separadas por borde, sin sombra**, de radio 12. Pie de una línea.
- **Títulos**: el título de página (`PageHeader`) y el titular de estado del contrato van en **Archivo**, la fuente
  de la marca; el resto de la interfaz y **todas las cifras** van en Inter con cifras tabulares.
- **Modales**: centrados, radio 16, borde y la única sombra de la app (con menús y desplegables), X arriba a la
  derecha, título grande, campos con label arriba y **botón primario rectangular en oro**. Todos los diálogos de la
  app siguen este patrón.
- **Punto de venta** (rediseño P2, §«Punto de venta» abajo): escáner con foco a la izquierda y el carrito debajo; a
  la derecha **una sola columna de cobro** que cabe entera a 1280×800, con «Cobrar $ X» de bloque en oro. Con
  efectivo, «Recibido en efectivo», montos rápidos y el **cambio** en grande (o cuánto falta); es solo cálculo en
  pantalla, no se envía (F9-32). La venta termina en la misma pantalla, con su comprobante.
- **Celular**: KPIs apilados, tablas que colapsan a tarjetas, CTAs de ancho completo.

## 2. Tokens (`src/styles/tokens.css`) — única fuente de verdad

Los valores viven en `tokens.css`, comentados línea por línea, y **este documento no los copia**: un duplicado ya
derivó una vez (decía un verde que el archivo no tenía), y un sistema con dos verdades es peor que uno con una. Lo
que sigue es el mapa de **roles**. `globals.css` los expone a Tailwind (`@theme inline`) y a shadcn/ui, así que las
features usan colores semánticos y nunca un hex.

| Grupo | Tokens | Para qué |
|---|---|---|
| Marca | `--brand-50` `-100` `-500` `-600` `-700` `--brand-contrast` | `500` es el **relleno** del primario y `--brand-contrast` el texto encima; `700` es la marca **como texto** sobre el fondo del tema (color `brand`); `50`/`100`, fondos suaves, chips y bordes |
| Semánticos | `--success` `--warning` `--danger` `--info` + su `-soft`; `--danger-solid` + `--on-danger-solid`; `--neutral-soft` | estado de una operación. `--warning` es **ámbar tostado** (gira hacia naranja para separarse del oro). `--danger-solid` es el relleno del **único estado relleno** («Listo para remate») y del botón destructivo dentro de su confirmación; `--neutral-soft`, el fondo de un estado que terminó. Cada uno cumple AA sobre `--bg-app`, `--bg-surface` **y su propio `-soft`**, el caso más exigente por compartir tono |
| Neutrales | `--bg-app` `--bg-surface` `--bg-muted` `--border` `--border-strong` `--text-strong` `--text-body` `--text-muted` `--focus` | superficies y texto. `--border` es el borde de tarjetas y divisores; `--border-strong`, el de **controles** (campo, botón secundario, segmentado, filtro), para que un campo no se confunda con una tarjeta. `--focus` es el anillo de foco de 2 px de todo control (5,98:1 sobre marfil), con token propio aunque hoy valga lo mismo que `--brand-700`. `--text-muted` se oscureció en P1 (5,02 sobre `--bg-muted`, F9-22). `--bg-muted` es distinto de `--bg-app` a propósito: si son iguales, un botón con borde y un esqueleto de carga desaparecen sobre el fondo de página |
| Papel | `--paper` `--paper-ink` `-ink-soft` `-muted` `-rule` `-accent` `-accent-ink` `-accent-soft` `-danger` `-danger-soft` | documentos impresos y su vista previa. **No cambian en oscuro**: el papel no tiene tema, y `tests/paper-tokens.test.ts` exige que sean copia exacta de su token claro (si cambia la marca, el test avisa que el papel también) |
| Sidebar | `--sidebar-bg` `-hover` `-active-bg` `-fg` `-fg-strong` `-fg-muted` `-border` `--sidebar-success` | superficie propia, no `--bg-surface`. **Son los únicos tokens que siguen oscuros en los dos temas**, por eso también pintan las secciones oscuras de la landing. `--sidebar-success` es el «bien» sobre carbón (`--success` ahí da 2.4) |
| Estados de dominio | `--status-active` `-arrears` `-extension` `-auctioned` `-paid` `-neutral` | gráficas y leyendas por estado; todos alias de un semántico. **La mora es roja** (`--danger`: es lo que se cobra) y **la prórroga ámbar** (`--warning`); antes eran dos marrones al lado del oro. La pastilla de estado ya no los usa: va por tono (§3, `StatusBadge`) |
| Gráficas | `--chart-1` … `--chart-5` | Recharts lee de aquí. `1` es la serie principal (ingresos), `2` los egresos, `3–5` series secundarias y donas |
| Plataforma | `--platform` `--platform-foreground` | banda del panel super-admin. **Navy frío a propósito**: ningún inquilino la ve, y existe para que no se confunda con la marca |
| Forma | `--radius-input` `-card` `-modal` `-pill` `-panel`, `--shadow-card` `-modal` `-float` `-float-sm` `-lift` | **campo y botón 10, tarjeta 12, diálogo 16**; la pastilla (`--radius-pill`) es **solo para estados y filtros**. Sombra: `--shadow-modal` es la de **lo que flota** (diálogos, menús, selects, popovers, listas desplegables, drawer, barras fijas); las tarjetas del panel no llevan sombra. `--shadow-card`, `-float`, `-float-sm` y `-lift` son de la landing (`-float` es densa porque sobre el carbón `-modal` no se ve; `-lift`, el hover que sube una tarjeta) |
| Luz de marca | `--brand-halo` `--hero-grid-line` | el oro como luz, no como relleno; solo landing |
| Movimiento | `--ease-out` `--duration-fast` `-base` `-slow` | tres duraciones y una curva. Si algo pide una cuarta, casi siempre está animando de más |
| Tipografía y espacio | `--font-sans` `--font-display` `--font-mono` `--tracking-display` `--tracking-title` `--tracking-headline` `--font-size-hero` `-closing` `-section` `-subsection` `-headline` `-button-sm` `-button-lg` `-md` `--space-page` `--space-card` | `--font-sans` es la interfaz, con cifras tabulares en los montos; `--font-display` (Archivo) es la marca: titulares de la landing, **título de página** (600 · 24/28 · `--tracking-title`) y **titular de estado** (700 · 22 · `--tracking-headline`); nunca cifras. `--font-mono` (JetBrains Mono) solo códigos de etiqueta, porque deja ver cada carácter. Texto de botón: 14, chico 13, de bloque 15,5; el total de una confirmación, 15. `--space-card` es 16. La escala de titulares de la landing es fluida entre 390 y 1280 px |

- **Tema oscuro**: Claro / Oscuro / Sistema con `ThemeToggle` en el topbar (`src/app/store.ts`). Un solo mecanismo,
  el atributo `data-theme` en `<html>`; `tokens.css` redefine las variables bajo `[data-theme='dark']` y ningún
  componente se toca. Un script en línea en `index.html` aplica el tema antes de que React monte (sin parpadeo; va
  por hash en el CSP). **Al agregar un color a `tokens.css`, darle también su valor oscuro.**
- **Fuentes**: se instalan con `@fontsource-variable/*` (el CSP no permite Google Fonts). **El nombre de la familia
  lleva el sufijo `Variable`** (`'Inter Variable'`): se copia del `index.css` del paquete, no se supone. Con
  `'Inter'` a secas, toda la app se vio en la fuente del sistema, sin ningún error, hasta el 26/09/2026.
- **Movimiento de entrada**: el contenido cargado sube unos píxeles al aparecer (utilidad definida en
  `globals.css`), **aplicada al contenedor, no a cada hijo**: animar veinte filas convierte una lista en un
  espectáculo y retrasa la lectura.
- **`prefers-reduced-motion`** se respeta **una vez, para toda la app**, en `globals.css`: confiar en que cada
  pantalla se acuerde garantiza que alguna se olvide. La regla reduce las animaciones a un salto instantáneo, no
  las anula (con `animation: none` los diálogos de Radix quedarían invisibles). **Recharts** anima desde JavaScript:
  los wrappers de `charts/` pasan `isAnimationActive={!prefersReducedMotion}` con `usePrefersReducedMotion()`, y
  toda gráfica nueva hace lo mismo.

### Rediseño P1 (30/09/2026): las reglas que cambió

La propuesta aprobada (`auditoria_2026-09/propuesta_rediseno.html`, §3, §4 y §6) se aplicó primero a tokens y
compartidos; las pantallas vienen después (P2, P3).

- **Botón = rectángulo, estado = pastilla.** El botón tiene radio 10 y 44 px de alto (chico 36, de bloque 52); la
  pastilla queda para `StatusBadge` y `FilterChip`. Pasarle a un botón la clase de radio de pastilla es un bug de
  revisión (lo vigila `tests/redesign-button.test.tsx`).
- **Un solo primario dorado por pantalla** (F9-13). Un filtro o segmentado activo va en **neutro invertido** (tinta
  sobre fondo), nunca en el oro del primario.
- **El rojo es para lo que pide acción.** La cifra de un KPI va en color de texto (F9-07); el color de una
  comparación va en el delta. En una acción, el destructivo es **contorno rojo** en la pantalla y **relleno rojo**
  (`--danger-solid`) solo dentro de su confirmación. El rojo a mano en un botón es un bug: va por variante.
- **Estados de contrato: tono, ícono y palabra**, en orden de urgencia (`CONTRACT_STATUS_URGENCY`): «Listo para
  remate» relleno con bandera, «En mora» rojo suave con triángulo, «Prórroga» ámbar con reloj de arena, «Vigente»
  verde con círculo de chequeo, «Pagado» azul con chequeo, «Rematado» neutro con archivo. Ningún estado depende solo
  del color.
- **Sombra solo para lo que flota**; las tarjetas se separan por borde.
- **`Button`** (`components/ui/button.tsx`): primario en oro; la variante de contorno y `secondary`, en superficie
  con `--border-strong`; `ghost` sin fondo («Cancelar», «Volver»); `destructive`, contorno rojo; `danger-solid`,
  relleno rojo solo en confirmaciones; `link`. Deshabilitado va en beige con texto atenuado (no a media opacidad) y
  quien lo deshabilita dice por qué al lado. Foco: contorno sólido de 2 px en `--focus`.
- **Campo** (`Input`, `Textarea`, `MoneyInput`, `SearchInput`, el disparador de `Select`): radio 10, 44 px, fondo de
  superficie, `--border-strong` y el borde de foco en `--focus`; 16 px de texto en el celular para que iOS no haga
  zoom.
- **Objetivos de 44 px** en la topbar (menú, tema, avatar) y en «Abrir caja» del banner (F9-02); cuando el botón
  visible es más chico, un pseudo-elemento amplía el área táctil.
- **Antes de mover plata, confirmación con resumen** (F9-18): préstamo, abono, venta, gasto y traslado.
- `tests/token-contrast.test.ts` mide cada par nuevo contra el ratio aprobado (§«rediseño P1»); el papel no cambió:
  `--paper-muted` conserva el gris anterior a propósito.

### Punto de venta (rediseño P2, 30/09/2026)

`/ventas/nueva` reproduce la maqueta aprobada (`propuesta_rediseno.html`, «Punto de venta»). Lo que vale para otras
pantallas de cobro:

- **El escáner** es la variante `scanner` de `ItemPicker` (y la `lg` de `SearchInput`): 56 px, ícono de código de
  barras, **nace con foco** y dice «Listo para escanear» (punto verde, `--success`) solo mientras lo tiene; bajo
  480 px queda el punto y el texto pasa al lector de pantalla. Tras agregar, por Enter o por clic en la lista, **el
  foco vuelve al campo** (F9-27, F9-33).
- **Carrito**: «Carrito · N artículos» (cuenta líneas, no unidades) con «Vaciar» (pregunta antes). Por línea: nombre
  600 · 14, código en `--font-mono` y la descripción como detalle; cantidad con −/+ de 40 px dentro del borde de
  controles (lo que se pesa conserva su campo); quitar en gris, no en rojo (no es destructivo: no mueve nada); el
  monto 700 · 15. Bajo 560 px el monto sube junto al nombre y los controles bajan a su fila. El precio editable
  (con `sales.apply_discount`) va **plegado** tras «Cambiar precio».
- **Columna de cobro**: Cliente («Consumidor final» · Cambiar) → medio de pago **segmentado** de 44 px (activo en
  neutro invertido, `role="radio"`) con la cuenta debajo → Subtotal, Descuento **plegado** («Agregar»), Total
  700 · 20 → «Recibido en efectivo» (`MoneyInput` tamaño `lg`, 600 · 18) con **montos rápidos** → «Cambio a
  devolver» sobre `--bg-muted` (o «Falta para completar» en peligro) → «Cobrar $ X» de bloque → «Enter no cobra: el
  cobro se confirma con el botón.»
- **Montos rápidos** (`features/sales/quickCash.ts`, función pura con tests): «Exacto» y dos montos estrictamente
  mayores que lo que se cobra. Hasta 100 mil, el billete que lo cubre y el siguiente (23.000 → 50.000 y 100.000);
  desde 100 mil, redondeo a 100 mil y a 500 mil (1.155.000 → 1.200.000 y 1.500.000). El que coincide con lo
  recibido se marca con `--brand-50` y borde de marca.
- **Cierre**: al cobrar no se vuelve a la lista; una tarjeta con el chequeo sobre `--success-soft` dice «Venta #N
  registrada», el cambio entregado y el cliente, con «Imprimir comprobante» (el `PrintLayout` de
  `SaleReceiptDialog`) y «Nueva venta». Escanear otro artículo ya empieza la venta siguiente.
- **Confirmación con resumen antes de cobrar**: sigue activa, detrás de la constante `CONFIRM_BEFORE_CHARGE` de
  `SaleFormPage` (el dueño aún no decide si se queda). Apagarla es cambiar esa línea.
- Sin título visible: la pantalla es el mostrador (queda un `h1` solo para el lector de pantalla).
- **`cn` y los tamaños propios**: `lib/utils.ts` le enseña a tailwind-merge los tamaños de texto de `globals.css`
  (15, botón chico y grande, titular…). Sin eso los tomaba por un color y, junto a un color real, borraba uno de los
  dos. Un tamaño nuevo en `globals.css` se agrega también ahí.

## 3. Componentes compartidos (`components/shared`)

Construidos una vez sobre shadcn/ui + tokens; las features los componen. Si una feature necesita una variante, se
agrega como prop al compartido, no se clona. **Un solo modal, un solo calendario, una sola tabla.**

| Componente | Qué es y sus reglas |
|---|---|
| `AppShell` | sidebar (tokens `--sidebar-*`) + topbar (menú en celular, tema, avatar con «Mi perfil» y «Cerrar sesión») + `CashSessionBanner` + contenido + `AppFooter`. Menú: Inicio, Contratos, Ventas, Inventario, Clientes, Caja, Cuentas, Capital, Catálogos, Identidad, Reportes, Auditoría, Configuración; **cada ítem con su `anyPermission`** (ARQUITECTURA §5). Sin buscador en el topbar: uno que no busca comunica "a medio hacer" |
| `AppFooter` | pie de una línea: copyright, nombre legal y NIT de la empresa si existen, teléfono o el lema. Nada inventado (sin enlaces a páginas que no existen) |
| `PageHeader` | título + descripción + acciones a la derecha (un solo primario). Toda página lo usa. El título va en Archivo 600 · 24/28 (rediseño P1). Envuelve a 360 px |
| `BackLink` | el «Volver» único de los detalles y formularios de página completa |
| `KpiCard` / `KpiRow` | etiqueta pequeña + cifra grande tabular **en color de texto**, divisores. El único tono es `danger`, y significa **«pide acción»** (lo vencido, los cierres descuadrados), nunca «es una salida de plata»: ni verde ni oro ni rojo para una cifra que solo informa (F9-07). Una tarjeta, sin sombra. Una columna bajo 480 px, dos hasta 640, tres después; en una sola fila con divisores desde 1024 px si son hasta 4 tarjetas y desde 1536 si son más (el Inicio tiene 6). **La cifra nunca se parte dentro de un número**: que quepa lo resuelve el número de columnas, no un corte de palabra (medido en Chrome de 360 a 1920 px). `delta` opcional («▲ N % vs período anterior»): **`favorable` decide el color, no el signo** (bajar gastos también es verde) |
| `DataTable` | sobre TanStack Table: hover de fila, dinero a la derecha, estados de carga/vacío/error integrados, «Cargar más» por cursor, **tarjetas en celular**. Con `onRowClick`, la fila entra al orden de Tab y se abre con Enter o Espacio (F9-11) |
| `TableSkeleton` / `RefreshingBar` / `RouteTransitionBar` | carga con la forma del contenido (una barra gris se lee como "no hay nada"); barra delgada cuando una lista *ya* tiene datos y está pidiendo otros (`isPending` solo cubre la primera carga); barra fija mientras el router resuelve una navegación (el `beforeLoad` espera `/me` y la pantalla anterior se quedaba quieta) |
| `AppDialog` | **el** modal (§1): tamaños `sm` `md` `lg` `xl`, sobre Radix (foco atrapado, Escape, scroll bloqueado); limita la altura al viewport y hace scroll adentro. `confirmDiscard` (con `formState.isDirty`): Escape, clic afuera o la X preguntan antes de descartar lo escrito (F9-40); Cancelar no pregunta. **Prohibido crear otro modal** |
| `ConfirmDialog` / `confirm()` | confirmación imperativa (`await confirm({ title, tone: 'danger' })`) para acciones destructivas o de dinero; `requireReason` exige motivo (anular, reabrir, descuadre). `summary` pinta un resumen renglón por renglón: una confirmación de dinero repite a quién, cuánto, cómo y a dónde (el abono: contrato, cliente, qué paga, total, medio y cuenta; F9-18). Es la pieza «Confirmación con resumen» de la propuesta (`ConfirmSummary`): renglones con divisor dentro de un recuadro de radio 10, `emphasis: 'total'` para el monto (va **último**, en negrita sobre `--brand-50`) y `emphasis: 'after'` para cómo queda (en verde). El botón de confirmar es de bloque, con el monto adentro; con `tone: 'danger'` va en el relleno rojo. La usan préstamo, abono, venta, gasto y traslado, con título en pregunta y «Volver». Se monta una vez (`ConfirmDialogHost`) |
| `DatePicker` / `DateRangePicker` | **el** calendario: español, semana desde el lunes, `dd/MM/yyyy`, "hoy" = `todayBogota()`, presets (Hoy, Ayer, Esta semana, Este mes) |
| `Money` / `MoneyInput` | nadie formatea ni captura dinero fuera de estos dos (reglas de `MoneyInput`: ARQUITECTURA §7). `MoneyInput` tiene tamaño `lg` (cifra 600 · 18) para lo recibido en el POS |
| `StatusBadge` | pastilla de estado con el **único** mapa estado → tono + ícono Lucide + etiqueta en español: 24 px, 600 · 12, ícono de 13, fondo `-soft` de su semántico (o `--neutral-soft`) y «Listo para remate» como **único estado relleno** (`--danger-solid`). Orden de urgencia en `CONTRACT_STATUS_URGENCY`. Un cliente pasa `kind="customer"`: su «active» dice **«Activo»**, no «Vigente» (F9-42). Un reintento de correo es ámbar; rojo solo lo que se perdió. Las clases van completas y estáticas, nunca interpoladas (ARQUITECTURA §16) |
| `FilterChip` | la pestaña de filtro en pastilla (estado de contratos e inventario, módulo y antigüedad de Reportes, tipo de plantilla). La activa va en **neutro invertido** con `aria-pressed`, nunca en el oro del primario (F9-13); la inactiva, con el borde de controles |
| `LegacyCodeBadge` | pastilla neutra con el código del sistema anterior de un contrato importado. No es un estado |
| `RecordNumber` | el número de un documento (`#123`) con el `#` atenuado y el número en cifras tabulares |
| `Callout` | recuadro de ayuda: explica algo que el usuario no sabe y trae la acción para resolverlo. Tonos `info` `success` `warning` sobre el `-soft`; **el texto en el color normal y solo el ícono en el semántico** (un párrafo entero en color de advertencia se lee peor) |
| `EmptyState` | ícono suave + título + descripción + CTA («Aún no tienes…»). Toda lista vacía lo usa |
| `CashSessionBanner` | franja global de 44 px: caja abierta (responsable, hora, y la fecha si el turno es de otro día) o cerrada (qué no se puede hacer + «Abrir caja» si hay permiso, botón secundario con área táctil de 44, F9-02). Texto en tinta con el estado en negrita y un punto de color como señal. Sin `cashbox.view` **no afirma nada** (§4, regla 8) |
| `CashClosedNotice` | aviso arriba de una operación de dinero **en efectivo** con la caja cerrada, con «Abrir caja» si hay permiso (F9-19). Avisa antes de llenar, no bloquea: por banco se sigue operando sin caja. Con `anyMethod` avisa con cualquier medio: el gasto exige la caja abierta aunque se pague por transferencia. Sin saber el estado, no afirma nada |
| `CashSessionRequiredDialog` | la respuesta a `CASH_SESSION_NOT_OPEN`: abrir caja desde ahí o a quién pedírselo |
| `AccountPicker` | la cuenta donde queda la plata, junto al medio de pago (ARQUITECTURA §7); oculto sin `accounts.view`. Preselecciona la predeterminada del tipo por `onAutoSelect`, que en un formulario de React Hook Form es `resetField` con `defaultValue`: una preselección no ensucia el formulario ni dispara «¿Descartar lo escrito?» |
| `CustomerPicker` / `ItemPicker` / `SearchInput` | elegir cliente (con «Consumidor final» en ventas), agregar artículos de a uno, búsqueda con debounce de 300 ms contra `?q=`. `SearchInput` lleva `ariaLabel` (sin él, el placeholder hace de nombre); `ref`, `size="lg"`, `icon` y `trailing` existen para el escáner. `ItemPicker variant="scanner"` es el escáner del POS (§2, «Punto de venta») |
| `PhotoUploader` / `PhotoThumbnail` | subir (comprimido a WebP, bucket privado, URL firmada, varias fotos con orden) y mostrar una foto guardada. El borrado ocurre al guardar (ARQUITECTURA §15) |
| `PrintLayout` / `PrintBlocks` | documento imprimible en hoja carta con membrete de la empresa, montado en un portal para que al imprimir salga solo el documento. **Solo tokens `--paper-*`.** Las piezas: sección, campo, tabla, tabla de prendas, firma (espacio fijo, con o sin imagen). Un documento nuevo se arma con estas piezas. `CompanyDataNotice` avisa junto al botón de imprimir si faltan datos de la empresa |
| `SaleReceiptDialog`, `ReturnFormDialog`, `EntryDetailDialog` | comprobante de venta, devolución y detalle de una compra: compartidos porque se abren desde más de un módulo |
| `charts/` | `DonutChart`, `ContractsStatusChart`, `DailyTrendChart`: colores de `--chart-*` y `--status-*`, nunca inline (§5) |
| `documentTemplate/` | el editor de plantillas (Tiptap), cargado aparte (ARQUITECTURA §14) |

## 4. Protocolos de UX

1. **Una acción primaria** por pantalla o modal (oro, rectángulo de radio 10, o de bloque a todo el ancho); los
   filtros activos van en neutro; el resto secundarias o terciarias. **El
   CTA de dinero lleva el monto dentro** («Vender $419.170», «Registrar abono $50.000»).
2. **Dinero guiado, nunca libre.** Los abonos son botones generados desde `payment-options` (1 mes, 2 meses, al día
   + capital); el único campo libre es el capital extra cuando se permite. En el cierre de caja, lo esperado se ve,
   lo contado se digita, la diferencia se calcula al instante y, si no es cero, la justificación aparece y bloquea
   el envío. Ampliar un préstamo **explica cuándo no se puede** en vez de desaparecer, y bloqueado muestra el motivo
   en lugar de la cifra del cupo: una cifra de plata que no se puede usar no va en grande (F9-17). Un contrato en mora
   o en prórroga abre con un titular de estado (desde cuándo, cuánto debe, cuánto salda hoy), no solo con la pastilla
   (F9-16).
3. **Respuesta inmediata**: botón en carga y deshabilitado mientras la mutación vuela; éxito con acción contextual
   o error mapeado (ARQUITECTURA §6). Nunca doble envío. **Enter no registra dinero** (ARQUITECTURA §12).
4. **Destructivo = fricción**: el botón en la pantalla va con **contorno rojo** (variante `destructive` de `Button`)
   y el relleno rojo (variante `danger-solid`) solo dentro de la confirmación. Anular, rematar, reabrir, desactivar →
   `ConfirmDialog` con la consecuencia dicha y
   motivo obligatorio cuando el backend lo audita.
5. **Esqueletos, no spinners de página**: cada card o tabla carga con la forma de su contenido. El shell no parpadea.
6. **Formularios**: label arriba, error bajo el campo, **llevar a la vista el primer error** (`revealFirstError`);
   un 422 nunca queda invisible (`applyServerErrors`).
7. **Tablas operativas**: fila entera abre el detalle, filtros como chips arriba (en la URL cuando se pueden
   compartir), búsqueda a la izquierda, primario a la derecha del `PageHeader`.
8. **Un 403 no es una falla.** Nunca "no se pudo cargar" cuando falta un permiso: si la pantalla afirma un estado y
   no lo puede saber, no muestra nada; si es una lista, dice qué falta y a quién pedirlo, sin «Reintentar»; si el
   elemento es opcional, se oculta y la operación sigue (ARQUITECTURA §5).
9. **Idioma y formatos**: todo en español de Colombia; números `es-CO` (puntos de miles, **coma decimal**, que
   también se acepta al escribir); fechas `dd/MM/yyyy` en la zona de la empresa; sin jerga técnica en los errores.
10. **Accesibilidad (WCAG 2.1 AA)**: texto ≥ 4.5:1 — el texto de marca sobre claro va en el color `brand`, nunca en
    `primary` (§1). **Medido, no supuesto**: `tests/token-contrast.test.ts` calcula los ratios de los tokens de
    texto sobre los fondos donde viven, el texto del botón primario sobre sus dos rellenos y los pares de la landing,
    en los dos temas; se comprobó que falla al invertir la regla. Navegable por teclado, `aria-label` en íconos
    solos, objetivos táctiles de 44 px en celular.
    **Foco de un campo**: anillo sólido de 2 px en el token de foco (`--focus`, expuesto como `--color-ring`), puesto una vez en `globals.css`
    para todos los `input`/`textarea`/`select` (por sombra, porque las copias de `inputClass` que quedan llevan la
    utilidad que quita el contorno); un campo compuesto marca su contenedor con `data-focus-ring`. **Foco de un
    control** (botón, select de Radix, pestaña, casilla, día del calendario, fila de tabla): el anillo o contorno en
    el token de foco **sólido**, nunca con sufijo de opacidad: a media opacidad daba ≈ 2,2:1, bajo el 3:1 de WCAG
    1.4.11 (issue #4). `tests/token-contrast.test.ts` mide el token contra los tres fondos en los dos temas y falla si
    reaparece la opacidad. **Campo con error**: `invalid` pone `aria-invalid` (borde de peligro) y
    `aria-describedby` al mensaje, que va en `FieldError` con el mismo `id`: el lector de pantalla dice «inválido» y
    por qué. `MoneyInput` hace lo mismo con su `id`, y con `ref={field.ref}` el foco llega al primer error (F9-25,
    F9-26).
    **Campo de texto: `Input` / `Textarea` / `FieldError`** (`components/ui/input.tsx`). `id` obligatorio (el que
    nombra el `label` y enlaza el error). Migrados: nuevo contrato y sus prendas, venta, gasto, cliente e ingreso de
    inventario. Quedan 21 copias locales de `inputClass` en diálogos de configuración, caja, cuentas y plataforma:
    se migran al tocarlos, no se agregan nuevas.
11. **Responsive real**: 360 / 768 / 1024 / 1280. La operación diaria (abonos, ventas, consultar un contrato) tiene
    que servir en un celular de gama media: el mostrador puede ser un celular. Al medir, **el bug es que el
    documento desborde** (`scrollWidth > clientWidth` del `<html>`); un elemento más ancho que la ventana dentro de
    un contenedor con scroll horizontal (una tabla de desglose, unas pestañas) es el patrón correcto.
12. **Dos puertas cuando el permiso las separa**: «Nuevo contrato» (desembolsa, CTA con el monto) y «Registrar
    contrato existente» (importa sin desembolso, `contracts.import`) son primarias distintas, no un interruptor
    dentro del mismo formulario. Sin el permiso, la segunda no existe, ni deshabilitada.

## 5. Gráficas y reportes

Recharts con wrappers propios en `components/shared/charts/`, que leen los colores de `--chart-*` y `--status-*`.
Tooltips con `formatCOP`, grid horizontal sutil, sin puntos fijos por dato (con rangos largos convierten la línea en
un collar: basta el punto activo al pasar el mouse), eje de fechas en `dd/MM` (el año ya está en el selector).

- **Inicio** (`/inicio`, `GET /reports/dashboard`): fila de KPIs (cartera, ventas, contratos activos, inventario,
  caja), contratos por estado y la lista de **listos para remate**, que es la alerta operativa más valiosa.
- **Inicio sin `reports.view`** (Asesor, Bodega): accesos directos a lo que el rol sí puede hacer, cada uno con el
  permiso de su ruta (`dashboard/components/QuickActions`, F9-60); antes era una pantalla vacía. El texto de cada
  acceso dice lo que el rol puede hacer ahí: «Caja» ofrece abrirla solo con `cashbox.open_close`.
- **Reportes** (`/reportes`) tiene dos pestañas porque responden cosas distintas: **Período** resume un rango
  (selector de fechas con tope de 90 días, `MAX_RANGE_DAYS`) y **Contabilidad** es una foto de hoy (qué se debe,
  qué se tiene). Reglas que no se negocian:
  - **El movimiento de capital no es resultado**: prestar no es un gasto y recuperar no es un ingreso. Desembolsos
    y capital recuperado van en su propia card, rotulada, fuera de la utilidad.
  - **Una sola definición por concepto**, la del backend (estado de resultados, `backend-starter/docs/DOMINIO.md`
    §8): el front no recalcula la utilidad, la muestra.
  - Filtro Todo / Empeño / Tienda para toda la pantalla, sin pedir nada nuevo al backend; la comparación con el
    período anterior de igual duración con `delta` por KPI.
  - Lo que no depende del rango (la cartera de hoy, los rankings del histórico completo) lo dice en su rótulo.
- **Una sección que falla no desaparece** (F9-47): queda su título, el error y «Reintentar»
  (`reports/components/SectionError`); un reporte al que le falta la utilidad sin decirlo parece completo. Un 403 la
  oculta, como siempre.
- Exportar a Excel sale de los mismos datos que se ven (`lib/export/xlsx.ts`).

## 6. Theming en la práctica

1. shadcn/ui apunta sus variables a los tokens: un solo mapeo en `globals.css`, ningún componente generado tocado.
2. Tailwind expone los tokens como colores, radios y sombras semánticos.
3. Un hex, un radio arbitrario o un color de Tailwind de paleta fija en `features/` o `components/shared/` es un
   bug de revisión.
4. Otro color de marca = editar el bloque de marca de `tokens.css` (claro y oscuro) y correr el test de contraste.
   Marca por empresa en runtime sería inyectar esas variables al cargar la empresa: posible, no construido.

## 7. La landing pública (`/`)

La única superficie que no es un panel: la página de venta de Prendo (`src/features/landing/`). **Es Prendo, no la
empresa** (§1). Mismas reglas del resto: todo sale de tokens.

- **Tipografía**: titulares en `--font-display` con `--tracking-display` sobre la escala fluida; códigos de
  etiqueta en `--font-mono` y nada más en mono; el cuerpo en `--font-sans`.
- **Superficies**: las secciones oscuras (hero, «Para quién», CTA final) usan `--sidebar-*`, que siguen oscuros en
  los dos temas; con `--bg-*` el hero se volvía claro en el tema claro.
- **Contraste medido**: el oro como texto sobre carbón es `--brand-500` (6.24 claro, 9.10 oscuro; `--brand-600`
  daba 4.77); el «bien» sobre carbón es `--sidebar-success` (7.69). Los numerales grandes «01 / 02 / 03» en oro sobre
  marfil dan 2.42: son **ornamento**, van con `aria-hidden` y nunca llevan información.
- **Movimiento** (`landing.css`, sin tokens nuevos; los retrasos se derivan de las tres duraciones):
  1. **Estado final por defecto**: lo que empieza escondido solo lo está cuando `useInView` confirma que hay
     IntersectionObserver y no se pide movimiento reducido.
  2. Cada sección entra **una vez**.
  3. La cadena de siete pasos se dibuja **en tramos**, uno detrás de otro: con una sola línea en `--ease-out`, que
     hace casi todo el recorrido al principio, cinco pasos se encendían en 200 ms.
  4. El parallax del hero lo escribe `requestAnimationFrame` en variables CSS: sin re-render de React por frame.
  5. Con movimiento reducido, además de las duraciones se anulan los **retrasos** (un elemento con 1,9 s de delay
     quedaba invisible 1,9 s y después saltaba).
  6. El hover que sube una tarjeta va solo bajo `(hover: hover)`: en un celular, un toque la dejaba levantada.
