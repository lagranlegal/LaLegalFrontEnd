import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { AppDialog } from '@/components/shared/AppDialog'
import { ItemPicker } from '@/components/shared/ItemPicker'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateExit } from '@/features/inventory/api'
import type { Item } from '@/lib/inventory/items'

const EXIT_TYPE_LABELS: Record<'adjustment' | 'damage' | 'supplier_return' | 'internal_use', string> = {
  adjustment: 'Ajuste de inventario',
  damage: 'Daño',
  supplier_return: 'Devolución a proveedor',
  internal_use: 'Uso interno',
}

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/** Egreso de artículos (CLAUDE.md paso 7) — sin `Idempotency-Key`, sin caja: no es dinero, es una salida de inventario (ajuste, daño, devolución, uso interno). */
export function ExitFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [exitType, setExitType] = useState<'adjustment' | 'damage' | 'supplier_return' | 'internal_use'>('adjustment')
  const [reason, setReason] = useState('')
  const [lines, setLines] = useState<{ item: Item; quantity: number }[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const createExit = useCreateExit()

  function addItem(item: Item) {
    setLines((prev) => (prev.some((l) => l.item.id === item.id) ? prev : [...prev, { item, quantity: 1 }]))
  }

  function updateQuantity(itemId: string, quantity: number) {
    setLines((prev) => prev.map((l) => (l.item.id === itemId ? { ...l, quantity: Math.max(1, quantity) } : l)))
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
    try {
      await createExit.mutateAsync({
        exit_type: exitType,
        reason: reason.trim(),
        lines: lines.map((l) => ({ item_id: l.item.id, quantity: l.quantity })),
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
      description="Saca artículos disponibles del inventario — ajuste, daño, devolución o uso interno."
      size="lg"
      footer={
        <Button form="exit-form" type="submit" disabled={createExit.isPending} className="w-full rounded-pill">
          {createExit.isPending ? 'Registrando…' : 'Registrar egreso'}
        </Button>
      }
    >
      <form id="exit-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="text-sm font-medium text-foreground">Tipo de egreso</label>
          <Select value={exitType} onValueChange={(v) => setExitType(v as typeof exitType)}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EXIT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Motivo</label>
          <textarea rows={2} className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Artículos</label>
          <div className="mt-1">
            <ItemPicker onSelect={addItem} />
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
                    type="number"
                    min={1}
                    max={item.quantity}
                    value={quantity}
                    onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                    className="w-16 rounded-input border border-border bg-background px-2 py-1 text-center text-sm"
                  />
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
