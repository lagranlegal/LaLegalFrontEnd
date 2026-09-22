# Despliegue en Vercel — ambientes dev y producción

> Estado al 21/09/2026: **solo existe el ambiente dev**. No hay backend ni proyecto Supabase de producción todavía (`compraventa-backend-prod` no está creada en Fly y solo hay un proyecto Supabase). La configuración de este documento deja producción lista para activarse llenando variables, sin tocar código.

## Cómo Vercel decide el ambiente

> **Corregido el 21/09/2026.** Este documento afirmaba que la Production Branch era `main`, que `dev`
> «nunca» desplegaba a producción y que las variables de dev vivían solo en scope *Preview*. **Las tres
> cosas dejaron de ser ciertas el 23/08/2026** y el documento no se actualizó; `README.md:93` y
> `ESTADO.md:24` ya decían lo correcto, así que el repo se contradecía a sí mismo. Abajo está el estado
> real, medido en el proyecto.

Vercel no tiene "ambientes" que uno cree a mano: los deduce de la rama.

| Rama | Ambiente de Vercel | URL |
|---|---|---|
| La configurada como **Production Branch** — hoy **`dev`** | Production | `la-legal-front-end.vercel.app` y los dominios propios |
| Cualquier otra rama con deploy habilitado | Preview | URL estable por rama, tipo `<proyecto>-git-<rama>-<equipo>.vercel.app` |

**Por qué `dev` es la rama de producción.** Hasta el 23/08 la Production Branch era `main` y las variables
vivían solo en *Preview*: como `main` no se desplegaba nunca, `la-legal-front-end.vercel.app` servía un
build congelado de días atrás y **cada push generaba una dirección nueva**. El síntoma se leía como «la
función no está desplegada» cuando en realidad estaba en otra URL. Con `dev` como Production Branch, cada
push actualiza **la misma** dirección, que es la que se le pasa a un cliente.

`vercel.json` restringe qué ramas despliegan:

```json
"git": { "deploymentEnabled": { "main": true, "dev": true } }
```

Cualquier otra rama que se empuje **no** genera deployment. Sin esto, cada rama de trabajo crearía previews consumiendo builds.

## Configuración en el dashboard

### 1. Production Branch

**Settings → Git → Production Branch** → **`dev`** (estado real al 21/09/2026).

> 🔴 **Cuando exista producción hay que cambiarla a `main`. Y ese cambio no es inocente: en ese instante
> los dominios propios se mudan solos de build, sin avisar.** Vercel no pregunta, no emite un error y no
> deja rastro visible: `prendo.com.co` (y cualquier otro dominio asignado a Production) empieza a servir el
> build de `main` desde el siguiente deploy. Si `main` todavía no tiene sus variables en scope *Production*,
> lo que se publica es un build roto o viejo.
>
> Por eso el mapa de dominios reserva un **hostname por ambiente** (ver abajo): `dev.prendo.com.co` se
> queda con dev pase lo que pase, y no hay un hostname que cambie de base de datos en silencio.

### 2. Variables de entorno

**Settings → Environment Variables.** Las tres son necesarias; **el build falla a propósito** si falta `VITE_API_URL` o `VITE_SUPABASE_URL` (ver "El CSP" abajo).

Estado real al 21/09/2026: las tres `VITE_*` están en scope **Production** (más una copia en *Preview*),
porque la rama de producción es `dev`.

| Variable | Valor (dev) | Scope |
|---|---|---|
| `VITE_API_URL` | `https://api-dev.prendo.com.co` *(hasta el 21/09 era `https://compraventa-backend-dev.fly.dev`)* | Production + Preview |
| `VITE_SUPABASE_URL` | la URL del proyecto Supabase de dev | Production + Preview |
| `VITE_SUPABASE_ANON_KEY` | la key **anon/publishable** de ese proyecto | Production + Preview |

