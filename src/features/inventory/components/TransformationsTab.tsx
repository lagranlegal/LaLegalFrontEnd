import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { Money } from '@/components/shared/Money'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { formatDate } from '@/lib/dates'
import { useTransformationsList, type TransformationSummary } from '@/features/inventory/api'
import { TransformationDetailDialog } from '@/features/inventory/components/TransformationDetailDialog'

/** Los nombres vienen concatenados por el backend y pueden ser muchos. En la
 *  fila se recortan; el detalle los tiene completos. */
function Resumen({ nombres, cantidad }: { nombres: string | null; cantidad: number }) {
  if (!nombres) return <span className="text-muted-foreground">—</span>
  return (
    <span className="block max-w-[22ch] truncate" title={nombres}>
      {nombres}
      {cantidad > 1 && <span className="ml-1 text-xs text-muted-foreground">({cantidad})</span>}
    </span>
  )
}

/**
 * Historial de transformaciones.
 *
 * Fundir es la única operación de la app donde DESAPARECE MERCANCÍA
 * IDENTIFICADA y aparece otra distinta. Una venta deja comprobante y un remate
 * deja contrato; fundir no dejaba rastro consultable, así que "¿de dónde
 * salieron estos gramos de oro?" no tenía respuesta dentro de la aplicación
 * aunque el dato estuviera completo en la base.
 *
 * Importa por tres razones que no son técnicas:
 *   · legal      — ese oro puede venir de la prenda de un cliente
 *   · contable   — el costo de lo producido salió de repartir el de lo
 *                  consumido, y sin auditarlo es un número sin respaldo
 *   · operativa  — la merma (entraron 34 g, salieron 31,2) es información
 *
 * No lleva `<Can>`: la pestaña vive dentro de Inventario, que ya exige
 * `inventory.view`, y leer el historial no necesita `inventory.transform`
 * — quien puede ver el inventario puede ver de dónde salió.
 */
export function TransformationsTab() {
  const { data, isPending, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useTransformationsList()
  const [detalle, setDetalle] = useState<string | null>(null)

  const filas = data?.pages.flatMap((page) => page.items) ?? []

  const columns: ColumnDef<TransformationSummary>[] = [
    { accessorKey: 'number', header: 'Número', cell: (info) => <RecordNumber value={info.getValue<number>()} /> },
    {
      accessorKey: 'transform_date',
      header: 'Fecha',
      cell: (info) => formatDate(info.getValue<string>()),
    },
    { accessorKey: 'reason', header: 'Motivo' },
    {
      id: 'entro',
      header: 'Entró',
      cell: ({ row }) => <Resumen nombres={row.original.input_names} cantidad={row.original.input_count} />,
    },
    {
      id: 'salio',
      header: 'Salió',
      cell: ({ row }) => <Resumen nombres={row.original.output_names} cantidad={row.original.output_count} />,
    },
    {
      accessorKey: 'total_cost',
      header: 'Costo',
      cell: (info) => <Money value={info.getValue<string>()} className="tnum" />,
    },
    {
      accessorKey: 'created_by_name',
      header: 'Registró',
      cell: (info) => info.getValue<string | null>() ?? '—',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        data={filas}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        emptyTitle="Aún no has transformado nada"
        emptyDescription="Fundir, despiezar o armar. Lo que hagas queda registrado acá con lo que entró y lo que salió."
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        onRowClick={(row) => setDetalle(row.id)}
      />

      {detalle && (
        <TransformationDetailDialog
          key={detalle}
          open
          onOpenChange={(abierto) => !abierto && setDetalle(null)}
          transformationId={detalle}
        />
      )}
    </div>
  )
}
