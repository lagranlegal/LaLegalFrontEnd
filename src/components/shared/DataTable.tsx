import type { ReactNode } from 'react'
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { RefreshingBar } from '@/components/shared/RefreshingBar'

function DataTableSkeleton({ columnsCount }: { columnsCount: number }) {
  return (
    <div className="divide-y divide-border rounded-card border border-border bg-card shadow-card">
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
  onRetry,
  emptyTitle = 'Aún no tienes nada acá',
  emptyDescription,
  emptyAction,
  onRowClick,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  columns: ColumnDef<T>[]
  data: T[]
  getRowId: (row: T) => string
  isLoading?: boolean
  /** Ya hay datos en pantalla pero se está pidiendo otra página/filtro. */
  isRefreshing?: boolean
  isError?: boolean
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  onRowClick?: (row: T) => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
}) {
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) return <DataTableSkeleton columnsCount={columns.length} />

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-card text-center">
        <p className="text-sm text-muted-foreground">No se pudo cargar la lista.</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-card border border-border bg-card shadow-card">
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      {/* Los datos que se ven siguen siendo válidos, solo están por cambiar:
          una barra delgada arriba avisa sin vaciar la tabla ni hacerla saltar. */}
      <RefreshingBar active={!!isRefreshing} />
      <table className="hidden w-full text-sm md:table">
        <thead className="bg-background text-left text-xs text-muted-foreground">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-2 font-medium">
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
              className={cn('transition-colors hover:bg-accent/50', onRowClick && 'cursor-pointer')}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-foreground">
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
            className={cn('flex flex-col gap-1.5 p-4', onRowClick && 'cursor-pointer')}
            onClick={() => onRowClick?.(row.original)}
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
