import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge, statusLabel } from '@/components/shared/StatusBadge'
import { Money } from '@/components/shared/Money'
import { Can } from '@/components/shared/Can'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { Button } from '@/components/ui/button'
import { formatDateTime, todayBogota } from '@/lib/dates'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { fetchAllSales, useSalesList, type Sale } from '@/features/sales/api'
import { fetchAllCustomers } from '@/features/customers/api'
import { SaleReceiptDialog } from '@/components/shared/SaleReceiptDialog'
import { exportRowsToExcel } from '@/lib/export/xlsx'

export function SalesListPage() {
  const navigate = useNavigate()
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useSalesList()
  const [viewingSale, setViewingSale] = useState<Sale | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const sales = data?.pages.flatMap((page) => page.items) ?? []

  // Esta pantalla no tiene filtros todavía (`useSalesList` no acepta
  // ninguno) — exporta el mismo universo completo que se ve al ir cargando
  // "Cargar más" hasta el final, de una sola vez.
  async function handleExport() {
    setIsExporting(true)
    try {
      const [allSales, customers] = await Promise.all([fetchAllSales(), fetchAllCustomers()])
      const customerById = new Map(customers.map((c) => [c.id, c]))
      const rows = allSales.map((sale) => ({
        Número: sale.number,
        Fecha: formatDateTime(sale.sold_at),
        Cliente: sale.customer_id ? (customerById.get(sale.customer_id)?.full_name ?? '') : '',
        'Medio de pago': PAYMENT_METHOD_LABELS[sale.payment_method as 'cash' | 'transfer' | 'other'] ?? sale.payment_method,
        Descuento: Number(sale.discount_amount),
        'Nota crédito redimida': sale.credit_note_redeemed_amount ? Number(sale.credit_note_redeemed_amount) : '',
        Total: Number(sale.total),
        Estado: statusLabel(sale.status),
        'Motivo de anulación': sale.void_reason ?? '',
      }))
      exportRowsToExcel(`ventas-${todayBogota()}.xlsx`, 'Ventas', rows)
    } finally {
      setIsExporting(false)
    }
  }

  const columns: ColumnDef<Sale>[] = [
    { accessorKey: 'number', header: 'Número', cell: (info) => <RecordNumber value={info.getValue<number>()} /> },
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={isExporting} onClick={handleExport}>
              <Download className="size-4" />
              {isExporting ? 'Exportando…' : 'Exportar a Excel'}
            </Button>
            <Can permission="sales.create">
              <Button className="rounded-pill" onClick={() => navigate({ to: '/ventas/nueva' })}>
                + Nueva venta
              </Button>
            </Can>
          </div>
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
