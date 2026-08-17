import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Money } from '@/components/shared/Money'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/dates'
import { useEntriesList, useExitsList, useItemsList, type Entry, type Exit } from '@/features/inventory/api'
import type { Item } from '@/lib/inventory/items'
import { ItemEditDialog } from '@/features/inventory/components/ItemEditDialog'
import { EntryDetailDialog } from '@/features/inventory/components/EntryDetailDialog'
import { ExitFormDialog } from '@/features/inventory/components/ExitFormDialog'

const ITEM_STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'available', label: 'Disponible' },
  { value: 'sold', label: 'Vendido' },
  { value: 'written_off', label: 'Dado de baja' },
]

const EXIT_TYPE_LABELS: Record<string, string> = {
  adjustment: 'Ajuste de inventario',
  damage: 'Daño',
  supplier_return: 'Devolución a proveedor',
  internal_use: 'Uso interno',
}

function ItemsTab() {
  const [status, setStatus] = useState('')
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useItemsList(status)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [dialogNonce, setDialogNonce] = useState(0)

  const items = data?.pages.flatMap((page) => page.items) ?? []

  const columns: ColumnDef<Item>[] = [
    { accessorKey: 'code', header: 'Código', cell: (info) => info.getValue<string | null>() ?? '—' },
    { accessorKey: 'name', header: 'Nombre' },
    { accessorKey: 'cost', header: 'Costo', cell: (info) => <Money value={info.getValue<string>()} /> },
    { accessorKey: 'sale_price', header: 'Precio', cell: (info) => (info.getValue<string | null>() ? <Money value={info.getValue<string>()} /> : '—') },
    { accessorKey: 'quantity', header: 'Cantidad' },
    { accessorKey: 'status', header: 'Estado', cell: (info) => <StatusBadge status={info.getValue<string>()} /> },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {ITEM_STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={cn(
              'rounded-pill px-3 py-1.5 text-sm font-medium transition-colors',
              status === tab.value ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={items}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle={status ? 'No hay artículos con ese estado' : 'Aún no tienes artículos'}
        emptyDescription={status ? undefined : 'Registra un ingreso para empezar.'}
        onRowClick={(row) => {
          setEditingItem(row)
          setDialogNonce((n) => n + 1)
        }}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />

      {editingItem && <ItemEditDialog key={dialogNonce} open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)} item={editingItem} />}
    </div>
  )
}

function EntriesTab() {
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useEntriesList()
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null)

  const entries = data?.pages.flatMap((page) => page.items) ?? []

  const columns: ColumnDef<Entry>[] = [
    { accessorKey: 'number', header: 'Número', cell: (info) => `#${info.getValue<number>()}` },
    { accessorKey: 'origin_type', header: 'Origen', cell: (info) => (info.getValue<string>() === 'purchase' ? 'Compra' : 'Otro') },
    { accessorKey: 'items', header: 'Artículos', cell: (info) => info.row.original.items.length },
    { accessorKey: 'total_cost', header: 'Costo total', cell: (info) => <Money value={info.getValue<string>()} /> },
    { accessorKey: 'created_at', header: 'Fecha', cell: (info) => formatDateTime(info.getValue<string>()) },
  ]

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        data={entries}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="Aún no tienes ingresos registrados"
        onRowClick={(row) => setViewingEntry(row)}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />

      {viewingEntry && <EntryDetailDialog open={!!viewingEntry} onOpenChange={(open) => !open && setViewingEntry(null)} entry={viewingEntry} />}
    </div>
  )
}

function ExitsTab() {
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useExitsList()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogNonce, setDialogNonce] = useState(0)

  const exits = data?.pages.flatMap((page) => page.items) ?? []

  const columns: ColumnDef<Exit>[] = [
    { accessorKey: 'number', header: 'Número', cell: (info) => `#${info.getValue<number>()}` },
    { accessorKey: 'exit_type', header: 'Tipo', cell: (info) => EXIT_TYPE_LABELS[info.getValue<string>()] ?? info.getValue<string>() },
    { accessorKey: 'reason', header: 'Motivo' },
    { accessorKey: 'created_at', header: 'Fecha', cell: (info) => formatDateTime(info.getValue<string>()) },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Can permission="inventory.exit">
          <Button
            className="rounded-pill"
            onClick={() => {
              setDialogNonce((n) => n + 1)
              setDialogOpen(true)
            }}
          >
            + Nuevo egreso
          </Button>
        </Can>
      </div>

      <DataTable
        columns={columns}
        data={exits}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="Aún no tienes egresos registrados"
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />

      <ExitFormDialog key={dialogNonce} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}

export function InventoryPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventario"
        description="Artículos, ingresos y egresos."
        actions={
          <Can permission="inventory.create">
            <Button className="rounded-pill" onClick={() => navigate({ to: '/inventario/ingresos/nuevo' })}>
              + Nuevo ingreso
            </Button>
          </Can>
        }
      />

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Artículos</TabsTrigger>
          <TabsTrigger value="entries">Ingresos</TabsTrigger>
          <TabsTrigger value="exits">Egresos</TabsTrigger>
        </TabsList>
        <TabsContent value="items">
          <ItemsTab />
        </TabsContent>
        <TabsContent value="entries">
          <EntriesTab />
        </TabsContent>
        <TabsContent value="exits">
          <ExitsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
