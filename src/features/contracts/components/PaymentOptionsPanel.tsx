import { useState } from 'react'
import { CashClosedNotice } from '@/components/shared/CashClosedNotice'
import { toast } from 'sonner'
import { Money } from '@/components/shared/Money'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Can } from '@/components/shared/Can'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Button } from '@/components/ui/button'
import { confirm, type ConfirmSummaryRow } from '@/components/shared/confirmStore'
import { ApiError } from '@/lib/api/client'
import { userMessage } from '@/lib/api/errors'
import { compareMoney, formatCOP, subtractMoney, sumMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { usePaymentOptions, useCreatePayment, type PaymentOption, type PaymentQuote } from '@/features/contracts/api'
import { catchUpOption } from '@/features/contracts/contractStatus'
import { monthsLabel, paymentConsequence, type PaymentContractInfo } from '@/features/contracts/paymentConsequence'
import { ChevronDown } from 'lucide-react'
import { AccountPicker } from '@/components/shared/AccountPicker'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { useAccounts } from '@/lib/accounts/list'
import { isPermissionError } from '@/lib/api/isPermissionError'
import { preventImplicitSubmit } from '@/lib/forms/preventImplicitSubmit'

const METHODS = ['cash', 'transfer', 'other'] as const
type Method = (typeof METHODS)[number]

/**
 * Medio de pago + cuenta, siempre juntos: el medio dice CÓMO pagó el cliente,
 * la cuenta DÓNDE quedó esa plata (backend-starter/docs/DOMINIO.md §4.1). Van en el mismo
 * componente para que ningún punto de cobro pueda quedarse a medias.
 *
 * Rediseño P2-a: el medio es un control segmentado (el activo en neutro
 * invertido, nunca en oro) y la cuenta se dice en una línea, «Entra a Caja
 * principal · Cambiar»: casi siempre es la predeterminada, y el selector solo
 * aparece si se pide. `AccountPicker` queda montado aunque esté oculto: es él
 * quien preselecciona la predeterminada del medio elegido.
 */
function PaymentMethodField({ value, onChange, accountId, onAccountChange }: { value: Method; onChange: (value: Method) => void; accountId: string | null; onAccountChange: (accountId: string | null) => void }) {
  const { data: accounts, error: accountsError } = useAccounts()
  const [changingAccount, setChangingAccount] = useState(false)
  const accountName = accounts?.find((a) => a.id === accountId)?.name
  return (
    <div className="grid gap-1.5">
      <span id="payment-method-label" className="text-sm font-medium text-foreground">
        Medio de pago
      </span>
      <div role="radiogroup" aria-labelledby="payment-method-label" className="grid auto-cols-fr grid-flow-col overflow-hidden rounded-input border border-border-strong bg-card">
        {METHODS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={value === m}
            onClick={() => onChange(m)}
            className={cn(
              'min-h-11 border-r border-border-strong px-1.5 text-center text-sm last:border-r-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              value === m ? 'bg-foreground font-semibold text-background' : 'font-medium text-body hover:bg-muted',
            )}
          >
            {PAYMENT_METHOD_LABELS[m]}
          </button>
        ))}
      </div>
      {accountName && !changingAccount && (
        <p className="text-xs text-muted-foreground">
          Entra a <b className="font-semibold text-foreground">{accountName}</b> ·{' '}
          <button type="button" className="font-medium text-brand hover:underline" onClick={() => setChangingAccount(true)}>
            Cambiar
          </button>
        </p>
      )}
      {/* Sin `accounts.view` no hay selector: el backend usa la predeterminada. */}
      {!isPermissionError(accountsError) && (
      <div className={cn(!changingAccount && accountName && 'hidden')}>
        <label htmlFor="payment-account" className="text-sm font-medium text-foreground">
          ¿A dónde entra?
        </label>
        <AccountPicker id="payment-account" paymentMethod={value} value={accountId} onChange={onAccountChange} />
      </div>
      )}
    </div>
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
  paymentMethod: Method
  accountName: string | null | undefined
}): ConfirmSummaryRow[] {
  // El orden de la pieza compartida (rediseño P1): a quién, qué, cómo y a
  // dónde; el total al final, resaltado.
  return [
    { label: 'Contrato', value: context.contractNumber !== undefined ? `#${context.contractNumber}` : null },
    { label: 'Cliente', value: context.customerName },
    { label: 'Paga', value: concept },
    { label: 'Medio de pago', value: PAYMENT_METHOD_LABELS[paymentMethod] },
    { label: 'Entra a', value: accountName },
    { label: 'Total', value: formatCOP(total), emphasis: 'total' },
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
  const [paymentMethod, setPaymentMethod] = useState<Method>('cash')
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
      title: isPayoff ? '¿Saldar el contrato?' : '¿Registrar el abono a capital?',
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
      cancelLabel: 'Volver',
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
          <Button size="lg" disabled={!hasAmount || createPayment.isPending} onClick={handleConfirm}>
            {createPayment.isPending ? (
              'Registrando…'
            ) : (
              <>
                Registrar abono <Money value={total} className="tnum" />
              </>
            )}
          </Button>
        </div>
      </div>
      <CashSessionRequiredDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </>
  )
}

