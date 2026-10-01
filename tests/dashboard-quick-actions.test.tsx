import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ApiError } from '@/lib/api/errors'

/**
 * F9-60: sin `reports.view`, el Inicio muestra accesos directos a lo que el
 * rol sí puede hacer, no una pantalla vacía. Solo los que su permiso deja.
 */
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))
vi.mock('@/lib/auth/me', () => ({ useMe: () => ({ data: { user: { full_name: 'Asesor' } } }) }))
// Sin `contracts.view` ni `reports.view`: con contratos, el Inicio ya tiene
// «Para hoy» y «Requieren acción» (rediseño P2-c) y no lleva accesos.
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: (code: string) => ['contracts.create', 'customers.view', 'sales.create'].includes(code) }))
vi.mock('@/features/dashboard/api', () => ({
  useDashboard: () => ({
    data: undefined,
    isPending: false,
    isError: true,
    error: new ApiError({ status: 403, code: 'PERMISSION_DENIED', message: 'x' }),
    refetch: vi.fn(),
  }),
  useContractAttention: () => ({ data: undefined, isPending: true, error: null, refetch: vi.fn() }),
}))

const { DashboardPage } = await import('@/features/dashboard/pages/DashboardPage')
afterEach(cleanup)

describe('Inicio sin reportes', () => {
  it('accesos a lo que el rol puede hacer, y nada más', () => {
    render(<DashboardPage />)
    // Las dos puertas del mostrador van en el encabezado, una sola vez (P2-c).
    expect(screen.getByRole('link', { name: /Nuevo contrato/ }).getAttribute('href')).toBe('/contratos/nuevo')
    expect(screen.getByRole('link', { name: /Nueva venta/ }).getAttribute('href')).toBe('/ventas/nueva')
    expect(screen.getByRole('link', { name: /^Clientes/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Contratos/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Caja/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Nuevo ingreso/ })).toBeNull()
  })
})
