import { useState } from 'react'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type ConfirmOptions, resolveConfirm, useConfirmStore } from '@/components/shared/confirmStore'

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

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
          <Button
            className={cn('w-full rounded-pill', options.tone === 'danger' && 'bg-danger hover:bg-danger/90')}
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
      {options.requireReason && (
        <div>
          <label htmlFor="confirm-reason" className="text-sm font-medium text-foreground">
            {options.reasonLabel ?? 'Motivo'}
          </label>
          <textarea id="confirm-reason" rows={3} className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
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
