import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { fetchAllPages } from '@/lib/api/pagination'
import { fetchAllClosingsInRange } from '@/lib/cashbox/closings'
import { usePermission } from '@/lib/permissions/usePermission'
import type { DateRangeValue } from '@/components/shared/DateRangePicker'
import { daysBetweenDateOnly } from '@/features/reports/aggregate'
import type { SessionReport, Expense } from '@/features/cashbox/api'
import type { Sale } from '@/lib/sales/void'
import type { components } from '@/types/api'
import type { Item } from '@/lib/inventory/items'

export const MAX_RANGE_DAYS = 90

export interface RawSession {
  sessionDate: string
  report: SessionReport
}

/**
 * Sesiones de caja cerradas de un rango + su desglose (`GET /reports/closings`
 * + `GET /cashbox/sessions/{id}/report` por cada una) — SIN agregar. La
 * agregación vive en `aggregateFinancialSummary` (features/reports/aggregate.ts),
 * llamada desde la página vía `useMemo` — así cambiar el filtro de módulo
 * (Todo/Empeño/Tienda) es instantáneo, sin refetch. No existe hoy un endpoint
 * del backend que dé esto agregado por rango (docs/PENDIENTES_BACKEND_INFRA.md
 * punto 13) — mientras tanto, N+1 acotado: una request por sesión de caja,
 * ~1/día, tope explícito de `MAX_RANGE_DAYS` (impuesto por el caller, no acá).
 */
export function useRawSessions(range: DateRangeValue | null) {
  const withinCap = !!range && daysBetweenDateOnly(range.from, range.to) <= MAX_RANGE_DAYS
  // Desde 00031 las DOS llamadas de acá (`/reports/closings` y el reporte de
  // cada sesión pasada) exigen `cashbox.view_history`. Se comprueba antes de
  // disparar: sin esto, un rol con `reports.view` pero sin histórico haría
  // una ráfaga de 403 en cada carga de /reportes por algo que ya sabemos
  // mirando sus permisos. La UI oculta, el backend protege — pero no hay
  // razón para tocar la puerta sabiendo que está cerrada.
  const canViewHistory = usePermission('cashbox.view_history')
  return useQuery<RawSession[]>({
    queryKey: ['reports', 'raw-sessions', range] as const,
    enabled: withinCap && canViewHistory,
    queryFn: async () => {
      const closings = await fetchAllClosingsInRange(range!)
      return Promise.all(
        closings.map(async (closing) => ({
          sessionDate: closing.session_date,
          report: await unwrap(api.GET('/api/v1/cashbox/sessions/{session_id}/report', { params: { path: { session_id: closing.session_id } } })),
        })),
      )
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

/**
 * Gastos de cada sesión ya resuelta por `useRawSessions` — dimensión de
 * categoría (`ExpenseOut.category_id`) que NO viene en el desglose de
 * `GET /cashbox/sessions/{id}/report` (ese solo trae módulo×concepto×medio).
 * Recibe las sesiones YA resueltas (no vuelve a pedir `GET /reports/closings`)
 * para no duplicar esa request. Una página por sesión alcanza (mismo criterio
 * pragmático que `useAvailableItemsSearch`, `lib/inventory/items.ts`).
 */
export function useExpensesByCategory(sessions: RawSession[] | undefined) {
  const sessionIds = sessions?.map((s) => s.report.session_id)
  return useQuery<Expense[]>({
    queryKey: ['reports', 'expenses-by-category', sessionIds] as const,
    enabled: !!sessionIds,
    queryFn: async () => {
      const perSession = await Promise.all(
        sessionIds!.map((sessionId) => unwrap(api.GET('/api/v1/cashbox/expenses', { params: { query: { session_id: sessionId, limit: 100 } } }))),
      )
      return perSession.flatMap((page) => page.items)
    },
  })
}

/**
 * "Prendas más vendidas"/"categorías más movidas" — TODO el histórico, no el
 * rango elegido arriba (`GET /sales` no tiene filtro de fecha — decisión
 * confirmada con el cliente, ver `features/reports/rankings.ts`). Query
 * independiente del date picker, `staleTime` largo — no se recalcula cada
 * vez que se cambia el rango de las demás cards. Tope defensivo de 50
 * páginas (`fetchAllPages`) en ventas Y artículos, para no crecer sin límite
 * con el historial de una compraventa que lleva años operando.
 */
export function useAllTimeItemSales() {
  return useQuery({
    queryKey: ['reports', 'all-time-item-sales'] as const,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [sales, items] = await Promise.all([
        fetchAllPages<Sale>((cursor) => unwrap(api.GET('/api/v1/sales', { params: { query: { cursor, limit: 100 } } }))),
        fetchAllPages<Item>((cursor) => unwrap(api.GET('/api/v1/inventory/items', { params: { query: { cursor, limit: 100 } } }))),
      ])
      return { sales, items }
    },
  })
}

export type ProfitSummary = components['schemas']['ProfitSummaryOut']

/**
 * Utilidad BRUTA del período: ventas menos el costo de la mercancía vendida.
 *
 * A diferencia del resto de esta pantalla —que agrega sesiones de caja con un
 * N+1 acotado y por eso tiene tope de 90 días— esto es UNA consulta agregada
 * en Postgres (`GET /reports/profit`), así que no depende del tope ni del
 * número de sesiones del rango. Se pide igual con el rango elegido para que
 * los números se lean junto a los demás.
 */
export function useProfitSummary(range: { from: string; to: string } | null) {
  return useQuery({
    queryKey: ['reports', 'profit', range?.from, range?.to] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/reports/profit', {
          params: { query: { from_date: range!.from, to_date: range!.to } },
        }),
      ),
    enabled: !!range,
  })
}

export type PawnPerformance = components['schemas']['PawnPerformanceOut']

/**
 * Rentabilidad del empeño: intereses cobrados sobre el capital prestado.
 * Complementa `useProfitSummary` (tienda) — son preguntas distintas: la tienda
 * se mide por margen sobre costo, el empeño por rendimiento sobre capital.
 *
 * Los intereses salen de `contract_payment` y no del desglose de caja que usa
 * el resto de esta pantalla, así que incluye los abonos de HOY (el desglose
 * solo cubre sesiones ya cerradas).
 */
export function usePawnPerformance(range: { from: string; to: string } | null) {
  return useQuery({
    queryKey: ['reports', 'pawn-performance', range?.from, range?.to] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/reports/pawn-performance', {
          params: { query: { from_date: range!.from, to_date: range!.to } },
        }),
      ),
    enabled: !!range,
  })
}

export type Payables = components['schemas']['PayablesOut']
export type InventoryValuation = components['schemas']['InventoryValuationOut']
export type StaleInventory = components['schemas']['StaleInventoryOut']

/**
 * Cuentas por pagar con antigüedad. No lleva rango de fechas a propósito: una
 * deuda se debe HOY o no se debe — preguntar "¿cuánto debía en marzo?" es otra
 * pregunta, y el esquema no guarda el histórico para responderla bien.
 */
export function usePayables() {
  return useQuery({
    queryKey: ['reports', 'payables'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/reports/payables')),
  })
}

/** Valor del inventario disponible, al costo. Tampoco lleva rango: es una foto de hoy. */
export function useInventoryValuation() {
  return useQuery({
    queryKey: ['reports', 'inventory-valuation'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/reports/inventory-valuation')),
  })
}

export function useStaleInventory(thresholdDays: number) {
  return useQuery({
    queryKey: ['reports', 'stale-inventory', thresholdDays] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/reports/stale-inventory', { params: { query: { threshold_days: thresholdDays, limit: 20 } } })),
  })
}