**Cuando exista producción**, esos valores de *Production* dejan de ser los de dev: hay que reemplazarlos
por los del backend y el Supabase de prod **antes** de mover la Production Branch a `main`, no después.
El orden importa, porque el cambio de rama publica de inmediato.

### Reemplazar una variable `VITE_*` — dos trampas, las dos silenciosas (21/09/2026)

Cambiar `VITE_API_URL` al dominio nuevo del backend costó más de lo que debía. Las dos cosas que muerden:

**1 · El redeploy no es opcional.** Las `VITE_*` se **hornean en el bundle** durante el build: no las lee el
navegador en runtime, las lee `vite build`. Cambiar la variable en el dashboard y no reconstruir **no hace
absolutamente nada**, y el síntoma es el peor posible — ninguno. La app sigue funcionando, hablándole al
backend viejo, y el dashboard de Vercel muestra el valor nuevo tan tranquilo. Lo mismo vale para el CSP,
que se compila desde esa misma variable.

```bash
vercel redeploy <url-del-deployment-de-production>
```

**2 · `vercel env add` rechaza las `VITE_*` marcadas como *sensitive* en Production.** Devuelve
`invalid_visibility`, y la trampa está en el orden: para reemplazar una variable hay que hacer `rm` y
después `add`, así que cuando el `add` falla **la variable ya no existe**. Quedó ausente unos segundos. Un
build disparado en esa ventana falla ruidosamente (el build aborta a propósito si falta `VITE_API_URL`), que
es lo único bueno del asunto.

**La regla, entonces:** al reemplazar una `VITE_*` se usa **`--no-sensitive`**, y antes de redesplegar se
verifica con **`vercel env pull`** que **las tres** siguen ahí. No alcanza con mirar la que se tocó: lo que
se quiere comprobar es que el `rm`/`add` no dejó un hueco.

```bash
vercel env rm VITE_API_URL production
printf 'https://api-dev.prendo.com.co' | vercel env add VITE_API_URL production --no-sensitive
vercel env pull /tmp/.env.check           # las tres tienen que estar
vercel redeploy <url-del-deployment>      # recién ahora
```

Y la verificación final no es el dashboard: es **el bundle servido** (ver "Verificar un deploy").

> **Nunca** poner acá la `service_role` key de Supabase. Todo lo que va en una variable `VITE_*` queda **embebido en el JavaScript público** y es visible para cualquiera que abra el navegador. La única key que puede vivir en este repo es la anon/publishable, que está diseñada para ser pública y depende de RLS para la seguridad.

## Los dominios propios (21/09/2026)

Proyecto `la-legal-front-end` (id `prj_oPo2pjek9Hujoy4KHWQo53v6CQJI`, team `mateos-projects-85710491`).
El plan completo, con el porqué de cada decisión, vive en `PLAN_MARCA.md` §Fase 4.

**✅ Cerrado el 21/09.** Los cuatro hostnames de dev están vivos con TLS válido. Este es el mapa completo
—front y backend juntos—, porque es el contrato que comparten Vercel, Fly, el CSP y Supabase Auth:

| Hostname | Qué sirve hoy | Quién lo sirve | Cuando exista prod |
|---|---|---|---|
| `dev.prendo.com.co` | el front | Vercel (build de la rama `dev`) | **dev, intacto — no se mueve** |
| `api-dev.prendo.com.co` | el backend | Fly (app `compraventa-backend-dev`) | **dev, intacto — no se mueve** |
| `prendo.com.co` (apex) | redirect **308** → `dev.prendo.com.co` | Vercel | **prod** (deja de redirigir) |
| `www.prendo.com.co` | redirect **308** → `dev.prendo.com.co` | Vercel | redirect → apex |

Prod suma dos nombres nuevos (el apex para el front, `api.prendo.com.co` para el backend) y **no toca
ninguno de los dos de dev**. Esa es la propiedad entera del mapa.

