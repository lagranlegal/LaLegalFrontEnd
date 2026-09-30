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
  barra de acento; topbar clara con tema, ayuda y avatar; fondo marfil (`--bg-app`) y el contenido en cards blancas
  con borde sutil y radio generoso. Pie de una línea.
- **Modales**: centrados, radio grande, X arriba a la derecha, título grande, campos con label arriba y **botón
  primario tipo pastilla en oro**. Todos los diálogos de la app siguen este patrón.
- **Punto de venta**: CTA grande de ancho completo en oro, texto carbón y **el total dentro del botón** Con efectivo,
  «Efectivo recibido» y el **cambio** en grande (o cuánto falta); es solo cálculo en pantalla, no se envía (F9-32).
- **Celular**: KPIs apilados, tablas que colapsan a tarjetas, CTAs de ancho completo.

## 2. Tokens (`src/styles/tokens.css`) — única fuente de verdad

Los valores viven en `tokens.css`, comentados línea por línea, y **este documento no los copia**: un duplicado ya
derivó una vez (decía un verde que el archivo no tenía), y un sistema con dos verdades es peor que uno con una. Lo
que sigue es el mapa de **roles**. `globals.css` los expone a Tailwind (`@theme inline`) y a shadcn/ui, así que las
features usan colores semánticos y nunca un hex.

| Grupo | Tokens | Para qué |
|---|---|---|
| Marca | `--brand-50` `-100` `-500` `-600` `-700` `--brand-contrast` | `500` es el **relleno** del primario y `--brand-contrast` el texto encima; `700` es la marca **como texto** sobre el fondo del tema (color `brand`); `50`/`100`, fondos suaves, chips y bordes |
| Semánticos | `--success` `--warning` `--danger` `--info` + su `-soft` | estado de una operación. Cada uno cumple AA sobre `--bg-app`, `--bg-surface` **y su propio `-soft`**, el caso más exigente por compartir tono |
| Neutrales | `--bg-app` `--bg-surface` `--bg-muted` `--border` `--text-strong` `--text-body` `--text-muted` | superficies y texto. `--bg-muted` es distinto de `--bg-app` a propósito: si son iguales, un botón con borde y un esqueleto de carga desaparecen sobre el fondo de página |
| Papel | `--paper` `--paper-ink` `-ink-soft` `-muted` `-rule` `-accent` `-accent-ink` `-accent-soft` `-danger` `-danger-soft` | documentos impresos y su vista previa. **No cambian en oscuro**: el papel no tiene tema, y `tests/paper-tokens.test.ts` exige que sean copia exacta de su token claro (si cambia la marca, el test avisa que el papel también) |
| Sidebar | `--sidebar-bg` `-hover` `-active-bg` `-fg` `-fg-strong` `-fg-muted` `-border` `--sidebar-success` | superficie propia, no `--bg-surface`. **Son los únicos tokens que siguen oscuros en los dos temas**, por eso también pintan las secciones oscuras de la landing. `--sidebar-success` es el «bien» sobre carbón (`--success` ahí da 2.4) |
| Estados de dominio | `--status-active` `-arrears` `-extension` `-auctioned` `-paid` `-neutral` | badges; casi todos alias de un semántico, la prórroga con color propio |
| Gráficas | `--chart-1` … `--chart-5` | Recharts lee de aquí. `1` es la serie principal (ingresos), `2` los egresos, `3–5` series secundarias y donas |
| Plataforma | `--platform` `--platform-foreground` | banda del panel super-admin. **Navy frío a propósito**: ningún inquilino la ve, y existe para que no se confunda con la marca |
| Forma | `--radius-input` `-card` `-modal` `-pill` `-panel`, `--shadow-card` `-modal` `-float` `-float-sm` `-lift` | `-float` son sombras densas porque sobre el carbón `-modal` no se ve; `-lift` es el hover que sube una tarjeta |
| Luz de marca | `--brand-halo` `--hero-grid-line` | el oro como luz, no como relleno; solo landing |
| Movimiento | `--ease-out` `--duration-fast` `-base` `-slow` | tres duraciones y una curva. Si algo pide una cuarta, casi siempre está animando de más |
| Tipografía y espacio | `--font-sans` `--font-display` `--font-mono` `--tracking-display` `--font-size-hero` `-closing` `-section` `-subsection` `--space-page` `--space-card` | `--font-sans` es la interfaz, con cifras tabulares en los montos; `--font-display` (Archivo) solo titulares de marca; `--font-mono` (JetBrains Mono) solo códigos de etiqueta, porque deja ver cada carácter. La escala de titulares es fluida entre 390 y 1280 px |

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

