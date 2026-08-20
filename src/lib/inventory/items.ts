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
 * **Busca en el servidor** (`?q=` en `GET /inventory/items`). Antes traía la
 * primera página de 100 disponibles y filtraba en el navegador, lo que ponía
 * un techo duro real: con más de 100 artículos disponibles a la vez, un
 * artículo fuera de esa página simplemente NO se podía encontrar — y este es
 * el buscador del carrito de venta, así que era un artículo que no se podía
 * vender. Con `?q=` el filtro lo hace Postgres sobre todo el inventario
 * (código por prefijo, nombre por full-text) y el techo desaparece.
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
  const query = q.trim()
  return useQuery({
    // `q` va en la clave: cada término es su propia entrada de cache, así que
    // volver a un término ya buscado es instantáneo.
    queryKey: ['inventory', 'items', 'available-search', query] as const,
    queryFn: () => unwrap(api.GET('/api/v1/inventory/items', { params: { query: { status: 'available', q: query, limit: 8 } } })),
    // Sin término no se pide nada (el picker no muestra lista hasta que se
    // escribe). `SearchInput` ya trae debounce de 300ms, así que no se
    // dispara una request por tecla.
    enabled: query.length > 0,
    select: (page) => page.items,
  })
}

/**
 * Búsqueda para REPONER: incluye artículos de cualquier estado, no solo los
 * disponibles. Es lo contrario a `useAvailableItemsSearch` (que alimenta el
 * carrito de venta y por eso filtra `available`): el artículo que uno quiere
 * volver a comprar es, típicamente, el que se AGOTÓ.
 *
 * Opcionalmente acota a un proveedor, que es el caso que pidió el cliente:
 * "si tengo un artículo que existe y es del mismo proveedor, debería dejar
 * seleccionármelo".
 */
export function useItemsForRestock(q: string, supplierId?: string) {
  const query = q.trim()
  return useQuery({
    queryKey: ['inventory', 'items', 'restock-search', query, supplierId ?? null] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/inventory/items', {
          params: { query: { q: query, supplier_id: supplierId || undefined, limit: 8 } },
        }),
      ),
    enabled: query.length > 0,
    select: (page) => page.items,
  })
}
