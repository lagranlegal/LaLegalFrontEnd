import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TONE_CLASSES = {
  default: 'text-foreground',
  danger: 'text-danger',
  success: 'text-success',
  brand: 'text-primary',
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
export function KpiCard({ label, value, tone = 'default', delta }: { label: string; value: ReactNode; tone?: keyof typeof TONE_CLASSES; delta?: KpiDelta }) {
  return (
    <div className="flex flex-col gap-1 lg:px-4 lg:first:pl-0 lg:last:pr-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('tnum text-2xl font-semibold', TONE_CLASSES[tone])}>{value}</span>
      {delta && (
        <span className={cn('text-xs font-medium', delta.pct === null ? 'text-muted-foreground' : delta.favorable ? 'text-success' : 'text-danger')}>
          {delta.pct === null ? '— vs período anterior' : `${delta.pct >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(delta.pct))}% vs período anterior`}
        </span>
      )}
    </div>
  )
}

export function KpiRow({ children }: { children: ReactNode }) {
  return (
    <div className="enter-up grid grid-cols-2 gap-4 rounded-card border border-border bg-card p-card shadow-card sm:grid-cols-3 lg:flex lg:gap-0 lg:divide-x lg:divide-border">
      {children}
    </div>
  )
}
