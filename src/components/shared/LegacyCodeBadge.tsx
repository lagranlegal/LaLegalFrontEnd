import { cn } from '@/lib/utils'

/**
 * Referencia externa fija (`legacy_code` de un contrato importado — paso 5b,
 * backend-starter/docs/DOMINIO.md §2.5), NO un estado — por eso no pasa por
 * `StatusBadge`. Tono neutro siempre, sin mapa estado→color.
 */
export function LegacyCodeBadge({ code, className }: { code: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center h-6 rounded-pill bg-neutral-soft px-2.25 font-mono text-xs font-medium text-body', className)}>{code}</span>
  )
}
