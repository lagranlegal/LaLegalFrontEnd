import { useState } from 'react'
import { toast } from 'sonner'
import { Money } from '@/components/shared/Money'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Can } from '@/components/shared/Can'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { confirm } from '@/components/shared/confirmStore'
import { ApiError } from '@/lib/api/client'
import { formatCOP, sumMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { usePaymentOptions, useCreatePayment, type PaymentOption } from '@/features/contracts/api'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'

function PaymentMethodField({ value, onChange }: { value: 'cash' | 'transfer' | 'other'; onChange: (value: 'cash' | 'transfer' | 'other') => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">Medio de pago</label>
      <Select value={value} onValueChange={(v) => onChange(v as typeof value)}>
        <SelectTrigger className="mt-1 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([code, label]) => (
            <SelectItem key={code} value={code}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Contrato AL DÍA (`months_owed === 0`) — `payment-options` responde
 * `options: []` porque no hay ningún mes de interés para elegir, pero
 * CONTEXTO.md §3 es explícito: *"El capital solo se abona cuando los
 * intereses quedan al día (en el mismo pago que los salda **o después**)"*
 * — "después" es exactamente este caso. Verificado contra el backend real
 * antes de construir esto: `POST .../payments` con `months_covered: 0` +
 * `capital_amount` responde `201` y descuenta el saldo correctamente: la
 * regla de "todos los meses adeudados cubiertos" se cumple trivialmente
 * cuando no se debe ninguno. Hueco real del front (no del backend): la UI
 * solo sabía pedir capital DENTRO de una opción de interés seleccionada.
 */
function CapitalOnlyPaymentForm({ contractId }: { contractId: string }) {
  const createPayment = useCreatePayment(contractId)
  const [capitalAmount, setCapitalAmount] = useState('0.00')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'other'>('cash')
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAmount = Number(capitalAmount) > 0

  async function handleConfirm() {
    setError(null)
    const result = await confirm({
      title: 'Registrar abono a capital',
      description: `Contrato al día — este abono va completo a reducir el capital prestado.`,
      confirmLabel: `Registrar abono ${formatCOP(capitalAmount)}`,
    })
    if (!result.confirmed) return

    try {
      await createPayment.mutateAsync({ months_covered: 0, capital_amount: capitalAmount, payment_method: paymentMethod })
      toast.success('Abono a capital registrado')
      setCapitalAmount('0.00')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CASH_SESSION_NOT_OPEN') {
        setCashDialogOpen(true)
        return
      }
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el abono. Intenta de nuevo.')
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Este contrato está al día en intereses — puedes abonar directo a capital.</p>
        <div className="flex flex-col gap-3 rounded-input border border-border p-3">
          <div>
            <label className="text-sm font-medium text-foreground">Abono a capital</label>
            <MoneyInput className="mt-1" value={capitalAmount} onChange={setCapitalAmount} autoFocus />
          </div>
          <PaymentMethodField value={paymentMethod} onChange={setPaymentMethod} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button className="w-full rounded-pill" disabled={!hasAmount || createPayment.isPending} onClick={handleConfirm}>
            {createPayment.isPending ? (
              'Registrando…'
            ) : (
              <>
                Registrar abono <Money value={capitalAmount} className="ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
      <CashSessionRequiredDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </>
  )
}

/**
 * "Dinero guiado, nunca libre" (docs/DESIGN_SYSTEM.md §4.2): los meses a
 * pagar salen de `payment-options` como botones con el monto exacto — jamás
 * un campo libre de interés. El único campo libre es el abono a capital
 * cuando `allows_capital` (con meses adeudados) o cuando el contrato ya
 * está al día (`CapitalOnlyPaymentForm` arriba).
 */
export function PaymentOptionsPanel({ contractId }: { contractId: string }) {
  const { data: quote, isPending, isError, refetch } = usePaymentOptions(contractId)
  const createPayment = useCreatePayment(contractId)
  const [selected, setSelected] = useState<PaymentOption | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'other'>('cash')
  const [capitalAmount, setCapitalAmount] = useState('0.00')
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isPending) return <div className="h-20 animate-pulse rounded-card bg-border" />

  if (isError) {
    return (
      <div className="rounded-card border border-border bg-card p-card text-center">
        <p className="text-sm text-muted-foreground">No se pudieron cargar las opciones de abono.</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  if (!quote) return null

  if (quote.months_owed === 0) {
    return (
      <Can permission="payments.create" fallback={<p className="text-sm text-muted-foreground">No tienes permiso para registrar abonos.</p>}>
        <CapitalOnlyPaymentForm contractId={contractId} />
      </Can>
    )
  }

  if (quote.options.length === 0) {
    return <p className="text-sm text-muted-foreground">Este contrato no tiene abonos disponibles en este momento.</p>
  }

  const total = selected ? sumMoney(selected.interest_amount, selected.allows_capital ? capitalAmount : null) : '0.00'

  function selectOption(option: PaymentOption) {
    setSelected(option)
    setCapitalAmount('0.00')
    setError(null)
  }

  async function handleConfirm() {
    if (!selected) return
    setError(null)
    const hasCapital = selected.allows_capital && Number(capitalAmount) > 0
    const result = await confirm({
      title: 'Registrar abono',
      description: `${selected.months} ${selected.months === 1 ? 'mes' : 'meses'} de interés${hasCapital ? ` + ${formatCOP(capitalAmount)} a capital` : ''}.`,
      confirmLabel: `Registrar abono ${formatCOP(total)}`,
    })
    if (!result.confirmed) return

    try {
      await createPayment.mutateAsync({
        months_covered: selected.months,
        capital_amount: hasCapital ? capitalAmount : null,
        payment_method: paymentMethod,
      })
      toast.success('Abono registrado')
      setSelected(null)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CASH_SESSION_NOT_OPEN') {
        setCashDialogOpen(true)
        return
      }
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el abono. Intenta de nuevo.')
    }
  }

  return (
    <Can permission="payments.create" fallback={<p className="text-sm text-muted-foreground">No tienes permiso para registrar abonos.</p>}>
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          {quote.months_owed} {quote.months_owed === 1 ? 'mes adeudado' : 'meses adeudados'} · interés mensual <Money value={quote.monthly_interest} />
        </p>

        <div className="flex flex-wrap gap-2">
          {quote.options.map((option) => (
            <button
              key={option.months}
              type="button"
              onClick={() => selectOption(option)}
              className={cn(
                'rounded-input border px-3 py-2 text-sm font-medium transition-colors',
                selected?.months === option.months ? 'border-primary bg-brand-50 text-primary' : 'border-border bg-background hover:bg-accent',
              )}
            >
              {option.months} {option.months === 1 ? 'mes' : 'meses'} · <Money value={option.interest_amount} />
            </button>
          ))}
        </div>

        {selected && (
          <div className="flex flex-col gap-3 rounded-input border border-border p-3">
            <PaymentMethodField value={paymentMethod} onChange={setPaymentMethod} />

            {selected.allows_capital && (
              <div>
                <label className="text-sm font-medium text-foreground">Abono a capital (opcional)</label>
                <MoneyInput className="mt-1" value={capitalAmount} onChange={setCapitalAmount} />
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button className="w-full rounded-pill" disabled={createPayment.isPending} onClick={handleConfirm}>
              {createPayment.isPending ? (
                'Registrando…'
              ) : (
                <>
                  Registrar abono <Money value={total} className="ml-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <CashSessionRequiredDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </Can>
  )
}
