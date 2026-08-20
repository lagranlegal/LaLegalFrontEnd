import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import { useMoneyMutation } from '@/lib/api/useMoneyMutation'
import type { components } from '@/types/api'

export type Entry = components['schemas']['EntryOut']
export type EntryCreateIn = components['schemas']['EntryCreateIn']
export type EntryLineIn = components['schemas']['EntryLineIn']
export type Exit = components['schemas']['ExitOut']
export type ExitCreateIn = components['schemas']['ExitCreateIn']
export type ItemUpdateIn = components['schemas']['ItemUpdateIn']
export type ItemPublishIn = components['schemas']['ItemPublishIn']

// ---- Ingresos ----

export function useEntriesList() {
  return useCursorInfiniteQuery(['inventory', 'entries'] as const, (cursor) => unwrap(api.GET('/api/v1/inventory/entries', { params: { query: { cursor } } })))
}

export function useEntry(entryId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', 'entries', entryId] as const,
    queryFn: () => unwrap(api.GET('/api/v1/inventory/entries/{entry_id}', { params: { path: { entry_id: entryId! } } })),
    enabled: !!entryId,
  })
}

/**
 * SÍ mueve dinero (corregido): un ingreso de compra entrega plata al
 * proveedor y desde la migración 00014 del backend genera su movimiento de
 * caja (`concept: 'purchase'`, `direction: 'out'`). Antes se asumía lo
 * contrario — "no mueve dinero: crea artículos en borrador" — y por eso el
 * cierre de caja descuadraba por el monto exacto de la mercancía comprada.
 *
 * Va por `useMoneyMutation` (CLAUDE.md regla 8): un reintento de red reusa la
 * misma key y el backend devuelve el MISMO ingreso en vez de duplicar stock y
 * volver a sacar la plata de la caja.
 */
export function useCreateEntry() {
  return useMoneyMutation<Entry, EntryCreateIn>({
    mutationFn: (body, idempotencyKey) =>
      unwrap(api.POST('/api/v1/inventory/entries', { body, headers: { 'Idempotency-Key': idempotencyKey } })),
    // La caja cambia: el egreso de la compra entra al desglose del cierre.
    invalidateKeys: [['inventory'], ['dashboard'], ['cashbox']],
  })
}

// ---- Egresos ----

export function useExitsList() {
  return useCursorInfiniteQuery(['inventory', 'exits'] as const, (cursor) => unwrap(api.GET('/api/v1/inventory/exits', { params: { query: { cursor } } })))
}

export function useCreateExit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ExitCreateIn) => unwrap(api.POST('/api/v1/inventory/exits', { body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// ---- Artículos ----

export interface ItemFilters {
  status?: string
  /** Código (prefijo, sin distinguir mayúsculas) o nombre (full-text español). */
  q?: string
  cat1_id?: string
  cat2_id?: string
  cat3_id?: string
  supplier_id?: string
  origin?: string
}

export function useItemsList(filters: ItemFilters = {}) {
  // Los filtros van en la queryKey: cada combinación es su propia lista
  // paginada en cache, y cambiar un filtro arranca la paginación desde cero
  // en vez de mezclar páginas de dos búsquedas distintas.
  const query = {
    status: filters.status || undefined,
    q: filters.q?.trim() || undefined,
    cat1_id: filters.cat1_id || undefined,
    cat2_id: filters.cat2_id || undefined,
    cat3_id: filters.cat3_id || undefined,
    supplier_id: filters.supplier_id || undefined,
    origin: filters.origin || undefined,
  }
  return useCursorInfiniteQuery(['inventory', 'items', 'list', query] as const, (cursor) =>
    unwrap(api.GET('/api/v1/inventory/items', { params: { query: { ...query, cursor } } })),
  )
}

export function useUpdateItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: ItemUpdateIn }) =>
      unwrap(api.PATCH('/api/v1/inventory/items/{item_id}', { params: { path: { item_id: itemId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

/** Publicar exige precio + ≥1 foto (CLAUDE.md paso 7) — la foto queda bloqueada hasta que exista Storage (docs/STORAGE_PENDIENTE.md); el gate de "¿tiene fotos?" vive en el componente, no acá. */
export function usePublishItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: ItemPublishIn }) =>
      unwrap(api.POST('/api/v1/inventory/items/{item_id}/publish', { params: { path: { item_id: itemId } }, body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export type EntryPayIn = components['schemas']['EntryPayIn']

/**
 * Salda una compra que quedó pendiente de pago.
 *
 * Es mutación de dinero: genera el egreso de caja. El egreso cae en la sesión
 * abierta de HOY, no en la fecha de la compra — una sesión cerrada es
 * inmutable, así que no hay forma (ni debería haberla) de afectar la caja de
 * un día ya cuadrado y firmado.
 */
export function usePayEntry() {
  return useMoneyMutation<Entry, { entryId: string; body: EntryPayIn }>({
    mutationFn: ({ entryId, body }, idempotencyKey) =>
      unwrap(
        api.POST('/api/v1/inventory/entries/{entry_id}/pay', {
          params: { path: { entry_id: entryId } },
          body,
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      ),
    invalidateKeys: [['inventory'], ['dashboard'], ['cashbox']],
  })
}
