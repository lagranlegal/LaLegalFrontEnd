import { formatCOP } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * Nadie formatea dinero fuera de `Money`/`MoneyInput` (docs/DESIGN_SYSTEM.md
 * §3). Cifras con `tabular-nums` (`.tnum`, ver styles/globals.css) para que
 * alineen en columnas/KPIs.
 */
export function Money({
  value,
  maximumFractionDigits,
  tone,
  className,
}: {
  value: string | number
  maximumFractionDigits?: 0 | 2
  /** Variante coloreada para movimientos entrantes/salientes. */
  tone?: 'in' | 'out'
  className?: string
}) {
  return (
    <span
      className={cn(
        'tnum',
        tone === 'in' && 'text-success',
        tone === 'out' && 'text-danger',
        className,
      )}
    >
      {formatCOP(value, { maximumFractionDigits })}
    </span>
  )
}
