# Sistema de diseño — basado en la referencia visual aprobada, 100% centralizado

> Referencia visual y de componentes. La regla de oro: **ningún valor de diseño vive en una feature** — todo sale de `src/styles/tokens.css` y de los componentes de `components/shared`. Cambiar la marca completa (colores, radios, tipografía) = editar UN archivo. Reglas de arquitectura en `CLAUDE.md` §4.

## 1. Referencia visual (capturas aprobadas por el cliente)

El cliente aprobó como referencia de UI/UX las capturas de un software administrativo comercial (dashboard, POS, modales, mobile). **La marca propia aún no existe** (decidido 15/08/2026): la paleta teal de §2 es un placeholder derivado de esa referencia y muy probablemente el resultado final será similar — pero TODO el color vive en tokens para que el rebranding, cuando la marca se defina, sea editar un archivo.

Lo que define el look y hay que replicar:

- **Shell:** sidebar blanca fija a la izquierda (íconos + texto, item activo con fondo teal suave y texto teal), topbar blanca con buscador global centrado, ayuda/notificaciones/apps y avatar del usuario a la derecha. Fondo general gris muy claro (`#F5F7FA` aprox), contenido en **cards blancas** con borde sutil y radio generoso.
- **Dashboard:** fila superior de **KPIs** separados por divisores (etiqueta pequeña gris + cifra grande — cifras en color según semántica: rojo cuentas por cobrar, teal ventas), debajo cards de gráficas: área/línea de ingresos vs gastos con toggle de pestañas ("Causado/Pagado" → nuestro equivalente: Empeño/Tienda), barras apiladas, dona de mejores clientes con leyenda.
- **Formularios y POS:** panel "Factura de venta" — selects arriba (lista de precio, numeración), cliente con botón "+ Nuevo" al lado, líneas con stepper − 1 +, resumen Subtotal/Descuento/IVA, **CTA grande de ancho completo teal con el total dentro del botón** ("Vender $419.170").
- **Modales:** centrados, blanco, radio grande (~24px), X arriba a la derecha, título grande centrado, subtítulo gris, campos con label arriba y bordes redondeados suaves, **botón primario tipo pastilla (pill) teal centrado**. TODOS los modales de la app siguen exactamente este patrón (requisito explícito).
- **Vacíos/onboarding:** cards con ilustración/ícono suave, texto "Aún no tienes…", CTA teal directo. Checklists de bienvenida con pasos.
- **Mobile:** sidebar → drawer; KPIs apilados; tablas → cards; CTAs de ancho completo.

## 2. Tokens (`src/styles/tokens.css`) — única fuente de verdad

CSS variables consumidas por Tailwind (`@theme` en Tailwind v4). Las features usan clases semánticas (`bg-primary`, `text-danger`, `rounded-card`) — nunca el hex.

