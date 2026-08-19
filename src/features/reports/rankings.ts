import { sumMoney } from '@/lib/money'
import type { Sale } from '@/lib/sales/void'
import type { Item } from '@/lib/inventory/items'
import type { Category } from '@/lib/catalogs/categories'

export interface ItemRanking {
  itemId: string
  name: string
  code: string | null
  quantity: number
  revenue: string
}

export interface CategoryRanking {
  categoryId: string
  name: string
  quantity: number
  revenue: string
}

/**
 * "Prendas más vendidas" / "categorías más movidas" — pedido explícito del
 * cliente, sobre TODO el histórico (no el rango elegido arriba): `GET /sales`
 * no tiene filtro de fecha, así que acotar esto a un rango exigiría traer
 * todas las ventas igual y filtrar en el navegador — se prefirió ser
 * honestos y mostrarlo como "histórico completo" en vez de fingir que está
 * filtrado quedándose corto (decisión confirmada explícitamente).
 *
 * `items` es el catálogo completo (`GET /inventory/items` sin filtro de
 * status) — se usa para resolver nombre/categoría de cada línea de venta SIN
 * un request por artículo (evita N+1 sobre potencialmente cientos de
 * artículos distintos vendidos a través del tiempo).
 */
export function aggregateItemRanking(sales: Sale[], items: Item[], categories: Category[]): { topItems: ItemRanking[]; topCategories: CategoryRanking[] } {
  const itemById = new Map(items.map((item) => [item.id, item]))
  const categoryById = new Map(categories.map((category) => [category.id, category]))

  const itemTotals = new Map<string, { quantity: number; revenue: string }>()

  for (const sale of sales) {
    if (sale.status === 'voided') continue
    for (const line of sale.lines) {
      const existing = itemTotals.get(line.item_id) ?? { quantity: 0, revenue: '0.00' }
      itemTotals.set(line.item_id, { quantity: existing.quantity + line.quantity, revenue: sumMoney(existing.revenue, line.subtotal) })
    }
  }

  const topItems: ItemRanking[] = [...itemTotals.entries()]
    .map(([itemId, totals]) => {
      const item = itemById.get(itemId)
      return { itemId, name: item?.name ?? 'Artículo eliminado', code: item?.code ?? null, ...totals }
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)

  const categoryTotals = new Map<string, { quantity: number; revenue: string }>()
  for (const [itemId, totals] of itemTotals) {
    const cat3Id = itemById.get(itemId)?.cat3_id
    const key = cat3Id ?? 'sin-categoria'
    const existing = categoryTotals.get(key) ?? { quantity: 0, revenue: '0.00' }
    categoryTotals.set(key, { quantity: existing.quantity + totals.quantity, revenue: sumMoney(existing.revenue, totals.revenue) })
  }

  const topCategories: CategoryRanking[] = [...categoryTotals.entries()]
    .map(([categoryId, totals]) => ({ categoryId, name: categoryId === 'sin-categoria' ? 'Sin categoría' : (categoryById.get(categoryId)?.name ?? 'Categoría eliminada'), ...totals }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6)

  return { topItems, topCategories }
}
