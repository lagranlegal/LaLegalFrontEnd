import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory } from '@tanstack/react-router'

/**
 * F9-59: quien abre una pantalla sin permiso (un enlace compartido, un
 * favorito) vuelve al Inicio con un aviso, no en silencio.
 */
const toastInfo = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast: { info: toastInfo, success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/auth/supabase', () => ({
  initialUrl: '',
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 't', user: { app_metadata: {} } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}))

const { createAppRouter } = await import('@/app/router')
const { meQueryOptions } = await import('@/lib/auth/me')

async function navegarA(path: string, permissions: string[]) {
  const qc = new QueryClient()
  qc.setQueryData(meQueryOptions().queryKey, {
    user: { id: 'u1', full_name: 'Asesor', email: 'a@x.co' },
    company: { id: 'c1', name: 'ZZ QA', timezone: 'America/Bogota', status: 'active' },
    permissions,
  } as never)
  const router = createAppRouter(qc)
  router.update({ ...router.options, history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router.state.location.pathname
}

beforeEach(() => toastInfo.mockReset())

describe('ruta sin permiso', () => {
  it('redirige al Inicio y avisa por qué', async () => {
    expect(await navegarA('/clientes', [])).toBe('/inicio')
    expect(toastInfo).toHaveBeenCalledWith('No tienes permiso para abrir esa pantalla.', expect.objectContaining({ id: 'forbidden-route' }))
  })

  it('con el permiso entra y no avisa', async () => {
    expect(await navegarA('/clientes', ['customers.view'])).toBe('/clientes')
    expect(toastInfo).not.toHaveBeenCalled()
  })
})
