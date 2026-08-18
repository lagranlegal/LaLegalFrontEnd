import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LegacyCodeBadge } from '@/components/shared/LegacyCodeBadge'
import { PhotoThumbnail } from '@/components/shared/PhotoThumbnail'
import { Money } from '@/components/shared/Money'
import { DataTable } from '@/components/shared/DataTable'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/dates'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { confirm } from '@/components/shared/confirmStore'
import { useCategories } from '@/lib/catalogs/categories'
import { useContract, usePaymentsList, useAuctionContract, type Payment } from '@/features/contracts/api'
import { effectiveContractStatus, isReadyForAuction } from '@/features/contracts/contractStatus'
import { useCustomer } from '@/lib/customers/search'
import { PaymentOptionsPanel } from '@/features/contracts/components/PaymentOptionsPanel'
import { ContractEditDialog } from '@/features/contracts/components/ContractEditDialog'
import { ContractPrintView } from '@/features/contracts/components/ContractPrintView'

const PAYABLE_STATUSES = new Set(['active', 'in_arrears', 'in_extension'])

const paymentColumns: ColumnDef<Payment>[] = [
  { accessorKey: 'receipt_number', header: 'Recibo', cell: (info) => `#${info.getValue<number>()}` },
  { accessorKey: 'paid_at', header: 'Fecha', cell: (info) => formatDateTime(info.getValue<string>()) },
  { accessorKey: 'months_covered', header: 'Meses' },
  { accessorKey: 'interest_amount', header: 'Interés', cell: (info) => <Money value={info.getValue<string>()} /> },
  { accessorKey: 'capital_amount', header: 'Capital', cell: (info) => <Money value={info.getValue<string>()} /> },
  {
    accessorKey: 'payment_method',
    header: 'Medio',
    cell: (info) => PAYMENT_METHOD_LABELS[info.getValue<'cash' | 'transfer' | 'other'>()] ?? info.getValue<string>(),
  },
  { accessorKey: 'total', header: 'Total', cell: (info) => <Money value={info.getValue<string>()} /> },
]

function ContractDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-64 animate-pulse rounded-input bg-border" />
      <div className="h-40 animate-pulse rounded-card bg-border" />
      <div className="h-40 animate-pulse rounded-card bg-border" />
    </div>
  )
}

function categoryName(categories: { id: string; name: string }[] | undefined, categoryId: string): string {
  return categories?.find((c) => c.id === categoryId)?.name ?? '—'
}