**Un nombre por ambiente, no por pieza.** Se descartó apuntar el apex a dev y mudarlo después: la URL de la
app queda embebida en las Redirect URLs de Supabase, en los enlaces de invitación ya enviados, en CORS, en
el CSP y en los marcadores del cliente. Un hostname que cambia de ambiente hace que todo eso apunte, un día
cualquiera, **a otra base con datos reales** — y sin un solo error visible. Por la misma razón el backend
quedó en `api-dev.` y no en `api.`.

**Hecho en Vercel:** los tres hostnames del front agregados; el apex y `www` con redirect 308 configurado
vía `PATCH /v9/projects/{id}/domains/{domain}` de la API (**el CLI no soporta redirects**), los dos
`verified: true`. `VITE_API_URL` apuntada al backend nuevo **y redesplegada** (ver la sección anterior).

**Hecho fuera de Vercel:** los registros DNS en GoDaddy (apex A `216.198.79.1` + `64.29.17.1`; `dev` y `www`
CNAME `4cf851dda4aeceb9.vercel-dns-017.com.`; `api-dev` **A `66.241.124.156` y AAAA
`2a09:8280:1::16e:d34e:0`** — el `AAAA` no es opcional, la app de Fly tiene IPv4 compartida e IPv6
dedicada), el certificado de Fly (`flyctl certs add api-dev.prendo.com.co`), el secret `CORS_ALLOW_ORIGINS`
y la Redirect URL de Supabase. Detalle en `PLAN_MARCA.md` §Fase 4.

**Lo único abierto: el HSTS.** `dev.prendo.com.co` responde con `Strict-Transport-Security` **sin**
`includeSubDomains; preload`, mientras que el dominio viejo de Vercel sí los trae. Se endurece agregando el
header a los `headers` de `vercel.json`, junto a los otros cuatro. **Conviene hacerlo antes de que haya
datos reales de clientes**: `preload` es una lista de la que cuesta salir, así que el momento barato para
entrar es ahora.

## El CSP: por qué no está en `vercel.json`

Antes, `vercel.json` traía el CSP completo con el backend de dev **hardcodeado**:

```
connect-src 'self' https://compraventa-backend-dev.fly.dev ...
```

Eso hace imposible tener dos ambientes desde el mismo repo: `vercel.json` es estático y Vercel lo lee **antes** de correr el build, así que no puede interpolar variables. Producción heredaría un CSP que solo permite hablar con **dev** — la app quedaría rota, y de una forma difícil de diagnosticar (todas las requests fallando en el navegador, sin error de servidor).

Ahora el CSP está partido en dos, según lo que cada mecanismo permite:

- **`vite.config.ts`** (plugin `inject-csp`) genera un `<meta http-equiv="Content-Security-Policy">` en el `index.html` construido, con `connect-src`/`img-src` armados desde `VITE_API_URL` y `VITE_SUPABASE_URL`. Cada ambiente compila el suyo.
- **`vercel.json`** conserva `frame-ancestors`, `base-uri` y `form-action`, que **se ignoran en un `<meta>`** y solo valen como header HTTP.

Los dos se aplican en conjunto (el navegador exige cumplir ambos). Por eso el CSP del header **no declara `default-src`**: si lo hiciera, `connect-src` heredaría de él y bloquearía el backend pese al meta.

Si faltan las variables, el build **falla** con un mensaje explícito en vez de publicar una app que no puede hablar con su backend.

## Verificar un deploy

```bash
# 1. El CSP salió con el backend correcto para ese ambiente
curl -s <url-del-deploy> | grep -o '<meta http-equiv="Content-Security-Policy"[^>]*>'

# 2. Los headers estáticos están puestos
curl -sI <url-del-deploy> | grep -iE "content-security-policy|x-content-type|referrer-policy|strict-transport"

# 3. El bundle SERVIDO habla con el backend que corresponde (no el dashboard: el JS)
BUNDLE=$(curl -s <url-del-deploy> | grep -o '/assets/index-[^"]*\.js')
curl -s "<url-del-deploy>$BUNDLE" | grep -c 'api-dev\.prendo\.com\.co'   # > 0
curl -s "<url-del-deploy>$BUNDLE" | grep -c 'compraventa-backend-dev'      # 0
```

