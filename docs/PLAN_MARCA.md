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

`prendo.com.co` tiene NS de GoDaddy (`ns45.domaincontrol.com` / `ns46.domaincontrol.com`).

> **✅ La trampa del DMARC SE DISOLVIÓ — medido el 22/09/2026.** Este documento (y `CONTINUAR.md`, y
> `ESTADO.md`) venía advirtiendo dos veces que GoDaddy había auto-provisionado
> `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net` —con los reportes
> yendo a **un buzón de ellos**— y que al montar Resend había que **reemplazarlo**, no sumarle SPF y DKIM
> encima.
>
> **Ese registro ya no existe.** Desapareció al reemplazar los registros del parking el 21/09. Verificado
> contra los **dos** NS autoritativos y contra dos resolvers públicos (8.8.8.8 y 1.1.1.1), con el dominio
> respondiendo normal — o sea que es una ausencia real, no un fallo de consulta.
>
> **Estado del DNS de correo hoy: completamente limpio.** Sin `MX`, sin `SPF`, sin `DMARC`, sin
> `resend._domainkey`, sin `send.`. No hay nada que reemplazar ni con qué chocar: lo que pida Resend se
> agrega tal cual.
>
> **Lo que esto NO significa:** que no haya que poner DMARC. Un dominio sin DMARC no está protegido — sigue
> conviniendo publicar uno propio **después** de que SPF y DKIM estén verificados y mandando bien, con los
> reportes a un buzón nuestro. Se empieza en `p=none` (solo observar) y se endurece cuando los reportes
> muestren que todo el correo legítimo pasa. Endurecerlo antes manda a spam el correo propio.
>
> **La lección, que es la de siempre:** una trampa anotada hace dos días puede haber dejado de existir. Se
> mide antes de trabajar sobre ella — no porque el documento mintiera, sino porque el mundo se movió.

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

> **✅ Las dos plantillas ya están listas (21/09/2026).** `docs/correo-invitacion.html` quedó corregida y con
> la marca nueva; antes tenía tres problemas que la hacían inaplicable. Y `docs/correo-recuperacion.html`
> **se escribió el mismo día**: no existía, y es la del único camino del producto que de verdad necesita
> correo. **El resto de la fase es configuración, y depende de cuentas que no tenemos: Resend, el DNS y el
> panel de Supabase — el runbook paso a paso está en §5a.**
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

### 5a · SMTP propio — runbook de migración a Resend

**Decisión tomada (21/09/2026): se deja de usar el SMTP incluido de Supabase y se migra a Resend**, ahora que
el dominio está verificado y sirviendo. Esto no desbloquea nada urgente —el producto se diseñó para no
depender del correo— pero quita el techo de envíos que va a doler cuando existan notificaciones de negocio
(5b), y saca los correos de un remitente compartido que cae en spam con facilidad.

**Lo que ya está hecho y no hay que rehacer:** las dos plantillas, escritas y con los contrastes medidos.

| Plantilla | Archivo | Dónde se pega | Asunto sugerido |
|---|---|---|---|
| Invitación | `docs/correo-invitacion.html` | Authentication → Email Templates → **Invite user** | Activa tu cuenta para empezar a trabajar |
| Recuperación | `docs/correo-recuperacion.html` | Authentication → Email Templates → **Reset Password** | Cambia tu contraseña de Prendo |

**Todo lo que sigue es configuración en cuentas que no están en esta máquina** (Resend, GoDaddy, el panel de
Supabase): lo ejecuta Mateo, en este orden, verificando cada paso antes de pasar al siguiente.

> **Cómo leer las fuentes en este runbook.** 📚 = sale de la documentación del proveedor, con enlace.
> 🧠 = criterio de este proyecto, decidido acá y explicado. Los valores concretos que el panel de Resend
> genera (la clave DKIM, la región del MX) **no están escritos acá a propósito**: se copian del panel, no de
> un documento. Un valor DKIM transcrito de memoria es exactamente el error que deja el dominio sin verificar
> durante tres días.

#### Paso 1 · Verificar si las plantillas se pueden editar — esto define el orden de todo lo demás

El 04/09/2026 se midió que **las plantillas de correo no se podían editar en el plan del proyecto**. Hay que
volver a mirarlo antes de tocar nada, porque de eso depende si el paso 6 existe o si hay que hacerlo al final.

