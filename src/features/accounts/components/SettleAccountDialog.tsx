import { useState } from 'react'
import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { Money } from '@/components/shared/Money'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { subtractMoney } from '@/lib/money'
import { useAccounts } from '@/lib/accounts/list'
import { useSettleAccount, type Account } from '@/features/accounts/api'

const inputClass =
  'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/**
 * Liquidar un convenio: Sistecrédito (o quien sea) paga lo que debía, menos
 * su comisión.
 *
 * Solo se piden DOS cifras — cuánto de lo pendiente cubre esta liquidación y
 * cuánto entró realmente. **La comisión no se digita**: es la diferencia, y
 * la deriva el backend. Pedirla sería pedir el mismo dato dos veces y
 * arriesgarse a que no cuadre; y una comisión configurada a mano queda
 * desactualizada en cuanto cambie el contrato con el convenio.
 *
 * La cifra que se muestra acá mientras el usuario escribe es una vista previa
 * para que vea lo que va a pasar antes de confirmar — el número que queda
 * registrado es el que devuelve el backend.
 */
export function SettleAccountDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account
}) {
  const [amountSettled, setAmountSettled] = useState(account.balance)
  const [amountReceived, setAmountReceived] = useState('')
  const [toAccountId, setToAccountId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: accounts } = useAccounts()
  const settle = useSettleAccount(account.id)

  // El destino es a dónde entró la plata de verdad: nunca otra cuenta por
  // cobrar (eso sería mover una deuda a otra deuda, no cobrarla).
  const destinations = (accounts ?? []).filter((candidate) => candidate.type !== 'settlement')
  const destination = destinations.find((candidate) => candidate.id === toAccountId) ?? null

  const commission =
    amountSettled && amountReceived ? subtractMoney(amountSettled, amountReceived) : null

  const submit = () => {
    setError(null)
    if (!destination) {
      setError('Elige a qué cuenta entró la plata.')
      return
    }
    if (!amountSettled || !amountReceived) {
      setError('Falta indicar cuánto se liquidó y cuánto entró.')
      return
    }
    settle.mutate(
      {
        to_account_id: destination.id,
        amount_settled: amountSettled,
        amount_received: amountReceived,
        notes: notes.trim() || null,
      },
      {
        onSuccess: (result) => {
          toast.success('Liquidación registrada', {
            description: `Comisión ${result.commission}. Queda por cobrar ${result.new_pending_balance}.`,
          })
          onOpenChange(false)
        },
        onError: (err: Error) => setError(err.message),
      },
    )
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Liquidar ${account.name}`}
      description="Registra lo que el convenio pagó y a dónde entró."
      footer={
        <div className="flex w-full gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={settle.isPending}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={submit} disabled={settle.isPending}>
            {settle.isPending ? 'Registrando…' : 'Liquidar'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-card bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Por cobrar hoy</span>
          <Money value={account.balance} className="font-medium text-foreground" />
        </div>

        <div>
          <label htmlFor="settle-settled" className="text-sm font-medium text-foreground">
            Cuánto se liquidó
          </label>
          <MoneyInput id="settle-settled" value={amountSettled} onChange={setAmountSettled} autoFocus />
          <p className="mt-1 text-xs text-muted-foreground">
            Cuánto de lo pendiente cubre este pago. Puede ser todo o una parte.
          </p>
        </div>

        <div>
          <label htmlFor="settle-received" className="text-sm font-medium text-foreground">
            Cuánto entró realmente
          </label>
          <MoneyInput id="settle-received" value={amountReceived} onChange={setAmountReceived} />
        </div>

        {commission !== null && (
          <div className="flex items-center justify-between rounded-card border border-border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Comisión del convenio</span>
            <Money value={commission} className="font-medium text-foreground" />
          </div>
        )}

        <div>
          <label htmlFor="settle-destination" className="text-sm font-medium text-foreground">
            ¿A qué cuenta entró?
          </label>
          <Select value={destination?.id ?? ''} onValueChange={setToAccountId}>
            <SelectTrigger id="settle-destination" className="mt-1 w-full">
              <SelectValue placeholder="Elegir cuenta…" />
            </SelectTrigger>
            <SelectContent>
              {destinations.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="settle-notes" className="text-sm font-medium text-foreground">
            Notas <span className="text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="settle-notes"
            className={inputClass}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Corte del 15 al 30"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </AppDialog>
  )
}
