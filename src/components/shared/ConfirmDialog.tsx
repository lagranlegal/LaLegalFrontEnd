import { useState } from 'react'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { type ConfirmOptions, type ConfirmSummaryRow, resolveConfirm, useConfirmStore } from '@/components/shared/confirmStore'

/**
 * «Confirmación con resumen» (rediseño P1, F9-18): renglones etiqueta → valor
 * con divisores, el total al final sobre el fondo de marca. Los renglones sin
 * valor no se pintan.
 */
export function ConfirmSummary({ rows }: { rows: ConfirmSummaryRow[] }) {
  const visibles = rows.filter((row) => row.value)
  if (visibles.length === 0) return null
  return (
    <dl data-confirm-summary className="overflow-hidden rounded-input border border-border text-sm">
      {visibles.map((row) => (
        <div
          key={row.label}
          data-emphasis={row.emphasis}
          className={cn('flex justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0', row.emphasis === 'total' && 'bg-brand-50')}
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd
            className={cn(
              'tnum text-right font-medium text-foreground',
              row.emphasis === 'total' && 'text-md font-bold',
              row.emphasis === 'after' && 'text-success',
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ConfirmDialogInner({ options }: { options: ConfirmOptions }) {
  const [open, setOpen] = useState(true)
  const [reason, setReason] = useState('')
  const reasonMissing = options.requireReason && !reason.trim()

  function close(result: { confirmed: boolean }) {
    setOpen(false)
    resolveConfirm({ confirmed: result.confirmed, reason: result.confirmed && options.requireReason ? reason : undefined })
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => !next && close({ confirmed: false })}
      title={options.title}
      description={options.description}
      size="sm"
      footer={
        <div className="flex w-full flex-col gap-2">
          {/* De bloque (52 px), con el monto adentro cuando es dinero: es el
              último control antes de mover plata. Destructivo = relleno rojo,
              y solo aquí. */}
          <Button
            variant={options.tone === 'danger' ? 'danger-solid' : 'default'}
            size="lg"
            disabled={reasonMissing}
            onClick={() => close({ confirmed: true })}
          >
            {options.confirmLabel ?? 'Confirmar'}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => close({ confirmed: false })}>
            {options.cancelLabel ?? 'Cancelar'}
          </Button>
        </div>
      }
    >
      {options.summary && <ConfirmSummary rows={options.summary} />}
      {options.requireReason && (
        <div>
          <label htmlFor="confirm-reason" className="text-sm font-medium text-foreground">
            {options.reasonLabel ?? 'Motivo'}
          </label>
          <Textarea id="confirm-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
    </AppDialog>
  )
}

/** Host único de `confirm()` (docs/DESIGN_SYSTEM.md §3) — se monta UNA vez en `main.tsx`. */
export function ConfirmDialogHost() {
  const { id, options } = useConfirmStore()
  if (!options) return null
  return <ConfirmDialogInner key={id} options={options} />
}
