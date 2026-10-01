import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import fixtures from './fixtures/backend-p2c.json'

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
  useNavigate: () => vi.fn(),
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
    // Sin `contracts.view` tampoco pide «Para hoy» (P2-c).
    expect(rutasPedidas()).not.toContain('/api/v1/contracts/attention')
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

describe('Inicio por rol (rediseño P2-c)', () => {
  const respuestas: Record<string, unknown> = {
    '/api/v1/contracts/attention': fixtures.attention.body,
    '/api/v1/reports/dashboard': fixtures.dashboard_comparado.body,
  }
  const responder = (ruta: string) => Promise.resolve({ data: respuestas[ruta] ?? null })

  it('Asesor: encabezado, «Para hoy» y «Requieren acción», sin KPIs ni pedidos de reportes', async () => {
    permisos.list = ['contracts.view', 'contracts.create', 'sales.create', 'cashbox.view']
    get.mockImplementation(responder)
    renderizar(<DashboardPage />)
    expect(await screen.findByRole('region', { name: 'Requieren acción' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Para hoy' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Nuevo contrato/ })).toBeInTheDocument()
    expect(rutasPedidas()).toContain('/api/v1/contracts/attention')
    expect(rutasPedidas()).not.toContain('/api/v1/reports/dashboard')
    expect(rutasPedidas()).not.toContain('/api/v1/contracts/ready-for-auction')
    expect(screen.queryByText('Cartera activa')).toBeNull()
    expect(screen.queryByText('Contratos por estado')).toBeNull()
    // Con contratos no lleva los accesos directos: el Inicio ya tiene tareas.
    expect(screen.queryByRole('navigation', { name: 'Accesos directos' })).toBeNull()
  })

  it('Admin: todo, con los KPIs y la barra por estado', async () => {
    permisos.list = ['contracts.view', 'reports.view', 'contracts.auction']
    get.mockImplementation(responder)
    renderizar(<DashboardPage />)
    expect(await screen.findByText('Cartera activa')).toBeInTheDocument()
    expect(await screen.findByText('Contratos por estado')).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Requieren acción' })).toBeInTheDocument()
    expect(rutasPedidas()).toEqual(expect.arrayContaining(['/api/v1/contracts/attention', '/api/v1/reports/dashboard']))
  })
})
