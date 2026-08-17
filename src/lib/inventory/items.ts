import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type Item = components['schemas']['ItemOut']

/**
 * Búsqueda de artículos disponibles en `lib/` (no en `features/inventory/`)
 * porque más de una feature la necesita — egresos (inventory) y el carrito
 * de venta (sales) — mismo criterio que `lib/catalogs/categories.ts`
 * (CLAUDE.md regla 3: compartido entre features vive en `lib/`).
 *
 * **Sin `q` en el backend:** `GET /inventory/items` solo filtra por
 * `status`/`cursor`/`limit`, sin búsqueda de texto (mismo hueco que
 * `legacy_code` en contratos, documentado en `RECOMENDACIONES.md` §1.6).
 * Se trae la primera página de disponibles (100, generoso para un picker) y
 * se filtra por código/nombre en el cliente — si una compraventa tiene más
 * de 100 artículos disponibles a la vez, la búsqueda puede no encontrar uno
 * fuera de esa página. Documentado como hueco conocido, no un bug oculto.
 */
/** Artículo por id — `SaleLineOut` solo trae `item_id`, no el nombre/código para mostrar en el recibo. */
export function useItem(itemId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', 'items', 'by-id', itemId] as const,
    queryFn: () => unwrap(api.GET('/api/v1/inventory/items/{item_id}', { params: { path: { item_id: itemId! } } })),
    enabled: !!itemId,
  })
}

export function useAvailableItemsSearch(q: string) {
  return useQuery({
    queryKey: ['inventory', 'items', 'available-search'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/inventory/items', { params: { query: { status: 'available', limit: 100 } } })),
    select: (page) => {
      const query = q.trim().toLowerCase()
      if (!query) return []
      return page.items.filter((item) => item.name.toLowerCase().includes(query) || item.code?.toLowerCase().includes(query)).slice(0, 8)
    },
  })
}