## 3. Componentes compartidos (`components/shared`)

Construidos una vez sobre shadcn/ui + tokens; las features los componen. Si una feature necesita una variante, se
agrega como prop al compartido, no se clona. **Un solo modal, un solo calendario, una sola tabla.**

| Componente | Qué es y sus reglas |
|---|---|
| `AppShell` | sidebar (tokens `--sidebar-*`) + topbar (menú en celular, tema, avatar con «Mi perfil» y «Cerrar sesión») + `CashSessionBanner` + contenido + `AppFooter`. Menú: Inicio, Contratos, Ventas, Inventario, Clientes, Caja, Cuentas, Capital, Catálogos, Identidad, Reportes, Auditoría, Configuración; **cada ítem con su `anyPermission`** (ARQUITECTURA §5). Sin buscador en el topbar: uno que no busca comunica "a medio hacer" |
| `AppFooter` | pie de una línea: copyright, nombre legal y NIT de la empresa si existen, teléfono o el lema. Nada inventado (sin enlaces a páginas que no existen) |
| `PageHeader` | título + descripción + acciones a la derecha (un solo primario). Toda página lo usa. Envuelve a 360 px |
| `BackLink` | el «Volver» único de los detalles y formularios de página completa |
| `KpiCard` / `KpiRow` | etiqueta pequeña + cifra grande tabular, color semántico opcional, divisores. Una columna bajo 480 px, dos hasta 640, tres después; en una sola fila con divisores desde 1024 px si son hasta 4 tarjetas y desde 1536 si son más (el Inicio tiene 6). **La cifra nunca se parte dentro de un número**: que quepa lo resuelve el número de columnas, no un corte de palabra (medido en Chrome de 360 a 1920 px). `delta` opcional («▲ N % vs período anterior»): **`favorable` decide el color, no el signo** (bajar gastos también es verde) |
| `DataTable` | sobre TanStack Table: hover de fila, dinero a la derecha, estados de carga/vacío/error integrados, «Cargar más» por cursor, **tarjetas en celular** |
| `TableSkeleton` / `RefreshingBar` / `RouteTransitionBar` | carga con la forma del contenido (una barra gris se lee como "no hay nada"); barra delgada cuando una lista *ya* tiene datos y está pidiendo otros (`isPending` solo cubre la primera carga); barra fija mientras el router resuelve una navegación (el `beforeLoad` espera `/me` y la pantalla anterior se quedaba quieta) |
| `AppDialog` | **el** modal (§1): tamaños `sm` `md` `lg` `xl`, sobre Radix (foco atrapado, Escape, scroll bloqueado); limita la altura al viewport y hace scroll adentro. `confirmDiscard` (con `formState.isDirty`): Escape, clic afuera o la X preguntan antes de descartar lo escrito (F9-40); Cancelar no pregunta. **Prohibido crear otro modal** |
| `ConfirmDialog` / `confirm()` | confirmación imperativa (`await confirm({ title, tone: 'danger' })`) para acciones destructivas o de dinero; `requireReason` exige motivo (anular, reabrir, descuadre). `summary` pinta un resumen renglón por renglón: una confirmación de dinero repite a quién, cuánto, cómo y a dónde (el abono: contrato, cliente, qué paga, total, medio y cuenta; F9-18). Se monta una vez (`ConfirmDialogHost`) |
| `DatePicker` / `DateRangePicker` | **el** calendario: español, semana desde el lunes, `dd/MM/yyyy`, "hoy" = `todayBogota()`, presets (Hoy, Ayer, Esta semana, Este mes) |
| `Money` / `MoneyInput` | nadie formatea ni captura dinero fuera de estos dos (reglas de `MoneyInput`: ARQUITECTURA §7) |
| `StatusBadge` | pastilla de estado con el **único** mapa estado → token → etiqueta en español. Las clases van completas y estáticas, nunca interpoladas (ARQUITECTURA §16) |
| `LegacyCodeBadge` | pastilla neutra con el código del sistema anterior de un contrato importado. No es un estado |
| `RecordNumber` | el número de un documento (`#123`) con el `#` atenuado y el número en cifras tabulares |
| `Callout` | recuadro de ayuda: explica algo que el usuario no sabe y trae la acción para resolverlo. Tonos `info` `success` `warning` sobre el `-soft`; **el texto en el color normal y solo el ícono en el semántico** (un párrafo entero en color de advertencia se lee peor) |
| `EmptyState` | ícono suave + título + descripción + CTA («Aún no tienes…»). Toda lista vacía lo usa |
| `CashSessionBanner` | franja global: caja abierta (responsable, hora, y la fecha si el turno es de otro día) o cerrada (qué no se puede hacer + abrir si hay permiso). Sin `cashbox.view` **no afirma nada** (§4, regla 8) |
| `CashClosedNotice` | aviso arriba de una operación de dinero **en efectivo** con la caja cerrada, con «Abrir caja» si hay permiso (F9-19). Avisa antes de llenar, no bloquea: por banco se sigue operando sin caja. Sin saber el estado, no afirma nada |
| `CashSessionRequiredDialog` | la respuesta a `CASH_SESSION_NOT_OPEN`: abrir caja desde ahí o a quién pedírselo |
| `AccountPicker` | la cuenta donde queda la plata, junto al medio de pago (ARQUITECTURA §7); oculto sin `accounts.view` |
| `CustomerPicker` / `ItemPicker` / `SearchInput` | elegir cliente (con «Consumidor final» en ventas), agregar artículos de a uno, búsqueda con debounce de 300 ms contra `?q=` |
| `PhotoUploader` / `PhotoThumbnail` | subir (comprimido a WebP, bucket privado, URL firmada, varias fotos con orden) y mostrar una foto guardada. El borrado ocurre al guardar (ARQUITECTURA §15) |
| `PrintLayout` / `PrintBlocks` | documento imprimible en hoja carta con membrete de la empresa, montado en un portal para que al imprimir salga solo el documento. **Solo tokens `--paper-*`.** Las piezas: sección, campo, tabla, tabla de prendas, firma (espacio fijo, con o sin imagen). Un documento nuevo se arma con estas piezas. `CompanyDataNotice` avisa junto al botón de imprimir si faltan datos de la empresa |
| `SaleReceiptDialog`, `ReturnFormDialog`, `EntryDetailDialog` | comprobante de venta, devolución y detalle de una compra: compartidos porque se abren desde más de un módulo |
| `charts/` | `DonutChart`, `ContractsStatusChart`, `DailyTrendChart`: colores de `--chart-*` y `--status-*`, nunca inline (§5) |
| `documentTemplate/` | el editor de plantillas (Tiptap), cargado aparte (ARQUITECTURA §14) |

## 4. Protocolos de UX

1. **Una acción primaria** por pantalla o modal (oro, pastilla o bloque); el resto secundarias o terciarias. **El
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
4. **Destructivo = fricción**: anular, rematar, reabrir, desactivar → `ConfirmDialog` con la consecuencia dicha y
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
    **Foco de un campo**: anillo sólido de 2 px en el token de foco (`--color-ring`), puesto una vez en `globals.css`
    para todos los `input`/`textarea`/`select` (por sombra, porque las copias de `inputClass` llevan la utilidad que
    quita el contorno); un campo compuesto marca su contenedor con `data-focus-ring`. **Campo con error**:
    `aria-invalid` (borde de peligro) y `MoneyInput` con `invalid` y `ref={field.ref}` para que el foco llegue al
    primer error (F9-25, F9-26). Pendiente: un `Input` compartido que reemplace las 27 copias de `inputClass`.
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
