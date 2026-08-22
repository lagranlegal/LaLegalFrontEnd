import { describe, expect, it } from 'vitest'
import { allowsFractions, formatQuantity, unitAbbr, unitLabel, SELECTABLE_UNITS } from '@/lib/inventory/units'

describe('unidades de medida', () => {
  it('solo la unidad contable rechaza fracciones', () => {
    // Espeja `DISCRETE_UNITS` del backend. Si esto se desincroniza, el front
    // ofrecería escribir 0,5 en algo que el backend va a rechazar — o peor,
    // bloquearía 0,5 g de oro, que es justo lo que 00036 vino a habilitar.
    expect(allowsFractions('unit')).toBe(false)
    for (const u of SELECTABLE_UNITS.filter((x) => x !== 'unit')) {
      expect(allowsFractions(u)).toBe(true)
    }
  })

  it('recorta los ceros de relleno que manda numeric(14,3)', () => {
    // El backend manda "2.000" para dos cadenas. Mostrarlo tal cual se lee
    // como dos mil, que es exactamente lo contrario de lo que dice.
    expect(formatQuantity('2.000', 'unit')).toBe('2 u')
    expect(formatQuantity('12.500', 'gram')).toBe('12,5 g')
    expect(formatQuantity('31.200', 'gram')).toBe('31,2 g')
  })

  it('sin unidad devuelve solo el número', () => {
    expect(formatQuantity('4.250')).toBe('4,25')
  })

  it('un valor que no es número se muestra tal cual en vez de romper', () => {
    // Fallback seguro, mismo criterio que el resto de los `*Label` del
    // proyecto: feo pero legible es mejor que NaN o una pantalla en blanco.
    expect(formatQuantity('abc')).toBe('abc')
  })

  it('toda unidad elegible tiene etiqueta y abreviatura propias', () => {
    for (const u of SELECTABLE_UNITS) {
      expect(unitLabel(u)).not.toBe(u)
      expect(unitAbbr(u)).not.toBe(u)
    }
  })

  it('una unidad desconocida no rompe', () => {
    expect(unitLabel('quilate')).toBe('quilate')
    expect(unitAbbr('quilate')).toBe('quilate')
  })
})
