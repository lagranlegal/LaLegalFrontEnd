import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type SettlementInfo = components['schemas']['SettlementInfoOut']

/**
 * Para el botón "Imprimir paz y salvo" — solo tiene sentido cuando el
 * contrato ya está `status='paid'` (`enabled` lo controla el caller, mismo
 * criterio que `effectiveContractStatus(contract) === 'paid'` ya usa
 * `ContractDetailPage` para mostrar/ocultar el botón).
 */
export function useSettlementInfo(contractId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['contracts', contractId, 'settlement'] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/contracts/{contract_id}/settlement', { params: { path: { contract_id: contractId } } })),
    enabled,
  })
}
