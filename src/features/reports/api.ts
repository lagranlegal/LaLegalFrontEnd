import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { fetchAllClosingsInRange } from '@/lib/cashbox/closings'
import type { DateRangeValue } from '@/components/shared/DateRangePicker'
import { aggregateFinancialSummary, daysBetweenDateOnly, type FinancialSummary } from '@/features/reports/aggregate'

export const MAX_RANGE_DAYS = 90

/**
 * Resumen financiero de un rango de fechas — agrega `GET /reports/closings`
 * (sesiones cerradas del rango) + `GET /cashbox/sessions/{id}/report` (desglose
 * de cada una) en un solo objeto (`aggregateFinancialSummary`). No existe hoy
 * un endpoint del backend que dé esto agregado por rango (ver
 * `docs/PENDIENTES_BACKEND_INFRA.md` punto 13) — mientras tanto, N+1 acotado:
 * una request por sesión de caja, ~1/día, tope explícito de `MAX_RANGE_DAYS`
 * (impuesto por el caller, no acá — ver `enabled` de abajo).
 */
export function useFinancialSummary(range: DateRangeValue | null) {
  const withinCap = !!range && daysBetweenDateOnly(range.from, range.to) <= MAX_RANGE_DAYS
  return useQuery<FinancialSummary>({
    queryKey: ['reports', 'financial-summary', range] as const,
    enabled: withinCap,
    queryFn: async () => {
      const closings = await fetchAllClosingsInRange(range!)
      const sessions = await Promise.all(
        closings.map(async (closing) => ({
          sessionDate: closing.session_date,
          report: await unwrap(api.GET('/api/v1/cashbox/sessions/{session_id}/report', { params: { path: { session_id: closing.session_id } } })),
        })),
      )
      return aggregateFinancialSummary(sessions)
    },
  })
}

/**
 * Duplicado deliberado de 3 líneas de `features/dashboard/api.ts`
 * (`dashboardQueryOptions`/`useDashboard`) — mismo criterio ya usado en
 * `useReadyForAuction` de esa misma feature: hook trivial, misma `queryKey`
 * a propósito para compartir cache/invalidaciones existentes, sin que una
 * feature importe internals de otra (CLAUDE.md regla 3).
 */
export function useCarteraActual() {
  return useQuery({
    queryKey: ['dashboard'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/reports/dashboard')),
  })
}
