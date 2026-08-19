import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import type { components } from '@/types/api'

export type ContractSummary = components['schemas']['ContractOut']
export type SaleSummary = components['schemas']['SaleOut']

/**
 * Historial de cliente (CONTEXTO.md §4: "ficha única + historial cruzado
 * contratos+compras").
 *
 * `GET /contracts` sigue sin filtro por `customer_id` (confirmado contra
 * `docs/PENDIENTES_BACKEND_INFRA.md` punto 2, todavía pendiente) — se trae
 * la página más grande posible (200, el máximo real de `limit`) y se filtra
 * client-side. Documentado como hueco conocido: si un cliente tiene
 * contratos más allá de esa ventana, el historial puede no mostrarlos
 * todos.
 */
export function useCustomerContracts(customerId: string) {
  return useQuery({
    queryKey: ['customers', customerId, 'contracts'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts', { params: { query: { limit: 200 } } })),
    select: (page) => page.items.filter((contract) => contract.customer_id === customerId),
    enabled: !!customerId,
  })
}

/**
 * `GET /sales` ya acepta `?customer_id=` (resuelto 19/08/2026, ver
 * `docs/PENDIENTES_BACKEND_INFRA.md` punto 3) — filtro real del backend,
 * paginado por cursor como cualquier otro listado. Reemplaza el parche
 * client-side de 200 registros que tenía esta función antes.
 */
export function useCustomerSales(customerId: string) {
  return useCursorInfiniteQuery(['customers', customerId, 'sales'] as const, (cursor) =>
    unwrap(api.GET('/api/v1/sales', { params: { query: { customer_id: customerId, cursor } } })),
  )
}