```css
:root {
  /* ==== Marca (cambiar estas 6 líneas re-marca toda la app) ==== */
  --brand-50:  #E6F7F5;   /* fondos suaves, item activo de sidebar, chips */
  --brand-100: #C2EDE7;
  --brand-500: #00B19E;   /* primario: botones, links, item activo, series "ingresos" */
  --brand-600: #009C8B;   /* hover del primario */
  --brand-700: #00806F;   /* pressed / focos */
  --brand-contrast: #FFFFFF;

  /* ==== Semánticos ==== */
  --success: #22A06B;  --success-soft: #E6F6EF;
  --warning: #E8A23D;  --warning-soft: #FCF3E3;
  --danger:  #E5484D;  --danger-soft:  #FDEBEC;   /* gastos, cuentas por cobrar, anulaciones, mora */
  --info:    #3B82F6;  --info-soft:    #EAF2FE;

  /* ==== Neutrales (superficies y texto) ==== */
  --bg-app: #F5F7FA;          /* fondo general */
  --bg-surface: #FFFFFF;      /* cards, sidebar, topbar, modales */
  --border: #E5EAF0;          /* bordes de cards, inputs, divisores */
  --text-strong: #1E2A3B;     /* títulos, cifras */
  --text-body: #44546A;
  --text-muted: #8A97A8;      /* labels de KPI, hints, placeholders */

  /* ==== Estados de dominio (badges) ==== */
  --status-active: var(--success);        /* Vigente / disponible / activa */
  --status-arrears: var(--warning);       /* En mora / borrador */
  --status-extension: #D97706;            /* Prórroga */
  --status-auctioned: var(--danger);      /* Rematado / anulada / vencida */
  --status-paid: var(--info);             /* Pagado / vendido */
  --status-neutral: var(--text-muted);    /* invitado, inactivo, written_off */

  /* ==== Gráficas (Recharts lee de aquí, ver §5) ==== */
  --chart-1: var(--brand-500);  /* serie principal / ingresos */
  --chart-2: var(--danger);     /* gastos / egresos */
  --chart-3: #0E7490; --chart-4: #67C7BC; --chart-5: #A7B3C2; /* series secundarias, dona */

  /* ==== Forma ==== */
  --radius-input: 10px;  --radius-card: 14px;  --radius-modal: 24px;  --radius-pill: 9999px;
  --shadow-card: 0 1px 3px rgb(30 42 59 / .06);
  --shadow-modal: 0 20px 50px rgb(30 42 59 / .18);

  /* ==== Movimiento ==== */
  --ease-out: cubic-bezier(.16, 1, .3, 1);   /* salida rápida, entrada suave */
  --duration-fast: 120ms;   /* hover, focus, press — debe sentirse instantáneo */
  --duration-base: 200ms;   /* aparición de cards, tabs, chips */
  --duration-slow: 320ms;   /* modales, drawers, lo que ocupa la pantalla */

  /* ==== Tipografía y espaciado ==== */
  --font-sans: "Inter", system-ui, sans-serif;   /* cifras de KPI con font-feature "tnum" */
  --space-page: 24px;  --space-card: 20px;
}
```

**El movimiento también es un token.** Sin estas cuatro líneas cada pantalla inventaba su propia duración y la app se sentía hecha por manos distintas. Tres duraciones y una sola curva — si algo pide una cuarta, casi siempre es que está animando de más.

Utilidad `enter-up` (definida en `globals.css`): el contenido cargado sube unos píxeles mientras aparece, en vez de saltar. Se aplica **al contenedor, no a cada hijo** — animar veinte filas por separado convierte una lista en un espectáculo y retrasa la lectura.

Dark mode: no es requisito, pero la estructura ya lo permite (`[data-theme=dark]` redefine las mismas variables). No invertir esfuerzo ahora; no romper el mecanismo tampoco (por eso: nunca hex sueltos). **Hoy el bloque `[data-theme='dark']` está vacío y no hay toggle** — verificarlo antes de "arreglar" cualquier cosa que solo se rompa en oscuro.

### `prefers-reduced-motion`

Se respeta **una sola vez y para toda la app**, en `globals.css`: confiar en que cada pantalla nueva se acuerde de `motion-reduce` garantiza que tarde o temprano alguna se olvide. La regla **no anula** las animaciones, las reduce a un salto instantáneo — poner `animation: none` rompería las que dependen de su estado final (los diálogos de Radix quedarían invisibles, porque su estado de entrada es opacidad 0).

**Excepción: Recharts.** Anima desde JavaScript interpolando valores, así que ninguna regla de CSS lo alcanza. Los wrappers de `charts/` preguntan la preferencia con `usePrefersReducedMotion()` y pasan `isAnimationActive={!prefersReducedMotion}`. Cualquier gráfica nueva debe hacer lo mismo.

## 3. Inventario de componentes compartidos (`components/shared`)

Construidos UNA vez sobre shadcn/ui + tokens; las features solo los componen. Si una feature necesita una variante, se agrega como prop/variante al compartido — no se clona.

