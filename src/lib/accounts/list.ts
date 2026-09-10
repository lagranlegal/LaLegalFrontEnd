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
 * El saldo lo calcula el backend, y desde la migración 00048 **los tres
 * tipos se calculan igual**: `opening_balance` de la cuenta más sus propios
 * movimientos (docs/ARCHITECTURE.md §12).
 *
 * Hasta entonces una cuenta `cash` era la excepción —su saldo salía de la
 * sesión de caja abierta—, y por eso este comentario decía que cambiaba al
 * abrir y cerrar el turno. Ya no: el efectivo del cajón existe con la caja
 * cerrada, y dos cajones distintos reportan saldos distintos (antes los dos
 * leían la misma sesión y daban el mismo número).
 *
 * Nunca se acumula nada en el cliente: el saldo siempre viene del servidor.
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
