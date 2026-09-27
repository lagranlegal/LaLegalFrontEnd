import createFetchClient from 'openapi-fetch'
import type { paths } from '@/types/api'
import { supabase } from '@/lib/auth/supabase'
import { ApiError, NetworkError, parseApiError } from '@/lib/api/errors'

/**
 * Única puerta a la API (docs/ARCHITECTURE.md §3). Ninguna feature hace
 * `fetch` directo — todas pasan por `api` (tipado desde `src/types/api.ts`,
 * generado con `npm run gen:api`) o por `unwrap()` más abajo.
 */
// Las rutas de `paths` (generadas por gen:api) ya incluyen el prefijo
// "/api/v1" tal como está en el openapi.json del backend — el baseUrl NO lo
// repite (si no, cada request queda como /api/v1/api/v1/...).
export const api = createFetchClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL,
})

/**
 * Copia intacta de cada request, tomada ANTES de enviarlo, para poder
 * reintentarlo tras un 401.
 *
 * POR QUÉ (QA 03 H-05): `fetch` consume el cuerpo del Request, así que el
 * `request.clone()` que se hacía en `onResponse` lanzaba `TypeError` en todo
 * POST/PATCH/PUT, y `unwrap` lo mostraba como "No se pudo conectar con el
 * servidor". Con el token vencido (la laptop dormida), el primer abono,
 * venta o contrato del día fallaba con un falso error de red. Un GET no tiene
 * cuerpo y por eso nunca se notó. `WeakMap` para que la copia se vaya con el
 * request: sin limpieza manual ni fuga si la red falla.
 */
const paraReintentar = new WeakMap<Request, Request>()

api.use({
  async onRequest({ request }) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      request.headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    paraReintentar.set(request, request.clone())
    return request
  },
  async onResponse({ request, response }) {
    if (response.status !== 401) return response

    // 401 con sesión aparentemente válida: refrescar y reintentar UNA vez
    // (docs/ARCHITECTURE.md §4.6). Si el refresh falla, cerrar sesión.
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data.session) {
      await supabase.auth.signOut()
      return response
    }

    const retryRequest = paraReintentar.get(request) ?? request.clone()
    paraReintentar.delete(request)
    retryRequest.headers.set('Authorization', `Bearer ${data.session.access_token}`)
    const retryResponse = await fetch(retryRequest)

    // "Si persiste" (§4.6): el refresh funcionó (la sesión de Supabase es
    // válida) pero el backend igual rechaza con 401 — significa que
    // usuario/empresa están inactivos del lado del backend, no que el
    // token expiró. Cerrar sesión de verdad acá: si solo redirigiéramos a
    // /auth/login dejando la sesión de Supabase viva, el guard de esa ruta
    // ("si ya hay sesión, redirige a /") rebotaría de vuelta a la ruta
    // protegida — loop infinito entre / y /auth/login.
    if (retryResponse.status === 401) {
      await supabase.auth.signOut()
    }
    return retryResponse
  },
})

interface RawResult<T> {
  data?: T
  error?: unknown
  response: Response
}

/**
 * Desenvuelve una llamada de `api.GET/POST/...`: retorna `data` o lanza
 * `ApiError`/`NetworkError`. Pensado para usarse dentro de `queryFn`/
 * `mutationFn` de TanStack Query, que ya sabe manejar promesas rechazadas.
 */
export async function unwrap<T>(promise: Promise<RawResult<T>>): Promise<T> {
  let result: RawResult<T>
  try {
    result = await promise
  } catch (cause) {
    throw new NetworkError(cause)
  }
  if (result.error !== undefined) {
    throw parseApiError(result.response.status, result.error)
  }
  return result.data as T
}

export { ApiError, NetworkError }
