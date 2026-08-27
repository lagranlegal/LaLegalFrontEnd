import { useState } from 'react'
import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { PrintLayout } from '@/components/shared/PrintLayout'
import { Money } from '@/components/shared/Money'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Can } from '@/components/shared/Can'
import { ReturnFormDialog } from '@/components/shared/ReturnFormDialog'
import { Button } from '@/components/ui/button'
import { confirm } from '@/components/shared/confirmStore'
import { formatDate, formatDateTime } from '@/lib/dates'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { useCustomer } from '@/lib/customers/search'
import { useItemsByIds, type Item } from '@/lib/inventory/items'
import { formatQuantity } from '@/lib/inventory/units'
import { useVoidSale, type Sale } from '@/lib/sales/void'
import { useSaleReturns, RETURN_REASON_LABELS, RETURN_SETTLEMENT_LABELS } from '@/lib/sales/returns'
import type { components } from '@/types/api'

type SaleLine = components['schemas']['SaleLineOut']

function SaleLineRow({ line, item, forPrint = false }: { line: SaleLine; item: Item | undefined; forPrint?: boolean }) {
  return (
    <tr className={forPrint ? 'border-b border-black/10' : undefined}>
      <td className={forPrint ? 'py-1.5' : 'px-3 py-2 text-foreground'}>
        {item?.name ?? '…'} {item?.code && <span className={forPrint ? 'text-xs' : 'font-mono text-xs text-muted-foreground'}>{item.code}</span>}
      </td>
      <td className={forPrint ? 'py-1.5 text-right' : 'px-3 py-2 text-right text-foreground'}>{formatQuantity(line.quantity, item?.unit)}</td>
      <td className={forPrint ? 'py-1.5 text-right' : 'px-3 py-2 text-right'}>
        <Money value={line.unit_price} />
      </td>
      <td className={forPrint ? 'py-1.5 text-right' : 'px-3 py-2 text-right'}>
        <Money value={line.subtotal} />
      </td>
    </tr>
  )
}

/**
 * Comprobante de venta (CLAUDE.md paso 7) — ver/imprimir + anular. Mismo
 * patrón que `ClosingActDialog` (paso 6): `PrintLayout` hermano del
 * `AppDialog`, nunca anidado. Movido a `components/shared/` en la revisión
 * post-paso-10 (segundo consumidor real: historial de cliente en
 * `features/customers`, además de `SalesListPage`) — `useVoidSale`/`Sale`
 * viven en `lib/sales/void.ts` por la misma razón.
 */
export function SaleReceiptDialog({ open, onOpenChange, sale }: { open: boolean; onOpenChange: (open: boolean) => void; sale: Sale }) {
  const { data: customer } = useCustomer(sale.customer_id ?? '')
  const { data: returns } = useSaleReturns(sale.id)
  // Un solo request para TODOS los artículos de la venta, en vez de uno por
  // línea (docs/PENDIENTES_FRONTEND.md #11) — una venta de 8 líneas pedía 8
  // artículos en paralelo solo para mostrar el comprobante.
  const { data: itemsById } = useItemsByIds(sale.lines.map((line) => line.item_id))
  const voidSale = useVoidSale()
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
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
              <Can permission="sales.return">
                <Button type="button" variant="outline" className="w-full rounded-pill" onClick={() => setReturnDialogOpen(true)}>
                  Devolver
                </Button>
              </Can>
            )}
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
                  <SaleLineRow key={line.id} line={line} item={itemsById?.get(line.item_id)} />
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

          {returns && returns.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">Devoluciones</h3>
              <div className="divide-y divide-border overflow-hidden rounded-input border border-border text-sm">
                {returns.map((ret) => (
                  <div key={ret.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div>
                      <p className="text-foreground">
                        #{ret.number} · {RETURN_REASON_LABELS[ret.reason as keyof typeof RETURN_REASON_LABELS] ?? ret.reason} ·{' '}
                        {RETURN_SETTLEMENT_LABELS[ret.settlement_method as keyof typeof RETURN_SETTLEMENT_LABELS] ?? ret.settlement_method}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(ret.return_date)}</p>
                    </div>
                    <Money value={ret.total_amount} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AppDialog>

      <ReturnFormDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen} sale={sale} />

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
              <SaleLineRow key={line.id} line={line} item={itemsById?.get(line.item_id)} forPrint />
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
