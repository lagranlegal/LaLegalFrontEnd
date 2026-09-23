import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type Sale = components['schemas']['SaleOut']

/**
 * Promovido desde `features/sales/api.ts` — `SaleReceiptDialog` se movió a
 * `components/shared/` (segundo consumidor real: `customers`, historial de
 * cliente) y no puede importar el `service` de otra feature (CLAUDE.md
 * regla 3). Sin `Idempotency-Key` — el endpoint no lo acepta.
 *
 * Anular SÍ mueve caja: el backend emite un contra-movimiento `out` por el
 * total contra la sesión abierta (`sales/service.py::void_sale`), además de
 * reponer el stock. Este comentario decía lo contrario hasta el 23/09/2026.
 * Por eso exige caja abierta (`CASH_SESSION_NOT_OPEN`) y por eso una venta
 * con devoluciones ya no se puede anular (`SALE_HAS_RETURNS`, F21-31): lo
 * devuelto ya se le pagó al cliente.
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
