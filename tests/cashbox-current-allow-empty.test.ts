import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'

/**
 * Con la caja cerrada, `GET /cashbox/sessions/current` respondía 404 en cada
 * navegación: un «Failed to load resource» en la consola del 100 % de las
 * sesiones con caja cerrada. El backend acepta `?allow_empty=true` y responde
 * `200 null` (F9-03). El 404 se sigue entendiendo como «cerrada»: el
 * parámetro es opt-in y un backend anterior lo ignora.
 */
const get = vi.fn()

vi.mock('@/lib/api/client', async () => {
  const errors = await import('@/lib/api/errors')
  return {
    api: { GET: (...a: unknown[]) => get(...a) },
    unwrap: async (p: Promise<unknown>) => {
      const r = (await p) as { data?: unknown; error?: unknown }
      if (r.error) throw r.error
      return r.data
    },
    ApiError: errors.ApiError,
    NetworkError: errors.NetworkError,
  }
})

const { cashboxCurrentQueryOptions } = await import('@/features/cashbox/api')

function consultar() {
  const fn = cashboxCurrentQueryOptions().queryFn as unknown as () => Promise<unknown>
  return fn()
}

beforeEach(() => get.mockReset())

describe('sesión de caja actual', () => {
  it('pide con allow_empty=true y toma el 200 null como caja cerrada', async () => {
    get.mockResolvedValue({ data: null })
    await expect(consultar()).resolves.toBeNull()
    expect(get).toHaveBeenCalledWith('/api/v1/cashbox/sessions/current', { params: { query: { allow_empty: true } } })
  })

  it('un backend que todavía responde 404 CASH_SESSION_NOT_OPEN sigue siendo «cerrada»', async () => {
    get.mockResolvedValue({ error: new ApiError({ status: 404, code: 'CASH_SESSION_NOT_OPEN', message: 'No hay caja abierta' }) })
    await expect(consultar()).resolves.toBeNull()
  })

  it('cualquier otra falla no es «cerrada»', async () => {
    get.mockResolvedValue({ error: new ApiError({ status: 403, code: 'PERMISSION_DENIED', message: 'x' }) })
    await expect(consultar()).rejects.toBeInstanceOf(ApiError)
  })
})
