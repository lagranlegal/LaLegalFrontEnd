import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { KardexDialog } from '@/features/inventory/components/KardexDialog'
import { EntryDetailDialog } from '@/components/shared/EntryDetailDialog'
import { Money } from '@/components/shared/Money'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/shared/Can'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/dates'
import { useProductLots, useProductPurchases, type Product } from '@/features/inventory/api'
import { useEntry } from '@/lib/inventory/entries'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatQuantity } from '@/lib/inventory/units'
import { TableSkeleton } from '@/components/shared/TableSkeleton'
import { useSuppliers } from '@/lib/catalogs/suppliers'

function SupplierName({ supplierId }: { supplierId: string | null }) {
  const { data: suppliers } = useSuppliers()
  if (!supplierId) return <span className="text-muted-foreground">Remate</span>
  return <>{suppliers?.find((s) => s.id === supplierId)?.name ?? '—'}</>
}

/**
 * Historial de compras del producto: cuándo, a quién y a cuánto.
 *
 * Responde las dos preguntas que la fila de arriba solo insinúa al mostrar el
 * rango de costos entre lotes: **cómo se movió el costo** y **a quién conviene
 * comprarle**. El dato estaba completo en la base y no había forma de abrirlo.
 *
 * Marca el costo más BARATO y el más CARO en vez de dejar la comparación al
 * ojo: con seis compras a precios parecidos, la diferencia que importa es
 * justamente la que no salta a la vista.
 */
