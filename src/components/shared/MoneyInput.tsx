import { MAX_MONEY_DIGITS, maskMoneyInput, parseMoneyInput, parseMoneyText } from '@/lib/money'
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
  const masked = maskMoneyInput(value.split('.')[0] ?? '')
  // F9-24: un obligatorio en cero se muestra VACÍO (placeholder «0»). Con el
  // «0» escrito, el cursor antes del cero convertía 500000 en 5.000.000. En
  // uno opcional, «0» es un dato distinto de «sin dato» y se sigue viendo.
  const display = !optional && masked === '0' ? '' : masked

  function handleChange(raw: string) {
    if (optional && !/\d/.test(raw)) return onChange('')
    const next = parseMoneyInput(raw)
    // Tope de dígitos (F9-23): el que pasa del tope no entra.
    if ((next.split('.')[0] ?? '').length > MAX_MONEY_DIGITS) return
    onChange(next)
  }

  // Lo PEGADO se interpreta entero, con sus separadores (F9-23): «$ 1.234.567,00»
  // es un millón doscientos treinta y cuatro mil, no 123 millones. Se arma
  // el texto como quedaría —lo de antes y después de la selección, más lo
  // pegado— y se lee con `parseMoneyText`. Si no cabe, el pegado no entra.
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text')
    e.preventDefault()
    const input = e.currentTarget
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? input.value.length
    const combined = input.value.slice(0, start) + pasted + input.value.slice(end)
    if (optional && !/\d/.test(combined)) return onChange('')
    const next = parseMoneyText(combined)
    if (next !== null) onChange(next)
  }

  return (
    <div className={cn('flex items-center rounded-input border border-border bg-background px-3 focus-within:border-primary', className)}>
      <span className="text-sm text-muted-foreground">$</span>
      <input
        id={id}
        aria-label={ariaLabel}
        type="text"
        inputMode="numeric"
        autoFocus={autoFocus}
        placeholder={placeholder ?? (optional ? undefined : '0')}
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        onPaste={handlePaste}
        // Enfocar selecciona todo: lo que se escribe reemplaza la cifra en
        // vez de pegarse a un lado de ella (F9-24).
        onFocus={(e) => e.currentTarget.select()}
        className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none"
      />
    </div>
  )
}
