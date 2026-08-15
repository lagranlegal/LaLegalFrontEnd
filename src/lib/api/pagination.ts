import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query'

/**
 * Todas las listas de la API paginan por cursor `{items, next_cursor}`
 * (docs/ARCHITECTURE.md §7) — no hay paginación por número de página, no
 * inventarla en una feature.
 */
export interface CursorPage<T> {
  items: T[]
  next_cursor?: string | null
}

/**
 * `features/<modulo>/api.ts` la usa así:
 *
 *   useCursorInfiniteQuery(['customers', 'list', filters], (cursor) =>
 *     unwrap(api.GET('/api/v1/customers', { params: { query: { ...filters, cursor } } })),
 *   )
 *
 * `<DataTable>` consume `data.pages` + `fetchNextPage`/`hasNextPage` para
 * "Cargar más" / scroll infinito.
 */
export function useCursorInfiniteQuery<T>(queryKey: QueryKey, fetchPage: (cursor: string | undefined) => Promise<CursorPage<T>>) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  })
}
