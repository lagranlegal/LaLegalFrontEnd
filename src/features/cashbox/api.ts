import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, unwrap } from '@/lib/api/client'

/**
 * `CASH_SESSION_NOT_OPEN` acá no es un error de UI — es el estado normal
 * "no hay caja abierta hoy" (docs/ARCHITECTURE.md §6). Se normaliza a
 * `null` para que `CashSessionBanner` lo trate como dato, no como falla.
 */
export function cashboxCurrentQueryOptions() {
  return queryOptions({
    queryKey: ['cashbox', 'current'] as const,
    queryFn: async () => {
      try {
        return await unwrap(api.GET('/api/v1/cashbox/sessions/current'))
      } catch (error) {
        if (error instanceof ApiError && error.code === 'CASH_SESSION_NOT_OPEN') {
          return null
        }
        throw error
      }
    },
  })
}

export function useCashboxCurrent() {
  return useQuery(cashboxCurrentQueryOptions())
}

export function useOpenSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (openingBalance: string) =>
      unwrap(
        api.POST('/api/v1/cashbox/sessions/open', {
          body: { opening_balance: openingBalance },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashbox', 'current'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
