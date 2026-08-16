import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TONE_CLASSES = {
  default: 'text-foreground',
  danger: 'text-danger',
  success: 'text-success',
  brand: 'text-primary',
} as const

/**
 * Fila de KPIs del dashboard (docs/DESIGN_SYSTEM.md §1, §5): label pequeña
 * + cifra grande `tnum`, color semántico opcional, divisor vertical entre
 * tiles en desktop, grid 2 columnas en mobile.
 */
export function KpiCard({ label, value, tone = 'default' }: { label: string; value: ReactNode; tone?: keyof typeof TONE_CLASSES }) {
  return (
    <div className="flex flex-col gap-1 lg:px-4 lg:first:pl-0 lg:last:pr-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('tnum text-2xl font-semibold', TONE_CLASSES[tone])}>{value}</span>
    </div>
  )
}

export function KpiRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-card border border-border bg-card p-card shadow-card sm:grid-cols-3 lg:flex lg:gap-0 lg:divide-x lg:divide-border">
      {children}
    </div>
  )
}
