import { useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, useParams } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { BackLink } from '@/components/shared/BackLink'
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
import { useItemsByIds, type Item } from '@/lib/inventory/items'
import { usePaymentsList, useAuctionContract, type Payment } from '@/features/contracts/api'
import { effectiveContractStatus, isReadyForAuction } from '@/features/contracts/contractStatus'
import { useContract } from '@/lib/contracts/reference'
import { useCustomer } from '@/lib/customers/search'
import { PaymentOptionsPanel } from '@/features/contracts/components/PaymentOptionsPanel'
import { ContractMetricsPanel } from '@/features/contracts/components/ContractMetricsPanel'
import { ContractEditDialog } from '@/features/contracts/components/ContractEditDialog'
import { ContractPrintView } from '@/features/contracts/components/ContractPrintView'
import { SettlementPrintView } from '@/features/contracts/components/SettlementPrintView'
import { useSettlementInfo } from '@/features/contracts/settlement'
import { useActiveDocumentTemplate } from '@/features/settings/documentTemplates/api'

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

/**
 * Vínculo inverso prenda→artículo (`ContractItemOut.inventory_item_id`,
 * resuelto por backend 19/08/2026 — ver `docs/PENDIENTES_BACKEND_INFRA.md`
 * punto 19). Sin ruta propia de detalle de artículo en el front (se editan
 * desde un diálogo abierto desde la lista, no una página) — el link lleva
 * a `/inventario` sin más, el código mostrado es lo que se busca ahí.
 */
function AuctionedItemLink({ inventoryItem }: { inventoryItem: Item | undefined }) {
  return (
    <Link to="/inventario" className="text-xs text-primary hover:underline">
      Convertido en {inventoryItem?.code ?? inventoryItem?.name ?? 'un artículo de inventario'}
    </Link>
  )
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
  // Un solo request para las prendas ya rematadas, en vez de uno por prenda
  // (docs/PENDIENTES_FRONTEND.md #11). Antes de saber si `contract` cargó —
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
      <BackLink to="/contratos" label="Contratos" />

      <PageHeader
        title={`Contrato #${contract.number}`}
        description={customer ? `${customer.full_name} · ${customer.doc_type.toUpperCase()} ${customer.doc_number}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            {contract.legacy_code && <LegacyCodeBadge code={contract.legacy_code} />}
            <StatusBadge status={effectiveContractStatus(contract)} />
            <Button
              variant="outline"
              disabled={contractTemplateLoading}
              onClick={() => {
                // `window.print()` es sincrónico y bloquea — sin `flushSync`,
                // el setState de `printMode` queda batcheado para DESPUÉS de
                // que el diálogo de impresión ya se abrió con el DOM viejo
                // (imprimiría el documento que estaba antes, no el elegido).
                flushSync(() => setPrintMode('contract'))
                window.print()
              }}
            >
              {contractTemplateLoading ? 'Cargando…' : 'Imprimir'}
            </Button>
            {isPaid && settlement && (
              <Button
                variant="outline"
                disabled={settlementTemplateLoading}
                onClick={() => {
                  flushSync(() => setPrintMode('settlement'))
                  window.print()
                }}
              >
                {settlementTemplateLoading ? 'Cargando…' : 'Imprimir paz y salvo'}
              </Button>
            )}
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
                  {item.inventory_item_id && (
                    <AuctionedItemLink inventoryItem={auctionedItemsById?.get(item.inventory_item_id)} />
                  )}
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

      {/* Las métricas van ANTES del historial: responden "¿cómo va este
          contrato?" de un vistazo, mientras que la tabla de abonos es para
          consultar un movimiento puntual. Se calculan de los mismos abonos que
          la tabla, así que solo tienen sentido cuando ya cargaron. */}
      {!paymentsPending && !paymentsError && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-foreground">Cómo va este contrato</h2>
          <ContractMetricsPanel contract={contract} payments={payments} />
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

    {printMode === 'settlement' && settlement ? (
      <SettlementPrintView contract={contract} customer={customer} settlement={settlement} />
    ) : (
      <ContractPrintView contract={contract} customer={customer} categories={categories} />
    )}
    </>
  )
}
