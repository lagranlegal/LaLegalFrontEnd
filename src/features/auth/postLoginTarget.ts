/**
 * Destino después de entrar (login o contraseña recién creada).
 *
 * `/` es la landing pública de venta, no la app: la entrada a la app es
 * `/inicio`. El `redirect` del search lo arman los guards con `location.href`
 * (ruta + query + hash, sin origen), así que un usuario que abrió `/` y fue
 * mandado al login trae `redirect=/` — y devolverlo ahí lo dejaría en la
 * landing con la sesión ya abierta. Tampoco se acepta nada que no sea una ruta
 * interna (`//otro-sitio`, `https://…`): el search lo puede escribir cualquiera.
 */
export const APP_HOME = '/inicio'

export function postLoginTarget(redirect: string | undefined): string {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) return APP_HOME
  const path = redirect.split(/[?#]/, 1)[0]
  if (path === '/' || path === '') return APP_HOME
  return redirect
}
