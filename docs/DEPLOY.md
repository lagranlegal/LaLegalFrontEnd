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

## Cuando exista producción

1. Crear el proyecto Supabase de producción y aplicarle las migraciones (`supabase db push`) y el seed.
2. Configurar el Custom Access Token Hook (los claims `company_id`/`role_id` del JWT dependen de él).
3. `fly apps create compraventa-backend-prod`, cargar los secretos y `fly deploy -c fly.prod.toml`.
4. Llenar las tres variables en scope **Production** en Vercel.
5. Push a `main`.

No hace falta tocar código en ningún paso: el CSP y las URLs salen de las variables.
