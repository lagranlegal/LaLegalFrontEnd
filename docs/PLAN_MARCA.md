# Plan de marca, dominio y correo — Prendo

> **Qué es.** El plan de trabajo desde la identidad hasta el primer correo enviado desde `prendo.com.co`.
> Reemplaza la lista suelta de "lo que falta" de `marca/README.md` y de `ESTADO.md §Marca`.
>
> **Dónde vive y por qué.** Acá y no en `marca/` ni en la raíz: esas dos carpetas **no están versionadas**.
> Mismo criterio que `QA_AUDITORIA.md` (que vive en el backend por la misma razón) y que la versión viva de
> `PENDIENTES_BACKEND_INFRA.md`, que también está en `frontend-starter/docs/` aunque hable de infraestructura.
>
> Abierto el 20/09/2026.
>
> **Estado al 21/09/2026:** ✅ **Fase 1** (marca al código) y ✅ **Fase 2** (kit rehecho y republicado).
> 🟡 **Fase 3 casi cerrada**: la guía quedó re-marcada en oro y están escritas **las partes 1 a 5, la 7 y
> la 8**, todas verificadas contra el código por un QA aparte. **Falta solo la parte 6.**
> Abiertas: **Fase 4** (dominio) y **Fase 5** (correo).
> La tabla de §0 describe el punto de partida, no el estado de hoy.

---

## 0 · Dónde quedamos (al abrir el plan)

La sesión del 12/09 cerró la identidad **en papel** y dejó explícito que aplicarla al código era otra tanda.
Esa tanda nunca se hizo. Hoy, 20/09:

| | Estado |
|---|---|
| Nombre **Prendo** | ✅ Decidido, con alternativas evaluadas y descartadas por escrito |
| Kit de marca (`marca/IDENTIDAD.html`) | ✅ Publicado |
| Guía de usuario (`marca/GUIA_USUARIO.html`) | 🟡 ~30% — faltan las partes 3 a 8 *(al 21/09: falta solo la 6)* |
| Logo | 🔁 **Se rehace** — ver §1 |
| Paleta | 🔁 **Cambia de esmeralda a oro** — ver §2 |
| Marca aplicada al código | ❌ **Cero.** `grep -ri prendo` en `frontend-starter/src` y en `backend-starter/app` da **0 resultados** |
| Dominio `prendo.com.co` | ✅ Comprado (20/09). Sin DNS ni conexión a Vercel todavía |
| Correo propio (SMTP) | ❌ No existe. Hoy sale por el SMTP compartido de Supabase |

**El dato que importa:** la app sigue titulándose `Compraventa`, con favicon morado de starter y paleta teal.
Nada de la identidad tocó el producto.

### Lo que faltó, y por qué faltó

No fue olvido: el 12/09 se decidió a propósito aprobar el kit antes de tocar código.
Lo que sí quedó suelto es que **el kit quedó atado a un color que ahora cambia**, así que hay que rehacer
las tres piezas visuales (logos, paleta del kit, mockups) antes de aplicarlas — no alcanza con copiar el diff
de `tokens.css` que el kit ya trae escrito.

---

## 1 · Logo — qué cambia y por qué

El logo aprobado el 12/09 era **una P cuyo ojo es una argolla**. Es correcto y está bien construido, pero un
monograma no distingue: la P es la letra más usada en logos de producto y no dice nada del oficio.

**Decisión (20/09): concepto A · Etiqueta.** Un rombo de esquinas redondeadas con una perforación.

Por qué éste:

- **Es el objeto que la app produce.** Cada lote sale con una etiqueta impresa (`JOC0007-01I`). El logo es la
  cosa que el empleado tiene en la mano cuarenta veces al día, no una inicial.
- **Segunda lectura: una gema.** En oro, el rombo es la silueta de una piedra vista de frente.
- **Aguanta 16 px.** Es el tamaño del favicon, que es donde mueren los logos. Se probó renderizado, no a ojo.
- **Hereda el radio de las cards** (`--radius-card`), igual que el tile anterior: la marca toma la forma del
  producto.

Descartados en el camino, con el motivo medido:

| Concepto | Por qué no |
|---|---|
| Argolla abierta | Se lee como el ícono de **recargar/refrescar**. Colisión directa con un ícono de sistema |
| Sello octogonal | Se lee como una **tuerca**. Ferretería, no joyería |
| Etiqueta pentagonal colgante | Se lee como una **casa** a tamaño chico |
| Solitario (argolla + piedra) | Bueno, pero a 16 px la piedra se vuelve una mota suelta |

