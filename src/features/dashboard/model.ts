import type { Dashboard } from '@/features/dashboard/api'

/**
 * Los contratos que siguen abiertos. `ready_for_auction_count` ya está dentro
 * de `in_extension_count` (el backend cuenta por `status`, y un listo para
 * remate sigue en `in_extension` con la prórroga vencida): no se suma dos veces.
 */
export function openContractsCount(contracts: Dashboard['contracts']): number {
  return contracts.active_count + contracts.in_arrears_count + contracts.in_extension_count
}
