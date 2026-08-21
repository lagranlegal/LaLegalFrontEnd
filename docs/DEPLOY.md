# Despliegue en Vercel — ambientes dev y producción

> Estado al 20/08/2026: **solo existe el ambiente dev**. No hay backend ni proyecto Supabase de producción todavía (`compraventa-backend-prod` no está creada en Fly y solo hay un proyecto Supabase). La configuración de este documento deja producción lista para activarse llenando variables, sin tocar código.

## Cómo Vercel decide el ambiente

Vercel no tiene "ambientes" que uno cree a mano: los deduce de la rama.

| Rama | Ambiente de Vercel | URL |
|---|---|---|
| La configurada como **Production Branch** (`main`) | Production | el dominio de producción |
| Cualquier otra rama con deploy habilitado (`dev`) | Preview | URL estable por rama, tipo `<proyecto>-git-dev-<equipo>.vercel.app` |

**La URL de rama es estable**: no cambia con cada commit (eso son las URLs por deployment, que también existen pero son otras). Así que `…-git-dev-….vercel.app` sirve perfectamente como "el ambiente dev" y se le puede asignar un dominio propio si se quiere.

`vercel.json` restringe qué ramas despliegan:

```json
"git": { "deploymentEnabled": { "main": true, "dev": true } }
```

Cualquier otra rama que se empuje **no** genera deployment. Sin esto, cada rama de trabajo crearía previews consumiendo builds.

## Configuración en el dashboard (una sola vez)

### 1. Production Branch

**Settings → Git → Production Branch** → `main`.

Es lo que garantiza lo que pediste: que `dev` **nunca** despliegue a producción. Si quedara en `dev`, cada push a `dev` publicaría en el dominio de producción.

### 2. Variables de entorno

**Settings → Environment Variables.** Las tres son necesarias; **el build falla a propósito** si falta `VITE_API_URL` o `VITE_SUPABASE_URL` (ver "El CSP" abajo).

Al crear cada variable, Vercel pide en qué ambientes aplica. Marcar **solo** el que corresponde:

**Ambiente dev** — marcar únicamente `Preview`:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://compraventa-backend-dev.fly.dev` |
| `VITE_SUPABASE_URL` | la URL del proyecto Supabase de dev |
| `VITE_SUPABASE_ANON_KEY` | la key **anon/publishable** de ese proyecto |

**Ambiente producción** — marcar únicamente `Production`. Se llenan cuando exista el backend de producción; hasta entonces, `main` no debería desplegarse (el build fallaría con el mensaje del CSP, que es el comportamiento deseado: mejor un build rojo que una app publicada sin poder hablar con su backend).

> **Nunca** poner acá la `service_role` key de Supabase. Todo lo que va en una variable `VITE_*` queda **embebido en el JavaScript público** y es visible para cualquiera que abra el navegador. La única key que puede vivir en este repo es la anon/publishable, que está diseñada para ser pública y depende de RLS para la seguridad.

### 3. Opcional: dominio propio para dev

**Settings → Domains** → agregar (por ejemplo) `dev.tudominio.com` y asignarlo a la rama `dev`. Solo cosmético; la URL `-git-dev-` ya funciona.

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
curl -sI <url-del-deploy> | grep -iE "content-security-policy|x-content-type|referrer-policy"
```

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

### El correo de invitación tiene un límite de envíos

El servicio de correo **incluido** de Supabase está pensado para pruebas y limita los envíos a unos pocos por hora. Al pasarse devuelve `429` y el backend responde `INVITE_RATE_LIMITED` (429) con "espera unos minutos e invita de nuevo" — no es una falla, hay que esperar.

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

## Cuando exista producción

1. Crear el proyecto Supabase de producción y aplicarle las migraciones (`supabase db push`) y el seed.
2. Configurar el Custom Access Token Hook (los claims `company_id`/`role_id` del JWT dependen de él).
3. `fly apps create compraventa-backend-prod`, cargar los secretos y `fly deploy -c fly.prod.toml`.
4. Llenar las tres variables en scope **Production** en Vercel.
5. Configurar **Site URL y Redirect URLs** del proyecto Supabase de producción con el dominio definitivo (sección anterior) — y `FRONTEND_URL` del backend de prod con ese mismo dominio. En prod el Site URL debe ser el dominio real, **nunca** un preview de Vercel.
6. Push a `main`.

No hace falta tocar código en ningún paso: el CSP y las URLs salen de las variables.
