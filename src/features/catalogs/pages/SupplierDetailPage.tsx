import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { ChevronLeft, Pencil } from 'lucide-react'
import { Can } from '@/components/shared/Can'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { KpiCard, KpiRow } from '@/components/shared/KpiCard'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/dates'
import { useSupplierSummary, useSupplierPurchases, useSuppliersList, type SupplierPurchase } from '@/features/catalogs/api'
import { SupplierFormDialog } from '@/features/catalogs/components/SupplierFormDialog'

const purchaseColumns: ColumnDef<SupplierPurchase>[] = [
  { accessorKey: 'number', header: 'Ingreso', cell: (info) => `#${info.getValue<number>()}` },
  { accessorKey: 'entry_date', header: 'Entrada', cell: (info) => formatDate(info.getValue<string>()) },
  {
    accessorKey: 'supplier_invoice',
    header: 'Factura',
    cell: (info) => info.getValue<string | null>() ?? <span className="text-muted-foreground">—</span>,
  },
  { accessorKey: 'item_count', header: 'Artículos' },
  { accessorKey: 'total_cost', header: 'Total', cell: (info) => <Money value={info.getValue<string>()} /> },
  {
    id: 'payment',
    header: 'Pago',
    cell: ({ row }) =>
      row.original.paid_at ? (
        <span className="text-success">Pagado</span>
      ) : (
        <span className="rounded-pill bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">Por pagar</span>
      ),
  },
]

/**
 * Ficha del proveedor — espejo de la del cliente.
 *
 * El cliente tiene su ficha con historial cruzado desde el paso 4; el
 * proveedor tenía un formulario de creación y nada más, así que "¿cuánto le he
 * comprado?" y "¿le debo algo?" no tenían respuesta aunque el dato estuviera
 * completo en la base.
 *
 * El KPI que manda es **lo pendiente**: es la única cifra sobre la que hay que
 * hacer algo hoy. El total comprado es contexto — dice qué tan importante es
 * este proveedor, no qué hacer con él.
 */
export function SupplierDetailPage() {
  const { supplierId } = useParams({ from: '/app-layout/proveedores/$supplierId' })
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const { data: summary, isPending, isError, refetch } = useSupplierSummary(supplierId)
  // El formulario de edición necesita el proveedor COMPLETO (documento,
  // dirección, notas), y el resumen solo trae lo que se muestra en la ficha.
  // Sale del listado, que ya está en cache: pedirlo por su id sería una
  // request más para un dato que la app acaba de traer.
  const { data: suppliersData } = useSuppliersList()
  const supplier = suppliersData?.pages.flatMap((page) => page.items).find((sp) => sp.id === supplierId)
  const {
    data: purchasesData,
    isPending: purchasesPending,
    isError: purchasesError,
    refetch: refetchPurchases,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useSupplierPurchases(supplierId)

  const purchases = purchasesData?.pages.flatMap((page) => page.items) ?? []

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-64 animate-pulse rounded-input bg-border" />
        <div className="h-24 animate-pulse rounded-card bg-border" />
        <div className="h-40 animate-pulse rounded-card bg-border" />
      </div>
    )
  }

  if (isError || !summary) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-card p-card">
        <p className="text-sm text-danger">No se pudo cargar el proveedor.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const tieneDeuda = Number(summary.pending_total) > 0

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="self-start" onClick={() => navigate({ to: '/catalogos' })}>
        <ChevronLeft className="size-4" /> Catálogos
      </Button>

      <PageHeader
        title={summary.name}
        description={`Letra de código ${summary.code_letter} · ${summary.product_count} producto(s) distinto(s)`}
        actions={
          <Can permission="catalogs.manage">
            <Button variant="outline" disabled={!supplier} onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Editar
            </Button>
          </Can>
        }
      />

      <KpiRow>
        {/* Lo pendiente va primero: es la única cifra sobre la que hay algo
            que hacer hoy. El total comprado dice qué tan importante es este
            proveedor, no qué hacer con él. */}
        <KpiCard
          label="Por pagarle"
          value={<Money value={summary.pending_total} />}
          tone={tieneDeuda ? 'danger' : 'default'}
          hint={tieneDeuda ? `${summary.pending_count} compra(s) sin pagar` : 'Está al día'}
        />
        <KpiCard label="Total comprado" value={<Money value={summary.total_purchased} />} hint={`${summary.purchase_count} compra(s)`} />
        <KpiCard
          label="Última compra"
          value={summary.last_purchase_date ? formatDate(summary.last_purchase_date) : '—'}
          hint={summary.first_purchase_date ? `Desde ${formatDate(summary.first_purchase_date)}` : 'Sin compras todavía'}
        />
      </KpiRow>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Historial de compras</h2>
        <DataTable
          columns={purchaseColumns}
          data={purchases}
          getRowId={(row) => row.entry_id}
          isLoading={purchasesPending}
          isError={purchasesError}
          onRetry={() => refetchPurchases()}
          emptyTitle="Aún no le has comprado nada a este proveedor"
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      </div>

      {supplier && <SupplierFormDialog key={supplier.id} open={editOpen} onOpenChange={setEditOpen} supplier={supplier} />}
    </div>
  )
}
