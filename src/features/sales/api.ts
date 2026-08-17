import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import { useMoneyMutation } from '@/lib/api/useMoneyMutation'
import type { components } from '@/types/api'

export type Sale = components['schemas']['SaleOut']
export type SaleCreateIn = components['schemas']['SaleCreateIn']
export type VoidSaleIn = components['schemas']['VoidSaleIn']

export function useSalesList() {
  return useCursorInfiniteQuery(['sales', 'list'] as const, (cursor) => unwrap(api.GET('/api/v1/sales', { params: { query: { cursor } } })))
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

/** Sin `Idempotency-Key` — el endpoint no lo acepta. Anular no mueve caja de nuevo (el dinero ya se movió al vender); solo cambia el estado. */
export function useVoidSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ saleId, reason }: { saleId: string; reason: string }) =>
      unwrap(api.POST('/api/v1/sales/{sale_id}/void', { params: { path: { sale_id: saleId } }, body: { reason } })),
    onSuccess: (_data, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: ['sales', saleId] })
      queryClient.invalidateQueries({ queryKey: ['sales', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
