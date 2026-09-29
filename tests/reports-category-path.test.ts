import { describe, expect, it } from 'vitest'
import fixtures from './fixtures/backend-g2.json'
import { aggregateItemRanking } from '@/features/reports/rankings'
import type { Category } from '@/lib/catalogs/categories'
import type { Item } from '@/lib/inventory/items'
import type { Sale } from '@/lib/sales/void'

/**
 * Verificación F/G: «Categorías más movidas» mostraba solo el nombre del
 * nivel 3, y dos categorías homónimas bajo padres distintos («Cadena» de
 * Oro y «Cadena» de Plata) se veían iguales. Ahora va la ruta completa.
 *
 * Categorías: respuestas reales del backend local (un árbol L1 › L2 › L3 y
 * un Joyería › Oro). La homónima es la L3 real con otro id y colgada de
 * Oro: el caso que el backend permite (el nombre no es único entre padres).
 */
const l1 = fixtures.categoria_arbol_0.body as unknown as Category
const l2 = fixtures.categoria_arbol_1.body as unknown as Category
const l3 = fixtures.categoria_arbol_2.body as unknown as Category
const joyeria = fixtures.categoria_joyeria.body as unknown as Category
const oro = fixtures.categoria_oro.body as unknown as Category
const homonima: Category = { ...l3, id: 'l3-bajo-oro', parent_id: oro.id }

function item(id: string, cat3: string): Item {
  return { id, name: id, code: null, cat3_id: cat3, unit: 'unit' } as unknown as Item
}
function sale(id: string, itemId: string): Sale {
  return { id, status: 'completed', lines: [{ id: `l-${id}`, item_id: itemId, quantity: '1.000', unit_price: '100.00', subtotal: '100.00' }] } as unknown as Sale
}

describe('categorías más movidas — ruta completa', () => {
  it('dos categorías del mismo nombre se distinguen por su ruta', () => {
    const { topCategories } = aggregateItemRanking(
      [sale('s1', 'a'), sale('s2', 'b'), sale('s3', 'b')],
      [item('a', l3.id), item('b', homonima.id)],
      [l1, l2, l3, joyeria, oro, homonima],
    )
    expect(topCategories.map((c) => c.path)).toEqual(['Joyería › Oro › L3', 'L1 › L2 › L3'])
    expect(topCategories[0]!.name).toBe('L3')
  })

  it('sin categoría o con un padre que ya no está, la ruta no se inventa', () => {
    const { topCategories } = aggregateItemRanking([sale('s1', 'a'), sale('s2', 'x')], [item('a', l3.id)], [l3])
    expect(topCategories.map((c) => c.path).sort()).toEqual(['L3', 'Sin categoría'])
  })
})
