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

/**
 * Trae TODAS las páginas de un listado por cursor de una sola vez, como
 * array plano — para agregación (Reportes: cierres de un rango, ventas y
 * artículos de todo el histórico), no para scroll infinito en una tabla
 * (eso es `useCursorInfiniteQuery`). `maxPages` es un tope defensivo — sin
 * uno, un catálogo que crece sin límite (ventas históricas) podría disparar
 * un loop de cientos de requests silenciosamente.
 */
export async function fetchAllPages<T>(fetchPage: (cursor: string | undefined) => Promise<CursorPage<T>>, maxPages = 50): Promise<T[]> {
  const items: T[] = []
  let cursor: string | undefined
  let pageCount = 0
  do {
    const page = await fetchPage(cursor)
    items.push(...page.items)
    cursor = page.next_cursor ?? undefined
    pageCount += 1
  } while (cursor && pageCount < maxPages)
  return items
}
