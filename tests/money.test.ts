import { describe, expect, it } from 'vitest'
import { formatCOP, maskMoneyInput, parseMoneyInput } from '@/lib/money'

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
