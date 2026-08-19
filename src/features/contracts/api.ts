import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import { useMoneyMutation } from '@/lib/api/useMoneyMutation'
import type { components } from '@/types/api'

export type Contract = components['schemas']['ContractOut']
export type ContractCreateIn = components['schemas']['ContractCreateIn']
export type ContractImportIn = components['schemas']['ContractImportIn']
export type ContractUpdateIn = components['schemas']['ContractUpdateIn']
export type ContractItemIn = components['schemas']['ContractItemIn']
export type PaymentQuote = components['schemas']['PaymentQuoteOut']
export type PaymentOption = components['schemas']['PaymentOptionOut']
export type Payment = components['schemas']['PaymentOut']
export type PaymentCreateIn = components['schemas']['PaymentCreateIn']

// `useCustomerSearch`/`useCustomer` viven en `lib/customers/search.ts` — el
// paso 7 (sales) los necesita también, se promovieron de acá (mismo
// criterio de `lib/catalogs/categories.ts`, CLAUDE.md regla 3). Los
// consumidores de este feature los importan directo de `lib/`, no de acá.
// `useContract`/`contractQueryOptions` (detalle de un contrato) se
// promovieron igual a `lib/contracts/reference.ts` — `inventory` lo
// necesita para mostrar de qué contrato viene un artículo de remate.

// ---- Listado (cursor) + listos-para-remate (lista chica sin paginar, GET propio) ----

export function useContractsList(status: string) {
  return useCursorInfiniteQuery(['contracts', 'list', { status }] as const, (cursor) =>
    unwrap(api.GET('/api/v1/contracts', { params: { query: { status: status || undefined, cursor } } })),
  )
}

export function readyForAuctionQueryOptions() {
  return queryOptions({
    queryKey: ['contracts', 'ready-for-auction'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts/ready-for-auction')),
  })
}

export function useReadyForAuction() {
  return useQuery(readyForAuctionQueryOptions())
}

/**
 * `GET /contracts` no tiene `?q=` (confirmado en `docs/pending/API_GUIDE.md`
 * §7 — solo `status`/`cursor`/`limit`) — mismo hueco ya documentado para
 * `legacy_code` en `RECOMENDACIONES.md` §1.6 y para artículos de inventario
 * (`lib/inventory/items.ts`, paso 7). Se trae la página más grande posible
 * (200) y se filtra client-side por número de contrato o código anterior —
 * NO por nombre del cliente, porque `ContractOut` solo trae `customer_id`
 * (resolver el nombre de cada fila para filtrar sería N+1 requests). Mismo
 * hueco conocido: contratos fuera de esa ventana de 200 no aparecen.
 */
export function useContractSearch(q: string) {
  return useQuery({
    queryKey: ['contracts', 'search'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts', { params: { query: { limit: 200 } } })),
    select: (page) => {
      const query = q.trim().toLowerCase()
      if (!query) return []
      return page.items.filter((c) => String(c.number).includes(query) || c.legacy_code?.toLowerCase().includes(query)).slice(0, 20)
    },
    enabled: q.trim().length > 0,
  })
}

/**
 * Crear contrato desbolsa capital — mutación de dinero (CLAUDE.md regla 8):
 * pasa por `useMoneyMutation` para la `Idempotency-Key` por acción de
 * usuario. Invalida el listado + dashboard + caja (el dinero siempre mueve
 * caja, docs/ARCHITECTURE.md §3).
 */
export function useCreateContract() {
  return useMoneyMutation({
    mutationFn: (body: ContractCreateIn, idempotencyKey: string) =>
      unwrap(api.POST('/api/v1/contracts', { params: { header: { 'Idempotency-Key': idempotencyKey } }, body })),
    invalidateKeys: [['contracts'], ['dashboard'], ['cashbox', 'current']],
  })
}

/**
 * Import de contratos preexistentes (paso 5b, docs/RECOMENDACIONES.md §1.6):
 * migra la foto financiera al corte de un contrato del sistema anterior. A
 * diferencia de `useCreateContract`, NO desembolsa dinero (el préstamo ya se
 * entregó afuera) — usa `useMoneyMutation` solo por la `Idempotency-Key` que
 * el endpoint exige, así que `invalidateKeys` NO lleva `['cashbox','current']`
 * (docs/ARCHITECTURE.md §3).
 */
export function useImportContract() {
  return useMoneyMutation({
    mutationFn: (body: ContractImportIn, idempotencyKey: string) =>
      unwrap(api.POST('/api/v1/contracts/import', { params: { header: { 'Idempotency-Key': idempotencyKey } }, body })),
    invalidateKeys: [['contracts'], ['dashboard']],
  })
}

export function useUpdateContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ contractId, body }: { contractId: string; body: ContractUpdateIn }) =>
      unwrap(api.PATCH('/api/v1/contracts/{contract_id}', { params: { path: { contract_id: contractId } }, body })),
    onSuccess: (_data, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', contractId] })
      queryClient.invalidateQueries({ queryKey: ['contracts', 'list'] })
    },
  })
}

// ---- Abonos: SOLO desde payment-options (CLAUDE.md paso 5) ----

export function paymentOptionsQueryOptions(contractId: string) {
  return queryOptions({
    queryKey: ['contracts', contractId, 'payment-options'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts/{contract_id}/payment-options', { params: { path: { contract_id: contractId } } })),
  })
}

export function usePaymentOptions(contractId: string) {
  return useQuery(paymentOptionsQueryOptions(contractId))
}

export function usePaymentsList(contractId: string) {
  return useCursorInfiniteQuery(['contracts', contractId, 'payments'] as const, (cursor) =>
    unwrap(api.GET('/api/v1/contracts/{contract_id}/payments', { params: { path: { contract_id: contractId }, query: { cursor } } })),
  )
}

export function useCreatePayment(contractId: string) {
  return useMoneyMutation({
    mutationFn: (body: PaymentCreateIn, idempotencyKey: string) =>
      unwrap(
        api.POST('/api/v1/contracts/{contract_id}/payments', {
          params: { path: { contract_id: contractId }, header: { 'Idempotency-Key': idempotencyKey } },
          body,
        }),
      ),
    invalidateKeys: [['contracts', contractId], ['contracts', 'list'], ['dashboard'], ['cashbox', 'current']],
  })
}

// ---- Rematar: sin cuerpo, no mueve dinero directamente (crea borradores de inventario) ----

export function useAuctionContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (contractId: string) => unwrap(api.POST('/api/v1/contracts/{contract_id}/auction', { params: { path: { contract_id: contractId } } })),
    onSuccess: (_data, contractId) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', contractId] })
      queryClient.invalidateQueries({ queryKey: ['contracts', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['contracts', 'ready-for-auction'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
