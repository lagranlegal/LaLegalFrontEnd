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
  optional,
  ariaLabel,
}: {
  value: string
  onChange: (decimalValue: string) => void
  id?: string
  placeholder?: string
  autoFocus?: boolean
  className?: string
  /**
   * Campo que puede quedar SIN dato: borrado emite `''` (el caller lo manda
   * como `null`), no `"0.00"`. QA 03 H-08: tocar y borrar el avalúo mandaba
   * que la prenda vale cero; el conteo de apertura de caja, que se contó $0.
   * Un cero escrito a propósito sigue siendo `"0.00"`.
   */
  optional?: boolean
  /** Nombre accesible cuando el `<label>` visible no alcanza a distinguirlo (una fila de varias). */
  ariaLabel?: string
}) {
  const display = maskMoneyInput(value.split('.')[0] ?? '')
  return (
    <div className={cn('flex items-center rounded-input border border-border bg-background px-3 focus-within:border-primary', className)}>
      <span className="text-sm text-muted-foreground">$</span>
      <input
        id={id}
        aria-label={ariaLabel}
        type="text"
        inputMode="numeric"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={display}
        onChange={(e) => onChange(optional && !/\d/.test(e.target.value) ? '' : parseMoneyInput(e.target.value))}
        className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none"
      />
    </div>
  )
}
