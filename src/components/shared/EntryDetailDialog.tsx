import { AppDialog } from '@/components/shared/AppDialog'
import { Money } from '@/components/shared/Money'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { TableSkeleton } from '@/components/shared/TableSkeleton'
import { formatDate, formatDateTime } from '@/lib/dates'
import { PAYMENT_METHOD_LABELS, paymentMethodLabel } from '@/lib/paymentMethods'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AccountPicker } from '@/components/shared/AccountPicker'
import { Can } from '@/components/shared/Can'
import { entryOriginLabel } from '@/lib/inventory/entryTypes'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { ApiError } from '@/lib/api/client'
import { usePayEntry, type Entry } from '@/lib/inventory/entries'
import { useState } from 'react'
import { toast } from 'sonner'

/**
 * Salda una compra que quedó pendiente. El egreso cae en la sesión de caja de
 * HOY, no en la fecha de la compra — y eso se dice explícitamente, porque es
 * la parte contraintuitiva: una sesión cerrada es inmutable, así que no hay
 * forma de afectar la caja del día en que llegó la mercancía.
 */
function PayPendingPurchase({ entry }: { entry: Entry }) {
  const [method, setMethod] = useState<'cash' | 'transfer' | 'other'>('cash')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const payEntry = usePayEntry()

  async function handlePay() {
    setError(null)
    try {
      await payEntry.mutateAsync({ entryId: entry.id, body: { payment_method: method, account_id: accountId } })
      toast.success('Compra pagada — el egreso quedó en la caja de hoy')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CASH_SESSION_NOT_OPEN') {
        setCashDialogOpen(true)
        return
      }
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el pago. Intenta de nuevo.')
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-input border border-warning/40 bg-warning-soft p-3">
      <div>
        <p className="text-sm font-medium text-warning">Pendiente de pago</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          La mercancía ya entró al inventario. Al registrar el pago, el egreso queda en la caja de <strong>hoy</strong> — no en la del
          día de la compra, porque una caja ya cerrada no se puede modificar.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40">
          <label className="text-xs text-muted-foreground">Medio de pago</label>
          <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
            <SelectTrigger className="mt-1 w-full bg-background">
              <SelectValue>{PAYMENT_METHOD_LABELS[method]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-52">
          <label className="text-xs text-muted-foreground">¿De dónde sale?</label>
          <AccountPicker paymentMethod={method} direction="out" value={accountId} onChange={setAccountId} />
        </div>
        {/* Pagarle a un proveedor mueve plata, no inventario: desde 00035
            lleva su propio permiso. Quien registra mercancía ya no decide
            cuánto sale de la caja. */}
        <Can
          permission="inventory.pay_purchase"
          fallback={<p className="text-xs text-muted-foreground">No tienes permiso para pagar compras.</p>}
        >
          <Button type="button" className="rounded-pill" disabled={payEntry.isPending} onClick={handlePay}>
            {payEntry.isPending ? 'Registrando…' : 'Registrar pago'}
          </Button>
        </Can>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <CashSessionRequiredDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </div>
  )
}

/**
 * Ver ingreso — solo lectura, los artículos que creó ya vienen embebidos en
 * `EntryOut.items`. Vive en `components/shared/` (movido desde
 * `features/inventory/`, docs/PENDIENTES_FRONTEND.md #2): el detalle de una
 * compra "solo vivía en Inventario" — el historial de un proveedor la abre
 * ahora también, mismo movimiento que ya se hizo una vez con el comprobante
 * de venta.
 *
 * `entry` es OPCIONAL a propósito: en `InventoryPage` la fila del listado ya
 * trae el ingreso completo (se abre al instante, sin pedir nada). En
 * `SupplierDetailPage`/`ProductRow` el historial solo trae el resumen — el
 * detalle real se pide por id recién al abrir, y ESE hueco entre el click y
 * la respuesta necesita mostrarse: sin `isPending`, el diálogo simplemente
 * no aparecía hasta que el dato llegaba y el click se sentía como que no
 * había hecho nada (bug real, reportado en vivo 27/08/2026) — mismo
 * principio que ya costó un bug antes: "si la app no muestra que está
 * trabajando, para el usuario está rota".
 */
export function EntryDetailDialog({
  open,
  onOpenChange,
  entry,
  isPending,
  isError,
  onRetry,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: Entry | undefined
  isPending?: boolean
  isError?: boolean
  onRetry?: () => void
}) {
  const isPendingPurchase = !!entry && entry.origin_type === 'purchase' && !entry.paid_at

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? `Ingreso #${entry.number}` : 'Ingreso'}
      description={entry ? formatDateTime(entry.created_at) : undefined}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {isPending && (
          <div className="flex flex-col gap-4">
            <div className="h-16 animate-pulse rounded-input bg-border" />
            <TableSkeleton rows={2} columns={3} />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-danger">No se pudo cargar el ingreso.</p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Reintentar
              </Button>
            )}
          </div>
        )}

        {entry && (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-input bg-background p-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Origen</p>
                <p className="font-medium text-foreground">{entryOriginLabel(entry.origin_type)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Factura</p>
                <p className="font-medium text-foreground">{entry.supplier_invoice ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Costo total</p>
                <Money value={entry.total_cost} className="font-medium" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entrada de mercancía</p>
                <p className="font-medium text-foreground">{formatDate(entry.entry_date)}</p>
              </div>
              {/* Solo las compras lo llevan: un ingreso "Otro" no entrega plata a
                  nadie y no genera egreso de caja. */}
              {entry.payment_method && (
                <div>
                  <p className="text-xs text-muted-foreground">Medio de pago</p>
                  <p className="font-medium text-foreground">{paymentMethodLabel(entry.payment_method)}</p>
                </div>
              )}
            </div>
            {entry.paid_at && (
              <p className="text-xs text-muted-foreground">
                Pagado el {formatDateTime(entry.paid_at)} — registrado como egreso de caja del módulo Tienda, se refleja en el cierre de
                ese día y en Reportes como inversión en inventario.
              </p>
            )}
            {isPendingPurchase && <PayPendingPurchase entry={entry} />}
            {entry.notes && <p className="text-sm text-foreground">{entry.notes}</p>}
            <div className="flex flex-col gap-2">
              {entry.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-input border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    {item.code && <p className="font-mono text-xs text-muted-foreground">{item.code}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Money value={item.cost} />
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppDialog>
  )
}
