import { describe, expect, it } from 'vitest'
import { aggregateItemRanking } from '@/features/reports/rankings'
import type { Sale } from '@/lib/sales/void'
import type { Item } from '@/lib/inventory/items'
import type { Category } from '@/lib/catalogs/categories'

function sale(overrides: Partial<Sale> & { lines: Sale['lines'] }): Sale {
  return {
    id: 's1',
    number: 1,
    sold_at: '2026-08-01T00:00:00Z',
    customer_id: null,
    discount_amount: '0.00',
    total: '0.00',
    payment_method: 'cash',
    status: 'completed',
    void_reason: null,
    created_at: '2026-08-01T00:00:00Z',
    ...overrides,
  }
}

function item(overrides: Partial<Item> & { id: string; cat3_id: string }): Item {
  return {
    id: overrides.id,
    code: 'X0001I',
    name: 'Artículo',
    cat1_id: 'c1',
    cat2_id: 'c2',
    cat3_id: overrides.cat3_id,
    description: null,
    origin: 'supplier',
    supplier_id: null,
    source_contract_id: null,
    cost: '1000.00',
    sale_price: '2000.00',
    quantity: 1,
    status: 'sold',
    photos: [],
    entry_date: '2026-08-01',
    created_at: '2026-08-01T00:00:00Z',
    ...overrides,
  }
}

const CATEGORIES: Category[] = [
  { id: 'cat-joyeria', parent_id: null, level: 3, name: 'Anillos de oro', code_letter: 'A', applies_to: 'both', default_term_months: null, arrears_window_months: null, max_ltv_pct: null, active: true },
  { id: 'cat-tech', parent_id: null, level: 3, name: 'Smartphones', code_letter: 'S', applies_to: 'both', default_term_months: null, arrears_window_months: null, max_ltv_pct: null, active: true },
]

describe('aggregateItemRanking', () => {
  it('rankea artículos por cantidad vendida, resolviendo nombre desde el catálogo', () => {
    const items = [item({ id: 'i1', name: 'Anillo de oro 18k', cat3_id: 'cat-joyeria' }), item({ id: 'i2', name: 'iPhone 12 usado', cat3_id: 'cat-tech' })]
    const sales = [
      sale({ lines: [{ id: 'l1', item_id: 'i1', quantity: 2, unit_price: '100000.00', subtotal: '200000.00' }] }),
      sale({ lines: [{ id: 'l2', item_id: 'i1', quantity: 1, unit_price: '100000.00', subtotal: '100000.00' }] }),
      sale({ lines: [{ id: 'l3', item_id: 'i2', quantity: 1, unit_price: '500000.00', subtotal: '500000.00' }] }),
    ]

    const { topItems } = aggregateItemRanking(sales, items, CATEGORIES)

    expect(topItems[0]).toMatchObject({ itemId: 'i1', name: 'Anillo de oro 18k', quantity: 3, revenue: '300000.00' })
    expect(topItems[1]).toMatchObject({ itemId: 'i2', name: 'iPhone 12 usado', quantity: 1, revenue: '500000.00' })
  })

  it('excluye ventas anuladas del ranking', () => {
    const items = [item({ id: 'i1', cat3_id: 'cat-joyeria' })]
    const sales = [
      sale({ status: 'voided', lines: [{ id: 'l1', item_id: 'i1', quantity: 5, unit_price: '100.00', subtotal: '500.00' }] }),
      sale({ lines: [{ id: 'l2', item_id: 'i1', quantity: 1, unit_price: '100.00', subtotal: '100.00' }] }),
    ]

    const { topItems } = aggregateItemRanking(sales, items, CATEGORIES)
    expect(topItems).toHaveLength(1)
    expect(topItems[0]?.quantity).toBe(1)
  })

  it('agrupa por categoría (cat3_id) sumando las cantidades de sus artículos', () => {
    const items = [item({ id: 'i1', cat3_id: 'cat-joyeria' }), item({ id: 'i2', cat3_id: 'cat-joyeria' }), item({ id: 'i3', cat3_id: 'cat-tech' })]
    const sales = [
      sale({ lines: [{ id: 'l1', item_id: 'i1', quantity: 2, unit_price: '100.00', subtotal: '200.00' }] }),
      sale({ lines: [{ id: 'l2', item_id: 'i2', quantity: 3, unit_price: '100.00', subtotal: '300.00' }] }),
      sale({ lines: [{ id: 'l3', item_id: 'i3', quantity: 1, unit_price: '100.00', subtotal: '100.00' }] }),
    ]

    const { topCategories } = aggregateItemRanking(sales, items, CATEGORIES)
    expect(topCategories[0]).toMatchObject({ categoryId: 'cat-joyeria', name: 'Anillos de oro', quantity: 5 })
    expect(topCategories[1]).toMatchObject({ categoryId: 'cat-tech', name: 'Smartphones', quantity: 1 })
  })

  it('un artículo que ya no existe en el catálogo no rompe el ranking', () => {
    const sales = [sale({ lines: [{ id: 'l1', item_id: 'artículo-borrado', quantity: 1, unit_price: '100.00', subtotal: '100.00' }] })]
    const { topItems, topCategories } = aggregateItemRanking(sales, [], CATEGORIES)
    expect(topItems[0]).toMatchObject({ name: 'Artículo eliminado', quantity: 1 })
    expect(topCategories[0]).toMatchObject({ name: 'Sin categoría', quantity: 1 })
  })

  it('sin ventas, listas vacías', () => {
    const { topItems, topCategories } = aggregateItemRanking([], [], [])
    expect(topItems).toEqual([])
    expect(topCategories).toEqual([])
  })
})
