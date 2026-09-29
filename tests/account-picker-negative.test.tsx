import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

/**
 * Respuesta REAL de `GET /accounts` del backend local
 * (`test_accounts.py::test_accounts_start_with_cash_and_bank`), con el saldo
 * de la caja llevado a negativo — el único campo cambiado.
 */
const CUENTAS = [
  { id: '7654af51-6f51-4e3e-8857-d33dbd89b2ea', name: 'Caja principal', type: 'cash', reference: null, is_default: true, active: true, opening_balance: '0.00', balance: '-35000.00', created_at: '2026-09-29T02:19:55.635133Z' },
  { id: '172382c3-e300-4f4a-a8e5-831683dadfee', name: 'Transferencias', type: 'bank', reference: null, is_default: true, active: true, opening_balance: '0.00', balance: '0.00', created_at: '2026-09-29T02:19:55.635133Z' },
]

vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: CUENTAS, isPending: false, error: null }) }))
const { AccountPicker } = await import('@/components/shared/AccountPicker')

afterEach(cleanup)

describe('POS — cuenta de efectivo con saldo negativo', () => {
  it('avisa si la cuenta elegida está en negativo', () => {
    render(<AccountPicker paymentMethod="cash" value={CUENTAS[0]!.id} onChange={() => {}} warnNegativeBalance />)
    expect(screen.getByRole('alert').textContent).toMatch(/Caja principal.*saldo negativo/)
  })

  it('con saldo en cero, o sin pedir el aviso, no dice nada', () => {
    render(<AccountPicker paymentMethod="transfer" value={CUENTAS[1]!.id} onChange={() => {}} warnNegativeBalance />)
    expect(screen.queryByRole('alert')).toBeNull()
    cleanup()
    render(<AccountPicker paymentMethod="cash" value={CUENTAS[0]!.id} onChange={() => {}} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
