import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Money } from '@/components/shared/Money'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/dates'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { useSalesList, type Sale } from '@/features/sales/api'
import { SaleReceiptDialog } from '@/components/shared/SaleReceiptDialog'

export function SalesListPage() {
  const navigate = useNavigate()
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useSalesList()
  const [viewingSale, setViewingSale] = useState<Sale | null>(null)

  const sales = data?.pages.flatMap((page) => page.items) ?? []

  const columns: ColumnDef<Sale>[] = [
    { accessorKey: 'number', header: 'Número', cell: (info) => `#${info.getValue<number>()}` },
    { accessorKey: 'sold_at', header: 'Fecha', cell: (info) => formatDateTime(info.getValue<string>()) },
    { accessorKey: 'payment_method', header: 'Medio', cell: (info) => PAYMENT_METHOD_LABELS[info.getValue<'cash' | 'transfer' | 'other'>()] ?? info.getValue<string>() },
    { accessorKey: 'total', header: 'Total', cell: (info) => <Money value={info.getValue<string>()} /> },
    { accessorKey: 'status', header: 'Estado', cell: (info) => <StatusBadge status={info.getValue<string>()} /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ventas"
        actions={
          <Can permission="sales.create">
            <Button className="rounded-pill" onClick={() => navigate({ to: '/ventas/nueva' })}>
              + Nueva venta
            </Button>
          </Can>
        }
      />

      <DataTable
        columns={columns}
        data={sales}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="Aún no tienes ventas"
        emptyDescription="Registra la primera desde el punto de venta."
        onRowClick={(row) => setViewingSale(row)}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />

      {viewingSale && <SaleReceiptDialog open={!!viewingSale} onOpenChange={(open) => !open && setViewingSale(null)} sale={viewingSale} />}
    </div>
  )
}
