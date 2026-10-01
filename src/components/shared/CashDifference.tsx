import { Money } from '@/components/shared/Money'
import { describeCashDifference } from '@/lib/cashbox/difference'
import { cn } from '@/lib/utils'

/**
 * La diferencia de un arqueo con palabra y monto: «Faltante $ 7.000» en rojo
 * (pide acción), «Sobrante $ 3.000» en ámbar (también exige justificación) y
 * «Sin diferencia» en gris. Rediseño P3, F9-43. La usan el histórico de Caja,
 * el acta y el cierre; Reportes puede usarla igual.
 */
export function CashDifference({ value, className }: { value: string; className?: string }) {
  const { kind, label, amount } = describeCashDifference(value)
  if (kind === 'even') return <span className={cn('text-muted-foreground', className)}>{label}</span>
  return (
    <span
      className={cn(
        'whitespace-nowrap font-semibold',
        kind === 'shortage' && 'text-danger',
        kind === 'surplus' && 'text-warning',
        className,
      )}
    >
      {label} <Money value={amount} />
    </span>
  )
}
