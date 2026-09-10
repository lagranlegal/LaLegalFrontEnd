import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { Money } from '@/components/shared/Money'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { AccountPicker } from '@/components/shared/AccountPicker'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/dates'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { subtractMoney, sumMoney } from '@/lib/money'
import { useExtendLoan, useExtensionOptions, type Contract } from '@/features/contracts/api'

/**
 * Por qué NO se puede ampliar, en palabras y con la salida.
 *
 * El backend devuelve el cupo SIEMPRE, incluso bloqueado, justamente para
 * que la pantalla pueda decir esto. Una card que desaparece sin explicar
 * deja al usuario buscándola — y el motivo casi siempre tiene arreglo
 * (registrar el avalúo, ponerse al día con los intereses).
 */
const MOTIVOS: Record<string, string> = {
  EXTENSION_WINDOW_CLOSED: 'Pasó el plazo para ampliar este préstamo.',
  CONTRACT_INTEREST_OVERDUE: 'Primero hay que ponerse al día con los intereses, acá arriba.',
  CONTRACT_WITHOUT_APPRAISAL: 'Sin avalúo no se puede calcular cuánto puede retirar. Regístralo en Editar.',
  EXTENSION_NO_HEADROOM: 'La garantía ya no da para más: el préstamo llegó al tope del avalúo.',
}

/**
 * "Ampliar el préstamo" — el recargo (docs/RECARGOS.md).
 *
 * **Vive junto a "Registrar abono" y no en el encabezado.** Abonar y ampliar
 * son las dos direcciones de lo mismo: el cliente trae plata o se lleva
 * plata. El encabezado es para acciones sobre el DOCUMENTO (imprimir,
 * editar, rematar) y ya tiene cuatro botones — un quinto reabre el desborde
 * a 360 px que fue el peor de la app (F6-03).
 *
 * **Muestra el cupo aunque no se use.** "Este cliente puede retirar 400.000
 * más hasta el 8 de octubre" es información que el asesor quiere ver al
 * abrir el contrato, haga o no el recargo. Hasta ahora esa plata era
 * invisible.
 */
export function ExtendLoanPanel({ contract }: { contract: Contract }) {
  const navigate = useNavigate()
  const { data: cupo, isPending } = useExtensionOptions(contract.id)
  const extend = useExtendLoan(contract.id)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'cash' | 'transfer' | 'other'>('cash')
  const [accountId, setAccountId] = useState<string | null>(null)

  // Un contrato cerrado no muestra la card: no hay nada que explicar, el
  // documento terminó. Los demás motivos SÍ se explican.
  if (isPending || !cupo || cupo.blocked_reason === 'CONTRACT_CLOSED') return null

  const nuevoCapital = amount ? sumMoney(contract.capital_balance, amount) : contract.capital_balance
  const excedeCupo = !!amount && Number(subtractMoney(amount, cupo.available)) > 0

  async function confirmar() {
    try {
      const sucesor = await extend.mutateAsync({
        amount,
        payment_method: method,
        account_id: accountId,
      })
      setConfirmOpen(false)
      toast.success(`Préstamo ampliado — contrato #${sucesor.number}`, {
        description: 'Imprímelo y hazlo firmar: el anterior ya no es la obligación vigente.',
      })
      // Se navega al SUCESOR: quedarse en el viejo —que acaba de pasar a
      // `superseded`— dejaría al usuario mirando un documento que ya no rige.
      navigate({ to: '/contratos/$contractId', params: { contractId: sucesor.id } })
    } catch {
      // `useMoneyMutation` ya deja el error a la vista; acá solo se evita
      // cerrar el diálogo, para no perder lo digitado.
    }
  }

  return (
    <Can permission="contracts.extend_loan">
      <div className="rounded-card border border-border bg-card p-card shadow-card">
        <h2 className="text-sm font-medium text-foreground">Ampliar el préstamo</h2>

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <div>
            <p className="text-xs text-muted-foreground">Puede retirar hasta</p>
            <Money value={cupo.available} className="tnum text-lg font-semibold text-foreground" />
          </div>
          {cupo.window_ends_on && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Disponible hasta</p>
              <p className="text-sm font-medium text-foreground">{formatDate(cupo.window_ends_on)}</p>
            </div>
          )}
        </div>

        {/* La cuenta a la vista desarma "¿por qué solo 400.000?" antes de que
            la pregunten — y hace obvio el problema si alguien deja el LTV en
            un valor absurdo, que es exactamente lo que pasó con el 10 %. */}
        {cupo.ceiling && (
          <p className="mt-2 text-xs text-muted-foreground">
            Tope del avalúo <Money value={cupo.ceiling} /> − saldo actual{' '}
            <Money value={contract.capital_balance} />
          </p>
        )}

        {cupo.blocked_reason ? (
          <p className="mt-3 rounded-input bg-muted px-3 py-2 text-sm text-muted-foreground">
            {MOTIVOS[cupo.blocked_reason] ?? 'No se puede ampliar este préstamo ahora.'}
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1">
              <label htmlFor="extend-amount" className="text-sm font-medium text-foreground">
                Monto a entregar
              </label>
              <MoneyInput id="extend-amount" className="mt-1" value={amount} onChange={setAmount} />
            </div>
            <div className="min-w-36">
              <label htmlFor="extend-method" className="text-sm font-medium text-foreground">
                Medio
              </label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger id="extend-method" className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['cash', 'transfer', 'other'] as const).map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-44">
              <AccountPicker paymentMethod={method} direction="out" value={accountId} onChange={setAccountId} />
            </div>
            <Button
              className="rounded-pill"
              disabled={!amount || Number(amount) <= 0}
              onClick={() => setConfirmOpen(true)}
            >
              Ampliar préstamo
            </Button>
          </div>
        )}

        {excedeCupo && (
          <p className="mt-2 rounded-input bg-warning-soft px-3 py-2 text-xs text-warning">
            Supera el cupo de la garantía. Solo puede autorizarlo quien tenga el permiso para
            prestar por encima del avalúo, y el contrato queda marcado.
          </p>
        )}
      </div>

      {/* La confirmación es la parte crítica: sin ella alguien amplía creyendo
          que es un ajuste y se encuentra con un contrato distinto. */}
      <AppDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Ampliar el préstamo"
        description="Esto cierra el contrato actual y crea uno nuevo."
        footer={
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-pill"
              onClick={() => setConfirmOpen(false)}
              disabled={extend.isPending}
            >
              Cancelar
            </Button>
            <Button className="flex-1 rounded-pill" onClick={confirmar} disabled={extend.isPending}>
              {extend.isPending ? 'Ampliando…' : 'Ampliar y entregar'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Se entregan</span>
            <Money value={amount || '0'} className="tnum font-semibold text-foreground" />
          </div>
          <div className="rounded-card bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">
              El contrato #{contract.number} se cierra y nace uno nuevo:
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Capital</span>
              <span className="tnum">
                <Money value={contract.capital_balance} /> → <Money value={nuevoCapital} className="font-semibold text-foreground" />
              </span>
            </div>
          </div>
          <p className="rounded-input bg-warning-soft px-3 py-2 text-xs text-warning">
            El contrato nuevo hay que imprimirlo y hacerlo firmar. El anterior deja de ser la
            obligación vigente, pero se conserva con su firma.
          </p>
        </div>
      </AppDialog>
    </Can>
  )
}
