import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useNavigate, useParams } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { BackLink } from '@/components/shared/BackLink'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PhotoThumbnail } from '@/components/shared/PhotoThumbnail'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { DataTable } from '@/components/shared/DataTable'
import { Money } from '@/components/shared/Money'
import { SummaryCard, SummaryField } from '@/components/shared/SummaryCard'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { usePermission } from '@/lib/permissions/usePermission'
import { effectiveContractStatus } from '@/lib/contracts/status'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/dates'
import { useCustomer } from '@/lib/customers/search'
import { useCustomerContracts, useCustomerSales, type ContractSummary, type SaleSummary } from '@/features/customers/history'
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog'
import { emailNoticeStatus } from '@/features/customers/emailBasis'
import { SaleReceiptDialog } from '@/components/shared/SaleReceiptDialog'
import { useCustomerCreditNotes, type CreditNote } from '@/lib/sales/creditNotes'
import { sumMoney } from '@/lib/money'

const DOC_TYPE_LABELS: Record<string, string> = { cc: 'Cédula de ciudadanía', ce: 'Cédula de extranjería', passport: 'Pasaporte', nit: 'NIT' }

const money = (value: string) => <Money value={value} className="whitespace-nowrap" />

/**
 * Los contratos del cliente con su estado EFECTIVO (una prórroga vencida dice
 * «Listo para remate», igual que en la lista de contratos) y el dinero a la
 * derecha en cifras tabulares (rediseño P3).
 */
const contractColumns: ColumnDef<ContractSummary>[] = [
  { accessorKey: 'number', header: 'Número', cell: (info) => <RecordNumber value={info.getValue<number>()} /> },
  { accessorKey: 'principal', header: 'Capital', meta: { align: 'right' }, cell: (info) => money(info.getValue<string>()) },
  { accessorKey: 'capital_balance', header: 'Saldo', meta: { align: 'right' }, cell: (info) => money(info.getValue<string>()) },
  {
    accessorKey: 'due_date',
    header: 'Vencimiento',
    cell: (info) => <span className="tnum whitespace-nowrap">{formatDate(info.getValue<string>())}</span>,
  },
  { accessorKey: 'status', header: 'Estado', cell: (info) => <StatusBadge status={effectiveContractStatus(info.row.original)} /> },
]

const saleColumns: ColumnDef<SaleSummary>[] = [
  { accessorKey: 'number', header: 'Número', cell: (info) => <RecordNumber value={info.getValue<number>()} /> },
  { accessorKey: 'sold_at', header: 'Fecha', cell: (info) => <span className="tnum">{formatDateTime(info.getValue<string>())}</span> },
  { accessorKey: 'total', header: 'Total', meta: { align: 'right' }, cell: (info) => money(info.getValue<string>()) },
  { accessorKey: 'status', header: 'Estado', cell: (info) => <StatusBadge status={info.getValue<string>()} /> },
]

const creditNoteColumns: ColumnDef<CreditNote>[] = [
  { accessorKey: 'number', header: 'Número', cell: (info) => <RecordNumber value={info.getValue<number>()} /> },
  { accessorKey: 'created_at', header: 'Emitida', cell: (info) => <span className="tnum">{formatDateTime(info.getValue<string>())}</span> },
  { accessorKey: 'amount', header: 'Monto', meta: { align: 'right' }, cell: (info) => money(info.getValue<string>()) },
  { accessorKey: 'balance', header: 'Saldo', meta: { align: 'right' }, cell: (info) => money(info.getValue<string>()) },
]

/** Contratos abiertos: los que el cliente todavía debe (para el conteo del encabezado de la sección). */
const OPEN_STATUSES = new Set(['active', 'in_arrears', 'in_extension'])

/**
 * Las acciones de la ficha detrás de «Más» (rediseño P3, como el detalle de
 * contrato): hoy solo «Editar datos», con su permiso. Sin ninguna, el menú no
 * aparece.
 */
