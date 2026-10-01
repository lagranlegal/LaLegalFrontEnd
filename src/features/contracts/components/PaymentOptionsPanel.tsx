import { useState } from 'react'
import { CashClosedNotice } from '@/components/shared/CashClosedNotice'
import { toast } from 'sonner'
import { Money } from '@/components/shared/Money'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Can } from '@/components/shared/Can'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { confirm } from '@/components/shared/confirmStore'
import { ApiError } from '@/lib/api/client'
import { userMessage } from '@/lib/api/errors'
import { compareMoney, formatCOP, subtractMoney, sumMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { usePaymentOptions, useCreatePayment, type PaymentOption, type PaymentQuote } from '@/features/contracts/api'
import { AccountPicker } from '@/components/shared/AccountPicker'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { useAccounts } from '@/lib/accounts/list'

/**
 * Medio de pago + cuenta, siempre juntos: el medio dice CÓMO pagó el cliente,
 * la cuenta DÓNDE quedó esa plata (backend-starter/docs/DOMINIO.md §4.1). Van en el mismo
 * componente para que ningún punto de cobro pueda quedarse a medias.
 */
function PaymentMethodField({ value, onChange, accountId, onAccountChange }: { value: 'cash' | 'transfer' | 'other'; onChange: (value: 'cash' | 'transfer' | 'other') => void; accountId: string | null; onAccountChange: (accountId: string | null) => void }) {
  return (
    <>
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
    <div>
      <label className="text-sm font-medium text-foreground">¿A dónde entra?</label>
      <AccountPicker paymentMethod={value} value={accountId} onChange={onAccountChange} />
    </div>
    </>
  )
}

/** Quién paga qué: lo que la confirmación repite (F9-18). */
export interface PaymentContext {
  contractNumber?: number
  customerName?: string
}

/**
 * El resumen de la confirmación del abono (F9-18): contrato, cliente, qué se
 * paga, total, medio y cuenta. Antes solo decía «1 mes de interés.», y es el
 * último control antes de mover plata.
 */
function paymentSummary({
  context,
  concept,
  total,
  paymentMethod,
  accountName,
}: {
  context: PaymentContext
  concept: string
  total: string
  paymentMethod: 'cash' | 'transfer' | 'other'
  accountName: string | null | undefined
}): { label: string; value: string | null | undefined }[] {
  return [
    { label: 'Contrato', value: context.contractNumber !== undefined ? `#${context.contractNumber}` : null },
    { label: 'Cliente', value: context.customerName },
    { label: 'Paga', value: concept },
    { label: 'Total', value: formatCOP(total) },
    { label: 'Medio de pago', value: PAYMENT_METHOD_LABELS[paymentMethod] },
    { label: 'Entra a', value: accountName },
  ]
}

/**
 * Contrato AL DÍA (`months_owed === 0`) — `payment-options` responde
 * `options: []` porque no hay ningún mes de interés para elegir, pero
 * la regla original era explícita (hoy backend-starter/docs/DOMINIO.md §2.2): *"El capital solo se abona cuando los
 * intereses quedan al día (en el mismo pago que los salda **o después**)"*
 * — "después" es exactamente este caso. Verificado contra el backend real
 * antes de construir esto: `POST .../payments` con `months_covered: 0` +
 * `capital_amount` responde `201` y descuenta el saldo correctamente: la
 * regla de "todos los meses adeudados cubiertos" se cumple trivialmente
 * cuando no se debe ninguno. Hueco real del front (no del backend): la UI
 * solo sabía pedir capital DENTRO de una opción de interés seleccionada.
 *
 * SALDAR DENTRO DEL PRIMER MES (F4-11 del backend, 27/09/2026): saldar causa
 * como mínimo un mes de interés. Con `months_owed === 0` y el abono por TODO
 * el capital, `months_covered: 0` es un 422
 * `PAYMENT_MINIMUM_INTEREST_REQUIRED`: hay que mandar `payoff_months` y
 * cobrar `payoff_total`. El saldo de capital no viene suelto en la
 * cotización; es `payoff_total − payoff_interest`.
 */
function CapitalOnlyPaymentForm({ contractId, quote, context }: { contractId: string; quote: PaymentQuote; context: PaymentContext }) {
  const createPayment = useCreatePayment(contractId)
  const { data: accounts } = useAccounts()
  const [capitalAmount, setCapitalAmount] = useState('0.00')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'other'>('cash')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAmount = Number(capitalAmount) > 0
  const capitalBalance = subtractMoney(quote.payoff_total, quote.payoff_interest)
  // Abonar todo el capital es SALDAR: rige el mínimo de meses del backend.
  const isPayoff = hasAmount && compareMoney(capitalAmount, capitalBalance) >= 0
  const monthsCovered = isPayoff ? quote.payoff_months : 0
  const payoffInterest = isPayoff ? quote.payoff_interest : '0.00'
  const total = sumMoney(capitalAmount, payoffInterest)

  async function handleConfirm() {
    setError(null)
    const result = await confirm({
      title: isPayoff ? 'Saldar el contrato' : 'Registrar abono a capital',
      description: isPayoff
        ? 'Saldar causa como mínimo un mes de interés.'
        : `Contrato al día — este abono va completo a reducir el capital prestado.`,
      summary: paymentSummary({
        context,
        concept: isPayoff
          ? `${formatCOP(capitalAmount)} de capital + ${formatCOP(payoffInterest)} de interés`
          : `${formatCOP(capitalAmount)} a capital`,
        total,
        paymentMethod,
        accountName: accounts?.find((a) => a.id === accountId)?.name,
      }),
      confirmLabel: `Registrar abono ${formatCOP(total)}`,
    })
    if (!result.confirmed) return

    try {
      await createPayment.mutateAsync({ months_covered: monthsCovered, capital_amount: capitalAmount, payment_method: paymentMethod, account_id: accountId })
      toast.success(isPayoff ? 'Contrato saldado' : 'Abono a capital registrado')
      setCapitalAmount('0.00')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CASH_SESSION_NOT_OPEN') {
        setCashDialogOpen(true)
        return
      }
      setError(err instanceof ApiError ? userMessage(err) : 'No se pudo registrar el abono. Intenta de nuevo.')
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <CashClosedNotice paymentMethod={paymentMethod} />
        <p className="text-sm text-muted-foreground">Este contrato está al día en intereses — puedes abonar directo a capital.</p>
        <div className="flex flex-col gap-3 rounded-input border border-border p-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="capital-only-amount" className="text-sm font-medium text-foreground">
                Abono a capital
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCapitalAmount(capitalBalance)}>
                Saldar el contrato
              </Button>
            </div>
            <MoneyInput id="capital-only-amount" className="mt-1" value={capitalAmount} onChange={setCapitalAmount} autoFocus />
            <p className="mt-1 text-xs text-muted-foreground">
              Capital pendiente <Money value={capitalBalance} /> · para saldar hoy <Money value={quote.payoff_total} />
            </p>
          </div>
          {isPayoff && compareMoney(payoffInterest, '0.00') > 0 && (
            <p className="rounded-input bg-warning-soft px-3 py-2 text-xs text-foreground">
              Saldar el contrato causa como mínimo un mes de interés: se cobran <Money value={payoffInterest} /> de interés además del capital.
            </p>
          )}
          <PaymentMethodField value={paymentMethod} onChange={setPaymentMethod} accountId={accountId} onAccountChange={setAccountId} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button className="w-full" disabled={!hasAmount || createPayment.isPending} onClick={handleConfirm}>
            {createPayment.isPending ? (
              'Registrando…'
            ) : (
              <>
                Registrar abono <Money value={total} className="ml-1" />
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
export function PaymentOptionsPanel({ contractId, contractNumber, customerName }: { contractId: string } & PaymentContext) {
  const { data: quote, isPending, isError, refetch } = usePaymentOptions(contractId)
  const { data: accounts } = useAccounts()
  const createPayment = useCreatePayment(contractId)
  const [selected, setSelected] = useState<PaymentOption | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'other'>('cash')
  const [accountId, setAccountId] = useState<string | null>(null)
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
        <CapitalOnlyPaymentForm contractId={contractId} quote={quote} context={{ contractNumber, customerName }} />
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
      summary: paymentSummary({
        context: { contractNumber, customerName },
        concept: `${selected.months} ${selected.months === 1 ? 'mes' : 'meses'} de interés${hasCapital ? ` + ${formatCOP(capitalAmount)} a capital` : ''}`,
        total,
        paymentMethod,
        accountName: accounts?.find((a) => a.id === accountId)?.name,
      }),
      confirmLabel: `Registrar abono ${formatCOP(total)}`,
    })
    if (!result.confirmed) return

    try {
      await createPayment.mutateAsync({
        months_covered: selected.months,
        capital_amount: hasCapital ? capitalAmount : null,
        account_id: accountId,
        payment_method: paymentMethod,
      })
      toast.success('Abono registrado')
      setSelected(null)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CASH_SESSION_NOT_OPEN') {
        setCashDialogOpen(true)
        return
      }
      if (err instanceof ApiError && err.code === 'PAYMENT_MINIMUM_INTEREST_REQUIRED') void refetch()
      setError(err instanceof ApiError ? userMessage(err) : 'No se pudo registrar el abono. Intenta de nuevo.')
    }
  }

  return (
    <Can permission="payments.create" fallback={<p className="text-sm text-muted-foreground">No tienes permiso para registrar abonos.</p>}>
      <div className="flex flex-col gap-4">
        <CashClosedNotice paymentMethod={paymentMethod} />
        <p className="text-xs text-muted-foreground">
          {quote.months_owed} {quote.months_owed === 1 ? 'mes adeudado' : 'meses adeudados'} · interés mensual <Money value={quote.monthly_interest} /> · para
          saldar hoy <Money value={quote.payoff_total} />
        </p>

        <div className="flex flex-wrap gap-2">
          {quote.options.map((option) => (
            <button
              key={option.months}
              type="button"
              onClick={() => selectOption(option)}
              className={cn(
                'rounded-input border px-3 py-2 text-sm font-medium transition-colors',
                selected?.months === option.months ? 'border-brand bg-brand-50 text-brand' : 'border-border bg-background hover:bg-accent',
              )}
            >
              {option.months} {option.months === 1 ? 'mes' : 'meses'} · <Money value={option.interest_amount} />
            </button>
          ))}
        </div>

        {selected && (
          <div className="flex flex-col gap-3 rounded-input border border-border p-3">
            <PaymentMethodField value={paymentMethod} onChange={setPaymentMethod} accountId={accountId} onAccountChange={setAccountId} />

            {selected.allows_capital && (
              <div>
                <label className="text-sm font-medium text-foreground">Abono a capital (opcional)</label>
                <MoneyInput className="mt-1" value={capitalAmount} onChange={setCapitalAmount} />
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button className="w-full" disabled={createPayment.isPending} onClick={handleConfirm}>
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
