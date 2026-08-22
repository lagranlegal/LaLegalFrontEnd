import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import type { components } from '@/types/api'

export type Supplier = components['schemas']['SupplierOut']
export type SupplierCreateIn = components['schemas']['SupplierCreateIn']
export type SupplierUpdateIn = components['schemas']['SupplierUpdateIn']
export type CategoryCreateIn = components['schemas']['CategoryCreateIn']
export type CategoryUpdateIn = components['schemas']['CategoryUpdateIn']

// La LECTURA de categorías (`useCategories`) vive en `lib/catalogs/categories.ts`
// — más de una feature la consume (ver ese archivo). Acá solo el CRUD, que sí
// es exclusivo de esta feature.

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CategoryCreateIn) => unwrap(api.POST('/api/v1/catalogs/categories', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogs', 'categories'] }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ categoryId, body }: { categoryId: string; body: CategoryUpdateIn }) =>
      unwrap(api.PATCH('/api/v1/catalogs/categories/{category_id}', { params: { path: { category_id: categoryId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogs', 'categories'] }),
  })
}

// ---- Proveedores: paginados por cursor ----

export function useSuppliersList() {
  return useCursorInfiniteQuery(['catalogs', 'suppliers', 'list'] as const, (cursor) =>
    unwrap(api.GET('/api/v1/catalogs/suppliers', { params: { query: { cursor } } })),
  )
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SupplierCreateIn) => unwrap(api.POST('/api/v1/catalogs/suppliers', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogs', 'suppliers'] }),
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ supplierId, body }: { supplierId: string; body: SupplierUpdateIn }) =>
      unwrap(api.PATCH('/api/v1/catalogs/suppliers/{supplier_id}', { params: { path: { supplier_id: supplierId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogs', 'suppliers'] }),
  })
}

export type SupplierSummary = components['schemas']['SupplierSummaryOut']
export type SupplierPurchase = components['schemas']['SupplierPurchaseOut']

/**
 * Ficha del proveedor: qué se le compró y cuánto se le debe.
 *
 * El CLIENTE tiene su ficha con historial cruzado desde el paso 4; el
 * proveedor tenía un formulario de creación y nada más, así que "¿cuánto le
 * he comprado?" no tenía respuesta aunque el dato estuviera completo en la
 * base.
 */
export function useSupplierSummary(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['catalogs', 'suppliers', supplierId, 'summary'] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/catalogs/suppliers/{supplier_id}/summary', { params: { path: { supplier_id: supplierId! } } })),
    enabled: !!supplierId,
  })
}

export function useSupplierPurchases(supplierId: string | undefined) {
  return useCursorInfiniteQuery(
    ['catalogs', 'suppliers', supplierId, 'purchases'] as const,
    (cursor) =>
      unwrap(
        api.GET('/api/v1/catalogs/suppliers/{supplier_id}/purchases', {
          params: { path: { supplier_id: supplierId! }, query: { cursor } },
        }),
      ),
    { enabled: !!supplierId },
  )
}
