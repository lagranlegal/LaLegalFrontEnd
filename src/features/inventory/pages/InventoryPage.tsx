import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Money } from '@/components/shared/Money'
import { Can } from '@/components/shared/Can'
import { SearchInput } from '@/components/shared/SearchInput'
import { RefreshingBar } from '@/components/shared/RefreshingBar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime } from '@/lib/dates'
import { useCategories, type Category } from '@/lib/catalogs/categories'
import { useEntriesList, useExitsList, useItemsList, useProductsList, type Entry, type Exit, type Product } from '@/features/inventory/api'
import type { Item } from '@/lib/inventory/items'
import { ItemEditDialog } from '@/features/inventory/components/ItemEditDialog'
import { EntryDetailDialog } from '@/features/inventory/components/EntryDetailDialog'
import { ProductRow } from '@/features/inventory/components/ProductRow'
import { ProductPriceDialog } from '@/features/inventory/components/ProductPriceDialog'
import { EmptyState } from '@/components/shared/EmptyState'
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

/**
 * Un nivel del filtro de categorías. `__all__` como centinela porque Radix
 * `Select` no admite `value=""` en un `SelectItem` (lo reserva para "sin
 * valor"), mismo truco que ya usa `EntryFormPage` con `__none__`.
 */
function CategorySelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  options: Category[]
  placeholder: string
  disabled?: boolean
}) {
  return (
    <Select value={value || '__all__'} onValueChange={(v) => onChange(v === '__all__' ? '' : v)} disabled={disabled}>
      <SelectTrigger className="w-auto min-w-44">
        {/* Radix solo resuelve el texto de SelectValue desde un SelectItem ya
            montado — con un valor puesto por código el trigger se vería vacío
            sin esto (mismo hallazgo que en ItemEditDialog). */}
        <SelectValue placeholder={placeholder}>{options.find((c) => c.id === value)?.name ?? placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{placeholder}</SelectItem>
        {options.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Inventario agrupado por producto — la vista que resuelve el síntoma
 * original: dos compras de la misma cadena eran dos filas sin relación.
 *
 * Convive con la pestaña "Lotes" (la lista plana de siempre), que sigue
 * siendo la correcta para buscar un código puntual o revisar un artículo
 * específico. Son dos preguntas distintas: "¿cuánto tengo de esto?" vs
 * "¿dónde está esta pieza?".
 */
function ProductsTab() {
  const [q, setQ] = useState('')
  const { data, isPending, isFetching, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useProductsList({ q })
  const [editing, setEditing] = useState<Product | null>(null)
  const [dialogNonce, setDialogNonce] = useState(0)

  const products = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={q} onChange={setQ} placeholder="Buscar producto por código o nombre…" />

      {/* `isPending` solo es true en la PRIMERA carga: al buscar o al refrescar
          tras guardar un precio hay datos viejos en pantalla y nada indicaría
          que algo está pasando. Con el backend arrancando en frío eso son
          segundos en los que parece que el filtro no hizo nada. */}
      <RefreshingBar active={isFetching && !isPending} />

      {isPending && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card border border-border bg-muted/30" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-start gap-2 rounded-card border border-border bg-card p-card">
          <p className="text-sm text-danger">No se pudieron cargar los productos.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {!isPending && !isError && products.length === 0 && (
        <EmptyState
          title={q ? 'Ningún producto coincide' : 'Aún no tienes productos'}
          description={q ? 'Prueba con otro código o nombre.' : 'Registra un ingreso para empezar.'}
        />
      )}

      {products.length > 0 && (
        <div className="flex flex-col gap-2">
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              onEditPrice={(p) => {
                setEditing(p)
                setDialogNonce((n) => n + 1)
              }}
            />
          ))}
        </div>
      )}

      {hasNextPage && (
        <Button variant="ghost" className="w-full" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
          {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
        </Button>
      )}

      {editing && (
        <ProductPriceDialog key={dialogNonce} open={!!editing} onOpenChange={(open) => !open && setEditing(null)} product={editing} />
      )}
    </div>
  )
}

function ItemsTab() {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [cat1Id, setCat1Id] = useState('')
  const [cat2Id, setCat2Id] = useState('')
  const [cat3Id, setCat3Id] = useState('')
  const { data: categories } = useCategories()
  const { data, isPending, isFetching, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useItemsList({
    status,
    q,
    // Solo se manda la categoría MÁS específica elegida: el backend filtra por
    // columna exacta, así que mandar cat1 + cat3 juntos sería redundante y
    // cat3 ya implica su rama.
    cat1_id: cat3Id || cat2Id ? '' : cat1Id,
    cat2_id: cat3Id ? '' : cat2Id,
    cat3_id: cat3Id,
  })
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [dialogNonce, setDialogNonce] = useState(0)

  const level1Options = (categories ?? []).filter((c) => c.level === 1 && c.active)
  const level2Options = (categories ?? []).filter((c) => c.level === 2 && c.active && c.parent_id === cat1Id)
  const level3Options = (categories ?? []).filter((c) => c.level === 3 && c.active && c.parent_id === cat2Id)
  const hasFilters = !!(q || status || cat1Id)

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
      {/* Buscar por código es la operación de mostrador: el vendedor lee la
          etiqueta de la vitrina. Va primero y ocupa el ancho. */}
      <SearchInput value={q} onChange={setQ} placeholder="Buscar por código o nombre…" />

      <div className="flex flex-wrap items-center gap-2">
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

      <div className="flex flex-wrap items-center gap-2">
        <CategorySelect
          value={cat1Id}
          onChange={(v) => {
            setCat1Id(v)
            setCat2Id('')
            setCat3Id('')
          }}
          options={level1Options}
          placeholder="Toda categoría"
          disabled={!categories}
        />
        {cat1Id && (
          <CategorySelect
            value={cat2Id}
            onChange={(v) => {
              setCat2Id(v)
              setCat3Id('')
            }}
            options={level2Options}
            placeholder="Toda subcategoría"
          />
        )}
        {cat2Id && <CategorySelect value={cat3Id} onChange={setCat3Id} options={level3Options} placeholder="Todo tipo" />}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ('')
              setStatus('')
              setCat1Id('')
              setCat2Id('')
              setCat3Id('')
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={items}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isRefreshing={isFetching && !isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle={hasFilters ? 'Ningún artículo coincide' : 'Aún no tienes artículos'}
        emptyDescription={hasFilters ? 'Prueba con otro código, nombre o categoría.' : 'Registra un ingreso para empezar.'}
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
    // La fecha de ENTRADA de la mercancía, no la de digitación: puede ser
    // anterior, y es la que importa para inventario y costo de ventas.
    { accessorKey: 'entry_date', header: 'Entrada', cell: (info) => formatDate(info.getValue<string>()) },
    {
      id: 'payment',
      header: 'Pago',
      cell: (info) => {
        const entry = info.row.original
        if (entry.origin_type !== 'purchase') return <span className="text-muted-foreground">—</span>
        return entry.paid_at ? (
          <span className="text-success">Pagado</span>
        ) : (
          <span className="rounded-pill bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">Por pagar</span>
        )
      },
    },
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

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="items">Lotes</TabsTrigger>
          <TabsTrigger value="entries">Ingresos</TabsTrigger>
          <TabsTrigger value="exits">Egresos</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>
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
