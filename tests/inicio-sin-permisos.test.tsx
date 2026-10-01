import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * El Inicio del Asesor y de Bodega pedía `/reports/dashboard`,
 * `/contracts/ready-for-auction` y `/cashbox/sessions/current` aunque ya sabía
 * que el rol no tenía esos permisos: tres 403 evitables en cada carga. Y el
 * acceso «Caja» prometía «Abrir, ver o cerrar el turno» a quien no puede abrirla.
 */
const get = vi.fn()
const permisos = vi.hoisted(() => ({ list: [] as string[] }))

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
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))
vi.mock('@/lib/auth/me', () => ({ useMe: () => ({ data: { user: { full_name: 'Asesor' }, permissions: permisos.list } }) }))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: (code: string) => permisos.list.includes(code) }))
vi.mock('@/features/cashbox/components/OpenSessionDialog', () => ({ OpenSessionDialog: () => null }))

const { DashboardPage } = await import('@/features/dashboard/pages/DashboardPage')
const { CashSessionBanner } = await import('@/components/shared/CashSessionBanner')

function renderizar(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

function rutasPedidas(): unknown[] {
  return get.mock.calls.map((c) => c[0])
}

afterEach(() => {
  cleanup()
  get.mockReset()
  permisos.list = []
})

describe('Inicio sin reportes, remate ni caja', () => {
  it('Bodega: no pide el resumen, el remate ni la caja, y muestra sus accesos', async () => {
    permisos.list = ['inventory.create']
    renderizar(
      <>
        <CashSessionBanner />
        <DashboardPage />
      </>,
    )
    expect(await screen.findByRole('link', { name: /Nuevo ingreso/ })).toBeInTheDocument()
    expect(rutasPedidas()).not.toContain('/api/v1/reports/dashboard')
    expect(rutasPedidas()).not.toContain('/api/v1/contracts/ready-for-auction')
    expect(rutasPedidas()).not.toContain('/api/v1/cashbox/sessions/current')
    // Sin `cashbox.view` la franja no afirma nada (ni se queda cargando).
    expect(screen.queryByText(/Caja (abierta|cerrada)/)).toBeNull()
  })

  it('quien ve la caja pero no la abre: el acceso «Caja» no le ofrece abrirla', async () => {
    // Sin `contracts.view`: con él, el Inicio lleva «Para hoy» y no accesos (P2-c).
    permisos.list = ['cashbox.view']
    get.mockResolvedValue({ data: null })
    renderizar(<DashboardPage />)
    const caja = await screen.findByRole('link', { name: /Caja/ })
    expect(caja.textContent).not.toMatch(/Abrir/)
    expect(rutasPedidas()).not.toContain('/api/v1/reports/dashboard')
  })

  it('quien abre y cierra la caja sí ve «Abrir, ver o cerrar el turno»', async () => {
    permisos.list = ['cashbox.view', 'cashbox.open_close']
    get.mockResolvedValue({ data: null })
    renderizar(<DashboardPage />)
    expect((await screen.findByRole('link', { name: /Caja/ })).textContent).toMatch(/Abrir, ver o cerrar el turno/)
  })
})
