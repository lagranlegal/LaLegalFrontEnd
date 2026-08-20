import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import type { components } from '@/types/api'

export type Company = components['schemas']['CompanyOut']
export type CompanyCreateIn = components['schemas']['CompanyCreateIn']
export type SubscriptionExtendIn = components['schemas']['SubscriptionExtendIn']
export type SubscriptionEvent = components['schemas']['SubscriptionEventOut']
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'companies'] })
      // La extensión agrega una línea al historial: sin esto el panel muestra
      // la fecha nueva pero el historial sigue mostrando la renovación anterior.
      queryClient.invalidateQueries({ queryKey: ['platform', 'subscription-events'] })
    },
  })
}

/**
 * Historial comercial: altas, renovaciones (con monto y notas), suspensiones,
 * reactivaciones y vencimientos. Es una tabla propia del backend
 * (`subscription_event`) y no el `audit_log`, porque ese es tenant-scoped por
 * RLS — un super-admin nunca puede leer el de otra empresa — y además solo
 * guarda `expires_at`, así que las notas de cada renovación se perdían.
 */
export function useSubscriptionEvents(companyId: string | undefined) {
  return useCursorInfiniteQuery(
    ['platform', 'subscription-events', companyId] as const,
    (cursor) =>
      unwrap(
        api.GET('/api/v1/platform/companies/{company_id}/subscription/events', {
          params: { path: { company_id: companyId as string }, query: { cursor } },
        }),
      ),
    { enabled: !!companyId },
  )
}

export function usePlans() {
  return useQuery({
    queryKey: ['platform', 'plans'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/platform/plans')),
  })
}