function PurchaseList({ productId }: { productId: string }) {
  const { data: purchases, isPending, isError } = useProductPurchases(productId)
  // Mismo hueco que el historial de proveedores (docs/PENDIENTES_FRONTEND.md
  // #2): el detalle de una compra "solo vivía en Inventario" — clic en una
  // fila lo abre desde acá también.
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null)
  const {
    data: viewingEntry,
    isPending: entryPending,
    isError: entryError,
    refetch: refetchEntry,
  } = useEntry(viewingEntryId ?? undefined)

  if (isPending) return <TableSkeleton rows={2} columns={6} />
  if (isError) return <p className="px-3 py-2 text-sm text-danger">No se pudo cargar el historial de compras.</p>
  if (!purchases || purchases.length === 0) {
    return <p className="px-3 py-2 text-sm text-muted-foreground">Sin compras registradas para este producto.</p>
  }

  const costos = purchases.map((c) => Number(c.unit_cost))
  const menor = Math.min(...costos)
  const mayor = Math.max(...costos)
  // Con una sola compra no hay nada que comparar, y marcarla como "la más
  // barata" sería ruido con aire de información.
  const hayComparacion = purchases.length > 1 && menor !== mayor

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 font-medium">Ingreso</th>
            <th className="px-3 py-1.5 font-medium">Fecha</th>
            <th className="px-3 py-1.5 font-medium">Proveedor</th>
            <th className="px-3 py-1.5 text-right font-medium">Cant.</th>
            <th className="px-3 py-1.5 text-right font-medium">Costo unitario</th>
            <th className="px-3 py-1.5 font-medium">Pago</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((compra) => {
            const costo = Number(compra.unit_cost)
            const esMenor = hayComparacion && costo === menor
            const esMayor = hayComparacion && costo === mayor
            return (
              <tr
                key={`${compra.entry_id}-${compra.lot_code ?? compra.entry_number}`}
                className="cursor-pointer border-t border-border transition-colors hover:bg-background"
                onClick={() => setViewingEntryId(compra.entry_id)}
              >
                <td className="px-3 py-1.5 text-muted-foreground">
                  <RecordNumber value={compra.entry_number} className="font-normal text-muted-foreground" />
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">{formatDate(compra.entry_date)}</td>
                <td className="px-3 py-1.5 text-foreground">
                  {compra.supplier_name ?? <span className="text-muted-foreground">Sin proveedor</span>}
                </td>
                <td className="tnum px-3 py-1.5 text-right">{formatQuantity(compra.quantity)}</td>
                <td className="px-3 py-1.5 text-right">
                  <Money value={compra.unit_cost} className={cn(esMenor && 'font-medium text-success', esMayor && 'font-medium text-warning')} />
                  {esMenor && <span className="ml-1 text-xs text-success">más barato</span>}
                  {esMayor && <span className="ml-1 text-xs text-warning">más caro</span>}
                </td>
                <td className="px-3 py-1.5">
                  {compra.paid_at ? (
                    <span className="text-xs text-muted-foreground">Pagado</span>
                  ) : (
                    <span className="text-xs font-medium text-warning">Por pagar</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <EntryDetailDialog
        open={!!viewingEntryId}
        onOpenChange={(open) => !open && setViewingEntryId(null)}
        entry={viewingEntry}
        isPending={entryPending}
        isError={entryError}
        onRetry={() => refetchEntry()}
      />
    </div>
  )
}

/**
 * Los lotes se piden SOLO al desplegar, no con la lista: un inventario de 200
 * productos dispararía 200 requests para un detalle que casi nadie abre.
 */
function LotList({ productId }: { productId: string }) {
  const { data: lots, isPending, isError } = useProductLots(productId)

  if (isPending) return <TableSkeleton rows={2} columns={6} />
  if (isError) return <p className="px-3 py-2 text-sm text-danger">No se pudieron cargar los lotes.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 font-medium">Lote</th>
            <th className="px-3 py-1.5 font-medium">Proveedor</th>
            <th className="px-3 py-1.5 text-right font-medium">Costo</th>
            <th className="px-3 py-1.5 text-right font-medium">Cant.</th>
            <th className="px-3 py-1.5 font-medium">Entrada</th>
            <th className="px-3 py-1.5 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {lots?.map((lot) => (
            <tr key={lot.id} className="border-t border-border">
              <td className="px-3 py-1.5 font-mono text-xs text-foreground">
                {lot.code ?? (lot.lot_number ? <RecordNumber value={lot.lot_number} className="font-mono text-xs" /> : '—')}
              </td>
              <td className="px-3 py-1.5">
                <SupplierName supplierId={lot.supplier_id} />
              </td>
              {/* El costo es POR LOTE y nunca se promedia: cada compra
                  conserva el suyo (identificación específica, NIIF). */}
              <td className="px-3 py-1.5 text-right">
                <Money value={lot.cost} />
              </td>
              <td className="tnum px-3 py-1.5 text-right">{formatQuantity(lot.quantity, lot.unit)}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{formatDate(lot.entry_date)}</td>
              <td className="px-3 py-1.5">
                <StatusBadge status={lot.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Una fila de producto que se despliega en sus lotes.
 *
 * Es la vista que resuelve el síntoma original: dos compras de la misma
 * cadena eran dos filas sin relación, y ahora son un producto con dos lotes.
 * El precio se muestra a nivel de producto porque ahí es donde vive — se
 * cambia una vez y aplica a todos.
 */
export function ProductRow({ product, onEditPrice }: { product: Product; onEditPrice: (product: Product) => void }) {
  const [open, setOpen] = useState(false)
  const [kardexOpen, setKardexOpen] = useState(false)
  const varios = product.lot_count > 1
  // Rango de costos, no promedio: promediar destruiría el costo real de cada
  // lote, que es lo que sostiene el cálculo de utilidad por venta.
  const rangoCostos =
    product.min_cost && product.max_cost && product.min_cost !== product.max_cost ? (
      <>
        <Money value={product.min_cost} /> – <Money value={product.max_cost} />
      </>
    ) : product.min_cost ? (
      <Money value={product.min_cost} />
    ) : (
      '—'
    )

  return (
    <div className="rounded-card border border-border bg-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          {open ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">{product.name}</span>
            <span className="block text-xs text-muted-foreground">
              {product.code && <span className="font-mono">{product.code} · </span>}
              {/* La unidad la manda el backend: decir "3 unidades" de algo que
                  se mide en gramos sería mentir, y el plural tampoco aplica
                  igual ("1 g" no es "1 gramo" en la etiqueta). */}
              {formatQuantity(product.available_quantity, product.unit)}
              {varios && ` · ${product.lot_count} lotes`}
              {' · costo '}
              {rangoCostos}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-right">
            <span className="block text-xs text-muted-foreground">Precio</span>
            {product.sale_price ? <Money value={product.sale_price} className="font-medium text-foreground" /> : <span className="text-sm text-muted-foreground">Sin precio</span>}
          </span>
          {/* Mismo lugar y mismo criterio que "Extracto" en Cuentas: los dos
              son el libro de un mismo objeto —qué le pasó y cómo quedó su
              saldo— y los dos necesitan más ancho del que da una fila. Basta
              `inventory.view`: es leer. */}
          <Button variant="ghost" size="sm" onClick={() => setKardexOpen(true)}>
            Kardex
          </Button>
          <Can permission="inventory.create">
            <Button variant="outline" size="sm" onClick={() => onEditPrice(product)}>
              Cambiar precio
            </Button>
          </Can>
        </div>
      </div>

      {open && (
        <div className={cn('border-t border-border bg-background/50 py-1')}>
          {/* Dos preguntas distintas sobre el mismo producto: "¿qué tengo?"
              (lotes, con su costo y estado) y "¿cómo lo he comprado?"
              (historial, para comparar proveedores y ver cómo se movió el
              costo). El rango min/max de la fila de arriba insinúa la
              segunda; esta pestaña es donde se abre. */}
          <Tabs defaultValue="lotes">
            <TabsList className="mx-3 mt-1">
              <TabsTrigger value="lotes">Lotes</TabsTrigger>
              <TabsTrigger value="compras">Compras</TabsTrigger>
            </TabsList>
            <TabsContent value="lotes">
              <LotList productId={product.id} />
            </TabsContent>
            <TabsContent value="compras">
              <PurchaseList productId={product.id} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {kardexOpen && (
        <KardexDialog open onOpenChange={setKardexOpen} productId={product.id} />
      )}
    </div>
  )
}
