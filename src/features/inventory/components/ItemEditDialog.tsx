import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUpdateItem, usePublishItem } from '@/features/inventory/api'
import { useContract } from '@/lib/contracts/reference'
import { useCategories } from '@/lib/catalogs/categories'
import { useSuppliers } from '@/lib/catalogs/suppliers'
import type { Item } from '@/lib/inventory/items'

const itemSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  sale_price: z.string().optional(),
  photos: z.array(z.string()),
  cat1_id: z.string().min(1, 'Selecciona una categoría'),
  cat2_id: z.string().min(1, 'Selecciona una subcategoría'),
  cat3_id: z.string().min(1, 'Selecciona la categoría final'),
})

type ItemFormValues = z.infer<typeof itemSchema>

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/** Contrato del que salió un artículo de remate (`ItemOut.source_contract_id`) — pedido explícito: poder rastrear a qué contrato pertenecía. */
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
 * Costo de compra, utilidad y margen. `ItemOut.cost` siempre vino en la API y
 * la tabla del listado ya lo mostraba, pero el detalle no — así que la
 * pregunta central del negocio ("¿cuánto me gano con esta pieza?") no tenía
 * respuesta en ninguna pantalla.
 *
 * `salePrice` viene del form (no de `item.sale_price`) para que la utilidad se
 * recalcule mientras se escribe el precio, que es justo cuando el usuario
 * necesita verla. Aritmética con los helpers decimales de `lib/money` — el
 * dinero nunca pasa por `parseFloat` (CLAUDE.md regla 5).
 */
