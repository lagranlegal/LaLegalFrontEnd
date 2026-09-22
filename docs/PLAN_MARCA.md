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
> ✅ **Fase 4 — CERRADA (21/09)**: los **cuatro** hostnames de dev vivos con TLS válido — el front en
> `dev.prendo.com.co`, **el backend en `api-dev.prendo.com.co`**, el apex y `www` redirigiendo 308. DNS,
> certificados, CORS, `FRONTEND_URL`, CSP y las Redirect URLs de Supabase resueltos y verificados contra lo
> servido y en un navegador real. **Queda un pendiente menor, no bloqueante:** el HSTS sin
> `includeSubDomains; preload` (§4.7). Detalle en §Fase 4.

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
*(Confirmado el 21/09 con el dato duro: **Fly ni siquiera tiene comando de rename** — ver §4.3. Lo que sí
cambió es la **dirección** del backend, que es lo único que alguien ve.)*

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

## Fase 4 · El dominio — ✅ CERRADA (21/09/2026)

> **Cerrada el 21/09/2026, verificada contra lo servido y en un navegador real (Chrome vía Playwright).**
> Los cuatro hostnames de dev están vivos con TLS válido: el front en `dev.prendo.com.co`, **el backend en
> `api-dev.prendo.com.co`** (esto es lo nuevo del cierre), y el apex y `www` redirigiendo **308**.
> Las cuatro puntas que tenían que coincidir —CORS, `FRONTEND_URL`, el `connect-src` del CSP y las Redirect
> URLs de Supabase— coinciden, y se leyeron **del ambiente**, no de un commit.
>
> **Queda un pendiente menor, no bloqueante:** endurecer el HSTS del dominio nuevo (§4.7).

`prendo.com.co` ya está comprado. Lo que el dominio desbloquea de verdad es **el correo** y **la cara del
producto** — no desbloquea el ambiente de producción, que funciona igual sobre `.fly.dev` y la URL de Vercel.

> **`prendo.co` no se compra (decidido 21/09/2026).** Quedó libre en el drop, pero el precio se sale del
> presupuesto. **Toda la marca vive en `prendo.com.co`.** No es un plan B: era el plan desde el principio,
> y por eso se compró primero — para que la marca no quedara de rehén de un dominio.

### 4.1 · El mapa de nombres: un subdominio por ambiente, el apex reservado para prod

**Decisión del 21/09/2026.** Se descartó apuntar el apex a dev y mudarlo a producción más adelante.
Este mapa es el contrato entre todos los documentos del proyecto; si cambia, cambia acá primero.

| Hostname | Qué sirve hoy | Cuando exista prod |
|---|---|---|
| `dev.prendo.com.co` | el front (Vercel, build de la rama `dev`) | **dev, intacto — no se mueve** |
| `api-dev.prendo.com.co` | el backend (Fly, app `compraventa-backend-dev`) | **dev, intacto — no se mueve** |
| `prendo.com.co` (apex) | redirect **308** → `dev.prendo.com.co` | **prod** (deja de redirigir) |
| `www.prendo.com.co` | redirect **308** → `dev.prendo.com.co` | redirect → apex |

Cuando exista producción se suman dos nombres nuevos —el apex para el front y `api.prendo.com.co` para el
backend— y **no se toca ninguno de los dos de dev**. Esa es la propiedad entera del mapa.

**Por qué, que es lo que hay que entender antes de tocar nada.** Una URL de app no vive solo en la barra del
navegador: queda **embebida** en las Redirect URLs de Supabase, en los enlaces de invitación y recuperación
**ya enviados**, en el CORS del backend, en el `connect-src` del CSP y en los marcadores que el cliente
guardó. Si el apex apuntara hoy a dev, todo eso quedaría clavado al apex; el día que el apex pasara a
producción, esos enlaces y esos marcadores caerían **en otra base, con datos reales de clientes**, y
**nada avisaría**: no hay error, no hay 404, no hay log. El usuario entra, ve una app que funciona y son
otros datos.

