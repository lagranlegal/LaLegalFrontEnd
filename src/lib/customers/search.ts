import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { hasEnoughToSearch } from '@/lib/search'
import type { components } from '@/types/api'

export type Customer = components['schemas']['CustomerOut']

/**
 * Búsqueda liviana de clientes en `lib/` (no en `features/customers/`) —
 * contratos y ventas la necesitan como referencia, mismo criterio que
 * `lib/catalogs/categories.ts` (CLAUDE.md regla 3). Solo primera página (8
 * resultados): es un picker, no un listado con "cargar más".
 *
 * Consulta desde `MIN_SEARCH_CHARS` (3) y no desde el primer carácter: con
 * una o dos letras, ocho filas de cientos ordenadas por un id aleatorio no
 * son un resultado — son ruido con forma de respuesta. Quien llama debe
 * distinguir "todavía no busqué" de "no hay" con `hasEnoughToSearch`.
 */
export function useCustomerSearch(q: string) {
  return useQuery({
    queryKey: ['customers', 'search', q] as const,
    queryFn: () => unwrap(api.GET('/api/v1/customers', { params: { query: { q, limit: 8 } } })),
    enabled: hasEnoughToSearch(q),
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
