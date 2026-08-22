import { describe, expect, it } from 'vitest'
import { aggregateFinancialSummary, aggregateExpensesByCategory, computeDelta, daysBetweenDateOnly, previousRangeFor } from '@/features/reports/aggregate'
import type { SessionReport, Expense, ExpenseCategory } from '@/features/cashbox/api'

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
    // La UTILIDAD no se calcula acá: este módulo agrega movimientos de caja,
    // y una utilidad sin costo de ventas es una mentira. Vive en
    // `GET /reports/income-statement`.

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

  it('una compra a proveedor es inversión en inventario, NO un gasto operativo', () => {
    // Regresión de la regla contable: cuando la compra empezó a generar
    // movimiento de caja (`concept: 'purchase'`), lo fácil era sumarla a
    // gastos y dejar que un mes de reposición de mercancía se viera como un
    // mes de pérdida. Comprar convierte efectivo en un activo; el costo se
    // vuelve gasto cuando el artículo se VENDE, no cuando se compra.
    const summary = aggregateFinancialSummary([
      {
        sessionDate: '2026-08-01',
        report: report([
          { module: 'store', direction: 'in', concept: 'sale', payment_method: 'cash', total: '300000.00' },
          { module: 'store', direction: 'out', concept: 'purchase', payment_method: 'cash', total: '2000000.00' },
          { module: 'general', direction: 'out', concept: 'expense', payment_method: 'cash', total: '50000.00' },
        ]),
      },
    ])

    expect(summary.comprasInventario).toBe('2000000.00')
    // El gasto operativo es SOLO el gasto real, no la compra.
    expect(summary.gastosOperativos).toBe('50000.00')
    // Lo importante es que la compra NO entra en los gastos: si entrara, un
    // mes de mucha compra parecería un mes de pérdida.
    // El flujo de caja crudo sí la incluye — es el número que explica por qué
    // hay menos efectivo en el cajón.
    expect(summary.flujoSalidas).toBe('2050000.00')
  })

  it('la compra tampoco distorsiona la tendencia diaria de gastos', () => {
    const summary = aggregateFinancialSummary([
      {
        sessionDate: '2026-08-01',
        report: report([{ module: 'store', direction: 'out', concept: 'purchase', payment_method: 'cash', total: '5000000.00' }]),
      },
    ])

    expect(summary.byDay).toEqual([{ date: '2026-08-01', ingresos: '0.00', gastos: '0.00' }])
  })

  it('el filtro por módulo separa compras (tienda) de desembolsos (empeño)', () => {
    const sessions = [
      {
        sessionDate: '2026-08-01',
        report: report([
          { module: 'store', direction: 'out', concept: 'purchase', payment_method: 'cash', total: '800000.00' },
          { module: 'pawn', direction: 'out', concept: 'loan_disbursed', payment_method: 'cash', total: '1000000.00' },
        ]),
      },
    ]

    expect(aggregateFinancialSummary(sessions, 'store').comprasInventario).toBe('800000.00')
    expect(aggregateFinancialSummary(sessions, 'store').capitalDesembolsado).toBe('0.00')
    expect(aggregateFinancialSummary(sessions, 'pawn').comprasInventario).toBe('0.00')
    expect(aggregateFinancialSummary(sessions, 'pawn').capitalDesembolsado).toBe('1000000.00')
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
    expect(summary.gastosOperativos).toBe('0.00')
    expect(summary.totalsByConcept).toEqual([])
    expect(summary.byDay).toEqual([])
  })

  it('ingresosOperativosByPaymentMethod excluye capital abonado — no infla el total frente a ingresosOperativos', () => {
    const summary = aggregateFinancialSummary([
      {
        sessionDate: '2026-08-01',
        report: report([
          { module: 'pawn', direction: 'in', concept: 'interest_payment', payment_method: 'cash', total: '110000.00' },
          { module: 'pawn', direction: 'in', concept: 'capital_payment', payment_method: 'cash', total: '385000.00' },
        ]),
      },
    ])

    expect(summary.ingresosOperativosByPaymentMethod).toEqual([{ paymentMethod: 'cash', total: '110000.00' }])
    // La suma por medio de pago debe cuadrar exactamente con ingresosOperativos, no con flujoEntradas (que sí incluiría el capital).
    const totalByMethod = summary.ingresosOperativosByPaymentMethod.reduce((sum, p) => sum + Number(p.total), 0)
    expect(totalByMethod).toBe(Number(summary.ingresosOperativos))
  })

  it('con moduleFilter, solo suma líneas de ese módulo — el resto queda en 0', () => {
    const sessions = [
      {
        sessionDate: '2026-08-01',
        report: report([
          { module: 'pawn', direction: 'in', concept: 'interest_payment', payment_method: 'cash', total: '30000.00' },
          { module: 'store', direction: 'in', concept: 'sale', payment_method: 'card', total: '70000.00' },
          { module: 'general', direction: 'out', concept: 'expense', payment_method: 'cash', total: '10000.00' },
        ]),
      },
    ]

    const pawnOnly = aggregateFinancialSummary(sessions, 'pawn')
    expect(pawnOnly.ingresosOperativos).toBe('30000.00')
    expect(pawnOnly.gastosOperativos).toBe('0.00')
    expect(pawnOnly.totalsByConcept).toHaveLength(1)

    const storeOnly = aggregateFinancialSummary(sessions, 'store')
    expect(storeOnly.ingresosOperativos).toBe('70000.00')

    const all = aggregateFinancialSummary(sessions)
    expect(all.ingresosOperativos).toBe('100000.00')
    expect(all.gastosOperativos).toBe('10000.00')
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

describe('previousRangeFor', () => {
  it('un solo día — el período anterior es el día inmediatamente antes', () => {
    expect(previousRangeFor({ from: '2026-08-15', to: '2026-08-15' })).toEqual({ from: '2026-08-14', to: '2026-08-14' })
  })

  it('un rango de N días — el anterior tiene la misma duración, sin solaparse', () => {
    // Este mes (01/08 a 19/08 = 19 días) → el anterior es 19 días terminando el 31/07.
    const previous = previousRangeFor({ from: '2026-08-01', to: '2026-08-19' })
    expect(previous).toEqual({ from: '2026-07-13', to: '2026-07-31' })
    expect(daysBetweenDateOnly(previous.from, previous.to)).toBe(daysBetweenDateOnly('2026-08-01', '2026-08-19'))
  })

  it('cruza el límite de año correctamente', () => {
    expect(previousRangeFor({ from: '2026-01-01', to: '2026-01-05' })).toEqual({ from: '2025-12-27', to: '2025-12-31' })
  })
})

describe('computeDelta', () => {
  it('sube y la dirección favorable es "up" (ej. ingresos) → favorable=true', () => {
    const d = computeDelta('120.00', '100.00', 'up')
    expect(d.pct).toBe(20)
    expect(d.favorable).toBe(true)
  })

  it('sube pero la dirección favorable es "down" (ej. gastos) → favorable=false', () => {
    const d = computeDelta('120.00', '100.00', 'down')
    expect(d.pct).toBe(20)
    expect(d.favorable).toBe(false)
  })

  it('bajan los gastos → favorable=true', () => {
    const d = computeDelta('80.00', '100.00', 'down')
    expect(d.pct).toBe(-20)
    expect(d.favorable).toBe(true)
  })

  it('sin período anterior (0) → pct null, no división por cero', () => {
    const d = computeDelta('100.00', '0.00', 'up')
    expect(d.pct).toBeNull()
  })

  it('sin cambio → pct 0, favorable', () => {
    const d = computeDelta('100.00', '100.00', 'up')
    expect(d.pct).toBe(0)
    expect(d.favorable).toBe(true)
  })
})

describe('aggregateExpensesByCategory', () => {
  function expense(overrides: Partial<Expense> & { category_id: string; amount: string }): Expense {
    return {
      id: 'e1',
      session_id: 's1',
      module: 'general',
      description: 'gasto',
      payment_method: 'cash',
      receipt_url: null,
      created_at: '2026-08-01T00:00:00Z',
      ...overrides,
    }
  }
  function category(id: string, name: string): ExpenseCategory {
    return { id, name, active: true }
  }

  it('agrupa y suma por categoría, ordenado descendente', () => {
    const result = aggregateExpensesByCategory(
      [expense({ category_id: 'c1', amount: '10000.00' }), expense({ category_id: 'c2', amount: '50000.00' }), expense({ category_id: 'c1', amount: '5000.00' })],
      [category('c1', 'Servicios'), category('c2', 'Arriendo')],
    )
    expect(result).toEqual([
      { categoryId: 'c2', name: 'Arriendo', total: '50000.00' },
      { categoryId: 'c1', name: 'Servicios', total: '15000.00' },
    ])
  })

  it('categoría sin match cae en "Sin categoría" en vez de romper', () => {
    const result = aggregateExpensesByCategory([expense({ category_id: 'ghost', amount: '1000.00' })], [])
    expect(result).toEqual([{ categoryId: 'ghost', name: 'Sin categoría', total: '1000.00' }])
  })
})
