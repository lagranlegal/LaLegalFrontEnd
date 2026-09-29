import type { ReactNode } from 'react'
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
    <div className="flex min-w-0 flex-col gap-1 lg:px-4 lg:first:pl-0 lg:last:pr-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      {/* F9-06: `min-w-0` + `wrap-anywhere` — una cifra larga baja de línea
          DENTRO de su celda en vez de invadir la de al lado («$ 6.000.000$ 0»). */}
      <span className={cn('tnum min-w-0 text-2xl font-semibold wrap-anywhere', TONE_CLASSES[tone])}>{value}</span>
      {delta && (
        <span className={cn('text-xs font-medium', delta.pct === null ? 'text-muted-foreground' : delta.favorable ? 'text-success' : 'text-danger')}>
          {delta.pct === null ? '— vs período anterior' : `${delta.pct >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(delta.pct))}% vs período anterior`}
        </span>
      )}
      {!delta && hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

export function KpiRow({ children }: { children: ReactNode }) {
  return (
    // Una columna por debajo de 400 px (F9-06): a 360 px dos cifras de
    // dinero en text-2xl no caben lado a lado y se leían como una sola.
    <div className="enter-up grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 rounded-card border border-border bg-card p-card shadow-card sm:grid-cols-3 lg:flex lg:gap-0 lg:divide-x lg:divide-border">
      {children}
    </div>
  )
}
