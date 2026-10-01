import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { KpiCard, KpiRow } from '@/components/shared/KpiCard'
import { Money } from '@/components/shared/Money'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataTable } from '@/components/shared/DataTable'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { IndexedSection, SectionIndexLayout, type IndexSection } from '@/components/shared/SectionIndex'
import { cn } from '@/lib/utils'
import { FilterChip } from '@/components/shared/FilterChip'
import { formatDate } from '@/lib/dates'
import { formatQuantity } from '@/lib/inventory/units'
import { SectionError } from '@/features/reports/components/SectionError'
import {
  usePayables,
  useInventoryValuation,
  useStaleInventory,
  type InventoryValuation,
  type Payables,
  type StaleInventory,
} from '@/features/reports/api'

type SupplierRow = Payables['by_supplier'][number]
type CategoryRow = InventoryValuation['by_category'][number]
type StaleRow = StaleInventory['items'][number]

const SUPPLIER_COLUMNS: ColumnDef<SupplierRow>[] = [
  {
    id: 'supplier',
    header: 'Proveedor',
    // Enlaza a la ficha: el siguiente paso natural después de ver que se le
    // debe es mirar qué se le compró.
    cell: ({ row }) =>
      row.original.supplier_id ? (
        <Link to="/proveedores/$supplierId" params={{ supplierId: row.original.supplier_id }} className="text-brand hover:underline">
          {row.original.supplier_name}
        </Link>
      ) : (
        <span className="text-muted-foreground">{row.original.supplier_name}</span>
      ),
  },
  { id: 'count', header: 'Compras', meta: { align: 'right' }, cell: ({ row }) => <span className="tnum text-muted-foreground">{row.original.entry_count}</span> },
  {
    id: 'oldest',
    header: 'Más antigua',
    cell: ({ row }) => <span className="tnum text-muted-foreground">{row.original.oldest_entry_date ? formatDate(row.original.oldest_entry_date) : '—'}</span>,
  },
  {
    id: 'over60',
    header: '+60 días',
    meta: { align: 'right' },
    // Lo vencido de más de 60 días pide acción: es el único rojo de la tabla.
    cell: ({ row }) => <Money value={row.original.days_over_60} className={cn(Number(row.original.days_over_60) > 0 && 'font-medium text-danger')} />,
  },
  { id: 'total', header: 'Total', meta: { align: 'right' }, cell: ({ row }) => <Money value={row.original.total} className="font-semibold text-foreground" /> },
]

const CATEGORY_COLUMNS: ColumnDef<CategoryRow>[] = [
  { id: 'category', header: 'Categoría', cell: ({ row }) => row.original.cat1_name },
  { id: 'units', header: 'Unidades', meta: { align: 'right' }, cell: ({ row }) => <span className="tnum text-muted-foreground">{formatQuantity(row.original.units)}</span> },
  { id: 'cost', header: 'Al costo', meta: { align: 'right' }, cell: ({ row }) => <Money value={row.original.cost_value} className="font-semibold text-foreground" /> },
  { id: 'retail', header: 'A precio de venta', meta: { align: 'right' }, cell: ({ row }) => <Money value={row.original.retail_value} className="text-muted-foreground" /> },
]

const STALE_COLUMNS: ColumnDef<StaleRow>[] = [
  {
    id: 'product',
    header: 'Producto',
    cell: ({ row }) => (
      <>
        <span className="text-foreground">{row.original.product_name}</span>
        {row.original.product_code && <span className="ml-2 font-mono text-xs text-muted-foreground">{row.original.product_code}</span>}
      </>
    ),
  },
  { id: 'units', header: 'Unidades', meta: { align: 'right' }, cell: ({ row }) => <span className="tnum text-muted-foreground">{formatQuantity(row.original.units)}</span> },
  { id: 'days', header: 'Días', meta: { align: 'right' }, cell: ({ row }) => <span className="tnum font-medium text-foreground">{row.original.days_in_stock}</span> },
  { id: 'cost', header: 'Costo detenido', meta: { align: 'right' }, cell: ({ row }) => <Money value={row.original.cost_value} className="font-semibold text-foreground" /> },
]

