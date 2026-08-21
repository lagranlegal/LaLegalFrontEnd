import { describe, expect, it } from 'vitest'
import { accountTypeLabel, defaultAccountTypeFor } from '@/lib/accounts/types'
import { paymentMethodLabel } from '@/lib/paymentMethods'
import { aggregateFinancialSummary } from '@/features/reports/aggregate'
import type { SessionReport } from '@/features/cashbox/api'

function report(lines: SessionReport['lines']): SessionReport {
  return { session_id: 's1', status: 'closed', opening_balance: '0.00', expected_cash: '0.00', lines }
}

describe('defaultAccountTypeFor', () => {
  it('efectivo va al cajón; todo lo demás a una cuenta bancaria', () => {
    expect(defaultAccountTypeFor('cash')).toBe('cash')
    expect(defaultAccountTypeFor('transfer')).toBe('bank')
    expect(defaultAccountTypeFor('other')).toBe('bank')
  })

  it('replica lo que hace el backend cuando el front no manda account_id', () => {
    // Si esta correspondencia se desincroniza de
    // `resolve_account_for_movement`, la UI preseleccionaría una cuenta y el
    // backend usaría otra — el usuario vería un destino y la plata caería en
    // otro. Ver docs/ARCHITECTURE.md §12.
    expect(defaultAccountTypeFor('cualquier_cosa')).toBe('bank')
  })
})

describe('accountTypeLabel', () => {
  it('traduce los tres tipos', () => {
    expect(accountTypeLabel('cash')).toBe('Efectivo')
    expect(accountTypeLabel('bank')).toBe('Banco')
    expect(accountTypeLabel('settlement')).toBe('Por cobrar')
  })

  it('un tipo desconocido se muestra tal cual en vez de romper', () => {
    expect(accountTypeLabel('crypto')).toBe('crypto')
  })
})

describe('paymentMethodLabel', () => {
  it('un movimiento sin medio de pago es plata que cambió de cuenta, no "Otro"', () => {
    // `payment_method` pasó a ser opcional en la migración 00027: liquidar un
    // convenio mueve plata entre cuentas sin cobrarse por ningún medio.
    // Mostrarlo como "Otro" lo confundiría con un cobro por Nequi o similar.
    expect(paymentMethodLabel(null)).toBe('Entre cuentas')
    expect(paymentMethodLabel('other')).toBe('Otro')
  })
})

describe('aggregateFinancialSummary con movimientos sin medio de pago', () => {
  it('no descarta ni rompe con payment_method nulo', () => {
    const summary = aggregateFinancialSummary([
      {
        sessionDate: '2026-08-01',
        report: report([
          { module: 'store', direction: 'in', concept: 'sale', payment_method: null, total: '80000.00' },
          { module: 'store', direction: 'in', concept: 'sale', payment_method: 'cash', total: '20000.00' },
        ] as SessionReport['lines']),
      },
    ])

    // La plata entró: cuenta como ingreso igual que cualquier otra venta.
    expect(summary.ingresosOperativos).toBe('100000.00')

    // Pero se agrupa aparte, no dentro de un medio de pago que no existió.
    const byMethod = Object.fromEntries(
      summary.ingresosOperativosByPaymentMethod.map((row) => [row.paymentMethod, row.total]),
    )
    expect(byMethod['inter_account']).toBe('80000.00')
    expect(byMethod['cash']).toBe('20000.00')
  })
})
