import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type Sale = components['schemas']['SaleOut']

/**
 * Promovido desde `features/sales/api.ts` — `SaleReceiptDialog` se movió a
 * `components/shared/` (segundo consumidor real: `customers`, historial de
 * cliente) y no puede importar el `service` de otra feature (CLAUDE.md
 * regla 3). Sin `Idempotency-Key` — el endpoint no lo acepta. Anular no
 * mueve caja de nuevo (el dinero ya se movió al vender); solo cambia el
 * estado.
 */
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
