import { useState } from 'react'
import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useItem } from '@/lib/inventory/items'
import { formatQuantity } from '@/lib/inventory/units'
import { ApiError } from '@/lib/api/client'
import { useCreateReturn, useSaleReturns, RETURN_REASON_LABELS, RETURN_SETTLEMENT_LABELS } from '@/lib/sales/returns'
import type { Sale } from '@/lib/sales/void'
import type { Customer } from '@/lib/customers/search'

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

interface LineDraft {
  included: boolean
  quantity: string
  restock: boolean
}

/** Cuánto de esta línea ya se devolvió en devoluciones anteriores — lo que
 * acota el máximo disponible acá. El backend valida el límite real; esto
 * solo evita que el usuario intente algo que ya sabe que va a rechazarse. */
function alreadyReturned(returns: ReturnType<typeof useSaleReturns>['data'], saleLineId: string): number {
  if (!returns) return 0
  return returns.reduce((sum, r) => sum + r.lines.filter((l) => l.sale_line_id === saleLineId).reduce((s, l) => s + Number(l.quantity), 0), 0)
}

function ReturnLineRow({
  saleLineId,
  itemId,
  totalQuantity,
  already,
  draft,
  onChange,
}: {
  saleLineId: string
  itemId: string
  totalQuantity: number
  already: number
  draft: LineDraft
  onChange: (draft: LineDraft) => void
}) {
  const { data: item } = useItem(itemId)
  const available = totalQuantity - already

  if (available <= 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3 last:border-b-0">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={draft.included} onChange={(e) => onChange({ ...draft, included: e.target.checked })} />
        <div>
          <p className="text-sm font-medium text-foreground">{item?.name ?? '…'}</p>
          <p className="text-xs text-muted-foreground">Disponible para devolver: {formatQuantity(String(available), item?.unit)}</p>
        </div>
      </label>
      {draft.included && (
        <div className="flex items-center gap-3">
          <input
            type="text"
            inputMode="decimal"
            aria-label="Cantidad a devolver"
            className="w-20 rounded-input border border-border bg-background px-2 py-1 text-right text-sm tnum outline-none focus:border-primary"
            value={draft.quantity}
            onChange={(e) => onChange({ ...draft, quantity: e.target.value })}
          />
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <input type="checkbox" checked={draft.restock} onChange={(e) => onChange({ ...draft, restock: e.target.checked })} />
            Reingresa a inventario
          </label>
        </div>
      )}
      <input type="hidden" value={saleLineId} readOnly />
    </div>
  )
}

/**
 * Devolución de cliente (00042): parcial (una o varias líneas, cantidad
 * parcial), motivo estructurado, liquidación en efectivo o nota crédito
 * (exige cliente identificado), reingreso de mercancía opcional por línea.
 * Vive en `components/shared/` porque lo abre `SaleReceiptDialog`, que
 * también es compartido (CLAUDE.md regla 3).
 */
export function ReturnFormDialog({ open, onOpenChange, sale }: { open: boolean; onOpenChange: (open: boolean) => void; sale: Sale }) {
  const { data: returns } = useSaleReturns(sale.id)
  const createReturn = useCreateReturn(sale.id)

  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({})
  const [reason, setReason] = useState<'defect' | 'change_of_mind' | 'other'>('other')
  const [settlementMethod, setSettlementMethod] = useState<'cash' | 'credit_note'>('cash')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)

  const needsCustomer = settlementMethod === 'credit_note' && !sale.customer_id

  function draftFor(line: Sale['lines'][number]): LineDraft {
    return drafts[line.id] ?? { included: false, quantity: String(Number(line.quantity) - alreadyReturned(returns, line.id)), restock: true }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const lines = sale.lines
      .map((line) => ({ line, draft: draftFor(line) }))
      .filter(({ draft }) => draft.included)
      .map(({ line, draft }) => ({ sale_line_id: line.id, quantity: draft.quantity, restock: draft.restock }))

    if (lines.length === 0) {
      setFormError('Selecciona al menos una línea a devolver.')
      return
    }
    if (needsCustomer && !customer) {
      setFormError('La nota crédito exige identificar al cliente.')
      return
    }

    try {
      await createReturn.mutateAsync({
        lines,
        reason,
        settlement_method: settlementMethod,
        customer_id: customer?.id ?? null,
        notes: notes.trim() || null,
      })
      toast.success('Devolución registrada')
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CASH_SESSION_NOT_OPEN') {
        setCashDialogOpen(true)
        return
      }
      setFormError(error instanceof ApiError ? error.message : 'No se pudo registrar la devolución. Intenta de nuevo.')
    }
  }

  return (
    <>
      <AppDialog open={open} onOpenChange={onOpenChange} title="Devolución de cliente" description={`Venta #${sale.number}`} size="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="overflow-hidden rounded-input border border-border">
            {sale.lines.map((line) => (
              <ReturnLineRow
                key={line.id}
                saleLineId={line.id}
                itemId={line.item_id}
                totalQuantity={Number(line.quantity)}
                already={alreadyReturned(returns, line.id)}
                draft={draftFor(line)}
                onChange={(next) => setDrafts((prev) => ({ ...prev, [line.id]: next }))}
              />
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Motivo</label>
            <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RETURN_REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Forma de liquidación</label>
            <Select value={settlementMethod} onValueChange={(v) => setSettlementMethod(v as typeof settlementMethod)}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RETURN_SETTLEMENT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsCustomer && (
            <div>
              <label className="text-sm font-medium text-foreground">Cliente (obligatorio para nota crédito)</label>
              <div className="mt-1">
                <CustomerPicker value={customer} onChange={setCustomer} />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground">Notas (opcional)</label>
            <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

          <Button type="submit" disabled={createReturn.isPending} className="w-full rounded-pill">
            {createReturn.isPending ? 'Registrando…' : 'Registrar devolución'}
          </Button>
        </form>
      </AppDialog>

      <CashSessionRequiredDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </>
  )
}