El chequeo 3 es el que importa después de tocar una `VITE_*`: es el único que distingue «cambié la
variable» de «reconstruí con la variable nueva». Los dos primeros pasan igual con un bundle viejo.

En el navegador: abrir la consola y confirmar que no hay errores de CSP al iniciar sesión (ahí es donde se ve si `connect-src` quedó mal — el login habla con Supabase y `GET /me` con el backend).

## Supabase: Site URL y Redirect URLs (Authentication → URL Configuration)

**Sin esto ningún usuario invitado puede entrar**, y el síntoma no dice por qué: el link del correo lleva a *"This site can't be reached"*.

El backend manda `redirect_to = {FRONTEND_URL}/auth/callback` al invitar (`app/modules/identity/auth_admin.py`). Si esa URL **no está en la lista de permitidas**, Supabase **la ignora en silencio** y manda al usuario al **Site URL** del proyecto. Con el Site URL por defecto (`http://localhost:3000`) el navegador no llega a ningún lado — y nada en el correo ni en los logs dice que el redirect fue descartado.

Por eso son **dos** campos, no uno. Configurar solo la lista y dejar el Site URL en localhost deja un fallback roto esperando.

Valores aplicados en dev el 21/08/2026:

| Campo | Valor |
|---|---|
| Site URL | `https://la-legal-front-end-git-dev-mateos-projects-85710491.vercel.app` |
| Redirect URLs | `…vercel.app/auth/callback` y `http://localhost:5173/auth/callback` |

Tiene que coincidir **exactamente** con `FRONTEND_URL` del backend (`fly secrets list --config fly.dev.toml`; el valor se lee con `fly ssh console -C "printenv FRONTEND_URL"`). Si cambian una y no la otra, vuelve el mismo síntoma.

**Sin comodín para los previews de Vercel**, por decisión: `https://…-*.vercel.app/auth/callback` funcionaría, pero significa que cualquier deploy de preview podría recibir tokens de autenticación. El alias de la rama `dev` es estable, así que no hace falta.

### El enlace ya no depende de esta lista (03/09/2026) — pero el del correo sí

El enlace que entrega **"Generar enlace"** (invitación y recuperación) ya **no** pasa por el redirect de Supabase. El backend lo arma él mismo:

```
https://<FRONTEND_URL>/auth/callback?token_hash=<hashed_token>&type=invite|recovery
```

y el front lo canjea con `verifyOtp` (POST). Como no hay redirect de GoTrue de por medio, la lista de Redirect URLs **ya no puede romper ese camino**. El cambio se hizo por otra razón —ver abajo— y esto salió de regalo.

**El correo de invitación de Supabase sí sigue dependiendo de la lista**, porque su enlace lo arma la plantilla del proyecto y no pasa por nuestro código. Ese es el camino que usa la creación de empresas (`send_email: true`).

**Estado hoy:** la URL de producción del front (`https://la-legal-front-end.vercel.app`) **NO está** en la lista. Comprobado el 03/09 pidiéndosela a `generate_link`:

| Se pidió | Supabase devolvió |
|---|---|
| `https://la-legal-front-end.vercel.app/auth/callback` | `https://la-legal-front-end-git-dev-….vercel.app` — **sin `/auth/callback`** |
| `https://la-legal-front-end-git-dev-….vercel.app/auth/callback` | igual, correcto |

Por eso `FRONTEND_URL` en Fly **debía** seguir apuntando a la URL de preview de `dev`.

