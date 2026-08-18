import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type User = components['schemas']['UserOut']

/**
 * Lista plana de usuarios para selects de atribución (filtro de auditoría
 * por `user_id`) — mismo criterio que `lib/catalogs/suppliers.ts`: un
 * `<select>` no necesita "cargar más", a diferencia de la tabla paginada de
 * `IdentityPage` (`useUsersList` en `features/identity/api.ts`).
 */
export function useUsersFlat() {
  return useQuery({
    queryKey: ['identity', 'users', 'flat'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/identity/users', { params: { query: { limit: 100 } } })),
    select: (page) => page.items,
  })
}