1. Entrar al proyecto que usa la app — el que sale de `SUPABASE_URL`, **`driyubkodnsqxbtxcmaz`**
   (*lagranlegal's Dev*), no el que muestre `supabase projects list` (hay dos cuentas en juego, ver
   `DEPLOY.md`).
2. Authentication → Emails → **Templates** → "Reset password".

**Qué verificar:** que el campo *Message body* acepte texto y que **Save** no esté bloqueado con un aviso de
plan.

- **Si se puede editar** → el orden natural sigue: SMTP primero igual (paso 2 al 5) y las plantillas después,
  para no gastar el cupo del remitente compartido probando.
- **Si NO se puede editar** → queda confirmado que el único camino es **montar el SMTP de Resend primero**,
  que es justamente lo que devuelve el control de las plantillas. En ese caso el paso 6 se hace después del 5
  y **la fase no se puede cerrar antes**: con el SMTP propio pero la plantilla por defecto, los correos salen
  usando `{{ .ConfirmationURL }}` y el bug de los crawlers del 03/09 vuelve por el camino del correo.

📚 La documentación de Supabase **no menciona** ninguna restricción de plan para editar plantillas
([auth-email-templates](https://supabase.com/docs/guides/auth/auth-email-templates)), así que lo que manda es
lo que muestre el panel, no lo que diga la doc. 🧠 Anotar el resultado con fecha en este mismo archivo: es un
dato que ya se midió dos veces y se volvió a perder.

#### Paso 2 · Crear la cuenta de Resend y verificar el dominio

**Qué dominio se verifica, y por qué el apex.** 🧠 Se verifica **`prendo.com.co`** (el apex) y el remitente
queda **`no-responder@prendo.com.co`**, nombre "Prendo". Tres razones:

- El remitente y los enlaces del cuerpo quedan en el mismo dominio, que 📚 Resend lista como factor de entrega
  para correos de autenticación ([deliverability para Supabase
  Auth](https://resend.com/docs/knowledge-base/how-do-i-maximize-deliverability-for-supabase-auth-emails)).
- 📚 Resend **no pone su MX en la raíz**: el MX de Return-Path y el SPF los pide en un subdominio `send.`, y
  "los MX solo afectan al subdominio al que están asociados"
  ([conflictos de MX](https://resend.com/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records)).
  Es decir: verificar el apex **no bloquea** poner un Google Workspace en `prendo.com.co` más adelante — y ese
  buzón hace falta para los reportes DMARC del paso 3.
- Un solo dominio verificado, un solo `_dmarc`, alineación estricta posible.

**El costo de esa decisión, dicho en voz alta:** 📚 Resend *recomienda fuerte* enviar desde un subdominio
(`notificaciones.example.com`) en vez de la raíz, para no arriesgar la reputación del dominio principal
([add-a-domain](https://resend.com/docs/add-a-domain)). 🧠 Se acepta el riesgo porque hoy el volumen es
"algunos correos de recuperación de contraseña": el correo que **tiene que llegar**. El día que 5b mande
avisos de vencimiento a clientes —volumen, y gente que va a marcar spam— eso va en su propio subdominio
verificado aparte, y el apex se queda con los correos de autenticación.

**Los registros que pide Resend.** 📚 Al agregar el dominio, el panel genera DKIM y SPF (`TXT` y `MX`, o
`CNAME` en dominios nuevos) y hay que copiarlos **tal cual del panel**; la región del MX
(`us-east-1`, `eu-west-1`, `sa-east-1`, `ap-northeast-1`) queda embebida en su valor
([troubleshooting de verificación](https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying)).
La forma habitual es:

> **✅ LO QUE RESEND PIDIÓ DE VERDAD — medido el 23/09/2026, ya verificado.** La forma de abajo era la
> documentada y **no fue la que tocó**. Lo real, leído de los NS autoritativos:
>
> | Nombre | Tipo | Valor |
> |---|---|---|
> | `resend._domainkey` | `TXT` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDBwd1H2stfeGCEDUIhpoo4…` |
> | `send` | **`CNAME`** | `send.forge.rmta.net.` |
>
> **Dos registros, no tres, y el del medio es un CNAME.** El SPF y el MX de Return-Path viven **al final de
> ese CNAME**, en infraestructura de Resend: `v=spf1 ip4:52.3.252.119 ip4:44.222.39.36
> ip4:199.249.231.0/24 ~all` y `10 feedback.forge.rmta.net`.
>
> **Es mejor que lo documentado, y conviene entender por qué:** con un CNAME, **Resend puede rotar sus IPs
> de envío sin que nosotros toquemos el DNS**. Con el SPF pegado a mano, cada cambio de su lado nos habría
> dejado un SPF viejo apuntando a IPs que ya no envían — y eso no falla ruidosamente: el correo empieza a
> caer en spam sin ninguna señal.
>
> **Y Resend ya no usa Amazon SES**, al menos para este dominio: es `rmta.net`, infraestructura propia. La
> forma de abajo —`include:amazonses.com`, `feedback-smtp.<región>.amazonses.com`— quedó obsoleta.
>
> **Verificado que no rompió nada de lo que ya estaba:** apex, `dev`, `www` y `api-dev` intactos. Y **el
> apex quedó sin SPF y sin MX propios**, que era exactamente el punto de verificar el apex: montar un
> Google Workspace en `prendo.com.co` más adelante sigue sin conflicto.

**La forma que este runbook documentaba (obsoleta, se deja como registro):**

| Nombre (en GoDaddy, relativo al dominio) | Tipo | Valor | Notas |
|---|---|---|---|
| `resend._domainkey` | `TXT` | la clave pública que muestra el panel | se pega completa, sin cortar ni reacomodar saltos de línea |
| `send` | `TXT` | `v=spf1 include:amazonses.com ~all` | SPF del subdominio de envío, no del apex |
| `send` | `MX` | `feedback-smtp.<región>.amazonses.com` | prioridad **la que muestre el panel**; es el Return-Path |

🧠 La región: da igual para la entrega, pero **cambiarla después cambia el MX y obliga a re-verificar**. Se
elige una vez y se anota acá.

**Cómo conviven con lo que ya está pegado: no se toca nada de lo que hay.** Los registros nuevos viven en
nombres que hoy no existen (`resend._domainkey`, `send`) y el DMARC del paso 3 en `_dmarc`. Los A/AAAA/CNAME
de Vercel y Fly (`@`, `dev`, `www`, `api-dev` — tabla en §4.6) **no se modifican ni se borran**: son nombres
distintos y tipos distintos.

> **Corregido el 22/09/2026:** este párrafo decía que había que **reemplazar** el `_dmarc` que GoDaddy
> auto-provisionó. **Ese registro ya no existe** — desapareció al reemplazar los registros del parking, y se
> verificó contra los dos NS autoritativos y dos resolvers públicos (ver §4.6). Así que **no se reemplaza
> nada: todo lo de correo se agrega sobre un DNS limpio.** El paso 3 deja de ser «reemplazar» y pasa a ser
> «publicar el primero», que es más simple y menos riesgoso.

**Trampas de GoDaddy** 🧠: su formulario espera el nombre **relativo a la zona** (`send`, no
`send.prendo.com.co`) y si se escribe completo queda `send.prendo.com.co.prendo.com.co`, que no falla: solo no
verifica nunca. TTL bajo (600s) mientras se prueba, y volver a 1 h al terminar.

**Qué verificar después del paso 2** (desde la terminal, no desde el panel de GoDaddy — el panel muestra lo
que se guardó, no lo que el mundo resuelve):

```bash
dig +short TXT resend._domainkey.prendo.com.co
dig +short TXT send.prendo.com.co          # → v=spf1 include:amazonses.com ~all
dig +short MX  send.prendo.com.co          # → feedback-smtp.<región>.amazonses.com
# Y que lo de antes siga en pie:
dig +short A   prendo.com.co               # → 216.198.79.1 / 64.29.17.1 (Vercel)
dig +short A   api-dev.prendo.com.co       # → 66.241.124.156 (Fly)
curl -sI https://dev.prendo.com.co | head -1
```

Y en Resend, el dominio en **Verified**. 📚 Suele tardar menos de 15 minutos y puede llegar a 72 horas;
después de 72 h se usa "Restart verification" ([add-a-domain](https://resend.com/docs/add-a-domain)).

🧠 Antes de salir del panel de Resend, en la configuración del dominio: **apagar open tracking y click
tracking**. No es cosmético — 📚 Resend advierte que el click tracking "causa problemas con los enlaces de
verificación de un solo uso de Supabase" porque reescribe la URL del cuerpo
([deliverability para Supabase Auth](https://resend.com/docs/knowledge-base/how-do-i-maximize-deliverability-for-supabase-auth-emails)).
Es la misma familia de bug del 03/09: alguien que no es la persona pidiendo el enlace.

#### Paso 3 · Publicar el DMARC (ya no hay ninguno que reemplazar)

> **Cambió el 22/09/2026.** Este paso se llamaba «🔴 Reemplazar el DMARC de GoDaddy» y era el más delicado
> de la fase. **El registro de GoDaddy ya no existe** (medido contra los dos NS autoritativos y dos
> resolvers públicos, §4.6), así que no hay nada que reemplazar: se **publica el primero**, sobre un
> `_dmarc` vacío. Más simple y sin el riesgo de dejar dos registros conviviendo.
>
> **Lo que NO cambia:** sigue habiendo que publicarlo. Un dominio sin DMARC no está protegido. Y sigue
> valiendo el orden — **primero `p=none`**, que solo observa, y recién se endurece cuando los reportes
> muestren que todo el correo legítimo pasa. Endurecer antes de tener esa evidencia manda a spam el correo
> propio, que es exactamente el daño que el paso original quería evitar.
>
> **Y el `rua` va a un buzón nuestro.** El registro viejo mandaba los reportes a `onsecureserver.net`, de
> GoDaddy — o sea que los reportes existían y no los leía nadie de este proyecto. Al publicar el nuestro,
> ese buzón tiene que ser uno que alguien abra.

Lo que hay hoy en `_dmarc.prendo.com.co`, medido el 21/09 y puesto ahí por GoDaddy sin que nadie lo pidiera:

```
v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net
```

**Qué pasa concretamente si solo se agregan SPF y DKIM y se deja ese registro.** No es que el correo se caiga
de una: es que se queda `p=quarantine` —"lo que falle, a spam"— con **el diagnóstico apuntando a un buzón de
GoDaddy**. Y todo lo que puede fallar en el paso 2 falla en silencio: una clave DKIM pegada a medias, el MX
con la región equivocada, un correo saliendo del apex sin SPF alineado. El resultado es "a Mateo le llega
bien, al cliente le cae en spam" y **el único informe que diría por qué —el reporte agregado XML— llega a
`dmarc_rua@onsecureserver.net`, que no es nuestro**. Se estaría eligiendo la política más severa justo en el
momento de menos visibilidad, que es al revés de como se monta esto.

**Qué poner en su lugar** — 📚 Resend recomienda arrancar en `p=none` con un `rua` que sea "una dirección
válida capaz de recibir correo", y endurecer a `quarantine` y después a `reject` cuando todas las fuentes
legítimas pasen ([DMARC en Resend](https://resend.com/docs/dashboard/domains/dmarc)):

```
v=DMARC1; p=none; rua=mailto:dmarc@prendo.com.co; fo=1
```

🧠 **Sí, eso es aflojar** respecto al `p=quarantine` de hoy, y es a propósito: una política severa sin
reportes no protege nada —nadie la está mirando— y sí manda correo propio a spam sin dejar rastro. Primero se
ve, después se aprieta. La alineación se deja en el default relajado (no se escribe `adkim`/`aspf`) para no
romper el primer envío; se pasa a estricta cuando los reportes muestren que solo sale correo de Resend.

⚠️ **La trampa del `rua`, que es la que hace que este paso se haga mal.** 📚 Si la dirección de reportes está
en **otro dominio** que el del registro DMARC, el dominio que recibe tiene que publicar una autorización —
`prendo.com.co._report._dmarc.<dominio-receptor>  TXT  "v=DMARC1"`
([DMARC FAQ, external destination verification](https://dmarc.org/wiki/FAQ)). En `gmail.com` eso no se puede
publicar, así que **un `rua` apuntando al Gmail personal de Mateo hace que muchos receptores simplemente no
manden los reportes**, y no hay forma de notarlo: se ven cero reportes y parece que no hay problemas.

Además **`prendo.com.co` hoy no tiene MX** (§4.6): `rua=mailto:dmarc@prendo.com.co` escrito hoy no llega a
ninguna parte. Así que el paso 3 tiene una precondición, y hay que elegir una de estas:

| Opción | Qué implica | 🧠 |
|---|---|---|
| **a. Buzón propio en el dominio** — Google Workspace o Zoho en `prendo.com.co`, alias `dmarc@` | MX en el apex (no choca con Resend, su MX va en `send.`), y el `rua` queda en el mismo dominio: cero autorizaciones | **Recomendada.** Es la que hay que hacer igual el día que exista `hola@prendo.com.co` |
| **b. Servicio de reportes** (el que sea) que da una dirección en *su* dominio y publica él la autorización | Funciona hoy sin montar correo; los reportes los lee su panel | Aceptable como puente |
| **c. Gmail personal** | Los reportes **no llegan** por lo de arriba | No |

📚 Resend además tiene un analizador de reportes DMARC ([dmarc-analyzer](https://resend.com/docs/dmarc-analyzer))
para leer los XML, que son ilegibles a mano. 🧠 Si de ese panel sale una dirección de recepción, entra como
opción (b); eso se confirma ahí, no acá.

**Qué verificar después del paso 3:**

```bash
dig +short TXT _dmarc.prendo.com.co
```

- Que devuelva **exactamente un registro**, y que sea el nuestro. 🧠 **Dos registros DMARC equivalen a
  ninguno**: los receptores los ignoran por completo. Es el resultado típico de "agregar" en vez de
  "reemplazar" en el panel de GoDaddy, y es 100% silencioso.
- Que ya no aparezca `onsecureserver.net` por ningún lado.
- 🧠 **Volver a mirar este registro a las 24 h y a la semana.** Lo puso GoDaddy solo una vez; que no lo
  vuelva a poner es una suposición, no un hecho medido.
- A las 48–72 h de tráfico real: que **lleguen** reportes al buzón del `rua`. Cero reportes no es "todo bien",
  es "el `rua` está mal".

#### Paso 4 · Cargar el SMTP de Resend en Supabase

📚 Los valores son ([SMTP de Resend](https://resend.com/docs/send-with-smtp) ·
[Supabase + Resend](https://resend.com/docs/send-with-supabase-smtp)):

| Campo | Valor |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` (SMTPS, TLS desde el primer byte; también acepta 25, 587, 2465, 2587) |
| Username | `resend` (literal, no un correo) |
| Password | la **API key** de Resend |
| Sender email | `no-responder@prendo.com.co` |
| Sender name | `Prendo` |

Se carga en Authentication → Emails → **SMTP Settings** del proyecto `driyubkodnsqxbtxcmaz`.

🧠 La API key se crea con permiso de **solo envío** (y acotada al dominio si el panel lo permite), se guarda en
el gestor de contraseñas y **no entra al repo ni a `config.toml`**: es una credencial que manda correo *como la
plataforma*. Si se filtra, el ataque no es "leer datos", es phishing con nuestro remitente autenticado.

⚠️ **Y falta un paso que no está en ningún panel de SMTP:** 📚 el servicio incluido limita a **2 mensajes por
hora**, y al configurar SMTP propio Supabase impone un límite inicial de **30 por hora** que hay que subir a
mano en Authentication → **Rate Limits** ([auth-smtp](https://supabase.com/docs/guides/auth/auth-smtp)).
**Montar Resend no levanta el techo por sí solo** — si nadie toca ese número, el síntoma que motivó la
migración sigue igual y parece que Resend no sirvió.

🧠 Al subirlo, tener presente el cupo del plan gratuito de Resend: 3.000 correos al mes **con tope diario de
100** — dato de resúmenes de terceros ([StackScored](https://www.stackscored.com/pricing/transactional-email/resend/) ·
[Nuntly](https://nuntly.com/resend-pricing)), **no confirmado contra la doc de Resend**: verificarlo en el
panel de la cuenta antes de fijar el número. 30/hora × 24 h pasa de 100/día, así que el límite de Supabase no
es el techo real.

**Qué verificar después del paso 4:** mandar un correo de prueba (el botón "Send test email" si está, o pedir
una recuperación con una cuenta de prueba) y que aparezca en **Resend → Emails** como *Delivered*. Si Resend
no lo registra, no salió por ahí: el SMTP quedó mal y Supabase está usando otra cosa o fallando.

#### Paso 5 · Cambiar la Site URL a `https://dev.prendo.com.co` por `PATCH` a la Management API

Las dos plantillas usan `{{ .SiteURL }}`, así que **este paso no es opcional**: si la Site URL sigue en la URL
vieja de preview, el correo llega perfecto y el enlace lleva al ambiente equivocado, donde el token se canjea
contra otro proyecto y muere. Sin error, sin log, sin nada.

⚠️ **Nunca `supabase config push`.** Empuja el `config.toml` completo, que es el de desarrollo local: trae
`enable_signup = true` —**reabriría los registros públicos** que el proyecto tiene cerrados a propósito—,
`site_url = "http://127.0.0.1:3000"` y el límite de correos en 2/hora. Es decir: desharía el paso 4 y abriría
el alta pública, en un solo comando. Detalle en `DEPLOY.md` §"NUNCA usar `supabase config push`".

La vía correcta es un `PATCH` quirúrgico con solo los campos necesarios, con un PAT que se revoca al terminar
(`supabase.com/dashboard/account/tokens`), **guardando el antes para poder comparar**:

```bash
REF=driyubkodnsqxbtxcmaz   # el que sale de SUPABASE_URL, no el del CLI

curl -s "https://api.supabase.com/v1/projects/$REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_PAT" > /tmp/auth-antes.json

curl -s -X PATCH "https://api.supabase.com/v1/projects/$REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_PAT" -H "Content-Type: application/json" \
  -d '{"site_url":"https://dev.prendo.com.co"}'

curl -s "https://api.supabase.com/v1/projects/$REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_PAT" > /tmp/auth-despues.json
diff <(jq -S . /tmp/auth-antes.json) <(jq -S . /tmp/auth-despues.json)
```

**Qué verificar:** que el `diff` muestre **un solo campo cambiado**, `site_url`. Cualquier otra línea es un
efecto que nadie pidió.

🧠 De paso, revisar en `/tmp/auth-antes.json` si `uri_allow_list` incluye `https://dev.prendo.com.co/**`. No
afecta a las plantillas (los enlaces van directo a la app, sin redirect de GoTrue), pero sí al `redirectTo`
que manda `resetPasswordForEmail` (`src/features/auth/api.ts:143-144`): si no está, Supabase lo reemplaza en
silencio por la Site URL. Si falta, agregarlo **en el mismo `PATCH`** y volver a comparar.

Y al terminar: **revocar el PAT**.

#### Paso 6 · Pegar las dos plantillas

> **🔴 Guardar no es aplicar: Supabase cachea las plantillas unos minutos.** Medido el 23/09/2026 y costó
> un diagnóstico entero. Se guardaron las dos plantillas, se pidió un correo de recuperación y **llegó con
> el enlace viejo** (`/auth/v1/verify`, o sea `{{ .ConfirmationURL }}`). El editor mostraba el cuerpo nuevo
> y la plantilla era la correcta. Minutos después, el mismo flujo ya salía con `token_hash`.
>
> **Después de guardar, esperar unos minutos antes de probar** — y si el correo sale con la forma vieja, la
> primera hipótesis es el caché, no un error de configuración.
>
> **Y una trampa de método que también costó:** el `iat` del JWT que aparece cuando un enlace se quema es
> **cuándo se canjeó**, no cuándo se envió el correo. Un enlace de recuperación vive hasta una hora, así que
> un `iat` reciente **no prueba** que el correo sea reciente. Es fácil medir un correo viejo de la bandeja y
> concluir que la plantilla falla. **Borrar los correos viejos antes de probar** — es *"un fixture inventado
> no falla, bendice"* con otra ropa: acá el fixture es un correo que quedó dando vueltas.
>
> Es la misma familia que el resto del proyecto: **`git push` no es desplegar**, **republicar no es mover el
> pin**, y ahora **guardar no es aplicar**.


Authentication → Email Templates. En cada una se reemplaza **todo** el *Message body* —no se mezcla con lo que
había— y se pone también el *Subject heading* de la tabla del principio:

- **Invite user** ← `docs/correo-invitacion.html` (todo el archivo; el bloque de comentarios `<!-- -->` puede
  ir o no: los clientes de correo lo ignoran, y dejarlo no rompe nada).
- **Reset password** ← `docs/correo-recuperacion.html`.

**Qué verificar, y es el error de copiar y pegar más probable de toda la fase:** que el `type` del enlace
coincida con la plantilla — `type=invite` en la de invitación y **`type=recovery`** en la de recuperación. Se
verifica **leyendo el enlace del correo que llega**, no el campo del panel: la URL del botón tiene que
terminar en `&type=recovery` en la de recuperación y en `&type=invite` en la de invitación.

Si quedan cruzados, `verifyOtp` rechaza el token y la persona cae en **"Este enlace ya se usó"**
(`AuthCallbackPage.tsx:121-131`) — un mensaje que describe otra causa y la manda a pedir un enlace nuevo que va
a fallar igual. Verificado contra `AuthCallbackPage.tsx:81-82`, que solo acepta `invite` y `recovery`.

#### Paso 7 · Cómo se verifica que quedó bien — las dos pruebas que manda el plan

> **✅ La 7.1 ya está automatizada: `backend-starter/scripts/qa/verificar_enlace_correo.sh`.**
> Se le pasa el enlace del correo entre comillas y prueba los cuatro crawlers, que el cuerpo sea el
> cascarón de la SPA y que no venga ningún token en la respuesta. Sale con **1** si algo falla, y el
> encabezado del archivo explica cómo se lee cada falla. Sin argumento prueba solo la **ruta** con un token
> falso — útil para verificar dominio y enrutamiento, pero **no** el canje.
>
> **Probado el 22/09/2026, antes de tener nada de Resend:** la ruta `/auth/callback` en
> `dev.prendo.com.co` devuelve **200 sin redirect** a los cuatro crawlers, el cuerpo es el cascarón de la
> SPA y el token **no aparece** en la respuesta. La precondición de toda la fase está cumplida y no depende
> del proveedor de correo.
>
> 🔴 **Y salió un requisito que no estaba escrito: el enlace tiene que apuntar a `dev.prendo.com.co`
> DIRECTO, nunca al apex.** Ejercido contra `prendo.com.co/auth/callback`: los cuatro crawlers reciben
> **308** y el cuerpo no es la app. Un enlace de un solo uso que pasa por un redirect es justo el tipo de
> cosa que falla de forma rara y difícil de diagnosticar. **Por eso la Site URL del proyecto Supabase va en
> `https://dev.prendo.com.co` y no en el apex** — que es además como quedó decidido en el paso 5, ahora con
> una razón medida detrás.


Las dos se hacen **con una cuenta de prueba**, no con la de Mateo, y **una a la vez**: cada intento consume
cupo (paso 4) y cada enlace sirve una sola vez.

**7.1 · Que el enlace sobreviva a los crawlers (4 GET simulados y después un navegador real)**

Este es el que prueba que el bug del 03/09 no volvió por el camino del correo. Pedir una recuperación desde
"¿Olvidaste tu contraseña?" (`LoginPage.tsx:133`), abrir el correo y copiar el enlace **exacto** del botón
—con su `token_hash`—, y sin abrirlo en el navegador todavía:

```bash
LINK='https://dev.prendo.com.co/auth/callback?token_hash=PEGAR_EL_REAL&type=recovery'

for UA in "WhatsApp/2.23" \
          "TelegramBot (like TwitterBot)" \
          "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" \
          "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)"; do
  printf '%-45s → %s\n' "${UA%% *}" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -A "$UA" "$LINK")"
done

# Y que lo que se bajaron sea el cascarón de la SPA, no un redirect con token:
curl -s -A "WhatsApp/2.23" "$LINK" | grep -c 'id="root"'   # → 1
```

**Qué tiene que pasar:** los cuatro devuelven **200** y **sin `redirect_url`**, y el cuerpo es el HTML de la
app. **Y recién entonces**, abrir el mismo enlace en Chrome: tiene que mostrar el formulario de contraseña y
dejar guardar. Si guarda, el enlace **sobrevivió a cuatro crawlers** — que es la prueba, no el 200.

**Cómo se lee una falla:** un `302` con `#access_token=…` significa que el token se quemó ahí mismo → la
plantilla está usando `{{ .ConfirmationURL }}` (o quedó la plantilla por defecto de Supabase, paso 1). Un
`302` con `#error_code=otp_expired` significa que ya estaba quemado antes de la prueba. Y si el enlace del
correo apunta a un dominio que no es el nuestro, es el **click tracking de Resend** reescribiéndolo (paso 2).

**7.2 · Que el correo no caiga en spam (Gmail, Outlook y un corporativo)**

Tres destinatarios, porque filtran distinto: **Gmail**, **Outlook/Hotmail** y **una cuenta corporativa** (un
dominio con Workspace/Microsoft 365 propio y, con suerte, antivirus de correo — es el caso que más se parece
al de un cliente real).

En cada uno, y esto se anota:

| Qué se mira | Dónde | Qué tiene que decir |
|---|---|---|
| Bandeja de entrada vs. spam | a ojo | Entrada |
| `Authentication-Results` | Gmail: "Mostrar original" · Outlook: "Ver origen del mensaje" | `spf=pass`, `dkim=pass`, `dmarc=pass` |
| Remitente | encabezado `From` | `Prendo <no-responder@prendo.com.co>` |
| El enlace del botón | copiar del cuerpo | empieza con `https://dev.prendo.com.co/auth/callback?` — **no** un dominio de tracking |
| Que el correo se vea | a ojo, en móvil y en escritorio | una columna, botón dorado con texto oscuro, nada roto |

🧠 Si alguno cae en spam **con las tres autenticaciones en `pass`**, no es configuración: es reputación de
dominio nuevo, y se cura con volumen bajo y constante, no cambiando registros. Antes de tocar el DNS otra vez,
mirar los reportes del `rua` (paso 3) — para eso se pusieron.

#### Paso 8 · Qué se rompe si esto queda a medias

La distinción que importa no es "grave / leve": es **si alguien se va a enterar**.

**Ruidoso — falla de una y alguien lo reporta el mismo día:**

| Qué quedó mal | Cómo se manifiesta |
|---|---|
| API key equivocada o SMTP incompleto | Supabase no logra enviar; la pantalla de recuperación muestra error; **Resend → Emails vacío** |
| Dominio no verificado todavía y remitente `@prendo.com.co` | Resend rechaza el envío; mismo síntoma que arriba |
| No se subió el límite de Rate Limits (paso 4) | Sigue el `429` → el backend responde `INVITE_RATE_LIMITED` con "espera unos minutos". Ruidoso **porque existe un código de error para eso** |

**Silencioso — el correo llega, se ve bien, y algo está roto:**

| Qué quedó mal | Por qué nadie se entera |
|---|---|
| **Site URL sin cambiar** (paso 5) | El enlace lleva al ambiente viejo y el token se canjea contra otro proyecto: "Este enlace ya se usó", indistinguible de un enlace vencido. Ningún log dice "URL equivocada" |
| **`type=invite` en la plantilla de recuperación** (paso 6) | Misma pantalla, misma conclusión equivocada: la persona pide otro enlace y vuelve a fallar |
| **Plantilla sin aplicar pero SMTP montado** (paso 1) | Los correos salen lindos por Resend con la plantilla por defecto, que usa `{{ .ConfirmationURL }}`: **el bug del 03/09 vivo otra vez**, y solo se cae cuando el enlace pasa por un chat o un escáner corporativo — o sea, con clientes reales y no en las pruebas |
| **Click tracking encendido** (paso 2) | El enlace funciona (nuestro canje es POST), así que nada se rompe hoy; lo que se degrada es la entrega, y se paga en spam meses después |
| **SPF/DKIM agregados sobre el `p=quarantine` de GoDaddy** (paso 3) | El correo puede irse a cuarentena y el informe que lo explicaría llega a un buzón de GoDaddy. La falla y su diagnóstico van a lugares distintos |
| **Dos registros `_dmarc`** (paso 3) | Los receptores ignoran DMARC por completo. Nada falla, y la protección que se cree tener no existe |
| **`rua` sin MX o en un dominio ajeno sin `_report._dmarc`** (paso 3) | Cero reportes, leído como "cero problemas" |

🧠 Regla de cierre: **la fase no se da por cerrada con "quedó configurado"**, se cierra con el 7.1 pasando y
las tres autenticaciones en `pass` del 7.2, anotados con fecha acá. Todo lo silencioso de esta tabla solo se
descubre haciendo esas dos pruebas; ninguna alerta las va a hacer por nosotros.

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
| 5 | Que el enlace **sobreviva a los crawlers** | 4 GET simulados y después abrirlo en un navegador real — comandos en §5a paso 7.1 |
| 5 | Que el correo no caiga en spam | Envío a Gmail, Outlook y un corporativo, leyendo `Authentication-Results` — §5a paso 7.2 |

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
