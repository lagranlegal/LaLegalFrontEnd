import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import fixtures from './fixtures/backend-f1.json'

// Respuesta real del backend local: dos ventas por 800.000 y una devolución
// de 300.000 el mismo día (F7-07). `today_total` ya viene neto.
let DASHBOARD: unknown = fixtures.dashboard_devolucion.body

vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }))
// Con `reports.view`: sin él el Inicio ni pide el resumen (issue #9).
vi.mock('@/lib/auth/me', () => ({ useMe: () => ({ data: { user: { full_name: 'Ana' }, permissions: ['reports.view'] } }) }))
vi.mock('@/features/dashboard/api', () => ({
  useDashboard: () => ({ data: DASHBOARD, isPending: false, isError: false }),
  useReadyForAuction: () => ({ data: [] }),
}))

const { DashboardPage } = await import('@/features/dashboard/pages/DashboardPage')
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ')

afterEach(cleanup)

describe('dashboard — ventas netas de devoluciones (F7-07)', () => {
  it('muestra la cifra neta y, debajo, el bruto y lo devuelto', () => {
    render(<DashboardPage />)
    const hoy = text(screen.getByText('Ventas de hoy').parentElement)
    expect(hoy).toContain('$ 500.000')
    expect(hoy).toContain('$ 800.000 vendidas − $ 300.000 devueltas')
  })

  it('sin devoluciones no agrega el detalle', () => {
    const body = fixtures.dashboard_devolucion.body
    DASHBOARD = { ...body, sales: { ...body.sales, today_total: '800000.00', today_returns: '0.00', month_total: '800000.00', month_returns: '0.00' } }
    render(<DashboardPage />)
    expect(text(screen.getByText('Ventas de hoy').parentElement)).not.toContain('devueltas')
  })
})
