import { useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Printer } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { BackLink } from '@/components/shared/BackLink'
import { DetailLoadError } from '@/components/shared/DetailLoadError'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageTabs, PageTabsContent, type PageTab } from '@/components/shared/PageTabs'
import { CompanyDataNotice } from '@/components/shared/CompanyDataNotice'
import { ExtendLoanPanel } from '@/features/contracts/components/ExtendLoanPanel'
import { ContractChainPanel } from '@/features/contracts/components/ContractChainPanel'
import { PhotoThumbnail } from '@/components/shared/PhotoThumbnail'
import { Money } from '@/components/shared/Money'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/dates'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { confirm } from '@/components/shared/confirmStore'
import { useCategories } from '@/lib/catalogs/categories'
import { useItemsByIds } from '@/lib/inventory/items'
import { usePaymentsList, useAuctionContract, type Payment } from '@/features/contracts/api'
import { isReadyForAuction } from '@/features/contracts/contractStatus'
import { useContract } from '@/lib/contracts/reference'
import { useCustomer } from '@/lib/customers/search'
import { ContractStatusHero, PAYABLE_STATUSES } from '@/features/contracts/components/ContractStatusHero'
import { PaymentOptionsPanel } from '@/features/contracts/components/PaymentOptionsPanel'
import { ContractMetricsPanel } from '@/features/contracts/components/ContractMetricsPanel'
import { ContractHeaderActions } from '@/features/contracts/components/ContractHeaderActions'
import { ItemsCard, LoanCard, NotesCard } from '@/features/contracts/components/ContractSummaryCards'
import { ContractEditDialog } from '@/features/contracts/components/ContractEditDialog'
import { ContractPrintView } from '@/features/contracts/components/ContractPrintView'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { SettlementPrintView } from '@/features/contracts/components/SettlementPrintView'
import { useSettlementInfo } from '@/features/contracts/settlement'
import { useActiveDocumentTemplate } from '@/features/settings/documentTemplates/api'

const paymentColumns: ColumnDef<Payment>[] = [
  { accessorKey: 'receipt_number', header: 'Recibo', cell: (info) => <RecordNumber value={info.getValue<number>()} /> },
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

type Section = 'resumen' | 'abonos' | 'analisis' | 'documentos'

function ContractDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-64 animate-pulse rounded-input bg-border" />
      <div className="h-40 animate-pulse rounded-card bg-border" />
      <div className="h-40 animate-pulse rounded-card bg-border" />
    </div>
  )
}

