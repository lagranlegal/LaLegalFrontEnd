import { useState } from 'react'
import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { Money } from '@/components/shared/Money'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { useAccounts } from '@/lib/accounts/list'
import { accountTypeLabel } from '@/lib/accounts/types'
import { subtractMoney } from '@/lib/money'
import {
  useCreateContribution,
  useCreateWithdrawal,
  type CapitalPosition,
} from '@/features/capital/api'

const inputClass =
  'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/**
 * Aporte del dueño o retiro — **el mismo diálogo en dos sentidos**.
 *
 * Son el mismo documento: un movimiento de patrimonio con su cuenta, su
 * monto, su fecha y su motivo. Partirlo en dos componentes duplicaría el
 * formulario entero para expresar una diferencia que cabe en una palabra.
 *
 * Lo que SÍ cambia según el sentido:
 *   · el retiro exige motivo (el aporte no: meter plata se explica solo)
 *   · el retiro muestra la posición del negocio antes de confirmar
 */
export function CapitalMovementDialog({
  open,
  onOpenChange,
  direction,
  position,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  direction: 'contribution' | 'withdrawal'
  position?: CapitalPosition
}) {
  const esRetiro = direction === 'withdrawal'
  const { data: accounts } = useAccounts()
  const contribute = useCreateContribution()
  const withdraw = useCreateWithdrawal()
  const mutation = esRetiro ? withdraw : contribute

  const [accountId, setAccountId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)

  // Una cuenta POR COBRAR no sirve para esto: representa plata que un
  // convenio todavía te debe, no un saldo del que se pueda meter o sacar
  // dinero. El backend la rechaza; acá ni se ofrece, para que nadie llegue
  // al error después de llenar el formulario.
  const elegibles = (accounts ?? []).filter((a) => a.type !== 'settlement' && a.active)
  const cuenta = elegibles.find((a) => a.id === accountId)

  const montoValido = !!amount && Number(amount) > 0
  const motivoValido = !esRetiro || notes.trim().length > 0
  const puedeGuardar = !!accountId && montoValido && motivoValido && !mutation.isPending

  // Solo un aviso: el backend es la autoridad. Un bloqueo del front que
  // divergiera por un redondeo impediría una operación que el servidor sí
  // acepta — mismo criterio que el cupo del LTV.
  const excedeSaldo =
    esRetiro && !!cuenta && montoValido && Number(subtractMoney(amount, cuenta.balance)) > 0

  // El aviso que convierte esta pantalla en algo útil. Un retiro mayor a la
  // utilidad del período es una devolución de capital se llame como se llame,
  // y en una compraventa eso es lo que descapitaliza.
  const excedeUtilidad =
    esRetiro && !!position && montoValido && Number(subtractMoney(amount, position.distributable)) > 0

  function limpiar() {
    setAccountId(null)
    setAmount('')
    setNotes('')
    setError(null)
  }

  async function confirmar() {
    setError(null)
    try {
      if (esRetiro) {
        await withdraw.mutateAsync({
          account_id: accountId!,
          amount,
          notes: notes.trim(),
          // `kind` va en su default: contablemente un reparto de utilidad y
          // una devolución de capital no son lo mismo, pero para el dueño de
          // una compraventa la diferencia no existe hasta la declaración. El
          // campo está en el backend, sin UI, para el día que haga falta.
          kind: 'profit',
          movement_date: null,
        })
      } else {
        await contribute.mutateAsync({
          account_id: accountId!,
          amount,
          notes: notes.trim() || null,
          movement_date: null,
        })
      }
      toast.success(esRetiro ? 'Retiro registrado' : 'Aporte registrado', {
        description: esRetiro
          ? 'No cuenta como gasto: sale del patrimonio, no del resultado del período.'
          : 'No cuenta como ingreso: entra al patrimonio, no al resultado del período.',
      })
      limpiar()
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CASH_SESSION_NOT_OPEN') {
        onOpenChange(false)
        setCashDialogOpen(true)
        return
      }
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar. Intenta de nuevo.')
    }
  }

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={(v) => {
          if (!v) limpiar()
          onOpenChange(v)
        }}
        title={esRetiro ? 'Retiro del dueño' : 'Aporte de capital'}
        description={
          esRetiro
            ? 'Sale del patrimonio, no es un gasto: no cambia la utilidad del período.'
            : 'Entra al patrimonio, no es un ingreso: no cambia la utilidad del período.'
        }
        footer={
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-pill"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button className="flex-1 rounded-pill" onClick={confirmar} disabled={!puedeGuardar}>
              {mutation.isPending ? 'Registrando…' : esRetiro ? 'Registrar retiro' : 'Registrar aporte'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="capital-account" className="text-sm font-medium text-foreground">
              {esRetiro ? 'De qué cuenta sale' : 'A qué cuenta entra'}
            </label>
            <Select value={accountId ?? ''} onValueChange={setAccountId}>
              <SelectTrigger id="capital-account" className="mt-1 w-full">
                <SelectValue placeholder="Elige una cuenta">
                  {cuenta?.name ?? 'Elige una cuenta'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {elegibles.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="flex w-full items-center justify-between gap-3">
                      <span>
                        {account.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {accountTypeLabel(account.type)}
                        </span>
                      </span>
                      <Money
                        value={account.balance}
                        maximumFractionDigits={0}
                        className="text-xs text-muted-foreground"
                      />
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="capital-amount" className="text-sm font-medium text-foreground">
              Monto
            </label>
            <MoneyInput id="capital-amount" className="mt-1" value={amount} onChange={setAmount} />
          </div>

          <div>
            <label htmlFor="capital-notes" className="text-sm font-medium text-foreground">
              Motivo {esRetiro ? '' : <span className="text-muted-foreground">(opcional)</span>}
            </label>
            <input
              id="capital-notes"
              className={inputClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={esRetiro ? 'Retiro de utilidades de septiembre' : 'Capital para seguir prestando'}
            />
            {esRetiro && (
              <p className="mt-1 text-xs text-muted-foreground">
                Obligatorio: es plata que sale del negocio, y dentro de seis meses alguien va a
                preguntar por qué.
              </p>
            )}
          </div>

          {excedeSaldo && cuenta && (
            <p className="rounded-input bg-warning-soft px-3 py-2 text-xs text-warning">
              Esa cuenta tiene <Money value={cuenta.balance} />. No se puede retirar más de lo que
              hay.
            </p>
          )}

          {excedeUtilidad && position && (
            <div className="rounded-input bg-warning-soft px-3 py-2 text-xs text-warning">
              <p className="font-medium">Esto no es utilidad: es capital del negocio.</p>
              <p className="mt-1">
                En el período queda <Money value={position.distributable} /> de utilidad sin
                repartir. Retirar por encima de eso reduce el capital con el que se presta y se
                compra.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </AppDialog>

      <CashSessionRequiredDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </>
  )
}
