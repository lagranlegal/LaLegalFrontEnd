import { useState } from 'react'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Button } from '@/components/ui/button'
import { useOpenSession } from '@/features/cashbox/api'

export function OpenSessionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [openingBalance, setOpeningBalance] = useState('0.00')
  const openSession = useOpenSession()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await openSession.mutateAsync(openingBalance)
    onOpenChange(false)
    setOpeningBalance('0.00')
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Abrir caja"
      description="Registra el efectivo con el que arranca el día."
      footer={
        <div className="flex w-full gap-2">
          <Button type="button" variant="outline" className="flex-1 rounded-pill" onClick={() => onOpenChange(false)} disabled={openSession.isPending}>
            Cancelar
          </Button>
          <Button form="open-session-form" type="submit" disabled={openSession.isPending} className="flex-1 rounded-pill">
            {openSession.isPending ? 'Abriendo…' : 'Abrir caja'}
          </Button>
        </div>
      }
    >
      <form id="open-session-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="opening-balance" className="text-sm font-medium text-foreground">
            Saldo inicial
          </label>
          <MoneyInput id="opening-balance" className="mt-1" value={openingBalance} onChange={setOpeningBalance} autoFocus />
        </div>
        {openSession.isError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">No se pudo abrir la caja. Intenta de nuevo.</p>}
      </form>
    </AppDialog>
  )
}
