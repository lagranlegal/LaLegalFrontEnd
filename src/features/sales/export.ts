import { statusLabel } from '@/components/shared/StatusBadge'
import { formatDateTime } from '@/lib/dates'
import { compareMoney } from '@/lib/money'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import type { Sale } from '@/features/sales/api'

export type ReturnExtent = 'none' | 'partial' | 'full'

/**
 * Cuánto de la venta se devolvió (F21-17). `sale.status` sigue en `completed`
 * tras una devolución —a propósito, es la decisión de F21-12—, así que es
 * `returned_amount` el que lo dice. Como el backend lo manda NETO de su parte
 * prorrateada del descuento, una venta devuelta entera da exactamente su
 * `total`: la comparación es exacta, en centavos (`compareMoney`), sin
 * tolerancia.
 */
export function returnExtent(sale: Pick<Sale, 'returned_amount' | 'total'>): ReturnExtent {
  if (compareMoney(sale.returned_amount, '0') <= 0) return 'none'
  return compareMoney(sale.returned_amount, sale.total) >= 0 ? 'full' : 'partial'
}

/**
 * Una fila del Excel de Ventas. «Devuelto» va en pesos —no un Sí/No: una
 * devolución parcial y una total no son lo mismo para quien concilia— junto a
 * «Total», y vacía cuando no hubo devolución, igual que «Nota crédito
 * redimida». Los montos van como número para que Excel los sume.
 */
export function saleExportRow(sale: Sale, customerName: string) {
  return {
    Número: sale.number,
    Fecha: formatDateTime(sale.sold_at),
    Cliente: customerName,
    'Medio de pago': PAYMENT_METHOD_LABELS[sale.payment_method as 'cash' | 'transfer' | 'other'] ?? sale.payment_method,
    Descuento: Number(sale.discount_amount),
    'Nota crédito redimida': sale.credit_note_redeemed_amount ? Number(sale.credit_note_redeemed_amount) : '',
    Total: Number(sale.total),
    Devuelto: returnExtent(sale) === 'none' ? '' : Number(sale.returned_amount),
    Estado: statusLabel(sale.status),
    'Motivo de anulación': sale.void_reason ?? '',
  }
}