### Construcción

Retícula de 64. Cuadrado de 30×30 con radio 7, centrado y **rotado 45°**. Perforación de radio 4 desplazada
hacia el vértice superior (el agujero del cordón, no el centro geométrico).
Un solo `path` con `fill-rule: evenodd` — la perforación se resta sola. Sin `stroke`: escala sin recalcular
grosores.

### Archivos que reemplaza

Los seis SVG de `marca/logo/` se regeneran con el concepto nuevo y en oro:
`prendo-mark.svg` · `prendo-mark-dark.svg` · `prendo-mark-white.svg` · `prendo-mark-black.svg` ·
`prendo-favicon.svg` · `prendo-lockup.svg`.

El **wordmark no cambia**: sigue en Archivo SemiBold con tracking −0.035em, y la interfaz sigue en Inter.

---

## 2 · Paleta — el problema que traía y cómo queda

La paleta entregada (Oro Moderno) es buena como dirección y **mala como tabla de tokens**: falla WCAG AA
exactamente donde falló el color que el proyecto acaba de abandonar.

### Lo que se midió

| Combinación de la paleta original | Ratio | |
|---|---|---|
| Blanco sobre `#C99A3D` — el relleno del botón primario | **2.57:1** | ✗ *(el teal que se abandonó daba 2.70)* |
| `#C99A3D` como texto sobre marfil — **"cifras de dinero"**, que la paleta recomienda explícitamente | **2.42:1** | ✗ |
| Ámbar `#D99028` como texto sobre marfil | 2.48:1 | ✗ |
| Champagne `#E5C56B` como texto sobre marfil | 1.58:1 | ✗ |
| Verde `#3F8065` como texto sobre marfil | 4.41:1 | ✗ *(por poco)* |

Esto no es una objeción estética. `tests/token-contrast.test.ts` mide estos valores en CI, y la decisión §4 de
`DECISIONES_PENDIENTES.md` se cerró el 12/09 justamente para que la app cumpliera AA completo.
Aplicar la paleta tal cual reabre esa decisión y obliga a apagar el test.

### Cómo queda

**Decisión (20/09): el texto sobre el oro es carbón, no blanco.**
`#C99A3D` se conserva **exacto** como relleno del botón primario; lo que cambia es `--brand-contrast`.
Carbón sobre oro da **6.24:1**, y además es como se resuelve el oro en las marcas premium — blanco sobre
dorado siempre se ve lavado.

Para el oro *como texto* sobre fondo claro (las cifras de dinero, los links) se agrega un oro oscuro
`#7A5A1C` → 5.98:1. Es el mismo tono, solo más profundo: `--brand-700`, que es el token que el sistema ya
manda usar para texto sobre claro.

```
:root  (tema claro)                     [data-theme='dark']
--brand-50:       #FBF4E4               --brand-50:       #2A2318
--brand-100:      #F2E3BE               --brand-100:      #3D3221
--brand-500:      #C99A3D   ← intacto   --brand-500:      #D3AC5F
--brand-600:      #B08531               --brand-600:      #E5C56B
--brand-700:      #7A5A1C               --brand-700:      #F2D27A
--brand-contrast: #24211C   ← cambia    --brand-contrast: #24211C
```

**Y esta vez cambian también los neutrales.** El rebranding a esmeralda eran 6 líneas × 2 bloques porque el
esmeralda vivía sobre los mismos grises azulados de siempre. La paleta de oro define su propio mundo cálido
(marfil, beige, carbón, gris cálido), así que la tanda es más grande:

| Token | Antes | Ahora | De la paleta |
|---|---|---|---|
| `--bg-app` | `#f5f7fa` | `#FAF8F2` | Marfil |
| `--bg-surface` | `#ffffff` | `#FFFFFF` | Tarjetas |
| `--bg-muted` | `#ebeef3` | `#F1EBDD` | Beige cálido |
| `--border` | `#e5eaf0` | `#DDD7C9` | Beige grisáceo |
| `--text-strong` | `#1e2a3b` | `#24211C` | Carbón |
| `--text-body` | `#44546a` | `#4B463D` | *derivado* |
| `--text-muted` | `#647387` | `#716C63` | Gris cálido |
| `--sidebar-bg` | `#0a2622` | `#24211C` | Sidebar |