const STALE_THRESHOLDS = [60, 90, 180, 365]

function SectionSkeleton() {
  return <div className="h-32 animate-pulse rounded-card border border-border bg-border" />
}

/**
 * Cuentas por pagar — el primer reporte que pediría un contador.
 *
 * El dato vivía en cada compra desde 00020 (`paid_at`) y ninguna pantalla lo
 * sumaba: había que abrir los ingresos uno por uno para saber cuánto se debe.
 *
 * La antigüedad va en tramos porque una deuda de hace tres meses y una de
 * ayer no son el mismo problema, aunque sumen igual.
 *
 * La tabla llega ordenada por MONTO, de mayor a menor (`order by
 * sum(e.total_cost) desc` en `reports/repository.py::payables_by_supplier`):
 * arriba queda el proveedor al que más se le debe, no el de la deuda más
 * vieja. La antigüedad no se lee por la posición en la lista sino por las
 * columnas «Más antigua» y «+60 días».
 */
function PayablesCard() {
  const { data, isPending, isError, error, refetch } = usePayables()

  if (isPending) return <SectionSkeleton />
  if (isError || !data) return <SectionError title="Cuentas por pagar" error={error} onRetry={() => void refetch()} />

  if (data.entry_count === 0) {
    return (
      <div className="rounded-card border border-border bg-card">
        <EmptyState title="No le debes nada a ningún proveedor" description="Todas las compras registradas están pagadas." />
      </div>
    )
  }

  const vencido = Number(data.days_over_60) > 0

  return (
    <div className="flex flex-col gap-3">
      <KpiRow>
        <KpiCard
          label="Total por pagar"
          value={<Money value={data.total} />}
          hint={`${data.entry_count} compra(s) · al ${formatDate(data.as_of)}`}
        />
        <KpiCard label="0 a 30 días" value={<Money value={data.days_0_30} />} hint="Al día" />
        <KpiCard label="31 a 60 días" value={<Money value={data.days_31_60} />} hint="Vigilar" />
        <KpiCard
          label="Más de 60 días"
          value={<Money value={data.days_over_60} />}
          tone={vencido ? 'danger' : 'default'}
          hint={vencido ? 'Atender primero' : 'Nada vencido'}
        />
      </KpiRow>

      <SummaryCard title="Por proveedor" description="De mayor a menor deuda">
        <DataTable embedded columns={SUPPLIER_COLUMNS} data={data.by_supplier} getRowId={(s) => s.supplier_id ?? 'sin-proveedor'} />
      </SummaryCard>
    </div>
  )
}

/**
 * Valorización del inventario — el activo más grande del negocio.
 *
 * Se muestra el valor AL COSTO como cifra principal, que es la correcta
 * contablemente. El valor a precio de venta va al lado y etiquetado como
 * referencia: contar la utilidad antes de venderla es el error clásico, y
 * poner esa cifra primero invitaría a cometerlo.
 */
function ValuationCard() {
  const { data, isPending, isError, error, refetch } = useInventoryValuation()

  if (isPending) return <SectionSkeleton />
  if (isError || !data) return <SectionError title="Valor del inventario" error={error} onRetry={() => void refetch()} />

  const enPerdida = Number(data.potential_profit) < 0

  return (
    <div className="flex flex-col gap-3">
      <KpiRow>
        <KpiCard
          label="Valor al costo"
          value={<Money value={data.cost_value} />}
          hint={`${formatQuantity(data.units)} unidad(es) en ${data.lot_count} lote(s)`}
        />
        <KpiCard label="A precio de venta" value={<Money value={data.retail_value} />} hint="Referencia, no valorización" />
        <KpiCard
          label="Utilidad potencial"
          value={<Money value={data.potential_profit} />}
          // Negativa significa que hay mercancía por debajo del costo. Es
          // información, no un error, y por eso se muestra en vez de taparla.
          hint={enPerdida ? 'Hay mercancía por debajo del costo' : 'Si se vendiera todo hoy'}
        />
      </KpiRow>

      {data.by_category.length > 0 && (
        <SummaryCard title="Por categoría">
          <DataTable embedded columns={CATEGORY_COLUMNS} data={data.by_category} getRowId={(c) => c.cat1_id ?? 'sin-categoria'} />
        </SummaryCard>
      )}
    </div>
  )
}

