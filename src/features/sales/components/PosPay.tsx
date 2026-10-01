import { useState } from 'react'
import { User } from 'lucide-react'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { formatCOP, compareMoney } from '@/lib/money'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import type { Customer } from '@/lib/customers/search'
import { cn } from '@/lib/utils'

export type PaymentMethod = keyof typeof PAYMENT_METHOD_LABELS

/**
 * Piezas de la columna de cobro del punto de venta (rediseño P2). Son de la
 * feature: si otra pantalla de cobro las pide, el segmentado sube a
 * `components/shared`.
 */

/** «Consumidor final · Cambiar»; al cambiar, el buscador de clientes. */
export function PosCustomerField({ value, onChange }: { value: Customer | null; onChange: (customer: Customer | null) => void }) {
  const [picking, setPicking] = useState(false)

  if (picking && !value) {
    return (
      <div className="flex flex-col gap-1">
        <CustomerPicker
          value={null}
          onChange={(c) => {
            onChange(c)
            setPicking(false)
          }}
        />
        <button type="button" className="self-end text-button-sm font-medium text-brand hover:underline" onClick={() => setPicking(false)}>
          Vender a consumidor final
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-11 items-center justify-between gap-2 rounded-input border border-border-strong bg-card px-3 py-1.5">
      <span className="flex min-w-0 items-center gap-2 text-foreground">
        <User className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0">
          <span className="block truncate">{value ? value.full_name : 'Consumidor final'}</span>
          {value && (
            <span className="block text-xs text-muted-foreground">
              {value.doc_type.toUpperCase()} {value.doc_number}
            </span>
          )}
        </span>
      </span>
      <button
        type="button"
        className="shrink-0 text-button-sm font-medium text-brand hover:underline"
        aria-label={value ? 'Cambiar cliente' : 'Elegir cliente'}
        onClick={() => {
          onChange(null)
          setPicking(true)
        }}
      >
        Cambiar
      </button>
    </div>
  )
}

/**
 * Medio de pago segmentado de 44 px (F9-34). El activo va en neutro invertido,
 * nunca en el oro del primario (F9-13: un solo dorado por pantalla).
 */
export function PaymentMethodSegmented({ value, onChange, labelledBy }: { value: PaymentMethod; onChange: (method: PaymentMethod) => void; labelledBy: string }) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid auto-cols-fr grid-flow-col overflow-hidden rounded-input border border-border-strong bg-card">
      {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([method, label]) => {
        const on = method === value
        return (
          <button
            key={method}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(method)}
            className={cn(
              'min-h-11 border-r border-border-strong px-1.5 text-center text-sm last:border-r-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              on ? 'bg-foreground font-semibold text-background' : 'font-medium text-body hover:bg-muted',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/** «Exacto» y los montos redondos de `quickCashAmounts`; el que coincide con lo recibido queda marcado. */
export function QuickCashButtons({ due, amounts, received, onPick }: { due: string; amounts: string[]; received: string; onPick: (amount: string) => void }) {
  const options = [{ label: 'Exacto', amount: due }, ...amounts.map((amount) => ({ label: formatCOP(amount), amount }))]
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-1.5">
      {options.map(({ label, amount }) => {
        const on = received !== '' && compareMoney(received, amount) === 0
        return (
          <button
            key={label}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(amount)}
            className={cn(
              'min-h-10 rounded-input border px-1 text-button-sm font-semibold text-foreground tnum focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              on ? 'border-brand bg-brand-50' : 'border-border-strong bg-card hover:bg-muted',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
