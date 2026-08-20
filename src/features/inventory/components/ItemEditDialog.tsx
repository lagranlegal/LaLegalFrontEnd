import { useState } from 'react'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import { AppDialog } from '@/components/shared/AppDialog'
import { Money } from '@/components/shared/Money'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { PhotoUploader } from '@/components/shared/PhotoUploader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { subtractMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { useUpdateItem, usePublishItem } from '@/features/inventory/api'
import { useContract } from '@/lib/contracts/reference'
import { useCategories } from '@/lib/catalogs/categories'
import { useSuppliers } from '@/lib/catalogs/suppliers'
import type { Item } from '@/lib/inventory/items'

/** Contrato del que salió una pieza de remate — trazabilidad hacia atrás. */
function AuctionOriginInfo({ contractId }: { contractId: string }) {
  const { data: contract } = useContract(contractId)
  return (
    <p className="text-xs text-muted-foreground">
      Viene del remate del{' '}
      <Link to="/contratos/$contractId" params={{ contractId }} className="text-primary hover:underline">
        contrato {contract ? `#${contract.number}` : '…'}
      </Link>
    </p>
  )
}

function SupplierOriginInfo({ supplierId }: { supplierId: string }) {
  const { data: suppliers } = useSuppliers()
  const supplier = suppliers?.find((s) => s.id === supplierId)
  return <p className="text-xs text-muted-foreground">Comprado a {supplier?.name ?? '…'}</p>
}

function ItemOriginInfo({ item }: { item: Item }) {
  if (item.origin === 'auction' && item.source_contract_id) return <AuctionOriginInfo contractId={item.source_contract_id} />
  if (item.origin === 'supplier' && item.supplier_id) return <SupplierOriginInfo supplierId={item.supplier_id} />
  return null
}

/**
 * Costo de compra, utilidad y margen de ESTE lote. El costo es del lote y
 * nunca se promedia con otros; el precio viene del producto y es común a
 * todos. Por eso el margen puede variar entre lotes del mismo producto —
 * comprado más barato, gana más — y eso es información real, no un error.
 */
function LotMarginInfo({ cost, salePrice }: { cost: string; salePrice: string | null }) {
  const price = salePrice && Number(salePrice) > 0 ? salePrice : null
  const profit = price ? subtractMoney(price, cost) : null
  const marginPct = price && profit && Number(price) > 0 ? Math.round((Number(profit) / Number(price)) * 100) : null
  const isLoss = profit !== null && Number(profit) < 0

  return (
    <div className="grid grid-cols-3 gap-3 rounded-input bg-muted/40 px-3 py-2.5">
      <div>
        <p className="text-xs text-muted-foreground">Costo de este lote</p>
        <Money value={cost} className="text-sm font-medium text-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Utilidad</p>
        {profit ? (
          <Money value={profit} className={cn('text-sm font-medium', isLoss ? 'text-danger' : 'text-success')} />
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Margen</p>
        <p className={cn('text-sm font-medium', marginPct === null ? 'text-muted-foreground' : isLoss ? 'text-danger' : 'text-success')}>
          {marginPct === null ? '—' : `${marginPct}%`}
        </p>
      </div>
    </div>
  )
}

/**
 * Detalle de un LOTE.
 *
 * Desde la contracción del modelo, este diálogo edita únicamente las FOTOS:
 * el nombre, la categoría, la descripción y el precio son del PRODUCTO y se
 * editan desde la pestaña Productos, donde el cambio aplica a todos sus lotes
 * — que es el comportamiento correcto, porque dos lotes del mismo producto no
 * pueden llamarse distinto ni costarle distinto al cliente.
 *
 * El precio sigue apareciendo al publicar porque publicar el primer lote es
 * justamente el momento en que se le fija precio al producto.
 */
export function ItemEditDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (open: boolean) => void; item: Item }) {
  const [photos, setPhotos] = useState<string[]>(item.photos)
  const [salePrice, setSalePrice] = useState(item.sale_price ?? '0.00')
  const [formError, setFormError] = useState<string | null>(null)
  const updateItem = useUpdateItem()
  const publishItem = usePublishItem()
  const { data: categories } = useCategories()

  const categoria = categories?.find((c) => c.id === item.cat3_id)?.name
  const hasUnsavedPhotos = JSON.stringify(photos) !== JSON.stringify(item.photos)
  const canPublish = item.status === 'draft' && item.photos.length > 0 && Number(salePrice) > 0 && !hasUnsavedPhotos

  async function handleSavePhotos() {
    setFormError(null)
    try {
      await updateItem.mutateAsync({ itemId: item.id, body: { photos } })
      toast.success('Fotos actualizadas')
    } catch {
      setFormError('No se pudieron guardar las fotos. Intenta de nuevo.')
    }
  }

  async function handlePublish() {
    if (!canPublish) return
    try {
      const published = await publishItem.mutateAsync({ itemId: item.id, body: { sale_price: salePrice } })
      toast.success(`Lote publicado — código ${published.code}`)
      onOpenChange(false)
    } catch {
      toast.error('No se pudo publicar el lote. Intenta de nuevo.')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item.code ? `Lote ${item.code}` : `${item.name} — borrador`}
      size="lg"
      footer={
        item.status === 'draft' ? (
          <div className="flex w-full flex-col gap-2">
            <Button type="button" className="w-full rounded-pill" disabled={!canPublish || publishItem.isPending} onClick={handlePublish}>
              {publishItem.isPending ? 'Publicando…' : 'Publicar'}
            </Button>
            {hasUnsavedPhotos && (
              <Button type="button" variant="outline" className="w-full rounded-pill" disabled={updateItem.isPending} onClick={handleSavePhotos}>
                {updateItem.isPending ? 'Guardando…' : 'Guardar fotos'}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          {item.code && <span className="font-mono text-xs text-muted-foreground">{item.code}</span>}
          {item.lot_number && <span className="text-xs text-muted-foreground">Lote {item.lot_number}</span>}
        </div>

        <ItemOriginInfo item={item} />

        {/* Datos del PRODUCTO: se muestran acá porque es donde el usuario los
            está mirando, pero se editan en la pestaña Productos — cambiarlos
            afecta a todos los lotes, así que no puede hacerse desde uno solo. */}
        <div className="rounded-input border border-border px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Producto</p>
              <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {categoria ?? '—'}
                {item.sale_price && (
                  <>
                    {' · precio '}
                    <Money value={item.sale_price} />
                  </>
                )}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            El nombre, la categoría y el precio son del producto: se editan desde la pestaña <strong>Productos</strong> y el cambio
            aplica a todos sus lotes.
          </p>
        </div>

        <LotMarginInfo cost={item.cost} salePrice={item.sale_price} />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Entrada de mercancía</p>
            <p className="text-foreground">{formatDate(item.entry_date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cantidad</p>
            <p className="tnum text-foreground">{item.quantity}</p>
          </div>
        </div>

        {item.status === 'draft' && (
          <>
            <div>
              <label htmlFor="item-sale-price" className="text-sm font-medium text-foreground">
                Precio de venta
              </label>
              <MoneyInput id="item-sale-price" className="mt-1" value={salePrice} onChange={setSalePrice} />
              <p className="mt-1 text-xs text-muted-foreground">Al publicar, este precio queda como el del producto.</p>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">Fotos</p>
              <div className="mt-1">
                <PhotoUploader value={photos} onChange={setPhotos} folder={`inventory/${item.id}`} disabled={updateItem.isPending} />
              </div>
              {hasUnsavedPhotos && photos.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Guarda las fotos para poder publicar.</p>}
            </div>
          </>
        )}

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </div>
    </AppDialog>
  )
}
