import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useMoneyMutation } from '@/lib/api/useMoneyMutation'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import type { components } from '@/types/api'

export type CapitalMovement = components['schemas']['CapitalMovementOut']
export type CapitalPosition = components['schemas']['CapitalPositionOut']
export type ContributionIn = components['schemas']['ContributionIn']
export type WithdrawalIn = components['schemas']['WithdrawalIn']

/**
 * El patrimonio del dueño (backend `00054`): aportes al negocio y retiros.
 *
 * **Ni un aporte es un ingreso, ni un retiro es un gasto.** Los dos mueven el
 * patrimonio, no el resultado del período — por eso este módulo vive aparte
 * de Caja y de Reportes, y no reusa el formulario de gastos.
 */

/** Invalidaciones comunes: mover capital cambia saldos, caja y el tablero. */
const CLAVES = [['capital'], ['accounts'], ['cashbox', 'current'], ['dashboard']]

export function useCreateContribution() {
  return useMoneyMutation({
    mutationFn: (body: ContributionIn, idempotencyKey: string) =>
      unwrap(
        api.POST('/api/v1/capital/contributions', {
          params: { header: { 'Idempotency-Key': idempotencyKey } },
          body,
        }),
      ),
    invalidateKeys: CLAVES,
  })
}

export function useCreateWithdrawal() {
  return useMoneyMutation({
    mutationFn: (body: WithdrawalIn, idempotencyKey: string) =>
      unwrap(
        api.POST('/api/v1/capital/withdrawals', {
          params: { header: { 'Idempotency-Key': idempotencyKey } },
          body,
        }),
      ),
    invalidateKeys: CLAVES,
  })
}

/**
 * Dónde está la plata del negocio y cuánto se puede retirar sin tocar el
 * capital.
 *
 * Es la consulta que hay que hacer ANTES de un retiro: en una compraventa la
 * mayor parte del capital no está en el cajón, está prestada y en vitrina.
 */
export function useCapitalPosition(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ['capital', 'position', fromDate, toDate] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/capital/position', {
          params: { query: { from_date: fromDate, to_date: toDate } },
        }),
      ),
  })
}

export function useCapitalMovements(direction?: 'contribution' | 'withdrawal') {
  return useCursorInfiniteQuery(['capital', 'movements', direction ?? 'all'], (cursor) =>
    unwrap(
      api.GET('/api/v1/capital/movements', {
        params: { query: { cursor, direction, limit: 50 } },
      }),
    ),
  )
}
