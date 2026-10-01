import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query'

/**
 * Todas las listas de la API paginan por cursor `{items, next_cursor}`
 * (docs/ARQUITECTURA.md §7) — no hay paginación por número de página, no
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
export function useCursorInfiniteQuery<T>(
  queryKey: QueryKey,
  fetchPage: (cursor: string | undefined) => Promise<CursorPage<T>>,
  // `enabled` para listados que dependen de un id que puede no existir todavía
  // (ej. el historial de una empresa antes de abrir su diálogo) — sin esto
  // habría que llamar el hook con un id falso o duplicar useInfiniteQuery.
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: options?.enabled,
  })
}

/**
 * `fetchAllPages` llegó a su tope y el backend todavía tenía más páginas
 * (issue #11). Antes devolvía lo que llevaba y un reporte salía incompleto
 * sin que nadie lo supiera: un total parcial presentado como completo. Ahora
 * es un error con nombre, que la pantalla dice («acorta el rango») en vez de
 * pintar una cifra a medias.
 */
export class PageLimitError extends Error {
  readonly code = 'PAGE_LIMIT_REACHED'
  /** Cuántos registros alcanzaron a llegar antes del tope. */
  readonly fetched: number
  readonly maxPages: number
  constructor(fetched: number, maxPages: number) {
    super(
      `Hay más de ${new Intl.NumberFormat('es-CO').format(fetched)} registros y no se pueden traer todos de una vez. ` +
        'Acorta el rango de fechas o filtra la lista para ver el resultado completo.',
    )
    this.name = 'PageLimitError'
    this.fetched = fetched
    this.maxPages = maxPages
  }
}

export function isPageLimitError(error: unknown): error is PageLimitError {
  return error instanceof PageLimitError
}

/**
 * Trae TODAS las páginas de un listado por cursor de una sola vez, como
 * array plano — para agregación (Reportes: cierres de un rango, ventas y
 * artículos de todo el histórico) y exportes, no para scroll infinito en una
 * tabla (eso es `useCursorInfiniteQuery`). `maxPages` es un tope defensivo —
 * sin uno, un catálogo que crece sin límite (ventas históricas) podría
 * disparar un loop de cientos de requests silenciosamente.
 *
 * **Nunca corta en silencio**: si al llegar al tope todavía hay
 * `next_cursor`, lanza `PageLimitError` (issue #11). Quien la llama decide
 * cómo decirlo; lo que no puede es mostrar el resultado parcial como total.
 */
export async function fetchAllPages<T>(fetchPage: (cursor: string | undefined) => Promise<CursorPage<T>>, maxPages = 50): Promise<T[]> {
  const items: T[] = []
  let cursor: string | undefined
  let pageCount = 0
  do {
    if (pageCount >= maxPages) throw new PageLimitError(items.length, maxPages)
    const page = await fetchPage(cursor)
    items.push(...page.items)
    cursor = page.next_cursor ?? undefined
    pageCount += 1
  } while (cursor)
  return items
}