| Componente | Qué es / reglas |
|---|---|
| `AppShell` | Sidebar (blanca, colapsable a íconos; en mobile drawer con overlay) + topbar (buscador global — hoy `disabled`, es un placeholder visual de la referencia, ninguna búsqueda unificada real todavía, ver RECOMENDACIONES §3; avatar con menú: hoy solo "Cerrar sesión" — "perfil"/"cambiar contraseña" siguen pendientes de `PATCH /me`, ver PENDIENTES_BACKEND_INFRA.md punto 15) + `CashSessionBanner` + contenido con `--space-page`. Orden real del menú (`AppShell.tsx`): Inicio, Contratos, Ventas, Inventario, Clientes, Caja, Catálogos, Identidad (usuarios + roles en una sola pantalla, filtrada por `identity.manage_users`/`identity.manage_roles`), Reportes, Auditoría, Configuración. **Solo "Configuración" se muestra sin `to:` (deshabilitado a propósito)** — bloqueado del lado del backend (RECOMENDACIONES §1 punto 5), visible para no esconder que existe pero sin ruta real todavía; "Reportes" sí tiene ruta (`/reportes`, construido — ver §5 y `docs/IMPLEMENTATION.md`). El resto de ítems se filtra por permiso. |
| `PageHeader` | Título + breadcrumb + acciones a la derecha (botón primario único). Toda página lo usa — consistencia de jerarquía. |
| `KpiCard` / `KpiRow` | Fila de KPIs del dashboard según la referencia (§1): label pequeña `--text-muted` + cifra grande `tnum`, color semántico opcional, divisores verticales, responsive a grid 2×N en mobile. `KpiCard` acepta un `delta?` opcional (`{pct, favorable}`) que agrega una segunda línea pequeña "▲/▼ N% vs período anterior" en verde/rojo — usado en Reportes (§5), la dirección "favorable" se decide por KPI (subir ingresos es verde, subir gastos es rojo), nunca se asume. |
| `DataTable` | Sobre TanStack Table: encabezado gris claro, hover de fila, celdas de dinero alineadas a la derecha con `formatCOP`, columna de acciones con menú `⋯`, estados loading (skeleton de filas)/vacío/error integrados, paginación por cursor ("Cargar más"). En mobile colapsa a cards (render alterno por fila). |
| `AppDialog` | EL modal (patrón de la referencia, §1): centrado, `--radius-modal`, X arriba derecha, título grande centrado, subtítulo, footer con primario pill centrado (o par cancelar/confirmar). Tamaños `sm/md/lg`. Sobre Radix Dialog: focus trap, ESC, scroll lock, accesible. **Prohibido crear otro modal**: todo diálogo de la app es `AppDialog`. |
| `ConfirmDialog` / `confirm()` | Confirmación imperativa (`await confirm({title, tone:'danger'})`) para acciones destructivas o de dinero (anular venta, rematar, reabrir caja). Variante `danger` usa `--danger`. Acciones que exigen motivo: prop `requireReason` con textarea obligatoria (anular, reabrir, descuadre, descuento). |
| `DatePicker` / `DateRangePicker` | EL calendario único (react-day-picker vía shadcn): locale `es`, semana inicia lunes, formato `dd/MM/yyyy`, "hoy" = `todayBogota()`, presets en rangos (Hoy, Ayer, Esta semana, Este mes). Cualquier fecha de la app se elige con este componente. |
| `Money` / `MoneyInput` | `Money` renderiza con `formatCOP` (+ variante coloreada in/out para movimientos). `MoneyInput` enmascara puntos de miles al escribir, `inputmode="numeric"`, emite string decimal para la API. Nadie formatea dinero fuera de estos dos. |
| `StatusBadge` | Pill de estado con mapa central estado→token→etiqueta ES: `active→Vigente`, `in_arrears→En mora`, `in_extension→Prórroga`, `auctioned→Rematado`, `paid→Pagado`, `draft→Borrador`, `available→Disponible`, `sold→Vendido`, `written_off→Dado de baja`, `invited→Invitado`, `open→Abierta`, `closed→Cerrada`, `in_custody→En custodia`… Único lugar donde se traducen estados de la API. |
| `LegacyCodeBadge` | Pill neutra (tono `status-neutral`, no un estado semántico) con el `legacy_code` de un contrato importado (RECOMENDACIONES §1.6) — ej. `C-1042`. En la fila de la lista de contratos y junto al número en el encabezado del detalle, SOLO si el contrato lo tiene. No confundir con `StatusBadge`: esto no es un estado, es una referencia externa fija. |
| `EmptyState` | Ícono suave + título + descripción + CTA (patrón "Aún no tienes…" de la referencia). Toda lista vacía lo usa. |
| `PhotoUploader` | Comprime client-side, sube a Storage (bucket privado, path con `company_id`), preview con URL firmada, multi-foto con orden. Usado por prendas, artículos, cédulas, contrato firmado, comprobantes de gasto. |
| `CashSessionBanner` | Franja global bajo la topbar: caja abierta (verde suave: responsable + hora de apertura + link al cierre) o cerrada (ámbar: "Caja cerrada — no se pueden registrar operaciones de dinero" + CTA abrir si tiene permiso). El estado de caja es contexto operativo permanente. |
| `Can` | `<Can permission="sales.void">…</Can>` — envuelve toda acción sensible. |
| `SearchInput` | Búsqueda con debounce (300ms) conectada a `?q=` de la API. |
| `PrintLayout` | Layout imprimible (print CSS) para contrato y acta de cierre mientras el backend no genera PDFs: hoja carta, encabezado con logo de la empresa, tipografía serif legible, `@media print` oculta el shell. |
| `charts/DonutChart` | Dona (Recharts `PieChart` + `innerRadius`) con leyenda lateral (% + monto). Colores `--chart-3/4/5` + `--brand-500`/`--text-muted` si hay más de 3 segmentos — nunca hex. Dos consumidores en Reportes (§5): gastos por categoría, medio de pago. Hermano de `charts/ContractsStatusChart` (dashboard) y `charts/DailyTrendChart` (área con degradado, Reportes) — mismo criterio de tokens los tres. |

