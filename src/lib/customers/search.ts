import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type Customer = components['schemas']['CustomerOut']

/**
 * Búsqueda liviana de clientes en `lib/` (no en `features/customers/`) —
 * contratos y ventas la necesitan como referencia, mismo criterio que
 * `lib/catalogs/categories.ts` (CLAUDE.md regla 3). Solo primera página (8
 * resultados): es un picker, no un listado con "cargar más".
 */
export function useCustomerSearch(q: string) {
  return useQuery({
    queryKey: ['customers', 'search', q] as const,
    queryFn: () => unwrap(api.GET('/api/v1/customers', { params: { query: { q, limit: 8 } } })),
    enabled: q.trim().length > 0,
  })
}

/**
 * Cliente por id — `ContractOut`/`SaleOut` solo traen `customer_id`, no el
 * cliente embebido. `enabled` evita pedir `/customers/` sin id mientras el
 * padre todavía carga (bug real encontrado en el paso 5: ese request
 * disparaba un 307 que el navegador rechazaba por CORS).
 */
export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: ['customers', 'by-id', customerId] as const,
    queryFn: () => unwrap(api.GET('/api/v1/customers/{customer_id}', { params: { path: { customer_id: customerId } } })),
    enabled: customerId.length > 0,
  })
}
