import { describe, expect, it } from 'vitest'
import fixtures from './fixtures/backend-g2.json'
import f1 from './fixtures/backend-f1.json'
import { incomeStatementCascade, signedValue, type IncomeStatement } from '@/features/reports/incomeStatement'
import { formatCOP, subtractMoney, sumMoney } from '@/lib/money'

/**
 * Verificación de la tanda F/G: «1 peso entre renglones del estado de
 * resultados». Los valores traen centavos y la pantalla redondeaba cada
 * renglón a pesos por separado, así que quien suma a mano lo que VE no
 * llega al subtotal que VE. `estado_resultados_centavos_dev` es la
 * respuesta real del backend desplegado en dev.
 *
 * Arreglo: con centavos en los renglones se muestran los centavos, y los
 * subtotales salen de los renglones mostrados — también con el backend
 * desplegado hoy, que calcula sus subtotales con los valores sin redondear
 * (el nuevo, d96d2d1, ya los deriva de los renglones redondeados).
 */
const dev = fixtures.estado_resultados_centavos_dev.body as unknown as IncomeStatement

function shown(value: string, digits: 0 | 2) {
  return formatCOP(value, { maximumFractionDigits: digits })
}

describe('estado de resultados — lo que se ve se puede sumar a mano', () => {
  it('con centavos: se muestran, y cada subtotal es la suma de lo mostrado encima', () => {
    const { rows, fractionDigits } = incomeStatementCascade(dev)
    expect(fractionDigits).toBe(2)
    const byKey = new Map(rows.map((r) => [r.key, r]))
    const v = (k: string) => byKey.get(k)!.value

    expect(v('total_revenue')).toBe(sumMoney(subtractMoney(v('sales_revenue'), v('sales_returns')), v('interest_revenue')))
    expect(v('gross_profit')).toBe(subtractMoney(v('total_revenue'), v('cost_of_goods_sold')))
    expect(shown(v('gross_profit'), fractionDigits)).toBe(shown('488458.21', 2))
    // Lo que el lector ve: 3.976.916,67 − 3.488.458,46 = 488.458,21.
    expect(shown(v('total_revenue'), 2)).toMatch(/3\.976\.916,67/)
    expect(shown(v('cost_of_goods_sold'), 2)).toMatch(/3\.488\.458,46/)
  })

  it('la utilidad es la suma de los renglones que entran, incluidas las líneas que el backend viejo no manda', () => {
    const { rows } = incomeStatementCascade(dev)
    const entran = rows.filter((r) => ['add', 'subtract', 'signed'].includes(r.kind))
    const utilidad = rows.find((r) => r.kind === 'result')!
    expect(utilidad.value).toBe(sumMoney(...entran.map(signedValue)))
    expect(utilidad.value).toBe('23458.21')
    expect(rows.find((r) => r.key === 'inventory_shrinkage')!.value).toBe('0.00')
  })

  it('sin centavos se sigue mostrando en pesos, y los subtotales son los del backend', () => {
    const data = f1.income_statement_mermas.body as unknown as IncomeStatement
    const { rows, fractionDigits } = incomeStatementCascade(data)
    expect(fractionDigits).toBe(0)
    expect(rows.find((r) => r.key === 'operating_profit')!.value).toBe(data.operating_profit)
    expect(rows.find((r) => r.key === 'gross_profit')!.value).toBe(data.gross_profit)
  })
})