function CustomerHeaderActions({ onEdit }: { onEdit: () => void }) {
  const canEdit = usePermission('customers.create')
  if (!canEdit) return null
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Más
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48">
        <DropdownMenuItem className="min-h-10 px-3" onSelect={onEdit}>
          Editar datos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SectionTitle({ children, count }: { children: string; count?: number }) {
  return (
    <span className="flex items-center gap-2">
      {children}
      {count !== undefined && count > 0 && (
        <span className="tnum rounded-pill bg-muted px-2 text-xs font-semibold text-muted-foreground">{count}</span>
      )}
    </span>
  )
}

function CustomerDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-64 animate-pulse rounded-input bg-border" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-48 animate-pulse rounded-card bg-border lg:col-span-7" />
        <div className="h-48 animate-pulse rounded-card bg-border lg:col-span-5" />
      </div>
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
  const {
    data: creditNotesData,
    isPending: creditNotesPending,
    isError: creditNotesError,
    refetch: refetchCreditNotes,
    hasNextPage: creditNotesHasNextPage,
    isFetchingNextPage: creditNotesFetchingNextPage,
    fetchNextPage: fetchNextCreditNotesPage,
  } = useCustomerCreditNotes(customerId)
  const creditNotes = creditNotesData?.pages.flatMap((page) => page.items) ?? []
  const creditNoteBalance = sumMoney(...creditNotes.map((note) => note.balance))
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

  // El tipo generado lo marca opcional porque tiene default en el schema del
  // backend; en la práctica siempre viaja. Se normaliza acá y no en cada uso.
  const docPhotos = customer.doc_photos ?? []
  const emailStatus = emailNoticeStatus(customer)
  const openContracts = (contracts ?? []).filter((c) => OPEN_STATUSES.has(c.status)).length
  const hasCreditBalance = Number(creditNoteBalance) > 0

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/clientes" label="Clientes" />

      {/* Encabezado como el del contrato (rediseño P2-a): el nombre en Archivo,
          debajo documento · teléfono y el estado; las acciones en «Más». */}
      <PageHeader
        title={customer.full_name}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="tnum">
              {DOC_TYPE_LABELS[customer.doc_type] ?? customer.doc_type.toUpperCase()} {customer.doc_number}
            </span>
            <span aria-hidden>·</span>
            <span className="tnum">{customer.phone}</span>
            <StatusBadge kind="customer" status={customer.status} />
          </span>
        }
        actions={
          <CustomerHeaderActions
            onEdit={() => {
              setEditNonce((n) => n + 1)
              setEditOpen(true)
            }}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Los datos primero en el DOM (en el celular van arriba); desde
            1024 px pasan a la columna derecha. */}
        <div className="grid min-w-0 content-start gap-6 lg:col-span-5 lg:col-start-8 lg:row-start-1">
          <SummaryCard title="Datos">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <SummaryField label="Teléfono">{customer.phone}</SummaryField>
              <SummaryField label="Lugar de expedición">{customer.doc_issue_place ?? '—'}</SummaryField>
              <SummaryField label="Correo" className="sm:col-span-2">
                <span className="break-all">{customer.email ?? '—'}</span>
                {/* backend-starter/docs/DOMINIO.md §9.2: con qué base se le puede escribir. Tener
                    correo no es tener autorización, y quien atiende tiene que verlo. */}
                <span
                  className={cn(
                    'block text-xs font-normal',
                    emailStatus.tone === 'ok' && 'text-success',
                    emailStatus.tone === 'muted' && 'text-muted-foreground',
                    emailStatus.tone === 'warning' && 'text-warning',
                  )}
                >
                  Avisos: {emailStatus.text}
                </span>
              </SummaryField>
              <SummaryField label="Dirección" className="sm:col-span-2">
                {customer.address ?? '—'}
              </SummaryField>
              {hasCreditBalance && (
                <SummaryField label="Saldo a favor">
                  <Money value={creditNoteBalance} className="text-success" />
                </SummaryField>
              )}
            </dl>
            {customer.notes && (
              <div className="grid gap-px border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="text-sm whitespace-pre-line text-body">{customer.notes}</p>
              </div>
            )}
          </SummaryCard>

          {docPhotos.length > 0 && (
            <SummaryCard title={docPhotos.length > 1 ? 'Fotos del documento' : 'Foto del documento'}>
              {/* El orden ES la semántica (00050): la primera es el frente. Se
                  etiquetan solo cuando hay más de una — con una sola, decir
                  "frente" afirmaría algo que nadie declaró. */}
              <div className="flex flex-wrap gap-3">
                {docPhotos.map((path, index) => (
                  <div key={path}>
                    <PhotoThumbnail path={path} className="size-24" />
                    {docPhotos.length > 1 && (
                      <p className="mt-1 text-center text-xs text-muted-foreground">
                        {index === 0 ? 'Frente' : index === 1 ? 'Reverso' : `Foto ${index + 1}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </SummaryCard>
          )}
        </div>

        <div className="grid min-w-0 content-start gap-6 lg:col-span-7 lg:col-start-1 lg:row-start-1">
          <SummaryCard
            title={<SectionTitle count={contracts?.length}>Contratos</SectionTitle>}
            action={
              contracts && contracts.length > 0 ? (
                <span className="text-caption text-muted-foreground">
                  {openContracts === 1 ? '1 abierto' : `${openContracts} abiertos`}
                </span>
              ) : undefined
            }
          >
            <DataTable
              embedded
              columns={contractColumns}
              data={contracts ?? []}
              getRowId={(row) => row.id}
              isLoading={contractsPending}
              isError={contractsError}
              onRetry={() => refetchContracts()}
              emptyTitle="Sin contratos"
              emptyDescription="Cuando este cliente empeñe algo, sus contratos aparecen acá."
              onRowClick={(row) => navigate({ to: '/contratos/$contractId', params: { contractId: row.id } })}
            />
          </SummaryCard>

          <SummaryCard title="Compras">
            <DataTable
              embedded
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
          </SummaryCard>

          <SummaryCard title="Notas crédito">
            <DataTable
              embedded
              columns={creditNoteColumns}
              data={creditNotes}
              getRowId={(row) => row.id}
              isLoading={creditNotesPending}
              isError={creditNotesError}
              onRetry={() => refetchCreditNotes()}
              emptyTitle="Sin notas crédito"
              hasNextPage={creditNotesHasNextPage}
              isFetchingNextPage={creditNotesFetchingNextPage}
              onLoadMore={() => fetchNextCreditNotesPage()}
            />
          </SummaryCard>
        </div>
      </div>

      <CustomerFormDialog key={editNonce} open={editOpen} onOpenChange={setEditOpen} customer={customer} />
      {viewingSale && <SaleReceiptDialog open={!!viewingSale} onOpenChange={(open) => !open && setViewingSale(null)} sale={viewingSale} />}
    </div>
  )
}
