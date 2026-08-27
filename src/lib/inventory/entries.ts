import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useMoneyMutation } from '@/lib/api/useMoneyMutation'
import type { components } from '@/types/api'

export type Entry = components['schemas']['EntryOut']
export type EntryPayIn = components['schemas']['EntryPayIn']

/**
 * Ingreso por id, y saldarlo si quedó pendiente de pago — en `lib/` porque
 * `EntryDetailDialog` (components/shared/) los necesita y es compartido:
 * antes solo lo abría Inventario, ahora también el historial de un
 * proveedor (docs/PENDIENTES_FRONTEND.md #2) — mismo motivo por el que
 * `Sale`/`useVoidSale` viven en `lib/sales/void.ts`.
 */
export function useEntry(entryId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', 'entries', entryId] as const,
    queryFn: () => unwrap(api.GET('/api/v1/inventory/entries/{entry_id}', { params: { path: { entry_id: entryId! } } })),
    enabled: !!entryId,
  })
}

/**
 * Salda una compra que quedó pendiente de pago.
 *
 * Es mutación de dinero: genera el egreso de caja. El egreso cae en la sesión
 * abierta de HOY, no en la fecha de la compra — una sesión cerrada es
 * inmutable, así que no hay forma (ni debería haberla) de afectar la caja de
 * un día ya cuadrado y firmado.
 */
export function usePayEntry() {
  return useMoneyMutation<Entry, { entryId: string; body: EntryPayIn }>({
    mutationFn: ({ entryId, body }, idempotencyKey) =>
      unwrap(
        api.POST('/api/v1/inventory/entries/{entry_id}/pay', {
          params: { path: { entry_id: entryId } },
          body,
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      ),
    invalidateKeys: [['inventory'], ['dashboard'], ['cashbox']],
  })
}
