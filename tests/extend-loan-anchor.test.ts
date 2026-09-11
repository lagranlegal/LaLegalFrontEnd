import { describe, expect, it } from 'vitest'
import { addMonthsToDateOnly } from '@/lib/dates'
import { percentOfMoney, sumMoney } from '@/lib/money'

/**
 * El aviso que `ExtendLoanPanel` muestra antes de confirmar un recargo:
 * cuándo vence la próxima cuota y de cuánto es.
 *
 * Desde 00053 el contrato sucesor conserva el ancla del interés, así que la
 * fecha de cobro NO se mueve — que es justo lo que pidió el cliente, y
 * también el filo del cambio. Este archivo fija los números del ejemplo con
 * el que se pidió, para que nadie los "mejore" sin darse cuenta.
 */
describe('la próxima cuota después de un recargo', () => {
  it('el caso que pidió el cliente: presta el 1, recarga el 25', () => {
    // Contrato del 1 de septiembre por 1.000.000 al 5 %. El 25 el cliente
    // recarga 500.000.
    const ancla = '2026-09-01'
    const capital = sumMoney('1000000.00', '500000.00')

    // Se le cobra el 1 de octubre —no el 25— y sobre el 1.500.000 completo.
    expect(addMonthsToDateOnly(ancla, 1)).toBe('2026-10-01')
    expect(percentOfMoney(capital, 5)).toBe('75000.00')
  })

  it('el interés es del capital AMPLIADO, no del viejo', () => {
    // Si se calculara sobre el capital anterior, el aviso prometería 50.000 y
    // el cliente recibiría un cobro de 75.000. Un número mal puesto en una
    // pantalla de confirmación es peor que no ponerlo.
    expect(percentOfMoney('1000000.00', 5)).toBe('50000.00')
    expect(percentOfMoney('1500000.00', 5)).toBe('75000.00')
  })

  it('una tasa con decimales no corrompe el monto', () => {
    // `multiplyMoney(valor, pct/100)` multiplica centavos por un float y
    // `centsToDecimal` hace `% 100`: con 0.33 llegó a imprimir
    // "330.10.889999999999418". Para eso está `percentOfMoney`.
    const resultado = percentOfMoney('1500000.00', 4.5)
    expect(resultado).toBe('67500.00')
    expect(resultado.split('.')).toHaveLength(2)
  })

  it('el recorte de fin de mes no inventa un día que no existe', () => {
    // Un contrato del 31 de enero: la cuota de febrero cae el 28, no el 3 de
    // marzo. Es la misma convención que usa el backend para `months_owed`,
    // así que el aviso y el cobro tienen que coincidir.
    expect(addMonthsToDateOnly('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonthsToDateOnly('2026-08-31', 1)).toBe('2026-09-30')
  })
})
