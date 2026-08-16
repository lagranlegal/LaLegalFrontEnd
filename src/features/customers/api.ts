import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import type { components } from '@/types/api'

export type Customer = components['schemas']['CustomerOut']
export type CustomerCreateIn = components['schemas']['CustomerCreateIn']
export type CustomerUpdateIn = components['schemas']['CustomerUpdateIn']

export function useCustomersList(q: string) {
  return useCursorInfiniteQuery(['customers', 'list', { q }] as const, (cursor) =>
    unwrap(api.GET('/api/v1/customers', { params: { query: { q: q || undefined, cursor } } })),
  )
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CustomerCreateIn) => unwrap(api.POST('/api/v1/customers', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, body }: { customerId: string; body: CustomerUpdateIn }) =>
      unwrap(api.PATCH('/api/v1/customers/{customer_id}', { params: { path: { customer_id: customerId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })
}
