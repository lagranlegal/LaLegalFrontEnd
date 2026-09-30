import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ApiError } from '@/lib/api/client'

/**
 * F9-19: con la caja cerrada, una operación de dinero en EFECTIVO avisa antes
 * de llenar el formulario (con «Abrir caja» si hay permiso). Por banco no se
 * avisa: quien exige el turno es la cuenta de efectivo, no la operación. Y sin
 * saber el estado (cargando, sin permiso, error) no se afirma nada.
 */

const cashbox = vi.hoisted(() => ({ current: { data: null as unknown, isPending: false, error: null as unknown } }))
const permisos = vi.hoisted(() => ({ list: ['cashbox.open_close'] as string[] }))

vi.mock('@/features/cashbox/api', () => ({ useCashboxCurrent: () => cashbox.current }))
vi.mock('@/features/cashbox/components/OpenSessionDialog', () => ({ OpenSessionDialog: () => null }))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: (code: string) => permisos.list.includes(code) }))

const { CashClosedNotice } = await import('@/components/shared/CashClosedNotice')

afterEach(() => {
  cleanup()
  cashbox.current = { data: null, isPending: false, error: null }
  permisos.list = ['cashbox.open_close']
})

describe('CashClosedNotice', () => {
  it('efectivo con la caja cerrada: avisa y ofrece abrirla', () => {
    render(<CashClosedNotice paymentMethod="cash" />)
    expect(screen.getByText('La caja está cerrada')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Abrir caja' })).toBeTruthy()
  })

  it('sin permiso para abrir, dice a quién pedírselo en vez del botón', () => {
    permisos.list = []
    render(<CashClosedNotice paymentMethod="cash" />)
    expect(screen.queryByRole('button', { name: 'Abrir caja' })).toBeNull()
    expect(screen.getByText(/Pídele a un responsable/)).toBeTruthy()
  })

  it('por transferencia u otro medio no avisa: no pasa por el cajón', () => {
    const { container, rerender } = render(<CashClosedNotice paymentMethod="transfer" />)
    expect(container.textContent).toBe('')
    rerender(<CashClosedNotice paymentMethod="other" />)
    expect(container.textContent).toBe('')
  })

  it('con la caja abierta, cargando, sin permiso de ver o con error, no afirma nada', () => {
    const casos = [
      { data: { id: 's1' }, isPending: false, error: null },
      { data: undefined, isPending: true, error: null },
      { data: undefined, isPending: false, error: new ApiError({ status: 403, code: 'FORBIDDEN', message: 'x' }) },
      { data: undefined, isPending: false, error: new Error('red') },
    ]
    for (const caso of casos) {
      cashbox.current = caso
      const { container } = render(<CashClosedNotice paymentMethod="cash" />)
      expect(container.textContent).toBe('')
      cleanup()
    }
  })
})
