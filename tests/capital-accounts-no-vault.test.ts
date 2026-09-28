import { describe, expect, it } from 'vitest'
import { capitalEligibleAccounts } from '@/features/capital/eligibleAccounts'
import type { Account } from '@/lib/accounts/list'

/**
 * G-02: el diálogo de aporte/retiro ofrecía la caja fuerte (`vault`) y el
 * backend la rechaza. La regla exacta (capital/service.py::_registrar):
 * `_validar_cuenta` rechaza `settlement` (ACCOUNT_CANNOT_FUND_PAYMENT) y
 * `cashbox_integration.resolve_account_for_movement` rechaza `vault` en las
 * DOS direcciones (ACCOUNT_NOT_OPERATIONAL): a la caja fuerte solo se entra
 * y se sale por traslado. Quedan `cash` y `bank` activas.
 */
function cuenta(id: string, type: string, active = true): Account {
  return { id, name: id, type, active, balance: '0.00' } as unknown as Account
}

describe('capitalEligibleAccounts', () => {
  it('ofrece cajón y banco activos, nunca caja fuerte ni convenio', () => {
    const elegibles = capitalEligibleAccounts([
      cuenta('cajon', 'cash'),
      cuenta('banco', 'bank'),
      cuenta('fuerte', 'vault'),
      cuenta('sistecredito', 'settlement'),
      cuenta('banco-viejo', 'bank', false),
    ])
    expect(elegibles.map((a) => a.id)).toEqual(['cajon', 'banco'])
  })
})
