import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * «Nuevo gasto» preguntaba «¿Descartar lo escrito?» sin haber escrito nada:
 * `AccountPicker` preselecciona la cuenta predeterminada, y como lo hacía con
 * el `field.onChange` del formulario, React Hook Form marcaba `account_id`
 * como sucio. Una preselección no es algo que la persona escribió.
 */

/** Respuesta real de `GET /accounts` (`test_accounts.py::test_accounts_start_with_cash_and_bank`). */
const CUENTAS = [
  { id: '7654af51-6f51-4e3e-8857-d33dbd89b2ea', name: 'Caja principal', type: 'cash', reference: null, is_default: true, active: true, opening_balance: '0.00', balance: '0.00', created_at: '2026-09-29T02:19:55.635133Z' },
  { id: '172382c3-e300-4f4a-a8e5-831683dadfee', name: 'Transferencias', type: 'bank', reference: null, is_default: true, active: true, opening_balance: '0.00', balance: '0.00', created_at: '2026-09-29T02:19:55.635133Z' },
]

const confirmMock = vi.hoisted(() => vi.fn(async (_o: unknown) => ({ confirmed: false })))
vi.mock('@/components/shared/confirmStore', () => ({ confirm: confirmMock }))
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: CUENTAS, isPending: false, error: null }) }))
vi.mock('@/features/cashbox/api', () => ({
  useCreateExpense: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateExpenseCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useExpenseCategories: () => ({ data: [] }),
}))
vi.mock('@/components/shared/CashClosedNotice', () => ({ CashClosedNotice: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/PhotoUploader', () => ({ PhotoUploader: () => null }))

const { ExpenseFormDialog } = await import('@/features/cashbox/components/ExpenseFormDialog')

afterEach(() => {
  cleanup()
  confirmMock.mockClear()
})

describe('Nuevo gasto — descartar', () => {
  it('sin tocar nada, Escape cierra sin preguntar (la cuenta preseleccionada no ensucia)', async () => {
    const onOpenChange = vi.fn()
    render(<ExpenseFormDialog open onOpenChange={onOpenChange} />)
    // La preselección sí ocurrió: la cuenta de efectivo quedó elegida.
    expect(await screen.findByText('Caja principal')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(confirmMock).not.toHaveBeenCalled()
  })

  it('con algo escrito, sigue preguntando', async () => {
    const onOpenChange = vi.fn()
    render(<ExpenseFormDialog open onOpenChange={onOpenChange} />)
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Papelería' } })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(confirmMock).toHaveBeenCalledOnce())
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
