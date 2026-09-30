import { describe, expect, it } from 'vitest'
import fixtures from './fixtures/backend-f1.json'
import { incomeStatementRows, incomeStatementSheetRows, signedValue, type IncomeStatement } from '@/features/reports/incomeStatement'
import { compareMoney, sumMoney } from '@/lib/money'

// Respuestas reales del backend local (tanda F1), ver `_origen` del fixture.
const estados: [string, IncomeStatement][] = [
  ['mermas', fixtures.income_statement_mermas.body as IncomeStatement],
  ['comisión de convenio', fixtures.income_statement_comision.body as IncomeStatement],
  ['descuadre de caja', fixtures.income_statement_descuadre.body as IncomeStatement],
  ['remate vendido', fixtures.income_statement_remate.body as IncomeStatement],
  ['venta con devolución', fixtures.income_statement_ventas_devolucion.body as IncomeStatement],
  ['compras a crédito', fixtures.income_statement_compras.body as IncomeStatement],
]

describe('estado de resultados (F1: líneas nuevas)', () => {
  it.each(estados)('las filas que entran al resultado suman la utilidad del backend — %s', (_, data) => {
    const rows = incomeStatementRows(data)
    const entran = rows.filter((r) => r.kind === 'add' || r.kind === 'subtract' || r.kind === 'signed')
    expect(compareMoney(sumMoney(...entran.map(signedValue)), data.operating_profit)).toBe(0)
  })

  it.each(estados)('la hoja Resumen del Excel suma lo mismo: las restas van en negativo — %s', (_, data) => {
    const hoja = incomeStatementSheetRows(data)
    const suma = hoja.filter((r) => ['Suma', 'Resta', 'Con signo'].includes(r['Cómo entra'])).reduce((acc, r) => acc + r.Monto, 0)
    expect(suma).toBeCloseTo(Number(data.operating_profit), 2)
    expect(hoja.find((r) => r.Concepto === 'Utilidad')?.Monto).toBe(Number(data.operating_profit))
  })

  it('muestra mermas, comisiones y descuadres con su signo', () => {
    const mermas = incomeStatementSheetRows(fixtures.income_statement_mermas.body as IncomeStatement)
    expect(mermas.find((r) => r.Concepto === 'Mermas y bajas')?.Monto).toBe(-95000)
    const comision = incomeStatementSheetRows(fixtures.income_statement_comision.body as IncomeStatement)
    expect(comision.find((r) => r.Concepto === 'Comisiones de convenios')?.Monto).toBe(-65000)
    const sobrante = incomeStatementSheetRows(fixtures.income_statement_descuadre.body as IncomeStatement)
    expect(sobrante.find((r) => r.Concepto === 'Descuadres de caja')?.Monto).toBe(50000)
    // Un faltante llega negativo y se queda negativo (no se le pone otro «−»).
    const faltante = { ...(fixtures.income_statement_descuadre.body as IncomeStatement), cash_differences: '-43000.00', operating_profit: '-43000.00' }
    const filas = incomeStatementRows(faltante)
    expect(signedValue(filas.find((r) => r.key === 'cash_differences')!)).toBe('-43000.00')
    // Verificación del 29/09: la línea dice que incluye apertura y cierre, que
    // es por qué no coincide con la tarjeta de descuadres de los cierres.
    expect(filas.find((r) => r.key === 'cash_differences')?.hint).toMatch(/apertura y de cierre/)
  })

  it('el interés del remate es informativo: ya está en la utilidad bruta y no suma otra vez', () => {
    const data = fixtures.income_statement_remate.body as IncomeStatement
    const fila = incomeStatementRows(data).find((r) => r.key === 'auction_interest_realized')!
    expect(fila.kind).toBe('info')
    expect(fila.value).toBe('320000.00')
    expect(fila.hint).toMatch(/ya incluido en la utilidad bruta/i)
  })

  it('«Pagos de compras» es lo pagado, aparte de lo causado a crédito', () => {
    const rows = incomeStatementRows(fixtures.income_statement_compras.body as IncomeStatement)
    expect(rows.find((r) => r.label === 'Pagos de compras')?.value).toBe('100000.00')
    expect(rows.find((r) => r.label === 'Compras causadas')?.value).toBe('150000.00')
  })
})
