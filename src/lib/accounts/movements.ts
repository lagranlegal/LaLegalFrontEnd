import { useQueries } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { compareMoney } from '@/lib/money'
import { useAccounts, type Account } from '@/lib/accounts/list'

export interface AccountMovement {
  account: Account
  totalIn: string
  totalOut: string
}

/**
 * Lo que entró y salió por las cuentas que NO son efectivo en un rango
 * (issue #12). Los cierres de caja solo cuentan el cajón: un rango sin
 * cierres puede tener ventas y abonos por transferencia, y decir «no hay
 * cierres» a secas lo hacía parecer un período sin actividad. Sale del
 * extracto de cada cuenta (`GET /accounts/{id}/statement`, `accounts.view`):
 * los totales los calcula el backend, acá solo se filtran las que se movieron.
 */
export function useOtherAccountsMovement(range: { from: string; to: string } | null, options: { enabled: boolean }) {
  const { data: accounts, isPending: accountsPending } = useAccounts()
  const others = options.enabled && range ? (accounts ?? []).filter((a) => a.type !== 'cash') : []
  const results = useQueries({
    queries: others.map((account) => ({
      queryKey: ['accounts', account.id, 'statement', range?.from, range?.to] as const,
      queryFn: () =>
        unwrap(
          api.GET('/api/v1/accounts/{account_id}/statement', {
            params: { path: { account_id: account.id }, query: { from_date: range!.from, to_date: range!.to } },
          }),
        ),
    })),
  })
  const isPending = options.enabled && !!range && (accountsPending || results.some((r) => r.isPending))
  const moved: AccountMovement[] = []
  results.forEach((result, index) => {
    const account = others[index]
    if (!result.data || !account) return
    if (compareMoney(result.data.total_in, '0') !== 0 || compareMoney(result.data.total_out, '0') !== 0) {
      moved.push({ account, totalIn: result.data.total_in, totalOut: result.data.total_out })
    }
  })
  return { isPending, moved }
}