Los semánticos se recalculan sobre el fondo marfil conservando el tono de la paleta
(éxito `#2F6B50`, alerta `#8A5B14`, error `#A33C36`, info `#1A5FA8`).
`--platform` (el navy del panel de super-admin) **no se toca**: su razón de existir es no parecerse a la marca.

**Verificado:** las 20 combinaciones que importan pasan AA en tema claro y en tema oscuro, incluida la que el
test todavía no mide.

---

## Fase 1 · La marca al código

Un solo deploy. Todo el color sale de un archivo, así que el riesgo es bajo; lo que hay que cuidar es el test.

1. `src/styles/tokens.css` — marca, semánticos, neutrales y sidebar, en los dos bloques.
2. `tests/token-contrast.test.ts` — **extenderlo para medir el relleno del botón primario**
   (`--brand-contrast` sobre `--brand-500` y sobre `--brand-600`). Sin esto, el próximo cambio de marca
   repite el agujero exacto: el teal en 2.70 vivió meses sin que nada fallara porque el test solo miraba
   tokens de texto.
3. `public/favicon.svg` — reemplaza el genérico morado de 9.5 KB.
4. `index.html` — `<title>Compraventa</title>` → `Prendo`, y meta `description`.
5. `AppShell.tsx:142,173` y `AppFooter.tsx:18` — el respaldo `'Compraventa'` → `'Prendo'`.
6. `LoginPage.tsx` — hoy dice solo "Ingresar", sin marca. Acá **sí manda Prendo**: es la única pantalla donde
   todavía no se sabe a qué empresa entra el usuario.
7. Los SVG del logo a `public/`.
8. `docs/DESIGN_SYSTEM.md` §1-bis y §2 — la tabla de tokens está duplicada como documentación y se
   desincroniza sola.
9. Backend: `app/main.py:32` — `FastAPI(title="Compraventa Backend")` → `Prendo`. Es el título que sale en
   `/openapi.json` y en Swagger.

**No se tocan** los nombres de paquete (`compraventa-frontend`, `compraventa-backend`), las apps de Fly ni la
carpeta raíz: renombrarlos rompe deploys y secrets a cambio de nada que alguien vea.

**Verificación.** `npm run lint && npm run typecheck && npm run test && npm run build`, y después medir sobre
**lo servido**, no sobre el push: un `git push` verde no dice que el bundle tenga el cambio.

---

## Fase 2 · El kit visual, rehecho

Depende de la fase 1 para poder capturar pantallas reales.

1. Regenerar los seis SVG con el concepto Etiqueta en oro.
2. `marca/IDENTIDAD.html` — reescribir las secciones **Logo** y **Color** (el resto sigue válido: Nombre,
   Alternativas, Tipografía, Gobierno). Agregar la tabla de contraste medida de la paleta nueva y **la razón
   del carbón sobre oro**, que es la decisión no obvia.
3. Rehacer los mockups: el comparador hoy contrasta "esmeralda vs teal de hoy"; pasa a "oro vs esmeralda".
4. Actualizar `marca/README.md`.
5. **Republicar a la misma URL** — y después **mover el pin de compartir a mano**, desde el menú Share de
   la página. Republicar solo actualiza lo que ve el dueño: quien abre el enlace compartido sigue viendo la
   versión clavada anterior. Esto mordió el 20/09: el kit quedó republicado en oro y el enlace seguía
   mostrando el esmeralda.

---

## Fase 3 · Terminar la guía de usuario

**Al 21/09 falta solo la parte 6.** Fue la fase más larga y la que más fácil salía mal: tres tandas de QA contra el código encontraron unas 30 afirmaciones falsas, y cuatro de ellas ya venían escritas desde el 12/09.

| Parte | Contenido |
|---|---|
| 3 · El día a día | 14 tareas, del abrir caja al cerrar caja |
| 4 · Pantalla por pantalla | ✅ **Completa (21/09)** — las 14 pantallas |
| 5 · Administración | Usuarios, roles, matriz de permisos, cuentas, capital, plantillas, auditoría |
| 6 · Reportes y cierre | Qué significa cada indicador **y qué deja por fuera** |
| 7 · Problemas frecuentes | 12 casos con causa y salida |
| 8 · Glosario y anexos | Los términos del oficio, y qué **no** hace la app todavía |

Fuera de la guía del cliente: el panel de super-admin (`/platform`).