## 4. Protocolos de UX (aplicar siempre)

1. **Jerarquía de acción:** UNA acción primaria (teal, pill o bloque) por pantalla/modal; el resto secundarias (outline) o terciarias (ghost). El CTA de dinero muestra el monto dentro del botón ("Vender $419.170", "Registrar abono $50.000").
2. **Dinero guiado, nunca libre:** abonos = botones generados desde `payment-options` (1 mes $X · 2 meses $Y · Al día + capital); el único campo libre es capital extra cuando `allows_capital`. Cierre de caja: `expected_cash` visible, `counted_cash` se digita, la diferencia se calcula y muestra al instante; si ≠ 0, el campo justificación aparece y bloquea el submit hasta llenarse.
3. **Feedback inmediato:** toda mutación → botón en loading (spinner + disabled) → toast de éxito con acción contextual ("Abono registrado — Ver recibo") o error mapeado (§6 de ARCHITECTURE). Nunca doble submit posible.
4. **Destructivo = fricción:** anular, rematar, reabrir, desactivar → `ConfirmDialog` con consecuencia explícita ("El cliente pierde las prendas; se crearán artículos de inventario") y motivo obligatorio cuando el backend lo audita.
5. **Skeletons, no spinners de página:** cada card/tabla carga su propio skeleton con la forma del contenido real. El shell nunca parpadea.
6. **Formularios:** label arriba, ayuda debajo, error bajo el campo en `--danger`; foco al primer error; `Cmd/Ctrl+Enter` envía en modales; borradores largos (contrato, ingreso multi-línea) avisan antes de descartar cambios.
7. **Tablas operativas:** fila entera clickeable al detalle, acciones en menú `⋯`, filtros como chips encima (estado, fechas con presets), búsqueda a la izquierda, botón primario a la derecha del `PageHeader`.
8. **Accesibilidad (WCAG 2.1 AA):** contraste ≥4.5:1 (verificar teal sobre blanco en textos — usar `--brand-600`+ para texto sobre claro), navegable 100% por teclado (Radix ayuda), `aria-label` en íconos solos, tamaños táctiles ≥44px en mobile.
9. **Idioma y formatos:** todo en español; números SIEMPRE `es-CO` (puntos de miles, coma decimal); fechas `dd/MM/yyyy` en Bogotá; sin jerga técnica en errores (traducir `CONFLICT` a "Ya existe un cliente con ese documento").
10. **Responsive real:** breakpoints 360 / 768 / 1024 / 1280. La operación diaria (abonos, ventas, consulta de contrato) debe ser 100% usable en un teléfono de gama media — el mostrador puede ser un celular.
11. **Dos puertas de entrada a un mismo recurso, cuando el permiso las separa:** "+ Nuevo contrato" (crea y desembolsa, CTA con el monto — regla 1) y "Registrar contrato existente" (importa un contrato migrado del sistema anterior, sin desembolso — RECOMENDACIONES §1.6) son acciones primarias DISTINTAS en `PageHeader`, no un toggle dentro del mismo formulario: campos, validaciones y hasta el texto del CTA difieren ("Crear contrato $X" vs. "Registrar"). La segunda es visible solo con `contracts.import` (Admin de fábrica) — si el rol no lo tiene, ese botón no existe, ni siquiera deshabilitado.

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
