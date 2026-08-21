import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type Product = components['schemas']['ProductOut']

/**
 * Buscador de PRODUCTOS para armar una compra.
 *
 * Reemplaza a `useItemsForRestock` en el formulario de ingreso, y el cambio no
 * es cosmético: un producto trae nombre, categorías **y precio de venta**, que
 * es justo lo que hace falta para agregar una línea completa de un solo clic.
 * Un lote trae además un costo puntual, que es información de ESA compra y no
 * del producto — sugerirlo como costo de la compra nueva invitaba a repetir un
 * precio de hace seis meses.
 *
 * `include_unique: false` a propósito: las piezas de remate son productos de
 * un solo lote e irrepetibles, así que ofrecerlas para "volver a comprar" no
 * tiene sentido.
 */
export function useProductSearch(q: string, opts?: { supplierId?: string }) {
  const query = q.trim()
  return useQuery({
    queryKey: ['inventory', 'products', 'search', query, opts?.supplierId ?? null] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/inventory/products', {
          params: { query: { q: query, supplier_id: opts?.supplierId || undefined, limit: 8 } },
        }),
      ),
    enabled: query.length > 0,
    select: (page) => page.items,
  })
}
