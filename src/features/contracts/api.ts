import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery, fetchAllPages } from '@/lib/api/pagination'
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

/**
 * Trae TODOS los contratos que matchean el estado elegido — para exportar a
 * Excel, no para una tabla con scroll infinito (eso es `useContractsList`).
 * Mismo query que arma `useContractsList`, así el archivo exportado
 * coincide con lo que la pestaña de estado está mostrando en pantalla.
 */
export function fetchAllContracts(status: string): Promise<Contract[]> {
  return fetchAllPages<Contract>((cursor) =>
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
 * `GET /contracts?q=` ya existe (resuelto 27/08/2026, mismo patrón que
 * `customers.list_customers`) — busca por número, `legacy_code` y nombre/
 * documento del cliente, del lado del backend. Reemplaza el parche que
 * traía 200 contratos y filtraba en el navegador SIN poder buscar por
 * cliente (`ContractOut` solo trae `customer_id`, no el nombre).
 */
export function useContractSearch(q: string) {
  const query = q.trim()
  return useQuery({
    queryKey: ['contracts', 'search', query] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts', { params: { query: { q: query, limit: 20 } } })),
    select: (page) => page.items,
    enabled: query.length > 0,
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
