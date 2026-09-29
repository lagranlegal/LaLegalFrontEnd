import { describe, expect, it } from 'vitest'
import fixtures from './fixtures/backend-f1.json'
import { contractsExportRows } from '@/features/contracts/export'
import type { Contract } from '@/features/contracts/api'

// Contratos REALES del backend local, uno por estado (ver `_test` del
// fixture): el rematado y el sucedido conservan capital_balance en la base.
const porEstado = fixtures.contratos_por_estado.body as unknown as Record<string, Contract>

describe('Excel de Contratos — saldo y total de cartera (F7-10)', () => {
  const rows = contractsExportRows(Object.values(porEstado), new Map())

  it('rematados y sucedidos por un recargo van con saldo 0', () => {
    expect(Number(porEstado.auctioned!.capital_balance)).toBeGreaterThan(0)
    expect(Number(porEstado.superseded!.capital_balance)).toBeGreaterThan(0)
    expect(rows.filter((r) => r.Cliente !== 'TOTAL EN CARTERA' && r['Saldo en cartera'] === 0)).toHaveLength(2)
  })

  it('la fila de total suma solo la cartera viva (vigente + prórroga)', () => {
    const total = rows.at(-1)!
    expect(total.Cliente).toBe('TOTAL EN CARTERA')
    expect(total['Saldo en cartera']).toBe(Number(porEstado.active!.capital_balance) + Number(porEstado.in_extension!.capital_balance))
  })
})
