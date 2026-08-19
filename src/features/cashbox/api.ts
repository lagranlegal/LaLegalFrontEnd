import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import { todayBogota } from '@/lib/dates'
import type { components } from '@/types/api'

// `useClosingsHistory`/`ClosingHistory` viven en `lib/cashbox/closings.ts`
// desde esta sesión — `features/reports` se volvió el segundo consumidor
// real (CLAUDE.md regla 3). `CashboxPage.tsx` importa directo de `lib/`.

export type Session = components['schemas']['SessionOut']
export type SessionReport = components['schemas']['SessionReportOut']
export type ExpenseCategory = components['schemas']['ExpenseCategoryOut']
export type ExpenseCategoryCreateIn = components['schemas']['ExpenseCategoryCreateIn']
export type Expense = components['schemas']['ExpenseOut']
export type ExpenseCreateIn = components['schemas']['ExpenseCreateIn']

/**
 * `CASH_SESSION_NOT_OPEN` acá no es un error de UI — es el estado normal
 * "no hay caja abierta hoy" (docs/ARCHITECTURE.md §6). Se normaliza a
 * `null` para que `CashSessionBanner` lo trate como dato, no como falla.
 */
export function cashboxCurrentQueryOptions() {
  return queryOptions({
    queryKey: ['cashbox', 'current'] as const,
    queryFn: async () => {
      try {
        return await unwrap(api.GET('/api/v1/cashbox/sessions/current'))
      } catch (error) {
        if (error instanceof ApiError && error.code === 'CASH_SESSION_NOT_OPEN') {
          return null
        }
        throw error
      }
    },
  })
}

export function useCashboxCurrent() {
  return useQuery(cashboxCurrentQueryOptions())
}

export function useOpenSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (openingBalance: string) =>
      unwrap(
        api.POST('/api/v1/cashbox/sessions/open', {
          body: { opening_balance: openingBalance },
        }),
      ),
    onSuccess: (session) => {
      // Ver nota en useCloseSession: escribimos ['cashbox','current'] a mano
      // con la respuesta en vez de solo invalidar — evita el hueco de
      // consistencia eventual del backend justo después de escribir.
      queryClient.setQueryData(cashboxCurrentQueryOptions().queryKey, session)
      queryClient.invalidateQueries({ queryKey: ['cashbox', 'most-recent'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/**
 * ¿La sesión de HOY ya se cerró? — para ofrecer "Reabrir" (ciclo diario
 * único, docs/ARCHITECTURE.md §6). **No usa `GET /cashbox/sessions?limit=1`
 * a propósito:** ese endpoint pagina en orden ASCENDENTE (el más viejo
 * primero, confirmado contra dev — típico de paginación por cursor estable),
 * así que `limit=1` da la sesión más VIEJA, no la más reciente — hallazgo
 * real de esta prueba. `GET /reports/closings` sí acepta `from_date`/
 * `to_date`, así que filtrar por HOY exactamente resuelve lo mismo sin
 * asumir ningún orden.
 */
export function useTodayClosing() {
  const today = todayBogota()
  return useQuery({
    queryKey: ['cashbox', 'today-closing', today] as const,
    queryFn: () => unwrap(api.GET('/api/v1/reports/closings', { params: { query: { from_date: today, to_date: today, limit: 1 } } })),
    select: (page) => page.items[0] ?? null,
  })
}

/** Vista previa del cierre (docs/ARCHITECTURE.md, CLAUDE.md paso 6): desglose módulo×concepto×medio + `expected_cash`, ANTES de confirmar. */
export function useSessionReport(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['cashbox', 'session', sessionId, 'report'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/cashbox/sessions/{session_id}/report', { params: { path: { session_id: sessionId! } } })),
    enabled: !!sessionId,
  })
}

function invalidateAfterSessionChange(queryClient: ReturnType<typeof useQueryClient>) {
  // NO incluye ['cashbox','current'] a propósito — cada mutation lo escribe
  // directo (ver comentario en useCloseSession). Invalidar ese key acá
  // dispararía un refetch de fondo que puede pisar el valor correcto con
  // uno desactualizado (ver hallazgo abajo).
  queryClient.invalidateQueries({ queryKey: ['cashbox', 'today-closing'] })
  queryClient.invalidateQueries({ queryKey: ['cashbox', 'expenses'] })
  queryClient.invalidateQueries({ queryKey: ['cashbox', 'session'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['reports', 'closings'] })
}

/**
 * Sin `Idempotency-Key`: el endpoint no lo acepta (no está en el schema
 * generado, a diferencia de contratos/pagos/ventas) — no es una omisión del
 * front, es que este cierre no lo expone hoy. `isPending` sigue
 * deshabilitando el botón mientras está en vuelo (CLAUDE.md regla 8, la
 * parte que sí depende del front).
 *
 * **Hallazgo real (paso 6):** invalidar `['cashbox','current']` tras cerrar
 * y dejar que se refetchee solo mostraba la sesión como "todavía abierta"
 * varios segundos después del 200 del cierre — el backend de dev tiene un
 * hueco de consistencia eventual entre "la escritura respondió 200" y "la
 * siguiente lectura ya la refleja" (mismo síntoma que la latencia de
 * escritura ya documentada, pero afecta la LECTURA inmediatamente después,
 * no la escritura en sí). Como la respuesta del cierre ya nos dice que no
 * hay sesión abierta, escribimos `['cashbox','current']` como `null` a mano
 * en vez de confiar en el refetch — nunca puede quedar desactualizado
 * porque no depende de una lectura adicional al backend.
 */
export function useCloseSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, body }: { sessionId: string; body: components['schemas']['SessionCloseIn'] }) =>
      unwrap(api.POST('/api/v1/cashbox/sessions/{session_id}/close', { params: { path: { session_id: sessionId } }, body })),
    onSuccess: () => {
      queryClient.setQueryData(cashboxCurrentQueryOptions().queryKey, null)
      invalidateAfterSessionChange(queryClient)
    },
  })
}

export function useReopenSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) =>
      unwrap(api.POST('/api/v1/cashbox/sessions/{session_id}/reopen', { params: { path: { session_id: sessionId } }, body: { reason } })),
    onSuccess: (session) => {
      queryClient.setQueryData(cashboxCurrentQueryOptions().queryKey, session)
      invalidateAfterSessionChange(queryClient)
    },
  })
}

// ---- Gastos ----

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['cashbox', 'expense-categories'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/cashbox/expense-categories')),
  })
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ExpenseCategoryCreateIn) => unwrap(api.POST('/api/v1/cashbox/expense-categories', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cashbox', 'expense-categories'] }),
  })
}

export function useExpensesList(sessionId: string | undefined) {
  return useCursorInfiniteQuery(['cashbox', 'expenses', sessionId] as const, (cursor) =>
    unwrap(api.GET('/api/v1/cashbox/expenses', { params: { query: { session_id: sessionId, cursor } } })),
  )
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ExpenseCreateIn) => unwrap(api.POST('/api/v1/cashbox/expenses', { body })),
    onSuccess: () => {
      // No cambia si la sesión está abierta/cerrada — no hace falta tocar
      // ['cashbox','current'] (ver nota de consistencia en useCloseSession).
      queryClient.invalidateQueries({ queryKey: ['cashbox', 'expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

