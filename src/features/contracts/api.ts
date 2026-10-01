import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery, fetchAllPages } from '@/lib/api/pagination'
import { useMoneyMutation } from '@/lib/api/useMoneyMutation'
import type { components, operations } from '@/types/api'

export type Contract = components['schemas']['ContractOut']
/** Un contrato del listado (`GET /contracts`): `ContractOut` + `customer_name` y `customer_document` (issue #10). */
export type ContractListItem = components['schemas']['ContractListItemOut']
/** Orden del listado. El cursor lleva el orden: cambiarlo obliga a volver a la primera página (otro `sort` con un cursor ajeno da 400). */
export type ContractSort = NonNullable<NonNullable<operations['list_contracts_api_v1_contracts_get']['parameters']['query']>['sort']>
export type ContractCreateIn = components['schemas']['ContractCreateIn']
export type ContractImportIn = components['schemas']['ContractImportIn']
export type ContractUpdateIn = components['schemas']['ContractUpdateIn']
export type ContractItemIn = components['schemas']['ContractItemIn']
export type PaymentQuote = components['schemas']['PaymentQuoteOut']
export type PaymentOption = components['schemas']['PaymentOptionOut']
export type Payment = components['schemas']['PaymentOut']
export type PaymentCreateIn = components['schemas']['PaymentCreateIn']
export type ContractChainLink = components['schemas']['ContractChainLinkOut']

// `useCustomerSearch`/`useCustomer` viven en `lib/customers/search.ts` — el
// paso 7 (sales) los necesita también, se promovieron de acá (mismo
// criterio de `lib/catalogs/categories.ts`, CLAUDE.md regla 3). Los
// consumidores de este feature los importan directo de `lib/`, no de acá.
// `useContract`/`contractQueryOptions` (detalle de un contrato) se
// promovieron igual a `lib/contracts/reference.ts` — `inventory` lo
// necesita para mostrar de qué contrato viene un artículo de remate.

// ---- Listado (cursor) + listos-para-remate (lista chica sin paginar, GET propio) ----

/**
 * El `sort` va en la llave: cambiar de orden es otra consulta que arranca sin
 * cursor (la primera página). Reusar las páginas ya cargadas mandaría un
 * cursor emitido con otro orden, y el backend lo rechaza con 400.
 */
export function useContractsList(status: string, sort: ContractSort = 'next_due_asc') {
  return useCursorInfiniteQuery(['contracts', 'list', { status, sort }] as const, (cursor) =>
    unwrap(api.GET('/api/v1/contracts', { params: { query: { status: status || undefined, sort, cursor } } })),
  )
}

/**
 * Trae TODOS los contratos que matchean el estado elegido — para exportar a
 * Excel, no para una tabla con scroll infinito (eso es `useContractsList`).
 * Mismo query que arma `useContractsList` (estado y orden), así el archivo exportado
 * coincide con lo que la pestaña de estado está mostrando en pantalla.
 */
export function fetchAllContracts(status: string, sort: ContractSort = 'next_due_asc'): Promise<Contract[]> {
  return fetchAllPages<Contract>((cursor) =>
    unwrap(api.GET('/api/v1/contracts', { params: { query: { status: status || undefined, sort, cursor } } })),
  )
}

export function readyForAuctionQueryOptions() {
  return queryOptions({
    queryKey: ['contracts', 'ready-for-auction'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts/ready-for-auction')),
  })
}

export function useReadyForAuction({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ ...readyForAuctionQueryOptions(), enabled })
}

/**
 * `GET /contracts?q=` ya existe (resuelto 27/08/2026, mismo patrón que
 * `customers.list_customers`) — busca por número, `legacy_code` y nombre/
 * documento del cliente, del lado del backend. Reemplaza el parche que
 * traía 200 contratos y filtraba en el navegador SIN poder buscar por
 * cliente (`ContractOut` solo trae `customer_id`, no el nombre).
 */
export function useContractSearch(q: string, sort: ContractSort = 'next_due_asc') {
  const query = q.trim()
  return useQuery({
    queryKey: ['contracts', 'search', query, sort] as const,
    queryFn: () => unwrap(api.GET('/api/v1/contracts', { params: { query: { q: query, limit: 20, sort } } })),
    select: (page) => page.items,
    enabled: query.length > 0,
  })
}

/**
 * Crear contrato desbolsa capital — mutación de dinero (CLAUDE.md regla 8):
 * pasa por `useMoneyMutation` para la `Idempotency-Key` por acción de
 * usuario. Invalida el listado + dashboard + caja (el dinero siempre mueve
 * caja, docs/ARQUITECTURA.md §3).
 */