> **Ya no. Corregido el 21/09/2026.** El valor real en Fly, leído del ambiente y no de un commit
> (`flyctl ssh console -a compraventa-backend-dev -C "printenv FRONTEND_URL"`), es
> **`https://la-legal-front-end.vercel.app`** — la URL que usa el cliente. El párrafo de arriba y su tabla
> quedan como registro de por qué estuvo apuntando al preview; la razón caducó cuando el canje pasó a
> `token_hash` (POST) y dejó de depender del redirect de GoTrue. Detalle en
> `../../backend-starter/docs/QA_AUDITORIA.md` §F9-02.

### El `action_link` de GoTrue es un GET de un solo uso — y media internet lo abre sola

**El bug que motivó el cambio de arriba.** Basta con *pedir* el `action_link` para consumirlo:

```bash
curl -A "WhatsApp/2.23" "$ACTION_LINK"   # → 302 …#access_token=…   (quemado)
curl "$ACTION_LINK"                      # → 302 …#error_code=otp_expired
```

Eso hacen los generadores de vista previa de WhatsApp, Telegram y Slack, y los escáneres de correo (Gmail, Outlook Safe Links, antivirus corporativos). El admin pegaba el enlace en un chat, el crawler lo quemaba al instante, y la persona llegaba sin sesión: veía el formulario de contraseña y al guardar recibía un error. Diagnóstico completo en `../../RUNBOOK_USUARIOS.md`.

**Pendiente para cerrar también el camino del correo:** cambiar la plantilla de invitación (Authentication → Emails → Templates) para que use `{{ .TokenHash }}` en vez de `{{ .ConfirmationURL }}`:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite">Crear mi contraseña</a>
```

### El correo de invitación tiene un límite de envíos

El servicio de correo **incluido** de Supabase está pensado para pruebas y limita los envíos a unos pocos por hora. Al pasarse devuelve `429` y el backend responde `INVITE_RATE_LIMITED` (429) con "espera unos minutos e invita de nuevo" — no es una falla, hay que esperar.

Mientras tanto hay una salida que no depende del correo: **"Generar enlace"** en el diálogo de invitar usuario (`send_email: false`) devuelve el mismo enlace sin enviar nada y sin consumir cuota. El admin lo entrega por WhatsApp o en persona — en una compraventa el empleado nuevo suele estar ahí mismo.

**Antes de tener usuarios reales hay que configurar un SMTP propio** (Resend, SendGrid, Amazon SES…) en Authentication → Emails → SMTP Settings. Sin eso, una compraventa que dé de alta a cinco empleados en la misma tarde se queda a mitad de camino, y los correos del servicio compartido tienen mucha más probabilidad de caer en spam.

### Cuidado: hay dos cuentas de Supabase en juego

El proyecto que usa la app es **`driyubkodnsqxbtxcmaz`** (*lagranlegal's Dev*) — es el que está en `SUPABASE_URL` del backend y en `VITE_SUPABASE_URL` del front.

El Supabase CLI de la máquina de desarrollo está autenticado con **otra cuenta** (`jaras97`), y `supabase projects list` muestra un proyecto distinto (`yinfwgmqqafyneerlrbp`) que **no tiene nada que ver** con esta app. Verificar siempre contra `SUPABASE_URL` antes de configurar nada; un `PATCH` al proyecto equivocado responde `403` si hay suerte, o cambia el proyecto equivocado si no la hay.

### NUNCA usar `supabase config push` para esto

Empuja el `config.toml` **completo** al proyecto remoto, y ese archivo es el de desarrollo local por defecto. Entre otras cosas trae `enable_signup = true`, que **reabriría los registros públicos** — el proyecto tiene `disable_signup: true` a propósito (`CLAUDE.md`: alta solo por invitación). También pisaría el Site URL con `127.0.0.1:3000` y bajaría el límite de correos a 2 por hora.

La vía correcta es un `PATCH` quirúrgico a la Management API tocando solo los campos necesarios:

```bash
# Requiere un Personal Access Token (supabase.com/dashboard/account/tokens).
# Revocarlo al terminar.
curl -X PATCH "https://api.supabase.com/v1/projects/driyubkodnsqxbtxcmaz/config/auth" \
  -H "Authorization: Bearer $SUPABASE_PAT" -H "Content-Type: application/json" \
  -d '{"site_url":"…","uri_allow_list":"…,…"}'
