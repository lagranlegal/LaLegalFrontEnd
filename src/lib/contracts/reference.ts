import { queryOptions, useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type Contract = components['schemas']['ContractOut']

/**
 * Promovido desde `features/contracts/api.ts` — `inventory` lo necesita
 * también (mostrar de qué contrato viene un artículo de remate,
 * `ItemOut.source_contract_id`), segundo consumidor real, mismo criterio
 * que `lib/customers/search.ts`/`lib/sales/void.ts` (CLAUDE.md regla 3).
 */
export function contractQueryOptions(contractId: string) {
  return queryOptions({
    queryKey: ['contracts', contractId] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts/{contract_id}', { params: { path: { contract_id: contractId } } })),
  })
}

export function useContract(contractId: string) {
  return useQuery(contractQueryOptions(contractId))
}