export function useCreateContract() {
  return useMoneyMutation({
    mutationFn: (body: ContractCreateIn, idempotencyKey: string) =>
      unwrap(api.POST('/api/v1/contracts', { params: { header: { 'Idempotency-Key': idempotencyKey } }, body })),
    // `['customers']`: el formulario puede cargar el correo del cliente y su
    // autorización de avisos en la misma operación (backend-starter/docs/DOMINIO.md §9.2).
    invalidateKeys: [['contracts'], ['dashboard'], ['cashbox', 'current'], ['customers']],
  })
}

/**
 * Import de contratos preexistentes (paso 5b, backend-starter/docs/DOMINIO.md §2.5):
 * migra la foto financiera al corte de un contrato del sistema anterior. A
 * diferencia de `useCreateContract`, NO desembolsa dinero (el préstamo ya se
 * entregó afuera) — usa `useMoneyMutation` solo por la `Idempotency-Key` que
 * el endpoint exige, así que `invalidateKeys` NO lleva `['cashbox','current']`
 * (docs/ARQUITECTURA.md §3).
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

// ---- Abonos: SOLO desde payment-options (paso 5 del plan de construcción original) ----

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

/**
 * Con `Idempotency-Key` desde F4-04 del backend (27/09/2026): el doble remate
 * ya lo impedía el bloqueo del contrato, pero el reintento de una respuesta
 * perdida recibía un 409 en vez del remate hecho. Con la clave recibe la
 * respuesta original. `useMoneyMutation` y no `useMutation` por eso, aunque
 * no mueva caja.
 */
export function useAuctionContract() {
  const queryClient = useQueryClient()
  return useMoneyMutation({
    mutationFn: (contractId: string, idempotencyKey: string) =>
      unwrap(
        api.POST('/api/v1/contracts/{contract_id}/auction', {
          params: { path: { contract_id: contractId }, header: { 'Idempotency-Key': idempotencyKey } },
        }),
      ),
    invalidateKeys: [['contracts', 'list'], ['contracts', 'ready-for-auction'], ['dashboard'], ['inventory']],
    onSuccess: (_data, contractId) => {
      void queryClient.invalidateQueries({ queryKey: ['contracts', contractId] })
    },
  })
}

// ---- Ampliar el préstamo, el "recargo" (00051, backend-starter/docs/DOMINIO.md §3) ----------

export type ExtensionQuote = components['schemas']['ExtensionQuoteOut']
export type ContractExtendIn = components['schemas']['ContractExtendIn']

/**
 * Cuánto puede retirar el cliente sobre la garantía que ya dejó.
 *
 * Va con `contracts.view`, no con `extend_loan`: el cupo es información del
 * contrato y sirve para atender aunque quien mira no pueda ejecutarlo.
 * Responde SIEMPRE, incluso cuando no se puede ampliar — `blocked_reason`
 * dice por qué, para que la pantalla explique en vez de esconder la opción.
 */
export function useExtensionOptions(contractId: string, enabled = true) {
  return useQuery({
    queryKey: ['contracts', contractId, 'extension-options'] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/contracts/{contract_id}/extension-options', {
          params: { path: { contract_id: contractId } },
        }),
      ),
    enabled,
  })
}

/**
 * La cadena de ampliaciones del contrato, de la raíz al último
 * (`GET /contracts/{id}/chain`, backend-starter/docs/DOMINIO.md §3). `ContractOut` solo mira hacia
 * atrás (`parent_contract_id`); con esto el contrato ampliado sabe a cuál pasó
 * la deuda, cuándo y por cuánto, y una cadena larga se puede recorrer.
 *
 * La key cuelga de `['contracts', id]` a propósito: ampliar ya invalida ese
 * prefijo, así que la cadena del contrato recién cerrado se refresca sola.
 */
export function useContractChain(contractId: string, enabled = true) {
  return useQuery({
    queryKey: ['contracts', contractId, 'chain'] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/contracts/{contract_id}/chain', { params: { path: { contract_id: contractId } } })),
    enabled,
  })
}

/**
 * Ampliar el préstamo. **Devuelve un contrato NUEVO**, con otro número: el
 * viejo queda `superseded`. Por eso la pantalla navega al sucesor en vez de
 * quedarse donde está — el documento que se está mirando dejó de ser la
 * obligación vigente.
 *
 * Pasa por `useMoneyMutation`: entrega efectivo, así que un reintento de red
 * no puede desembolsar dos veces.
 */
export function useExtendLoan(contractId: string) {
  return useMoneyMutation({
    mutationFn: (body: ContractExtendIn, idempotencyKey: string) =>
      unwrap(
        api.POST('/api/v1/contracts/{contract_id}/extend-loan', {
          params: { path: { contract_id: contractId }, header: { 'Idempotency-Key': idempotencyKey } },
          body,
        }),
      ),
    invalidateKeys: [
      ['contracts', contractId],
      ['contracts', 'list'],
      ['dashboard'],
      ['cashbox', 'current'],
      ['accounts'],
    ],
  })
}
