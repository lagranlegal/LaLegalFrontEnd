import { describe, expect, it } from 'vitest'
import { aggregateCashDifferences } from '@/features/reports/aggregate'

// Solo `difference` importa: es `counted_cash − expected_cash` tal como lo
// guardó el backend al cerrar (`cashbox/service.py`), con signo.
const closing = (difference: string) => ({ difference })

describe('aggregateCashDifferences', () => {
  it('separa faltantes de sobrantes y los reporta en positivo — no se compensan entre sí', () => {
    const result = aggregateCashDifferences([closing('-5000.00'), closing('20000.00'), closing('-15000.00'), closing('0.00')])
    expect(result.faltantes).toBe('20000.00')
    expect(result.sobrantes).toBe('20000.00')
    // El neto de este período es cero, y aun así hubo 40.000 de descuadre:
    // por eso la tarjeta no puede mostrar solo el neto.
    expect(result.neto).toBe('0.00')
  })

  it('cuenta sesiones con faltante, con sobrante y cuadradas por separado', () => {
    const result = aggregateCashDifferences([closing('-5000.00'), closing('20000.00'), closing('-15000.00'), closing('0.00'), closing('0')])
    expect(result.sessionCount).toBe(5)
    expect(result.sessionsWithDifference).toBe(3)
    expect(result.shortageCount).toBe(2)
    expect(result.surplusCount).toBe(1)
  })

  it('el neto conserva el signo: negativo si faltó más de lo que sobró', () => {
    expect(aggregateCashDifferences([closing('-30000.00'), closing('10000.00')]).neto).toBe('-20000.00')
    expect(aggregateCashDifferences([closing('30000.00'), closing('-10000.00')]).neto).toBe('20000.00')
  })

  it('aritmética exacta en centavos, no float (0.1 + 0.2)', () => {
    const result = aggregateCashDifferences([closing('0.10'), closing('0.20'), closing('-0.30')])
    expect(result.sobrantes).toBe('0.30')
    expect(result.faltantes).toBe('0.30')
    expect(result.neto).toBe('0.00')
  })

  it('reproduce el caso medido en la auditoría: montos grandes, sin pérdida', () => {
    const result = aggregateCashDifferences([closing('13726000.00'), closing('-755000.00')])
    expect(result.sobrantes).toBe('13726000.00')
    expect(result.faltantes).toBe('755000.00')
    expect(result.neto).toBe('12971000.00')
  })

  it('sin cierres, todo en cero', () => {
    expect(aggregateCashDifferences([])).toEqual({
      sessionCount: 0,
      sessionsWithDifference: 0,
      shortageCount: 0,
      surplusCount: 0,
      faltantes: '0.00',
      sobrantes: '0.00',
      neto: '0.00',
    })
  })
})
