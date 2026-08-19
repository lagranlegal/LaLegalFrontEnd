import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { PhotoUploader } from '@/components/shared/PhotoUploader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useUpdateItem, usePublishItem } from '@/features/inventory/api'
import { useContract } from '@/lib/contracts/reference'
import { useSuppliers } from '@/lib/catalogs/suppliers'
import type { Item } from '@/lib/inventory/items'

const itemSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  sale_price: z.string().optional(),
  photos: z.array(z.string()),
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

/** Editar borrador + publicar (CLAUDE.md paso 7: "publicar (precio + ≥1 foto, muestra el código emitido)"). */
export function ItemEditDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (open: boolean) => void; item: Item }) {
  const [formError, setFormError] = useState<string | null>(null)
  const updateItem = useUpdateItem()
  const publishItem = usePublishItem()
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: item.name, description: item.description ?? '', sale_price: item.sale_price ?? '0.00', photos: item.photos },
  })
  const salePrice = watch('sale_price')
  const photos = watch('photos')

  async function onSubmit(values: ItemFormValues) {
    setFormError(null)
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        body: { name: values.name, description: values.description || null, sale_price: values.sale_price || null, photos: values.photos },
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
