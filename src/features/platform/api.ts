import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import type { components } from '@/types/api'

export type Company = components['schemas']['CompanyOut']
export type CompanyCreateIn = components['schemas']['CompanyCreateIn']
export type SubscriptionExtendIn = components['schemas']['SubscriptionExtendIn']
export type Plan = components['schemas']['PlanOut']

// Ninguna de estas mutaciones acepta `Idempotency-Key` (confirmado en
// src/types/api.ts, mismo patrón que identity/inventory) — no son
// mutaciones de dinero (regla 8), así que `useMoneyMutation` no aplica acá;
// `isPending` es la única protección contra doble-submit.

export function useCompaniesList() {
  return useCursorInfiniteQuery(['platform', 'companies', 'list'] as const, (cursor) =>
    unwrap(api.GET('/api/v1/platform/companies', { params: { query: { cursor } } })),
  )
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CompanyCreateIn) => unwrap(api.POST('/api/v1/platform/companies', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'companies'] }),
  })
}

export function useSuspendCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (companyId: string) => unwrap(api.POST('/api/v1/platform/companies/{company_id}/suspend', { params: { path: { company_id: companyId } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'companies'] }),
  })
}

export function useActivateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (companyId: string) => unwrap(api.POST('/api/v1/platform/companies/{company_id}/activate', { params: { path: { company_id: companyId } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'companies'] }),
  })
}

export function useExtendSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, body }: { companyId: string; body: SubscriptionExtendIn }) =>
      unwrap(api.POST('/api/v1/platform/companies/{company_id}/subscription/extend', { params: { path: { company_id: companyId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'companies'] }),
  })
}

export function usePlans() {
  return useQuery({
    queryKey: ['platform', 'plans'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/platform/plans')),
  })
}