**Dos reglas que no se aflojan:**

- **Cada regla de negocio se escribe leyendo el código que la implementa** — el schema de Zod del formulario,
  `rules.py`, `service.py`. No `CONTEXTO.md` (congelado el 14/08) ni los README. Esto ya mordió una vez: el
  borrador describía los códigos como `JOC0001I`, el esquema de pieza única que quedó obsoleto cuando el
  modelo se partió en producto + lote. *(Verificado el 20/09: `build_code()` sigue existiendo en `rules.py:11`
  con un docstring que dice que se conserva solo para no invalidar los códigos ya impresos. Lo vigente es
  `build_product_code()` y `build_lot_code()`.)*
- **Corrección a esa regla (20/09):** «sale del schema de Zod» **solo se puede cumplir en la mitad de las
  pantallas**. En todo `features/` hay **13 schemas de Zod**; el resto de los formularios valida a mano con
  `useState` y chequeos en el submit. Para esas pantallas, obligatorio/opcional sale del handler de submit y
  del backend. Los insumos ya extraídos, pantalla por pantalla, están en **`GUIA_INSUMOS.md`**, con su propia
  lista de lo que quedó sin verificar.
- **Las capturas van contra una empresa espejo sembrada, nunca contra la dev remota.** En dev hay clientes
  reales con cédulas y fotos de documento: es Ley 1581 (Habeas Data). Mismo método que la auditoría de QA.
  Playwright funciona en esta máquina con el Chrome del sistema (`chromium.launch({ channel: 'chrome' })`);
  no tiene navegador propio descargado.

---

## Fase 4 · El dominio

`prendo.com.co` ya está comprado. Lo que el dominio desbloquea de verdad es **el correo** y **la cara del
producto** — no desbloquea el ambiente de producción, que funciona igual sobre `.fly.dev` y la URL de Vercel.

> **`prendo.co` no se compra (decidido 21/09/2026).** Quedó libre en el drop, pero el precio se sale del
> presupuesto. **Toda la marca vive en `prendo.com.co`.** No es un plan B: era el plan desde el principio,
> y por eso se compró primero — para que la marca no quedara de rehén de un dominio.

1. **Decidir el mapa de nombres** antes de tocar DNS. Propuesta:
   `app.prendo.com.co` → el producto (Vercel) · `api.prendo.com.co` → el backend (Fly) ·
   `prendo.com.co` → por ahora, redirección a `app`.
2. **Vercel:** agregar el dominio al proyecto y crear los registros en el registrador. Vercel emite el
   certificado solo.
3. **Fly:** `fly certs add api.prendo.com.co` + el `CNAME`/`A` que pida.
4. **Sincronizar las tres puntas, que tienen que coincidir exacto:**
   - `FRONTEND_URL` en los secrets de Fly (es de donde cuelga el enlace de invitación).
   - `VITE_API_URL` en Vercel.
   - `CORS_ALLOW_ORIGINS` en el backend.
   - **Site URL y Redirect URLs** en Supabase Auth. Si `{FRONTEND_URL}/auth/callback` no está en la lista,
     **Supabase no falla: la reemplaza por la Site URL en silencio** y el usuario entra con sesión activa sin
     que nadie le pida contraseña. Ese bug ya pasó.
5. **Nunca `supabase config push`**: pisa producción con el config local — reabre `enable_signup`, pone la
   Site URL en `127.0.0.1:3000` y baja el límite de correos a 2 por hora.

**Pendiente de higiene que sale acá:** `FRONTEND_URL` **no está en `.env.example`** ni en los comentarios de
`fly secrets set` de `fly.dev.toml` ni de `fly.prod.toml`. Es la variable de la que cuelga todo el flujo de
invitación y la más fácil de olvidar al montar producción. Arreglo de una línea en tres archivos.

---

## Fase 5 · El correo

**Punto de partida honesto: el backend no tiene ningún módulo de correo.** Cero dependencias, cero plantillas,
cero cola. Todo el correo que sale hoy lo manda Supabase Auth con su SMTP compartido, que limita a unos pocos
envíos por hora y responde `INVITE_RATE_LIMITED` (429) al pasarse.

Y eso fue **a propósito**: el producto se diseñó para *no depender* del correo. Los cuatro caminos de alta y
rescate funcionan con "Generar enlace" entregado a mano. El único camino que sí necesita correo es
"¿Olvidaste tu contraseña?" del login.

