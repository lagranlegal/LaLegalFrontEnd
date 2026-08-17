import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { PrintLayout } from '@/components/shared/PrintLayout'
import { Money } from '@/components/shared/Money'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { confirm } from '@/components/shared/confirmStore'
import { formatDateTime } from '@/lib/dates'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { useCustomer } from '@/lib/customers/search'
import { useItem } from '@/lib/inventory/items'
import { useVoidSale, type Sale } from '@/features/sales/api'
import type { components } from '@/types/api'

type SaleLine = components['schemas']['SaleLineOut']

function SaleLineRow({ line, forPrint = false }: { line: SaleLine; forPrint?: boolean }) {
  const { data: item } = useItem(line.item_id)
  return (
    <tr className={forPrint ? 'border-b border-black/10' : undefined}>
      <td className={forPrint ? 'py-1.5' : 'px-3 py-2 text-foreground'}>
        {item?.name ?? '…'} {item?.code && <span className={forPrint ? 'text-xs' : 'font-mono text-xs text-muted-foreground'}>{item.code}</span>}
      </td>
      <td className={forPrint ? 'py-1.5 text-right' : 'px-3 py-2 text-right text-foreground'}>{line.quantity}</td>
      <td className={forPrint ? 'py-1.5 text-right' : 'px-3 py-2 text-right'}>
        <Money value={line.unit_price} />
      </td>
      <td className={forPrint ? 'py-1.5 text-right' : 'px-3 py-2 text-right'}>
        <Money value={line.subtotal} />
      </td>
    </tr>
  )
}

/** Comprobante de venta (CLAUDE.md paso 7) — ver/imprimir + anular. Mismo patrón que `ClosingActDialog` (paso 6): `PrintLayout` hermano del `AppDialog`, nunca anidado. */
export function SaleReceiptDialog({ open, onOpenChange, sale }: { open: boolean; onOpenChange: (open: boolean) => void; sale: Sale }) {
  const { data: customer } = useCustomer(sale.customer_id ?? '')
  const voidSale = useVoidSale()
  const isVoided = sale.status === 'voided'
  const hasDiscount = Number(sale.discount_amount) > 0

  async function handleVoid() {
    const result = await confirm({
      title: 'Anular venta',
      description: 'Los artículos vuelven a estar disponibles en inventario. Esta acción no se puede deshacer.',
      tone: 'danger',
      requireReason: true,
      reasonLabel: 'Motivo de la anulación',
      confirmLabel: 'Anular venta',
    })
    if (!result.confirmed || !result.reason) return
    try {
      await voidSale.mutateAsync({ saleId: sale.id, reason: result.reason })
      toast.success('Venta anulada')
    } catch {
      toast.error('No se pudo anular la venta. Intenta de nuevo.')
    }
  }

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Venta #${sale.number}`}
        description={formatDateTime(sale.sold_at)}
        size="lg"
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button type="button" className="w-full rounded-pill" onClick={() => window.print()}>
              Imprimir comprobante
            </Button>
            {!isVoided && (
              <Can permission="sales.void">
                <Button type="button" variant="outline" disabled={voidSale.isPending} className="w-full rounded-pill text-danger hover:text-danger" onClick={handleVoid}>
                  {voidSale.isPending ? 'Anulando…' : 'Anular venta'}
                </Button>
              </Can>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={sale.status} />
            <span className="text-sm text-muted-foreground">{PAYMENT_METHOD_LABELS[sale.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ?? sale.payment_method}</span>
          </div>
          <p className="text-sm text-foreground">{customer ? `${customer.full_name} · ${customer.doc_type.toUpperCase()} ${customer.doc_number}` : 'Consumidor final'}</p>
          {sale.void_reason && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">Anulada: {sale.void_reason}</p>}

          <div className="overflow-hidden rounded-input border border-border">
            <table className="w-full text-sm">
              <thead className="bg-background text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Artículo</th>
                  <th className="px-3 py-2 text-right font-medium">Cant.</th>
                  <th className="px-3 py-2 text-right font-medium">Precio</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sale.lines.map((line) => (
                  <SaleLineRow key={line.id} line={line} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-end gap-1 text-sm">
            {hasDiscount && (
              <p className="text-muted-foreground">
                Descuento <Money value={sale.discount_amount} tone="out" />
              </p>
            )}
            <p className="text-lg font-semibold text-foreground">
              Total <Money value={sale.total} />
            </p>
          </div>
        </div>
      </AppDialog>

      <PrintLayout title={`Venta #${sale.number}`}>
        <p className="mb-1 text-sm">{customer ? `${customer.full_name} — ${customer.doc_type.toUpperCase()} ${customer.doc_number}` : 'Consumidor final'}</p>
        <p className="mb-4 text-sm">Medio de pago: {PAYMENT_METHOD_LABELS[sale.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ?? sale.payment_method}</p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/20 text-left">
              <th className="py-1.5">Artículo</th>
              <th className="py-1.5 text-right">Cant.</th>
              <th className="py-1.5 text-right">Precio</th>
              <th className="py-1.5 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map((line) => (
              <SaleLineRow key={line.id} line={line} forPrint />
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          {hasDiscount && (
            <p>
              Descuento <Money value={sale.discount_amount} />
            </p>
          )}
          <p className="text-base font-semibold">
            Total <Money value={sale.total} />
          </p>
        </div>
      </PrintLayout>
    </>
  )
}
