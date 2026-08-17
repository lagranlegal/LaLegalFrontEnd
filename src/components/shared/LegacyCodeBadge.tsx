import { cn } from '@/lib/utils'

/**
 * Referencia externa fija (`legacy_code` de un contrato importado — paso 5b,
 * docs/RECOMENDACIONES.md §1.6), NO un estado — por eso no pasa por
 * `StatusBadge`. Tono neutro siempre, sin mapa estado→color.
 */
export function LegacyCodeBadge({ code, className }: { code: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-pill bg-status-neutral/15 px-2.5 py-0.5 font-mono text-xs font-medium text-status-neutral', className)}>{code}</span>
  )
}
