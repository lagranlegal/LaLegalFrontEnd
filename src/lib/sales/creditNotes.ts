import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import type { components } from '@/types/api'

export type CreditNote = components['schemas']['CreditNoteOut']

/**
 * Nota crédito de una devolución (00043): pasivo hacia el cliente, DERIVADO
 * — `redeemed_amount`/`balance` los calcula el backend en cada lectura,
 * nunca una columna guardada. Vive en `lib/` porque la consumen dos
 * features (`sales`, al vender, y `customers`, en la ficha del cliente) —
 * CLAUDE.md regla 3, mismo motivo por el que `useVoidSale` vive en
 * `lib/sales/void.ts`.
 */
export function useCustomerCreditNotes(customerId: string) {
  return useCursorInfiniteQuery(['customers', customerId, 'creditNotes'] as const, (cursor) =>
    unwrap(api.GET('/api/v1/credit-notes', { params: { query: { customer_id: customerId, cursor } } })),
    { enabled: !!customerId },
  )
}

export function useCreditNote(creditNoteId: string | null) {
  return useQuery({
    queryKey: ['creditNotes', creditNoteId] as const,
    queryFn: () => unwrap(api.GET('/api/v1/credit-notes/{credit_note_id}', { params: { path: { credit_note_id: creditNoteId! } } })),
    enabled: !!creditNoteId,
  })
}
