import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type Account = components['schemas']['AccountOut']

/**
 * Listado de cuentas con su saldo.
 *
 * Vive en `lib/` y no en `features/accounts/` porque lo consume
 * `AccountPicker`, que aparece en TODOS los puntos de cobro (ventas, abonos,
 * gastos, compras) — features que no pueden importar de otra feature
 * (CLAUDE.md, aislamiento).
 *
 * El saldo lo calcula el backend y se calcula distinto según el tipo
 * (docs/ARCHITECTURE.md §12): una cuenta `cash` reporta lo que debería haber
 * en el cajón AHORA (base de la sesión abierta + movimientos de esa sesión),
 * no un acumulado histórico. Por eso su saldo cambia al abrir y cerrar caja
 * — nunca se acumula nada en el cliente.
 */
export function useAccounts(opts?: { includeInactive?: boolean }) {
  const includeInactive = opts?.includeInactive ?? false
  return useQuery({
    queryKey: ['accounts', 'list', { includeInactive }] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/accounts', {
          params: { query: { include_inactive: includeInactive } },
        }),
      ),
  })
}