Este proyecto ya tuvo un incidente **de esa forma exacta**: una URL faltante en la lista de Supabase hizo
que descartara el `redirect_to` **en silencio** y diera acceso sin pedir contraseña. La lección no era «hay
que acordarse de la lista»: era que este tipo de error **no falla ruidosamente**, así que la defensa tiene
que ser estructural.

La propiedad que compra este mapa, en una línea: **el día del corte a prod no se mueve nada de dev, y
ningún enlace viejo cambia de base.** Lo único que cambia es que el apex deja de redirigir.

> **Esto reemplaza la propuesta anterior de esta fase**, que era `app.prendo.com.co` → producto,
> `api.prendo.com.co` → backend, apex → redirect a `app`. Se descartó por la mudanza: `app.` serviría dev
> hoy y prod mañana, o sea **el mismo hostname cambiando de base de datos**, que es exactamente el riesgo
> silencioso de arriba. La idea de un nombre por pieza no estaba mal; lo que faltaba era un nombre **por
> ambiente**. De ahí sale `api-dev.` y no `api.`.

### 4.2 · Lo que quedó hecho en Vercel (21/09)

Proyecto `la-legal-front-end` (id `prj_oPo2pjek9Hujoy4KHWQo53v6CQJI`, team `mateos-projects-85710491`).

1. Los **tres hostnames** agregados al proyecto: `dev.prendo.com.co`, `prendo.com.co` y `www.prendo.com.co`.
2. El apex y `www` configurados con **redirect 308 a `dev.prendo.com.co`** vía la API de Vercel
   (`PATCH /v9/projects/{id}/domains/{domain}`). **El CLI de Vercel no soporta redirects** — por eso va por
   API y no por `vercel domains`. Los dos volvieron `verified: true`.
3. Confirmado que la **Production Branch es `dev`** (todos los deployments recientes salen como *Production*
   desde esa rama), así que los dominios agregados sirven **el build de dev**, que es lo que se quería.
   Ojo con la contracara, que está anotada en `DEPLOY.md`: el día que la Production Branch pase a `main`,
   estos dominios **se mudan solos de build, sin avisar**.
4. `VITE_API_URL` (scope Production) pasó de `https://compraventa-backend-dev.fly.dev` a
   `https://api-dev.prendo.com.co`, **y se redesplegó**. El redeploy no es opcional y la trampa de la
   visibilidad *sensitive* está en `DEPLOY.md` §«Reemplazar una variable `VITE_*`» — las dos fallan en
   silencio y las dos muerden una sola vez.

### 4.3 · El backend pasó a tener dominio propio (21/09) — y por qué la app de Fly NO se renombró

Mateo pidió que «todo deje de decir compraventa». Ahí hay **dos cosas distintas** que conviene no mezclar:

| | Quién lo ve | Qué se hizo |
|---|---|---|
| El **nombre de la app de Fly** (`compraventa-backend-dev`) | solo quien corre `flyctl` | **No se renombró** |
| La **dirección del backend** (la que sale en el bundle y en el CSP) | el navegador de cualquiera | **Cambió** a `api-dev.prendo.com.co` |

**Fly no tiene comando de rename.** Existen `create`, `destroy` y `move` (entre organizaciones), y nada más:
«renombrar» significa crear una app nueva, migrar los secrets, recrear las Machines —incluida la
`nightly-job`, que no pertenece al process group y hay que recrear a mano contra el tag real de la imagen— y
perseguir todas las referencias. Todo eso a cambio de un nombre que **nadie que use el producto va a ver**.
Es la misma decisión que ya traía la Fase 1 («renombrarlos rompe deploys y secrets a cambio de nada que
alguien vea»), ahora con el dato duro al lado.

Lo ejecutado, que sí se ve:

```bash
flyctl certs add api-dev.prendo.com.co -a compraventa-backend-dev
```

y en GoDaddy: `A api-dev → 66.241.124.156` y **`AAAA api-dev → 2a09:8280:1::16e:d34e:0`**.

**El `AAAA` no era opcional.** La app tiene IPv4 **compartida** e IPv6 **dedicada**: sin el `AAAA`, Fly no
puede probar la propiedad del nombre por la IP dedicada y pide además un registro `TXT` de verificación. Con
los dos registros puestos, no hace falta nada más.

