import { AppDialog } from '@/components/shared/AppDialog'
import { Money } from '@/components/shared/Money'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDateTime } from '@/lib/dates'
import { paymentMethodLabel } from '@/lib/paymentMethods'
import type { Entry } from '@/features/inventory/api'

const ORIGIN_TYPE_LABELS: Record<string, string> = { purchase: 'Compra', other: 'Otro' }

/** Ver ingreso — solo lectura, los artículos que creó ya vienen embebidos en `EntryOut.items`. */
export function EntryDetailDialog({ open, onOpenChange, entry }: { open: boolean; onOpenChange: (open: boolean) => void; entry: Entry }) {
  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title={`Ingreso #${entry.number}`} description={formatDateTime(entry.created_at)} size="lg">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 rounded-input bg-background p-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Origen</p>
            <p className="font-medium text-foreground">{ORIGIN_TYPE_LABELS[entry.origin_type] ?? entry.origin_type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Factura</p>
            <p className="font-medium text-foreground">{entry.supplier_invoice ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Costo total</p>
            <Money value={entry.total_cost} className="font-medium" />
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
        {entry.payment_method && (
          <p className="text-xs text-muted-foreground">
            Registrado como egreso de caja del módulo Tienda — se refleja en el cierre del día y en Reportes como inversión en
            inventario.
          </p>
        )}
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
      </div>
    </AppDialog>
  )
}
