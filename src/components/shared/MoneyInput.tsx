import { maskMoneyInput, parseMoneyInput } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * Enmascara con puntos de miles mientras se escribe y emite el string
 * decimal normalizado para la API (docs/DESIGN_SYSTEM.md §3). El valor
 * controlado (`value`/`onChange`) SIEMPRE es el string decimal canónico
 * (`"1000000.00"`) — nadie más formatea/parsea dinero fuera de acá.
 */
export function MoneyInput({
  value,
  onChange,
  id,
  placeholder,
  autoFocus,
  className,
}: {
  value: string
  onChange: (decimalValue: string) => void
  id?: string
  placeholder?: string
  autoFocus?: boolean
  className?: string
}) {
  const display = maskMoneyInput(value.split('.')[0] ?? '')
  return (
    <div className={cn('flex items-center rounded-input border border-border bg-background px-3 focus-within:border-primary', className)}>
      <span className="text-sm text-muted-foreground">$</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={display}
        onChange={(e) => onChange(parseMoneyInput(e.target.value))}
        className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none"
      />
    </div>
  )
}
