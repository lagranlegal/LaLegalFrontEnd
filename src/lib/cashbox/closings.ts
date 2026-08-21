import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery, fetchAllPages } from '@/lib/api/pagination'
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
export function useClosingsHistory(range: DateRangeValue | null, options?: { enabled?: boolean }) {
  return useCursorInfiniteQuery(
    ['reports', 'closings', range] as const,
    (cursor) => unwrap(api.GET('/api/v1/reports/closings', { params: { query: { from_date: range?.from, to_date: range?.to, cursor } } })),
    // Desde 00031 este endpoint exige `cashbox.view_history` ADEMÁS de
    // `reports.view`. Sin `enabled`, un cajero dispararía un 403 en cada
    // carga de la pantalla de caja — ruido en la consola y en los logs por
    // algo que ya sabemos de antemano mirando sus permisos.
    { enabled: options?.enabled ?? true },
  )
}

/** Variante no-hook de lo de arriba: todas las páginas de una vez, para agregación (features/reports), no scroll infinito. */
export function fetchAllClosingsInRange(range: DateRangeValue): Promise<ClosingHistory[]> {
  return fetchAllPages((cursor) => unwrap(api.GET('/api/v1/reports/closings', { params: { query: { from_date: range.from, to_date: range.to, cursor, limit: 100 } } })))
}