function ItemMarginInfo({ cost, salePrice }: { cost: string; salePrice: string | undefined }) {
  const price = salePrice && Number(salePrice) > 0 ? salePrice : null
  const profit = price ? subtractMoney(price, cost) : null
  // Margen sobre el precio de venta (no sobre el costo): es como se lee un
  // margen comercial y evita dividir por cero si algo entró con costo 0.
  const marginPct = price && profit && Number(price) > 0 ? Math.round((Number(profit) / Number(price)) * 100) : null
  const isLoss = profit !== null && Number(profit) < 0

  return (
    <div className="grid grid-cols-3 gap-3 rounded-input bg-muted/40 px-3 py-2.5">
      <div>
        <p className="text-xs text-muted-foreground">Costo de compra</p>
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

/** Editar borrador + publicar (CLAUDE.md paso 7: "publicar (precio + ≥1 foto, muestra el código emitido)"). */
export function ItemEditDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (open: boolean) => void; item: Item }) {
  const [formError, setFormError] = useState<string | null>(null)
  const updateItem = useUpdateItem()
  const publishItem = usePublishItem()
  const { data: categories } = useCategories()
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item.name,
      description: item.description ?? '',
      sale_price: item.sale_price ?? '0.00',
      photos: item.photos,
      cat1_id: item.cat1_id,
      cat2_id: item.cat2_id,
      cat3_id: item.cat3_id,
    },
  })
  const salePrice = watch('sale_price')
  const photos = watch('photos')
  const cat1 = watch('cat1_id')
  const cat2 = watch('cat2_id')

  const level1Options = (categories ?? []).filter((c) => c.level === 1 && c.active)
  const level2Options = (categories ?? []).filter((c) => c.level === 2 && c.active && c.parent_id === cat1)
  const level3Options = (categories ?? []).filter((c) => c.level === 3 && c.active && c.parent_id === cat2)

  async function onSubmit(values: ItemFormValues) {
    setFormError(null)
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        body: {
          name: values.name,
          description: values.description || null,
          sale_price: values.sale_price || null,
          photos: values.photos,
          // Solo mientras `status='draft'` el backend acepta esto — y es
          // todo-o-nada (400 si viene parcial), por eso siempre van los tres
          // juntos (ya vienen precargados con la categoría actual, así que
          // no cambiar nada acá reenvía el mismo valor sin efecto real).
          ...(item.status === 'draft' ? { cat1_id: values.cat1_id, cat2_id: values.cat2_id, cat3_id: values.cat3_id } : {}),
        },
      })
      toast.success('Artículo actualizado')
      onOpenChange(false)
    } catch {
      setFormError('No se pudo actualizar el artículo. Intenta de nuevo.')
    }
  }

  const hasPhotos = item.photos.length > 0
  const hasPrice = !!salePrice && Number(salePrice) > 0
  // Publicar usa `photos`/`sale_price` YA guardados en el artículo (lo que
  // `publish` va a ver del lado del backend), no lo que hay sin guardar en
  // el form — si hay fotos recién subidas sin "Guardar cambios", publicar
  // publicaría contra el estado viejo del backend.
  const hasUnsavedPhotos = JSON.stringify(photos) !== JSON.stringify(item.photos)
  const canPublish = item.status === 'draft' && hasPhotos && hasPrice && !hasUnsavedPhotos

  async function handlePublish() {
    if (!canPublish || !salePrice) return
    try {
      const published = await publishItem.mutateAsync({ itemId: item.id, body: { sale_price: salePrice } })
      toast.success(`Artículo publicado — código ${published.code}`)
      onOpenChange(false)
    } catch {
      toast.error('No se pudo publicar el artículo. Intenta de nuevo.')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item.code ? `Artículo ${item.code}` : 'Editar artículo'}
      size="lg"
      footer={
        <div className="flex w-full flex-col gap-2">
          {item.status === 'draft' && (
            <Button type="button" className="w-full rounded-pill" disabled={!canPublish || publishItem.isPending} onClick={handlePublish}>
              {publishItem.isPending ? 'Publicando…' : 'Publicar'}
            </Button>
          )}
          <Button form="item-edit-form" type="submit" variant="outline" disabled={updateItem.isPending} className="w-full rounded-pill">
            {updateItem.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      }
    >
      <form id="item-edit-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />
          {item.code && <span className="font-mono text-xs text-muted-foreground">{item.code}</span>}
        </div>

        <ItemOriginInfo item={item} />

        <ItemMarginInfo cost={item.cost} salePrice={salePrice} />

        <div>
          <label htmlFor="item-name" className="text-sm font-medium text-foreground">
            Nombre
          </label>
          <input id="item-name" className={inputClass} {...register('name')} />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="item-description" className="text-sm font-medium text-foreground">
            Descripción (opcional)
          </label>
          <textarea id="item-description" rows={2} className={inputClass} {...register('description')} />
        </div>

        {item.status === 'draft' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-foreground">Categoría</label>
              <Controller
                control={control}
                name="cat1_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      setValue('cat2_id', '')
                      setValue('cat3_id', '')
                    }}
                    disabled={!categories}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      {/* Radix solo resuelve el texto de SelectValue desde un SelectItem que ya se
                          montó (se abrió) al menos una vez — con un valor precargado por defaultValues
                          nunca se abrió, así que sin esto el trigger se ve vacío aunque sí haya valor.
                          Además `GET /catalogs/categories` tarda ~4s en dev — sin placeholder de carga
                          el trigger se veía vacío y confuso mientras tanto. */}
                      <SelectValue placeholder={categories ? 'Selecciona…' : 'Cargando categorías…'}>{level1Options.find((c) => c.id === field.value)?.name}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {level1Options.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cat1_id && <p className="mt-1 text-sm text-danger">{errors.cat1_id.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Subcategoría</label>
              <Controller
                control={control}
                name="cat2_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      setValue('cat3_id', '')
                    }}
                    disabled={!cat1}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder={cat1 ? 'Selecciona…' : 'Elige categoría primero'}>{level2Options.find((c) => c.id === field.value)?.name}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {level2Options.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cat2_id && <p className="mt-1 text-sm text-danger">{errors.cat2_id.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Categoría final</label>
              <Controller
                control={control}
                name="cat3_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!cat2}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder={cat2 ? 'Selecciona…' : 'Elige subcategoría primero'}>{level3Options.find((c) => c.id === field.value)?.name}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {level3Options.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cat3_id && <p className="mt-1 text-sm text-danger">{errors.cat3_id.message}</p>}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-foreground">Categoría</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {categories?.find((c) => c.id === item.cat3_id)?.name ?? '—'} — no se puede cambiar después de publicar.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="item-sale-price" className="text-sm font-medium text-foreground">
            Precio de venta
          </label>
          <Controller control={control} name="sale_price" render={({ field }) => <MoneyInput id="item-sale-price" className="mt-1" value={field.value ?? ''} onChange={field.onChange} />} />
        </div>

        {item.status === 'draft' && (
          <div>
            <p className="text-sm font-medium text-foreground">Fotos</p>
            <Controller
              control={control}
              name="photos"
              render={({ field }) => (
                <div className="mt-1">
                  <PhotoUploader value={field.value} onChange={field.onChange} folder={`inventory/${item.id}`} disabled={updateItem.isPending} />
                </div>
              )}
            />
            {hasUnsavedPhotos && photos.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Guarda los cambios para poder publicar.</p>}
          </div>
        )}

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
