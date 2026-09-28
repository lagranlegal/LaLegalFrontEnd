import { formatQuantity } from '@/lib/inventory/units'

/**
 * «1,1 artículos» del reporte de utilidad.
 *
 * Desde F6-02 del backend (27/09/2026) `units_sold` es un Decimal como string
 * con tres decimales de relleno — `"1.100"`, `"1.000"` — porque se vende por
 * gramos. Pintarlo crudo se lee como mil cien, y compararlo con `=== 1` nunca
 * es cierto para un string: una venta de una pieza decía «1.000 artículos».
 */
export function unitsSoldText(unitsSold: string): string {
  return `${formatQuantity(unitsSold)} ${Number(unitsSold) === 1 ? 'artículo' : 'artículos'}`
}
