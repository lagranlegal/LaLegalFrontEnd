import { describe, expect, it } from 'vitest'
import { mergeSearch } from '@/features/inventory/useInventorySearch'

describe('mergeSearch', () => {
  it('borra los valores vacíos en vez de guardarlos', () => {
    // Sin esto la URL quedaría `?q=&status=&cat1=` al limpiar los filtros:
    // ruidosa de leer e incómoda de compartir.
    expect(mergeSearch({ q: 'cadena', status: 'draft' }, { q: '' })).toEqual({ status: 'draft' })
  })

  it('`false` también se borra', () => {
    // `?stock=false` no dice nada que la ausencia no diga mejor.
    expect(mergeSearch({ stock: true }, { stock: false })).toEqual({})
  })

  it('conserva lo que no se está cambiando', () => {
    // Cambiar el buscador no puede tumbar el filtro de categoría: es
    // exactamente lo que uno hace al refinar una búsqueda.
    expect(mergeSearch({ cat1: 'abc', supplier: 'xyz' }, { q: 'anillo' })).toEqual({
      cat1: 'abc',
      supplier: 'xyz',
      q: 'anillo',
    })
  })

  it('limpiar varios a la vez deja la URL desnuda', () => {
    const limpio = mergeSearch(
      { q: 'x', cat1: 'a', cat2: 'b', supplier: 's', stock: true },
      { q: '', cat1: '', cat2: '', supplier: '', stock: false },
    )
    expect(limpio).toEqual({})
  })

  it('un valor de cero se conserva — no todo lo falsy es vacío', () => {
    // Trampa clásica: filtrar con `!valor` borraría un 0 legítimo. Acá no hay
    // filtros numéricos todavía, pero la regla tiene que aguantar el día que
    // los haya.
    expect(mergeSearch({}, { q: '0' })).toEqual({ q: '0' })
  })
})