type Choice = { kind: 'months'; option: PaymentOption } | { kind: 'payoff' }

/** Una opción en tarjeta con radio (rediseño P2-a, «Tres opciones con consecuencia»). */
function OptionCard({ checked, onSelect, title, detail, amount }: { checked: boolean; onSelect: () => void; title: string; detail: string | null; amount: string }) {
  return (
    <label
      className={cn(
        'grid min-h-14 cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-input border px-3.5 py-3 transition-colors duration-(--duration-fast) has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
        checked ? 'border-brand bg-brand-50 ring-1 ring-brand' : 'border-border-strong bg-card hover:bg-muted',
      )}
    >
      <input type="radio" name="payment-choice" checked={checked} onChange={onSelect} className="peer sr-only" />
      <span aria-hidden className={cn('size-5 rounded-full border-2', checked ? 'border-6 border-brand' : 'border-border-strong')} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        {detail && <span className="block text-xs text-muted-foreground">{detail}</span>}
      </span>
      <Money value={amount} className="tnum text-base font-bold whitespace-nowrap text-foreground" />
    </label>
  )
}

/**
 * "Dinero guiado, nunca libre" (docs/DESIGN_SYSTEM.md §4.2): los meses a
 * pagar salen de `payment-options` con el monto exacto — jamás un campo libre
 * de interés (el backend rechaza parciales). El único campo libre es el abono
 * a capital cuando `allows_capital` (con meses adeudados) o cuando el contrato
 * ya está al día (`CapitalOnlyPaymentForm` arriba).
 *
 * Rediseño P2-a: en vez de una fila de botones por mes, tres opciones que
 * dicen cómo queda el contrato —1 mes, ponerse al día (preseleccionada) y
 * saldar— y el resto detrás de «Más meses o abono a capital». Saldar manda
 * `payoff_months` y el capital completo (`payoff_total − payoff_interest`),
 * como el abono a capital que salda (F4-11 del backend).
 */
