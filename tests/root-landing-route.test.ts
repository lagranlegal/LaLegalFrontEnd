import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory } from '@tanstack/react-router'

/**
 * `/` es la landing pública de venta y `/inicio` la entrada a la app.
 *
 * Lo que este test cuida: antes `/` era el dashboard, hijo del layout
 * protegido, y un visitante sin sesión terminaba en el login. La landing no
 * puede heredar ese guard — y el dashboard, ya en `/inicio`, sí.
 */

const getSession = vi.fn()

vi.mock('@/lib/auth/supabase', () => ({
  initialUrl: '',
  supabase: { auth: { getSession: () => getSession(), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } },
}))

const { createAppRouter } = await import('@/app/router')

async function navegarA(path: string) {
  const router = createAppRouter(new QueryClient())
  router.update({ ...router.options, history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router.state.location.pathname
}

beforeEach(() => {
  getSession.mockReset()
  getSession.mockResolvedValue({ data: { session: null } })
})

describe('rutas de entrada', () => {
  it('`/` sin sesión se queda en la landing, no redirige al login', async () => {
    expect(await navegarA('/')).toBe('/')
  })

  it('`/inicio` sin sesión sí redirige al login', async () => {
    expect(await navegarA('/inicio')).toBe('/auth/login')
  })
})
