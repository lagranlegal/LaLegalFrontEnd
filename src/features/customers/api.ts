import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery, fetchAllPages } from '@/lib/api/pagination'
import type { components } from '@/types/api'

export type Customer = components['schemas']['CustomerOut']
export type CustomerCreateIn = components['schemas']['CustomerCreateIn']
export type CustomerUpdateIn = components['schemas']['CustomerUpdateIn']

export function useCustomersList(q: string) {
  return useCursorInfiniteQuery(['customers', 'list', { q }] as const, (cursor) =>
    unwrap(api.GET('/api/v1/customers', { params: { query: { q: q || undefined, cursor } } })),
  )
}

/**
 * Trae TODOS los clientes — no hay `GET /customers?ids=` todavía (mismo
 * hueco que `GET /contracts` tenía para `?customer_id=` antes del
 * 27/08/2026), así que resolver nombre de cliente para un export de
 * contratos no puede pedirse por id puntual. Un solo bulk fetch en vez de
 * un `useCustomer` por contrato — para el tamaño de clientela de una
 * compraventa (cientos, no millones) esto es una sola tanda de requests,
 * no N.
 */
export function fetchAllCustomers(): Promise<Customer[]> {
  return fetchAllPages<Customer>((cursor) => unwrap(api.GET('/api/v1/customers', { params: { query: { cursor } } })))
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
