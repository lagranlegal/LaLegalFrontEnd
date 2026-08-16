import { queryOptions, useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type Category = components['schemas']['CategoryOut']

/**
 * Lectura de categorías en `lib/` (no en `features/catalogs/`) porque más de
 * una feature la necesita como dato de referencia (CLAUDE.md regla 3: lo
 * compartido entre features vive en `lib/`, nunca una feature importa
 * internals de otra) — `catalogs` la gestiona (CRUD), `contracts` la usa
 * para clasificar prendas, `inventory` la usará igual (paso 7).
 */
export function categoriesQueryOptions() {
  return queryOptions({
    queryKey: ['catalogs', 'categories'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/catalogs/categories')),
  })
}

export function useCategories() {
  return useQuery(categoriesQueryOptions())
}
