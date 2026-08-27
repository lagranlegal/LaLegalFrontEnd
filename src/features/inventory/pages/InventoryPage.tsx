import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Money } from '@/components/shared/Money'
import { sumMoney } from '@/lib/money'
import { Can } from '@/components/shared/Can'
import { SearchInput } from '@/components/shared/SearchInput'
import { RefreshingBar } from '@/components/shared/RefreshingBar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime } from '@/lib/dates'
import { useCategories, type Category } from '@/lib/catalogs/categories'
import { useSuppliers } from '@/lib/catalogs/suppliers'
import { entryOriginLabel, exitTypeLabel, SELECTABLE_ENTRY_ORIGINS, SELECTABLE_EXIT_TYPES } from '@/lib/inventory/entryTypes'
import { useEntriesList, useExitsList, useItemsList, useProductsList, type Entry, type Exit, type Product } from '@/features/inventory/api'
import type { Item } from '@/lib/inventory/items'
import { ItemEditDialog } from '@/features/inventory/components/ItemEditDialog'
import { EntryDetailDialog } from '@/components/shared/EntryDetailDialog'
import { ProductRow } from '@/features/inventory/components/ProductRow'
import { ProductPriceDialog } from '@/features/inventory/components/ProductPriceDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { isPermissionError } from '@/lib/api/isPermissionError'
import { ExitFormDialog } from '@/features/inventory/components/ExitFormDialog'
import { TransformationsTab } from '@/features/inventory/components/TransformationsTab'
import { useInventorySearch } from '@/features/inventory/useInventorySearch'

const ITEM_STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'available', label: 'Disponible' },
  { value: 'sold', label: 'Vendido' },
  { value: 'written_off', label: 'Dado de baja' },
]

/** De dónde salió el artículo. Espeja el enum `item_origin` del backend. */
const ORIGIN_OPTIONS = [
  { value: 'supplier', label: 'Comprado a proveedor' },
  { value: 'auction', label: 'Remate de contrato' },
  { value: 'other', label: 'Otro origen' },
]

/**
 * Un filtro desplegable de la barra. `__all__` como centinela porque Radix
 * `Select` no admite `value=""` en un `SelectItem` (lo reserva para "sin
 * valor"), mismo truco que ya usa `EntryFormPage` con `__none__`.
 *
 * Genérico sobre `{value,label}` y no sobre `Category`: la barra filtra
 * también por proveedor y por origen, y tres selectores idénticos con tres
 * componentes distintos era la forma de que se fueran separando.
 */
