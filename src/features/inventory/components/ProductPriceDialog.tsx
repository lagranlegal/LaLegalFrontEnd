import { useState } from 'react'
import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { useUpdateProduct, type Product } from '@/features/inventory/api'

/**
 * Cambiar el precio de un producto — una acción que afecta a todos sus lotes.
 *
 * El diálogo dice explícitamente a cuántos lotes aplica y que las ventas ya
 * hechas no cambian, porque son las dos dudas que aparecen al hacerlo por
 * primera vez. Y cuando el costo más alto se acerca al precio, avisa: es la
 * señal de que el proveedor subió y el precio se quedó atrás — el escenario
 * de descapitalización de la guía.
 */
export function ProductPriceDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
}) {
  const [price, setPrice] = useState(product.sale_price ?? '0.00')
  const [error, setError] = useState<string | null>(null)
  const updateProduct = useUpdateProduct()

  const nuevo = Number(price)
  const costoAlto = Number(product.max_cost ?? 0)
  // Margen sobre el costo MÁS ALTO, que es el peor caso: si con ese lote la
  // venta deja poco, el precio se quedó corto aunque con los lotes viejos
  // parezca bueno.
  const margen = nuevo > 0 && costoAlto > 0 ? Math.round(((nuevo - costoAlto) / nuevo) * 100) : null
  const alerta = margen !== null && margen < 10

  async function handleSave() {
    setError(null)
    try {
      await updateProduct.mutateAsync({ productId: product.id, body: { sale_price: price } })
      toast.success(`Precio actualizado en ${product.lot_count} ${product.lot_count === 1 ? 'lote' : 'lotes'}`)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el precio. Intenta de nuevo.')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cambiar precio"
      description={product.name}
      size="sm"
      footer={
        <Button type="button" className="w-full rounded-pill" disabled={updateProduct.isPending} onClick={handleSave}>
          {updateProduct.isPending ? 'Guardando…' : 'Aplicar a todos los lotes'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 rounded-input bg-background p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Precio actual</p>
            {product.sale_price ? <Money value={product.sale_price} className="font-medium" /> : <p className="text-muted-foreground">Sin precio</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Costo más alto</p>
            {product.max_cost ? <Money value={product.max_cost} className="font-medium" /> : <p className="text-muted-foreground">—</p>}
          </div>
        </div>

        <div>
          <label htmlFor="product-price" className="text-sm font-medium text-foreground">
            Precio nuevo
          </label>
          <MoneyInput id="product-price" className="mt-1" value={price} onChange={setPrice} />
          {margen !== null && (
            <p className={`mt-1 text-xs ${alerta ? 'text-warning' : 'text-muted-foreground'}`}>
              Margen sobre el lote más caro: {margen}%
              {alerta && ' — el costo subió y el precio se quedó corto.'}
            </p>
          )}
        </div>

        <p className="rounded-input bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Se aplica a los <strong className="text-foreground">{product.lot_count}</strong>{' '}
          {product.lot_count === 1 ? 'lote' : 'lotes'} de este producto. Las ventas ya registradas
          conservan el precio al que se vendieron.
        </p>

        {error && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </AppDialog>
  )
}
