import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Money } from '@/components/shared/Money'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/shared/Can'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/dates'
import { useProductLots, type Product } from '@/features/inventory/api'
import { useSuppliers } from '@/lib/catalogs/suppliers'

function SupplierName({ supplierId }: { supplierId: string | null }) {
  const { data: suppliers } = useSuppliers()
  if (!supplierId) return <span className="text-muted-foreground">Remate</span>
  return <>{suppliers?.find((s) => s.id === supplierId)?.name ?? '—'}</>
}

/**
 * Los lotes se piden SOLO al desplegar, no con la lista: un inventario de 200
 * productos dispararía 200 requests para un detalle que casi nadie abre.
 */
function LotList({ productId }: { productId: string }) {
  const { data: lots, isPending, isError } = useProductLots(productId)

  if (isPending) return <div className="h-16 animate-pulse rounded-input bg-muted/40" />
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
              <td className="px-3 py-1.5 font-mono text-xs text-foreground">{lot.code ?? `#${lot.lot_number ?? '—'}`}</td>
              <td className="px-3 py-1.5">
                <SupplierName supplierId={lot.supplier_id} />
              </td>
              {/* El costo es POR LOTE y nunca se promedia: cada compra
                  conserva el suyo (identificación específica, NIIF). */}
              <td className="px-3 py-1.5 text-right">
                <Money value={lot.cost} />
              </td>
              <td className="tnum px-3 py-1.5 text-right">{lot.quantity}</td>
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
              {product.available_quantity} {product.available_quantity === 1 ? 'unidad' : 'unidades'}
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
          <Can permission="inventory.create">
            <Button variant="outline" size="sm" onClick={() => onEditPrice(product)}>
              Cambiar precio
            </Button>
          </Can>
        </div>
      </div>

      {open && (
        <div className={cn('border-t border-border bg-background/50 py-1')}>
          <LotList productId={product.id} />
        </div>
      )}
    </div>
  )
}
