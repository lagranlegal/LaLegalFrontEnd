import { queryOptions, useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'

export function dashboardQueryOptions() {
  return queryOptions({
    queryKey: ['dashboard'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/reports/dashboard')),
  })
}

export function useDashboard() {
  return useQuery(dashboardQueryOptions())
}

/**
 * Duplicado deliberado del hook de `features/contracts/api.ts` (features
 * aisladas, CLAUDE.md regla 3 — el dashboard no importa internals de
 * contracts). La `queryKey` SÍ debe coincidir con la de contracts
 * (`['contracts','ready-for-auction']`) para que rematar un contrato
 * invalide esta card también, no solo la lista de contratos.
 */
export function useReadyForAuction() {
  return useQuery({
    queryKey: ['contracts', 'ready-for-auction'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts/ready-for-auction')),
  })
}
