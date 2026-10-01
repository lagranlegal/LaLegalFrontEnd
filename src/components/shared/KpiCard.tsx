import { Children, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TONE_CLASSES = {
  default: 'text-foreground',
  danger: 'text-danger',
  success: 'text-success',
  brand: 'text-brand',
} as const

/** `pct: null` = sin base de comparación (período anterior en 0) — se muestra "—". `favorable` decide el color, no el signo (bajar gastos también es verde). */
export interface KpiDelta {
  pct: number | null
  favorable: boolean
}

/**
 * Fila de KPIs del dashboard (docs/DESIGN_SYSTEM.md §1, §5): label pequeña
 * + cifra grande `tnum`, color semántico opcional, divisor vertical entre
 * tiles en desktop, grid 2 columnas en mobile. `delta` opcional (Reportes,
 * comparación vs período anterior) agrega una segunda línea pequeña.
 */
export function KpiCard({
  label,
  value,
  tone = 'default',
  delta,
  hint,
}: {
  label: string
  value: ReactNode
  tone?: keyof typeof TONE_CLASSES
  delta?: KpiDelta
  /** Contexto bajo la cifra, para cuando el número solo se entiende con su
   *  denominador ("3 compras sin pagar", "desde marzo"). Excluyente con
   *  `delta`: los dos ocupan la misma línea y competir ahí sería ruido. */
  hint?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {/* La cifra NUNCA se parte dentro de un número («$ 6.000.00 / 0» a 1024–1280
          px, verificación del 29/09): nada de `wrap-anywhere`. Que quepa es trabajo
          de la fila, que no pone más columnas de las que caben (`KpiRow`). */}
      <span className={cn('tnum min-w-0 text-2xl font-semibold', TONE_CLASSES[tone])}>{value}</span>
      {delta && (
        <span className={cn('text-xs font-medium', delta.pct === null ? 'text-muted-foreground' : delta.favorable ? 'text-success' : 'text-danger')}>
          {delta.pct === null ? '— vs período anterior' : `${delta.pct >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(delta.pct))}% vs período anterior`}
        </span>
      )}
      {!delta && hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

const ROW_BASE = 'enter-up grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 rounded-card border border-border bg-card p-card sm:grid-cols-3'

/**
 * Una columna por debajo de 480 px (F9-06): a 360 px dos cifras de dinero en
 * text-2xl no caben lado a lado y se leían como una sola. En una sola fila
 * (con divisores) solo cuando caben: hasta 4 tarjetas desde 1024 px; con 5 o
 * más (el Inicio tiene 6) desde 1536 px, porque a 1280 con el sidebar cada
 * celda queda en ~120 px y «$ 6.000.000» no entra. Clases completas y
 * estáticas: Tailwind no ve una clase armada por interpolación.
 */
export function KpiRow({ children }: { children: ReactNode }) {
  const many = Children.toArray(children).length > 4
  return (
    <div
      className={cn(
        ROW_BASE,
        many
          ? '2xl:flex 2xl:gap-0 2xl:divide-x 2xl:divide-border 2xl:*:px-4 2xl:*:first:pl-0 2xl:*:last:pr-0'
          : 'lg:flex lg:gap-0 lg:divide-x lg:divide-border lg:*:px-4 lg:*:first:pl-0 lg:*:last:pr-0',
      )}
    >
      {children}
    </div>
  )
}
