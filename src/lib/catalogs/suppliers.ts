import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type Supplier = components['schemas']['SupplierOut']

/**
 * Lista plana de proveedores para selects de atribución (ingresos de
 * inventario) — mismo criterio que `lib/catalogs/categories.ts`: más de una
 * feature la necesita como referencia (`catalogs` la gestiona, `inventory`
 * la usa). No pagina — un `<select>` de proveedores no necesita "cargar
 * más", a diferencia de la tabla de `CatalogsPage`, que sí usa el cursor
 * completo vía `features/catalogs/api.ts`.
 */
export function useSuppliers() {
  return useQuery({
    queryKey: ['catalogs', 'suppliers', 'flat'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/catalogs/suppliers', { params: { query: { limit: 100 } } })),
    select: (page) => page.items,
  })
}
