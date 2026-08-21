import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { AppDialog } from '@/components/shared/AppDialog'
import { Money } from '@/components/shared/Money'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { useAccounts } from '@/lib/accounts/list'
import { accountTypeLabel } from '@/lib/accounts/types'
import { useCreateTransfer, type Account } from '@/features/accounts/api'

const inputClass =
  'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

function AccountSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string
  value: string | null
  onChange: (id: string) => void
  options: Account[]
  placeholder: string
}) {
  return (
    <Select value={value ?? ''} onValueChange={onChange}>
      <SelectTrigger id={id} className="mt-1 w-full">
        <SelectValue placeholder={placeholder}>{options.find((a) => a.id === value)?.name ?? placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <span className="flex w-full items-center justify-between gap-3">
              <span>
                {account.name}
                <span className="ml-2 text-xs text-muted-foreground">{accountTypeLabel(account.type)}</span>
              </span>
              <Money value={account.balance} maximumFractionDigits={0} className="text-xs text-muted-foreground" />
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Mover plata entre dos cuentas propias. El caso real de todos los días:
 * consignar en el banco el efectivo del cajón.
 *
 * POR QUÉ NO ES UN GASTO, que es el error que esto viene a evitar: un
 * traslado no cambia cuánto tiene el negocio, solo dónde lo tiene. No toca la
 * utilidad. Registrar una consignación como gasto la falsearía por el monto
 * consignado — que en una compraventa es prácticamente toda la caja del día.
 * Es el mismo principio que el proyecto ya pagó caro en los contratos: "el
 * interés es ingreso; el capital recuperado no".
 *
 * Y por qué NO es una liquidación, aunque se parezcan: en una liquidación
 * llega MENOS de lo que salió, porque el convenio cobra comisión. En un
 * traslado llega exactamente lo mismo, porque las dos cuentas son de la
 * empresa. Por eso acá hay un solo monto y allá hay dos.
 *
 * Las cuentas por cobrar no aparecen en ninguno de los dos lados: no se puede
 * sacar plata que todavía te deben, ni "consignar" hacia una deuda ajena.
 */
export function TransferDialog({
  open,
  onOpenChange,
  defaultFromAccountId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Preselecciona el origen — al entrar por "Consignar efectivo", el cajón. */
  defaultFromAccountId?: string
}) {
  const { data: accounts } = useAccounts()
  const [fromId, setFromId] = useState<string | null>(defaultFromAccountId ?? null)
  const [toId, setToId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const createTransfer = useCreateTransfer()

  // Una `settlement` es plata que TE DEBEN: ni puede financiar una salida ni
  // puede recibir una consignación. El backend también lo rechaza
  // (`ACCOUNT_CANNOT_FUND_PAYMENT`); acá simplemente no se ofrece.
  const movibles = (accounts ?? []).filter((a) => a.type !== 'settlement')
  const origen = movibles.find((a) => a.id === fromId) ?? null
  // El destino nunca puede ser el origen: trasladar a la misma cuenta no
  // mueve nada y dejaría dos movimientos que se anulan entre sí.
  const destinos = movibles.filter((a) => a.id !== fromId)
  const destino = destinos.find((a) => a.id === toId) ?? null

  const excede = !!origen && !!amount && Number(amount) > Number(origen.balance)

  function submit() {
    setError(null)
    if (!origen || !destino) {
      setError('Elige de qué cuenta sale y a cuál entra.')
      return
    }
    if (!amount || Number(amount) <= 0) {
      setError('Indica cuánto vas a trasladar.')
      return
    }
    if (excede) {
      setError('No puedes trasladar más de lo que hay en la cuenta de origen.')
      return
    }
    createTransfer.mutate(
      {
        from_account_id: origen.id,
        to_account_id: destino.id,
        amount,
        notes: notes.trim() || null,
      },
      {
        onSuccess: (result) => {
          toast.success('Traslado registrado', {
            description: `${result.from_account_name} → ${result.to_account_name}`,
          })
          onOpenChange(false)
        },
        onError: (err: Error) => {
          // `CASH_SESSION_NOT_OPEN` acá tiene una causa muy concreta y vale la
          // pena decirla: si ya se cerró la caja, el traslado no puede
          // registrarse en ese turno porque un cierre firmado es inmutable.
          if (err instanceof ApiError && err.code === 'CASH_SESSION_NOT_OPEN') {
            setError('La caja no está abierta. Consigna el efectivo antes de cerrarla: un cierre ya firmado no se puede modificar.')
            return
          }
          setError(err.message)
        },
      },
    )
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Trasladar plata"
      description="Mueve dinero entre tus cuentas — por ejemplo, consignar en el banco el efectivo del día."
      footer={
        <div className="flex w-full gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={createTransfer.isPending}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={submit} disabled={createTransfer.isPending}>
            {createTransfer.isPending ? 'Registrando…' : 'Trasladar'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <label htmlFor="transfer-from" className="text-sm font-medium text-foreground">
              Sale de
            </label>
            <AccountSelect
              id="transfer-from"
              value={fromId}
              onChange={(id) => {
                setFromId(id)
                if (id === toId) setToId(null)
              }}
              options={movibles}
              placeholder="Elegir cuenta…"
            />
          </div>
          <ArrowRight className="mx-auto hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
          <div>
            <label htmlFor="transfer-to" className="text-sm font-medium text-foreground">
              Entra a
            </label>
            <AccountSelect id="transfer-to" value={toId} onChange={setToId} options={destinos} placeholder="Elegir cuenta…" />
          </div>
        </div>

        {origen && (
          <div className="flex items-center justify-between rounded-card bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Disponible en {origen.name}</span>
            <Money value={origen.balance} className="font-medium text-foreground" />
          </div>
        )}

        <div>
          <label htmlFor="transfer-amount" className="text-sm font-medium text-foreground">
            Cuánto
          </label>
          <MoneyInput id="transfer-amount" value={amount} onChange={setAmount} autoFocus />
          {excede && <p className="mt-1 text-sm text-danger">Es más de lo que hay disponible.</p>}
        </div>

        <div>
          <label htmlFor="transfer-notes" className="text-sm font-medium text-foreground">
            Notas <span className="text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="transfer-notes"
            className={inputClass}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Consignación del día"
          />
        </div>

        {/* El efecto en el arqueo es el punto entero de la operación, así que
            se dice antes de confirmar y no después: quien cierra la caja tiene
            que saber que el esperado va a bajar. */}
        {origen?.type === 'cash' && (
          <p className="rounded-card border border-border px-3 py-2 text-xs text-muted-foreground">
            Este traslado sale del cajón, así que el efectivo esperado del cierre de hoy bajará por el mismo monto. Hazlo{' '}
            <strong className="text-foreground">antes</strong> de cerrar la caja.
          </p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </AppDialog>
  )
}