function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  disabled?: boolean
}) {
  return (
    <Select value={value || '__all__'} onValueChange={(v) => onChange(v === '__all__' ? '' : v)} disabled={disabled}>
      <SelectTrigger className="w-auto min-w-44">
        {/* Radix solo resuelve el texto de SelectValue desde un SelectItem ya
            montado — con un valor puesto por código el trigger se vería vacío
            sin esto (mismo hallazgo que en ItemEditDialog). */}
        <SelectValue placeholder={placeholder}>{options.find((o) => o.value === value)?.label ?? placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Filtro de sí/no, como píldora. Para lo que no es una lista de opciones. */
function FilterToggle({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        'rounded-pill px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent',
      )}
    >
      {label}
    </button>
  )
}

/** Un nivel del árbol de categorías, sobre `FilterSelect`. */
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
    <FilterSelect
      value={value}
      onChange={onChange}
      options={options.map((c) => ({ value: c.id, label: c.name }))}
      placeholder={placeholder}
      disabled={disabled}
    />
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
  // Los filtros viven en la URL: sobreviven al F5 y el link se puede
  // compartir. Ver `useInventorySearch`.
  const { search, setSearch } = useInventorySearch()
  const q = search.q ?? ''
  const cat1Id = search.cat1 ?? ''
  const cat2Id = search.cat2 ?? ''
  const cat3Id = search.cat3 ?? ''
  const supplierId = search.supplier ?? ''
  const inStock = search.stock ?? false
  const setQ = (v: string) => setSearch({ q: v })
  // Cambiar un nivel limpia los de abajo: una subcategoría de otra rama no
  // filtra nada y dejaría la pantalla vacía sin explicación.
  const setCat1Id = (v: string) => setSearch({ cat1: v, cat2: '', cat3: '' })
  const setCat2Id = (v: string) => setSearch({ cat2: v, cat3: '' })
  const setCat3Id = (v: string) => setSearch({ cat3: v })
  const setSupplierId = (v: string) => setSearch({ supplier: v })
  const setInStock = (v: boolean) => setSearch({ stock: v })
  const { data: categories } = useCategories()
  const { data: suppliers } = useSuppliers()
  const { data, isPending, isFetching, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useProductsList({
    q,
    // Solo la categoría MÁS específica: el backend filtra por columna exacta.
    cat1_id: cat3Id || cat2Id ? '' : cat1Id,
    cat2_id: cat3Id ? '' : cat2Id,
    cat3_id: cat3Id,
    supplier_id: supplierId,
    in_stock: inStock,
  })
  const [editing, setEditing] = useState<Product | null>(null)
  const [dialogNonce, setDialogNonce] = useState(0)

  const level1Options = (categories ?? []).filter((c) => c.level === 1 && c.active)
  const level2Options = (categories ?? []).filter((c) => c.level === 2 && c.active && c.parent_id === cat1Id)
  const level3Options = (categories ?? []).filter((c) => c.level === 3 && c.active && c.parent_id === cat2Id)
  const hasFilters = !!(q || cat1Id || supplierId || inStock)

  const products = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={q} onChange={setQ} placeholder="Buscar producto por código o nombre…" />

      {/* La pestaña principal del inventario no tenía más filtro que el texto,
          así que "¿qué tengo de joyería en oro?" o "¿qué puedo vender hoy?"
          no se podían responder sin leer la lista entera. */}
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
        <FilterSelect
          value={supplierId}
          onChange={setSupplierId}
          options={(suppliers ?? []).filter((sp) => sp.active).map((sp) => ({ value: sp.id, label: sp.name }))}
          placeholder="Todo proveedor"
          disabled={!suppliers}
        />
        <FilterToggle active={inStock} onToggle={() => setInStock(!inStock)} label="Solo con stock" />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch({ q: '', cat1: '', cat2: '', cat3: '', supplier: '', stock: false })}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* `isPending` solo es true en la PRIMERA carga: al buscar o al refrescar
          tras guardar un precio hay datos viejos en pantalla y nada indicaría
          que algo está pasando. Con el backend arrancando en frío eso son
          segundos en los que parece que el filtro no hizo nada. */}
      <RefreshingBar active={isFetching && !isPending} />

      {isPending && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card border border-border bg-border" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-start gap-2 rounded-card border border-border bg-card p-card">
          {isPermissionError(error) ? (
            // Reintentar no va a cambiar un permiso que no existe.
            <p className="text-sm text-muted-foreground">
              Tu rol no tiene permiso para ver el inventario. Pídele a un administrador que te lo habilite.
            </p>
          ) : (
            <>
              <p className="text-sm text-danger">No se pudieron cargar los productos.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </>
          )}
        </div>
      )}

      {!isPending && !isError && products.length === 0 && (
        <EmptyState
          title={hasFilters ? 'Ningún producto coincide' : 'Aún no tienes productos'}
          description={hasFilters ? 'Prueba con otros filtros.' : 'Registra un ingreso para empezar.'}
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
  const { search, setSearch } = useInventorySearch()
  const status = search.status ?? ''
  const q = search.q ?? ''
  const cat1Id = search.cat1 ?? ''
  const cat2Id = search.cat2 ?? ''
  const cat3Id = search.cat3 ?? ''
  const setStatus = (v: string) => setSearch({ status: v })
  const setQ = (v: string) => setSearch({ q: v })
  const setCat1Id = (v: string) => setSearch({ cat1: v, cat2: '', cat3: '' })
  const setCat2Id = (v: string) => setSearch({ cat2: v, cat3: '' })
  const setCat3Id = (v: string) => setSearch({ cat3: v })
  // Proveedor y origen YA existían como filtros del backend (`supplier_id`,
  // `origin` en `GET /inventory/items`) y ninguna pantalla los ofrecía.
  // Exponerlos no costó backend: responden "¿qué le compré a este proveedor?"
  // y "¿qué de esto salió de un remate?", que eran preguntas sin respuesta.
  const supplierId = search.supplier ?? ''
  const origin = search.origin ?? ''
  const setSupplierId = (v: string) => setSearch({ supplier: v })
  const { data: categories } = useCategories()
  const { data: suppliers } = useSuppliers()
  const { data, isPending, isFetching, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useItemsList({
    status,
    q,
    // Solo se manda la categoría MÁS específica elegida: el backend filtra por
    // columna exacta, así que mandar cat1 + cat3 juntos sería redundante y
    // cat3 ya implica su rama.
    cat1_id: cat3Id || cat2Id ? '' : cat1Id,
    cat2_id: cat3Id ? '' : cat2Id,
    cat3_id: cat3Id,
    supplier_id: supplierId,
    origin,
  })
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [dialogNonce, setDialogNonce] = useState(0)

  const level1Options = (categories ?? []).filter((c) => c.level === 1 && c.active)
  const level2Options = (categories ?? []).filter((c) => c.level === 2 && c.active && c.parent_id === cat1Id)
  const level3Options = (categories ?? []).filter((c) => c.level === 3 && c.active && c.parent_id === cat2Id)
  const hasFilters = !!(q || status || cat1Id || supplierId || origin)

  function clearFilters() {
    setSearch({ q: '', status: '', cat1: '', cat2: '', cat3: '', supplier: '', origin: '' })
  }

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

        {/* Origen y proveedor se cruzan: un artículo de remate no tiene
            proveedor, así que elegir "Remate" apaga el otro selector en vez de
            ofrecer una combinación que nunca devuelve nada. */}
        <FilterSelect
          value={origin}
          onChange={(v) => setSearch({ origin: v, ...(v === 'auction' ? { supplier: '' } : {}) })}
          options={ORIGIN_OPTIONS}
          placeholder="Todo origen"
        />
        {origin !== 'auction' && (
          <FilterSelect
            value={supplierId}
            onChange={setSupplierId}
            options={(suppliers ?? []).filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Todo proveedor"
            disabled={!suppliers}
          />
        )}

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
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
        error={error}
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

const PAYMENT_STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Por pagar' },
  { value: 'paid', label: 'Pagados' },
]

function EntriesTab() {
  const { search, setSearch } = useInventorySearch()
  const paymentStatus = search.payment ?? ''
  const supplierId = search.supplier ?? ''
  const originType = search.origin ?? ''
  const q = search.q ?? ''
  const setPaymentStatus = (v: string) => setSearch({ payment: v })
  const setSupplierId = (v: string) => setSearch({ supplier: v })
  const setOriginType = (v: string) => setSearch({ origin: v })
  const setQ = (v: string) => setSearch({ q: v })
  const { data: suppliers } = useSuppliers()
  const { data, isPending, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useEntriesList({
    payment_status: paymentStatus,
    supplier_id: supplierId,
    origin_type: originType,
    q,
  })
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null)
  const hasFilters = !!(paymentStatus || supplierId || originType || q)

  const entries = data?.pages.flatMap((page) => page.items) ?? []

  const columns: ColumnDef<Entry>[] = [
    { accessorKey: 'number', header: 'Número', cell: (info) => `#${info.getValue<number>()}` },
    { accessorKey: 'origin_type', header: 'Origen', cell: (info) => entryOriginLabel(info.getValue<string>()) },
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
      <SearchInput value={q} onChange={setQ} placeholder="Buscar por número de ingreso o factura del proveedor…" />

      {/* "¿Qué compras tengo por pagar?" no tenía respuesta en la app aunque
          el dato estuviera en cada fila: había que abrir los ingresos uno por
          uno. Va primero porque es la pregunta que se hace todos los días. */}
      <div className="flex flex-wrap items-center gap-2">
        {PAYMENT_STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setPaymentStatus(tab.value)}
            className={cn(
              'rounded-pill px-3 py-1.5 text-sm font-medium transition-colors',
              paymentStatus === tab.value ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={originType}
          onChange={setOriginType}
          options={SELECTABLE_ENTRY_ORIGINS.map((value) => ({ value, label: entryOriginLabel(value) }))}
          placeholder="Todo origen"
        />
        <FilterSelect
          value={supplierId}
          onChange={setSupplierId}
          options={(suppliers ?? []).filter((sp) => sp.active).map((sp) => ({ value: sp.id, label: sp.name }))}
          placeholder="Todo proveedor"
          disabled={!suppliers}
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch({ payment: '', supplier: '', origin: '', q: '' })}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* El total por pagar es la razón por la que alguien abre este filtro:
          no le sirve la lista, le sirve el número. */}
      {paymentStatus === 'pending' && entries.length > 0 && (
        <div className="flex items-center justify-between rounded-card border border-warning/40 bg-warning-soft px-3 py-2 text-sm">
          <span className="text-warning">
            {entries.length} compra(s) por pagar{hasNextPage ? ' (o más)' : ''}
          </span>
          <Money value={sumMoney(...entries.map((e) => e.total_cost))} className="font-medium text-foreground" />
        </div>
      )}

      <DataTable
        columns={columns}
        data={entries}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        emptyTitle={hasFilters ? 'Ningún ingreso coincide' : 'Aún no tienes ingresos registrados'}
        emptyDescription={hasFilters ? 'Prueba con otros filtros.' : undefined}
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
  const { search, setSearch } = useInventorySearch()
  const exitType = search.exitType ?? ''
  const setExitType = (v: string) => setSearch({ exitType: v })
  const { data, isPending, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useExitsList({ exit_type: exitType })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogNonce, setDialogNonce] = useState(0)

  const exits = data?.pages.flatMap((page) => page.items) ?? []

  const columns: ColumnDef<Exit>[] = [
    { accessorKey: 'number', header: 'Número', cell: (info) => `#${info.getValue<number>()}` },
    { accessorKey: 'exit_type', header: 'Tipo', cell: (info) => exitTypeLabel(info.getValue<string>()) },
    { accessorKey: 'reason', header: 'Motivo' },
    { accessorKey: 'created_at', header: 'Fecha', cell: (info) => formatDateTime(info.getValue<string>()) },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterSelect
          value={exitType}
          onChange={setExitType}
          options={SELECTABLE_EXIT_TYPES.map((value) => ({ value, label: exitTypeLabel(value) }))}
          placeholder="Todo tipo"
        />
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
        error={error}
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
  const { search, setSearch } = useInventorySearch()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventario"
        description="Artículos, ingresos y egresos."
        actions={
          <div className="flex flex-wrap gap-2">
            {/* Transformar va como acción secundaria: es menos frecuente que
                comprar, y destruye inventario. */}
            <Can permission="inventory.transform">
              <Button variant="outline" className="rounded-pill" onClick={() => navigate({ to: '/inventario/transformaciones/nueva' })}>
                Transformar
              </Button>
            </Can>
            <Can permission="inventory.create">
              <Button className="rounded-pill" onClick={() => navigate({ to: '/inventario/ingresos/nuevo' })}>
                + Nuevo ingreso
              </Button>
            </Can>
          </div>
        }
      />

      {/* La pestaña activa va en la URL junto con los filtros: un link a
          "compras por pagar" tiene que ABRIR en Ingresos, no en Productos y
          con el filtro puesto en una pestaña que no se ve.
          Al cambiar de pestaña se limpian los filtros: los de Lotes no
          significan lo mismo en Egresos, y arrastrarlos daría una lista vacía
          sin explicación. */}
      <Tabs
        value={search.tab ?? 'products'}
        onValueChange={(tab) =>
          setSearch({
            tab: tab as NonNullable<typeof search.tab>,
            q: '',
            status: '',
            cat1: '',
            cat2: '',
            cat3: '',
            supplier: '',
            origin: '',
            stock: false,
            payment: '',
            exitType: '',
          })
        }
      >
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="items">Lotes</TabsTrigger>
          <TabsTrigger value="entries">Ingresos</TabsTrigger>
          <TabsTrigger value="exits">Egresos</TabsTrigger>
          <TabsTrigger value="transformations">Transformaciones</TabsTrigger>
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
        <TabsContent value="transformations">
          <TransformationsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
