import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
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

/** Sin `Idempotency-Key` — el endpoint no lo acepta (igual que cashbox, ver docs/IMPLEMENTATION.md paso 6). No mueve dinero: crea artículos en borrador. */
export function useCreateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: EntryCreateIn) => unwrap(api.POST('/api/v1/inventory/entries', { body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
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

export function useItemsList(status: string) {
  return useCursorInfiniteQuery(['inventory', 'items', 'list', { status }] as const, (cursor) =>
    unwrap(api.GET('/api/v1/inventory/items', { params: { query: { status: status || undefined, cursor } } })),
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
