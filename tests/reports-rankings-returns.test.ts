import { describe, expect, it } from 'vitest'
import fixtures from './fixtures/backend-f1.json'
import { aggregateItemRanking } from '@/features/reports/rankings'
import type { Sale } from '@/lib/sales/void'
import type { Item } from '@/lib/inventory/items'
import type { Category } from '@/lib/catalogs/categories'
import type { SaleReturn } from '@/lib/sales/returns'

/**
 * Venta y devolución REALES del backend local (ver `_test` del fixture). La
 * venta es la respuesta del POST, anterior a la devolución: `returned_amount`
 * se lleva al valor que tendría al listarla después — el único campo tocado.
 */
const { sale: ventaReal, return: devolucion } = fixtures.venta_devuelta.body
const devuelta = { ...ventaReal, returned_amount: devolucion.total_amount } as unknown as Sale
const lineaDevuelta = ventaReal.lines[0]!

const CATS: Category[] = [
  { id: 'cat-cadenas', parent_id: null, level: 3, name: 'Cadenas', code_letter: 'C', applies_to: 'both', default_term_months: null, arrears_window_months: null, max_ltv_pct: null, active: true },
]
const item = (id: string, unit: string, name: string) => ({ id, name, code: null, cat3_id: 'cat-cadenas', unit }) as unknown as Item

/** Otra venta de la misma categoría: 2 cadenas por unidad y 1,1 g a granel. */
const otra = {
  ...ventaReal,
  id: 'otra',
  lines: [
    { ...lineaDevuelta, id: 'l-und', item_id: 'cad-und', quantity: '2.000', unit_price: '100000.00', subtotal: '200000.00' },
    { ...lineaDevuelta, id: 'l-g', item_id: 'cad-g', quantity: '1.100', unit_price: '300000.00', subtotal: '330000.00' },
  ],
} as unknown as Sale

const ITEMS = [item(lineaDevuelta.item_id, 'unit', 'Cadena devuelta'), item('cad-und', 'unit', 'Cadena por unidad'), item('cad-g', 'gram', 'Cadena a granel')]

describe('rankings de lo más vendido (F7-11)', () => {
  it('una pieza devuelta del todo no figura como vendida', () => {
    const { topItems } = aggregateItemRanking([devuelta, otra], ITEMS, CATS, [devolucion as unknown as SaleReturn])
    expect(topItems.find((i) => i.itemId === lineaDevuelta.item_id)).toBeUndefined()
  })

  it('la categoría no suma unidades con gramos: una fila por unidad', () => {
    const { topCategories } = aggregateItemRanking([devuelta, otra], ITEMS, CATS, [devolucion as unknown as SaleReturn])
    const cadenas = topCategories.filter((c) => c.categoryId === 'cat-cadenas')
    expect(cadenas.map((c) => [c.unit, c.quantity, c.revenue]).sort()).toEqual([
      ['gram', 1.1, '330000.00'],
      ['unit', 2, '200000.00'],
    ])
  })
})
