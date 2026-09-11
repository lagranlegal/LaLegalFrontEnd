import { describe, expect, it } from 'vitest'

import { evaluarLtv, resolveMaxLtvPct } from '@/features/contracts/ltv'
import { compareMoney, percentOfMoney } from '@/lib/money'
import type { Category } from '@/lib/catalogs/categories'

// `max_ltv_pct` como STRING con dos decimales, que es lo que manda la API
// de verdad (`"30.00"`, un `Decimal` del backend) — comprobado contra
// `GET /catalogs/categories` en dev, no escrito de memoria. Un fixture con
// `70` en vez de `"70.00"` confirmaría el bug en vez de encontrarlo.
function cat(id: string, parent_id: string | null, max_ltv_pct: string | null): Category {
  return {
    id,
    parent_id,
    max_ltv_pct,
    name: id,
    level: 1,
    code_letter: 'X',
    active: true,
    applies_to: 'both',
    default_term_months: null,
    arrears_window_months: null,
  } as unknown as Category
}

describe('percentOfMoney', () => {
  it('no corrompe el monto con un porcentaje que no es exacto en binario', () => {
    // `multiplyMoney(valor, 0.4)` producía un residuo tipo 1e-8 al hacer
    // `% 100` sobre un float, y el monto salía impreso como basura.
    expect(percentOfMoney('1000000.00', 40)).toBe('400000.00')
    expect(percentOfMoney('2000000.00', 70)).toBe('1400000.00')
    expect(percentOfMoney('1500000.00', 60)).toBe('900000.00')
  })

  it('redondea al centavo en vez de arrastrar decimales', () => {
    expect(percentOfMoney('1000.33', 33)).toBe('330.11')
  })
})

describe('compareMoney', () => {
  it('compara el mismo monto escrito distinto', () => {
    // El truco con `minMoney` fallaba justo acá: comparaba strings.
    expect(compareMoney('1000000', '1000000.00')).toBe(0)
    expect(compareMoney('999999.99', '1000000.00')).toBe(-1)
    expect(compareMoney('1000000.01', '1000000.00')).toBe(1)
  })
})

describe('resolveMaxLtvPct — el tope se hereda subiendo por el árbol', () => {
  const arbol = [
    cat('joyeria', null, '70.00'),
    cat('oro', 'joyeria', null),
    cat('cadena', 'oro', null),
    cat('plata', 'joyeria', '60.00'),
  ]

  it('sube dos niveles cuando la hoja y el padre no definen nada', () => {
    expect(resolveMaxLtvPct(arbol, 'cadena')).toBe(70)
  })

  it('la excepción más cercana gana sobre el abuelo', () => {
    expect(resolveMaxLtvPct(arbol, 'plata')).toBe(60)
  })

  it('sin categoría elegida todavía, no hay tope que mostrar', () => {
    expect(resolveMaxLtvPct(arbol, undefined)).toBeNull()
  })

  it('si nadie en la rama define LTV, no se inventa uno', () => {
    expect(resolveMaxLtvPct([cat('suelta', null, null)], 'suelta')).toBeNull()
  })
})

describe('evaluarLtv', () => {
  it('sin avalúo no hay nada que comparar — igual que el backend', () => {
    expect(evaluarLtv({ principal: '1.000.000', appraisalValue: undefined, maxLtvPct: 70 })).toEqual({
      kind: 'sin-datos',
    })
    expect(evaluarLtv({ principal: '1.000.000', appraisalValue: '', maxLtvPct: 70 })).toEqual({
      kind: 'sin-datos',
    })
  })

  it('sin LTV en ninguna categoría de la rama, tampoco', () => {
    expect(evaluarLtv({ principal: '1.000.000', appraisalValue: '2.000.000', maxLtvPct: null })).toEqual({
      kind: 'sin-datos',
    })
  })

  it('dentro del cupo: 1.000.000 sobre una prenda de 2.000.000 al 70 %', () => {
    const r = evaluarLtv({ principal: '1.000.000', appraisalValue: '2.000.000', maxLtvPct: 70 })
    expect(r.kind).toBe('dentro')
    if (r.kind !== 'dentro') return
    expect(r.cupo).toBe('1400000.00')
    expect(r.ltvPct).toBeCloseTo(50)
  })

  it('el límite exacto NO se pasa — el backend usa `<=`', () => {
    // `principal / appraisal * 100 <= max_ltv_pct` deja pasar el borde.
    const r = evaluarLtv({ principal: '1.400.000', appraisalValue: '2.000.000', maxLtvPct: 70 })
    expect(r.kind).toBe('dentro')
  })

  it('un peso por encima del cupo ya excede', () => {
    const r = evaluarLtv({ principal: '1.400.001', appraisalValue: '2.000.000', maxLtvPct: 70 })
    expect(r.kind).toBe('excede')
    if (r.kind !== 'excede') return
    expect(r.exceso).toBe('1.00')
  })

  it('excede: el caso del LTV en 10 % que hacía que casi todo saltara', () => {
    const r = evaluarLtv({ principal: '1.000.000', appraisalValue: '2.000.000', maxLtvPct: 10 })
    expect(r.kind).toBe('excede')
    if (r.kind !== 'excede') return
    expect(r.cupo).toBe('200000.00')
    expect(r.exceso).toBe('800000.00')
    expect(r.ltvPct).toBeCloseTo(50)
  })

  it('con el monto todavía en cero no afirma nada', () => {
    expect(evaluarLtv({ principal: '0', appraisalValue: '2.000.000', maxLtvPct: 70 })).toEqual({
      kind: 'sin-datos',
    })
  })
})