export function PaymentOptionsPanel({ contractId, contractNumber, customerName, interestPaidUntil, status, itemCount }: { contractId: string } & PaymentContext & PaymentContractInfo) {
  const { data: quote, isPending, isError, refetch } = usePaymentOptions(contractId)
  const { data: accounts } = useAccounts()
  const createPayment = useCreatePayment(contractId)
  const [choice, setChoice] = useState<Choice | null>(null)
  const [showMore, setShowMore] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<Method>('cash')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [capitalAmount, setCapitalAmount] = useState('0.00')
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const info: PaymentContractInfo = { interestPaidUntil, status, itemCount }

  const header = (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="registrar-abono" className="text-md font-semibold text-foreground">
        Registrar abono
      </h2>
      {quote && (
        <span className="text-sm font-medium text-brand">
          Interés mensual <Money value={quote.monthly_interest} />
        </span>
      )}
    </div>
  )

  if (isPending) {
    return (
      <>
        {header}
        <div className="h-40 animate-pulse rounded-input bg-border" />
      </>
    )
  }

  if (isError) {
    return (
      <>
        {header}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No se pudieron cargar las opciones de abono.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      </>
    )
  }

  if (!quote) return null

  if (quote.months_owed === 0) {
    return (
      <>
        {header}
        <Can permission="payments.create" fallback={<p className="text-sm text-muted-foreground">No tienes permiso para registrar abonos.</p>}>
          <CapitalOnlyPaymentForm contractId={contractId} quote={quote} context={{ contractNumber, customerName }} />
        </Can>
      </>
    )
  }

  if (quote.options.length === 0) {
    return (
      <>
        {header}
        <p className="text-sm text-muted-foreground">Este contrato no tiene abonos disponibles en este momento.</p>
      </>
    )
  }

  const oneMonth = quote.options.find((o) => o.months === 1) ?? null
  const catchUp = catchUpOption(quote)
  // Por defecto, ponerse al día (F9-18); si el backend no la ofrece, la primera.
  const firstOption = quote.options[0]!
  const current: Choice = choice ?? { kind: 'months', option: catchUp ?? firstOption }
  const capitalBalance = subtractMoney(quote.payoff_total, quote.payoff_interest)
  const capitalApplies = current.kind === 'months' && current.option.allows_capital && showMore
  const total =
    current.kind === 'payoff' ? quote.payoff_total : sumMoney(current.option.interest_amount, capitalApplies ? capitalAmount : null)
  const isSelected = (option: PaymentOption) => current.kind === 'months' && current.option.months === option.months

  function choose(next: Choice) {
    setChoice(next)
    setCapitalAmount('0.00')
    setError(null)
  }

  async function handleConfirm() {
    setError(null)
    const hasCapital = capitalApplies && Number(capitalAmount) > 0
    const concept =
      current.kind === 'payoff'
        ? `Saldar: ${formatCOP(capitalBalance)} de capital + ${formatCOP(quote!.payoff_interest)} de interés`
        : `${monthsLabel(current.option.months)} de interés${hasCapital ? ` + ${formatCOP(capitalAmount)} a capital` : ''}`
    const result = await confirm({
      title: current.kind === 'payoff' ? '¿Saldar el contrato?' : '¿Registrar el abono?',
      summary: paymentSummary({
        context: { contractNumber, customerName },
        concept,
        total,
        paymentMethod,
        accountName: accounts?.find((a) => a.id === accountId)?.name,
      }),
      confirmLabel: `Registrar abono ${formatCOP(total)}`,
      cancelLabel: 'Volver',
    })
    if (!result.confirmed) return

    try {
      await createPayment.mutateAsync(
        current.kind === 'payoff'
          ? { months_covered: quote!.payoff_months, capital_amount: capitalBalance, account_id: accountId, payment_method: paymentMethod }
          : { months_covered: current.option.months, capital_amount: hasCapital ? capitalAmount : null, account_id: accountId, payment_method: paymentMethod },
      )
      toast.success(current.kind === 'payoff' ? 'Contrato saldado' : 'Abono registrado')
      setChoice(null)
      setShowMore(false)
      setCapitalAmount('0.00')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CASH_SESSION_NOT_OPEN') {
        setCashDialogOpen(true)
        return
      }
      if (err instanceof ApiError && err.code === 'PAYMENT_MINIMUM_INTEREST_REQUIRED') void refetch()
      setError(err instanceof ApiError ? userMessage(err) : 'No se pudo registrar el abono. Intenta de nuevo.')
    }
  }

  const prenda = (itemCount ?? 1) > 1 ? 'devuelve las prendas' : 'devuelve la prenda'

  return (
    <>
      {header}
      <Can permission="payments.create" fallback={<p className="text-sm text-muted-foreground">No tienes permiso para registrar abonos.</p>}>
        <form
          className="flex flex-col gap-4"
          onKeyDown={preventImplicitSubmit}
          onSubmit={(e) => {
            e.preventDefault()
            void handleConfirm()
          }}
        >
          <CashClosedNotice paymentMethod={paymentMethod} />

          <fieldset className="grid gap-2">
            <legend className="sr-only">Qué paga</legend>
            {/* Con un solo mes adeudado, «1 mes» y «ponerse al día» son la misma opción. */}
            {oneMonth && oneMonth !== catchUp && (
              <OptionCard
                checked={isSelected(oneMonth)}
                onSelect={() => choose({ kind: 'months', option: oneMonth })}
                title="1 mes de interés"
                detail={paymentConsequence(1, quote.months_owed, info)}
                amount={oneMonth.interest_amount}
              />
            )}
            {catchUp && (
              <OptionCard
                checked={isSelected(catchUp)}
                onSelect={() => choose({ kind: 'months', option: catchUp })}
                title={`Ponerse al día · ${monthsLabel(catchUp.months)}`}
                detail={paymentConsequence(catchUp.months, quote.months_owed, info)}
                amount={catchUp.interest_amount}
              />
            )}
            <OptionCard
              checked={current.kind === 'payoff'}
              onSelect={() => choose({ kind: 'payoff' })}
              title="Saldar el contrato"
              detail={`capital + intereses, ${prenda}`}
              amount={quote.payoff_total}
            />
          </fieldset>

          <div>
            <Button type="button" variant="ghost" size="sm" aria-expanded={showMore} onClick={() => setShowMore((v) => !v)}>
              Más meses o abono a capital
              <ChevronDown aria-hidden className={cn('transition-transform duration-(--duration-fast)', showMore && 'rotate-180')} />
            </Button>
            {showMore && (
              <div className="mt-2 flex flex-col gap-3 rounded-input border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  {monthsLabel(quote.months_owed)} {quote.months_owed === 1 ? 'adeudado' : 'adeudados'} · para saldar hoy <Money value={quote.payoff_total} />
                </p>
                <div role="radiogroup" aria-label="Meses a pagar" className="flex flex-wrap gap-2">
                  {quote.options.map((option) => (
                    <button
                      key={option.months}
                      type="button"
                      role="radio"
                      aria-checked={isSelected(option)}
                      onClick={() => choose({ kind: 'months', option })}
                      className={cn(
                        'min-h-11 rounded-input border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        isSelected(option) ? 'border-brand bg-brand-50 text-brand' : 'border-border-strong bg-card hover:bg-muted',
                      )}
                    >
                      {monthsLabel(option.months)} · <Money value={option.interest_amount} />
                    </button>
                  ))}
                </div>
                {current.kind === 'months' && current.option.allows_capital && (
                  <div>
                    <label htmlFor="payment-capital" className="text-sm font-medium text-foreground">
                      Abono a capital (opcional)
                    </label>
                    <MoneyInput id="payment-capital" className="mt-1" value={capitalAmount} onChange={setCapitalAmount} />
                  </div>
                )}
              </div>
            )}
          </div>

          <PaymentMethodField value={paymentMethod} onChange={setPaymentMethod} accountId={accountId} onAccountChange={setAccountId} />

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" size="lg" disabled={createPayment.isPending}>
            {createPayment.isPending ? (
              'Registrando…'
            ) : (
              <>
                Registrar abono <Money value={total} className="tnum" />
              </>
            )}
          </Button>
        </form>
      </Can>

      <CashSessionRequiredDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </>
  )
}