/**
 * Mercancía sin rotación — plata congelada en la vitrina.
 *
 * El umbral es ajustable porque "mucho tiempo" depende del negocio: una
 * cadena de oro que lleva seis meses es normal, un celular que lleva tres es
 * un problema. Fijarlo en el código habría hecho el reporte inútil para la
 * mitad del inventario.
 */
function StaleCard() {
  const [threshold, setThreshold] = useState(90)
  const { data, isPending, isError, error, refetch } = useStaleInventory(threshold)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* El umbral es inclusivo: el SQL filtra con `having … >= :threshold`
            (`reports/repository.py::stale_inventory`), así que con 90 marcado
            un producto de exactamente 90 días SÍ aparece. Decía "hace más de"
            y dejaba afuera, en el rótulo, una fila que la tabla sí muestra. */}
        <span className="text-xs text-muted-foreground">Sin venderse hace</span>
        {STALE_THRESHOLDS.map((dias) => (
          <FilterChip key={dias} active={threshold === dias} onClick={() => setThreshold(dias)} aria-label={`${dias} días o más`}>
            {dias}
          </FilterChip>
        ))}
        <span className="text-xs text-muted-foreground">días o más</span>
      </div>

      {isPending && <SectionSkeleton />}

      {isError && <SectionError title="Mercancía sin rotación" error={error} onRetry={() => void refetch()} />}

      {data && data.items.length === 0 && (
        <div className="rounded-card border border-border bg-card">
          <EmptyState
            title={`Nada lleva ${threshold} días o más sin venderse`}
            description="Todo el inventario disponible tiene rotación reciente."
          />
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{data.product_count}</strong> producto(s) con{' '}
            <Money value={data.total_cost_value} className="font-medium text-foreground" /> en costo detenido.
          </p>
          <SummaryCard title="Productos detenidos">
            <DataTable embedded columns={STALE_COLUMNS} data={data.items} getRowId={(p) => p.product_id} />
          </SummaryCard>
        </>
      )}
    </div>
  )
}

/**
 * Los reportes que responden preguntas de contador, agrupados aparte del
 * resumen financiero del período.
 *
 * Van juntos y sin selector de fechas a propósito: los tres son una FOTO DE
 * HOY, no un resumen de un rango. "¿Cuánto debo?" y "¿cuánto tengo en
 * mercancía?" no tienen versión "en marzo" — o se debe hoy, o no se debe.
 */
const CONTABLES_SECTIONS: IndexSection[] = [
  { id: 'cuentas-por-pagar', label: 'Cuentas por pagar' },
  { id: 'valor-inventario', label: 'Valor del inventario' },
  { id: 'sin-rotacion', label: 'Mercancía sin rotación' },
]

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

export function ContablesSection() {
  return (
    <SectionIndexLayout sections={CONTABLES_SECTIONS} label="Secciones de Contabilidad">
      <IndexedSection id="cuentas-por-pagar">
        <SectionTitle title="Cuentas por pagar" description="Lo que le debes a proveedores, por antigüedad de la compra." />
        <PayablesCard />
      </IndexedSection>

      <IndexedSection id="valor-inventario">
        <SectionTitle
          title="Valor del inventario"
          description="Al costo — es el activo, no lo que se cobraría por él. Solo cuenta la mercancía disponible para vender."
        />
        <ValuationCard />
      </IndexedSection>

      <IndexedSection id="sin-rotacion">
        <SectionTitle title="Mercancía sin rotación" description="Plata congelada en la vitrina — la base para decidir un descuento o un remate." />
        <StaleCard />
      </IndexedSection>
    </SectionIndexLayout>
  )
}
