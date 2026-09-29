import { multiplyMoney, subtractMoney, sumMoney } from '@/lib/money'
import type { SaleReturn } from '@/lib/sales/returns'
import type { Sale } from '@/lib/sales/void'
import type { Item } from '@/lib/inventory/items'
import type { Category } from '@/lib/catalogs/categories'

export interface ItemRanking {
  itemId: string
  name: string
  code: string | null
  quantity: number
  revenue: string
  /** Unidad del artículo (`unit`, p. ej. `g`): una cantidad sin unidad no se lee. */
  unit: string
}

/**
 * Una categoría POR UNIDAD (F7-11): «3 uds» que en realidad son 2 anillos y
 * 1,1 g de cadena no es una cantidad, es una suma de peras con manzanas. Si
 * una categoría vende en unidades y en gramos, aparece dos veces.
 */
export interface CategoryRanking {
  categoryId: string
  name: string
  /**
   * La ruta completa, «Joyería › Oro › Cadena» (verificación F/G): dos
   * categorías de nivel 3 con el mismo nombre bajo padres distintos se
   * veían iguales en el ranking. Si falta un ancestro, empieza donde se sabe.
   */
  path: string
  quantity: number
  revenue: string
  unit: string
}

function categoryPath(categoryId: string, categoryById: Map<string, Category>): string {
  const names: string[] = []
  let current = categoryById.get(categoryId)
  // Tope de 3 niveles (el árbol no tiene más); corta también un ciclo.
  while (current && names.length < 3) {
    names.unshift(current.name)
    current = current.parent_id ? categoryById.get(current.parent_id) : undefined
  }
  return names.join(' › ')
}

/**
 * "Prendas más vendidas" / "categorías más movidas" — pedido explícito del
 * cliente, ACOTADO al rango elegido arriba: desde el 02/09/2026 `GET /sales`
 * acepta `?from_date`/`?to_date` y `useItemSales` los manda (ver
 * `features/reports/api.ts`), así que `sales` ya llega filtrado por fecha y
 * acá solo se agrega. Hasta esa fecha era el histórico completo, porque el
 * endpoint no tenía filtro y se prefirió rotularlo como tal antes que fingir
 * un rango quedándose corto; la UI y la guía ya dicen "del rango".
 *
 * `items` es el catálogo completo (`GET /inventory/items` sin filtro de
 * status) — se usa para resolver nombre/categoría de cada línea de venta SIN
 * un request por artículo (evita N+1 sobre potencialmente cientos de
 * artículos distintos vendidos a través del tiempo).
 */
/**
 * Suma de cantidades redondeada a milésimas, la escala de `numeric(14,3)`.
 * Las cantidades llegan como string (`"1.100"`) y se suman como número
 * solo para ordenar y graficar; sin el redondeo, 1,1 + 0,2 daba
 * 1.3000000000000003 en la pantalla y en la columna del Excel.
 */
function addQuantity(a: number, b: number): number {
  return Math.round((a + b) * 1000) / 1000
}

/**
 * `returns` son las devoluciones de esas ventas (F7-11): lo devuelto se
 * RESTA por `sale_line_id` —cantidad y `precio × cantidad devuelta`—, porque
 * una pieza que volvió no es una pieza «más vendida». Sin ellas el ranking
 * premiaba justo lo que los clientes devuelven.
 */
export function aggregateItemRanking(
  sales: Sale[],
  items: Item[],
  categories: Category[],
  returns: SaleReturn[] = [],
): { topItems: ItemRanking[]; topCategories: CategoryRanking[] } {
  const itemById = new Map(items.map((item) => [item.id, item]))
  const categoryById = new Map(categories.map((category) => [category.id, category]))

  const returnedByLine = new Map<string, number>()
  for (const ret of returns) {
    for (const line of ret.lines) returnedByLine.set(line.sale_line_id, addQuantity(returnedByLine.get(line.sale_line_id) ?? 0, Number(line.quantity)))
  }

  const itemTotals = new Map<string, { quantity: number; revenue: string }>()

  for (const sale of sales) {
    if (sale.status === 'voided') continue
    for (const line of sale.lines) {
      const devuelto = returnedByLine.get(line.id) ?? 0
      const quantity = addQuantity(Number(line.quantity), -devuelto)
      const revenue = devuelto > 0 ? subtractMoney(line.subtotal, multiplyMoney(line.unit_price, devuelto)) : line.subtotal
      const existing = itemTotals.get(line.item_id) ?? { quantity: 0, revenue: '0.00' }
      itemTotals.set(line.item_id, { quantity: addQuantity(existing.quantity, quantity), revenue: sumMoney(existing.revenue, revenue) })
    }
  }
  // Devuelto del todo: no se vendió.
  for (const [itemId, totals] of itemTotals) if (totals.quantity <= 0) itemTotals.delete(itemId)

  const topItems: ItemRanking[] = [...itemTotals.entries()]
    .map(([itemId, totals]) => {
      const item = itemById.get(itemId)
      return { itemId, name: item?.name ?? 'Artículo eliminado', code: item?.code ?? null, unit: item?.unit ?? 'unit', ...totals }
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)

  const categoryTotals = new Map<string, { categoryId: string; unit: string; quantity: number; revenue: string }>()
  for (const [itemId, totals] of itemTotals) {
    const item = itemById.get(itemId)
    const categoryId = item?.cat3_id ?? 'sin-categoria'
    const unit = item?.unit ?? 'unit'
    const key = `${categoryId}|${unit}`
    const existing = categoryTotals.get(key) ?? { categoryId, unit, quantity: 0, revenue: '0.00' }
    categoryTotals.set(key, { ...existing, quantity: addQuantity(existing.quantity, totals.quantity), revenue: sumMoney(existing.revenue, totals.revenue) })
  }

  const topCategories: CategoryRanking[] = [...categoryTotals.values()]
    .map(({ categoryId, ...totals }) => {
      const name = categoryId === 'sin-categoria' ? 'Sin categoría' : (categoryById.get(categoryId)?.name ?? 'Categoría eliminada')
      return { categoryId, name, path: categoryPath(categoryId, categoryById) || name, ...totals }
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6)

  return { topItems, topCategories }
}
