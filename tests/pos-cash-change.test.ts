import { describe, expect, it } from 'vitest'
import { cashChange } from '@/features/sales/cashChange'

/** F9-32: efectivo recibido y cambio en el POS. Solo cálculo en pantalla. */
describe('cashChange', () => {
  it('sin nada escrito no dice nada', () => {
    expect(cashChange('', '419170.00')).toBeNull()
  })
  it('el vuelto, en centavos exactos', () => {
    expect(cashChange('500000.00', '419170.00')).toEqual({ kind: 'change', amount: '80830.00' })
    expect(cashChange('419170.00', '419170.00')).toEqual({ kind: 'change', amount: '0.00' })
    expect(cashChange('100000.00', '99999.99')).toEqual({ kind: 'change', amount: '0.01' })
  })
  it('si no alcanza, cuánto falta', () => {
    expect(cashChange('400000.00', '419170.00')).toEqual({ kind: 'short', amount: '19170.00' })
  })
})
