import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type ContractSummary = components['schemas']['ContractOut']
export type SaleSummary = components['schemas']['SaleOut']

/**
 * Historial de cliente (CONTEXTO.md §4: "ficha única + historial cruzado
 * contratos+compras") — **ni `GET /contracts` ni `GET /sales` tienen filtro
 * por `customer_id`** (confirmado contra `docs/pending/API_GUIDE.md` §7/§10:
 * el primero solo filtra por `status`, el segundo no tiene ningún filtro).
 * Mismo criterio ya usado para artículos de inventario
 * (`lib/inventory/items.ts`, paso 7) y `legacy_code` de contratos: se trae
 * la página más grande posible (200, el máximo real de `limit`) y se filtra
 * client-side. Documentado como hueco conocido, no oculto — si un cliente
 * tiene contratos/ventas más allá de esa ventana (poco probable salvo una
 * empresa con miles de registros), el historial puede no mostrarlos todos.
 */
export function useCustomerContracts(customerId: string) {
  return useQuery({
    queryKey: ['customers', customerId, 'contracts'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts', { params: { query: { limit: 200 } } })),
    select: (page) => page.items.filter((contract) => contract.customer_id === customerId),
    enabled: !!customerId,
  })
}

export function useCustomerSales(customerId: string) {
  return useQuery({
    queryKey: ['customers', customerId, 'sales'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/sales', { params: { query: { limit: 200 } } })),
    select: (page) => page.items.filter((sale) => sale.customer_id === customerId),
    enabled: !!customerId,
  })
}
