import { useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { ChevronLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PhotoThumbnail } from '@/components/shared/PhotoThumbnail'
import { DataTable } from '@/components/shared/DataTable'
import { Money } from '@/components/shared/Money'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/dates'
import { useCustomer } from '@/lib/customers/search'
import { useCustomerContracts, useCustomerSales, type ContractSummary, type SaleSummary } from '@/features/customers/history'
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog'
import { SaleReceiptDialog } from '@/components/shared/SaleReceiptDialog'

const DOC_TYPE_LABELS: Record<string, string> = { cc: 'Cédula de ciudadanía', ce: 'Cédula de extranjería', passport: 'Pasaporte', nit: 'NIT' }

const contractColumns: ColumnDef<ContractSummary>[] = [
  { accessorKey: 'number', header: 'Número', cell: (info) => `#${info.getValue<number>()}` },
  { accessorKey: 'principal', header: 'Capital', cell: (info) => <Money value={info.getValue<string>()} /> },
  { accessorKey: 'capital_balance', header: 'Saldo', cell: (info) => <Money value={info.getValue<string>()} /> },
  { accessorKey: 'status', header: 'Estado', cell: (info) => <StatusBadge status={info.getValue<string>()} /> },
]

const saleColumns: ColumnDef<SaleSummary>[] = [
  { accessorKey: 'number', header: 'Número', cell: (info) => `#${info.getValue<number>()}` },
  { accessorKey: 'sold_at', header: 'Fecha', cell: (info) => formatDateTime(info.getValue<string>()) },
  { accessorKey: 'total', header: 'Total', cell: (info) => <Money value={info.getValue<string>()} /> },
  { accessorKey: 'status', header: 'Estado', cell: (info) => <StatusBadge status={info.getValue<string>()} /> },
]

function CustomerDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-64 animate-pulse rounded-input bg-border" />
      <div className="h-32 animate-pulse rounded-card bg-border" />
      <div className="h-40 animate-pulse rounded-card bg-border" />
    </div>
  )
}

export function CustomerDetailPage() {
  const { customerId } = useParams({ from: '/app-layout/clientes/$customerId' })
  const navigate = useNavigate()
  const { data: customer, isPending, isError, refetch } = useCustomer(customerId)
  const { data: contracts, isPending: contractsPending, isError: contractsError, refetch: refetchContracts } = useCustomerContracts(customerId)
  const {
    data: salesData,
    isPending: salesPending,
    isError: salesError,
    refetch: refetchSales,
    hasNextPage: salesHasNextPage,
    isFetchingNextPage: salesFetchingNextPage,
    fetchNextPage: fetchNextSalesPage,
  } = useCustomerSales(customerId)
  const sales = salesData?.pages.flatMap((page) => page.items) ?? []
  const [editOpen, setEditOpen] = useState(false)
  const [editNonce, setEditNonce] = useState(0)
  const [viewingSale, setViewingSale] = useState<SaleSummary | null>(null)

  if (isPending) return <CustomerDetailSkeleton />

  if (isError || !customer) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-card text-center">
        <p className="text-sm text-muted-foreground">No se pudo cargar el cliente.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/clientes" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Clientes
      </Link>

      <PageHeader
        title={customer.full_name}
        description={`${DOC_TYPE_LABELS[customer.doc_type] ?? customer.doc_type.toUpperCase()} ${customer.doc_number}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={customer.status} />
            <Can permission="customers.create">
              <Button
                variant="outline"
                onClick={() => {
                  setEditNonce((n) => n + 1)
                  setEditOpen(true)
                }}
              >
                Editar
              </Button>
            </Can>
          </div>
        }
      />

      <div className="rounded-card border border-border bg-card p-card shadow-card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Teléfono</p>
            <p className="text-sm text-foreground">{customer.phone}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Correo</p>
            <p className="text-sm text-foreground">{customer.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dirección</p>
            <p className="text-sm text-foreground">{customer.address ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lugar de expedición</p>
            <p className="text-sm text-foreground">{customer.doc_issue_place ?? '—'}</p>
          </div>
        </div>
        {customer.notes && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="text-sm text-foreground">{customer.notes}</p>
          </div>
        )}
        {customer.doc_photo_url && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">Foto del documento</p>
            <PhotoThumbnail path={customer.doc_photo_url} className="mt-1 size-24" />
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Contratos</h2>
        <DataTable
          columns={contractColumns}
          data={contracts ?? []}
          getRowId={(row) => row.id}
          isLoading={contractsPending}
          isError={contractsError}
          onRetry={() => refetchContracts()}
          emptyTitle="Sin contratos"
          onRowClick={(row) => navigate({ to: '/contratos/$contractId', params: { contractId: row.id } })}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Compras</h2>
        <DataTable
          columns={saleColumns}
          data={sales}
          getRowId={(row) => row.id}
          isLoading={salesPending}
          isError={salesError}
          onRetry={() => refetchSales()}
          emptyTitle="Sin compras"
          onRowClick={(row) => setViewingSale(row)}
          hasNextPage={salesHasNextPage}
          isFetchingNextPage={salesFetchingNextPage}
          onLoadMore={() => fetchNextSalesPage()}
        />
      </div>

      <CustomerFormDialog key={editNonce} open={editOpen} onOpenChange={setEditOpen} customer={customer} />
      {viewingSale && <SaleReceiptDialog open={!!viewingSale} onOpenChange={(open) => !open && setViewingSale(null)} sale={viewingSale} />}
    </div>
  )
}