```

Verificar después comparando el antes y el después: los únicos campos que deben haber cambiado son esos dos.


## HSTS — por qué `includeSubDomains` sí y `preload` no (22/09/2026)

Hasta el 21/09 el header lo ponía **Vercel solo**, y para el dominio propio salía sin `includeSubDomains`:

```
dev.prendo.com.co              max-age=63072000
la-legal-front-end.vercel.app  max-age=63072000; includeSubDomains; preload
```

O sea que la URL vieja de Vercel estaba **más protegida** que el dominio propio. Ahora el header se declara
explícito en `vercel.json` con `max-age=63072000; includeSubDomains`.

**Por qué `includeSubDomains`.** Sin él, `dev.`, `api-dev.` y cualquier subdominio futuro quedan fuera: un
atacante en la red puede interceptar la primera visita a un subdominio por HTTP. Hoy los tres sirven TLS
válido (Vercel y Fly emiten y renuevan solos), así que el compromiso no cuesta nada. **Lo que sí implica:
cualquier subdominio nuevo de `prendo.com.co` tiene que servir HTTPS válido**, durante los dos años que el
navegador recuerda la directiva. Si alguna vez se apunta un subdominio a un servicio de terceros sin TLS,
va a fallar para quien ya visitó el dominio — y va a parecer un problema de DNS.

🔴 **Por qué `preload` NO, y por qué no es una omisión.** `preload` no hace nada por sí solo: es una señal de
intención, y para que sirva hay que **enviar el dominio a mano** a <https://hstspreload.org>. Lo que lo
vuelve una decisión aparte es que **salir de esa lista tarda meses** y mientras tanto el dominio entero,
con todos sus subdominios, es inalcanzable por HTTP para cualquier navegador moderno. Eso es correcto para
un dominio maduro y prematuro para uno de dos días, con el ambiente de producción **todavía sin montar**.

**Cuándo hacerlo:** después de que producción exista y lleve un tiempo estable, y **nunca** antes de estar
seguro de que ningún subdominio va a necesitar HTTP. Es un paso de un minuto el día que se decida; deshacerlo
no lo es.


## Cuando exista producción

1. Crear el proyecto Supabase de producción y aplicarle las migraciones (`supabase db push`) y el seed.
2. Configurar el Custom Access Token Hook (los claims `company_id`/`role_id` del JWT dependen de él).
3. `fly apps create compraventa-backend-prod`, cargar los secretos y `fly deploy -c fly.prod.toml`.
4. Reemplazar las tres variables de scope **Production** en Vercel por las de prod (hoy tienen los valores de dev).
5. Configurar **Site URL y Redirect URLs** del proyecto Supabase de producción con el dominio definitivo (sección anterior) — y `FRONTEND_URL` del backend de prod con ese mismo dominio. En prod el Site URL debe ser el dominio real, **nunca** un preview de Vercel.
6. Cargar `CORS_ALLOW_ORIGINS` en el backend de prod con el dominio definitivo. En prod **no hay red de seguridad**: la regex de `*.vercel.app` de `app/common/cors.py` solo aplica con `ENVIRONMENT=dev`.
7. **Recién entonces** mover la Production Branch a `main` (Settings → Git). Ese es el instante en que el apex deja de redirigir a dev y empieza a servir prod — y en que `dev.prendo.com.co` se queda, a propósito, con el ambiente de dev y su base.
8. Push a `main`.

No hace falta tocar código en ningún paso: el CSP y las URLs salen de las variables.
