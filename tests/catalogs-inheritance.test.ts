import { describe, expect, it } from 'vitest'
import { resolveInheritedParams } from '@/features/catalogs/inheritance'
import type { Category } from '@/lib/catalogs/categories'

function cat(partial: Partial<Category> & { id: string }): Category {
  return {
    parent_id: null,
    level: 1,
    name: 'X',
    code_letter: 'X',
    applies_to: 'both',
    default_term_months: null,
    arrears_window_months: null,
    max_ltv_pct: null,
    active: true,
    ...partial,
  } as Category
}

// Joyería(N1: plazo 9, ventana 9, ltv 50) → Oro(N2: plazo 4, ventana 4) → Cadena(N3: nada)
const arbol: Category[] = [
  cat({ id: 'n1', level: 1, default_term_months: 9, arrears_window_months: 9, max_ltv_pct: '50' }),
  cat({ id: 'n2', level: 2, parent_id: 'n1', default_term_months: 4, arrears_window_months: 4 }),
  cat({ id: 'n3', level: 3, parent_id: 'n2' }),
]

describe('resolveInheritedParams', () => {
  it('cada campo sube hasta el ancestro más cercano que lo defina', () => {
    // La hoja hereda plazo y ventana del N2, pero el LTV del N1 — porque el
    // N2 no lo define. Copiar en bloque el primer ancestro que tenga "algo"
    // daría 4/4/null y el formulario estaría mintiendo sobre el LTV.
    const heredado = resolveInheritedParams(arbol, 'n2')
    expect(heredado.default_term_months).toBe(4)
    expect(heredado.arrears_window_months).toBe(4)
    expect(heredado.max_ltv_pct).toBe('50')
  })

  it('sin padre no hay nada que heredar', () => {
    // Una categoría raíz nueva: los tres campos vacíos, y el formulario debe
    // advertir que sin plazo no se podrán crear contratos en esa rama.
    const heredado = resolveInheritedParams(arbol, undefined)
    expect(heredado).toEqual({ default_term_months: null, arrears_window_months: null, max_ltv_pct: null })
  })

  it('espeja al backend: lo más cercano gana', () => {
    // Si el N2 define plazo, el 9 del N1 no debe asomarse nunca.
    expect(resolveInheritedParams(arbol, 'n2').default_term_months).not.toBe(9)
    // Y desde el N1 sí es 9.
    expect(resolveInheritedParams(arbol, 'n1').default_term_months).toBe(9)
  })

  it('un ciclo por datos corruptos no cuelga el navegador', () => {
    // Un formulario congelado es peor que uno con un dato incompleto.
    const ciclo: Category[] = [
      cat({ id: 'a', parent_id: 'b' }),
      cat({ id: 'b', parent_id: 'a' }),
    ]
    expect(() => resolveInheritedParams(ciclo, 'a')).not.toThrow()
  })
})
