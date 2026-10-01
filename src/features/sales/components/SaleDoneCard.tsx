import { Check, Printer } from 'lucide-react'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import type { Sale } from '@/features/sales/api'

/**
 * Así termina una venta (rediseño P2, F9-33 · H-32): en vez de volver a la
 * lista, la pantalla dice «Venta #N registrada», el cambio entregado y a
 * quién, y ofrece imprimir el comprobante o empezar otra. El comprobante es
 * el de siempre (`SaleReceiptDialog`, montado por la página).
 */
export function SaleDoneCard({
  sale,
  change,
  customerName,
  onPrint,
  onNewSale,
}: {
  sale: Sale
  /** El cambio que se calculó en pantalla; `null` si no fue en efectivo o no se escribió lo recibido. */
  change: string | null
  customerName: string
  onPrint: () => void
  onNewSale: () => void
}) {
  const method = PAYMENT_METHOD_LABELS[sale.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ?? sale.payment_method
  return (
    <section aria-labelledby="sale-done-title" className="enter-up grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-card border border-border bg-card p-card">
      <span className="grid size-11 place-items-center rounded-pill bg-success-soft text-success" aria-hidden>
        <Check className="size-6" />
      </span>
      <div className="min-w-0" role="status">
        <h2 id="sale-done-title" className="text-base font-bold text-foreground">
          Venta #{sale.number} registrada
        </h2>
        <p className="text-button-sm text-muted-foreground">
          {change !== null ? (
            <>
              Cambio entregado <Money value={change} />
            </>
          ) : (
            <>
              <Money value={sale.total} /> · {method}
            </>
          )}{' '}
          · {customerName}
        </p>
      </div>
      <div className="col-span-full flex flex-wrap items-center gap-2.5">
        <Button type="button" onClick={onPrint}>
          <Printer />
          Imprimir comprobante
        </Button>
        <Button type="button" variant="outline" onClick={onNewSale}>
          Nueva venta
        </Button>
      </div>
    </section>
  )
}
