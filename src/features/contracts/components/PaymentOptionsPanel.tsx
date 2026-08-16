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

/**
 * "Dinero guiado, nunca libre" (docs/DESIGN_SYSTEM.md §4.2): los meses a
 * pagar salen de `payment-options` como botones con el monto exacto — jamás
 * un campo libre de interés. El único campo libre es el abono a capital
 * cuando `allows_capital`.
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

  if (!quote || quote.options.length === 0) {
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
    <Can permission="contracts.payment" fallback={<p className="text-sm text-muted-foreground">No tienes permiso para registrar abonos.</p>}>
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
            <div>
              <label className="text-sm font-medium text-foreground">Medio de pago</label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
