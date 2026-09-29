import type { Customer } from '@/lib/customers/search'
import { receiptEmailBlockedByConsent } from '@/features/sales/receiptEmail'

/** La línea del POS; la regla y su porqué, en `receiptEmail.ts`. */
export function ReceiptEmailNotice({ customer }: { customer: Customer }) {
  if (!receiptEmailBlockedByConsent(customer)) return null
  return <p className="mt-1 text-xs text-warning">No recibirá el comprobante por correo: falta su autorización</p>
}
