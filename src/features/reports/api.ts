import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { fetchAllPages } from '@/lib/api/pagination'
import { fetchAllClosingsInRange, type ClosingHistory } from '@/lib/cashbox/closings'
import { usePermission } from '@/lib/permissions/usePermission'
import type { DateRangeValue } from '@/components/shared/DateRangePicker'
import { daysBetweenDateOnly } from '@/features/reports/aggregate'
import type { Expense } from '@/features/cashbox/api'
import type { Sale } from '@/lib/sales/void'
import type { components } from '@/types/api'
import type { Item } from '@/lib/inventory/items'

export const MAX_RANGE_DAYS = 90

/**
 * El desglose módulo×concepto×medio×cuenta de TODAS las sesiones de caja
 * cerradas de un rango, ya sumado por el backend en una sola consulta
 * (`GET /reports/closings-breakdown`) — reemplaza el N+1 de antes (un
 * `GET /cashbox/sessions/{id}/report` por sesión, ~1/día del rango).
 * La agregación en sí vive en `aggregateFinancialSummary`
 * (features/reports/aggregate.ts), llamada desde la página vía `useMemo` —
 * así cambiar el filtro de módulo (Todo/Empeño/Tienda) sigue siendo
 * instantáneo, sin refetch: el endpoint no filtra por módulo server-side,
 * se pide el rango completo una vez y se agrega client-side por pestaña.
 */
export function useClosingsBreakdown(range: DateRangeValue | null) {
  // El backend no le pone tope a este endpoint (una sola consulta agregada),
  // pero se respeta el mismo `MAX_RANGE_DAYS` que el resto de la pantalla
  // para no disparar una request que la UI va a descartar igual (`rangeTooWide`
  // en `ReportesPage` esconde toda esta sección) — y porque `useClosingsInRange`,
  // que sí necesita el tope por su N+1 de gastos, se pide siempre junto a este.
  const withinCap = !!range && daysBetweenDateOnly(range.from, range.to) <= MAX_RANGE_DAYS
  // Mismos dos permisos que exigía el N+1 de antes — comprobar antes de
  // disparar evita un 403 sabido de antemano mirando los permisos del rol.
  const canViewHistory = usePermission('cashbox.view_history')
  return useQuery({
    queryKey: ['reports', 'closings-breakdown', range] as const,
    enabled: withinCap && canViewHistory,
    queryFn: () =>
      unwrap(api.GET('/api/v1/reports/closings-breakdown', { params: { query: { from_date: range!.from, to_date: range!.to } } })),
  })
}

/**
 * El listado de cierres del rango (`GET /reports/closings`, una consulta
 * paginada, no N+1) — `closings-breakdown` no incluye una sesión que cerró
 * sin ningún movimiento, así que hace falta esta lista aparte para
 * `sessionCount`/`byDay` completos (`aggregateFinancialSummary`) y para los
 * `session_id` que necesita `useExpensesByCategory` (categoría de gasto es
 * una dimensión que el desglose tampoco trae).
 */
export function useClosingsInRange(range: DateRangeValue | null) {
  const withinCap = !!range && daysBetweenDateOnly(range.from, range.to) <= MAX_RANGE_DAYS
  const canViewHistory = usePermission('cashbox.view_history')
  return useQuery<ClosingHistory[]>({
    queryKey: ['reports', 'closings-list', range] as const,
    enabled: withinCap && canViewHistory,
    queryFn: () => fetchAllClosingsInRange(range!),
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
 * Gastos de cada sesión ya resuelta por `useClosingsInRange` — dimensión de
 * categoría (`ExpenseOut.category_id`) que NO viene en `closings-breakdown`
 * (ese solo trae módulo×concepto×medio×cuenta). Recibe los cierres YA
 * resueltos (no vuelve a pedir `GET /reports/closings`) para no duplicar esa
 * request. Sigue siendo un N+1 (`GET /cashbox/expenses` por sesión) — el
 * endpoint nuevo no cubre esta dimensión — por eso `useClosingsInRange`
 * mantiene el tope de `MAX_RANGE_DAYS`.
 */
export function useExpensesByCategory(closings: ClosingHistory[] | undefined) {
  const sessionIds = closings?.map((c) => c.session_id)
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
 * "Prendas más vendidas"/"categorías más movidas", ACOTADAS al rango elegido
 * arriba (02/09/2026: `GET /sales` ganó `?from_date`/`?to_date`, que era lo
 * único que faltaba — antes esto era el histórico completo y se rotulaba
 * así en la UI para no mentir). Tope defensivo de 50 páginas
 * (`fetchAllPages`) en ventas Y artículos.
 *
 * Los artículos NO se filtran por fecha: se piden para resolver el nombre y
 * la categoría de lo vendido, y una prenda vendida en el rango pudo haber
 * entrado al inventario mucho antes.
 */
export function useItemSales(range: DateRangeValue | null) {
  return useQuery({
    queryKey: ['reports', 'item-sales', range?.from, range?.to] as const,
    enabled: !!range,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [sales, items] = await Promise.all([
        fetchAllPages<Sale>((cursor) =>
          unwrap(
            api.GET('/api/v1/sales', {
              params: { query: { cursor, limit: 100, from_date: range!.from, to_date: range!.to } },
            }),
          ),
        ),
        fetchAllPages<Item>((cursor) => unwrap(api.GET('/api/v1/inventory/items', { params: { query: { cursor, limit: 100 } } }))),
      ])
      return { sales, items }
    },
  })
}

export type MonthlySeries = components['schemas']['MonthlySeriesOut']

/**
 * Serie mensual de ingresos y gastos (`GET /reports/series`, backend
 * 02/09/2026). No depende del rango del date picker: es la tendencia larga
 * (12 meses por defecto), la pregunta "¿cómo viene el año?" — distinta de
 * "¿cómo estuvo este período?", que es lo que responde el resto de la
 * pantalla. Sale de los documentos, así que incluye lo de hoy.
 */
export function useMonthlySeries(months = 12) {
  return useQuery({
    queryKey: ['reports', 'series', months] as const,
    staleTime: 10 * 60 * 1000,
    queryFn: () => unwrap(api.GET('/api/v1/reports/series', { params: { query: { months } } })),
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

export type IncomeStatement = components['schemas']['IncomeStatementOut']

/**
 * Estado de resultados del período: ingresos − costo de ventas − gastos.
 *
 * Reemplaza el KPI "Utilidad operativa" que se calculaba en el front sumando
 * movimientos de caja y **nunca restaba el costo de ventas**. Sale de los
 * documentos, así que además incluye lo de hoy (el desglose de caja solo
 * cubre sesiones cerradas) y cuenta bien las ventas a crédito, que son
 * ingreso aunque la plata no haya entrado.
 */
export function useIncomeStatement(range: { from: string; to: string } | null) {
  return useQuery({
    queryKey: ['reports', 'income-statement', range?.from, range?.to] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/reports/income-statement', {
          params: { query: { from_date: range!.from, to_date: range!.to } },
        }),
      ),
    enabled: !!range,
  })
}