> **El certificado tardó, y esa espera se parece a un error.** Estuvo **seis chequeos en `Issuing...`**
> antes de pasar a `Issued`, con el DNS correcto desde el primer momento. Es el tipo de espera que manda a
> «arreglar» un DNS que ya estaba bien: se toca lo que funcionaba y se pierde media hora. Si los registros
> resuelven, la respuesta es esperar.

`https://compraventa-backend-dev.fly.dev` **sigue vivo**: no se apagó nada. Pero desde la app ya no se
alcanza, porque el CSP no lo permite — ver §4.5.

> **Nota para cuando se monte producción, y es lo único que hay que recordar de todo esto:** la app de Fly
> de prod se crea directamente como **`prendo-api-prod`**, no como `compraventa-backend-prod`.
> Nombrarla bien **antes de que exista** cuesta cero; heredar el nombre viejo en el único ambiente que un
> cliente va a ver, no. Está anotado también en `DEPLOY.md` §«Cuando exista producción» y en
> `../../backend-starter/docs/ARCHITECTURE.md` §8.

### 4.4 · Lo que hay que sincronizar, y que tiene que coincidir exacto

Las cuatro puntas, con su valor de hoy. Todas verificadas leyendo **el ambiente**:

| Punta | Valor en dev | Cómo se lee |
|---|---|---|
| `FRONTEND_URL` (secret de Fly) | `https://dev.prendo.com.co` | `flyctl ssh console -C "printenv FRONTEND_URL"` |
| `CORS_ALLOW_ORIGINS` (secret de Fly) | los tres orígenes, con el viejo de Vercel adentro | `flyctl ssh console -C "printenv CORS_ALLOW_ORIGINS"` |
| `VITE_API_URL` (Vercel, Production) | `https://api-dev.prendo.com.co` | `vercel env pull`, y después **el bundle servido** |
| Site URL y Redirect URLs (Supabase Auth) | `…/auth/callback` del dominio nuevo, agregado por Mateo | Management API, **nunca** `supabase config push` |

`flyctl secrets list` **no sirve** para esto: muestra el nombre y un digest, no el valor. Y un secret
seteado no prueba que el proceso lo tenga — `fly secrets set` hace un rolling update que puede dejar
máquinas atrás (es lo que pasó con `nightly-job`, que no tiene process group).

El `connect-src` del CSP no es una quinta punta: **se genera desde `VITE_API_URL` en el build**. Por eso el
redeploy de §4.2 es obligatorio, y por eso una variable cambiada sin rebuild no rompe nada visible — el
bundle viejo sigue hablándole al backend viejo, sin un solo error.

### 4.5 · Cómo se verificó (medido el 21/09, no supuesto)

La verificación fue **un login real de punta a punta en Chrome**, no un `curl` al home: un home que carga con
el CORS roto se ve idéntico a uno sano.

| Qué | Resultado |
|---|---|
| Backend por su dominio | `{"status":"ok"}`, TLS válido, `openapi.json` con `title: Prendo API` y **96 endpoints** |
| El bundle servido (`index-D6iWM2_q.js`) | **contiene** `api-dev.prendo.com.co`, **ya no contiene** `compraventa-backend-dev.fly.dev` |
| El CSP servido | `connect-src 'self' https://api-dev.prendo.com.co https://driyubkodnsqxbtxcmaz.supabase.co` — regenerado solo desde la variable |
| Entrada por el apex | `308 prendo.com.co` → `200 dev.prendo.com.co/auth/login`, con **0 mensajes de consola, 0 `pageerror`, 0 `requestfailed`** |
| CORS real (no preflight simulado) | `fetch` desde la página: `GET /api/v1/health` → **200** `type:"cors"` con cuerpo legible |
| CORS con preflight | `GET /api/v1/me` con un `Authorization: Bearer` inventado → **401** `type:"cors"` con `{"code":"UNAUTHORIZED"}` **legible**. El header fuerza el `OPTIONS` previo, y pasó |
| El backend viejo desde la app | `TypeError: Failed to fetch` + evento `securitypolicyviolation` con `violatedDirective: "connect-src"` |
| Supabase Auth | login con credenciales inventadas → **400** y la UI pinta «Correo o contraseña incorrectos»: el origen nuevo está aceptado |
| Tema oscuro | persiste entre recargas **sin violación de `script-src`** |

