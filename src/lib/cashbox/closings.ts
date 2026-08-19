import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import type { components } from '@/types/api'
import type { DateRangeValue } from '@/components/shared/DateRangePicker'

export type ClosingHistory = components['schemas']['ClosingHistoryOut']

/**
 * Promovido de `features/cashbox/api.ts` a `lib/` (CLAUDE.md regla 3) —
 * `features/reports` se volvió el segundo consumidor real (necesita el
 * mismo listado de cierres en un rango para agregar el desglose financiero
 * del período). Mismo patrón ya usado esta sesión para `lib/contracts/reference.ts`,
 * `lib/customers/search.ts`, `lib/sales/void.ts`.
 */
export function useClosingsHistory(range: DateRangeValue | null) {
  return useCursorInfiniteQuery(['reports', 'closings', range] as const, (cursor) =>
    unwrap(api.GET('/api/v1/reports/closings', { params: { query: { from_date: range?.from, to_date: range?.to, cursor } } })),
  )
}

/**
 * Variante no-hook de lo de arriba: trae TODAS las páginas de una vez como
 * array plano, para agregación (features/reports), no para scroll infinito
 * en una tabla. No existe un `fetchAllPages` genérico en el repo — este
 * helper es específico a este caso, no una abstracción prematura.
 */
export async function fetchAllClosingsInRange(range: DateRangeValue): Promise<ClosingHistory[]> {
  const items: ClosingHistory[] = []
  let cursor: string | undefined
  do {
    const page = await unwrap(api.GET('/api/v1/reports/closings', { params: { query: { from_date: range.from, to_date: range.to, cursor, limit: 100 } } }))
    items.push(...page.items)
    cursor = page.next_cursor ?? undefined
  } while (cursor)
  return items
}
