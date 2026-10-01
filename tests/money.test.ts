import { describe, expect, it } from 'vitest'
import { changePercent, formatCOP, maskMoneyInput, multiplyMoney, parseMoneyInput, subtractMoney, sumMoney } from '@/lib/money'

// Intl.NumberFormat('es-CO') separa el símbolo del monto con NBSP (U+00A0),
// no un espacio normal — visualmente idéntico a "$ 2.664.500" pero hay que
// comparar el carácter real, no el que se ve en un editor.
const cop = (amount: string) => `$ ${amount}`

describe('formatCOP', () => {
  it('formatea un string decimal de la API con puntos de miles, sin centavos', () => {
    expect(formatCOP('2664500.00')).toBe(cop('2.664.500'))
  })

  it('formatea un number en pesos (totales de presentación)', () => {
    expect(formatCOP(1000000)).toBe(cop('1.000.000'))
  })

  it('redondea a entero por defecto', () => {
    expect(formatCOP('999.50')).toBe(cop('1.000'))
  })

  it('muestra centavos cuando se pide explícitamente', () => {
    expect(formatCOP('2664500.50', { maximumFractionDigits: 2 })).toBe(cop('2.664.500,50'))
  })

  it('formatea cero', () => {
    expect(formatCOP('0.00')).toBe(cop('0'))
  })

  it('lanza si el valor no es un número válido', () => {
    expect(() => formatCOP('no-es-dinero')).toThrow()
  })
})

describe('maskMoneyInput', () => {
  it('inserta puntos de miles sobre dígitos crudos', () => {
    expect(maskMoneyInput('2664500')).toBe('2.664.500')
  })

  it('ignora caracteres no numéricos que el usuario haya tecleado', () => {
    expect(maskMoneyInput('$2,664,500')).toBe('2.664.500')
  })

  it('quita ceros a la izquierda', () => {
    expect(maskMoneyInput('0500')).toBe('500')
  })

  it('retorna vacío si no hay dígitos', () => {
    expect(maskMoneyInput('')).toBe('')
    expect(maskMoneyInput('abc')).toBe('')
  })

  it('no agrega puntos para montos menores a mil', () => {
    expect(maskMoneyInput('500')).toBe('500')
  })
})

describe('parseMoneyInput', () => {
  it('normaliza el texto enmascarado al string decimal de la API', () => {
    expect(parseMoneyInput('2.664.500')).toBe('2664500.00')
  })

  it('normaliza vacío a "0.00"', () => {
    expect(parseMoneyInput('')).toBe('0.00')
  })

  it('es el inverso de maskMoneyInput para el mismo monto', () => {
    const masked = maskMoneyInput('1500000')
    expect(parseMoneyInput(masked)).toBe('1500000.00')
  })
})

describe('sumMoney', () => {
  it('suma dos strings decimales sobre centavos enteros', () => {
    expect(sumMoney('50000.00', '10000.00')).toBe('60000.00')
  })

  it('acarrea centavos correctamente', () => {
    expect(sumMoney('50000.50', '10000.75')).toBe('60001.25')
  })

  it('ignora valores null/undefined (capital extra opcional)', () => {
    expect(sumMoney('50000.00', null, undefined)).toBe('50000.00')
  })

  it('suma cero valores a "0.00"', () => {
    expect(sumMoney()).toBe('0.00')
  })
})

describe('subtractMoney', () => {
  it('resta dos strings decimales sobre centavos enteros', () => {
    expect(subtractMoney('50000.00', '48000.00')).toBe('2000.00')
  })

  it('da negativo cuando lo contado es menor a lo esperado (faltante de caja)', () => {
    expect(subtractMoney('48000.00', '50000.00')).toBe('-2000.00')
  })

  it('da "0.00" cuando cuadra exacto', () => {
    expect(subtractMoney('50000.00', '50000.00')).toBe('0.00')
  })

  it('acarrea centavos correctamente', () => {
    expect(subtractMoney('50000.25', '10000.50')).toBe('39999.75')
  })
})

