import { queryOptions, useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export function dashboardQueryOptions() {
  return queryOptions({
    queryKey: ['dashboard'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/reports/dashboard')),
  })
}

/**
 * `enabled`: sin `reports.view` la consulta no sale (issue #9). El 403 no era
 * una falla, pero sí un error evitable en cada carga del Inicio del Asesor.
 */
export function useDashboard({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ ...dashboardQueryOptions(), enabled })
}

/**
 * Duplicado deliberado del hook de `features/contracts/api.ts` (features
 * aisladas, CLAUDE.md regla 3 — el dashboard no importa internals de
 * contracts). La `queryKey` SÍ debe coincidir con la de contracts
 * (`['contracts','ready-for-auction']`) para que rematar un contrato
 * invalide esta card también, no solo la lista de contratos.
 */
export function useReadyForAuction({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['contracts', 'ready-for-auction'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts/ready-for-auction')),
    enabled,
  })
}

export type Dashboard = components['schemas']['DashboardOut']
export type ContractAttention = components['schemas']['ContractAttentionOut']
export type AttentionItem = components['schemas']['AttentionItemOut']

/** Filas de «Requieren acción»; las tarjetas «Para hoy» cuentan todo, sin tope. */
export const ATTENTION_LIMIT = 5

/**
 * «Para hoy» y «Requieren acción» (`GET /contracts/attention`, rediseño P2-c).
 * Va con `contracts.view`, así que la ve el Asesor; sin ese permiso (Bodega)
 * no sale. La clave cuelga de `['dashboard']`: toda mutación de contrato ya
 * invalida esa raíz, y un abono tiene que sacar la fila de la lista.
 */
export function useContractAttention({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['dashboard', 'attention', ATTENTION_LIMIT] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts/attention', { params: { query: { limit: ATTENTION_LIMIT } } })),
    enabled,
  })
}