Por eso esta fase tiene dos mitades muy distintas, y conviene no confundirlas:

### 5a · SMTP propio — configuración, no código

1. Verificar `prendo.com.co` en **Resend** (3.000 correos/mes gratis): registros `SPF`, `DKIM` y `DMARC` en
   el DNS.
2. Cargar las credenciales en Supabase → Authentication → Emails → SMTP Settings.
   Remitente: `no-responder@prendo.com.co`, nombre "Prendo".
3. **Arreglar la plantilla de invitación**, que hoy está escrita y sin aplicar en
   `docs/correo-invitacion.html` y trae tres problemas a la vez:
   - dice **"Compraventa"** (marca vieja),
   - usa el **teal viejo** `#00b19e` / `#00806f`,
   - usa `{{ .ConfirmationURL }}` en vez de `{{ .TokenHash }}`.

   El tercero es el que importa: `{{ .ConfirmationURL }}` es un **GET de un solo uso**, y los generadores de
   vista previa de WhatsApp/Telegram/Slack y los escáneres de Gmail/Outlook lo **queman antes de que llegue
   el destinatario**. El camino del enlace copiado ya se arregló en marzo pasando el canje a POST; el camino
   del correo conserva el bug. Queda:
   ```html
   <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite">Crear mi contraseña</a>
   ```
   Ojo: el 04/09 las plantillas **no se podían editar en el plan del proyecto**. Verificar si eso sigue así
   antes de dar la fase por cerrada.
4. Misma pasada para la plantilla de recuperación.

### 5b · Notificaciones de negocio — esto sí es construir

Avisos de vencimiento de contrato, recibos, resúmenes. **Hoy no existe nada**: ni módulo, ni cola, ni tabla,
ni preferencias de usuario. Está listado como Fase 2 del roadmap.

No entra en este plan. Cuando entre, necesita su propia decisión de diseño (¿quién dispara?, ¿el job nocturno
que ya existe?, ¿qué pasa si el cliente no tiene correo?, ¿se audita el envío?) y una tabla de estado de
envío, porque un correo que no llegó y nadie registró es peor que no mandarlo.

---

## QA — cómo se verifica cada fase

El proyecto ya tiene una cultura de verificación escrita; esto la aplica, no la inventa.

| Fase | Qué se verifica | Cómo |
|---|---|---|
| 1 | Contraste de los tokens, en los dos temas | `token-contrast.test.ts` extendido al relleno del botón |
| 1 | Que no quede "Compraventa" visible | `grep -ri compraventa src/ index.html app/` |
| 1 | Que el bundle **servido** tenga el cambio | Medir sobre la URL desplegada, no sobre el push |
| 1 | Que nada se rompió | `lint · typecheck · test · build` + `pytest -q` con **Docker levantado** |
| 2 | Legibilidad del logo | Renderizado a 16/24/32/48 px, mirado |
| 3 | Que la guía diga lo que el código hace | Cada regla contra su `rules.py` / schema de Zod |
| 3 | Habeas Data en las capturas | Empresa espejo sembrada, nunca la dev remota |
| 4 | Que las tres puntas coincidan | Login real de punta a punta sobre el dominio nuevo |
| 5 | Que el enlace **sobreviva a los crawlers** | 4 GET simulados y después abrirlo en un navegador real |
| 5 | Que el correo no caiga en spam | Envío a Gmail, Outlook y un corporativo |

**Tres trampas del proyecto que aplican acá:**

- **`pytest` sin Docker pasa igual** — con la mayoría de tests saltados. Un `95 passed` no es la suite.
- **Un fixture inventado no falla: bendice.** Los fixtures se copian de una respuesta real.
- **Backend primero, siempre.** El front genera sus tipos desde el `/openapi.json` en vivo.

---

## Orden y dependencias

```
Fase 1 (marca al código)
   ├── Fase 2 (kit rehecho)      ← necesita la app ya en oro para capturar
   └── Fase 3 (guía)             ← necesita la app ya en oro para capturar

Fase 4 (dominio)                  ← independiente, se puede hacer en paralelo
   └── Fase 5a (SMTP)             ← necesita el dominio verificado

Fase 5b (notificaciones)          ← fuera de alcance, necesita decisión de diseño propia
```

Lo único que bloquea de verdad la venta sigue siendo **el ambiente de producción**, que no está en este plan
y no depende del dominio.