describe('multiplyMoney', () => {
  it('multiplica un precio unitario por una cantidad entera', () => {
    expect(multiplyMoney('15000.00', 3)).toBe('45000.00')
  })

  it('con cantidad 1 retorna el mismo precio', () => {
    expect(multiplyMoney('15000.00', 1)).toBe('15000.00')
  })

  it('con cantidad 0 retorna "0.00"', () => {
    expect(multiplyMoney('15000.00', 0)).toBe('0.00')
  })
})

// Cantidades fraccionarias (00036: gramos, kilos, metros). Los esperados NO
// se escribieron a mano: salen de lo que calcula el backend,
// `quantize(unit_price * quantity)` con `ROUND_HALF_UP` a centavos
// (backend-starter/app/common/money.py y sales/service.py:156), corrido en
// Python con `Decimal`. Si el front redondea distinto, el subtotal que ve el
// cajero no es el que cobra el recibo.
describe('multiplyMoney con cantidades fraccionarias', () => {
  it('1,1 no deja residuo de float (el bug: "1101.10.000000000014552")', () => {
    expect(multiplyMoney('1001.00', 1.1)).toBe('1101.10')
  })

  it('0,333 kg a 1.000', () => {
    expect(multiplyMoney('1000.00', 0.333)).toBe('333.00')
  })

  it('12,5 g a 19.230 (el ejemplo del backend)', () => {
    expect(multiplyMoney('19230.00', 12.5)).toBe('240375.00')
  })

  it('2,5 con centavos en el precio', () => {
    expect(multiplyMoney('15000.50', 2.5)).toBe('37501.25')
  })

  it('redondea a centavos cuando el producto trae milésimas', () => {
    expect(multiplyMoney('999.99', 0.333)).toBe('333.00')
    expect(multiplyMoney('10.01', 1.005)).toBe('10.06')
    expect(multiplyMoney('33333.00', 0.001)).toBe('33.33')
  })

  it('el empate sube (ROUND_HALF_UP como el backend, no el del banquero)', () => {
    // 0,05 × 0,5 = 0,025: HALF_EVEN daría 0,02; el backend da 0,03.
    expect(multiplyMoney('0.05', 0.5)).toBe('0.03')
  })

  it('acepta la cantidad como el string que manda la API ("1.100")', () => {
    expect(multiplyMoney('1000.00', '1.100')).toBe('1100.00')
  })

  it('una cantidad con basura de float (0,1 + 0,2) no corrompe el monto', () => {
    expect(multiplyMoney('1000.00', 0.1 + 0.2)).toBe('300.00')
  })

  it('no pierde precisión con montos grandes', () => {
    expect(multiplyMoney('999999999.99', 1000.001)).toBe('1000000999990.00')
  })

  it('una cantidad ilegible (campo a medio escribir) da "0.00" en vez de tumbar la vista', () => {
    expect(multiplyMoney('1000.00', '')).toBe('0.00')
    expect(multiplyMoney('1000.00', '1,5')).toBe('0.00')
    expect(multiplyMoney('1000.00', '.')).toBe('0.00')
    expect(multiplyMoney('1000.00', Number.NaN)).toBe('0.00')
  })

  it('una cantidad diminuta que String() escribe en notación exponencial', () => {
    // String(1e-7) es "1e-7": sin el toFixed, la regex no la leería.
    expect(multiplyMoney('100000000.00', 1e-7)).toBe('10.00')
  })

  it('el resultado siempre es formateable (antes formatCOP lanzaba y tumbaba la pantalla)', () => {
    for (const qty of [1.1, 0.333, 2.5, 1.005, 0.001, 7.77]) {
      expect(() => formatCOP(multiplyMoney('1001.00', qty))).not.toThrow()
    }
  })
})

describe('changePercent (Inicio: ▲/▼ vs. el mes anterior)', () => {
  it('sube y baja contra el mes anterior', () => {
    expect(changePercent('1120000.00', '1000000.00')).toBe(12)
    expect(changePercent('920000.00', '1000000.00')).toBe(-8)
  })

  it('sin mes anterior (0) no hay porcentaje', () => {
    expect(changePercent('450000.00', '0.00')).toBeNull()
    expect(changePercent('0.00', '0')).toBeNull()
  })
})
