import createFetchClient from 'openapi-fetch'
import type { paths } from '@/types/api'
import { supabase } from '@/lib/auth/supabase'
import { ApiError, NetworkError, parseApiError } from '@/lib/api/errors'

/**
 * Única puerta a la API (docs/ARCHITECTURE.md §3). Ninguna feature hace
 * `fetch` directo — todas pasan por `api` (tipado desde `src/types/api.ts`,
 * generado con `npm run gen:api`) o por `unwrap()` más abajo.
 */
export const api = createFetchClient<paths>({
  baseUrl: `${import.meta.env.VITE_API_URL}/api/v1`,
})

api.use({
  async onRequest({ request }) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      request.headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    return request
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
