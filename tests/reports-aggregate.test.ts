import { describe, expect, it } from 'vitest'
import { aggregateFinancialSummary, daysBetweenDateOnly } from '@/features/reports/aggregate'
import type { SessionReport } from '@/features/cashbox/api'

function report(lines: SessionReport['lines']): SessionReport {
  return { session_id: 's1', status: 'closed', opening_balance: '0.00', expected_cash: '0.00', lines }
}

describe('aggregateFinancialSummary', () => {
  it('separa ingreso/gasto operativo (P&L) del movimiento de capital — un préstamo no es gasto, un abono no es ingreso', () => {
    const summary = aggregateFinancialSummary([
      {
        sessionDate: '2026-08-01',
        report: report([
          { module: 'pawn', direction: 'in', concept: 'interest_payment', payment_method: 'cash', total: '17500.00' },
          { module: 'pawn', direction: 'in', concept: 'capital_payment', payment_method: 'cash', total: '50000.00' },
          { module: 'pawn', direction: 'out', concept: 'loan_disbursed', payment_method: 'cash', total: '1000000.00' },
          { module: 'general', direction: 'out', concept: 'expense', payment_method: 'cash', total: '45000.00' },
        ]),
      },
    ])

    // Ingreso/gasto operativo real: solo intereses (ingreso) y gasto — NO el
    // capital abonado (ingreso) ni el préstamo desembolsado (gasto).
    expect(summary.ingresosOperativos).toBe('17500.00')
    expect(summary.gastosOperativos).toBe('45000.00')
    expect(summary.utilidadOperativa).toBe('-27500.00')

    // El movimiento de capital se reporta aparte, no afecta la utilidad.
    expect(summary.capitalAbonado).toBe('50000.00')
    expect(summary.capitalDesembolsado).toBe('1000000.00')

    // El flujo de caja crudo (todo lo que entra/sale) sí incluye capital —
    // es un número distinto a propósito, para "cuánta plata se movió".
    expect(summary.flujoEntradas).toBe('67500.00')
    expect(summary.flujoSalidas).toBe('1045000.00')

    expect(summary.intereses).toBe('17500.00')
    expect(summary.sessionCount).toBe(1)
  })

  it('suma la misma combinación módulo/concepto/medio a través de varias sesiones, no float', () => {
    const summary = aggregateFinancialSummary([
      { sessionDate: '2026-08-01', report: report([{ module: 'store', direction: 'in', concept: 'sale', payment_method: 'cash', total: '0.10' }]) },
      { sessionDate: '2026-08-02', report: report([{ module: 'store', direction: 'in', concept: 'sale', payment_method: 'cash', total: '0.20' }]) },
    ])

    // 0.10 + 0.20 en floats da 0.30000000000000004 — sumMoney (centavos enteros) no.
    expect(summary.ventas).toBe('0.30')
    expect(summary.ingresosOperativos).toBe('0.30')
    expect(summary.totalsByConcept).toHaveLength(1)
    expect(summary.totalsByConcept[0]?.total).toBe('0.30')
  })

  it('separa ingreso OPERATIVO por módulo para el split Empeño/Tienda — sin mezclar capital abonado', () => {
    const summary = aggregateFinancialSummary([
      {
        sessionDate: '2026-08-01',
        report: report([
          { module: 'pawn', direction: 'in', concept: 'interest_payment', payment_method: 'cash', total: '30000.00' },
          { module: 'pawn', direction: 'in', concept: 'capital_payment', payment_method: 'cash', total: '999999.00' },
          { module: 'store', direction: 'in', concept: 'sale', payment_method: 'card', total: '70000.00' },
        ]),
      },
    ])

    expect(summary.ingresosOperativosByModule.pawn).toBe('30000.00')
    expect(summary.ingresosOperativosByModule.store).toBe('70000.00')
    expect(summary.ingresosOperativosByModule.general).toBe('0.00')
  })

  it('arma un punto por día ordenado cronológicamente para la tendencia (ingreso/gasto operativo)', () => {
    const summary = aggregateFinancialSummary([
      { sessionDate: '2026-08-03', report: report([{ module: 'store', direction: 'in', concept: 'sale', payment_method: 'cash', total: '100.00' }]) },
      { sessionDate: '2026-08-01', report: report([{ module: 'store', direction: 'in', concept: 'sale', payment_method: 'cash', total: '50.00' }]) },
    ])

    expect(summary.byDay.map((d) => d.date)).toEqual(['2026-08-01', '2026-08-03'])
  })

  it('un desembolso grande en un día no lo hace ver como "gasto" en la tendencia diaria', () => {
    const summary = aggregateFinancialSummary([
      { sessionDate: '2026-08-01', report: report([{ module: 'pawn', direction: 'out', concept: 'loan_disbursed', payment_method: 'cash', total: '1000000.00' }]) },
    ])
    expect(summary.byDay).toEqual([{ date: '2026-08-01', ingresos: '0.00', gastos: '0.00' }])
  })

  it('cuenta días de sesión sin movimientos como día vacío (ambos 0.00)', () => {
    const summary = aggregateFinancialSummary([{ sessionDate: '2026-08-01', report: report([]) }])
    expect(summary.byDay).toEqual([{ date: '2026-08-01', ingresos: '0.00', gastos: '0.00' }])
  })

  it('sin sesiones, todo en 0.00 y sin filas', () => {
    const summary = aggregateFinancialSummary([])
    expect(summary.sessionCount).toBe(0)
    expect(summary.ingresosOperativos).toBe('0.00')
    expect(summary.utilidadOperativa).toBe('0.00')
    expect(summary.totalsByConcept).toEqual([])
    expect(summary.byDay).toEqual([])
  })
})

describe('daysBetweenDateOnly', () => {
  it('el mismo día cuenta como 1', () => {
    expect(daysBetweenDateOnly('2026-08-15', '2026-08-15')).toBe(1)
  })

  it('cuenta inclusivo (from y to incluidos)', () => {
    expect(daysBetweenDateOnly('2026-08-01', '2026-08-31')).toBe(31)
  })

  it('cruza meses correctamente', () => {
    expect(daysBetweenDateOnly('2026-07-15', '2026-08-15')).toBe(32)
  })
})
