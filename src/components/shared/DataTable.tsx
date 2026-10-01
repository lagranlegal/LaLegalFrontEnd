import type { ReactNode } from 'react'
import { type ColumnDef, type RowData, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { isPermissionError } from '@/lib/api/isPermissionError'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { RefreshingBar } from '@/components/shared/RefreshingBar'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** `right` alinea encabezado y celda a la derecha (dinero): con solo la celda, el título quedaba corrido. */
    align?: 'right'
  }
}

function DataTableSkeleton({ columnsCount, embedded }: { columnsCount: number; embedded?: boolean }) {
  return (
    <div className={cn('divide-y divide-border', !embedded && 'rounded-card border border-border bg-card')}>
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="flex gap-4 p-4">
          {Array.from({ length: columnsCount }).map((_, col) => (
            <div key={col} className="h-4 flex-1 animate-pulse rounded bg-border" />
          ))}
        </div>
      ))}
    </div>
  )
}

const ROW_FOCUS = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'

/**
 * Una fila que abre su detalle se abre también con teclado (F9-11): antes solo
 * con el mouse (sin `tabIndex`, sin rol). Tab llega a la fila y Enter o
 * Espacio la abren. Solo si el evento es de la fila misma: un botón o enlace
 * dentro de una celda maneja su propio Enter.
 */
function rowKeyboardProps<T>(onRowClick: ((row: T) => void) | undefined, row: T) {
  if (!onRowClick) return {}
  return {
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onRowClick(row)
      }
    },
  }
}

/**
 * LA tabla de la app (docs/DESIGN_SYSTEM.md §3): sobre TanStack Table
 * (headless — todo el markup/estilo es nuestro). Encabezado gris claro,
 * hover de fila, estados loading/vacío/error integrados, "Cargar más" para
 * paginación por cursor, colapsa a cards en mobile. El alineado de dinero a
 * la derecha lo decide el `cell` de cada columna (ver `Money`).
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading,
  isRefreshing,
  isError,
  error,
  onRetry,
  emptyTitle = 'Aún no tienes nada acá',
  emptyDescription,
  emptyAction,
  onRowClick,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  embedded = false,
}: {
  columns: ColumnDef<T>[]
  data: T[]
  getRowId: (row: T) => string
  isLoading?: boolean
  /** Ya hay datos en pantalla pero se está pidiendo otra página/filtro. */
  isRefreshing?: boolean
  isError?: boolean
  /** El error real, para distinguir "no tienes permiso" de "algo se rompió". */
  error?: unknown
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  onRowClick?: (row: T) => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
  /**
   * Dentro de otra tarjeta (el «Requieren acción» del Inicio, rediseño P2-c):
   * sin borde ni fondo propios, encabezado sin relleno con su divisor, y el
   * hover en `--bg-muted`. En el celular sigue colapsando a tarjetas. La
   * carga, el vacío y el error tampoco dibujan su propia caja (P3).
   */
  embedded?: boolean
}) {
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) return <DataTableSkeleton columnsCount={columns.length} embedded={embedded} />

  if (isError) {
    // Un 403 no es una falla: reintentar no va a cambiar nada, y "no se pudo
    // cargar" manda al usuario a buscar un problema que no existe. Se le dice
    // qué pasa y a quién pedírselo.
    const sinPermiso = isPermissionError(error)
    return (
      <div className={cn('enter-up flex flex-col items-center gap-3 text-center', embedded ? 'py-card' : 'rounded-card border border-border bg-card p-card')}>
        <p className="text-sm text-muted-foreground">
          {sinPermiso
            ? 'Tu rol no tiene permiso para ver esto. Pídele a un administrador que te lo habilite.'
            : 'No se pudo cargar la lista.'}
        </p>
        {onRetry && !sinPermiso && (
          <Button variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      // Dentro de otra tarjeta (`embedded`), el vacío y el error no dibujan
      // una segunda caja con borde dentro de la primera.
      <div className={cn('enter-up', !embedded && 'rounded-card border border-border bg-card')}>
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    )
  }

  return (
    <div className={cn('enter-up overflow-hidden', !embedded && 'rounded-card border border-border bg-card')}>
      {/* Los datos que se ven siguen siendo válidos, solo están por cambiar:
          una barra delgada arriba avisa sin vaciar la tabla ni hacerla saltar. */}
      <RefreshingBar active={!!isRefreshing} />
      <table className="hidden w-full text-sm md:table">
        <thead className={cn('text-left text-xs text-muted-foreground', embedded ? 'border-b border-border' : 'bg-background')}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    embedded ? 'px-3.5 py-2.5 font-semibold whitespace-nowrap' : 'px-4 py-2 font-medium',
                    header.column.columnDef.meta?.align === 'right' && 'text-right',
                  )}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={cn('transition-colors', embedded ? 'hover:bg-muted' : 'hover:bg-accent/50', onRowClick && 'cursor-pointer active:bg-accent', onRowClick && ROW_FOCUS)}
              onClick={() => onRowClick?.(row.original)}
              {...rowKeyboardProps(onRowClick, row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={cn(
                    'text-foreground',
                    embedded ? 'px-3.5 py-2.75' : 'px-4 py-3',
                    cell.column.columnDef.meta?.align === 'right' && 'text-right',
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: colapsa a cards (§3) */}
      <div className="divide-y divide-border md:hidden">
        {table.getRowModel().rows.map((row) => (
          <div
            key={row.id}
            className={cn('flex flex-col gap-1.5', embedded ? 'py-3' : 'p-4', onRowClick && 'cursor-pointer transition-colors active:bg-accent/60', onRowClick && ROW_FOCUS)}
            onClick={() => onRowClick?.(row.original)}
            {...rowKeyboardProps(onRowClick, row.original)}
          >
            {row.getVisibleCells().map((cell) => {
              const header = cell.column.columnDef.header
              return (
                <div key={cell.id} className="flex items-baseline justify-between gap-3 text-sm">
                  {typeof header === 'string' && <span className="shrink-0 text-muted-foreground">{header}</span>}
                  <span className="text-right text-foreground">{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div className="border-t border-border p-3 text-center">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </Button>
        </div>
      )}
    </div>
  )
}