Dos de esas filas dicen más de lo que parece:

- **El CSP está en `enforce`, no en report-only.** Que el host viejo siga vivo en Fly es irrelevante para el
  producto: el navegador ya no lo alcanza desde la app. Es la diferencia entre «migramos» y «migramos y
  además cerramos la puerta de atrás».
- **El tema oscuro es el canario del hash.** El script anti-parpadeo es inline y el CSP lo permite por un
  **hash SHA-256**; si el hash no coincidiera, el script no corre y **no deja error de JS** — solo un
  parpadeo blanco al recargar, que cualquiera lee como «así es». Que el tema persista bajo el origen nuevo
  prueba que el hash sobrevivió al rebuild.

### 4.6 · El DNS de hoy, como registro

| Nombre | Tipo | Valor |
|---|---|---|
| `@` (apex) | `A` | `216.198.79.1` y `64.29.17.1` (Vercel — reemplazaron el parking de GoDaddy) |
| `dev` | `CNAME` | `4cf851dda4aeceb9.vercel-dns-017.com.` |
| `www` | `CNAME` | `4cf851dda4aeceb9.vercel-dns-017.com.` |
| `api-dev` | `A` | `66.241.124.156` (Fly, IPv4 compartida) |
| `api-dev` | `AAAA` | `2a09:8280:1::16e:d34e:0` (Fly, IPv6 dedicada) |

`prendo.com.co` tiene NS de GoDaddy (`ns45.domaincontrol.com` / `ns46.domaincontrol.com`). **No hay SPF ni
MX**, y el `DMARC` que GoDaddy auto-provisionó es:

```
v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net
```

**La trampa sigue en pie para la Fase 5:** al montar Resend hay que **reemplazar** ese `DMARC`, no agregarle
SPF y DKIM encima. Un `p=quarantine` heredado, con los reportes yendo a un buzón ajeno, manda el correo
propio a spam sin decir por qué.

### 4.7 · Lo que queda abierto de la fase (menor, no bloqueante)

**El HSTS de `dev.prendo.com.co` va sin `includeSubDomains; preload`**, mientras que el dominio viejo de
Vercel sí los tiene. No rompe nada hoy, pero deja la ventana clásica: un subdominio futuro servido por HTTP
en el primer request. Se endurece agregando `Strict-Transport-Security` a los `headers` de
`frontend-starter/vercel.json`.

**Conviene hacerlo antes de que haya datos reales de clientes**, no después: `preload` es una lista de la
que cuesta salir, así que el momento barato para entrar es ahora, con dev y sin usuarios.

### 4.8 · Las dos «compraventa» que quedan, y que no hay que corregir

El barrido de lo visible (bundle + `index.html`) dejó exactamente dos, y **ninguna es el nombre viejo del
proyecto**:

1. `index.html`, `<meta name="description">`: *«Prendo — la plataforma para compraventas: contratos,
   inventario, caja y reportes en un solo lugar.»*
2. El hint del campo «Nota de encabezado» (configuración de empresa):
   *«Casa de empeño y compraventa · Vigilado Supersociedades»*.

Las dos son **la palabra común en español** — el tipo de negocio al que le vendemos, que es justamente lo
que esas dos frases tienen que decir. Se dejan como están. Queda anotado para que nadie las «corrija» en un
grep futuro creyendo que se escapó la marca vieja.

## Fase 5 · El correo