export function ContractDetailPage() {
  // `from` usa el id de ruta ("/app-layout/…"), no el fullPath de la URL —
  // mismo gotcha que useSearch en appLayoutRoute (pathless via `id`).
  // `Link`/`navigate({to:...})` sí usan el
  // fullPath sin prefijo, por eso en el resto del feature se ve "/contratos/…".
  const { contractId } = useParams({ from: '/app-layout/contratos/$contractId' })
  const { seccion } = useSearch({ from: '/app-layout/contratos/$contractId' })
  const section: Section = seccion ?? 'resumen'
  const navigate = useNavigate({ from: '/contratos/$contractId' })
  const { data: contract, isPending, isError, error, refetch } = useContract(contractId)
  const { data: customer } = useCustomer(contract?.customer_id ?? '')
  const { data: categories } = useCategories()
  // Un solo request para las prendas ya rematadas, en vez de uno por prenda
  // (auditoría de UX del 27/08/2026, punto 11). Antes de saber si `contract` cargó —
  // los hooks no pueden ser condicionales — así que se arma con `?? []`.
  const { data: auctionedItemsById } = useItemsByIds(
    (contract?.items ?? []).map((item) => item.inventory_item_id),
  )
  const { data: paymentsData, isPending: paymentsPending, isError: paymentsError, refetch: refetchPayments, hasNextPage, isFetchingNextPage, fetchNextPage } = usePaymentsList(contractId)
  const auctionContract = useAuctionContract()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editDialogNonce, setEditDialogNonce] = useState(0)
  // 'paid' es terminal (no lo toca el recálculo activo→en_mora→prórroga, ver
  // service.py::get_settlement_info) — la columna cruda alcanza, sin
  // necesitar `effectiveContractStatus`. Antes de saber si `contract` cargó
  // (los hooks no pueden ser condicionales) — mismo criterio que
  // `useItemsByIds` arriba.
  const isPaid = contract?.status === 'paid'
  const { data: settlement } = useSettlementInfo(contractId, isPaid)
  // `ContractPrintView`/`SettlementPrintView` (montados abajo, print:hidden)
  // piden la plantilla activa por su cuenta — mismo `queryKey`, sin request
  // duplicado. Se vuelve a pedir ACÁ solo para saber cuándo está resuelta:
  // sin esto, "Imprimir" quedaba habilitado desde el primer render, y
  // `window.print()` (sincrónico) podía disparar mientras la plantilla
  // todavía no había llegado — imprimiendo el documento de siempre en vez
  // del configurado, sin ningún aviso. Confirmado en vivo: la ventana real
  // ronda ~3s en la primera visita de la sesión (esta página encadena varios
  // requests antes de pedir la plantilla).
  const { isLoading: contractTemplateLoading } = useActiveDocumentTemplate('contract')
  const { isLoading: settlementTemplateLoading } = useActiveDocumentTemplate('settlement', { enabled: isPaid })
  const [printMode, setPrintMode] = useState<'contract' | 'settlement'>('contract')

  if (isPending) return <ContractDetailSkeleton />

  if (isError || !contract) {
    return (
      <DetailLoadError
        error={error}
        notFoundTitle="Este contrato no existe o no es de tu empresa"
        loadFailedText="No se pudo cargar el contrato."
        backTo="/contratos"
        backLabel="Volver a contratos"
        onRetry={() => refetch()}
      />
    )
  }

  const payments = paymentsData?.pages.flatMap((page) => page.items) ?? []
  const payable = PAYABLE_STATUSES.has(contract.status)

  function setSection(next: Section) {
    void navigate({ search: (prev) => ({ ...prev, seccion: next === 'resumen' ? undefined : next }), replace: true })
  }

  function printContract() {
    // `window.print()` es sincrónico y bloquea — sin `flushSync`, el setState
    // de `printMode` queda batcheado para DESPUÉS de que el diálogo de
    // impresión ya se abrió con el DOM viejo (imprimiría el documento que
    // estaba antes, no el elegido).
    flushSync(() => setPrintMode('contract'))
    window.print()
  }

  function printSettlement() {
    flushSync(() => setPrintMode('settlement'))
    window.print()
  }

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

  const tabs: PageTab<Section>[] = [
    { value: 'resumen', label: 'Resumen' },
    { value: 'abonos', label: 'Abonos', count: paymentsPending || paymentsError ? undefined : `${payments.length}${hasNextPage ? '+' : ''}` },
    { value: 'analisis', label: 'Análisis' },
    { value: 'documentos', label: 'Documentos' },
  ]

  // Columna derecha del Resumen (rediseño P2-a): préstamo, prendas, notas y ampliar.
  const details = (
    <>
      <LoanCard contract={contract} />
      <ItemsCard contract={contract} auctionedItemsById={auctionedItemsById} />
      {contract.notes && <NotesCard notes={contract.notes} />}
      <ExtendLoanPanel contract={contract} />
    </>
  )

  return (
    <>
    <div className="flex flex-col gap-6 print:hidden">
      <BackLink to="/contratos" label="Contratos" />

      <PageHeader
        title={<>Contrato <RecordNumber value={contract.number} className="text-2xl" /></>}
        description={
          customer || contract.legacy_code ? (
            <>
              {customer && `${customer.full_name} · ${customer.doc_type.toUpperCase()} ${customer.doc_number}`}
              {customer && contract.legacy_code && ' · '}
              {contract.legacy_code && <span className="font-mono text-xs">{contract.legacy_code}</span>}
            </>
          ) : undefined
        }
        actions={
          <ContractHeaderActions
            printLoading={contractTemplateLoading}
            onPrint={printContract}
            settlementAvailable={isPaid && !!settlement}
            settlementLoading={settlementTemplateLoading}
            onPrintSettlement={printSettlement}
            onEdit={() => {
              setEditDialogNonce((n) => n + 1)
              setEditDialogOpen(true)
            }}
            canAuction={isReadyForAuction(contract)}
            auctionPending={auctionContract.isPending}
            onAuction={() => void handleAuction()}
          />
        }
      />

      {/* F9-16: el estado es el encabezado (rediseño P2-a). */}
      <ContractStatusHero contract={contract} settlement={settlement} />

      {/* Rediseño P2-a (F9-20): la página medía ~2.000 px; lo que se consulta
          de pasada (historial, análisis, documentos) va en su pestaña y el
          Resumen cabe en 1280×800. */}
      <PageTabs label="Secciones del contrato" value={section} onValueChange={setSection} tabs={tabs}>
        <PageTabsContent value="resumen" className="flex flex-col gap-4">
          {/* La cadena de ampliaciones: a cuál pasó la deuda, de cuál viene, y la
              historia completa si hay varias (backend-starter/docs/DOMINIO.md §3). */}
          <ContractChainPanel contract={contract} />

          {payable ? (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
              <section aria-labelledby="registrar-abono" className="grid gap-3 rounded-card border border-border bg-card p-card lg:col-span-7">
                <PaymentOptionsPanel
                  contractId={contractId}
                  contractNumber={contract.number}
                  customerName={customer?.full_name}
                  interestPaidUntil={contract.interest_paid_until}
                  status={contract.status}
                  itemCount={contract.items.length}
                />
              </section>
              <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">{details}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">{details}</div>
          )}
        </PageTabsContent>

        <PageTabsContent value="abonos">
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
        </PageTabsContent>

        <PageTabsContent value="analisis" className="flex flex-col gap-3">
          {/* Se calculan de los mismos abonos que el historial, así que solo
              tienen sentido cuando ya cargaron. */}
          <h2 className="text-sm font-medium text-foreground">Cómo va este contrato</h2>
          {paymentsPending ? (
            <div className="h-40 animate-pulse rounded-card bg-border" />
          ) : paymentsError ? (
            <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-card text-center">
              <p className="text-sm text-muted-foreground">No se pudieron cargar los abonos para el análisis.</p>
              <Button variant="outline" onClick={() => refetchPayments()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <ContractMetricsPanel contract={contract} payments={payments} />
          )}
        </PageTabsContent>

        <PageTabsContent value="documentos" className="flex flex-col gap-4">
          {/* F8-10: el contrato y el paz y salvo se imprimen desde acá. */}
          <CompanyDataNotice />
          <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-card">
            <h2 className="text-md font-semibold text-foreground">Imprimir</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={contractTemplateLoading} onClick={printContract}>
                <Printer aria-hidden />
                {contractTemplateLoading ? 'Cargando…' : 'Contrato'}
              </Button>
              {isPaid && settlement && (
                <Button variant="outline" disabled={settlementTemplateLoading} onClick={printSettlement}>
                  <Printer aria-hidden />
                  {settlementTemplateLoading ? 'Cargando…' : 'Paz y salvo'}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Sale con la plantilla activa de la empresa (Configuración → Documentos impresos).</p>
          </div>
          <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-card">
            <h2 className="text-md font-semibold text-foreground">Documento firmado</h2>
            {contract.signed_photo_url ? (
              <PhotoThumbnail path={contract.signed_photo_url} className="size-24" />
            ) : (
              <p className="text-sm text-muted-foreground">Aún no se ha subido la foto del contrato firmado. Se agrega desde Editar.</p>
            )}
          </div>
        </PageTabsContent>
      </PageTabs>

      <ContractEditDialog key={editDialogNonce} open={editDialogOpen} onOpenChange={setEditDialogOpen} contract={contract} />
    </div>

    {printMode === 'settlement' && settlement ? (
      <SettlementPrintView contract={contract} customer={customer} settlement={settlement} />
    ) : (
      <ContractPrintView contract={contract} customer={customer} categories={categories} />
    )}
    </>
  )
}
