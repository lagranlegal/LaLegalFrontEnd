import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * QA 03 H-05: con el token vencido (laptop dormida), todo POST/PATCH con
 * cuerpo terminaba en un falso "No se pudo conectar con el servidor".
 *
 * El reintento tras refrescar hacía `request.clone()` sobre el Request que
 * `fetch` ya había leído; con el cuerpo consumido, `clone()` lanza
 * `TypeError` y `unwrap` lo convierte en `NetworkError`. Un GET no tiene
 * cuerpo y por eso nunca falló: el bug solo se veía en abonos, ventas y
 * contratos — justo las operaciones de dinero.
 *
 * El `fetch` falso LEE el cuerpo, como el real: sin eso el test no
 * reproduciría nada.
 */

const refreshSession = vi.fn()
const signOut = vi.fn()

vi.mock('@/lib/auth/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { access_token: 'token-vencido' } } }),
      refreshSession: () => refreshSession(),
      signOut: () => signOut(),
    },
  },
}))

interface Llamada {
  method: string
  auth: string | null
  body: string
}
const llamadas: Llamada[] = []
const respuestas: Response[] = []

vi.stubGlobal('fetch', async (input: Request) => {
  llamadas.push({ method: input.method, auth: input.headers.get('Authorization'), body: await input.text() })
  return respuestas.shift() ?? new Response('{}', { status: 500 })
})

const { api, unwrap } = await import('@/lib/api/client')

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  llamadas.length = 0
  respuestas.length = 0
  refreshSession.mockReset()
  signOut.mockReset()
})

describe('401 → refrescar y reintentar una vez', () => {
  it('un POST con cuerpo se reintenta con el MISMO cuerpo y el token nuevo', async () => {
    refreshSession.mockResolvedValue({ data: { session: { access_token: 'token-nuevo' } }, error: null })
    respuestas.push(
      json(401, { code: 'UNAUTHORIZED', message: 'Token expirado.', details: {} }),
      json(201, { id: 'venta-1', number: 21 }),
    )
    const cuerpo = { payment_method: 'cash', lines: [{ item_id: 'a1', quantity: '1', unit_price: '1000.00' }] }

    const venta = await unwrap(api.POST('/api/v1/sales', { body: cuerpo as never }))

    expect(venta).toEqual({ id: 'venta-1', number: 21 })
    expect(llamadas).toHaveLength(2)
    expect(llamadas[1]).toEqual({ method: 'POST', auth: 'Bearer token-nuevo', body: JSON.stringify(cuerpo) })
    expect(signOut).not.toHaveBeenCalled()
  })

  it('si el refresh falla, cierra sesión y devuelve el 401 (no un error de red)', async () => {
    refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('refresh inválido') })
    respuestas.push(json(401, { code: 'UNAUTHORIZED', message: 'Token expirado.', details: {} }))

    await expect(unwrap(api.POST('/api/v1/sales', { body: {} as never }))).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
    expect(signOut).toHaveBeenCalled()
    expect(llamadas).toHaveLength(1)
  })
})
