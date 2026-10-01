import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { AppDialog } from '@/components/shared/AppDialog'
import { exitTypeLabel, SELECTABLE_EXIT_TYPES } from '@/lib/inventory/entryTypes'
import { allowsFractions, unitAbbr, unitLabel } from '@/lib/inventory/units'
import { ItemPicker } from '@/components/shared/ItemPicker'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateExit } from '@/features/inventory/api'
import type { Item } from '@/lib/inventory/items'
import { preventImplicitSubmit } from '@/lib/forms/preventImplicitSubmit'
import { quantityError } from '@/lib/forms/rules'
import { normalizeDecimalInput } from '@/lib/money'


/** Egreso de artículos (paso 7 del plan de construcción original) — sin caja: no es dinero, es una salida de inventario (ajuste, daño, devolución, uso interno). Con `Idempotency-Key` desde F6-11 del backend (ver `useCreateExit`). */
export function ExitFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  // Tipado desde la lista compartida y no a mano: escrito a mano se quedó sin
  // `loss` cuando 00033 lo agregó, y el selector lo habría ofrecido mientras
  // TypeScript lo rechazaba al elegirlo.
  const [exitType, setExitType] = useState<(typeof SELECTABLE_EXIT_TYPES)[number]>('adjustment')
  const [reason, setReason] = useState('')
  // La cantidad se guarda como se ESCRIBE ("1,5"): un input numérico
  // controlado descartaba la coma y la línea se quedaba en 1 — se daba de
  // baja otra cantidad sin avisar (H-20). Se normaliza y valida al enviar,
  // igual que el ingreso y la transformación (07e8259).
  const [lines, setLines] = useState<{ item: Item; quantity: string }[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const createExit = useCreateExit()

  function addItem(item: Item) {
    setLines((prev) => (prev.some((l) => l.item.id === item.id) ? prev : [...prev, { item, quantity: '1' }]))
  }

  function updateQuantity(itemId: string, quantity: string) {
    setLines((prev) => prev.map((l) => (l.item.id === itemId ? { ...l, quantity } : l)))
  }

  /**
   * Por qué la cantidad de una línea no sirve, o `null`. Mínimo positivo y
   * no 1: un lote en gramos se puede dar de baja en 0,5 g. Por unidades,
   * entera; nunca más de lo disponible.
   */
  function lineError({ item, quantity }: { item: Item; quantity: string }): string | null {
    const error = quantityError(quantity)
    if (error) return `${item.name}: ${error}`
    const n = Number(normalizeDecimalInput(quantity.trim()))
    if (!allowsFractions(item.unit) && !Number.isInteger(n)) return `${item.name}: se mide en unidades enteras.`
    if (n > Number(item.quantity)) return `${item.name}: solo hay ${Number(item.quantity).toLocaleString('es-CO')} ${unitAbbr(item.unit)} disponibles.`
    return null
  }

  function removeLine(itemId: string) {
    setLines((prev) => prev.filter((l) => l.item.id !== itemId))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (lines.length === 0) {
      setFormError('Agrega al menos un artículo.')
      return
    }
    if (!reason.trim()) {
      setFormError('El motivo es obligatorio.')
      return
    }
    const errorDeLinea = lines.map(lineError).find(Boolean)
    if (errorDeLinea) {
      setFormError(errorDeLinea)
      return
    }
    try {
      await createExit.mutateAsync({
        exit_type: exitType,
        reason: reason.trim(),
        lines: lines.map((l) => ({ item_id: l.item.id, quantity: normalizeDecimalInput(l.quantity.trim()) })),
      })
      toast.success('Egreso registrado')
      onOpenChange(false)
    } catch {
      setFormError('No se pudo registrar el egreso. Intenta de nuevo.')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nuevo egreso"
      description="Saca artículos disponibles del inventario — ajuste, daño, pérdida, devolución o uso interno."
      size="lg"
      footer={
        <Button form="exit-form" type="submit" disabled={createExit.isPending} className="w-full rounded-pill">
          {createExit.isPending ? 'Registrando…' : 'Registrar egreso'}
        </Button>
      }
    >
      <form onKeyDown={preventImplicitSubmit} id="exit-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="exit-type" className="text-sm font-medium text-foreground">
            Tipo de egreso
          </label>
          <Select value={exitType} onValueChange={(v) => setExitType(v as typeof exitType)}>
            <SelectTrigger id="exit-type" className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SELECTABLE_EXIT_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {exitTypeLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="exit-reason" className="text-sm font-medium text-foreground">
            Motivo
          </label>
          <Textarea id="exit-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <div>
          <label htmlFor="exit-items" className="text-sm font-medium text-foreground">
            Artículos
          </label>
          <div className="mt-1">
            <ItemPicker id="exit-items" onSelect={addItem} />
          </div>
        </div>

        {lines.length > 0 && (
          <div className="flex flex-col gap-2">
            {lines.map(({ item, quantity }) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-input border border-border p-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  {item.code && <p className="font-mono text-xs text-muted-foreground">{item.code}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    inputMode="decimal"
                    aria-label={`Cantidad en ${unitLabel(item.unit)}`}
                    value={quantity}
                    onChange={(e) => updateQuantity(item.id, e.target.value)}
                    className="w-20 rounded-input border border-border bg-background px-2 py-1 text-center text-sm tnum"
                  />
                  <span className="text-xs text-muted-foreground">{unitAbbr(item.unit)}</span>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar" onClick={() => removeLine(item.id)}>
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
