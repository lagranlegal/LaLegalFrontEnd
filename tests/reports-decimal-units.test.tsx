import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { unitsSoldText } from '@/features/reports/units'
import { aggregateItemRanking } from '@/features/reports/rankings'
import type { Sale } from '@/lib/sales/void'
import type { Item } from '@/lib/inventory/items'

/**
 * F6-02 del backend (27/09/2026, commits 41f0cde y b918371): las cantidades de
 * los reportes pasaron de `int` a `Decimal` porque se vende por gramos. Llegan
 * como string con TRES decimales de relleno — `"1.400"`, `"2.000"` — y
 * pintarlas crudas en una pantalla en español se lee como MIL CUATROCIENTOS y
 * DOS MIL: el punto es el separador de miles en Colombia.
 *
 * LOS SOBRES SON REALES: copiados de la respuesta del backend local
 * (TestClient) en `test_reportes_con_cantidades_fraccionarias` y
 * `test_stale_inventory_uses_the_oldest_lot`, 27/09/2026.
 */

/** `GET /reports/profit` tras vender 1,1 g de un lote de 2,5 g. */
const UTILIDAD = {
  from_date: '2026-09-27',
  to_date: '2026-09-27',
  sale_count: 1,
  units_sold: '1.100',
  gross_revenue: '330000.00',
  discounts: '0.00',
  sales_returns: '0',
  return_count: 0,
  net_revenue: '330000.00',
  cost_of_goods_sold: '220000.00',
  returns_cost: '0',
  gross_profit: '110000.00',
  margin_pct: '33.33',
}

/** `GET /reports/inventory-valuation`, mismo escenario (quedan 1,4 g). */
const VALORIZACION = {
  as_of: '2026-09-27',
  units: '1.400',
  lot_count: 1,
  cost_value: '280000.00',
  retail_value: '420000.00',
  potential_profit: '140000.00',
  by_category: [{ cat1_id: '6ac5d9a6-a17d-4f94-8c29-cfe2bc81b8c1', cat1_name: 'Joyería', units: '1.400', cost_value: '280000.00', retail_value: '420000.00' }],
}

/** `GET /reports/stale-inventory` con dos lotes de una unidad. */
const SIN_ROTACION = {
  as_of: '2026-09-27',
  threshold_days: 90,
  product_count: 1,
  total_cost_value: '1000000.00',
  items: [
    {
      product_id: '5820dc1c-5112-4deb-b2d8-290d741c8edf',
      product_code: 'JOC0001',
      product_name: 'Cadena dormida',
      units: '2.000',
      cost_value: '1000000.00',
      days_in_stock: 200,
    },
  ],
}

vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }))
vi.mock('@/features/reports/api', () => ({
  usePayables: () => ({ data: { entry_count: 0 }, isPending: false, isError: false }),
  useInventoryValuation: () => ({ data: VALORIZACION, isPending: false, isError: false }),
  useStaleInventory: () => ({ data: SIN_ROTACION, isPending: false, isError: false }),
}))

const { ContablesSection } = await import('@/features/reports/components/ContablesSection')

afterEach(cleanup)

describe('reportes — las cantidades decimales no se leen como miles', () => {
  it('«1.100 artículos» vendidos se lee 1,1 y en plural', () => {
    expect(unitsSoldText(UTILIDAD.units_sold)).toBe('1,1 artículos')
  })

  it('una sola unidad sigue en singular aunque venga como "1.000"', () => {
    // Con `units_sold === 1` (la comparación de antes) un string nunca es 1:
    // todas las ventas de una pieza decían «1.000 artículos».
    expect(unitsSoldText('1.000')).toBe('1 artículo')
  })

  it('la valorización y la mercancía sin rotación muestran la cantidad sin ceros de relleno', () => {
    render(<ContablesSection />)
    expect(screen.getByText('1,4 unidad(es) en 1 lote(s)')).toBeInTheDocument()
    const fila = screen.getByText('Joyería').closest('tr')!
    expect(within(fila).getByText('1,4')).toBeInTheDocument()
    const producto = screen.getByText('Cadena dormida').closest('tr')!
    expect(within(producto).getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('2.000')).toBeNull()
    expect(screen.queryByText('1.400')).toBeNull()
  })

  it('el ranking suma cantidades fraccionarias sin arrastrar ruido de coma flotante', () => {
    // 1.1 + 0.2 en coma flotante es 1.3000000000000003, que salía tal cual
    // en la pantalla y en la columna «Cantidad» del Excel.
    const venta = (id: string, quantity: string) =>
      ({ id, number: 1, status: 'completed', lines: [{ id: `l-${id}`, item_id: 'i1', quantity, unit_price: '1000.00', subtotal: '1000.00' }] }) as unknown as Sale
    const item = { id: 'i1', name: 'Oro por gramo', code: 'JOA0001', cat3_id: 'c3' } as unknown as Item
    const { topItems, topCategories } = aggregateItemRanking([venta('a', '1.100'), venta('b', '0.200')], [item], [])
    expect(topItems[0]!.quantity).toBe(1.3)
    expect(topCategories[0]!.quantity).toBe(1.3)
  })
})