export function ContractDetailPage() {
  // `from` usa el id de ruta ("/app-layout/…"), no el fullPath de la URL —
  // mismo gotcha que useSearch en appLayoutRoute (pathless via `id`, ver
  // docs/IMPLEMENTATION.md Paso 2). `Link`/`navigate({to:...})` sí usan el
  // fullPath sin prefijo, por eso en el resto del feature se ve "/contratos/…".
  const { contractId } = useParams({ from: '/app-layout/contratos/$contractId' })
  const { data: contract, isPending, isError, refetch } = useContract(contractId)
  const { data: customer } = useCustomer(contract?.customer_id ?? '')
  const { data: categories } = useCategories()
  const { data: paymentsData, isPending: paymentsPending, isError: paymentsError, refetch: refetchPayments, hasNextPage, isFetchingNextPage, fetchNextPage } = usePaymentsList(contractId)
  const auctionContract = useAuctionContract()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editDialogNonce, setEditDialogNonce] = useState(0)

  if (isPending) return <ContractDetailSkeleton />

  if (isError || !contract) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-card text-center">
        <p className="text-sm text-muted-foreground">No se pudo cargar el contrato.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const payments = paymentsData?.pages.flatMap((page) => page.items) ?? []

  async function handleAuction() {
    const result = await confirm({
      title: 'Rematar contrato',
      description: 'El cliente pierde las prendas. Se crearán artículos de inventario en borrador para publicarlos a la venta.',
      tone: 'danger',
      confirmLabel: 'Rematar contrato',
    })
    if (!result.confirmed) return
    try {
      await auctionContract.mutateAsync(contractId)
      toast.success('Contrato rematado — revisa los borradores en Inventario')
    } catch {
      toast.error('No se pudo rematar el contrato. Intenta de nuevo.')
    }
  }

  return (
    <>
    <div className="flex flex-col gap-6 print:hidden">
      <Link to="/contratos" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Contratos
      </Link>

      <PageHeader
        title={`Contrato #${contract.number}`}
        description={customer ? `${customer.full_name} · ${customer.doc_type.toUpperCase()} ${customer.doc_number}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            {contract.legacy_code && <LegacyCodeBadge code={contract.legacy_code} />}
            <StatusBadge status={effectiveContractStatus(contract)} />
            <Button variant="outline" onClick={() => window.print()}>
              Imprimir
            </Button>
            <Can permission="contracts.edit">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogNonce((n) => n + 1)
                  setEditDialogOpen(true)
                }}
              >
                Editar
              </Button>
            </Can>
            {isReadyForAuction(contract) && (
              <Can permission="contracts.auction">
                <Button className="rounded-pill bg-danger hover:bg-danger/90" disabled={auctionContract.isPending} onClick={handleAuction}>
                  {auctionContract.isPending ? 'Rematando…' : 'Rematar'}
                </Button>
              </Can>
            )}
          </div>
        }
      />

      {contract.ltv_warning && (
        <div className="rounded-input bg-warning-soft px-4 py-2 text-sm text-warning">Este contrato supera el LTV máximo permitido para su categoría.</div>
      )}

      <div className="grid grid-cols-1 gap-4 rounded-card border border-border bg-card p-card shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Capital prestado</p>
          <p className="tnum text-lg font-semibold text-foreground">
            <Money value={contract.principal} />
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Saldo de capital</p>
          <p className="tnum text-lg font-semibold text-foreground">
            <Money value={contract.capital_balance} />
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tasa de interés</p>
          <p className="tnum text-lg font-semibold text-foreground">{contract.interest_rate_pct}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avalúo</p>
          <p className="tnum text-lg font-semibold text-foreground">{contract.appraisal_value ? <Money value={contract.appraisal_value} /> : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Inicio</p>
          <p className="text-sm text-foreground">{formatDate(contract.start_date)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vencimiento</p>
          <p className="text-sm text-foreground">{formatDate(contract.due_date)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Interés pagado hasta</p>
          <p className="text-sm text-foreground">{formatDate(contract.interest_paid_until)}</p>
        </div>
        {contract.extension_ends_at && (
          <div>
            <p className="text-xs text-muted-foreground">Prórroga hasta</p>
            <p className="text-sm text-foreground">{formatDate(contract.extension_ends_at)}</p>
          </div>
        )}
      </div>

      {contract.notes && (
        <div className="rounded-card border border-border bg-card p-card shadow-card">
          <p className="text-xs text-muted-foreground">Notas</p>
          <p className="mt-1 text-sm text-foreground">{contract.notes}</p>
        </div>
      )}

      {contract.signed_photo_url && (
        <div className="rounded-card border border-border bg-card p-card shadow-card">
          <p className="text-xs text-muted-foreground">Documento firmado</p>
          <PhotoThumbnail path={contract.signed_photo_url} className="mt-2 size-24" />
        </div>
      )}

      <div className="rounded-card border border-border bg-card p-card shadow-card">
        <h2 className="text-sm font-medium text-foreground">Prendas</h2>
        <div className="mt-3 flex flex-col gap-2">
          {contract.items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-border p-3 text-sm">
              <div className="flex items-center gap-3">
                {item.photos.length > 0 && <PhotoThumbnail path={item.photos[0] as string} className="size-12 shrink-0" />}
                <div>
                  <p className="font-medium text-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryName(categories, item.category_id)}
                    {item.weight_grams && ` · ${item.weight_grams} g`}
                    {item.serial_imei && ` · ${item.serial_imei}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.item_appraisal && <Money value={item.item_appraisal} className="text-sm" />}
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {PAYABLE_STATUSES.has(contract.status) && (
        <div className="rounded-card border border-border bg-card p-card shadow-card">
          <h2 className="text-sm font-medium text-foreground">Registrar abono</h2>
          <div className="mt-3">
            <PaymentOptionsPanel contractId={contractId} />
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Historial de abonos</h2>
        <DataTable
          columns={paymentColumns}
          data={payments}
          getRowId={(row) => row.id}
          isLoading={paymentsPending}
          isError={paymentsError}
          onRetry={() => refetchPayments()}
          emptyTitle="Aún no hay abonos registrados"
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      </div>

      <ContractEditDialog key={editDialogNonce} open={editDialogOpen} onOpenChange={setEditDialogOpen} contract={contract} />
    </div>

    <ContractPrintView contract={contract} customer={customer} categories={categories} />
    </>
  )
}
