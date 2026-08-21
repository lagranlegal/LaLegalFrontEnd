import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useMoneyMutation } from '@/lib/api/useMoneyMutation'
import type { Account } from '@/lib/accounts/list'
import type { components } from '@/types/api'

// `useAccounts` vive en `lib/accounts/list.ts` — lo consume también
// `AccountPicker`, que aparece en features que no pueden importar de esta.
export { useAccounts } from '@/lib/accounts/list'
export type { Account } from '@/lib/accounts/list'

export type AccountType = Account['type']
export type AccountCreateIn = components['schemas']['AccountCreateIn']
export type AccountUpdateIn = components['schemas']['AccountUpdateIn']
export type SettlementIn = components['schemas']['SettlementIn']
export type SettlementOut = components['schemas']['SettlementOut']

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AccountCreateIn) => unwrap(api.POST('/api/v1/accounts', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, body }: { accountId: string; body: AccountUpdateIn }) =>
      unwrap(api.PATCH('/api/v1/accounts/{account_id}', { params: { path: { account_id: accountId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

/**
 * Liquidar un convenio mueve plata real entre dos cuentas, así que va por
 * `useMoneyMutation` con `Idempotency-Key` (CLAUDE.md regla 8) — reenviar la
 * misma key no vuelve a liquidar.
 *
 * Invalida además `cashbox` y `dashboard`: si la plata entró a la cuenta de
 * efectivo, el esperado del cierre cambió.
 */
export function useSettleAccount(accountId: string | undefined) {
  return useMoneyMutation({
    mutationFn: (body: SettlementIn, idempotencyKey: string) =>
      unwrap(
        api.POST('/api/v1/accounts/{account_id}/settle', {
          params: { path: { account_id: accountId! }, header: { 'Idempotency-Key': idempotencyKey } },
          body,
        }),
      ),
    invalidateKeys: [['accounts'], ['cashbox'], ['dashboard']],
  })
}
