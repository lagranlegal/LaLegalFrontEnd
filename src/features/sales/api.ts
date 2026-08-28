import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery, fetchAllPages } from '@/lib/api/pagination'
import { useMoneyMutation } from '@/lib/api/useMoneyMutation'
import type { components } from '@/types/api'

export type Sale = components['schemas']['SaleOut']
export type SaleCreateIn = components['schemas']['SaleCreateIn']

export function useSalesList() {
  return useCursorInfiniteQuery(['sales', 'list'] as const, (cursor) => unwrap(api.GET('/api/v1/sales', { params: { query: { cursor } } })))
}

/**
 * Trae TODAS las ventas — para exportar a Excel, no para la tabla con
 * scroll infinito (eso es `useSalesList`). Esta pantalla no tiene filtros
 * todavía, así que exporta el mismo universo que `useSalesList` sin acotar.
 */
export function fetchAllSales(): Promise<Sale[]> {
  return fetchAllPages<Sale>((cursor) => unwrap(api.GET('/api/v1/sales', { params: { query: { cursor } } })))
}

export function useSale(saleId: string | undefined) {
  return useQuery({
    queryKey: ['sales', saleId] as const,
    queryFn: () => unwrap(api.GET('/api/v1/sales/{sale_id}', { params: { path: { sale_id: saleId! } } })),
    enabled: !!saleId,
  })
}

/**
 * Venta tipo POS — desembolsa mercancía a cambio de dinero, mueve caja
 * (CLAUDE.md regla 8): `useMoneyMutation` por la `Idempotency-Key`, invalida
 * caja + dashboard igual que contratos/abonos (docs/ARCHITECTURE.md §3).
 */
export function useCreateSale() {
  return useMoneyMutation({
    mutationFn: (body: SaleCreateIn, idempotencyKey: string) => unwrap(api.POST('/api/v1/sales', { params: { header: { 'Idempotency-Key': idempotencyKey } }, body })),
    invalidateKeys: [['sales'], ['dashboard'], ['cashbox', 'current'], ['inventory']],
  })
}

// `useVoidSale` vive en `lib/sales/void.ts` — lo consume `SaleReceiptDialog`
// (components/shared/), que no puede importar el `service` de esta feature.
