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
import { formatQuantity } from '@/lib/inventory/units'
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
 *
 * LIMITACIÓN CONOCIDA (00034): `item.photos` son las EFECTIVAS —las del lote
 * si tiene, si no las heredadas del producto—, y el diálogo no puede
 * distinguir unas de otras porque la API expone solo el resultado. Si alguien
 * agrega una foto propia a un lote que estaba heredando, se guardan también
 * las heredadas y ese lote deja de seguir al producto. Es un caso de borde
 * aceptable hoy (el override es justo para eso), pero si molesta, la solución
 * es exponer `own_photos` aparte en `ItemOut`.
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
  // Se mira `photos` (lo que hay en pantalla) y no `item.photos` (lo guardado):
  // publicar ahora guarda las fotos por dentro, así que subir una foto ya
  // habilita el botón. Antes exigía además `!hasUnsavedPhotos`, lo que obligaba
  // a guardar primero y publicar después — dos actos para una sola intención.
  // La foto ya no bloquea (00034): solo es obligatoria en piezas únicas, y
  // esas son las de remate. Para el resto basta el precio — las fotos vienen
  // heredadas del producto, así que `photos` casi siempre ya trae algo.
  const esPiezaUnica = item.origin === 'auction'
  const canPublish = item.status === 'draft' && Number(salePrice) > 0 && (!esPiezaUnica || photos.length > 0)
  const busy = updateItem.isPending || publishItem.isPending

  /**
   * Publicar = fijar precio + guardar fotos + emitir código, en ese orden.
   *
   * POR QUÉ VAN LAS TRES JUNTAS: antes el diálogo mostraba el campo "Precio de
   * venta" al lado de un único botón que decía "Guardar fotos", y ese botón
   * mandaba SOLO las fotos (`ItemUpdateIn` del backend no acepta precio: el
   * precio es del producto, no del lote). El precio digitado se descartaba en
   * silencio y había que volver a escribirlo — el usuario lo reportó como "el
   * valor a vender no se quedó guardado", y era literal.
   *
   * La corrección no es mandar el precio en el PATCH del lote —ahí no
   * pertenece—, sino que el diálogo haga las llamadas que hagan falta sin que
   * el usuario tenga que saber en qué tabla vive cada dato. `publish` ya fija
   * el precio en el producto, así que basta con guardar las fotos antes.
   */
  async function handlePublish() {
    if (!canPublish || busy) return
    setFormError(null)
    try {
      if (hasUnsavedPhotos) {
        await updateItem.mutateAsync({ itemId: item.id, body: { photos } })
      }
      const published = await publishItem.mutateAsync({ itemId: item.id, body: { sale_price: salePrice } })
      toast.success(`Lote publicado — código ${published.code}`)
      onOpenChange(false)
    } catch {
      setFormError('No se pudo publicar el lote. Revisa el precio y las fotos, e intenta de nuevo.')
    }
  }

  /**
   * Guardar sin publicar. Sigue existiendo porque a veces se sube la foto y el
   * precio todavía no está decidido — pero ya no es un paso obligatorio del
   * camino normal, solo una salida para dejar el trabajo a medias.
   */
  async function handleSaveDraft() {
    setFormError(null)
    try {
      await updateItem.mutateAsync({ itemId: item.id, body: { photos } })
      toast.success('Fotos guardadas — el lote sigue en borrador')
    } catch {
      setFormError('No se pudieron guardar las fotos. Intenta de nuevo.')
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
            <Button type="button" className="w-full rounded-pill" disabled={!canPublish || busy} onClick={handlePublish}>
              {busy ? 'Publicando…' : 'Publicar'}
            </Button>
            {/* Secundario y solo cuando hay algo sin guardar: el camino normal
                es publicar de una. */}
            {hasUnsavedPhotos && (
              <Button type="button" variant="ghost" className="w-full rounded-pill" disabled={busy} onClick={handleSaveDraft}>
                {updateItem.isPending ? 'Guardando…' : 'Guardar y seguir en borrador'}
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
            <p className="tnum text-foreground">{formatQuantity(item.quantity, item.unit)}</p>
          </div>
        </div>

        {item.status === 'draft' && (
          <>
            <div>
              <label htmlFor="item-sale-price" className="text-sm font-medium text-foreground">
                Precio de venta
              </label>
              <MoneyInput id="item-sale-price" className="mt-1" value={salePrice} onChange={setSalePrice} />
              <p className="mt-1 text-xs text-muted-foreground">
                Al publicar, este precio queda como el del producto y aplica a todos sus lotes.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">Fotos</p>
              <div className="mt-1">
                <PhotoUploader value={photos} onChange={setPhotos} folder={`inventory/${item.id}`} disabled={busy} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {esPiezaUnica
                  ? 'Una pieza de remate necesita al menos una foto: es la evidencia de qué prenda era.'
                  : 'Opcional. Las fotos generales del producto se editan desde la pestaña Productos; acá solo se agregan las de ESTE lote (una tara, el estado de la pieza).'}
              </p>
            </div>
          </>
        )}

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </div>
    </AppDialog>
  )
}
