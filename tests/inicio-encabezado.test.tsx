import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * Rediseño P2-c: el Inicio saluda según la hora de la EMPRESA, con el nombre
 * de pila y la fecha larga, y ofrece «Nueva venta» y «Nuevo contrato» solo a
 * quien tiene el permiso de cada una.
 */
const permisos = vi.hoisted(() => ({ list: [] as string[] }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock('@/lib/auth/me', () => ({ useMe: () => ({ data: { user: { full_name: 'Laura Martínez' } } }) }))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: (code: string) => permisos.list.includes(code) }))

const { InicioHeader } = await import('@/features/dashboard/components/InicioHeader')

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Encabezado del Inicio', () => {
  it('saluda con la hora de Bogotá y la fecha larga', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // 13:02 UTC = 8:02 a. m. en Bogotá.
    vi.setSystemTime(new Date('2026-09-30T13:02:00Z'))
    render(<InicioHeader />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Buenos días, Laura')
    expect(screen.getByText('Miércoles 30/09/2026')).toBeInTheDocument()
  })

  it('las dos acciones, cada una con su permiso', () => {
    permisos.list = ['sales.create', 'contracts.create']
    render(<InicioHeader />)
    expect(screen.getByRole('link', { name: 'Nueva venta' }).getAttribute('href')).toBe('/ventas/nueva')
    expect(screen.getByRole('link', { name: /Nuevo contrato/ }).getAttribute('href')).toBe('/contratos/nuevo')
  })

  it('sin permiso, la acción no existe', () => {
    permisos.list = ['sales.create']
    render(<InicioHeader />)
    expect(screen.getByRole('link', { name: 'Nueva venta' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Nuevo contrato/ })).toBeNull()
  })
})