> **✅ La plantilla ya está lista (21/09/2026).** `docs/correo-invitacion.html` quedó corregida y con la marca
> nueva; antes tenía tres problemas que la hacían inaplicable. **El resto de la fase es configuración, y
> depende de cuentas que no tenemos: Resend, el DNS y el panel de Supabase.**
>
> **Lo que se arregló en la plantilla, y por qué cada cosa importaba:**
>
> 1. **Usaba `{{ .ConfirmationURL }}`, que es el bug de los crawlers.** Ese enlace se canjea con un **GET de
>    un solo uso**: basta con *pedirlo* para quemarlo, y las vistas previas de WhatsApp, Telegram y Slack lo
>    piden antes que el destinatario. Es el incidente del 03/09. Ahora apunta a la app —
>    `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite` — que se canjea con `verifyOtp`,
>    un **POST**: un crawler que haga GET solo se baja el HTML de la SPA. El patrón se verificó contra
>    `src/features/auth/pages/AuthCallbackPage.tsx:73-82` y contra `identity/auth_admin.py:140`.
> 2. **El botón era teal `#00b19e` con texto blanco.** Blanco sobre el oro da **2.57:1** — *peor* que el teal
>    2.70 que este proyecto abandonó justamente por no cumplir AA. Quedó relleno `#c99a3d` con texto
>    **carbón `#24211c`**: **6.24:1**, medido. Los seis pares de la plantilla cumplen AA, y el del pie se
>    bajó a `#4b463d` porque en `#716c63` daba 4.39:1 y no llegaba.
> 3. **Los neutrales eran grises azulados.** El propio `tokens.css` lo advierte: *"sobre un fondo frío el oro
>    se ensucia y tira a mostaza"*. Migrados a los cálidos de la paleta (beige, carbón, gris cálido).
>
> **Y una corrección de fondo, no de estilo:** el archivo decía que había que reemplazar "Compraventa" por el
> nombre real del negocio. **No se puede y no corresponde.** No se puede porque la plantilla es **una sola
> por proyecto de Supabase** y no sabe qué empresa invitó — es multi-tenant. Y no corresponde porque quien
> manda la invitación es **la plataforma**, no el inquilino: es la misma razón por la que el respaldo del
> nombre en `AppShell` es `'Mi empresa'` y no `'Prendo'`. Ese texto es el nombre del INQUILINO; este es el de
> la PLATAFORMA. El nombre del negocio aparece adentro de la app, cuando la persona entra.
>
> ⚠️ **Dependencia nueva que la plantilla introduce:** usa `{{ .SiteURL }}`, así que **la Site URL del
> proyecto Supabase de dev tiene que ser `https://dev.prendo.com.co`**. Hoy apunta a la URL vieja de preview.
> Esto **no** choca con la decisión de "reservar el apex para prod": cada ambiente tiene su **propio**
> proyecto Supabase, así que la Site URL es por ambiente. Si queda mal, el enlace del correo lleva al
> ambiente equivocado **sin dar ningún error** — es el mismo modo de falla silencioso de siempre.
> Se cambia por `PATCH` a la Management API, **nunca** `supabase config push`.
>
> 🔴 **Pendiente de verificar antes de dar la fase por hecha:** el 04/09 se midió que **las plantillas de
> correo no se podían editar en el plan actual del proyecto Supabase**. Si eso sigue así, la plantilla
> corregida no se puede aplicar por esa vía y hay que montar el SMTP de Resend primero (5a), que es lo que
> devuelve el control de las plantillas. **Verificarlo antes de tocar nada más.**


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
| 4 | Que el backend acepte el origen nuevo | ✅ `fetch` real desde la página (no un preflight simulado): 200 `type:"cors"`, y 401 con cuerpo legible |
| 4 | Que las cuatro puntas coincidan | ✅ Login real de punta a punta sobre el dominio nuevo, en Chrome |
| 4 | Que el bundle hable con el backend nuevo | ✅ `grep` sobre el JS **servido**: aparece `api-dev.`, desapareció `.fly.dev` |
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

Fase 4 (dominio) ✅ cerrada       ← era independiente, se hizo en paralelo
   └── Fase 5a (SMTP)             ← ya desbloqueada: el dominio está verificado

Fase 5b (notificaciones)          ← fuera de alcance, necesita decisión de diseño propia
```

Lo único que bloquea de verdad la venta sigue siendo **el ambiente de producción**, que no está en este plan
y no depende del dominio.
