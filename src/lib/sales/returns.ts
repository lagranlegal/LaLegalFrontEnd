import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useMoneyMutation } from '@/lib/api/useMoneyMutation'
import { compareMoney, formatCOP } from '@/lib/money'
import type { components } from '@/types/api'

export type SaleReturn = components['schemas']['SaleReturnOut']
export type SaleReturnCreateIn = components['schemas']['SaleReturnCreateIn']

export const RETURN_REASON_LABELS: Record<'defect' | 'change_of_mind' | 'other', string> = {
  defect: 'Defecto de fábrica',
  change_of_mind: 'Cambio de decisión',
  other: 'Otro',
}

export const RETURN_SETTLEMENT_LABELS: Record<'cash' | 'credit_note', string> = {
  cash: 'Efectivo',
  credit_note: 'Nota crédito',
}

export interface ReturnSettlementPart {
  kind: 'cash' | 'credit_note'
  label: string
  amount: string
}

/**
 * Cómo se liquidó una devolución (F21-37): cuánto salió en efectivo y
 * cuánto quedó en qué nota crédito. Una devolución en efectivo sobre una
 * venta pagada con nota se PARTE en el backend —lo pagado con nota vuelve
 * como nota nueva, solo lo pagado en plata sale del cajón—, así que una
 * misma devolución puede tener las dos partes. El reparto lo calcula el
 * backend (`refunded_amount` + `credit_note_amount` = `total_amount`); acá
 * solo se decide qué partes mostrar: las que no son cero.
 */
export function returnSettlementParts(ret: Pick<SaleReturn, 'refunded_amount' | 'credit_note_amount' | 'credit_note_number'>): ReturnSettlementPart[] {
  const parts: ReturnSettlementPart[] = []
  if (compareMoney(ret.refunded_amount, '0') > 0) {
    parts.push({ kind: 'cash', label: 'Efectivo', amount: ret.refunded_amount })
  }
  if (compareMoney(ret.credit_note_amount, '0') > 0) {
    parts.push({
      kind: 'credit_note',
      label: ret.credit_note_number != null ? `Nota crédito #${ret.credit_note_number}` : 'Nota crédito',
      amount: ret.credit_note_amount,
    })
  }
  return parts
}

/** El reparto en una línea, para el toast: «Efectivo $ 300.000 · Nota crédito #2 $ 500.000». */
export function returnSettlementSummary(ret: Pick<SaleReturn, 'refunded_amount' | 'credit_note_amount' | 'credit_note_number'>): string {
  return returnSettlementParts(ret)
    .map((part) => `${part.label} ${formatCOP(part.amount)}`)
    .join(' · ')
}

/**
 * Devoluciones de una venta. Vive en `lib/` porque `SaleReceiptDialog`
 * (components/shared/) las muestra y no puede importar `features/sales/api.ts`
 * (CLAUDE.md regla 3) — mismo motivo que `useVoidSale`.
 */
export function useSaleReturns(saleId: string | undefined) {
  return useQuery({
    queryKey: ['sales', saleId, 'returns'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/sales/{sale_id}/returns', { params: { path: { sale_id: saleId! } } })),
    enabled: !!saleId,
  })
}

/**
 * Registrar una devolución mueve dinero (efectivo) o crea un pasivo (nota
 * crédito) Y puede reversar stock: `useMoneyMutation` por la
 * `Idempotency-Key` (regla 8), invalida la venta, su lista de devoluciones,
 * caja, inventario, dashboard y — si emitió nota crédito — las del cliente.
 */
export function useCreateReturn(saleId: string) {
  const queryClient = useQueryClient()
  return useMoneyMutation({
    mutationFn: (body: SaleReturnCreateIn, idempotencyKey: string) =>
      unwrap(api.POST('/api/v1/sales/{sale_id}/returns', { params: { path: { sale_id: saleId }, header: { 'Idempotency-Key': idempotencyKey } }, body })),
    invalidateKeys: [['sales', saleId], ['sales', saleId, 'returns'], ['sales', 'list'], ['dashboard'], ['cashbox', 'current'], ['inventory']],
    onSuccess: (data) => {
      if (data.customer_id) {
        void queryClient.invalidateQueries({ queryKey: ['customers', data.customer_id, 'creditNotes'] })
      }
    },
  })
}
