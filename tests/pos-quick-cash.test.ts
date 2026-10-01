import { describe, expect, it } from 'vitest'
import { quickCashAmounts } from '@/features/sales/quickCash'

/** Montos rápidos del «Recibido en efectivo» (rediseño P2): la regla en `quickCash.ts`. */
describe('quickCashAmounts', () => {
  it.each([
    // El ejemplo de la maqueta.
    ['1155000.00', ['1200000.00', '1500000.00']],
    // Montos chicos: el billete que cubre y el siguiente.
    ['23000.00', ['50000.00', '100000.00']],
    ['8000.00', ['10000.00', '20000.00']],
    ['1500.00', ['2000.00', '5000.00']],
    ['50000.00', ['100000.00', '200000.00']],
    ['95000.00', ['100000.00', '200000.00']],
    // De 100 mil en adelante: a 100 mil y a 500 mil.
    ['100000.00', ['200000.00', '500000.00']],
    ['145000.00', ['200000.00', '500000.00']],
    ['480000.00', ['500000.00', '1000000.00']],
    ['1200000.00', ['1300000.00', '1500000.00']],
    ['1450000.00', ['1500000.00', '2000000.00']],
    // Con centavos: el billete que lo cubre.
    ['49999.50', ['50000.00', '100000.00']],
  ])('%s → %j', (total, esperado) => {
    expect(quickCashAmounts(total)).toEqual(esperado)
  })

  it('siempre por encima del total y sin repetirse', () => {
    for (const total of ['1000.00', '20000.00', '99999.00', '100001.00', '999999.00', '2000000.00', '12345678.00']) {
      const montos = quickCashAmounts(total)
      expect(montos).toHaveLength(2)
      expect(new Set(montos).size).toBe(2)
      for (const m of montos) expect(Number(m)).toBeGreaterThan(Number(total))
    }
  })

  it('sin total no ofrece nada', () => {
    expect(quickCashAmounts('0.00')).toEqual([])
    expect(quickCashAmounts('')).toEqual([])
    expect(quickCashAmounts('-5000.00')).toEqual([])
  })
})
